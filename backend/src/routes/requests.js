const express = require('express')
const Request = require('../models/Request')
const RequestHistory = require('../models/RequestHistory')
const Workflow = require('../models/Workflow')
const User = require('../models/User')
const { authenticateToken, requireRole: _requireRole, canActOnRequest } = require('../middleware/auth')
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation')
const { catchAsync, AppError } = require('../middleware/errorHandler')
const emailService = require('../services/emailService')
const logger = require('../utils/logger')
const {
  createRequestSchema,
  requestActionSchema,
  cancelRequestSchema,
  listRequestsSchema
} = require('../schemas/requests')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Create new request
router.post('/', validateRequest(createRequestSchema), catchAsync(async (req, res) => {
  const { type, workflowId, payload } = req.body

  // Get workflow configuration
  const workflow = workflowId
    ? await Workflow.findById(workflowId)
    : await Workflow.findByFlowId(type)

  if (!workflow) {
    throw new AppError('Workflow not found', 404, 'WORKFLOW_NOT_FOUND')
  }

  // Prepare steps from workflow
  let steps = [...workflow.steps]

  // Handle optional steps (like two-step approval)
  if (payload?.twoStep) {
    steps = steps.filter(step => step.required !== false)
  } else {
    steps = steps.filter(step => step.required !== false)
  }

  if (steps.length === 0) {
    throw new AppError('No workflow steps configured', 400, 'NO_WORKFLOW_STEPS')
  }

  const request = await Request.create({
    type,
    workflow_id: workflow.id,
    created_by: req.user.id,
    payload,
    steps
  })

  const fullRequest = await Request.findById(request.id)

  // Send email notification to approvers
  try {
    const user = await User.findById(req.user.id)
    if (user) {
      await emailService.sendRequestSubmittedNotification(fullRequest, user, workflow)
      logger.info('Request submission notification sent', {
        requestId: fullRequest.id,
        userId: user.id,
        workflowId: workflow.id
      })
    }
  } catch (emailError) {
    // Don't fail the request creation if email fails
    logger.error('Failed to send request submission notification', {
      requestId: fullRequest.id,
      userId: req.user.id,
      error: emailError.message
    })
  }

  return res.created('Request created successfully', { request: fullRequest })
}))

// List requests (with filters)
router.get('/', validateQuery(listRequestsSchema), catchAsync(async (req, res) => {
  const filters = { ...req.query }

  // Users can only see their own requests unless they're managers/admins
  if (req.user.role === 'employee') {
    filters.created_by = req.user.id
  } else if (req.user.role === 'manager') {
    // Managers can see requests pending for their role or their own requests
    if (!filters.created_by && !filters.pending_for_role) {
      filters.pending_for_role = 'manager'
    }
  }
  // Admins can see all requests (no additional filters)

  const requests = await Request.list(filters)

  return res.success(200, 'Requests retrieved successfully', {
    requests,
    count: requests.length
  }, {
    filters: req.query
  })
}))

// Get specific request
router.get('/:id', validateParams({ id: require('../middleware/validation').uuid() }), canActOnRequest, catchAsync(async (req, res) => {
  return res.success(200, 'Request retrieved successfully', { request: req.targetRequest })
}))

// Take action on request (approve/reject)
router.post('/:id/action',
  validateParams({ id: require('../middleware/validation').uuid() }),
  validateRequest(requestActionSchema),
  canActOnRequest,
  catchAsync(async (req, res) => {
    const { action, comment = '' } = req.body
    const request = req.targetRequest

    if (request.status !== 'pending') {
      throw new AppError(`Request is already ${request.status}`, 409, 'REQUEST_NOT_PENDING')
    }

    const currentStep = Request.getCurrentStep(request)
    if (!currentStep) {
      throw new AppError('No active step for this request', 400, 'NO_ACTIVE_STEP')
    }

    // Validate action
    if (!currentStep.actions.includes(action)) {
      throw new AppError(`Invalid action. Allowed: ${currentStep.actions.join(', ')}`, 400, 'INVALID_ACTION')
    }

    // Check authorization
    const expectedRole = currentStep.escalatedTo || currentStep.role
    if (req.user.role !== 'admin' && req.user.role !== expectedRole) {
      throw new AppError(`Role ${req.user.role} cannot perform this action`, 403, 'INSUFFICIENT_ROLE')
    }

    // Record the action in history
    await RequestHistory.create({
      request_id: request.id,
      actor_id: req.user.id,
      action: action.toUpperCase(),
      step_id: currentStep.stepId,
      comment
    })

    if (action === 'reject') {
    // Reject the request
      await Request.updateStatus(request.id, 'rejected', null, new Date())
    } else if (action === 'approve') {
    // Check if this is the final step
      if (Request.isFinalStep(request)) {
        await Request.updateStatus(request.id, 'approved', null, new Date())
      } else {
      // Move to next step
        const nextStepIndex = request.currentStepIndex + 1
        await Request.updateStatus(request.id, 'pending', nextStepIndex)
      }
    }

    const fullRequest = await Request.findById(request.id)

    // Send email notifications
    try {
      const [user, workflow, approver] = await Promise.all([
        User.findById(request.userId || request.createdBy),
        Workflow.findById(request.workflowId),
        User.findById(req.user.id)
      ])

      if (user && workflow && approver) {
        if (action === 'approve') {
          await emailService.sendRequestApprovedNotification(fullRequest, user, approver, workflow)
          logger.info('Request approval notification sent', {
            requestId: fullRequest.id,
            userId: user.id,
            approverId: approver.id
          })
        } else if (action === 'reject') {
          await emailService.sendRequestRejectedNotification(fullRequest, user, approver, workflow, comment)
          logger.info('Request rejection notification sent', {
            requestId: fullRequest.id,
            userId: user.id,
            approverId: approver.id
          })
        }
      }
    } catch (emailError) {
      // Don't fail the action if email fails
      logger.error('Failed to send request action notification', {
        requestId: fullRequest.id,
        action,
        userId: req.user.id,
        error: emailError.message
      })
    }

    return res.success(200, `Request ${action}d successfully`, { request: fullRequest })
  }))

// Cancel request (requestor only)
router.post('/:id/cancel',
  validateParams({ id: require('../middleware/validation').uuid() }),
  validateRequest(cancelRequestSchema),
  catchAsync(async (req, res) => {
    const request = await Request.findById(req.params.id)

    if (!request) {
      throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND')
    }

    // Only the requestor or admin can cancel
    if (request.createdBy !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('You can only cancel your own requests', 403, 'CANCEL_NOT_ALLOWED')
    }

    if (request.status !== 'pending') {
      throw new AppError(`Cannot cancel request with status: ${request.status}`, 409, 'CANNOT_CANCEL')
    }

    // Record cancellation
    await RequestHistory.create({
      request_id: request.id,
      actor_id: req.user.id,
      action: 'cancel',
      comment: req.body.comment || 'Request cancelled by requestor'
    })

    await Request.updateStatus(request.id, 'cancelled', null, new Date())

    const fullRequest = await Request.findById(request.id)
    return res.success(200, 'Request cancelled successfully', { request: fullRequest })
  }))

// Get request history
router.get('/:id/history', validateParams({ id: require('../middleware/validation').uuid() }), canActOnRequest, catchAsync(async (req, res) => {
  const history = await RequestHistory.findByRequestId(req.params.id)

  return res.success(200, 'Request history retrieved successfully', {
    request_id: req.params.id,
    history
  })
}))

module.exports = router
