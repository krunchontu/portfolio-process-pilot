const knex = require('knex')
const config = require('../config')
const { logger } = require('../utils/logger')

const knexConfig = require('../../knexfile')[config.nodeEnv]

// Enhanced database configuration with connection pooling and retry logic
const enhancedKnexConfig = {
  ...knexConfig,
  pool: {
    ...knexConfig.pool,
    // Connection pool configuration
    min: knexConfig.pool?.min || 2,
    max: knexConfig.pool?.max || 10,
    // Connection timeout (30 seconds)
    acquireTimeoutMillis: 30000,
    // Idle timeout (10 minutes)
    idleTimeoutMillis: 600000,
    // Connection creation timeout (5 seconds)
    createTimeoutMillis: 5000,
    // Destroy timeout (5 seconds)
    destroyTimeoutMillis: 5000,
    // Connection validation
    validate: (connection) => {
      return connection && connection.readyState === 'open'
    },
    // Retry configuration
    afterCreate: (connection, callback) => {
      // Set connection-level configurations
      connection.query('SET timezone = "UTC"', (err) => {
        callback(err, connection)
      })
    }
  },
  // Connection retry configuration
  connection: {
    ...knexConfig.connection,
    // Connection timeout
    requestTimeout: 30000,
    connectionTimeout: 5000,
    // Enable connection keepalive
    options: {
      ...knexConfig.connection?.options,
      keepAlive: true,
      keepAliveInitialDelay: 0,
      encrypt: false
    }
  },
  // Query timeout
  asyncStackTraces: config.nodeEnv === 'development',
  debug: config.nodeEnv === 'development'
}

const db = knex(enhancedKnexConfig)

// Database connection retry logic
const retryConnection = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      return result
    } catch (error) {
      logger.warn(`Database operation attempt ${attempt} failed:`, error.message)
      
      if (attempt === maxRetries) {
        logger.error('Database operation failed after all retries:', error)
        throw error
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1)
      logger.info(`Retrying database operation in ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

// Enhanced connection test with retry logic
const testConnection = async () => {
  try {
    await retryConnection(async () => {
      await db.raw('SELECT 1 as connection_test')
      logger.info('✅ Database connection established successfully')
      return true
    })
    
    // Log connection pool status
    const pool = db.client.pool
    logger.info(`Database pool status: ${pool.numUsed()}/${pool.numFree()} (used/free), max: ${pool.max}`)
    
  } catch (error) {
    logger.error('❌ Database connection failed after all retries:', error.message)
    
    if (config.nodeEnv === 'production') {
      // In production, exit gracefully
      process.exit(1)
    } else {
      // In development, log but continue (for development without DB)
      logger.warn('⚠️ Continuing without database connection (development mode)')
    }
  }
}

// Enhanced graceful shutdown with connection draining
const closeConnection = async () => {
  try {
    // Wait for active queries to complete (up to 10 seconds)
    const pool = db.client.pool
    const startTime = Date.now()
    const maxWaitTime = 10000 // 10 seconds
    
    while (pool.numUsed() > 0 && (Date.now() - startTime) < maxWaitTime) {
      logger.info(`Waiting for ${pool.numUsed()} active database connections to finish...`)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Destroy the connection pool
    await db.destroy()
    logger.info('✅ Database connection pool closed successfully')
    
  } catch (error) {
    logger.error('❌ Error closing database connection:', error.message)
    throw error
  }
}

// Database health check
const healthCheck = async () => {
  try {
    const result = await retryConnection(async () => {
      const start = Date.now()
      await db.raw('SELECT 1 as health_check')
      const duration = Date.now() - start
      return { status: 'healthy', response_time: `${duration}ms` }
    }, 2, 500) // Faster retry for health checks
    
    const pool = db.client.pool
    return {
      ...result,
      pool_status: {
        used: pool.numUsed(),
        free: pool.numFree(),
        pending: pool.numPendingAcquires(),
        max: pool.max,
        min: pool.min
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      pool_status: {
        used: 0,
        free: 0,
        pending: 0,
        max: 0,
        min: 0
      }
    }
  }
}

// Wrapper for database operations with automatic retry
const dbWithRetry = {
  // Proxy all knex methods with retry logic for critical operations
  raw: (query, bindings) => retryConnection(() => db.raw(query, bindings)),
  select: (table) => db.select(table), // Read operations typically don't need retry
  insert: (table) => db.insert(table), // Let individual operations handle retries
  update: (table) => db.update(table),
  delete: (table) => db.delete(table),
  transaction: (callback) => retryConnection(() => db.transaction(callback)),
  
  // Direct access to original knex instance for advanced usage
  knex: db
}

module.exports = {
  db,
  dbWithRetry,
  testConnection,
  closeConnection,
  healthCheck,
  retryConnection
}
