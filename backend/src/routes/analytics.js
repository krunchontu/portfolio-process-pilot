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
/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AnalyticsDashboard'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: Dashboard analytics retrieved successfully
 *                   data:
 *                     totalRequests: 120
 *                     pendingRequests: 18
 *                     approvedRequests: 90
 *                     rejectedRequests: 12
 *                     inProgressRequests: 5
 *                     avgProcessingTime: 12.3
 *                     recentActivity: 8
 *                     timeframe: 30d
 *                     department: all
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
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
        totalRequests: parseInt(totalRequests.count),
        pendingRequests: statusMap.pending || 0,
        approvedRequests: statusMap.approved || 0,
        rejectedRequests: statusMap.rejected || 0,
        inProgressRequests: statusMap.in_progress || 0,
        avgProcessingTime: parseFloat(avgProcessingTime.avg_hours) || 0,
        recentActivity: parseInt(recentActivity.count),
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
/**
 * @swagger
 * /api/analytics/requests:
 *   get:
 *     summary: Request metrics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [leave, expense, equipment, general]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request metrics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AnalyticsRequests'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: Request metrics retrieved successfully
 *                   data:
 *                     metrics:
 *                       - date: "2025-09-10"
 *                         type: leave
 *                         status: approved
 *                         count: 7
 *                         avgProcessingHours: 10.5
 *                     typeDistribution:
 *                       - type: leave
 *                         count: 60
 *                     statusDistribution:
 *                       - status: pending
 *                         count: 18
 *                     filters:
 *                       timeframe: 30d
 *                       type: leave
 *                       status: approved
 *                       department: Engineering
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
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
          avgProcessingHours: parseFloat(row.avg_processing_hours) || 0
        })),
        typeDistribution: typeDistribution.map(row => ({
          type: row.type,
          count: parseInt(row.count)
        })),
        statusDistribution: statusDistribution.map(row => ({
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
/**
 * @swagger
 * /api/analytics/workflows:
 *   get:
 *     summary: Workflow analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *     responses:
 *       200:
 *         description: Workflow analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: 'object'
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AnalyticsWorkflows'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: Workflow analytics retrieved successfully
 *                   data:
 *                     workflowMetrics:
 *                       - id: "1"
 *                         name: "Leave Approval"
 *                         flowId: "leave"
 *                         description: "Standard leave workflow"
 *                         totalRequests: 80
 *                         approvedCount: 60
 *                         rejectedCount: 10
 *                         pendingCount: 10
 *                         approvalRate: 75.0
 *                         avgProcessingHours: 14.2
 *                         lastUsed: "2025-09-12T08:15:00.000Z"
 *                     stepPerformance:
 *                       - workflowId: "leave"
 *                         workflowName: "Leave Approval"
 *                         action: "approve"
 *                         details: null
 *                         count: 60
 *                         avgTimeToAction: 6.1
 *                     timeframe: 30d
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
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
        workflowMetrics: workflowMetrics.map(row => ({
          id: row.id,
          name: row.name,
          flowId: row.flow_id,
          description: row.description,
          totalRequests: parseInt(row.total_requests) || 0,
          approvedCount: parseInt(row.approved_count) || 0,
          rejectedCount: parseInt(row.rejected_count) || 0,
          pendingCount: parseInt(row.pending_count) || 0,
          approvalRate: row.total_requests > 0
            ? ((parseInt(row.approved_count) || 0) / parseInt(row.total_requests) * 100).toFixed(1)
            : 0,
          avgProcessingHours: parseFloat(row.avg_processing_hours) || 0,
          lastUsed: row.last_used
        })),
        stepPerformance: stepPerformance.map(row => ({
          workflowId: row.flow_id,
          workflowName: row.workflow_name,
          action: row.action,
          details: row.details,
          count: parseInt(row.action_count),
          avgTimeToAction: parseFloat(row.avg_time_to_action) || 0
        })),
        timeframe
      }

      logger.info('Workflow analytics retrieved', {
        userId,
        workflowCount: result.workflowMetrics.length
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
/**
 * @swagger
 * /api/analytics/users:
 *   get:
 *     summary: User analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [employee, manager, admin]
 *     responses:
 *       200:
 *         description: User analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: 'object'
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AnalyticsUsers'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: User analytics retrieved successfully
 *                   data:
 *                     userActivity:
 *                       - id: "u1"
 *                         email: "manager@example.com"
 *                         fullName: "Mary Manager"
 *                         role: manager
 *                         department: Engineering
 *                         isActive: true
 *                         lastLogin: "2025-09-12T07:55:00.000Z"
 *                         requestsCreated: 3
 *                         actionsTaken: 25
 *                         approvals: 20
 *                         rejections: 5
 *                         lastActivity: "2025-09-12T08:10:00.000Z"
 *                     departmentSummary:
 *                       - department: Engineering
 *                         totalUsers: 25
 *                         activeUsers: 24
 *                         employees: 20
 *                         managers: 4
 *                         admins: 1
 *                     roleDistribution:
 *                       - role: employee
 *                         count: 40
 *                     filters: { timeframe: 30d }
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
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
        userActivity: userActivity.map(row => ({
          id: row.id,
          email: row.email,
          fullName: `${row.first_name} ${row.last_name}`,
          role: row.role,
          department: row.department,
          isActive: row.is_active,
          lastLogin: row.last_login,
          requestsCreated: parseInt(row.requests_created),
          actionsTaken: parseInt(row.actions_taken),
          approvals: parseInt(row.approvals),
          rejections: parseInt(row.rejections),
          lastActivity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null
        })),
        departmentSummary: departmentSummary.map(row => ({
          department: row.department,
          totalUsers: parseInt(row.total_users),
          activeUsers: parseInt(row.active_users),
          employees: parseInt(row.employees),
          managers: parseInt(row.managers),
          admins: parseInt(row.admins)
        })),
        roleDistribution: roleDistribution.map(row => ({
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
        userCount: result.userActivity.length
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
/**
 * @swagger
 * /api/analytics/departments:
 *   get:
 *     summary: Department analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *     responses:
 *       200:
 *         description: Department analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: 'object'
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AnalyticsDepartments'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: Department analytics retrieved successfully
 *                   data:
 *                     departmentMetrics:
 *                       - department: Engineering
 *                         totalUsers: 25
 *                         activeUsers: 24
 *                         totalRequests: 120
 *                         approvedRequests: 90
 *                         rejectedRequests: 12
 *                         pendingRequests: 18
 *                         approvalRate: 75.0
 *                         avgProcessingHours: 13.2
 *                     requestTypesByDepartment:
 *                       - department: Engineering
 *                         type: leave
 *                         count: 60
 *                     workloadTrends:
 *                       - department: Engineering
 *                         date: "2025-09-10"
 *                         requests: 8
 *                     timeframe: 30d
 *                     accessLevel: manager
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
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
        departmentMetrics: departmentMetrics.map(row => ({
          department: row.department,
          totalUsers: parseInt(row.total_users),
          activeUsers: parseInt(row.active_users),
          totalRequests: parseInt(row.total_requests),
          approvedRequests: parseInt(row.approved_requests),
          rejectedRequests: parseInt(row.rejected_requests),
          pendingRequests: parseInt(row.pending_requests),
          approvalRate: row.total_requests > 0
            ? ((parseInt(row.approved_requests) || 0) / parseInt(row.total_requests) * 100).toFixed(1)
            : 0,
          avgProcessingHours: parseFloat(row.avg_processing_hours) || 0
        })),
        requestTypesByDepartment: requestTypesByDept.map(row => ({
          department: row.department,
          type: row.type,
          count: parseInt(row.count)
        })),
        workloadTrends: workloadTrends.map(row => ({
          department: row.department,
          date: row.date,
          requests: parseInt(row.requests)
        })),
        timeframe,
        accessLevel: userRole
      }

      logger.info('Department analytics retrieved', {
        userId,
        userRole,
        departmentCount: result.departmentMetrics.length
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
