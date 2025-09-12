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

// Get all users (admin and managers only)
router.get('/',
  requireRole(['admin', 'manager']),
  validateQuery(usersSchema.listQuery),
  async (req, res) => {
    try {
      const {
        role,
        department,
        active,
        search,
        limit = 50,
        offset = 0
      } = req.query
      const userId = req.user.id
      const userRole = req.user.role

      logger.info('Fetching users list', {
        userId,
        userRole,
        filters: { role, department, active, search, limit, offset }
      })

      const options = {
        role,
        department,
        active: active !== undefined ? active === 'true' : undefined,
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
          has_more: (parseInt(offset) + parseInt(limit)) < total
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

      const user = await User.findById(targetUserId)

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
        is_active: false,
        deactivated_at: new Date()
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
        is_active: true,
        deactivated_at: null,
        activated_at: new Date()
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

      const result = {
        requests,
        pagination: {
          total: parseInt(totalCount.count),
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < parseInt(totalCount.count)
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
