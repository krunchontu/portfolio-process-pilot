/**
 * Comprehensive Environment Variable Validation
 *
 * Validates all required and optional environment variables at application startup
 * Provides detailed error messages and suggestions for missing or invalid values
 */

const { logger } = require('../utils/logger')

/**
 * Environment variable schema definitions
 */
const ENV_SCHEMA = {
  // Core server configuration
  NODE_ENV: {
    required: true,
    type: 'string',
    enum: ['development', 'test', 'production'],
    default: 'development',
    description: 'Application environment'
  },
  PORT: {
    required: false,
    type: 'number',
    min: 1000,
    max: 65535,
    default: 5000,
    description: 'Server port number'
  },
  HOST: {
    required: false,
    type: 'string',
    default: 'localhost',
    description: 'Server host address'
  },

  // Database configuration
  DB_PROVIDER: {
    required: false,
    type: 'string',
    enum: ['postgresql', 'supabase', 'planetscale', 'neon', 'railway', 'generic'],
    default: 'postgresql',
    description: 'Database provider type'
  },
  DB_HOST: {
    required: function (env) {
      return (env.DB_PROVIDER === 'postgresql' || env.DB_PROVIDER === undefined) && !env.DATABASE_URL
    },
    type: 'string',
    description: 'Database host address'
  },
  DB_PORT: {
    required: false,
    type: 'number',
    min: 1,
    max: 65535,
    default: function (env) {
      return env.DB_PROVIDER === 'planetscale' ? 3306 : 5432
    },
    description: 'Database port number'
  },
  DB_NAME: {
    required: function (env) {
      return env.DB_PROVIDER === 'postgresql' && !env.DATABASE_URL
    },
    type: 'string',
    minLength: 1,
    description: 'Database name'
  },
  DB_USER: {
    required: function (env) {
      return env.DB_PROVIDER === 'postgresql' && !env.DATABASE_URL
    },
    type: 'string',
    minLength: 1,
    description: 'Database username'
  },
  DB_PASSWORD: {
    required: function (env) {
      return env.DB_PROVIDER === 'postgresql' && !env.DATABASE_URL
    },
    type: 'string',
    sensitive: true,
    description: 'Database password'
  },
  DATABASE_URL: {
    required: function (env) {
      return ['supabase', 'planetscale', 'neon', 'railway'].includes(env.DB_PROVIDER)
    },
    type: 'url',
    sensitive: true,
    description: 'Complete database connection URL'
  },
  DB_SSL: {
    required: false,
    type: 'boolean',
    default: false,
    description: 'Enable SSL for database connections'
  },
  DB_POOL_MIN: {
    required: false,
    type: 'number',
    min: 0,
    max: 50,
    default: 2,
    description: 'Minimum database connection pool size'
  },
  DB_POOL_MAX: {
    required: false,
    type: 'number',
    min: 1,
    max: 100,
    default: 10,
    description: 'Maximum database connection pool size'
  },

  // JWT Configuration
  JWT_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    sensitive: true,
    description: 'JWT signing secret (minimum 32 characters)',
    validate: function (value) {
      if (value === 'your-super-secret-jwt-key-min-32-chars-long') {
        return 'JWT_SECRET must be changed from default value'
      }
      return true
    }
  },
  JWT_EXPIRES_IN: {
    required: false,
    type: 'string',
    pattern: /^(\d+[smhd]|\d+)$/,
    default: '15m',
    description: 'JWT token expiration time (e.g., 15m, 1h, 7d)'
  },
  JWT_REFRESH_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    sensitive: true,
    description: 'JWT refresh token secret (minimum 32 characters)',
    validate: function (value) {
      if (value === 'your-refresh-token-secret-key') {
        return 'JWT_REFRESH_SECRET must be changed from default value'
      }
      return true
    }
  },
  JWT_REFRESH_EXPIRES_IN: {
    required: false,
    type: 'string',
    pattern: /^(\d+[smhd]|\d+)$/,
    default: '7d',
    description: 'JWT refresh token expiration time'
  },

  // Email Configuration (Optional)
  SMTP_HOST: {
    required: false,
    type: 'string',
    description: 'SMTP server hostname'
  },
  SMTP_PORT: {
    required: function (env) { return !!env.SMTP_HOST },
    type: 'number',
    min: 1,
    max: 65535,
    default: 587,
    description: 'SMTP server port'
  },
  SMTP_USER: {
    required: function (env) { return !!env.SMTP_HOST },
    type: 'email',
    description: 'SMTP username/email'
  },
  SMTP_PASS: {
    required: function (env) { return !!env.SMTP_HOST },
    type: 'string',
    sensitive: true,
    description: 'SMTP password/app password'
  },
  FROM_EMAIL: {
    required: function (env) { return !!env.SMTP_HOST },
    type: 'email',
    description: 'Default sender email address'
  },

  // Security & Rate Limiting
  SESSION_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    sensitive: true,
    description: 'Session secret for CSRF protection',
    validate: function (value) {
      if (value === 'your-session-secret-for-csrf') {
        return 'SESSION_SECRET must be changed from default value'
      }
      return true
    }
  },
  RATE_LIMIT_WINDOW_MS: {
    required: false,
    type: 'number',
    min: 60000, // 1 minute minimum
    max: 3600000, // 1 hour maximum
    default: 900000, // 15 minutes
    description: 'Rate limiting time window in milliseconds'
  },
  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    type: 'number',
    min: 10,
    max: 10000,
    default: 100,
    description: 'Maximum requests per rate limit window'
  },

  // CORS Configuration
  CORS_ORIGIN: {
    required: false,
    type: 'string',
    default: function (env) {
      return env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'
    },
    description: 'CORS allowed origins (comma-separated for multiple)'
  },

  // Logging
  LOG_LEVEL: {
    required: false,
    type: 'string',
    enum: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
    default: function (env) {
      return env.NODE_ENV === 'production' ? 'info' : 'debug'
    },
    description: 'Logging level'
  },
  LOG_FORMAT: {
    required: false,
    type: 'string',
    enum: ['combined', 'common', 'dev', 'short', 'tiny'],
    default: 'combined',
    description: 'HTTP request logging format'
  },

  // File Upload
  MAX_FILE_SIZE: {
    required: false,
    type: 'number',
    min: 1024, // 1KB minimum
    max: 104857600, // 100MB maximum
    default: 5242880, // 5MB
    description: 'Maximum file upload size in bytes'
  },
  UPLOAD_PATH: {
    required: false,
    type: 'string',
    default: './uploads',
    description: 'File upload directory path'
  },

  // Optional External Services
  REDIS_URL: {
    required: false,
    type: 'url',
    description: 'Redis connection URL for caching'
  },
  SLACK_WEBHOOK_URL: {
    required: false,
    type: 'url',
    sensitive: true,
    description: 'Slack webhook URL for notifications'
  },
  TEAMS_WEBHOOK_URL: {
    required: false,
    type: 'url',
    sensitive: true,
    description: 'Microsoft Teams webhook URL for notifications'
  },

  // Development & Testing
  DEBUG_SQL: {
    required: false,
    type: 'boolean',
    default: false,
    description: 'Enable SQL query debugging'
  }
}

