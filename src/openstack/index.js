require('./utils/configApi')
const identity = require('./services/identity')
const nova = require('./services/nova')

module.exports = {
  identity,
  nova,
}
