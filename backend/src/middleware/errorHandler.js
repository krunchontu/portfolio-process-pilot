const config = require('../config')
const { error: sendErrorResponse } = require('../utils/apiResponse')
const { logger } = require('../utils/logger')

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// Handle different types of errors
const handleDatabaseError = (err) => {
  logger.error('Database Error:', {
    code: err.code,
    message: err.message,
    constraint: err.constraint,
    detail: err.detail
  })

  if (err.code === '23505') { // Unique violation
    return new AppError('Resource already exists', 409, 'DUPLICATE_RESOURCE')
  }

  if (err.code === '23503') { // Foreign key violation
    return new AppError('Referenced resource not found', 400, 'FOREIGN_KEY_VIOLATION')
  }

  if (err.code === '23502') { // Not null violation
    return new AppError('Required field is missing', 400, 'MISSING_REQUIRED_FIELD')
  }

  return new AppError('Database operation failed', 500, 'DATABASE_ERROR')
}

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(error => error.message)
  const message = `Invalid input data. ${errors.join('. ')}`
  return new AppError(message, 400, 'VALIDATION_ERROR')
}

const handleJWTError = () => {
  return new AppError('Invalid token', 401, 'INVALID_TOKEN')
}

const handleJWTExpiredError = () => {
  return new AppError('Token expired', 401, 'TOKEN_EXPIRED')
}

// Send error response using standardized format
const sendErrorDev = (err, res) => {
  const details = {
    stack: err.stack,
    errorDetails: err
  }
  return sendErrorResponse(res, err.statusCode, err.message, err.code, details)
}

const sendErrorProd = (err, res) => {
  // Only send operational errors to client in production
  if (err.isOperational) {
    return sendErrorResponse(res, err.statusCode, err.message, err.code)
  } else {
    // Log error and send generic message
    logger.error('Unhandled application error:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    })
    return sendErrorResponse(res, 500, 'Something went wrong!', 'INTERNAL_ERROR')
  }
}

// Global error handling middleware
const globalErrorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500

  if (config.nodeEnv === 'development') {
    sendErrorDev(err, res)
  } else {
    let error = { ...err }
    error.message = err.message

    // Handle specific error types
    if (err.code && err.code.startsWith('23')) {
      error = handleDatabaseError(error)
    }

    if (err.name === 'ValidationError') {
      error = handleValidationError(error)
    }

    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError()
    }

    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError()
    }

    sendErrorProd(error, res)
  }
}

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

// Handle unhandled routes
const notFound = (req, res, next) => {
  // For API routes, send standardized error response directly
  if (req.path.startsWith('/api/')) {
    return sendErrorResponse(res, 404, `Route ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND', {
      method: req.method,
      path: req.path,
      availableEndpoints: ['/api/auth', '/api/requests', '/api/workflows', '/api/users', '/api/analytics']
    })
  }

  // For non-API routes, create error and pass to global handler
  const err = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND')
  next(err)
}

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound
}
