// Minimal ProcessPilot backend (Node + Express)
// npm i express cors
// node src/index.js

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { SERVER, HTTP_STATUS, TIME } = require('./constants')
const { randomUUID } = require('crypto')

const app = express()
app.use(cors())
app.use(express.json())

// ---- Load flow config ----
const FLOW_PATH = path.resolve(__dirname, '../../docs/sample-flow.json')
let FLOW = JSON.parse(fs.readFileSync(FLOW_PATH, 'utf-8'))

// ---- In-memory store (replace with DB later) ----
/**
 * request = {
 *   id, type, createdAt, createdBy,
 *   status: 'PENDING'|'APPROVED'|'REJECTED',
 *   currentStepIndex, steps[], history[], slaTimerId?
 * }
 */
const REQUESTS = new Map()

// ---- Helpers ----
function nowISO() {
  return new Date().toISOString()
}

function currentStep(reqObj) {
  if (reqObj.currentStepIndex == null) return null
  return reqObj.steps[reqObj.currentStepIndex] || null
}

function isFinalStep(reqObj) {
  return reqObj.currentStepIndex >= reqObj.steps.length - 1
}

function scheduleSLA(reqObj) {
  // Clear any existing
  if (reqObj.slaTimerId) {
    clearTimeout(reqObj.slaTimerId)
    reqObj.slaTimerId = null
  }

  const step = currentStep(reqObj)
  if (!step) return

  const hours = step.slaHours || 0
  if (!hours) return

  reqObj.slaTimerId = setTimeout(() => {
    // SLA timeout -> escalate
    reqObj.history.push({
      at: nowISO(),
      actor: 'SYSTEM',
      action: 'SLA_TIMEOUT',
      detail: `No action within ${hours}h at step ${step.stepId}. Escalating.`
    })

    // Escalation rule (simple): reassign approver role to "Admin" if defined
    if (step.onTimeout?.escalateTo) {
      step.escalatedTo = step.onTimeout.escalateTo
      reqObj.history.push({
        at: nowISO(),
        actor: 'SYSTEM',
        action: 'ESCALATE',
        detail: `Escalated to role ${step.onTimeout.escalateTo}`
      })
      notify(['Admin'], `Request ${reqObj.id} escalated due to SLA breach.`)
    }
  }, hours * TIME.HOUR) // convert hours to ms
}

function notify(recipients, message) {
  // stub notification (replace with email/Slack later)
  console.log('[NOTIFY]', recipients, '-', message)
}

// ---- API ----

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: nowISO() })
})

// Submit a request
app.post('/api/requests', (req, res) => {
  const { type = FLOW.flowId, createdBy = 'employee@example.com', payload = {} } = req.body || {}

  const steps = []
  // Build steps array from FLOW, honoring required flag
  for (const s of FLOW.steps) {
    if (s.required === false) {
      // treat as optional: include only when explicitly requested by payload.twoStep === true
      if (payload?.twoStep) steps.push(structuredClone(s))
    } else {
      steps.push(structuredClone(s))
    }
  }

  if (steps.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No steps configured for this request (check flow config).' })
  }

  const id = randomUUID()
  const reqObj = {
    id,
    type,
    createdAt: nowISO(),
    createdBy,
    payload,
    status: 'PENDING',
    currentStepIndex: 0,
    steps,
    history: [
      { at: nowISO(), actor: createdBy, action: 'SUBMIT', detail: `twoStep=${!!payload.twoStep}` }
    ]
  }

  REQUESTS.set(id, reqObj)

  // Notify first approver(s)
  const first = currentStep(reqObj)
  const notifyRoles = [first.escalatedTo || first.role]
  notify(notifyRoles, `New request ${id} awaiting ${notifyRoles.join(', ')} action.`)

  // Schedule SLA timer
  scheduleSLA(reqObj)

  res.status(HTTP_STATUS.CREATED).json({ id, status: reqObj.status, currentStep: first })
})

// Approve / Reject current step
app.post('/api/requests/:id/action', (req, res) => {
  const { id } = req.params
  const { actor = 'manager@example.com', role = 'Manager', action, comment = '' } = req.body || {}

  const reqObj = REQUESTS.get(id)
  if (!reqObj) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Not found' })

  if (reqObj.status !== 'PENDING') {
    return res.status(HTTP_STATUS.CONFLICT).json({ error: `Request is already ${reqObj.status}` })
  }

  const step = currentStep(reqObj)
  if (!step) return res.status(HTTP_STATUS.CONFLICT).json({ error: 'No active step' })

  // Authorization check (very simple: role must match expected, or escalatedTo)
  const expectedRole = step.escalatedTo || step.role
  if (role !== expectedRole) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: `Role ${role} cannot act on step requiring ${expectedRole}` })
  }

  if (!step.actions.includes(action)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: `Invalid action. Allowed: ${step.actions.join(', ')}` })
  }

  // Record action
  reqObj.history.push({
    at: nowISO(),
    actor,
    role,
    action: action.toUpperCase(),
    stepId: step.stepId,
    comment
  })

  // Clear SLA on action
  if (reqObj.slaTimerId) {
    clearTimeout(reqObj.slaTimerId)
    reqObj.slaTimerId = null
  }

  if (action === 'reject') {
    reqObj.status = 'REJECTED'
    notify(['Employee', 'Manager'], `Request ${id} rejected at step ${step.stepId}.`)
    return res.json({ id, status: reqObj.status })
  }

  // Approve path
  if (isFinalStep(reqObj)) {
    reqObj.status = 'APPROVED'
    notify(['Employee'], `Request ${id} approved.`)
    return res.json({ id, status: reqObj.status })
  } else {
    // advance to next step
    reqObj.currentStepIndex += 1
    const next = currentStep(reqObj)
    notify([next.role], `Request ${id} awaiting ${next.role} action.`)
    scheduleSLA(reqObj)
    return res.json({
      id,
      status: reqObj.status,
      currentStep: next
    })
  }
})

// Get one
app.get('/api/requests/:id', (req, res) => {
  const reqObj = REQUESTS.get(req.params.id)
  if (!reqObj) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Not found' })
  res.json(reqObj)
})

// List (basic filters)
app.get('/api/requests', (req, res) => {
  const { status, createdBy } = req.query
  let arr = Array.from(REQUESTS.values())
  if (status) arr = arr.filter(r => r.status === status)
  if (createdBy) arr = arr.filter(r => r.createdBy === createdBy)
  res.json(arr)
})

// Admin: reload flow config at runtime (for demo)
app.post('/api/admin/reload-flow', (_req, res) => {
  FLOW = JSON.parse(fs.readFileSync(FLOW_PATH, 'utf-8'))
  res.json({ ok: true, message: 'Flow reloaded', flowId: FLOW.flowId, steps: FLOW.steps.length })
})

// Start server
const PORT = process.env.PORT || SERVER.DEFAULT_PORT
app.listen(PORT, () => {
  console.log(`ProcessPilot API listening on http://localhost:${PORT}`)
})
