const express = require('express')
const { authenticateToken, requireRole } = require('../middleware/auth')
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation')
const { usersSchema } = require('../schemas/users')
const User = require('../models/User')
const { apiResponse } = require('../utils/apiResponse')
const logger = require('../utils/logger')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [employee, manager, admin]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: Users retrieved successfully
 *                   data:
 *                     users:
 *                       - id: "u1"
 *                         email: "employee@example.com"
 *                         firstName: "Evan"
 *                         lastName: "Employee"
 *                         role: employee
 *                         department: Engineering
 *                         isActive: true
 *                     pagination:
 *                       currentPage: 1
 *                       perPage: 50
 *                       totalItems: 1
 *                       totalPages: 1
 *                       hasNext: false
 *                       hasPrevious: false
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
// Get all users (admin and managers only)
router.get('/',
  requireRole(['admin', 'manager']),
  validateQuery(usersSchema.listQuery),
  async (req, res) => {
    try {
      const {
        role,
        department,
        isActive,
        search,
        limit = 50,
        offset = 0
      } = req.query
      const userId = req.user.id
      const userRole = req.user.role

      logger.info('Fetching users list', {
        userId,
        userRole,
        filters: { role, department, isActive, search, limit, offset }
      })

      const options = {
        role,
        department,
        active: isActive !== undefined ? (typeof isActive === 'string' ? isActive === 'true' : !!isActive) : undefined,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }

      // Managers can only see users in their department
      if (userRole === 'manager') {
        const currentUser = await User.findById(userId)
        if (currentUser && currentUser.department) {
          options.department = currentUser.department
        }
      }

      const users = await User.list(options)
      const total = await User.count(options)

      const result = {
        users,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }

      logger.info('Users retrieved', {
        userId,
        userRole,
        count: users.length,
        total
      })

      return apiResponse.success(res, result, 'Users retrieved successfully')
    } catch (error) {
      logger.error('Get users error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve users')
    }
  })

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: User retrieved successfully
 *                   data:
 *                     user:
 *                       id: "u1"
 *                       email: "employee@example.com"
 *                       firstName: "Evan"
 *                       lastName: "Employee"
 *                       role: employee
 *                       department: Engineering
 *                       isActive: true
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
// Get user by ID (admin and managers only)
router.get('/:id',
  requireRole(['admin', 'manager']),
  validateParams(usersSchema.idParams),
  async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id)
      const userId = req.user.id
      const userRole = req.user.role

      logger.info('Fetching user by ID', { userId, userRole, targetUserId })

      const user = await User.findByIdForApi(targetUserId)

      if (!user) {
        logger.warn('User not found', { userId, targetUserId })
        return apiResponse.notFound(res, 'User not found')
      }

      // Managers can only see users in their department
      if (userRole === 'manager') {
        const currentUser = await User.findById(userId)
        if (currentUser && currentUser.department !== user.department) {
          logger.warn('Manager attempted to access user outside department', {
            userId,
            targetUserId,
            managerDept: currentUser.department,
            userDept: user.department
          })
          return apiResponse.forbidden(res, 'Access denied to user outside your department')
        }
      }

      logger.info('User retrieved', { userId, targetUserId })
      return apiResponse.success(res, { user }, 'User retrieved successfully')
    } catch (error) {
      logger.error('Get user error', {
        userId: req.user.id,
        targetUserId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve user')
    }
  })

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [employee, manager, admin] }
 *               department: { type: string }
 *               managerId: { type: string, format: uuid }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: User updated successfully
 *                   data:
 *                     user:
 *                       id: "u1"
 *                       email: "employee@example.com"
 *                       firstName: "Evan"
 *                       lastName: "Employee"
 *                       role: manager
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
// Update user (admin only)
router.put('/:id',
  requireRole(['admin']),
  validateParams(usersSchema.idParams),
  validateRequest(usersSchema.update),
  async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id)
      const userId = req.user.id
      const updateData = req.body

      logger.info('Updating user', {
        userId,
        targetUserId,
        updates: Object.keys(updateData)
      })

      // Check if user exists
      const existingUser = await User.findById(targetUserId)
      if (!existingUser) {
        logger.warn('User not found for update', { userId, targetUserId })
        return apiResponse.notFound(res, 'User not found')
      }

      // Prevent admin from updating their own role to prevent lockout
      if (targetUserId === userId && updateData.role && updateData.role !== 'admin') {
        logger.warn('Admin attempted to change their own role', { userId, newRole: updateData.role })
        return apiResponse.badRequest(res, 'Cannot change your own admin role')
      }

      // Check if email is being changed and if it's unique
      if (updateData.email && updateData.email !== existingUser.email) {
        const existingEmailUser = await User.findByEmail(updateData.email)
        if (existingEmailUser && existingEmailUser.id !== targetUserId) {
          logger.warn('Email already exists', {
            userId,
            targetUserId,
            email: updateData.email
          })
          return apiResponse.conflict(res, 'Email address is already in use')
        }
      }

      const updatedUser = await User.update(targetUserId, updateData)

      logger.info('User updated successfully', {
        userId,
        targetUserId,
        updates: Object.keys(updateData)
      })

      return apiResponse.success(res, { user: updatedUser }, 'User updated successfully')
    } catch (error) {
      logger.error('Update user error', {
        userId: req.user.id,
        targetUserId: req.params.id,
        error: error.message,
        stack: error.stack
      })

      if (error.code === '23505') { // Unique violation
        return apiResponse.conflict(res, 'Email address is already in use')
      }

      return apiResponse.serverError(res, 'Failed to update user')
    }
  })

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: User deactivated successfully
 *                   data:
 *                     user:
 *                       id: "u1"
 *                       isActive: false
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
// Deactivate user (admin only)
router.patch('/:id/deactivate',
  requireRole(['admin']),
  validateParams(usersSchema.idParams),
  async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id)
      const userId = req.user.id

      logger.info('Deactivating user', { userId, targetUserId })

      // Check if user exists
      const existingUser = await User.findById(targetUserId)
      if (!existingUser) {
        logger.warn('User not found for deactivation', { userId, targetUserId })
        return apiResponse.notFound(res, 'User not found')
      }

      // Prevent admin from deactivating themselves
      if (targetUserId === userId) {
        logger.warn('Admin attempted to deactivate themselves', { userId })
        return apiResponse.badRequest(res, 'Cannot deactivate your own account')
      }

      if (!existingUser.is_active) {
        return apiResponse.badRequest(res, 'User is already inactive')
      }

      // Check for pending requests or assignments
      const { db } = require('../database/connection')
      const pendingRequests = await db('requests')
        .where('user_id', targetUserId)
        .whereIn('status', ['pending', 'in_progress'])
        .count('* as count')
        .first()

      if (parseInt(pendingRequests.count) > 0) {
        logger.warn('Cannot deactivate user with pending requests', {
          userId,
          targetUserId,
          pendingCount: pendingRequests.count
        })
        return apiResponse.conflict(res,
          `Cannot deactivate user with ${pendingRequests.count} pending request(s). ` +
          'Please complete or reassign pending requests first.'
        )
      }

      const updatedUser = await User.update(targetUserId, {
        isActive: false,
        deactivatedAt: new Date()
      })

      logger.info('User deactivated successfully', { userId, targetUserId })

      return apiResponse.success(res,
        { user: updatedUser },
        'User deactivated successfully'
      )
    } catch (error) {
      logger.error('Deactivate user error', {
        userId: req.user.id,
        targetUserId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to deactivate user')
    }
  })

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User activated successfully
 *         content:
 *           application/json:
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: User activated successfully
 *                   data:
 *                     user:
 *                       id: "u1"
 *                       isActive: true
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
// Activate user (admin only)
router.patch('/:id/activate',
  requireRole(['admin']),
  validateParams(usersSchema.idParams),
  async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id)
      const userId = req.user.id

      logger.info('Activating user', { userId, targetUserId })

      const existingUser = await User.findById(targetUserId)
      if (!existingUser) {
        logger.warn('User not found for activation', { userId, targetUserId })
        return apiResponse.notFound(res, 'User not found')
      }

      if (existingUser.is_active) {
        return apiResponse.badRequest(res, 'User is already active')
      }

      const updatedUser = await User.update(targetUserId, {
        isActive: true,
        deactivatedAt: null,
        activatedAt: new Date()
      })

      logger.info('User activated successfully', { userId, targetUserId })

      return apiResponse.success(res,
        { user: updatedUser },
        'User activated successfully'
      )
    } catch (error) {
      logger.error('Activate user error', {
        userId: req.user.id,
        targetUserId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to activate user')
    }
  })

