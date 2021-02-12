require('./utils/configApi')
const identity = require('./services/identity')
const nova = require('./services/nova')
const aodh = require('./services/aodh')
const heat = require('./services/heat')

module.exports = {
  identity,
  nova,
  aodh,
  heat,
}
