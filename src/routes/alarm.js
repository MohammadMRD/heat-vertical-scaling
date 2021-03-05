const express = require('express')
const camelCaseRequestKeys = require('../middleware/camelCaseRequestKeys')
const { identity, aodh, nova } = require('../openstack')
const { getDb } = require('../db')

function getAlarmRoutes() {
  const router = express.Router()

  router.post('', camelCaseRequestKeys, alarm)

  return router
}

async function alarm(req, res) {
  const { alarmId } = req.body
  let { action, flavors: reqFlavorsList, group: groupName, cooldown = 0 } = req.query
  cooldown = Math.max(0, cooldown)

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

  const db = getDb()
  const { updatedAt, scaleInProgress } = db.get(`${stackId}.${groupName}`)?.value() || {}
  const elapsedTime = Math.round((new Date() - new Date(updatedAt)) / 1000)

  if (scaleInProgress || cooldown > elapsedTime) {
    res.send('Already updated')
    return
  }

  db.set(`${stackId}.${groupName}.scaleInProgress`, true).write()

  const allServers = await nova.getServers(token)
  const flavors = await nova.getFlavors(token)
  const reqFlavors = reqFlavorsList.map(f => flavors.find(flavor => [flavor.id, flavor.name].includes(f)) || {})
  const servers = allServers?.filter(server => server.metadata?.[groupName] === stackId) || []
  const flavorsIndex = servers.map(({ flavor }) => reqFlavors.findIndex((f) => flavor.id === f.id))
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

  db.set(`${stackId}.${groupName}`, { updatedAt: new Date(), scaleInProgress: false }).write()
  res.send()
}

module.exports = { getAlarmRoutes }
