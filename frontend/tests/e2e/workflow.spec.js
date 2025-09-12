import { test, expect } from '@playwright/test'
import {
  loginAs,
  createTestRequest,
  performRequestAction,
  navigateToRequest,
  waitForPageLoad
} from './utils/test-helpers.js'

test.describe('Complete Workflow Journey', () => {
  let requestId

  test('should complete full request lifecycle: submit → approve → final approval', async ({ page }) => {
    // Step 1: Employee submits request
    await loginAs(page, 'employee')
    await createTestRequest(page, 'leaveRequest')

    // Get the latest request ID from the requests list
    await page.goto('/requests')
    await waitForPageLoad(page)
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await expect(firstRequestCard).toBeVisible()

    // Extract request ID from the URL when clicking the card
    await firstRequestCard.click()
    await page.waitForURL(/\/requests\/(\d+)/)
    requestId = page.url().match(/\/requests\/(\d+)/)[1]

    // Verify initial status
    await expect(page.locator('[data-testid="request-status"]')).toHaveText('Pending')
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible()

    // Step 2: Manager reviews and approves
    await loginAs(page, 'manager')
    await navigateToRequest(page, requestId)

    // Verify manager can see action buttons
    await expect(page.locator('[data-testid="approve-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="reject-button"]')).toBeVisible()

    // Approve with comment
    await performRequestAction(page, 'approve', 'Approved by manager - adequate leave balance')

    // Verify status change
    await expect(page.locator('[data-testid="request-status"]')).toHaveText('In Progress')

    // Check history entry was added
    const historySection = page.locator('[data-testid="request-history"]')
    await expect(historySection).toBeVisible()
    await expect(historySection.locator('text=Approved by manager')).toBeVisible()

    // Step 3: Admin final approval
    await loginAs(page, 'admin')
    await navigateToRequest(page, requestId)

    // Final approval
    await performRequestAction(page, 'approve', 'Final approval - request completed')

    // Verify final status
    await expect(page.locator('[data-testid="request-status"]')).toHaveText('Approved')

    // Verify workflow completion
    await expect(page.locator('[data-testid="workflow-complete"]')).toBeVisible()

    // Check complete history
    await expect(historySection.locator('[data-testid^="history-entry-"]')).toHaveCount(3) // Submit + 2 approvals
  })

  test('should handle request rejection at manager level', async ({ page }) => {
    // Employee submits expense request
    await loginAs(page, 'employee')
    await createTestRequest(page, 'expenseRequest')

    // Get request ID
    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()
    requestId = page.url().match(/\/requests\/(\d+)/)[1]

    // Manager rejects request
    await loginAs(page, 'manager')
    await navigateToRequest(page, requestId)

    // Reject with detailed comment
    await performRequestAction(page, 'reject', 'Insufficient documentation - please provide receipts and detailed breakdown')

    // Verify rejection
    await expect(page.locator('[data-testid="request-status"]')).toHaveText('Rejected')
    await expect(page.locator('[data-testid="rejection-reason"]')).toContainText('Insufficient documentation')

    // Verify employee can see rejection
    await loginAs(page, 'employee')
    await navigateToRequest(page, requestId)

    await expect(page.locator('[data-testid="request-status"]')).toHaveText('Rejected')
    await expect(page.locator('[data-testid="rejection-details"]')).toBeVisible()

    // Employee should not see action buttons
    await expect(page.locator('[data-testid="approve-button"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="reject-button"]')).not.toBeVisible()
  })

  test('should handle escalation workflow', async ({ page }) => {
    // Create high-priority equipment request
    await loginAs(page, 'employee')
    await createTestRequest(page, 'equipmentRequest')

    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()
    requestId = page.url().match(/\/requests\/(\d+)/)[1]

    // Check for escalation indicators (high urgency)
    await expect(page.locator('[data-testid="urgency-indicator"]')).toHaveClass(/high|urgent/)

    // Admin can directly approve high-priority requests
    await loginAs(page, 'admin')
    await navigateToRequest(page, requestId)

    await expect(page.locator('[data-testid="escalation-notice"]')).toBeVisible()
    await performRequestAction(page, 'approve', 'Urgent request - approved directly by admin')

    await expect(page.locator('[data-testid="request-status"]')).toHaveText('Approved')
  })

  test('should prevent unauthorized access to request actions', async ({ page }) => {
    // Create request as employee
    await loginAs(page, 'employee')
    await createTestRequest(page, 'leaveRequest')

    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()
    requestId = page.url().match(/\/requests\/(\d+)/)[1]

    // Employee should not see action buttons on their own request
    await expect(page.locator('[data-testid="approve-button"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="reject-button"]')).not.toBeVisible()

    // But should see edit/cancel options (if request is still pending)
    await expect(page.locator('[data-testid="edit-request-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="cancel-request-button"]')).toBeVisible()

    // Try accessing another user's request (should redirect or show error)
    await page.goto('/requests/999') // Non-existent or unauthorized request

    // Should either redirect to 404 or show access denied
    await expect(page.locator('text=Request not found')).toBeVisible()
  })

  test('should show request details across different user roles', async ({ page }) => {
    // Create request as employee
    await loginAs(page, 'employee')
    await createTestRequest(page, 'leaveRequest')

    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()
    requestId = page.url().match(/\/requests\/(\d+)/)[1]

    // Employee view - should see full request details but no actions
    await expect(page.locator('[data-testid="request-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="request-payload"]')).toBeVisible()
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible()

    // Manager view - should see same details plus action buttons
    await loginAs(page, 'manager')
    await navigateToRequest(page, requestId)

    await expect(page.locator('[data-testid="request-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="approve-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="reject-button"]')).toBeVisible()

    // Admin view - should see all details plus admin actions
    await loginAs(page, 'admin')
    await navigateToRequest(page, requestId)

    await expect(page.locator('[data-testid="request-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="approve-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="admin-actions"]')).toBeVisible()
  })
})

