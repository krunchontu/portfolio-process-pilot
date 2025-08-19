const jwt = require('jsonwebtoken')
const config = require('../config')
const User = require('../models/User')

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })
}

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  })
}

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      })
    }

    const decoded = jwt.verify(token, config.jwt.secret)

    // Get fresh user data
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      })
    }

    // Attach user to request
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      })
    }

    console.error('Authentication error:', error)
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    })
  }
}

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      })
    }

    next()
  }
}

// Check if user can act on specific request
const canActOnRequest = async (req, res, next) => {
  try {
    const { id: requestId } = req.params
    const user = req.user

    // Get request details (this would need to be implemented in Request model)
    const Request = require('../models/Request')
    const request = await Request.findById(requestId)

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        code: 'REQUEST_NOT_FOUND'
      })
    }

    // Admin can act on any request
    if (user.role === 'admin') {
      req.targetRequest = request
      return next()
    }

    // Users can only act on their own requests (for viewing)
    if (request.created_by === user.id) {
      req.targetRequest = request
      return next()
    }

    // Managers can act on requests in their current step
    if (user.role === 'manager') {
      const currentStep = Request.getCurrentStep(request)
      if (currentStep && (currentStep.role === 'manager' || currentStep.escalatedTo === 'admin')) {
        req.targetRequest = request
        return next()
      }
    }

    return res.status(403).json({
      error: 'You do not have permission to access this request',
      code: 'REQUEST_ACCESS_DENIED'
    })
  } catch (error) {
    console.error('Authorization error:', error)
    return res.status(500).json({
      error: 'Authorization check failed',
      code: 'AUTH_CHECK_ERROR'
    })
  }
}

// Optional authentication (for public endpoints that benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return next() // Continue without user context
    }

    const decoded = jwt.verify(token, config.jwt.secret)
    const user = await User.findById(decoded.userId)

    if (user && user.is_active) {
      req.user = user
    }

    next()
  } catch (error) {
    // Ignore auth errors for optional auth
    next()
  }
}

module.exports = {
  generateToken,
  generateRefreshToken,
  authenticateToken,
  requireRole,
  canActOnRequest,
  optionalAuth
}
