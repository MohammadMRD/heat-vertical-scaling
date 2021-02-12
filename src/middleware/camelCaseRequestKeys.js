module.exports = function (req, res, next) {
  req.body = UTILS.objectKeysToCamelCase(req.body)
  req.query = UTILS.objectKeysToCamelCase(req.query)

  next()
}
