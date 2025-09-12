const crypto = require('crypto')
const { logger } = require('../utils/logger')

/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern for CSRF protection
 */

// HMAC-based token signing for stateless CSRF validation
const getCsrfSecret = () => {
  return process.env.CSRF_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET
}

const signToken = (raw) => {
  const secret = getCsrfSecret()
  const hmac = crypto.createHmac('sha256', String(secret || ''))
  hmac.update(raw)
  return hmac.digest('hex')
}

// Generate CSRF token: raw.random + "." + hmac(raw)
const generateCSRFToken = () => {
  const raw = crypto.randomBytes(32).toString('hex')
  const sig = signToken(raw)
  return `${raw}.${sig}`
}

// CSRF middleware for creating and validating tokens
const csrfProtection = {
  // Generate CSRF token for safe methods
  generateToken: (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      const csrfToken = generateCSRFToken()

      // Set CSRF token in cookie (readable by frontend)
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, // client must read to echo in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      })

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
    const tokenFromBody = req.body && req.body._csrf
    const csrfToken = tokenFromHeader || tokenFromBody

    // Get token from cookie
    const cookieToken = req.cookies && req.cookies['XSRF-TOKEN']

    if (!csrfToken || !cookieToken) {
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

    // Require equality between header/body token and cookie token (double submit)
    if (csrfToken !== cookieToken) {
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

    // Verify token signature
    const [raw, sig] = String(csrfToken).split('.')
    if (!raw || !sig) {
      logger.warn('CSRF token format invalid', { path: req.path, method: req.method })
      return res.status(403).json({ success: false, error: 'CSRF token invalid', code: 'CSRF_TOKEN_INVALID' })
    }
    const expectedSig = signToken(raw)
    // Use timing-safe equality
    const validSig = expectedSig.length === sig.length && crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))
    if (!validSig) {
      logger.warn('CSRF token signature invalid', { path: req.path, method: req.method })
      return res.status(403).json({ success: false, error: 'CSRF token invalid', code: 'CSRF_TOKEN_INVALID' })
    }

    next()
  },

  // Middleware to add CSRF token to API responses
  addTokenToResponse: (req, res, next) => {
    // Override res.json to include CSRF token
    const originalJson = res.json
    res.json = function (data) {
      if (res.locals.csrfToken && typeof data === 'object' && data !== null) {
        data.csrfToken = res.locals.csrfToken
      }
      return originalJson.call(this, data)
    }
    next()
  }
}

module.exports = csrfProtection
