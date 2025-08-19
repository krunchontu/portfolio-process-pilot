const Joi = require('joi')

// Generic validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true // Remove unknown fields
    })

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }))

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      })
    }

    // Replace req.body with validated/sanitized data
    req.body = value
    next()
  }
}

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }))

      return res.status(400).json({
        error: 'Query validation failed',
        code: 'QUERY_VALIDATION_ERROR',
        details: validationErrors
      })
    }

    req.query = value
    next()
  }
}

// Validate URL parameters
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }))

      return res.status(400).json({
        error: 'Parameter validation failed',
        code: 'PARAMS_VALIDATION_ERROR',
        details: validationErrors
      })
    }

    req.params = value
    next()
  }
}

// Custom UUID validation
const uuid = () => {
  return Joi.string().uuid({ version: 'uuidv4' }).messages({
    'string.guid': 'Must be a valid UUID'
  })
}

// Custom email validation
const email = () => {
  return Joi.string().email().lowercase().messages({
    'string.email': 'Must be a valid email address'
  })
}

// Custom password validation
const password = () => {
  return Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  })
}

// Common validation schemas
const commonSchemas = {
  uuid: uuid(),
  email: email(),
  password: password(),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Date range
  dateRange: Joi.object({
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso().min(Joi.ref('date_from'))
  })
}

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  commonSchemas,
  uuid,
  email,
  password
}
