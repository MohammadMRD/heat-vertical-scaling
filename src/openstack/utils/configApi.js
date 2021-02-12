const axios = require('axios').default

if (!process.env.OPENSTACK_URL) {
  throw new Error('`OPENSTACK_URL` is required!')
}

function responseSuccessInterceptor(response) {
  response.data = UTILS.objectKeysToCamelCase(response.data)
  return response
}

axios.interceptors.response.use(responseSuccessInterceptor)
