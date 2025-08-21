const Joi = require('joi')

/**
 * Workflow validation schemas
 */

// Schema for creating a new workflow
const createWorkflowSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Workflow name must be at least 3 characters long',
      'string.max': 'Workflow name cannot exceed 100 characters',
      'any.required': 'Workflow name is required'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  flow_id: Joi.string()
    .valid('leave', 'expense', 'equipment', 'general')
    .required()
    .messages({
      'any.only': 'Flow ID must be one of: leave, expense, equipment, general',
      'any.required': 'Flow ID is required'
    }),

  is_active: Joi.boolean()
    .default(true)
    .optional(),

  steps: Joi.array()
    .items(
      Joi.object({
        stepId: Joi.number()
          .integer()
          .min(1)
          .required(),

        role: Joi.string()
          .valid('employee', 'manager', 'admin')
          .required(),

        sla_hours: Joi.number()
          .integer()
          .min(1)
          .max(720) // 30 days max
          .default(24),

        actions: Joi.array()
          .items(Joi.string().valid('approve', 'reject', 'escalate'))
          .min(1)
          .default(['approve', 'reject']),

        required: Joi.boolean()
          .default(true),

        escalation_hours: Joi.number()
          .integer()
          .min(1)
          .optional(),

        escalation_role: Joi.string()
          .valid('manager', 'admin')
          .optional()
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one workflow step is required'
    })
})

// Schema for updating a workflow
const updateWorkflowSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .optional(),

  description: Joi.string()
    .max(500)
    .optional(),

  is_active: Joi.boolean()
    .optional(),

  steps: Joi.array()
    .items(
      Joi.object({
        stepId: Joi.number()
          .integer()
          .min(1)
          .required(),

        role: Joi.string()
          .valid('employee', 'manager', 'admin')
          .required(),

        sla_hours: Joi.number()
          .integer()
          .min(1)
          .max(720)
          .default(24),

        actions: Joi.array()
          .items(Joi.string().valid('approve', 'reject', 'escalate'))
          .min(1)
          .default(['approve', 'reject']),

        required: Joi.boolean()
          .default(true),

        escalation_hours: Joi.number()
          .integer()
          .min(1)
          .optional(),

        escalation_role: Joi.string()
          .valid('manager', 'admin')
          .optional()
      })
    )
    .min(1)
    .optional()
}).min(1) // At least one field must be provided for update

// Schema for workflow query parameters
const listWorkflowsSchema = Joi.object({
  flow_id: Joi.string()
    .valid('leave', 'expense', 'equipment', 'general')
    .optional(),

  is_active: Joi.boolean()
    .optional(),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional(),

  sort: Joi.string()
    .valid('name', 'flow_id', 'created_at', 'updated_at')
    .default('created_at')
    .optional(),

  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
})

// Schema for workflow ID parameter
const workflowIdSchema = Joi.object({
  id: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid workflow ID format',
      'any.required': 'Workflow ID is required'
    })
})

module.exports = {
  createWorkflowSchema,
  updateWorkflowSchema,
  listWorkflowsSchema,
  workflowIdSchema
}
