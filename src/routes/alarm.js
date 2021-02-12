const express = require('express')
const camelCaseRequestKeys = require('../middleware/camelCaseRequestKeys')

function getAlarmRoutes() {
  const router = express.Router()

  router.post('', camelCaseRequestKeys, alarm)

  return router
}

async function alarm(req, res) {
  res.send()
}

module.exports = { getAlarmRoutes }
