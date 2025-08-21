const Joi = require('joi')
const { uuid } = require('../middleware/validation')

// Request creation schema
const createRequestSchema = Joi.object({
  type: Joi.string()
    .valid('leave-request', 'expense-approval', 'equipment-request')
    .required()
    .messages({
      'any.required': 'Request type is required',
      'any.only': 'Request type must be one of: leave-request, expense-approval, equipment-request'
    }),

  workflow_id: uuid().optional().messages({
    'string.guid': 'Workflow ID must be a valid UUID'
  }),

  payload: Joi.object().required().messages({
    'any.required': 'Request payload is required',
    'object.base': 'Request payload must be an object'
  }).when('type', {
    switch: [
      {
        is: 'leave-request',
        then: Joi.object({
          startDate: Joi.date().iso().required().messages({
            'any.required': 'Start date is required',
            'date.format': 'Start date must be in ISO format'
          }),
          endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
            'any.required': 'End date is required',
            'date.greater': 'End date must be after start date'
          }),
          leaveType: Joi.string()
            .valid('vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement')
            .required()
            .messages({
              'any.required': 'Leave type is required',
              'any.only': 'Leave type must be one of: vacation, sick, personal, maternity, paternity, bereavement'
            }),
          reason: Joi.string().trim().min(10).max(500).required().messages({
            'any.required': 'Reason is required',
            'string.min': 'Reason must be at least 10 characters',
            'string.max': 'Reason must not exceed 500 characters'
          }),
          twoStep: Joi.boolean().default(false)
        })
      },
      {
        is: 'expense-approval',
        then: Joi.object({
          amount: Joi.number().positive().precision(2).max(50000).required().messages({
            'any.required': 'Amount is required',
            'number.positive': 'Amount must be positive',
            'number.max': 'Amount must not exceed 50000'
          }),
          currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD').default('USD').messages({
            'any.only': 'Currency must be one of: USD, EUR, GBP, CAD'
          }),
          expenseDate: Joi.date().iso().max('now').required().messages({
            'any.required': 'Expense date is required',
            'date.max': 'Expense date cannot be in the future'
          }),
          category: Joi.string()
            .valid('travel', 'meals', 'accommodation', 'office-supplies', 'software', 'training', 'other')
            .required()
            .messages({
              'any.required': 'Category is required',
              'any.only': 'Category must be one of: travel, meals, accommodation, office-supplies, software, training, other'
            }),
          description: Joi.string().trim().min(10).max(500).required().messages({
            'any.required': 'Description is required',
            'string.min': 'Description must be at least 10 characters',
            'string.max': 'Description must not exceed 500 characters'
          }),
          receipts: Joi.array().items(Joi.string().uri()).max(5).default([]).messages({
            'array.max': 'Maximum 5 receipts allowed',
            'string.uri': 'Receipt URLs must be valid URIs'
          })
        })
      },
      {
        is: 'equipment-request',
        then: Joi.object({
          equipmentType: Joi.string()
            .valid('laptop', 'desktop', 'monitor', 'phone', 'tablet', 'printer', 'software', 'other')
            .required()
            .messages({
              'any.required': 'Equipment type is required',
              'any.only': 'Equipment type must be one of: laptop, desktop, monitor, phone, tablet, printer, software, other'
            }),
          urgency: Joi.string()
            .valid('low', 'medium', 'high', 'critical')
            .default('medium')
            .messages({
              'any.only': 'Urgency must be one of: low, medium, high, critical'
            }),
          specifications: Joi.string().trim().max(1000).optional().messages({
            'string.max': 'Specifications must not exceed 1000 characters'
          }),
          justification: Joi.string().trim().min(20).max(500).required().messages({
            'any.required': 'Business justification is required',
            'string.min': 'Justification must be at least 20 characters',
            'string.max': 'Justification must not exceed 500 characters'
          }),
          estimatedCost: Joi.number().positive().max(10000).optional().messages({
            'number.positive': 'Estimated cost must be positive',
            'number.max': 'Estimated cost must not exceed 10000'
          })
        })
      }
    ]
  })
})

// Request action schema
const requestActionSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'reject', 'escalate', 'delegate')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be one of: approve, reject, escalate, delegate'
    }),

  comment: Joi.string().trim().max(1000).allow('').optional().messages({
    'string.max': 'Comment must not exceed 1000 characters'
  }).when('action', {
    is: 'reject',
    then: Joi.string().trim().min(10).required().messages({
      'any.required': 'Comment is required when rejecting',
      'string.min': 'Rejection comment must be at least 10 characters'
    })
  }),

  delegate_to: uuid().optional().when('action', {
    is: 'delegate',
    then: Joi.required().messages({
      'any.required': 'delegate_to is required when delegating'
    })
  }),

  escalate_to: uuid().optional().when('action', {
    is: 'escalate',
    then: Joi.required().messages({
      'any.required': 'escalate_to is required when escalating'
    })
  })
})

// Request cancellation schema
const cancelRequestSchema = Joi.object({
  comment: Joi.string().trim().min(5).max(500).optional().messages({
    'string.min': 'Cancellation comment must be at least 5 characters',
    'string.max': 'Cancellation comment must not exceed 500 characters'
  })
})

// Request list query schema
const listRequestsSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'cancelled')
    .optional(),

  type: Joi.string()
    .valid('leave-request', 'expense-approval', 'equipment-request')
    .optional(),

  created_by: uuid().optional(),

  pending_for_role: Joi.string()
    .valid('employee', 'manager', 'admin')
    .optional(),

  from_date: Joi.date().iso().optional(),

  to_date: Joi.date().iso().min(Joi.ref('from_date')).optional().messages({
    'date.min': 'To date must be after from date'
  }),

  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100'
  }),

  offset: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Offset must not be negative'
  }),

  sort_by: Joi.string()
    .valid('created_at', 'updated_at', 'status', 'type')
    .default('created_at'),

  sort_order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
})

module.exports = {
  createRequestSchema,
  requestActionSchema,
  cancelRequestSchema,
  listRequestsSchema
}