/**
 * Validation helper functions
 */
const validators = {
  string: (value, schema, key) => {
    if (typeof value !== 'string') {
      return `${key} must be a string`
    }
    if (schema.minLength && value.length < schema.minLength) {
      return `${key} must be at least ${schema.minLength} characters long`
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      return `${key} must be no more than ${schema.maxLength} characters long`
    }
    if (schema.pattern && !schema.pattern.test(value)) {
      return `${key} format is invalid`
    }
    if (schema.enum && !schema.enum.includes(value)) {
      return `${key} must be one of: ${schema.enum.join(', ')}`
    }
    return true
  },

  number: (value, schema, key) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) {
      return `${key} must be a valid number`
    }
    if (schema.min !== undefined && num < schema.min) {
      return `${key} must be at least ${schema.min}`
    }
    if (schema.max !== undefined && num > schema.max) {
      return `${key} must be no more than ${schema.max}`
    }
    return true
  },

  boolean: (value, schema, key) => {
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value?.toLowerCase())) {
      return `${key} must be a boolean value (true/false, 1/0, yes/no)`
    }
    return true
  },

  email: (value, schema, key) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return `${key} must be a valid email address`
    }
    return true
  },

  url: (value, schema, key) => {
    try {
      new URL(value) // eslint-disable-line no-new
      return true
    } catch (error) {
      return `${key} must be a valid URL`
    }
  }
}

/**
 * Parse environment value based on type
 */
function parseEnvValue(value, type) {
  if (value === undefined || value === null) {
    return undefined
  }

  switch (type) {
    case 'number':
      return parseInt(value, 10)
    case 'boolean':
      return ['true', '1', 'yes'].includes(String(value || '').toLowerCase())
    case 'string':
    case 'email':
    case 'url':
    default:
      return value
  }
}

/**
 * Get default value for a schema field
 */
function getDefaultValue(schema, env) {
  if (typeof schema.default === 'function') {
    return schema.default(env)
  }
  return schema.default
}

/**
 * Check if field is required based on schema
 */
function isRequired(schema, env) {
  if (typeof schema.required === 'function') {
    return schema.required(env)
  }
  return schema.required === true
}

