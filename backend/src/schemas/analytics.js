const Joi = require('joi')

// CamelCase analytics validation schemas aligned with routes

const timeframe = Joi.string().valid('7d', '30d', '90d')

const dashboardQuery = Joi.object({
  timeframe: timeframe.optional(),
  department: Joi.string().min(2).max(100).optional()
})

const requestsQuery = Joi.object({
  timeframe: timeframe.optional(),
  type: Joi.string().valid('leave', 'expense', 'equipment', 'general').optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
  department: Joi.string().min(2).max(100).optional()
})

const workflowsQuery = Joi.object({
  timeframe: timeframe.optional()
})

const usersQuery = Joi.object({
  timeframe: timeframe.optional(),
  department: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid('employee', 'manager', 'admin').optional()
})

const departmentsQuery = Joi.object({
  timeframe: timeframe.optional()
})

module.exports = {
  dashboardQuery,
  requestsQuery,
  workflowsQuery,
  usersQuery,
  departmentsQuery
}

module.exports.analyticsSchema = {
  dashboardQuery,
  requestsQuery,
  workflowsQuery,
  usersQuery,
  departmentsQuery
}
