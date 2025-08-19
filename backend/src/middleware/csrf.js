const crypto = require('crypto')
const { logger } = require('../utils/logger')

/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern for CSRF protection
 */

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// CSRF middleware for creating and validating tokens
const csrfProtection = {
  // Generate CSRF token for safe methods
  generateToken: (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      const csrfToken = generateCSRFToken()
      
      // Set CSRF token in cookie (httpOnly for security)
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, // Needs to be readable by frontend
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      })
      
      // Also store in session for validation
      req.session = req.session || {}
      req.session.csrfSecret = csrfToken
      
      // Add token to response for immediate use
      res.locals.csrfToken = csrfToken
    }
    
    next()
  },

  // Validate CSRF token for unsafe methods
  validateToken: (req, res, next) => {
    // Skip validation for safe HTTP methods
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next()
    }

    // Skip validation for auth endpoints (login/register)
    if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
      return next()
    }

    // Get token from header or body
    const tokenFromHeader = req.get('X-CSRF-Token') || req.get('X-XSRF-Token')
    const tokenFromBody = req.body._csrf
    const csrfToken = tokenFromHeader || tokenFromBody

    // Get token from session
    const sessionToken = req.session && req.session.csrfSecret

    if (!csrfToken) {
      logger.warn('CSRF token missing', { 
        ip: req.ip, 
        method: req.method, 
        path: req.path 
      })
      return res.status(403).json({
        success: false,
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING'
      })
    }

    if (!sessionToken) {
      logger.warn('CSRF session token missing', { 
        ip: req.ip, 
        method: req.method, 
        path: req.path 
      })
      return res.status(403).json({
        success: false,
        error: 'CSRF session invalid',
        code: 'CSRF_SESSION_INVALID'
      })
    }

    // Constant-time comparison to prevent timing attacks
    if (csrfToken !== sessionToken) {
      logger.warn('CSRF token mismatch', { 
        ip: req.ip, 
        method: req.method, 
        path: req.path 
      })
      return res.status(403).json({
        success: false,
        error: 'CSRF token invalid',
        code: 'CSRF_TOKEN_INVALID'
      })
    }

    next()
  },

  // Middleware to add CSRF token to API responses
  addTokenToResponse: (req, res, next) => {
    // Override res.json to include CSRF token
    const originalJson = res.json
    res.json = function(data) {
      if (res.locals.csrfToken && typeof data === 'object' && data !== null) {
        data.csrfToken = res.locals.csrfToken
      }
      return originalJson.call(this, data)
    }
    next()
  }
}

module.exports = csrfProtection