/**
 * @swagger
 * /api/users/{id}/requests:
 *   get:
 *     summary: List requests for a user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: User requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         requests:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Request'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: User requests retrieved successfully
 *                   data:
 *                     requests:
 *                       - id: "r1"
 *                         type: leave
 *                         status: pending
 *                         workflowId: "w1"
 *                         createdBy: "u1"
 *                         currentStepIndex: 0
 *                     pagination:
 *                       currentPage: 1
 *                       perPage: 20
 *                       totalItems: 1
 *                       totalPages: 1
 *                       hasNext: false
 *                       hasPrevious: false
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
// Get user's requests (admin, managers for their dept, or own requests)
router.get('/:id/requests',
  validateParams(usersSchema.idParams),
  validateQuery(usersSchema.requestsQuery),
  async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id)
      const userId = req.user.id
      const userRole = req.user.role
      const { status, limit = 20, offset = 0 } = req.query

      logger.info('Fetching user requests', {
        userId,
        userRole,
        targetUserId,
        filters: { status, limit, offset }
      })

      // Check permissions
      if (userRole === 'employee' && targetUserId !== userId) {
        return apiResponse.forbidden(res, 'Can only view your own requests')
      }

      if (userRole === 'manager') {
        const [currentUser, targetUser] = await Promise.all([
          User.findById(userId),
          User.findById(targetUserId)
        ])

        if (!targetUser) {
          return apiResponse.notFound(res, 'User not found')
        }

        if (currentUser.department !== targetUser.department && targetUserId !== userId) {
          return apiResponse.forbidden(res, 'Can only view requests from your department')
        }
      }

      const { db } = require('../database/connection')
      let query = db('requests')
        .leftJoin('workflows', 'requests.type', 'workflows.flow_id')
        .select([
          'requests.*',
          'workflows.name as workflow_name'
        ])
        .where('requests.user_id', targetUserId)

      if (status) {
        query = query.where('requests.status', status)
      }

      const requests = await query
        .orderBy('requests.created_at', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset))

      const totalCount = await db('requests')
        .where('user_id', targetUserId)
        .modify((query) => {
          if (status) query.where('status', status)
        })
        .count('* as count')
        .first()

      const Request = require('../models/Request')
      const mappedRequests = Request.mapArrayToApiResponse(requests)

      const result = {
        requests: mappedRequests,
        pagination: {
          total: parseInt(totalCount.count),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(totalCount.count)
        }
      }

      logger.info('User requests retrieved', {
        userId,
        targetUserId,
        count: requests.length,
        total: totalCount.count
      })

      return apiResponse.success(res, result, 'User requests retrieved successfully')
    } catch (error) {
      logger.error('Get user requests error', {
        userId: req.user.id,
        targetUserId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve user requests')
    }
  })

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [employee, manager, admin], default: employee }
 *               department: { type: string }
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   message: User created successfully
 *                   data:
 *                     user:
 *                       id: "u2"
 *                       email: "new@example.com"
 *                       firstName: "New"
 *                       lastName: "User"
 *                       role: employee
 *                   meta:
 *                     timestamp: "2025-09-12T12:00:00.000Z"
 */
// Create new user (admin only)
router.post('/',
  requireRole(['admin']),
  validateRequest(usersSchema.create),
  async (req, res) => {
    try {
      const userId = req.user.id
      const userData = req.body

      logger.info('Creating new user', {
        userId,
        email: userData.email,
        role: userData.role,
        department: userData.department
      })

      // Check if email already exists
      const existingUser = await User.findByEmail(userData.email)
      if (existingUser) {
        logger.warn('Email already exists', {
          userId,
          email: userData.email
        })
        return apiResponse.conflict(res, 'Email address is already in use')
      }

      const newUser = await User.create(userData)

      logger.info('User created successfully', {
        userId,
        newUserId: newUser.id,
        email: newUser.email
      })

      return apiResponse.created(res, { user: newUser }, 'User created successfully')
    } catch (error) {
      logger.error('Create user error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })

      if (error.code === '23505') { // Unique violation
        return apiResponse.conflict(res, 'Email address is already in use')
      }

      return apiResponse.serverError(res, 'Failed to create user')
    }
  })

module.exports = router
