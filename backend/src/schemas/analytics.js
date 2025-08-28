const Joi = require('joi')

/**
 * Analytics validation schemas
 */

// Schema for dashboard analytics query parameters
const dashboardAnalyticsSchema = Joi.object({
  date_from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
      'date.base': 'Invalid date format'
    }),

  date_to: Joi.date()
    .iso()
    .min(Joi.ref('date_from'))
    .optional()
    .messages({
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
      'date.min': 'End date must be after start date',
      'date.base': 'Invalid date format'
    }),

  department: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Department must be at least 2 characters long',
      'string.max': 'Department cannot exceed 100 characters'
    }),

  request_type: Joi.string()
    .valid('leave', 'expense', 'equipment', 'general')
    .optional()
    .messages({
      'any.only': 'Request type must be one of: leave, expense, equipment, general'
    })
})

// Schema for request metrics query parameters
const requestMetricsSchema = Joi.object({
  date_from: Joi.date()
    .iso()
    .optional(),

  date_to: Joi.date()
    .iso()
    .min(Joi.ref('date_from'))
    .optional(),

  department: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  request_type: Joi.string()
    .valid('leave', 'expense', 'equipment', 'general')
    .optional(),

  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'cancelled')
    .optional(),

  group_by: Joi.string()
    .valid('day', 'week', 'month', 'department', 'type', 'status')
    .default('day')
    .optional()
    .messages({
      'any.only': 'Group by must be one of: day, week, month, department, type, status'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100)
    .optional()
})

// Schema for workflow performance metrics
const workflowMetricsSchema = Joi.object({
  workflow_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .optional()
    .messages({
      'string.guid': 'Invalid workflow ID format'
    }),

  flow_id: Joi.string()
    .valid('leave', 'expense', 'equipment', 'general')
    .optional(),

  date_from: Joi.date()
    .iso()
    .optional(),

  date_to: Joi.date()
    .iso()
    .min(Joi.ref('date_from'))
    .optional(),

  include_sla_metrics: Joi.boolean()
    .default(true)
    .optional(),

  include_bottlenecks: Joi.boolean()
    .default(true)
    .optional()
})

// Schema for user activity analytics
const userActivitySchema = Joi.object({
  user_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .optional()
    .messages({
      'string.guid': 'Invalid user ID format'
    }),

  role: Joi.string()
    .valid('employee', 'manager', 'admin')
    .optional(),

  department: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  date_from: Joi.date()
    .iso()
    .optional(),

  date_to: Joi.date()
    .iso()
    .min(Joi.ref('date_from'))
    .optional(),

  activity_type: Joi.string()
    .valid('requests_created', 'requests_approved', 'requests_rejected', 'logins')
    .optional(),

  top_n: Joi.number()
    .integer()
    .min(5)
    .max(100)
    .default(20)
    .optional()
})

// Schema for department metrics
const departmentMetricsSchema = Joi.object({
  department: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  date_from: Joi.date()
    .iso()
    .optional(),

  date_to: Joi.date()
    .iso()
    .min(Joi.ref('date_from'))
    .optional(),

  metric_type: Joi.string()
    .valid('requests', 'processing_time', 'approval_rate', 'user_activity')
    .optional(),

  compare_with: Joi.string()
    .valid('previous_period', 'organization_average')
    .optional()
})

// Schema for custom analytics queries
const customAnalyticsSchema = Joi.object({
  metrics: Joi.array()
    .items(
      Joi.string().valid(
        'total_requests',
        'pending_requests',
        'approved_requests',
        'rejected_requests',
        'cancelled_requests',
        'avg_processing_time',
        'sla_breach_count',
        'approval_rate',
        'user_activity_count'
      )
    )
    .min(1)
    .max(10)
    .unique()
    .required()
    .messages({
      'array.min': 'At least one metric is required',
      'array.max': 'Cannot request more than 10 metrics at once',
      'array.unique': 'Duplicate metrics are not allowed'
    }),

  filters: Joi.object({
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
    department: Joi.string().min(2).max(100).optional(),
    request_type: Joi.string().valid('leave', 'expense', 'equipment', 'general').optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
    user_role: Joi.string().valid('employee', 'manager', 'admin').optional()
  }).optional(),

  group_by: Joi.array()
    .items(
      Joi.string().valid('department', 'request_type', 'status', 'user_role', 'day', 'week', 'month')
    )
    .max(3)
    .optional(),

  sort_by: Joi.string()
    .valid('date', 'department', 'count', 'avg_time')
    .default('date')
    .optional(),

  sort_order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
})

// Export individual schemas
module.exports = {
  dashboardAnalyticsSchema,
  requestMetricsSchema,
  workflowMetricsSchema,
  userActivitySchema,
  departmentMetricsSchema,
  customAnalyticsSchema
}

// Export as analyticsSchema object for backward compatibility
module.exports.analyticsSchema = {
  dashboardQuery: dashboardAnalyticsSchema,
  requestMetrics: requestMetricsSchema,
  workflowMetrics: workflowMetricsSchema,
  userActivity: userActivitySchema,
  departmentMetrics: departmentMetricsSchema,
  customAnalytics: customAnalyticsSchema
}
