const express = require('express')
const { authenticateToken, requireRole } = require('../middleware/auth')
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation')
const workflowsSchema = require('../schemas/workflows')
const Workflow = require('../models/Workflow')
const { apiResponse } = require('../utils/apiResponse')
const logger = require('../utils/logger')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: List workflows
 *     tags: [Workflows]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, description, or flowId
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
 *         description: Workflows retrieved successfully
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
 *                         workflows:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Workflow'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 */
// Get all workflows
router.get('/',
  validateQuery(workflowsSchema.listQuery),
  async (req, res) => {
    try {
      const { active, search, limit = 50, offset = 0 } = req.query
      const userId = req.user.id
      const userRole = req.user.role

      logger.info('Fetching workflows list', {
        userId,
        userRole,
        filters: { active, search, limit, offset }
      })

      const options = {
        active: active !== undefined ? active === 'true' : undefined,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }

      const workflows = await Workflow.list(options)
      const total = await Workflow.count(options)

      const result = {
        workflows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }

      logger.info('Workflows retrieved', {
        userId,
        count: workflows.length,
        total
      })

      return apiResponse.success(res, result, 'Workflows retrieved successfully')
    } catch (error) {
      logger.error('Get workflows error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve workflows')
    }
  })

// Get workflow by ID
router.get('/:id',
  validateParams(workflowsSchema.idParams),
  async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id)
      const userId = req.user.id

      logger.info('Fetching workflow by ID', { userId, workflowId })

      const workflow = await Workflow.findById(workflowId)

      if (!workflow) {
        logger.warn('Workflow not found', { userId, workflowId })
        return apiResponse.notFound(res, 'Workflow not found')
      }

      logger.info('Workflow retrieved', { userId, workflowId })
      return apiResponse.success(res, { workflow }, 'Workflow retrieved successfully')
    } catch (error) {
      logger.error('Get workflow error', {
        userId: req.user.id,
        workflowId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve workflow')
    }
  })

/**
 * @swagger
 * /api/workflows:
 *   post:
 *     summary: Create workflow
 *     tags: [Workflows]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, flowId, steps]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               flowId:
 *                 type: string
 *                 enum: [leave, expense, equipment, general]
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               steps:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/WorkflowStep'
 *     responses:
 *       201:
 *         description: Workflow created successfully
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
 *                         workflow:
 *                           $ref: '#/components/schemas/Workflow'
 */
// Create new workflow (admin only)
router.post('/',
  requireRole(['admin']),
  validateRequest(workflowsSchema.create),
  async (req, res) => {
    try {
      const userId = req.user.id
      const workflowData = {
        ...req.body,
        created_by: userId
      }

      logger.info('Creating new workflow', {
        userId,
        workflowName: workflowData.name,
        flowId: workflowData.flowId
      })

      // Validate workflow structure
      const validationResult = Workflow.validateWorkflow(workflowData)
      if (!validationResult.valid) {
        logger.warn('Workflow validation failed', {
          userId,
          errors: validationResult.errors
        })
        return apiResponse.badRequest(res, 'Workflow validation failed', {
          errors: validationResult.errors
        })
      }

      const workflow = await Workflow.create(workflowData)

      logger.info('Workflow created successfully', {
        userId,
        workflowId: workflow.id,
        flowId: workflow.flow_id
      })

      return apiResponse.created(res, { workflow }, 'Workflow created successfully')
    } catch (error) {
      logger.error('Create workflow error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })

      if (error.code === '23505') { // Unique violation
        return apiResponse.conflict(res, 'Workflow with this flow_id already exists')
      }

      return apiResponse.serverError(res, 'Failed to create workflow')
    }
  })

/**
 * @swagger
 * /api/workflows/{id}:
 *   put:
 *     summary: Update workflow
 *     tags: [Workflows]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workflow ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Workflow'
 *     responses:
 *       200:
 *         description: Workflow updated successfully
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
 *                         workflow:
 *                           $ref: '#/components/schemas/Workflow'
 */
// Update workflow (admin only)
router.put('/:id',
  requireRole(['admin']),
  validateParams(workflowsSchema.idParams),
  validateRequest(workflowsSchema.update),
  async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id)
      const userId = req.user.id
      const updateData = req.body

      logger.info('Updating workflow', {
        userId,
        workflowId,
        updates: Object.keys(updateData)
      })

      // Check if workflow exists
      const existingWorkflow = await Workflow.findById(workflowId)
      if (!existingWorkflow) {
        logger.warn('Workflow not found for update', { userId, workflowId })
        return apiResponse.notFound(res, 'Workflow not found')
      }

      // Validate updated workflow structure if steps are being modified
      if (updateData.steps || updateData.name || updateData.flowId) {
        const workflowToValidate = {
          ...existingWorkflow,
          ...updateData
        }

        const validationResult = Workflow.validateWorkflow(workflowToValidate)
        if (!validationResult.valid) {
          logger.warn('Updated workflow validation failed', {
            userId,
            workflowId,
            errors: validationResult.errors
          })
          return apiResponse.badRequest(res, 'Updated workflow validation failed', {
            errors: validationResult.errors
          })
        }
      }

      const updatedWorkflow = await Workflow.update(workflowId, {
        ...updateData,
        updated_by: userId
      })

      logger.info('Workflow updated successfully', {
        userId,
        workflowId,
        updates: Object.keys(updateData)
      })

      return apiResponse.success(res, { workflow: updatedWorkflow }, 'Workflow updated successfully')
    } catch (error) {
      logger.error('Update workflow error', {
        userId: req.user.id,
        workflowId: req.params.id,
        error: error.message,
        stack: error.stack
      })

      if (error.code === '23505') { // Unique violation
        return apiResponse.conflict(res, 'Workflow with this flowId already exists')
      }

      return apiResponse.serverError(res, 'Failed to update workflow')
    }
  })

