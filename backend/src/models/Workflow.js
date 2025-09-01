const { db } = require('../database/connection')

class Workflow {
  static get tableName() {
    return 'workflows'
  }

  // Convert database record to API response format (snake_case → camelCase)
  static mapToApiResponse(workflow) {
    if (!workflow) return null

    return {
      id: workflow.id,
      name: workflow.name,
      flowId: workflow.flow_id,
      description: workflow.description,
      steps: workflow.steps,
      notifications: workflow.notifications,
      isActive: workflow.is_active,
      createdBy: workflow.created_by,
      updatedBy: workflow.updated_by,
      createdAt: workflow.created_at,
      updatedAt: workflow.updated_at,
      // Include joined fields if present
      creatorFirstName: workflow.creator_first_name,
      creatorLastName: workflow.creator_last_name,
      creatorEmail: workflow.creator_email
    }
  }

  // Convert multiple database records to API response format
  static mapArrayToApiResponse(workflows) {
    return workflows.map(workflow => this.mapToApiResponse(workflow))
  }

  // Create new workflow
  static async create(workflowData) {
    const [workflow] = await db(this.tableName)
      .insert(workflowData)
      .returning('*')

    return this.mapToApiResponse(workflow)
  }

  // Find workflow by ID
  static async findById(id) {
    const workflow = await db(this.tableName)
      .leftJoin('users as creator', 'workflows.created_by', 'creator.id')
      .select(
        'workflows.*',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name',
        'creator.email as creator_email'
      )
      .where('workflows.id', id)
      .first()

    return this.mapToApiResponse(workflow)
  }

  // Find workflow by flow_id
  static async findByFlowId(flowId) {
    const workflow = await db(this.tableName)
      .where('flow_id', flowId)
      .where('is_active', true)
      .first()

    return this.mapToApiResponse(workflow)
  }

  // List all active workflows
  static async listActive() {
    const workflows = await db(this.tableName)
      .leftJoin('users as creator', 'workflows.created_by', 'creator.id')
      .select(
        'workflows.*',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name'
      )
      .where('workflows.is_active', true)
      .orderBy('workflows.name', 'asc')

    return this.mapArrayToApiResponse(workflows)
  }

  // List workflows with filtering and pagination
  static async list(options = {}) {
    const { active, search, limit = 50, offset = 0 } = options

    let query = db(this.tableName)
      .leftJoin('users as creator', 'workflows.created_by', 'creator.id')
      .select(
        'workflows.*',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name',
        'creator.email as creator_email'
      )

    // Apply filters
    if (active !== undefined) {
      query = query.where('workflows.is_active', active)
    }

    if (search) {
      query = query.where(function () {
        this.whereILike('workflows.name', `%${search}%`)
          .orWhereILike('workflows.description', `%${search}%`)
          .orWhereILike('workflows.flow_id', `%${search}%`)
      })
    }

    const workflows = await query
      .orderBy('workflows.created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return this.mapArrayToApiResponse(workflows)
  }

  // Count workflows with filtering
  static async count(options = {}) {
    const { active, search } = options

    let query = db(this.tableName)

    // Apply filters
    if (active !== undefined) {
      query = query.where('is_active', active)
    }

    if (search) {
      query = query.where(function () {
        this.whereILike('name', `%${search}%`)
          .orWhereILike('description', `%${search}%`)
          .orWhereILike('flow_id', `%${search}%`)
      })
    }

    const result = await query.count('* as count').first()
    return parseInt(result.count)
  }

  // Update workflow
  static async update(id, updates) {
    const [workflow] = await db(this.tableName)
      .where('id', id)
      .update({ ...updates, updated_at: new Date() })
      .returning('*')

    return this.mapToApiResponse(workflow)
  }

  // Deactivate workflow
  static async deactivate(id, updatedBy = null) {
    const updateData = {
      is_active: false,
      updated_at: new Date()
    }

    if (updatedBy) {
      updateData.updated_by = updatedBy
    }

    const [workflow] = await db(this.tableName)
      .where('id', id)
      .update(updateData)
      .returning('*')

    return this.mapToApiResponse(workflow)
  }

  // Get workflow usage statistics
  static async getUsageStats(workflowId) {
    const stats = await db('requests')
      .select(
        db.raw('COUNT(*) as total_requests'),
        db.raw('COUNT(CASE WHEN status = \'approved\' THEN 1 END) as approved_count'),
        db.raw('COUNT(CASE WHEN status = \'rejected\' THEN 1 END) as rejected_count'),
        db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_count'),
        db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/3600) as avg_completion_hours')
      )
      .where('workflow_id', workflowId)
      .first()

    return {
      ...stats,
      avg_completion_hours: stats.avg_completion_hours ? parseFloat(stats.avg_completion_hours).toFixed(2) : null
    }
  }

  // Validate workflow configuration
  static validateWorkflow(workflowData) {
    const errors = []

    if (!workflowData.name || workflowData.name.trim().length === 0) {
      errors.push('Workflow name is required')
    }

    if (!workflowData.flow_id || workflowData.flow_id.trim().length === 0) {
      errors.push('Flow ID is required')
    }

    if (!workflowData.steps || !Array.isArray(workflowData.steps) || workflowData.steps.length === 0) {
      errors.push('At least one workflow step is required')
    } else {
      workflowData.steps.forEach((step, index) => {
        if (!step.stepId) {
          errors.push(`Step ${index + 1}: Step ID is required`)
        }

        if (!step.role) {
          errors.push(`Step ${index + 1}: Role is required`)
        }

        if (!step.actions || !Array.isArray(step.actions) || step.actions.length === 0) {
          errors.push(`Step ${index + 1}: At least one action is required`)
        }

        if (step.order !== undefined && (typeof step.order !== 'number' || step.order < 1)) {
          errors.push(`Step ${index + 1}: Order must be a positive number`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Clone workflow
  static async clone(id, newFlowId, newName) {
    const originalWorkflow = await this.findById(id)
    if (!originalWorkflow) {
      throw new Error('Workflow not found')
    }

    const clonedWorkflow = {
      name: newName,
      flow_id: newFlowId,
      description: originalWorkflow.description,
      steps: originalWorkflow.steps,
      notifications: originalWorkflow.notifications,
      created_by: originalWorkflow.created_by
    }

    return await this.create(clonedWorkflow)
  }
}

module.exports = Workflow
