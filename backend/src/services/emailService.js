const nodemailer = require('nodemailer')
const config = require('../config')
const { logger } = require('../utils/logger')
const { EMAIL } = require('../constants')

class EmailService {
  constructor() {
    this.transporter = null
    this.isConfigured = false
    this.initializeTransporter()
  }

  initializeTransporter() {
    // Only initialize if SMTP configuration is provided
    if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
      logger.warn('Email service not configured - SMTP settings missing', {
        hasHost: !!config.smtp.host,
        hasUser: !!config.smtp.user,
        hasPass: !!config.smtp.pass
      })
      return
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465, // true for 465, false for other ports
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates in development
        }
      })

      this.isConfigured = true
      logger.info('Email service initialized successfully', {
        host: config.smtp.host,
        port: config.smtp.port,
        user: config.smtp.user.replace(/(.{3}).*(@.*)/, '$1***$2') // Mask email for logging
      })
    } catch (error) {
      logger.error('Failed to initialize email service', {
        error: error.message,
        stack: error.stack
      })
    }
  }

  async verifyConnection() {
    if (!this.isConfigured || !this.transporter) {
      return { success: false, error: 'Email service not configured' }
    }

    try {
      await this.transporter.verify()
      logger.info('Email service connection verified')
      return { success: true }
    } catch (error) {
      logger.error('Email service connection verification failed', {
        error: error.message,
        stack: error.stack
      })
      return { success: false, error: error.message }
    }
  }

  async sendEmail(to, subject, text, html = null) {
    if (!this.isConfigured) {
      logger.warn('Attempted to send email but service not configured', {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject
      })
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const mailOptions = {
        from: `"ProcessPilot" <${config.smtp.fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>')
      }

      const info = await this.transporter.sendMail(mailOptions)

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject,
        accepted: info.accepted,
        rejected: info.rejected
      })

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      }
    } catch (error) {
      logger.error('Failed to send email', {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        error: error.message,
        stack: error.stack
      })
      return { success: false, error: error.message }
    }
  }

  // Notification Templates

  async sendRequestSubmittedNotification(request, user, workflow) {
    const subject = `New Request Submitted: ${request.title}`
    const text = `
Dear Team,

A new ${workflow.name} request has been submitted and requires your attention.

Request Details:
- Title: ${request.title}
- Type: ${request.type}
- Submitted by: ${(user.first_name || user.firstName)} ${(user.last_name || user.lastName)} (${user.email})
- Department: ${user.department || 'Not specified'}
- Submitted on: ${request.created_at || request.createdAt}

Description:
${request.description || 'No description provided'}

Please log in to ProcessPilot to review and take action on this request.

Best regards,
ProcessPilot System
    `.trim()

    // Get managers/approvers based on workflow
    const approvers = await this.getWorkflowApprovers(workflow, request)
    const approverEmails = approvers.map(approver => approver.email)

    if (approverEmails.length === 0) {
      logger.warn('No approvers found for workflow', {
        workflowId: workflow.id,
        requestId: request.id
      })
      return { success: false, error: 'No approvers found' }
    }

    return await this.sendEmail(approverEmails, subject, text)
  }

  async sendRequestApprovedNotification(request, user, approver, workflow) {
    const subject = `Request Approved: ${request.title}`
    const text = `
Dear ${(user.first_name || user.firstName)} ${(user.last_name || user.lastName)},

Your ${workflow.name} request has been approved.

Request Details:
- Title: ${request.title}
- Type: ${request.type}
- Approved by: ${(approver.first_name || approver.firstName)} ${(approver.last_name || approver.lastName)}
- Approved on: ${new Date().toISOString()}

${request.comment ? `Approval Comment: ${request.comment}` : ''}

You can view the full request details in ProcessPilot.

Best regards,
ProcessPilot System
    `.trim()

    return await this.sendEmail(user.email, subject, text)
  }

  async sendRequestRejectedNotification(request, user, approver, workflow, comment = null) {
    const subject = `Request Rejected: ${request.title}`
    const text = `
Dear ${(user.first_name || user.firstName)} ${(user.last_name || user.lastName)},

Your ${workflow.name} request has been rejected.

Request Details:
- Title: ${request.title}
- Type: ${request.type}
- Rejected by: ${(approver.first_name || approver.firstName)} ${(approver.last_name || approver.lastName)}
- Rejected on: ${new Date().toISOString()}

${comment ? `Rejection Reason: ${comment}` : 'No reason provided'}

Please review the feedback and submit a new request if necessary.

Best regards,
ProcessPilot System
    `.trim()

    return await this.sendEmail(user.email, subject, text)
  }

  async sendRequestEscalatedNotification(request, user, workflow, escalationLevel) {
    const subject = `Request Escalated: ${request.title}`
    const text = `
Dear Team,

A ${workflow.name} request has been escalated due to SLA breach.

Request Details:
- Title: ${request.title}
- Type: ${request.type}
- Submitted by: ${(user.first_name || user.firstName)} ${(user.last_name || user.lastName)} (${user.email})
- Submitted on: ${request.created_at || request.createdAt}
- Escalation Level: ${escalationLevel}

This request requires immediate attention.

Please log in to ProcessPilot to review and take action.

Best regards,
ProcessPilot System
    `.trim()

    // Get escalation approvers (admins, senior managers)
    const { db } = require('../database/connection')
    const escalationApprovers = await db('users')
      .select('email', 'first_name', 'last_name')
      .where('role', 'admin')
      .orWhere(function () {
        this.where('role', 'manager')
          .where('department', user.department)
      })
      .where('is_active', true)

    const approverEmails = escalationApprovers.map(approver => approver.email)

    if (approverEmails.length === 0) {
      logger.warn('No escalation approvers found', {
        requestId: request.id,
        department: user.department
      })
      return { success: false, error: 'No escalation approvers found' }
    }

    return await this.sendEmail(approverEmails, subject, text)
  }

  async sendPasswordResetNotification(user, resetToken) {
    const subject = 'Password Reset Request - ProcessPilot'
    const text = `
Dear ${user.first_name} ${user.last_name},

You have requested to reset your password for ProcessPilot.

Your password reset code is: ${resetToken}

This code will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email.

Best regards,
ProcessPilot System
    `.trim()

    return await this.sendEmail(user.email, subject, text)
  }

  async sendWelcomeNotification(user, temporaryPassword = null) {
    const subject = 'Welcome to ProcessPilot'
    const text = `
Dear ${user.first_name} ${user.last_name},

Welcome to ProcessPilot! Your account has been created.

Account Details:
- Email: ${user.email}
- Role: ${user.role}
- Department: ${user.department || 'Not specified'}

${temporaryPassword ? `Your temporary password is: ${temporaryPassword}\n\nPlease change your password after your first login.` : 'Please contact your administrator for login credentials.'}

You can access ProcessPilot at: ${config.app.frontendUrl || 'your ProcessPilot instance'}

Best regards,
ProcessPilot System
    `.trim()

    return await this.sendEmail(user.email, subject, text)
  }

  // Helper Methods

  async getWorkflowApprovers(workflow, request) {
    const { db } = require('../database/connection')

    // Get current step from workflow
    const currentStep = workflow.steps[(request.current_step_index || request.currentStepIndex) || 0]
    if (!currentStep) {
      return []
    }

    // Find users with the required role for this step
    let query = db('users')
      .select('email', 'first_name', 'last_name', 'role', 'department')
      .where('role', currentStep.role)
      .where('is_active', true)

    // If step requires same department, filter by submitter's department
    if (currentStep.sameDepartment) {
      const submitter = await db('users').where('id', (request.user_id || request.createdBy)).first()
      if (submitter && submitter.department) {
        query = query.where('department', submitter.department)
      }
    }

    return await query
  }

  // Batch send for multiple notifications
  async sendBulkNotifications(notifications) {
    const results = []

    for (const notification of notifications) {
      const result = await this.sendEmail(
        notification.to,
        notification.subject,
        notification.text,
        notification.html
      )

      results.push({
        to: notification.to,
        subject: notification.subject,
        ...result
      })

      // Add small delay to avoid overwhelming the SMTP server
      await new Promise(resolve => setTimeout(resolve, EMAIL.RETRY_DELAY))
    }

    return results
  }
}

// Export singleton instance
const emailService = new EmailService()
module.exports = emailService
