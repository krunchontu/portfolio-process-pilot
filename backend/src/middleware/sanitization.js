const sanitizeHtml = require('sanitize-html')
const { body, query, param, validationResult } = require('express-validator')

/**
 * Input Sanitization Middleware
 * Sanitizes user input to prevent XSS and injection attacks
 */

// HTML sanitization options - very restrictive for security
const htmlSanitizeOptions = {
  allowedTags: [], // No HTML tags allowed
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
}

// More permissive options for rich text content (if needed)
const richTextSanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {
    a: ['href']
  },
  allowedSchemes: ['http', 'https', 'mailto']
}

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj, options = htmlSanitizeOptions) => {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    // Trim whitespace and sanitize HTML
    return sanitizeHtml(obj.trim(), options)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options))
  }

  if (typeof obj === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields that shouldn't be sanitized
      if (key === 'password' || key === 'password_hash' || key.includes('token')) {
        sanitized[key] = value
      } else {
        sanitized[key] = sanitizeObject(value, options)
      }
    }
    return sanitized
  }

  return obj
}

/**
 * General input sanitization middleware
 */
const sanitizeInput = (options = {}) => {
  return (req, res, next) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, options.htmlOptions || htmlSanitizeOptions)
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, htmlSanitizeOptions)
      }

      next()
    } catch (error) {
      console.error('Sanitization error:', error)
      res.status(400).json({
        error: 'Invalid input data',
        code: 'SANITIZATION_ERROR'
      })
    }
  }
}

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    })
  }
  next()
}

/**
 * Common validation chains
 */
const commonValidations = {
  // Email validation and sanitization
  email: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required')
  ],

  // Password validation (no sanitization for security)
  password: [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],

  // Name validation and sanitization
  name: [
    body(['first_name', 'last_name'])
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Name can only contain letters, spaces, apostrophes, and hyphens')
  ],

  // ID validation
  id: [
    param('id')
      .isInt({ gt: 0 })
      .withMessage('Valid ID is required')
  ],

  // Request type validation
  requestType: [
    body('type')
      .isIn(['leave', 'expense', 'equipment'])
      .withMessage('Request type must be leave, expense, or equipment')
  ],

  // Role validation
  role: [
    body('role')
      .optional()
      .isIn(['employee', 'manager', 'admin'])
      .withMessage('Role must be employee, manager, or admin')
  ],

  // Department validation
  department: [
    body('department')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Department must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s&-]+$/)
      .withMessage('Department can only contain letters, numbers, spaces, ampersands, and hyphens')
  ],

  // Text content validation (for comments, descriptions, etc.)
  textContent: [
    body(['comment', 'description', 'reason', 'notes'])
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Text content must not exceed 1000 characters')
  ],

  // Amount validation (for expenses)
  amount: [
    body('amount')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a positive number')
  ]
}

/**
 * SQL injection prevention patterns
 */
const preventSqlInjection = (req, res, next) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /([\'\";])/,
    /(\-\-)/,
    /\/\*/,
    /\*\//
  ]

  const checkForSqlInjection = (value) => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value))
    }
    return false
  }

  const hasSqlInjection = (obj) => {
    if (typeof obj === 'string') {
      return checkForSqlInjection(obj)
    }
    if (Array.isArray(obj)) {
      return obj.some(hasSqlInjection)
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(hasSqlInjection)
    }
    return false
  }

  // Check request body, query, and params
  if (hasSqlInjection(req.body) || hasSqlInjection(req.query) || hasSqlInjection(req.params)) {
    return res.status(400).json({
      error: 'Invalid input detected',
      code: 'INVALID_INPUT'
    })
  }

  next()
}

module.exports = {
  sanitizeInput,
  sanitizeObject,
  handleValidationErrors,
  commonValidations,
  preventSqlInjection,
  richTextSanitizeOptions,
  htmlSanitizeOptions
}
