require('./utils/configApi')
const identity = require('./services/identity')
const nova = require('./services/nova')
const aodh = require('./services/aodh')

module.exports = {
  identity,
  nova,
  aodh,
}
