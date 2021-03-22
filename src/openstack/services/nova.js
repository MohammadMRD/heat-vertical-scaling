const axios = require('axios').default

const NOVA_URL = process.env.OPENSTACK_URL + process.env.NOVA_URL
const RESIZE_CHECK_INTERVAL_TIME = 2000

// List of all flavors with details
exports.getFlavors = async function (token) {
  const FLAVORS_URL = UTILS.combineURLs(NOVA_URL, '/flavors/detail')

  const res = await axios({
    method: 'GET',
    url: FLAVORS_URL,
    headers: { 'X-Auth-Token': token },
  })

  return res.data.flavors
}

// Get server's info
exports.getServer = async function (token, serverId) {
  const SERVER_URL = UTILS.combineURLs(NOVA_URL, `servers/${serverId}`)

  const res = await axios({
    method: 'GET',
    url: SERVER_URL,
    headers: { 'X-Auth-Token': token },
  })

  return res.data.server
}

// Get all servers
exports.getServers = async function (token, projectId) {
  const SERVER_URL = UTILS.combineURLs(NOVA_URL, `servers/detail`)
  const params = { all_tenants: 1 }

  projectId && (params.project_id = projectId)

  const res = await axios({
    method: 'GET',
    url: SERVER_URL,
    params,
    headers: { 'X-Auth-Token': token },
  })

  return res.data.servers
}

// Resize server
exports.resizeServer = async function (token, serverId, flavorId, status) {
  const RESIZE_URL = UTILS.combineURLs(NOVA_URL, `servers/${serverId}/action`)

  if (status !== 'VERIFY_RESIZE') {
    try {
      await axios({
        method: 'POST',
        url: RESIZE_URL,
        headers: { 'X-Auth-Token': token },
        data: {
          resize: {
            flavorRef: flavorId,
            'OS-DCF:diskConfig': 'AUTO',
          },
        },
      })
    } catch (error) {
      if (error?.response?.status !== 409) throw error
    }
  }

  let serverStatus = ''
  while (serverStatus !== 'VERIFY_RESIZE') {
    await UTILS.delay(RESIZE_CHECK_INTERVAL_TIME)
    const { status } = await exports.getServer(token, serverId)
    serverStatus = status
  }

  await axios({
    method: 'POST',
    url: RESIZE_URL,
    headers: { 'X-Auth-Token': token },
    data: { confirmResize: null },
  })
}
