const config = require('../config')

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
  console.error('Database Error:', err)

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

// Send error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: 'error',
    error: err.message,
    code: err.code,
    stack: err.stack,
    details: err
  })
}

const sendErrorProd = (err, res) => {
  // Only send operational errors to client in production
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      error: err.message,
      code: err.code
    })
  } else {
    // Log error and send generic message
    console.error('ERROR 💥', err)
    res.status(500).json({
      status: 'error',
      error: 'Something went wrong!',
      code: 'INTERNAL_ERROR'
    })
  }
}

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
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
  const err = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND')
  next(err)
}

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound
}
