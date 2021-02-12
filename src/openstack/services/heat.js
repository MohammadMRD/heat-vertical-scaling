const axios = require('axios').default

const HEAT_URL = UTILS.combineURLs(process.env.OPENSTACK_URL, 'heat-api/v1')

exports.getStack = async function (token, projectId, stackId) {
  const STACK_URL = UTILS.combineURLs(HEAT_URL, `${projectId}/stacks`)

  const res = await axios({
    method: 'GET',
    url: STACK_URL,
    headers: { 'X-Auth-Token': token },
    params: { id: stackId },
  })

  return res.data.stacks[0]
}

exports.getStackAutoScalingServers = async function (token, projectId, stackId, stackName) {
  const AUTO_SCALING_SERVERS_URL = UTILS.combineURLs(
    HEAT_URL,
    `${projectId}/stacks/${stackName}/${stackId}/outputs/refs`,
  )

  const res = await axios({
    method: 'GET',
    url: AUTO_SCALING_SERVERS_URL,
    headers: { 'X-Auth-Token': token },
  })

  return res.data?.output?.output_value
}
