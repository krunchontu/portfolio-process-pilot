const knex = require('knex')
const config = require('../config')

const knexConfig = require('../../knexfile')[config.nodeEnv]

const db = knex(knexConfig)

// Test the connection
const testConnection = async () => {
  try {
    await db.raw('SELECT 1')
    console.log('✅ Database connection established successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  }
}

// Graceful shutdown
const closeConnection = async () => {
  await db.destroy()
  console.log('Database connection closed')
}

module.exports = {
  db,
  testConnection,
  closeConnection
}
