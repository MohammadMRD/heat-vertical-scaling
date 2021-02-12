const _ = require('lodash')

module.exports = function objectKeysToCamelCase(obj) {
  const camelCaseObject = {}

  _.forEach(obj, (value, key) => {
    if (_.isPlainObject(value)) {
      value = objectKeysToCamelCase(value)
    }

    camelCaseObject[_.camelCase(key)] = value
  })

  return camelCaseObject
}
