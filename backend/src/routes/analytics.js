const express = require('express')
const { authenticateToken, requireRole } = require('../middleware/auth')
const { validateRequest: _validateRequest, validateQuery, validateParams: _validateParams } = require('../middleware/validation')
const { analyticsSchema } = require('../schemas/analytics')
const { db } = require('../database/connection')
const { apiResponse } = require('../utils/apiResponse')
const logger = require('../utils/logger')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Get dashboard analytics (admin and managers only)
router.get('/dashboard',
  requireRole(['admin', 'manager']),
  validateQuery(analyticsSchema.dashboardQuery),
  async (req, res) => {
    try {
      const { timeframe = '30d', department } = req.query
      const userId = req.user.id
      const userRole = req.user.role

      logger.info('Fetching dashboard analytics', {
        userId,
        role: userRole,
        timeframe,
        department
      })

      // Calculate date range
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Base query with date filter
      let baseQuery = db('requests').where('created_at', '>=', startDate)

      // Apply department filter if specified and user has permission
      if (department) {
        if (userRole === 'manager') {
          // Managers can only see their department
          const user = await db('users').where('id', userId).first()
          if (user && user.department === department) {
            baseQuery = baseQuery.join('users', 'requests.user_id', 'users.id')
              .where('users.department', department)
          } else {
            return apiResponse.forbidden(res, 'Access denied to department data')
          }
        } else if (userRole === 'admin') {
          baseQuery = baseQuery.join('users', 'requests.user_id', 'users.id')
            .where('users.department', department)
        }
      } else if (userRole === 'manager') {
        // Manager can only see their department by default
        const user = await db('users').where('id', userId).first()
        if (user && user.department) {
          baseQuery = baseQuery.join('users', 'requests.user_id', 'users.id')
            .where('users.department', user.department)
        }
      }

      // Get total requests
      const totalRequests = await baseQuery.clone().count('* as count').first()

      // Get requests by status
      const statusCounts = await baseQuery.clone()
        .select('status')
        .count('* as count')
        .groupBy('status')

      const statusMap = statusCounts.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count)
        return acc
      }, {})

      // Calculate average processing time for completed requests
      const avgProcessingTime = await baseQuery.clone()
        .whereIn('status', ['approved', 'rejected'])
        .select(db.raw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours'))
        .first()

      // Get recent activity (last 24 hours)
      const recentActivity = await baseQuery.clone()
        .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .count('* as count')
        .first()

      const analytics = {
        total_requests: parseInt(totalRequests.count),
        pending_requests: statusMap.pending || 0,
        approved_requests: statusMap.approved || 0,
        rejected_requests: statusMap.rejected || 0,
        in_progress_requests: statusMap.in_progress || 0,
        avg_processing_time: parseFloat(avgProcessingTime.avg_hours) || 0,
        recent_activity: parseInt(recentActivity.count),
        timeframe,
        department: department || (userRole === 'manager' ? 'user_department' : 'all')
      }

      logger.info('Dashboard analytics retrieved', { userId, analytics })
      return apiResponse.success(res, analytics, 'Dashboard analytics retrieved successfully')
    } catch (error) {
      logger.error('Dashboard analytics error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve dashboard analytics')
    }
  })

