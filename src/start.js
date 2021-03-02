const express = require('express')
const logger = require('loglevel')
const morgan = require('morgan')
require('express-async-errors')
const { getRoutes } = require('./routes')

function startServer({ port = process.env.PORT } = {}) {
  const app = express()

  app.use(express.json())
  app.use(morgan('tiny'))
  app.use('/', getRoutes())
  app.use(errorMiddleware)

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Listening on port ${server.address().port}`)

      const originalClose = server.close.bind(server)

      server.close = () => {
        return new Promise((resolve) => {
          originalClose(resolve)
        })
      }

      setupCloseOnExit(server)
      resolve(server)
    })
  })
}

function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    next(error)
  } else {
    logger.error(error)
    res.status(500)
    res.json({
      message: error.message,
      ...(process.env.NODE_ENV === 'production' ? null : { stack: error.stack }),
    })
  }
}

function setupCloseOnExit(server) {
  async function exitHandler(options = {}) {
    await server
      .close()
      .then(() => {
        logger.info('Server successfully closed')
      })
      .catch((e) => {
        logger.warn('Something went wrong closing the server', e.stack)
      })
    if (options.exit) process.exit()
  }

  // do something when app is closing
  process.on('exit', exitHandler)
  // catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, { exit: true }))
  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
  process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))
  // catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
}

module.exports = { startServer }
