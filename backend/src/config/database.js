/**
 * Flexible Database Configuration for Multiple BaaS Providers
 *
 * Supports: PostgreSQL, Supabase, PlanetScale, Neon, Railway, and more
 */

require('dotenv').config()

const createDatabaseConfig = () => {
  const provider = process.env.DB_PROVIDER || 'postgresql'
  const nodeEnv = process.env.NODE_ENV || 'development'

  // Base configuration that works for all providers
  const baseConfig = {
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    },
    useNullAsDefault: true,
    asyncStackTraces: nodeEnv === 'development',
    debug: nodeEnv === 'development' && process.env.DEBUG_SQL === 'true'
  }

  // Provider-specific configurations
  const providers = {
    // Standard PostgreSQL (local or hosted)
    postgresql: {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'process_pilot',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        charset: 'utf8'
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
        createTimeoutMillis: 5000,
        destroyTimeoutMillis: 5000
      }
    },

    // Supabase (PostgreSQL with additional features)
    supabase: {
      client: 'pg',
      connection: {
        connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        // Alternative individual params if needed
        host: process.env.SUPABASE_DB_HOST,
        port: parseInt(process.env.SUPABASE_DB_PORT) || 5432,
        database: process.env.SUPABASE_DB_NAME,
        user: process.env.SUPABASE_DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 1,
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000,
        createTimeoutMillis: 10000
      }
    },

    // PlanetScale (MySQL with connection pooling)
    planetscale: {
      client: 'mysql2',
      connection: {
        connectionString: process.env.PLANETSCALE_DB_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
        // Alternative individual params
        host: process.env.PLANETSCALE_DB_HOST,
        port: parseInt(process.env.PLANETSCALE_DB_PORT) || 3306,
        database: process.env.PLANETSCALE_DB_NAME,
        user: process.env.PLANETSCALE_DB_USER,
        password: process.env.PLANETSCALE_DB_PASSWORD,
        charset: 'utf8mb4'
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 1,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000
      }
    },

    // Neon (Serverless PostgreSQL)
    neon: {
      client: 'pg',
      connection: {
        connectionString: process.env.NEON_DB_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        // Individual params alternative
        host: process.env.NEON_DB_HOST,
        port: parseInt(process.env.NEON_DB_PORT) || 5432,
        database: process.env.NEON_DB_NAME,
        user: process.env.NEON_DB_USER,
        password: process.env.NEON_DB_PASSWORD
      },
      pool: {
        min: 0, // Serverless - start with 0
        max: parseInt(process.env.DB_POOL_MAX) || 5,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 180000, // Shorter for serverless
        createTimeoutMillis: 10000
      }
    },

    // Railway PostgreSQL
    railway: {
      client: 'pg',
      connection: {
        connectionString: process.env.RAILWAY_DB_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        // Individual params
        host: process.env.RAILWAY_DB_HOST,
        port: parseInt(process.env.RAILWAY_DB_PORT) || 5432,
        database: process.env.RAILWAY_DB_NAME,
        user: process.env.RAILWAY_DB_USER,
        password: process.env.RAILWAY_DB_PASSWORD
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 1,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000
      }
    },

    // Generic connection string (for any PostgreSQL-compatible service)
    generic: {
      client: process.env.DB_CLIENT || 'pg',
      connection: process.env.DATABASE_URL || {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'process_pilot',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 1,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        acquireTimeoutMillis: parseInt(process.env.DB_TIMEOUT) || 30000,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 600000
      }
    }
  }

  // Get provider config or fall back to generic
  const providerConfig = providers[provider] || providers.generic

  // Merge with base config
  const config = {
    ...baseConfig,
    ...providerConfig
  }

  // Environment-specific adjustments
  if (nodeEnv === 'test') {
    config.connection = typeof config.connection === 'string'
      ? config.connection.replace(/\/[^/]*$/, '/process_pilot_test') // Change DB name in connection string
      : { ...config.connection, database: `${config.connection.database || 'process_pilot'}_test` }

    config.pool = {
      ...config.pool,
      min: 1,
      max: 2
    }
  }

  if (nodeEnv === 'production') {
    config.pool = {
      ...config.pool,
      min: Math.max(config.pool.min, 2),
      max: Math.max(config.pool.max, 20)
    }
  }

  return config
}

// Helper function to validate database configuration
const validateConfig = (config) => {
  const requiredFields = ['client']
  const missing = requiredFields.filter(field => !config[field])

  if (missing.length > 0) {
    throw new Error(`Missing required database configuration: ${missing.join(', ')}`)
  }

  // Validate connection
  if (!config.connection) {
    throw new Error('Database connection configuration is required')
  }

  if (typeof config.connection === 'object' && !config.connection.host && !config.connection.connectionString) {
    throw new Error('Database connection must specify either host or connectionString')
  }

  return true
}

// Create and validate configuration
const databaseConfig = createDatabaseConfig()
validateConfig(databaseConfig)

// Helper to get connection info for logging (without sensitive data)
const getConnectionInfo = () => {
  const provider = process.env.DB_PROVIDER || 'postgresql'
  const config = databaseConfig.connection

  if (typeof config === 'string') {
    const url = new URL(config)
    return {
      provider,
      host: url.hostname,
      port: url.port,
      database: url.pathname.slice(1),
      ssl: url.searchParams.get('ssl') || url.searchParams.get('sslmode')
    }
  }

  return {
    provider,
    host: config.host,
    port: config.port,
    database: config.database,
    ssl: !!config.ssl
  }
}

module.exports = {
  databaseConfig,
  getConnectionInfo,
  validateConfig,
  createDatabaseConfig
}
