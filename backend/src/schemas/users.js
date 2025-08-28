const Joi = require('joi')

/**
 * User management validation schemas
 */

// Schema for updating user information (admin only)
const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 255 characters'
    }),

  first_name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s-']+$/)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),

  last_name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s-']+$/)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),

  role: Joi.string()
    .valid('employee', 'manager', 'admin')
    .optional()
    .messages({
      'any.only': 'Role must be one of: employee, manager, admin'
    }),

  department: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Department must be at least 2 characters long',
      'string.max': 'Department cannot exceed 100 characters'
    }),

  manager_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .allow(null)
    .optional()
    .messages({
      'string.guid': 'Invalid manager ID format'
    }),

  is_active: Joi.boolean()
    .optional()
}).min(1) // At least one field must be provided for update

// Schema for user query parameters
const listUsersSchema = Joi.object({
  role: Joi.string()
    .valid('employee', 'manager', 'admin')
    .optional(),

  department: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  is_active: Joi.boolean()
    .optional(),

  search: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search term must be at least 2 characters long',
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  manager_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .optional()
    .messages({
      'string.guid': 'Invalid manager ID format'
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),

  sort: Joi.string()
    .valid('first_name', 'last_name', 'email', 'role', 'department', 'created_at', 'last_login')
    .default('last_name')
    .optional(),

  order: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .optional()
})

// Schema for user ID parameter
const userIdSchema = Joi.object({
  id: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
})

// Schema for user activation/deactivation
const userActivationSchema = Joi.object({
  reason: Joi.string()
    .min(5)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Reason must be at least 5 characters long',
      'string.max': 'Reason cannot exceed 200 characters'
    })
})

// Schema for bulk user operations
const bulkUserOperationSchema = Joi.object({
  user_ids: Joi.array()
    .items(
      Joi.string().guid({ version: 'uuidv4' })
    )
    .min(1)
    .max(100)
    .unique()
    .required()
    .messages({
      'array.min': 'At least one user ID is required',
      'array.max': 'Cannot process more than 100 users at once',
      'array.unique': 'Duplicate user IDs are not allowed'
    }),

  operation: Joi.string()
    .valid('activate', 'deactivate', 'delete')
    .required()
    .messages({
      'any.only': 'Operation must be one of: activate, deactivate, delete'
    }),

  reason: Joi.string()
    .min(5)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Reason must be at least 5 characters long',
      'string.max': 'Reason cannot exceed 200 characters'
    })
})

// Schema for changing user password (admin only)
const adminPasswordChangeSchema = Joi.object({
  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),

  force_change_on_login: Joi.boolean()
    .default(true)
    .optional()
})

// Export individual schemas
module.exports = {
  updateUserSchema,
  listUsersSchema,
  userIdSchema,
  userActivationSchema,
  bulkUserOperationSchema,
  adminPasswordChangeSchema
}

// Export as usersSchema object for backward compatibility
module.exports.usersSchema = {
  update: updateUserSchema,
  listQuery: listUsersSchema,
  params: userIdSchema,
  activation: userActivationSchema,
  bulkOperation: bulkUserOperationSchema,
  adminPasswordChange: adminPasswordChangeSchema
}
