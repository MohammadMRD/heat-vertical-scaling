const axios = require('axios').default

const NOVA_URL = UTILS.combineURLs(process.env.OPENSTACK_URL, 'compute/v2.1')
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

// Resize server
exports.resizeServer = async function (token, serverId, flavorId, status) {
  const RESIZE_URL = UTILS.combineURLs(NOVA_URL, `servers/${serverId}/action`)

  if (status !== 'VERIFY_RESIZE') {
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
  }

  let serverStatus = ''
  while (serverStatus === 'VERIFY_RESIZE') {
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
