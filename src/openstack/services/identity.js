const axios = require('axios').default

const IDENTITY_URL = process.env.OPENSTACK_URL + process.env.IDENTITY_URL

async function authenticate(user, scope) {
  const TOKEN_URL = UTILS.combineURLs(IDENTITY_URL, '/auth/tokens')
  const body = { auth: {} }

  if (typeof user === 'string') {
    body.auth.identity = {
      methods: ['token'],
      token: { id: user },
    }
  } else {
    body.auth.identity = {
      methods: ['password'],
      password: { user: user },
    }
  }

  if (scope) {
    body.auth.scope = scope
  }

  const res = await axios({
    method: 'POST',
    url: TOKEN_URL,
    data: body,
  })

  return res.headers['x-subject-token']
}

/**
 * @typedef AuthenticateOptions
 * @property {string} endpoint
 * @property {string} name
 * @property {string} password
 * @property {string} userDomainId
 * @property {string} userDomainName
 * @property {string} userTenantName
 * @property {string} token
 * @property {string} projectId
 * @property {string} projectName
 * @property {string} projectDomainName
 * @property {string} projectDomainId
 * @property {string} domain
 * @property {string} domainName
 * @property {string} trust
 *
 * @param {AuthenticateOptions} opts
 * @return {Promise<string>} token
 */
exports.getToken = async function (opts) {
  let user = null
  let scope = null

  if (opts.name && opts.password) {
    user = {
      name: opts.name,
      password: opts.password,
    }

    if (opts.userDomainName) {
      user.domain = { name: opts.userDomainName }
    }
    if (opts.userDomainId) {
      user.domain = { id: opts.userDomainId }
    }
    if (opts.userTenantName) {
      user.tenantName = opts.userTenantName
    }
  } else if (opts.token) {
    user = opts.token
  } else {
    throw new Error('Missing user name or password or token')
  }

  if (opts.projectId) {
    scope = { project: { id: opts.projectId } }
  } else if (opts.projectName && opts.projectDomainName) {
    scope = {
      project: {
        name: opts.projectName,
        domain: { name: opts.projectDomainName },
      },
    }
  } else if (opts.projectName && opts.projectDomainId) {
    scope = {
      project: {
        name: opts.projectName,
        domain: { id: opts.projectDomainId },
      },
    }
  } else if (opts.domainId) {
    scope = { domain: { id: opts.domainId } }
  } else if (opts.domainName) {
    scope = { domain: { name: opts.domainName } }
  } else if (opts.trust) {
    scope = { 'OS-TRUST:trust': { id: opts.trust } }
  }

  return authenticate(user, scope)
}
