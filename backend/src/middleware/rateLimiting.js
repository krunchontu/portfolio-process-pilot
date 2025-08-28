/**
 * Enhanced Rate Limiting Middleware
 *
 * Provides sophisticated rate limiting based on user ID and IP address
 * with different limits for authenticated vs anonymous users
 */

const rateLimit = require('express-rate-limit')
const { loggers } = require('../utils/logger')
const { RATE_LIMIT, HTTP_STATUS, TIME_SECONDS } = require('../constants')

// In-memory store fallback (for development)
class MemoryStore {
  constructor() {
    this.store = new Map()
    this.resetTime = new Map()
  }

  async incr(key) {
    const now = Date.now()
    const data = this.store.get(key) || { count: 0, resetTime: now + RATE_LIMIT.WINDOW.FIFTEEN_MINUTES }

    // Reset if time window expired
    if (now > data.resetTime) {
      data.count = 1
      data.resetTime = now + RATE_LIMIT.WINDOW.FIFTEEN_MINUTES
    } else {
      data.count += 1
    }

    this.store.set(key, data)

    return {
      current: data.count,
      remaining: Math.max(0, this.getLimit(key) - data.count),
      reset: new Date(data.resetTime)
    }
  }

  async decrement(key) {
    const data = this.store.get(key)
    if (data && data.count > 0) {
      data.count -= 1
      this.store.set(key, data)
    }
  }

  async resetKey(key) {
    this.store.delete(key)
  }

  getLimit(key) {
    // Default limits - will be overridden by specific limiters
    return key.includes('auth:') ? RATE_LIMIT.LIMITS.AUTH_ANONYMOUS : RATE_LIMIT.LIMITS.API_ANONYMOUS
  }
}

// Create store instance (using memory store for now)
const createStore = () => {
  return new MemoryStore()
}

const store = createStore()

// Generate rate limit key based on user and IP
const generateKey = (req, prefix = 'api') => {
  const userId = req.user?.id
  const ip = req.ip || req.connection.remoteAddress

  if (userId) {
    return `${prefix}:user:${userId}`
  }
  return `${prefix}:ip:${ip}`
}

// Enhanced rate limiter with user/IP distinction
const createRateLimiter = (options = {}) => {
  const {
    windowMs = RATE_LIMIT.WINDOW.FIFTEEN_MINUTES,
    authenticated = { max: RATE_LIMIT.LIMITS.API_ANONYMOUS, message: 'Too many requests from authenticated user' },
    anonymous = { max: 20, message: 'Too many requests from this IP' },
    prefix = 'api',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onExceeded = null
  } = options

  return rateLimit({
    windowMs,
    keyGenerator: (req) => generateKey(req, prefix),
    max: (req) => {
      // Higher limits for authenticated users
      return req.user ? authenticated.max : anonymous.max
    },
    message: (req) => ({
      success: false,
      error: req.user ? authenticated.message : anonymous.message,
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        limit: req.user ? authenticated.max : anonymous.max,
        windowMs: windowMs / TIME_SECONDS.MINUTE, // minutes
        retryAfter: Math.ceil(windowMs / 1000) // seconds
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }),
    store,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    skip: (req) => {
      // Skip rate limiting for health checks and monitoring
      return req.path.startsWith('/health') || req.path.startsWith('/metrics')
    },
    onExceeded: (req, res, options) => {
      const userId = req.user?.id || 'anonymous'
      const ip = req.ip
      const limit = req.user ? authenticated.max : anonymous.max

      loggers.security.warn('Rate limit exceeded', {
        userId,
        ip,
        path: req.path,
        method: req.method,
        limit,
        windowMinutes: windowMs / TIME_SECONDS.MINUTE,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      })

      if (onExceeded) {
        onExceeded(req, res, options)
      }
    },
    handler: (req, res) => {
      const limit = req.user ? authenticated.max : anonymous.max
      const message = req.user ? authenticated.message : anonymous.message

      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          limit,
          windowMs: windowMs / TIME_SECONDS.MINUTE,
          retryAfter: Math.ceil(windowMs / 1000)
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    }
  })
}

