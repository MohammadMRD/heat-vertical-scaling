const express = require('express')
const { getAlarmRoutes } = require('./alarm')

function getRoutes() {
  const router = express.Router()

  router.use('', getAlarmRoutes())

  return router
}

module.exports = { getRoutes }