// Get request metrics (admin and managers only)
router.get('/requests',
  requireRole(['admin', 'manager']),
  validateQuery(analyticsSchema.requestsQuery),
  async (req, res) => {
    try {
      const { timeframe = '30d', type, status, department } = req.query
      const userId = req.user.id
      const userRole = req.user.role

      logger.info('Fetching request metrics', {
        userId,
        timeframe,
        type,
        status,
        department
      })

      // Calculate date range
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Base query
      let query = db('requests')
        .select([
          db.raw('DATE(created_at) as date'),
          'type',
          'status',
          db.raw('COUNT(*) as count'),
          db.raw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours')
        ])
        .where('created_at', '>=', startDate)

      // Apply filters
      if (type) query = query.where('type', type)
      if (status) query = query.where('status', status)

      // Apply department filter with role-based access
      if (department || userRole === 'manager') {
        query = query.join('users', 'requests.user_id', 'users.id')

        if (userRole === 'manager') {
          const user = await db('users').where('id', userId).first()
          const targetDept = department || user?.department
          if (targetDept) {
            query = query.where('users.department', targetDept)
          }
        } else if (department) {
          query = query.where('users.department', department)
        }
      }

      const metrics = await query
        .groupBy('date', 'type', 'status')
        .orderBy('date', 'desc')

      // Get request type distribution
      const typeDistribution = await db('requests')
        .select('type')
        .count('* as count')
        .where('created_at', '>=', startDate)
        .groupBy('type')

      // Get status distribution
      const statusDistribution = await db('requests')
        .select('status')
        .count('* as count')
        .where('created_at', '>=', startDate)
        .groupBy('status')

      const result = {
        metrics: metrics.map(row => ({
          date: row.date,
          type: row.type,
          status: row.status,
          count: parseInt(row.count),
          avg_processing_hours: parseFloat(row.avg_processing_hours) || 0
        })),
        type_distribution: typeDistribution.map(row => ({
          type: row.type,
          count: parseInt(row.count)
        })),
        status_distribution: statusDistribution.map(row => ({
          status: row.status,
          count: parseInt(row.count)
        })),
        filters: {
          timeframe,
          type,
          status,
          department
        }
      }

      logger.info('Request metrics retrieved', {
        userId,
        totalMetrics: metrics.length
      })
      return apiResponse.success(res, result, 'Request metrics retrieved successfully')
    } catch (error) {
      logger.error('Request metrics error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve request metrics')
    }
  })

// Get workflow performance (admin only)
router.get('/workflows',
  requireRole(['admin']),
  validateQuery(analyticsSchema.workflowsQuery),
  async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query
      const userId = req.user.id

      logger.info('Fetching workflow analytics', { userId, timeframe })

      // Calculate date range
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get workflow performance metrics
      const workflowMetrics = await db('workflows as w')
        .leftJoin('requests as r', 'w.flow_id', 'r.type')
        .select([
          'w.id',
          'w.name',
          'w.flow_id',
          'w.description',
          db.raw('COUNT(r.id) as total_requests'),
          db.raw('COUNT(CASE WHEN r.status = \'approved\' THEN 1 END) as approved_count'),
          db.raw('COUNT(CASE WHEN r.status = \'rejected\' THEN 1 END) as rejected_count'),
          db.raw('COUNT(CASE WHEN r.status = \'pending\' THEN 1 END) as pending_count'),
          db.raw('AVG(CASE WHEN r.status IN (\'approved\', \'rejected\') THEN EXTRACT(EPOCH FROM (r.updated_at - r.created_at))/3600 END) as avg_processing_hours'),
          db.raw('MAX(r.created_at) as last_used')
        ])
        .where(function () {
          this.where('r.created_at', '>=', startDate)
            .orWhereNull('r.created_at')
        })
        .where('w.is_active', true)
        .groupBy('w.id', 'w.name', 'w.flow_id', 'w.description')
        .orderBy('total_requests', 'desc')

      // Get workflow step performance
      const stepPerformance = await db('request_history as rh')
        .join('requests as r', 'rh.request_id', 'r.id')
        .join('workflows as w', 'r.type', 'w.flow_id')
        .select([
          'w.flow_id',
          'w.name as workflow_name',
          'rh.action',
          'rh.details',
          db.raw('COUNT(*) as action_count'),
          db.raw('AVG(EXTRACT(EPOCH FROM (rh.created_at - r.created_at))/3600) as avg_time_to_action')
        ])
        .where('rh.created_at', '>=', startDate)
        .whereIn('rh.action', ['approve', 'reject', 'submit'])
        .groupBy('w.flow_id', 'w.name', 'rh.action', 'rh.details')
        .orderBy('w.flow_id')

      const result = {
        workflow_metrics: workflowMetrics.map(row => ({
          id: row.id,
          name: row.name,
          flow_id: row.flow_id,
          description: row.description,
          total_requests: parseInt(row.total_requests) || 0,
          approved_count: parseInt(row.approved_count) || 0,
          rejected_count: parseInt(row.rejected_count) || 0,
          pending_count: parseInt(row.pending_count) || 0,
          approval_rate: row.total_requests > 0
            ? ((parseInt(row.approved_count) || 0) / parseInt(row.total_requests) * 100).toFixed(1)
            : 0,
          avg_processing_hours: parseFloat(row.avg_processing_hours) || 0,
          last_used: row.last_used
        })),
        step_performance: stepPerformance.map(row => ({
          workflow_id: row.flow_id,
          workflow_name: row.workflow_name,
          action: row.action,
          details: row.details,
          count: parseInt(row.action_count),
          avg_time_to_action: parseFloat(row.avg_time_to_action) || 0
        })),
        timeframe
      }

      logger.info('Workflow analytics retrieved', {
        userId,
        workflowCount: result.workflow_metrics.length
      })
      return apiResponse.success(res, result, 'Workflow analytics retrieved successfully')
    } catch (error) {
      logger.error('Workflow analytics error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve workflow analytics')
    }
  })

