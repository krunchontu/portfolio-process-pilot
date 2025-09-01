const { db } = require('../database/connection')
const RequestHistory = require('./RequestHistory')

class Request {
  static get tableName() {
    return 'requests'
  }

  // Convert database record to API response format (snake_case → camelCase)
  static mapToApiResponse(request) {
    if (!request) return null

    return {
      id: request.id,
      type: request.type,
      workflowId: request.workflow_id,
      createdBy: request.created_by,
      payload: request.payload,
      steps: request.steps,
      status: request.status,
      currentStepIndex: request.current_step_index,
      slaHours: request.sla_hours,
      slaDeadline: request.sla_deadline,
      submittedAt: request.submitted_at,
      completedAt: request.completed_at,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      // Include joined fields if present
      creatorFirstName: request.creator_first_name,
      creatorLastName: request.creator_last_name,
      creatorEmail: request.creator_email,
      workflowName: request.workflow_name,
      // Include history if present
      history: request.history
    }
  }

  // Convert multiple database records to API response format
  static mapArrayToApiResponse(requests) {
    return requests.map(request => this.mapToApiResponse(request))
  }

  // Create new request
  static async create(requestData) {
    const { createdBy, workflowId, type, payload, steps } = requestData

    // Calculate SLA deadline if steps have SLA hours
    let slaHours = null
    let slaDeadline = null

    if (steps && steps.length > 0 && steps[0].slaHours) {
      slaHours = steps[0].slaHours
      slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000)
    }

    const [request] = await db(this.tableName)
      .insert({
        type,
        workflow_id: workflowId,
        created_by: createdBy,
        payload,
        steps,
        sla_hours: slaHours,
        sla_deadline: slaDeadline
      })
      .returning('*')

    // Create initial history entry
    await RequestHistory.create({
      requestId: request.id,
      actorId: createdBy,
      action: 'submit',
      comment: 'Request submitted',
      metadata: { payload }
    })

    return this.mapToApiResponse(request)
  }

  // Find request by ID with full details
  static async findById(id) {
    const request = await db(this.tableName)
      .leftJoin('users as creator', 'requests.created_by', 'creator.id')
      .leftJoin('workflows', 'requests.workflow_id', 'workflows.id')
      .select(
        'requests.*',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name',
        'creator.email as creator_email',
        'workflows.name as workflow_name'
      )
      .where('requests.id', id)
      .first()

    if (request) {
      // Get request history
      request.history = await RequestHistory.findByRequestId(id)
      return this.mapToApiResponse(request)
    }

    return null
  }

  // List requests with filters
  static async list(filters = {}) {
    let query = db(this.tableName)
      .leftJoin('users as creator', 'requests.created_by', 'creator.id')
      .leftJoin('workflows', 'requests.workflow_id', 'workflows.id')
      .select(
        'requests.id',
        'requests.type',
        'requests.status',
        'requests.current_step_index',
        'requests.submitted_at',
        'requests.completed_at',
        'requests.sla_deadline',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name',
        'creator.email as creator_email',
        'workflows.name as workflow_name'
      )

    if (filters.status) {
      query = query.where('requests.status', filters.status)
    }

    if (filters.type) {
      query = query.where('requests.type', filters.type)
    }

    if (filters.created_by) {
      query = query.where('requests.created_by', filters.created_by)
    }

    if (filters.pending_for_role) {
      // Find requests pending for specific role
      query = query.whereRaw(`
        requests.status = 'pending' AND 
        requests.steps->requests.current_step_index->>'role' = ?
      `, [filters.pending_for_role])
    }

    if (filters.sla_breached) {
      query = query.where('requests.sla_deadline', '<', new Date())
    }

    const requests = await query.orderBy('requests.submitted_at', 'desc')
    return this.mapArrayToApiResponse(requests)
  }

  // Update request status and step
  static async updateStatus(id, status, currentStepIndex = null, completedAt = null) {
    const updates = {
      status,
      updated_at: new Date()
    }

    if (currentStepIndex !== null) {
      updates.current_step_index = currentStepIndex
    }

    if (completedAt) {
      updates.completed_at = completedAt
    }

    // Calculate new SLA if moving to next step
    if (currentStepIndex !== null && status === 'pending') {
      const request = await this.findById(id)
      if (request && request.steps[currentStepIndex]?.slaHours) {
        updates.sla_hours = request.steps[currentStepIndex].slaHours
        updates.sla_deadline = new Date(Date.now() + updates.sla_hours * 60 * 60 * 1000)
      }
    }

    const [updatedRequest] = await db(this.tableName)
      .where('id', id)
      .update(updates)
      .returning('*')

    return this.mapToApiResponse(updatedRequest)
  }

  // Get current step details
  static getCurrentStep(request) {
    if (!request || !request.steps || request.current_step_index >= request.steps.length) {
      return null
    }
    return request.steps[request.current_step_index]
  }

  // Check if request is at final step
  static isFinalStep(request) {
    return request.current_step_index >= request.steps.length - 1
  }

  // Get requests approaching SLA deadline
  static async getSLAWarnings(hoursBeforeDeadline = 4) {
    const warningTime = new Date(Date.now() + hoursBeforeDeadline * 60 * 60 * 1000)

    const requests = await db(this.tableName)
      .leftJoin('users as creator', 'requests.created_by', 'creator.id')
      .select('requests.*', 'creator.email as creator_email')
      .where('requests.status', 'pending')
      .where('requests.sla_deadline', '<=', warningTime)
      .where('requests.sla_deadline', '>', new Date())

    return this.mapArrayToApiResponse(requests)
  }

  // Get overdue requests
  static async getOverdueRequests() {
    const requests = await db(this.tableName)
      .leftJoin('users as creator', 'requests.created_by', 'creator.id')
      .select('requests.*', 'creator.email as creator_email')
      .where('requests.status', 'pending')
      .where('requests.sla_deadline', '<', new Date())

    return this.mapArrayToApiResponse(requests)
  }

  // Analytics queries
  static async getAnalytics(dateFrom, dateTo) {
    const analytics = await db(this.tableName)
      .select(
        db.raw('COUNT(*) as total_requests'),
        db.raw('COUNT(CASE WHEN status = \'approved\' THEN 1 END) as approved_count'),
        db.raw('COUNT(CASE WHEN status = \'rejected\' THEN 1 END) as rejected_count'),
        db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_count'),
        db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/3600) as avg_completion_hours')
      )
      .where('submitted_at', '>=', dateFrom)
      .where('submitted_at', '<=', dateTo)
      .first()

    return {
      ...analytics,
      avg_completion_hours: analytics.avg_completion_hours ? parseFloat(analytics.avg_completion_hours).toFixed(2) : null
    }
  }
}

module.exports = Request