/**
 * Validate a single environment variable
 */
function validateEnvVar(key, value, schema, env) {
  const errors = []

  // Check if required
  if (isRequired(schema, env) && (value === undefined || value === null || value === '')) {
    errors.push(`${key} is required${schema.description ? ` (${schema.description})` : ''}`)
    return errors
  }

  // Skip validation if value is empty and not required
  if (!value && !isRequired(schema, env)) {
    return errors
  }

  // Validate type
  if (schema.type && validators[schema.type]) {
    const result = validators[schema.type](value, schema, key)
    if (result !== true) {
      errors.push(result)
    }
  }

  // Custom validation function
  if (schema.validate && typeof schema.validate === 'function') {
    const result = schema.validate(value, env)
    if (result !== true) {
      errors.push(`${key}: ${result}`)
    }
  }

  return errors
}

/**
 * Validate all environment variables
 */
function validateEnvironment(env = process.env) {
  const errors = []
  const warnings = []
  const validatedEnv = {}

  // First pass: collect all values and apply defaults
  for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
    let value = env[key]

    // Apply default if value is missing
    if ((value === undefined || value === null || value === '') && schema.default !== undefined) {
      value = getDefaultValue(schema, env)
      if (!env[key]) {
        warnings.push(`${key} not set, using default: ${schema.sensitive ? '[REDACTED]' : value}`)
      }
    }

    // Parse value based on type
    validatedEnv[key] = parseEnvValue(value, schema.type)
  }

  // Second pass: validate with complete environment context
  for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
    const value = env[key] || getDefaultValue(schema, validatedEnv)
    const fieldErrors = validateEnvVar(key, value, schema, validatedEnv)
    errors.push(...fieldErrors)
  }

  // Production-specific validations
  if (env.NODE_ENV === 'production') {
    const productionChecks = [
      {
        condition: !env.JWT_SECRET || env.JWT_SECRET.includes('your-'),
        message: 'JWT_SECRET must be set to a secure value in production'
      },
      {
        condition: !env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.includes('your-'),
        message: 'JWT_REFRESH_SECRET must be set to a secure value in production'
      },
      {
        condition: !env.SESSION_SECRET || env.SESSION_SECRET.includes('your-'),
        message: 'SESSION_SECRET must be set to a secure value in production'
      },
      {
        condition: !env.CORS_ORIGIN || env.CORS_ORIGIN === 'http://localhost:3000',
        message: 'CORS_ORIGIN must be configured for production domains'
      },
      {
        condition: env.DB_PROVIDER === 'postgresql' && env.DB_SSL === 'false' && !env.DATABASE_URL,
        message: 'Database SSL should be enabled in production'
      }
    ]

    productionChecks.forEach(check => {
      if (check.condition) {
        errors.push(`[PRODUCTION] ${check.message}`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    env: validatedEnv
  }
}

/**
 * Print validation results
 */
function printValidationResults(results) {
  const { isValid, errors, warnings } = results

  if (warnings.length > 0) {
    logger.warn('Environment configuration warnings:')
    warnings.forEach(warning => {
      logger.warn(`  ⚠️  ${warning}`)
    })
    console.log()
  }

  if (!isValid) {
    logger.error('❌ Environment validation failed:')
    errors.forEach(error => {
      logger.error(`  • ${error}`)
    })
    console.log()
    logger.error('💡 Please check your .env file and ensure all required variables are set.')
    logger.error('📖 Refer to .env.example for guidance.')
    return false
  }

  logger.info('✅ Environment validation passed')
  return true
}

/**
 * Get environment summary for logging (without sensitive data)
 */
function getEnvironmentSummary(env = process.env) {
  const summary = {
    NODE_ENV: env.NODE_ENV || 'development',
    PORT: env.PORT || 5000,
    DB_PROVIDER: env.DB_PROVIDER || 'postgresql',
    EMAIL_CONFIGURED: !!(env.SMTP_HOST && env.SMTP_USER),
    REDIS_CONFIGURED: !!env.REDIS_URL,
    LOG_LEVEL: env.LOG_LEVEL || 'info'
  }

  return summary
}

/**
 * Validate and initialize environment configuration
 */
function initializeEnvironment() {
  logger.info('🔍 Validating environment configuration...')

  const results = validateEnvironment()
  const isValid = printValidationResults(results)

  if (!isValid) {
    process.exit(1)
  }

  // Log environment summary
  const summary = getEnvironmentSummary()
  logger.info('🌍 Environment summary:', summary)

  return results.env
}

module.exports = {
  ENV_SCHEMA,
  validateEnvironment,
  initializeEnvironment,
  getEnvironmentSummary,
  printValidationResults
}