// Get user activity (admin only)
router.get('/users',
  requireRole(['admin']),
  validateQuery(analyticsSchema.usersQuery),
  async (req, res) => {
    try {
      const { timeframe = '30d', department, role } = req.query
      const userId = req.user.id

      logger.info('Fetching user analytics', { userId, timeframe, department, role })

      // Calculate date range
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Base user activity query
      let query = db('users as u')
        .leftJoin('requests as r', function () {
          this.on('u.id', 'r.user_id')
            .andOn('r.created_at', '>=', db.raw('?', [startDate]))
        })
        .leftJoin('request_history as rh', function () {
          this.on('u.id', 'rh.user_id')
            .andOn('rh.created_at', '>=', db.raw('?', [startDate]))
        })
        .select([
          'u.id',
          'u.email',
          'u.first_name',
          'u.last_name',
          'u.role',
          'u.department',
          'u.is_active',
          'u.last_login',
          db.raw('COUNT(DISTINCT r.id) as requests_created'),
          db.raw('COUNT(DISTINCT rh.id) as actions_taken'),
          db.raw('COUNT(DISTINCT CASE WHEN rh.action = \'approve\' THEN rh.id END) as approvals'),
          db.raw('COUNT(DISTINCT CASE WHEN rh.action = \'reject\' THEN rh.id END) as rejections'),
          db.raw('MAX(GREATEST(COALESCE(r.created_at, \'1970-01-01\'), COALESCE(rh.created_at, \'1970-01-01\'))) as last_activity')
        ])

      // Apply filters
      if (department) {
        query = query.where('u.department', department)
      }
      if (role) {
        query = query.where('u.role', role)
      }

      const userActivity = await query
        .groupBy('u.id', 'u.email', 'u.first_name', 'u.last_name', 'u.role', 'u.department', 'u.is_active', 'u.last_login')
        .orderBy('requests_created', 'desc')

      // Get department summary
      const departmentSummary = await db('users')
        .select([
          'department',
          db.raw('COUNT(*) as total_users'),
          db.raw('COUNT(CASE WHEN is_active THEN 1 END) as active_users'),
          db.raw('COUNT(CASE WHEN role = \'employee\' THEN 1 END) as employees'),
          db.raw('COUNT(CASE WHEN role = \'manager\' THEN 1 END) as managers'),
          db.raw('COUNT(CASE WHEN role = \'admin\' THEN 1 END) as admins')
        ])
        .whereNotNull('department')
        .groupBy('department')
        .orderBy('total_users', 'desc')

      // Get role distribution
      const roleDistribution = await db('users')
        .select('role')
        .count('* as count')
        .where('is_active', true)
        .groupBy('role')

      const result = {
        user_activity: userActivity.map(row => ({
          id: row.id,
          email: row.email,
          full_name: `${row.first_name} ${row.last_name}`,
          role: row.role,
          department: row.department,
          is_active: row.is_active,
          last_login: row.last_login,
          requests_created: parseInt(row.requests_created),
          actions_taken: parseInt(row.actions_taken),
          approvals: parseInt(row.approvals),
          rejections: parseInt(row.rejections),
          last_activity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null
        })),
        department_summary: departmentSummary.map(row => ({
          department: row.department,
          total_users: parseInt(row.total_users),
          active_users: parseInt(row.active_users),
          employees: parseInt(row.employees),
          managers: parseInt(row.managers),
          admins: parseInt(row.admins)
        })),
        role_distribution: roleDistribution.map(row => ({
          role: row.role,
          count: parseInt(row.count)
        })),
        filters: {
          timeframe,
          department,
          role
        }
      }

      logger.info('User analytics retrieved', {
        userId,
        userCount: result.user_activity.length
      })
      return apiResponse.success(res, result, 'User analytics retrieved successfully')
    } catch (error) {
      logger.error('User analytics error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve user analytics')
    }
  })

