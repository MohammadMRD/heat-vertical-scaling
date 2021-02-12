const express = require('express')
const camelCaseRequestKeys = require('../middleware/camelCaseRequestKeys')
const { identity, aodh, nova, heat } = require('../openstack')

function getAlarmRoutes() {
  const router = express.Router()

  router.post('', camelCaseRequestKeys, alarm)

  return router
}

async function alarm(req, res) {
  const { alarmId } = req.body
  const { action, flavors: reqFlavorsList, group = '' } = req.query

  const token = await identity.getToken({
    name: process.env.OPENSTACK_USERNAME,
    password: process.env.OPENSTACK_PASSWORD,
    userDomainId: process.env.OPENSTACK_USER_DOMAIN_ID,
    userTenantName: process.env.OPENSTACK_USER_TENANT_NAME,
    projectName: process.env.OPENSTACK_PROJECT_NAME,
    projectDomainId: process.env.OPENSTACK_PROJECT_DOMAIN_ID,
  })

  const { project_id: projectId, ...alarm } = await aodh.getAlarm(token, alarmId)
  const alarmRules = alarm[`${alarm.type}_rule`]
  const stackId = JSON.parse(alarmRules.query)['='].server_group

  const { stack_name: stackName } = await heat.getStack(token, projectId, stackId)
  const autoScalingServersIds = await heat.getStackAutoScalingServers(token, projectId, stackId, stackName, group)
  const flavors = await nova.getFlavors(token)

  if (Array.isArray(autoScalingServersIds)) {
    const serversRequests = autoScalingServersIds.map(async (id) => await nova.getServer(token, id))
    const servers = await Promise.all(serversRequests)
    const flavorsIndex = servers.map(({ flavor }) =>
      reqFlavorsList.findIndex((f) => [flavor.id, flavor.name].includes(f)),
    )

    const serverIndex = flavorsIndex.reduce(
      (sfIndex, flavorIndex, currentIndex) =>
        (action === 'up' ? flavorsIndex[sfIndex] > flavorIndex : flavorsIndex[sfIndex] < flavorIndex)
          ? currentIndex
          : sfIndex,
      0,
    )

    const nextFlavorIndex = flavorsIndex[serverIndex] + (action === 'up' ? 1 : -1)
    if (nextFlavorIndex >= 0 && nextFlavorIndex < reqFlavorsList.length) {
      const { id: nextFlavorId, status } = flavors.find(({ id, name }) =>
        [id, name].includes(reqFlavorsList[nextFlavorIndex]),
      )
      await nova.resizeServer(token, servers[serverIndex].id, nextFlavorId, status)
    }
  }

  res.send()
}

module.exports = { getAlarmRoutes }
