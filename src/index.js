require('dotenv').config()
require('./utils')
const logger = require('loglevel')
const { startServer } = require('./start')

logger.setLevel('info')

startServer()
