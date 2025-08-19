const { db } = require('../database/connection')

class Workflow {
  static get tableName() {
    return 'workflows'
  }

  // Create new workflow
  static async create(workflowData) {
    const [workflow] = await db(this.tableName)
      .insert(workflowData)
      .returning('*')

    return workflow
  }

  // Find workflow by ID
  static async findById(id) {
    return await db(this.tableName)
      .leftJoin('users as creator', 'workflows.created_by', 'creator.id')
      .select(
        'workflows.*',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name',
        'creator.email as creator_email'
      )
      .where('workflows.id', id)
      .first()
  }

  // Find workflow by flow_id
  static async findByFlowId(flowId) {
    return await db(this.tableName)
      .where('flow_id', flowId)
      .where('is_active', true)
      .first()
  }

  // List all active workflows
  static async listActive() {
    return await db(this.tableName)
      .leftJoin('users as creator', 'workflows.created_by', 'creator.id')
      .select(
        'workflows.*',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name'
      )
      .where('workflows.is_active', true)
      .orderBy('workflows.name', 'asc')
  }

  // Update workflow
  static async update(id, updates) {
    const [workflow] = await db(this.tableName)
      .where('id', id)
      .update({ ...updates, updated_at: new Date() })
      .returning('*')

    return workflow
  }

  // Deactivate workflow
  static async deactivate(id) {
    return await db(this.tableName)
      .where('id', id)
      .update({ is_active: false, updated_at: new Date() })
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
      isValid: errors.length === 0,
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
