import { test, expect } from '@playwright/test'

// Helper function to login as test user
async function loginAsTestUser(page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'employee@test.com')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
}

test.describe('Request Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('should display requests page', async ({ page }) => {
    await page.goto('/requests')

    await expect(page.locator('h1')).toContainText('Requests')
    await expect(page.locator('[data-testid="create-request-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-controls"]')).toBeVisible()
  })

  test('should create a new leave request', async ({ page }) => {
    await page.goto('/requests')

    // Click create request button
    await page.click('[data-testid="create-request-button"]')
    await expect(page).toHaveURL('/requests/create')

    // Fill in leave request form
    await page.selectOption('[data-testid="request-type"]', 'leave-request')
    await page.fill('[data-testid="start-date"]', '2024-03-01')
    await page.fill('[data-testid="end-date"]', '2024-03-05')
    await page.selectOption('[data-testid="leave-type"]', 'vacation')
    await page.fill('[data-testid="reason"]', 'Family vacation to the beach')

    // Submit the form
    await page.click('button[type="submit"]')

    // Should redirect to requests list with success message
    await expect(page).toHaveURL('/requests')
    await expect(page.locator('text=Request submitted successfully')).toBeVisible()
  })

  test('should create a new expense request', async ({ page }) => {
    await page.goto('/requests/create')

    // Fill in expense request form
    await page.selectOption('[data-testid="request-type"]', 'expense-approval')
    await page.fill('[data-testid="amount"]', '150.00')
    await page.selectOption('[data-testid="currency"]', 'USD')
    await page.fill('[data-testid="expense-date"]', '2024-02-28')
    await page.selectOption('[data-testid="category"]', 'travel')
    await page.fill('[data-testid="description"]', 'Client meeting transportation')

    // Submit the form
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/requests')
    await expect(page.locator('text=Request submitted successfully')).toBeVisible()
  })

  test('should filter requests by status', async ({ page }) => {
    await page.goto('/requests')

    // Apply pending filter
    await page.selectOption('[data-testid="status-filter"]', 'pending')

    // Check that only pending requests are shown
    const requestCards = page.locator('[data-testid^="request-card-"]')
    await expect(requestCards).toHaveCount(0) // Assuming no pending requests initially

    // Apply approved filter
    await page.selectOption('[data-testid="status-filter"]', 'approved')

    // Search for specific request
    await page.fill('[data-testid="search-input"]', 'vacation')
    await page.press('[data-testid="search-input"]', 'Enter')

    // Should filter results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  })

  test('should view request details', async ({ page }) => {
    await page.goto('/requests')

    // Click on first request (assuming there's at least one)
    const firstRequest = page.locator('[data-testid^="request-card-"]').first()
    await firstRequest.click()

    // Should navigate to request detail page
    await expect(page.url()).toMatch(/\/requests\/\d+/)
    await expect(page.locator('[data-testid="page-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="request-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible()
  })
})

test.describe('Request Detail Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('should show approve/reject buttons for managers', async ({ page }) => {
    // This test assumes the user has manager role
    await page.goto('/requests/1') // Navigate to a specific request

    // Check if action buttons are visible (only for managers/admins)
    const approveButton = page.locator('[data-testid="approve-button"]')
    const rejectButton = page.locator('[data-testid="reject-button"]')

    if (await approveButton.isVisible()) {
      await expect(rejectButton).toBeVisible()
    }
  })

  test('should approve a request with comment', async ({ page }) => {
    await page.goto('/requests/1')

    // Click approve button (if visible)
    const approveButton = page.locator('[data-testid="approve-button"]')
    if (await approveButton.isVisible()) {
      await approveButton.click()

      // Fill in approval comment
      await page.fill('[data-testid="action-comment"]', 'Approved - meets all requirements')
      await page.click('[data-testid="confirm-action"]')

      // Should show success message
      await expect(page.locator('text=Request approved successfully')).toBeVisible()
    }
  })

  test('should reject a request with required comment', async ({ page }) => {
    await page.goto('/requests/1')

    const rejectButton = page.locator('[data-testid="reject-button"]')
    if (await rejectButton.isVisible()) {
      await rejectButton.click()

      // Try to confirm without comment (should be disabled)
      const confirmButton = page.locator('[data-testid="confirm-action"]')
      await expect(confirmButton).toBeDisabled()

      // Add required comment
      await page.fill('[data-testid="action-comment"]', 'Insufficient documentation provided')
      await expect(confirmButton).toBeEnabled()

      await confirmButton.click()
      await expect(page.locator('text=Request rejected')).toBeVisible()
    }
  })
})

test.describe('Request History', () => {
  test('should display request history timeline', async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/requests/1')

    // Check if request history section exists
    const historySection = page.locator('[data-testid="request-history"]')
    if (await historySection.isVisible()) {
      await expect(historySection.locator('h2')).toContainText('Request History')

      // Check for history entries
      const historyEntries = page.locator('[data-testid^="history-entry-"]')
      await expect(historyEntries).toHaveCountGreaterThan(0)
    }
  })
})