test.describe('Workflow Progress Visualization', () => {
  test('should display accurate workflow progress', async ({ page }) => {
    // Submit request and check initial progress
    await loginAs(page, 'employee')
    await createTestRequest(page, 'leaveRequest')

    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()

    // Check workflow steps are displayed
    const workflowSteps = page.locator('[data-testid="workflow-step"]')
    await expect(workflowSteps).toHaveCountGreaterThan(0)

    // First step should be current/active
    await expect(workflowSteps.first()).toHaveClass(/current|active/)

    // Future steps should be inactive
    const futureSteps = workflowSteps.nth(1)
    if (await futureSteps.isVisible()) {
      await expect(futureSteps).toHaveClass(/inactive|pending/)
    }
  })

  test('should update progress after approval', async ({ page }) => {
    // Create and approve request
    await loginAs(page, 'employee')
    await createTestRequest(page, 'leaveRequest')

    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()
    const requestId = page.url().match(/\/requests\/(\d+)/)[1]

    // Manager approves
    await loginAs(page, 'manager')
    await navigateToRequest(page, requestId)
    await performRequestAction(page, 'approve', 'Manager approval')

    // Check progress updated
    const workflowSteps = page.locator('[data-testid="workflow-step"]')
    const completedSteps = workflowSteps.locator('.completed, .approved')
    await expect(completedSteps).toHaveCountGreaterThan(0)

    // Progress bar should reflect completion
    const progressBar = page.locator('[data-testid="progress-bar"]')
    if (await progressBar.isVisible()) {
      const progress = await progressBar.getAttribute('aria-valuenow')
      expect(parseInt(progress)).toBeGreaterThan(0)
    }
  })
})

test.describe('Request History and Audit Trail', () => {
  test('should maintain complete audit trail', async ({ page }) => {
    // Submit request
    await loginAs(page, 'employee')
    await createTestRequest(page, 'expenseRequest')

    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()
    const requestId = page.url().match(/\/requests\/(\d+)/)[1]

    // Verify initial history entry
    const historySection = page.locator('[data-testid="request-history"]')
    await expect(historySection).toBeVisible()
    await expect(historySection.locator('[data-testid^="history-entry-"]')).toHaveCount(1)

    // Manager adds comment without action
    await loginAs(page, 'manager')
    await navigateToRequest(page, requestId)

    const addCommentButton = page.locator('[data-testid="add-comment-button"]')
    if (await addCommentButton.isVisible()) {
      await addCommentButton.click()
      await page.fill('[data-testid="comment-text"]', 'Requesting additional documentation')
      await page.click('[data-testid="submit-comment"]')

      // Verify comment added to history
      await expect(historySection.locator('[data-testid^="history-entry-"]')).toHaveCount(2)
    }

    // Approve request
    await performRequestAction(page, 'approve', 'Manager approval with conditions')

    // Final history should have all entries
    await expect(historySection.locator('[data-testid^="history-entry-"]')).toHaveCountGreaterThan(2)

    // Each entry should have timestamp and user info
    const historyEntries = historySection.locator('[data-testid^="history-entry-"]')
    const firstEntry = historyEntries.first()

    await expect(firstEntry.locator('[data-testid="entry-timestamp"]')).toBeVisible()
    await expect(firstEntry.locator('[data-testid="entry-user"]')).toBeVisible()
    await expect(firstEntry.locator('[data-testid="entry-action"]')).toBeVisible()
  })

  test('should show different history entry types', async ({ page }) => {
    await loginAs(page, 'employee')
    await createTestRequest(page, 'leaveRequest')

    await page.goto('/requests')
    const firstRequestCard = page.locator('[data-testid^="request-card-"]').first()
    await firstRequestCard.click()
    const requestId = page.url().match(/\/requests\/(\d+)/)[1]

    const historySection = page.locator('[data-testid="request-history"]')

    // Verify different entry types have different styling
    const submissionEntry = historySection.locator('[data-testid="history-entry-submitted"]')
    if (await submissionEntry.isVisible()) {
      await expect(submissionEntry).toHaveClass(/submission|created/)
    }

    // Add approval and check its styling
    await loginAs(page, 'manager')
    await navigateToRequest(page, requestId)
    await performRequestAction(page, 'approve', 'Standard approval')

    const approvalEntry = historySection.locator('[data-testid^="history-entry-approved"]')
    await expect(approvalEntry).toHaveClass(/approval|approved/)
  })
})
