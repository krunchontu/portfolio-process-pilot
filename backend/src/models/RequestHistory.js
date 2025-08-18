const { db } = require('../database/connection');

class RequestHistory {
  static get tableName() {
    return 'request_history';
  }

  // Create new history entry
  static async create(historyData) {
    const { request_id, actor_id, action, step_id, comment, metadata } = historyData;
    
    // Get actor details for backup
    let actor_email = null;
    let actor_role = null;
    
    if (actor_id) {
      const actor = await db('users')
        .select('email', 'role')
        .where('id', actor_id)
        .first();
      
      if (actor) {
        actor_email = actor.email;
        actor_role = actor.role;
      }
    }
    
    const [history] = await db(this.tableName)
      .insert({
        request_id,
        actor_id,
        actor_email,
        actor_role,
        action,
        step_id,
        comment,
        metadata
      })
      .returning('*');
    
    return history;
  }

  // Find history by request ID
  static async findByRequestId(requestId) {
    return await db(this.tableName)
      .leftJoin('users', 'request_history.actor_id', 'users.id')
      .select(
        'request_history.*',
        'users.first_name as actor_first_name',
        'users.last_name as actor_last_name',
        'users.email as current_actor_email' // Current email (might be different from backup)
      )
      .where('request_id', requestId)
      .orderBy('performed_at', 'asc');
  }

  // Get recent activity
  static async getRecentActivity(limit = 50) {
    return await db(this.tableName)
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
      .limit(limit);
  }

  // Get activity by actor
  static async getActivityByActor(actorId, limit = 20) {
    return await db(this.tableName)
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
      .limit(limit);
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
      .orderBy('date', 'asc');
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
    `);
  }
}

module.exports = RequestHistory;