// Specific rate limiters for different endpoint groups

// General API rate limiter
const apiLimiter = createRateLimiter({
  windowMs: RATE_LIMIT.WINDOW.FIFTEEN_MINUTES,
  authenticated: { max: RATE_LIMIT.LIMITS.API_AUTHENTICATED, message: 'API rate limit exceeded for authenticated user' },
  anonymous: { max: RATE_LIMIT.LIMITS.API_ANONYMOUS, message: 'API rate limit exceeded for this IP address' },
  prefix: 'api'
})

// Authentication endpoints (stricter limits)
const authLimiter = createRateLimiter({
  windowMs: RATE_LIMIT.WINDOW.FIFTEEN_MINUTES,
  authenticated: { max: RATE_LIMIT.LIMITS.AUTH_AUTHENTICATED, message: 'Authentication rate limit exceeded' },
  anonymous: { max: RATE_LIMIT.LIMITS.AUTH_ANONYMOUS, message: 'Too many authentication attempts from this IP' },
  prefix: 'auth',
  skipSuccessfulRequests: true // Only count failed attempts
})

// Request creation (moderate limits)
const requestCreationLimiter = createRateLimiter({
  windowMs: RATE_LIMIT.WINDOW.ONE_HOUR,
  authenticated: { max: RATE_LIMIT.LIMITS.REQUEST_CREATE_AUTHENTICATED, message: 'Request creation limit exceeded' },
  anonymous: { max: RATE_LIMIT.LIMITS.REQUEST_CREATE_ANONYMOUS, message: 'Request creation limit exceeded for anonymous users' },
  prefix: 'requests:create'
})

// Admin operations (higher limits for authenticated admin users)
const adminLimiter = createRateLimiter({
  windowMs: RATE_LIMIT.WINDOW.FIFTEEN_MINUTES,
  authenticated: { max: RATE_LIMIT.LIMITS.ADMIN_AUTHENTICATED, message: 'Admin operation rate limit exceeded' },
  anonymous: { max: RATE_LIMIT.LIMITS.ADMIN_ANONYMOUS, message: 'Admin operations require authentication' },
  prefix: 'admin'
})

// Progressive rate limiting based on user behavior
const progressiveLimiter = (req, res, next) => {
  // Skip for health checks
  if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
    return next()
  }

  // Apply different limits based on endpoint patterns
  if (req.path.includes('/auth/')) {
    return authLimiter(req, res, next)
  }

  if (req.path.includes('/admin/') || (req.user?.role === 'admin' && req.method !== 'GET')) {
    return adminLimiter(req, res, next)
  }

  if (req.method === 'POST' && req.path.includes('/requests')) {
    return requestCreationLimiter(req, res, next)
  }

  // Default API limiter
  return apiLimiter(req, res, next)
}

// Rate limit info middleware (adds headers with limit information)
const rateLimitInfo = (req, res, next) => {
  const userId = req.user?.id
  const isAuthenticated = !!userId

  // Add custom headers with rate limit information
  res.set({
    'X-RateLimit-Authenticated': isAuthenticated ? 'true' : 'false',
    'X-RateLimit-User-ID': userId || 'anonymous',
    'X-RateLimit-IP': req.ip
  })

  next()
}

// Burst protection for suspicious activity
const burstProtection = createRateLimiter({
  windowMs: RATE_LIMIT.WINDOW.ONE_MINUTE,
  authenticated: { max: RATE_LIMIT.LIMITS.BURST_AUTHENTICATED, message: 'Burst limit exceeded - too many requests in a short time' },
  anonymous: { max: RATE_LIMIT.LIMITS.BURST_ANONYMOUS, message: 'Burst limit exceeded for this IP address' },
  prefix: 'burst'
})

// Export rate limiting utilities
module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  requestCreationLimiter,
  adminLimiter,
  progressiveLimiter,
  rateLimitInfo,
  burstProtection,
  generateKey
}
