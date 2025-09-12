const Joi = require('joi')

// Workflow validation schemas (camelCase)

const workflowStepSchema = Joi.object({
  stepId: Joi.number().integer().min(1).required(),
  role: Joi.string().valid('employee', 'manager', 'admin').required(),
  slaHours: Joi.number().integer().min(1).max(720).default(24),
  actions: Joi.array().items(Joi.string().valid('approve', 'reject', 'escalate')).min(1).default(['approve', 'reject']),
  required: Joi.boolean().default(true),
  escalationHours: Joi.number().integer().min(1).optional(),
  escalationRole: Joi.string().valid('manager', 'admin').optional(),
  sameDepartment: Joi.boolean().optional()
})

// Create
const create = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  flowId: Joi.string().valid('leave', 'expense', 'equipment', 'general').required(),
  isActive: Joi.boolean().default(true).optional(),
  steps: Joi.array().items(workflowStepSchema).min(1).required()
})

// Update
const update = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
  steps: Joi.array().items(workflowStepSchema).min(1).optional()
}).min(1)

// List query (used by routes) – camelCase
const listQuery = Joi.object({
  active: Joi.boolean().optional(),
  search: Joi.string().max(200).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50).optional(),
  offset: Joi.number().integer().min(0).default(0).optional()
})

// Params
const idParams = Joi.object({
  id: Joi.number().integer().positive().required()
})

const flowIdParams = Joi.object({
  flowId: Joi.string().min(2).required()
})

module.exports = {
  create,
  update,
  listQuery,
  idParams,
  flowIdParams
}
