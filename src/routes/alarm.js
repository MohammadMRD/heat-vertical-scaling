const express = require('express')
const camelCaseRequestKeys = require('../middleware/camelCaseRequestKeys')
const { identity, aodh, nova } = require('../openstack')
const { getDb } = require('../db')

function getAlarmRoutes() {
  const router = express.Router()

  router.post('', camelCaseRequestKeys, alarm)

  return router
}

function getServerGroupId(query) {
  const keys = Object.keys(query)

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = query[key]

    if (key === 'server_group') return value

    if (typeof value === 'object')
    {
      const id = getServerGroupId(value)

      if (id) return id
    }
  }
}

async function alarm(req, res) {
  const { alarmId } = req.body
  let { action, flavors: reqFlavorsList, group: groupName, cooldown = 0 } = req.query
  cooldown = Math.max(0, cooldown)

  const token = await identity.getToken({
    name: process.env.OPENSTACK_USERNAME,
    password: process.env.OPENSTACK_PASSWORD,
    userDomainId: process.env.OPENSTACK_USER_DOMAIN_ID,
    projectName: process.env.OPENSTACK_PROJECT_NAME,
    projectDomainId: process.env.OPENSTACK_PROJECT_DOMAIN_ID,
  })

  const { project_id: projectId, ...alarm } = await aodh.getAlarm(token, alarmId)
  const alarmRules = alarm[`${alarm.type}_rule`]
  const stackId =  getServerGroupId(JSON.parse(alarmRules.query))

  if (!stackId) {
    console.log('Cannot find stack Id', alarmRules)
    return res.status(500).send()
  }

  const db = getDb()
  const { updatedAt, scaleInProgress } = db.get(`${stackId}.${groupName}`)?.value() || {}
  const elapsedTime = Math.round((new Date() - new Date(updatedAt)) / 1000)

  if (scaleInProgress || cooldown > elapsedTime) {
    res.send('Already updated')
    return
  }

  const allServers = await nova.getServers(token, projectId)
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

    db.set(`${stackId}.${groupName}.scaleInProgress`, true).write()

    await nova.resizeServer(token, servers[serverIndex].id, nextFlavorId, status).finally(() => {
      db.set(`${stackId}.${groupName}`, { scaleInProgress: false }).write()
    })

    db.set(`${stackId}.${groupName}`, { updatedAt: new Date()}).write()
  }

  res.send()
}

module.exports = { getAlarmRoutes }
