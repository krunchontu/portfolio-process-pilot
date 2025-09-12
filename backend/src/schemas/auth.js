const Joi = require('joi')
const { email, password } = require('../middleware/validation')

// Login schema
const loginSchema = Joi.object({
  email: email().required(),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
    'string.empty': 'Password cannot be empty'
  })
})

// Registration schema
const registerSchema = Joi.object({
  email: email().required(),
  password: password().required(),
  first_name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required'
  }),
  last_name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  role: Joi.string().valid('employee', 'manager', 'admin').default('employee'),
  department: Joi.string().trim().max(100).messages({
    'string.max': 'Department must not exceed 100 characters'
  })
})

// Refresh token schema
const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
    'string.empty': 'Refresh token cannot be empty'
  })
})

// Change password schema
const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  new_password: password().required().messages({
    'any.required': 'New password is required'
  })
})

module.exports = {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema
}