// Delete workflow (admin only) - Soft delete by deactivating
router.delete('/:id',
  requireRole(['admin']),
  validateParams(workflowsSchema.idParams),
  async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id)
      const userId = req.user.id

      logger.info('Deleting workflow', { userId, workflowId })

      // Check if workflow exists
      const existingWorkflow = await Workflow.findById(workflowId)
      if (!existingWorkflow) {
        logger.warn('Workflow not found for deletion', { userId, workflowId })
        return apiResponse.notFound(res, 'Workflow not found')
      }

      // Check if workflow has pending requests
      const { db } = require('../database/connection')
      const pendingRequests = await db('requests')
        .where('type', existingWorkflow.flowId)
        .whereIn('status', ['pending', 'in_progress'])
        .count('* as count')
        .first()

      if (parseInt(pendingRequests.count) > 0) {
        logger.warn('Cannot delete workflow with pending requests', {
          userId,
          workflowId,
          pendingCount: pendingRequests.count
        })
        return apiResponse.conflict(res,
          `Cannot delete workflow with ${pendingRequests.count} pending request(s). ` +
          'Please complete or cancel pending requests first.'
        )
      }

      // Soft delete by deactivating
      const deactivatedWorkflow = await Workflow.deactivate(workflowId, userId)

      logger.info('Workflow deactivated successfully', {
        userId,
        workflowId
      })

      return apiResponse.success(res,
        { workflow: deactivatedWorkflow },
        'Workflow deactivated successfully'
      )
    } catch (error) {
      logger.error('Delete workflow error', {
        userId: req.user.id,
        workflowId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to delete workflow')
    }
  })

// Get workflow by flow_id (for internal use)
router.get('/flow/:flowId',
  validateParams(workflowsSchema.flowIdParams),
  async (req, res) => {
    try {
      const flowId = req.params.flowId
      const userId = req.user.id

      logger.info('Fetching workflow by flow_id', { userId, flowId })

      const workflow = await Workflow.findByFlowId(flowId)

      if (!workflow) {
        logger.warn('Workflow not found by flow_id', { userId, flowId })
        return apiResponse.notFound(res, 'Workflow not found')
      }

      logger.info('Workflow retrieved by flow_id', { userId, flowId })
      return apiResponse.success(res, { workflow }, 'Workflow retrieved successfully')
    } catch (error) {
      logger.error('Get workflow by flow_id error', {
        userId: req.user.id,
        flowId: req.params.flowId,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to retrieve workflow')
    }
  })

// Activate workflow (admin only)
router.patch('/:id/activate',
  requireRole(['admin']),
  validateParams(workflowsSchema.idParams),
  async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id)
      const userId = req.user.id

      logger.info('Activating workflow', { userId, workflowId })

      const workflow = await Workflow.findById(workflowId)
      if (!workflow) {
        logger.warn('Workflow not found for activation', { userId, workflowId })
        return apiResponse.notFound(res, 'Workflow not found')
      }

      if (workflow.isActive) {
        return apiResponse.badRequest(res, 'Workflow is already active')
      }

      const activatedWorkflow = await Workflow.update(workflowId, {
        isActive: true,
        updatedBy: userId
      })

      logger.info('Workflow activated successfully', { userId, workflowId })

      return apiResponse.success(res,
        { workflow: activatedWorkflow },
        'Workflow activated successfully'
      )
    } catch (error) {
      logger.error('Activate workflow error', {
        userId: req.user.id,
        workflowId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to activate workflow')
    }
  })

// Deactivate workflow (admin only)
router.patch('/:id/deactivate',
  requireRole(['admin']),
  validateParams(workflowsSchema.idParams),
  async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id)
      const userId = req.user.id

      logger.info('Deactivating workflow', { userId, workflowId })

      const workflow = await Workflow.findById(workflowId)
      if (!workflow) {
        logger.warn('Workflow not found for deactivation', { userId, workflowId })
        return apiResponse.notFound(res, 'Workflow not found')
      }

      if (!workflow.isActive) {
        return apiResponse.badRequest(res, 'Workflow is already inactive')
      }

      const deactivatedWorkflow = await Workflow.deactivate(workflowId, userId)

      logger.info('Workflow deactivated successfully', { userId, workflowId })

      return apiResponse.success(res,
        { workflow: deactivatedWorkflow },
        'Workflow deactivated successfully'
      )
    } catch (error) {
      logger.error('Deactivate workflow error', {
        userId: req.user.id,
        workflowId: req.params.id,
        error: error.message,
        stack: error.stack
      })
      return apiResponse.serverError(res, 'Failed to deactivate workflow')
    }
  })

module.exports = router