// Get department metrics (admin and managers only)
router.get('/departments',
  requireRole(['admin', 'manager']),
  validateQuery(analyticsSchema.departmentsQuery),
  async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query
      const userId = req.user.id
      const userRole = req.user.role

      logger.info('Fetching department analytics', { userId, userRole, timeframe })

      // Calculate date range
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Base query for department metrics
      let query = db('users as u')
        .leftJoin('requests as r', function () {
          this.on('u.id', 'r.user_id')
            .andOn('r.created_at', '>=', db.raw('?', [startDate]))
        })
        .select([
          'u.department',
          db.raw('COUNT(DISTINCT u.id) as total_users'),
          db.raw('COUNT(DISTINCT CASE WHEN u.is_active THEN u.id END) as active_users'),
          db.raw('COUNT(DISTINCT r.id) as total_requests'),
          db.raw('COUNT(DISTINCT CASE WHEN r.status = \'approved\' THEN r.id END) as approved_requests'),
          db.raw('COUNT(DISTINCT CASE WHEN r.status = \'rejected\' THEN r.id END) as rejected_requests'),
          db.raw('COUNT(DISTINCT CASE WHEN r.status = \'pending\' THEN r.id END) as pending_requests'),
          db.raw('AVG(CASE WHEN r.status IN (\'approved\', \'rejected\') THEN EXTRACT(EPOCH FROM (r.updated_at - r.created_at))/3600 END) as avg_processing_hours')
        ])
        .whereNotNull('u.department')

      // If user is manager, restrict to their department only
      if (userRole === 'manager') {
        const user = await db('users').where('id', userId).first()
        if (user && user.department) {
          query = query.where('u.department', user.department)
        }
      }

      const departmentMetrics = await query
        .groupBy('u.department')
        .orderBy('total_requests', 'desc')

      // Get request type breakdown by department
      let typeQuery = db('users as u')
        .join('requests as r', 'u.id', 'r.user_id')
        .select([
          'u.department',
          'r.type',
          db.raw('COUNT(*) as count')
        ])
        .where('r.created_at', '>=', startDate)
        .whereNotNull('u.department')

      if (userRole === 'manager') {
        const user = await db('users').where('id', userId).first()
        if (user && user.department) {
          typeQuery = typeQuery.where('u.department', user.department)
        }
      }

      const requestTypesByDept = await typeQuery
        .groupBy('u.department', 'r.type')
        .orderBy('u.department')

      // Get workload trends (requests per day)
      let trendQuery = db('users as u')
        .join('requests as r', 'u.id', 'r.user_id')
        .select([
          'u.department',
          db.raw('DATE(r.created_at) as date'),
          db.raw('COUNT(*) as requests')
        ])
        .where('r.created_at', '>=', startDate)
        .whereNotNull('u.department')

      if (userRole === 'manager') {
        const user = await db('users').where('id', userId).first()
        if (user && user.department) {
          trendQuery = trendQuery.where('u.department', user.department)
        }
      }

      const workloadTrends = await trendQuery
        .groupBy('u.department', db.raw('DATE(r.created_at)'))
        .orderBy('date', 'desc')

      const result = {
        department_metrics: departmentMetrics.map(row => ({
          department: row.department,
          total_users: parseInt(row.total_users),
          active_users: parseInt(row.active_users),
          total_requests: parseInt(row.total_requests),
          approved_requests: parseInt(row.approved_requests),
          rejected_requests: parseInt(row.rejected_requests),
          pending_requests: parseInt(row.pending_requests),
          approval_rate: row.total_requests > 0
            ? ((parseInt(row.approved_requests) || 0) / parseInt(row.total_requests) * 100).toFixed(1)
            : 0,
          avg_processing_hours: parseFloat(row.avg_processing_hours) || 0
        })),
        request_types_by_department: requestTypesByDept.map(row => ({
          department: row.department,
          type: row.type,
          count: parseInt(row.count)
        })),
        workload_trends: workloadTrends.map(row => ({
          department: row.department,
          date: row.date,
          requests: parseInt(row.requests)
        })),
        timeframe,
        access_level: userRole
      }

      logger.info('Department analytics retrieved', {
        userId,
        userRole,
        departmentCount: result.department_metrics.length
      })
      return apiResponse.success(res, result, 'Department analytics retrieved successfully')
    } catch (error) {
      logger.error('Department analytics error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve department analytics')
    }
  })

module.exports = router
