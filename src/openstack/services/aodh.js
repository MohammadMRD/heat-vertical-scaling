const axios = require('axios').default

const AODH_URL = UTILS.combineURLs(process.env.OPENSTACK_URL + ':8042', 'v2')

exports.getAlarm = async function(token, alarmId) {
  const ALARM_URL = UTILS.combineURLs(AODH_URL, `alarms/${alarmId}`)

  const res = await axios({
    method: 'GET',
    url: ALARM_URL,
    headers: { 'X-Auth-Token': token },
  })

  return res.data
}
