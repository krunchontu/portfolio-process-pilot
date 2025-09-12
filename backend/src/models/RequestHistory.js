const { db } = require('../database/connection')

class RequestHistory {
  static get tableName() {
    return 'request_history'
  }

  // Convert database record to API response format (snake_case → camelCase)
  static mapToApiResponse(history) {
    if (!history) return null

    return {
      id: history.id,
      requestId: history.request_id,
      actorId: history.actor_id,
      actorEmail: history.actor_email,
      actorRole: history.actor_role,
      action: history.action,
      stepId: history.step_id,
      comment: history.comment,
      metadata: history.metadata,
      performedAt: history.performed_at,
      createdAt: history.created_at,
      // Include joined fields if present
      actorFirstName: history.actor_first_name,
      actorLastName: history.actor_last_name,
      currentActorEmail: history.current_actor_email,
      requestType: history.request_type,
      creatorFirstName: history.creator_first_name,
      creatorLastName: history.creator_last_name
    }
  }

  // Convert multiple database records to API response format
  static mapArrayToApiResponse(historyRecords) {
    return historyRecords.map(history => this.mapToApiResponse(history))
  }

  // Create new history entry
  static async create(historyData) {
    const { requestId, actorId, action, stepId, comment, metadata } = historyData

    // Get actor details for backup
    let actorEmail = null
    let actorRole = null

    if (actorId) {
      const actor = await db('users')
        .select('email', 'role')
        .where('id', actorId)
        .first()

      if (actor) {
        actorEmail = actor.email
        actorRole = actor.role
      }
    }

    const [history] = await db(this.tableName)
      .insert({
        request_id: requestId,
        actor_id: actorId,
        actor_email: actorEmail,
        actor_role: actorRole,
        action,
        step_id: stepId,
        comment,
        metadata
      })
      .returning('*')

    return this.mapToApiResponse(history)
  }

  // Find history by request ID
  static async findByRequestId(requestId) {
    const historyRecords = await db(this.tableName)
      .leftJoin('users', 'request_history.actor_id', 'users.id')
      .select(
        'request_history.*',
        'users.first_name as actor_first_name',
        'users.last_name as actor_last_name',
        'users.email as current_actor_email' // Current email (might be different from backup)
      )
      .where('request_id', requestId)
      .orderBy('performed_at', 'asc')

    return this.mapArrayToApiResponse(historyRecords)
  }

  // Get recent activity
  static async getRecentActivity(limit = 50) {
    const activities = await db(this.tableName)
      .leftJoin('requests', 'request_history.request_id', 'requests.id')
      .leftJoin('users as actor', 'request_history.actor_id', 'actor.id')
      .leftJoin('users as creator', 'requests.created_by', 'creator.id')
      .select(
        'request_history.performed_at',
        'request_history.action',
        'request_history.comment',
        'requests.id as request_id',
        'requests.type as request_type',
        'actor.first_name as actor_first_name',
        'actor.last_name as actor_last_name',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name'
      )
      .orderBy('request_history.performed_at', 'desc')
      .limit(limit)

    return this.mapArrayToApiResponse(activities)
  }

  // Get activity by actor
  static async getActivityByActor(actorId, limit = 20) {
    const activities = await db(this.tableName)
      .leftJoin('requests', 'request_history.request_id', 'requests.id')
      .select(
        'request_history.performed_at',
        'request_history.action',
        'request_history.comment',
        'requests.id as request_id',
        'requests.type as request_type'
      )
      .where('request_history.actor_id', actorId)
      .orderBy('request_history.performed_at', 'desc')
      .limit(limit)

    return this.mapArrayToApiResponse(activities)
  }

  // Analytics: Actions by type over time
  static async getActionAnalytics(dateFrom, dateTo) {
    return await db(this.tableName)
      .select(
        'action',
        db.raw('COUNT(*) as count'),
        db.raw('DATE(performed_at) as date')
      )
      .where('performed_at', '>=', dateFrom)
      .where('performed_at', '<=', dateTo)
      .groupBy('action', db.raw('DATE(performed_at)'))
      .orderBy('date', 'asc')
  }

  // Get approval times by step
  static async getApprovalTimes() {
    return await db.raw(`
      SELECT 
        step_id,
        AVG(EXTRACT(EPOCH FROM (
          LEAD(performed_at) OVER (PARTITION BY request_id ORDER BY performed_at) - performed_at
        ))/3600) as avg_hours_to_next_action
      FROM request_history 
      WHERE action IN ('submit', 'approve') 
      AND step_id IS NOT NULL
      GROUP BY step_id
    `)
  }
}

module.exports = RequestHistory
