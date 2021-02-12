const express = require('express')
const camelCaseRequestKeys = require('../middleware/camelCaseRequestKeys')
const { identity, aodh } = require('../openstack')

function getAlarmRoutes() {
  const router = express.Router()

  router.post('', camelCaseRequestKeys, alarm)

  return router
}

async function alarm(req, res) {
  const { alarmId } = req.body

  const token = await identity.getToken({
    name: process.env.OPENSTACK_USERNAME,
    password: process.env.OPENSTACK_PASSWORD,
    userDomainId: process.env.OPENSTACK_USER_DOMAIN_ID,
    userTenantName: process.env.OPENSTACK_USER_TENANT_NAME,
    projectName: process.env.OPENSTACK_PROJECT_NAME,
    projectDomainId: process.env.OPENSTACK_PROJECT_DOMAIN_ID,
  })

  const alarm = await aodh.getAlarm(token, alarmId)

  console.log(alarm)

  res.send()
}

module.exports = { getAlarmRoutes }
