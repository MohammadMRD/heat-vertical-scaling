const lowDb = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')

/**
 * @type {import('lowdb').LowdbAsync}
 */
let db

async function initDb() {
  const dbAdapter = new FileAsync(process.env.DB_PATH || './db.json')
  db = await lowDb(dbAdapter)

  db.defaults({}).write()
}

function getDb() {
  return db
}

module.exports = {
  getDb,
  initDb,
}
