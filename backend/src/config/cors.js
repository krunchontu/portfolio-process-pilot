/**
 * Production-Ready CORS Configuration
 *
 * Provides environment-specific CORS settings with security best practices
 */

const { CORS } = require('../constants')

// Note: We avoid importing logger here to prevent circular dependencies
// Logging is handled by the middleware that uses this config

/**
 * Parse CORS origins from environment variable
 */
function parseCorsOrigins(corsOrigin) {
  if (!corsOrigin) {
    return []
  }

  // Split by comma and clean up whitespace
  const origins = corsOrigin.split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0)

  return origins
}

/**
 * Validate origin format
 */
function validateOrigin(origin) {
  // Allow localhost patterns for development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true
  }

  // Validate proper URL format for production origins
  try {
    const url = new URL(origin)
    // Must be HTTPS in production (unless explicitly allowing HTTP)
    const isSecure = url.protocol === 'https:' || process.env.ALLOW_HTTP_ORIGINS === 'true'
    return isSecure
  } catch (error) {
    return false
  }
}

/**
 * Create environment-specific CORS configuration
 */
function createCorsConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const corsOrigin = process.env.CORS_ORIGIN || ''
  const allowCredentials = process.env.CORS_CREDENTIALS !== 'false'

  const corsConfig = {
    credentials: allowCredentials,
    optionsSuccessStatus: CORS.OPTIONS_SUCCESS_STATUS, // Support legacy browsers
    maxAge: parseInt(process.env.CORS_MAX_AGE) || CORS.DEFAULT_MAX_AGE // 24 hours
  }

  if (nodeEnv === 'development') {
    // Development: Allow localhost and common development origins
    const devOrigins = [
      ...CORS.DEVELOPMENT_ORIGINS
    ]

    if (corsOrigin) {
      const customOrigins = parseCorsOrigins(corsOrigin)
      devOrigins.push(...customOrigins)
    }

    corsConfig.origin = (origin, callback) => {
      // Allow requests with no origin (mobile apps, postman, etc.)
      if (!origin) return callback(null, true)

      if (devOrigins.includes(origin)) {
        return callback(null, true)
      }

      console.warn(`CORS: Blocked origin in development: ${origin}`)
      return callback(new Error(`CORS: Origin ${origin} not allowed in development`))
    }

    console.info('🌍 CORS configured for development', { allowedOrigins: devOrigins })
  } else if (nodeEnv === 'test') {
    // Test: Allow all origins for testing
    corsConfig.origin = true
  } else {
    // Production: Strict origin validation
    if (!corsOrigin) {
      console.error('❌ CORS_ORIGIN must be configured for production environment')
      throw new Error('CORS_ORIGIN is required in production')
    }

    const allowedOrigins = parseCorsOrigins(corsOrigin)

    // Validate all origins
    const invalidOrigins = allowedOrigins.filter(origin => !validateOrigin(origin))
    if (invalidOrigins.length > 0) {
      console.error('❌ Invalid CORS origins detected:', invalidOrigins)
      throw new Error(`Invalid CORS origins: ${invalidOrigins.join(', ')}`)
    }

    corsConfig.origin = (origin, callback) => {
      // In production, we're more strict about origins
      if (!origin && process.env.ALLOW_NO_ORIGIN !== 'true') {
        return callback(new Error('CORS: Origin required in production'))
      }

      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      // Log blocked attempts for security monitoring
      console.warn('🚫 CORS: Blocked unauthorized origin', {
        origin,
        userAgent: 'N/A', // Would need to be passed from middleware
        timestamp: new Date().toISOString()
      })

      return callback(new Error(`CORS: Origin ${origin} not allowed`))
    }

    console.info('🔒 CORS configured for production', {
      allowedOrigins: allowedOrigins.length,
      credentials: allowCredentials
    })
  }

  // Add additional security headers in production
  if (nodeEnv === 'production') {
    corsConfig.exposedHeaders = [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID'
    ]

    // Restrict allowed headers in production
    corsConfig.allowedHeaders = [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID'
    ]

    corsConfig.methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }

  return corsConfig
}

/**
 * Middleware to add additional CORS security headers
 */
function additionalCorsHeaders(req, res, next) {
  const nodeEnv = process.env.NODE_ENV || 'development'

  if (nodeEnv === 'production') {
    // Add security headers for production
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Add CORS timing attack protection
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  }

  next()
}

/**
 * Log CORS events for monitoring
 */
function logCorsEvents(req, res, next) {
  const origin = req.get('Origin')

  if (origin) {
    // Logging will be handled by the middleware using the logger
    // We don't import logger here to avoid circular dependencies
    req.corsInfo = {
      origin,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }
  }

  next()
}

/**
 * Validate CORS configuration at startup
 */
function validateCorsConfiguration() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const corsOrigin = process.env.CORS_ORIGIN || ''

  if (nodeEnv === 'production') {
    if (!corsOrigin) {
      throw new Error('CORS_ORIGIN is required in production environment')
    }

    const origins = parseCorsOrigins(corsOrigin)
    if (origins.length === 0) {
      throw new Error('At least one CORS origin must be specified in production')
    }

    // Check for common security issues
    const securityIssues = []

    if (origins.includes('*')) {
      securityIssues.push('Wildcard (*) origins are not allowed in production')
    }

    if (origins.some(origin => origin.includes('localhost'))) {
      securityIssues.push('Localhost origins should not be used in production')
    }

    if (origins.some(origin => origin.startsWith('http://') && !origin.includes('localhost'))) {
      securityIssues.push('HTTP origins are not recommended in production (use HTTPS)')
    }

    if (securityIssues.length > 0) {
      console.warn('⚠️  CORS security warnings:', securityIssues)
    }
  }

  console.info('✅ CORS configuration validated')
}

module.exports = {
  createCorsConfig,
  additionalCorsHeaders,
  logCorsEvents,
  validateCorsConfiguration,
  parseCorsOrigins,
  validateOrigin
}
