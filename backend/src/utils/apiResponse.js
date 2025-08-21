/**
 * Standardized API Response Utilities
 *
 * This module provides consistent response formatting across all API endpoints.
 * All API responses follow a standard structure for better client integration.
 */

const { logger } = require('./logger')

/**
 * Standard API Response Structure:
 * {
 *   success: boolean,
 *   message?: string,
 *   data?: any,
 *   error?: string,
 *   code?: string,
 *   details?: any,
 *   meta?: {
 *     timestamp: string,
 *     request_id?: string,
 *     pagination?: object,
 *     filters?: object
 *   }
 * }
 */

/**
 * Send successful API response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {object} meta - Additional metadata
 */
const success = (res, statusCode = 200, message = 'Operation successful', data = null, meta = {}) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }

  // Log successful responses for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`API Success [${statusCode}]: ${message}`, { data, meta })
  }

  return res.status(statusCode).json(response)
}

/**
 * Send error API response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code for client handling
 * @param {any} details - Additional error details
 */
const error = (res, statusCode = 500, message = 'An error occurred', code = 'INTERNAL_ERROR', details = null) => {
  const response = {
    success: false,
    error: message,
    code,
    ...(details && { details }),
    meta: {
      timestamp: new Date().toISOString()
    }
  }

  // Log errors for monitoring
  logger.error(`API Error [${statusCode}]: ${message}`, {
    code,
    details,
    stack: details instanceof Error ? details.stack : undefined
  })

  return res.status(statusCode).json(response)
}

/**
 * Send validation error response
 * @param {object} res - Express response object
 * @param {array|object} errors - Validation errors
 * @param {string} message - Custom message
 */
const validationError = (res, errors, message = 'Validation failed') => {
  return error(res, 400, message, 'VALIDATION_ERROR', {
    validation_errors: Array.isArray(errors) ? errors : [errors]
  })
}

/**
 * Send not found error response
 * @param {object} res - Express response object
 * @param {string} resource - Resource type (e.g., 'User', 'Request')
 * @param {string} identifier - Resource identifier
 */
const notFound = (res, resource = 'Resource', identifier = null) => {
  const message = identifier
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`

  return error(res, 404, message, 'RESOURCE_NOT_FOUND', {
    resource,
    identifier
  })
}

/**
 * Send unauthorized error response
 * @param {object} res - Express response object
 * @param {string} message - Custom message
 */
const unauthorized = (res, message = 'Authentication required') => {
  return error(res, 401, message, 'UNAUTHORIZED')
}

/**
 * Send forbidden error response
 * @param {object} res - Express response object
 * @param {string} message - Custom message
 */
const forbidden = (res, message = 'Access denied') => {
  return error(res, 403, message, 'FORBIDDEN')
}

/**
 * Send conflict error response
 * @param {object} res - Express response object
 * @param {string} message - Custom message
 * @param {any} details - Conflict details
 */
const conflict = (res, message = 'Resource conflict', details = null) => {
  return error(res, 409, message, 'CONFLICT', details)
}

/**
 * Send too many requests error response
 * @param {object} res - Express response object
 * @param {string} message - Custom message
 */
const tooManyRequests = (res, message = 'Rate limit exceeded') => {
  return error(res, 429, message, 'RATE_LIMIT_EXCEEDED')
}

/**
 * Send internal server error response
 * @param {object} res - Express response object
 * @param {string} message - Custom message
 * @param {Error} err - Original error object
 */
const internalError = (res, message = 'Internal server error', err = null) => {
  const details = process.env.NODE_ENV === 'development' && err
    ? {
      error_message: err.message,
      stack: err.stack
    }
    : null

  return error(res, 500, message, 'INTERNAL_ERROR', details)
}

/**
 * Send created response (201)
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Created resource data
 * @param {object} meta - Additional metadata
 */
const created = (res, message = 'Resource created successfully', data = null, meta = {}) => {
  return success(res, 201, message, data, meta)
}

/**
 * Send no content response (204)
 * @param {object} res - Express response object
 */
const noContent = (res) => {
  return res.status(204).send()
}

/**
 * Send paginated response
 * @param {object} res - Express response object
 * @param {array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const paginated = (res, data, page, limit, total, message = 'Data retrieved successfully') => {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return success(res, 200, message, data, {
    pagination: {
      current_page: page,
      per_page: limit,
      total_items: total,
      total_pages: totalPages,
      has_next: hasNext,
      has_previous: hasPrev,
      next_page: hasNext ? page + 1 : null,
      previous_page: hasPrev ? page - 1 : null
    }
  })
}

/**
 * Create standardized API response middleware
 * This adds helper methods to the response object
 */
const apiResponseMiddleware = (req, res, next) => {
  // Add helper methods to response object
  res.success = (statusCode, message, data, meta) =>
    success(res, statusCode, message, data, meta)

  res.error = (statusCode, message, code, details) =>
    error(res, statusCode, message, code, details)

  res.validationError = (errors, message) =>
    validationError(res, errors, message)

  res.notFound = (resource, identifier) =>
    notFound(res, resource, identifier)

  res.unauthorized = (message) =>
    unauthorized(res, message)

  res.forbidden = (message) =>
    forbidden(res, message)

  res.conflict = (message, details) =>
    conflict(res, message, details)

  res.tooManyRequests = (message) =>
    tooManyRequests(res, message)

  res.internalError = (message, err) =>
    internalError(res, message, err)

  res.created = (message, data, meta) =>
    created(res, message, data, meta)

  res.noContent = () =>
    noContent(res)

  res.paginated = (data, page, limit, total, message) =>
    paginated(res, data, page, limit, total, message)

  next()
}

module.exports = {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  tooManyRequests,
  internalError,
  created,
  noContent,
  paginated,
  apiResponseMiddleware
}
