import { test, expect } from '@playwright/test'
import {
  loginAs,
  waitForPageLoad,
  checkAdminAccess,
  mockApiResponse,
  generateTestData
} from './utils/test-helpers.js'

test.describe('Admin Dashboard and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('should display comprehensive dashboard metrics', async ({ page }) => {
    await page.goto('/analytics')
    await waitForPageLoad(page)

    // Check main dashboard elements
    await expect(page.locator('h1')).toContainText('Analytics Dashboard')

    // Verify key metrics cards
    const metricsCards = [
      '[data-testid="total-requests-card"]',
      '[data-testid="pending-requests-card"]',
      '[data-testid="approved-requests-card"]',
      '[data-testid="average-processing-time-card"]'
    ]

    for (const cardSelector of metricsCards) {
      const card = page.locator(cardSelector)
      await expect(card).toBeVisible()
      await expect(card.locator('[data-testid="metric-value"]')).toBeVisible()
      await expect(card.locator('[data-testid="metric-label"]')).toBeVisible()
    }

    // Check charts are rendered
    await expect(page.locator('[data-testid="requests-trend-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="status-distribution-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="type-breakdown-chart"]')).toBeVisible()
  })

  test('should filter analytics by date range', async ({ page }) => {
    await page.goto('/analytics')
    await waitForPageLoad(page)

    // Apply date filter
    await page.click('[data-testid="date-range-picker"]')
    await page.fill('[data-testid="start-date"]', '2024-01-01')
    await page.fill('[data-testid="end-date"]', '2024-03-31')
    await page.click('[data-testid="apply-filter"]')

    await waitForPageLoad(page)

    // Verify filter is applied
    await expect(page.locator('[data-testid="active-filter"]')).toContainText('Jan 1 - Mar 31, 2024')

    // Metrics should update
    const totalRequestsCard = page.locator('[data-testid="total-requests-card"]')
    await expect(totalRequestsCard.locator('[data-testid="metric-value"]')).toBeVisible()
  })

  test('should filter analytics by department (for admin)', async ({ page }) => {
    await page.goto('/analytics')
    await waitForPageLoad(page)

    // Admin should see department filter
    const departmentFilter = page.locator('[data-testid="department-filter"]')
    await expect(departmentFilter).toBeVisible()

    // Apply department filter
    await page.selectOption('[data-testid="department-filter"]', 'IT')
    await waitForPageLoad(page)

    // Verify filter is applied
    await expect(page.locator('[data-testid="active-filter"]')).toContainText('IT')

    // Charts should update with filtered data
    await expect(page.locator('[data-testid="requests-trend-chart"]')).toBeVisible()
  })

  test('should export analytics data', async ({ page }) => {
    await page.goto('/analytics')
    await waitForPageLoad(page)

    // Click export button
    const exportButton = page.locator('[data-testid="export-button"]')
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/analytics.*\.(csv|xlsx)/)
    }
  })
})

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('should display users list with proper admin access', async ({ page }) => {
    await page.goto('/users')
    await waitForPageLoad(page)

    // Verify admin access
    await expect(page.locator('h1')).toContainText('User Management')
    await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible()

    // Check users table
    const usersTable = page.locator('[data-testid="users-table"]')
    await expect(usersTable).toBeVisible()

    // Verify table headers
    const expectedHeaders = ['Name', 'Email', 'Role', 'Department', 'Status', 'Actions']
    for (const header of expectedHeaders) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible()
    }

    // Check that user rows are displayed
    await expect(page.locator('[data-testid^="user-row-"]')).toHaveCountGreaterThan(0)
  })

  test('should create new user successfully', async ({ page }) => {
    await page.goto('/users')

    // Click create user button
    await page.click('[data-testid="create-user-button"]')

    // Fill user creation form
    await page.fill('[data-testid="first-name"]', 'Test')
    await page.fill('[data-testid="last-name"]', 'User')
    await page.fill('[data-testid="email"]', 'testuser@example.com')
    await page.selectOption('[data-testid="role"]', 'employee')
    await page.selectOption('[data-testid="department"]', 'IT')
    await page.fill('[data-testid="password"]', 'TempPassword123!')

    // Submit form
    await page.click('[data-testid="submit-user"]')

    // Verify success
    await expect(page.locator('.toast-success, [data-testid="success-message"]')).toBeVisible()

    // Should return to users list with new user
    await expect(page).toHaveURL('/users')
    await expect(page.locator('text=testuser@example.com')).toBeVisible()
  })

  test('should validate user creation form', async ({ page }) => {
    await page.goto('/users')
    await page.click('[data-testid="create-user-button"]')

    // Try to submit empty form
    await page.click('[data-testid="submit-user"]')

    // Check validation errors
    await expect(page.locator('text=First name is required')).toBeVisible()
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Role is required')).toBeVisible()

    // Test email validation
    await page.fill('[data-testid="email"]', 'invalid-email')
    await page.click('[data-testid="submit-user"]')
    await expect(page.locator('text=Invalid email format')).toBeVisible()

    // Test password validation
    await page.fill('[data-testid="password"]', '123')
    await page.click('[data-testid="submit-user"]')
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
  })

  test('should edit user details', async ({ page }) => {
    await page.goto('/users')
    await waitForPageLoad(page)

    // Click edit button on first user
    const firstUserEdit = page.locator('[data-testid^="edit-user-"]').first()
    await firstUserEdit.click()

    // Modify user details
    await page.fill('[data-testid="first-name"]', 'Updated')
    await page.fill('[data-testid="last-name"]', 'Name')
    await page.selectOption('[data-testid="department"]', 'HR')

    // Save changes
    await page.click('[data-testid="save-user"]')

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible()
    await expect(page.locator('text=Updated Name')).toBeVisible()
  })

  test('should deactivate and reactivate users', async ({ page }) => {
    await page.goto('/users')
    await waitForPageLoad(page)

    // Find an active user and deactivate
    const activeUserActions = page.locator('[data-testid^="user-actions-"]').first()
    await activeUserActions.click()
    await page.click('[data-testid="deactivate-user"]')

    // Confirm deactivation
    await page.click('[data-testid="confirm-deactivate"]')

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible()

    // User should show as inactive
    await expect(page.locator('[data-testid="user-status-inactive"]')).toBeVisible()

    // Test reactivation
    await activeUserActions.click()
    await page.click('[data-testid="activate-user"]')
    await page.click('[data-testid="confirm-activate"]')

    await expect(page.locator('[data-testid="user-status-active"]')).toBeVisible()
  })

  test('should filter users by role and department', async ({ page }) => {
    await page.goto('/users')
    await waitForPageLoad(page)

    // Apply role filter
    await page.selectOption('[data-testid="role-filter"]', 'manager')
    await waitForPageLoad(page)

    // Verify only managers are shown
    const userRoles = page.locator('[data-testid^="user-role-"]')
    const roleCount = await userRoles.count()
    if (roleCount > 0) {
      for (let i = 0; i < roleCount; i++) {
        const role = userRoles.nth(i)
        await expect(role).toHaveText('manager')
      }
    }

    // Apply department filter
    await page.selectOption('[data-testid="department-filter"]', 'IT')
    await waitForPageLoad(page)

    // Search for specific user
    await page.fill('[data-testid="user-search"]', 'admin')
    await page.press('[data-testid="user-search"]', 'Enter')
    await waitForPageLoad(page)

    // Verify filtered results
    await expect(page.locator('[data-testid="search-results-count"]')).toBeVisible()
  })
})

test.describe('Workflow Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('should display workflows list', async ({ page }) => {
    await page.goto('/workflows')
    await waitForPageLoad(page)

    await expect(page.locator('h1')).toContainText('Workflow Management')
    await expect(page.locator('[data-testid="create-workflow-button"]')).toBeVisible()

    // Check workflows table
    const workflowsTable = page.locator('[data-testid="workflows-table"]')
    await expect(workflowsTable).toBeVisible()

    // Verify table headers
    const expectedHeaders = ['Name', 'Description', 'Steps', 'Status', 'Actions']
    for (const header of expectedHeaders) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible()
    }
  })

  test('should create new workflow', async ({ page }) => {
    await page.goto('/workflows')

    await page.click('[data-testid="create-workflow-button"]')

    // Fill workflow form
    await page.fill('[data-testid="workflow-name"]', 'E2E Test Workflow')
    await page.fill('[data-testid="workflow-description"]', 'Automated test workflow for E2E testing')

    // Add workflow steps
    await page.click('[data-testid="add-step-button"]')
    await page.selectOption('[data-testid="step-0-role"]', 'manager')
    await page.fill('[data-testid="step-0-sla"]', '24')

    await page.click('[data-testid="add-step-button"]')
    await page.selectOption('[data-testid="step-1-role"]', 'admin')
    await page.fill('[data-testid="step-1-sla"]', '48')

    // Set workflow conditions
    await page.selectOption('[data-testid="request-types"]', 'leave-request')

    // Submit workflow
    await page.click('[data-testid="save-workflow"]')

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible()
    await expect(page).toHaveURL('/workflows')
    await expect(page.locator('text=E2E Test Workflow')).toBeVisible()
  })

  test('should edit workflow configuration', async ({ page }) => {
    await page.goto('/workflows')
    await waitForPageLoad(page)

    // Edit first workflow
    const editButton = page.locator('[data-testid^="edit-workflow-"]').first()
    await editButton.click()

    // Modify workflow
    await page.fill('[data-testid="workflow-description"]', 'Updated workflow description')

    // Modify first step
    await page.fill('[data-testid="step-0-sla"]', '48')

    // Save changes
    await page.click('[data-testid="save-workflow"]')

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible()
    await expect(page.locator('text=Updated workflow description')).toBeVisible()
  })

  test('should activate and deactivate workflows', async ({ page }) => {
    await page.goto('/workflows')
    await waitForPageLoad(page)

    // Find workflow toggle
    const workflowToggle = page.locator('[data-testid^="workflow-toggle-"]').first()
    const isActive = await workflowToggle.isChecked()

    // Toggle workflow status
    await workflowToggle.click()

    // Verify status changed
    if (isActive) {
      await expect(page.locator('[data-testid="workflow-status-inactive"]')).toBeVisible()
    } else {
      await expect(page.locator('[data-testid="workflow-status-active"]')).toBeVisible()
    }

    await expect(page.locator('.toast-success')).toBeVisible()
  })

  test('should validate workflow creation', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="create-workflow-button"]')

    // Try to submit empty form
    await page.click('[data-testid="save-workflow"]')

    // Check validation errors
    await expect(page.locator('text=Workflow name is required')).toBeVisible()
    await expect(page.locator('text=At least one step is required')).toBeVisible()

    // Test duplicate workflow name
    await page.fill('[data-testid="workflow-name"]', 'Leave Request Approval') // Existing workflow
    await page.click('[data-testid="save-workflow"]')
    await expect(page.locator('text=Workflow name already exists')).toBeVisible()
  })

  test('should delete workflow with confirmation', async ({ page }) => {
    await page.goto('/workflows')
    await waitForPageLoad(page)

    // Get initial workflow count
    const workflowRows = page.locator('[data-testid^="workflow-row-"]')
    const initialCount = await workflowRows.count()

    // Delete first workflow
    const deleteButton = page.locator('[data-testid^="delete-workflow-"]').first()
    await deleteButton.click()

    // Confirm deletion
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible()
    await page.click('[data-testid="confirm-delete"]')

    // Verify deletion
    await expect(page.locator('.toast-success')).toBeVisible()

    // Workflow count should decrease
    await waitForPageLoad(page)
    const finalCount = await workflowRows.count()
    expect(finalCount).toBeLessThan(initialCount)
  })
})

test.describe('Admin Access Control', () => {
  test('should restrict non-admin access to admin pages', async ({ page }) => {
    // Test employee access
    await loginAs(page, 'employee')

    const adminPages = ['/users', '/workflows', '/analytics']

    for (const adminPage of adminPages) {
      await page.goto(adminPage)

      // Should redirect to dashboard or show access denied
      if (page.url().includes('/dashboard')) {
        // Redirected to dashboard - check no admin nav items visible
        await expect(checkAdminAccess(page)).resolves.toBe(false)
      } else {
        // Access denied page
        await expect(page.locator('text=Access Denied')).toBeVisible()
      }
    }
  })

  test('should show manager-level restrictions', async ({ page }) => {
    await loginAs(page, 'manager')

    // Managers may have limited access to some admin features
    await page.goto('/analytics')

    // Should have access to analytics but with department filtering
    if (page.url().includes('/analytics')) {
      await expect(page.locator('h1')).toContainText('Analytics')

      // But should not see all departments
      const departmentFilter = page.locator('[data-testid="department-filter"]')
      if (await departmentFilter.isVisible()) {
        const options = departmentFilter.locator('option')
        const optionCount = await options.count()
        // Managers should see limited options (their department + "All" at most)
        expect(optionCount).toBeLessThanOrEqual(2)
      }
    }

    // Should not have access to user management
    await page.goto('/users')
    await expect(page.locator('text=Access Denied')).toBeVisible()
  })

  test('should provide full admin access for admin users', async ({ page }) => {
    await loginAs(page, 'admin')

    // Admin should have access to all admin pages
    const adminPages = [
      { path: '/users', title: 'User Management' },
      { path: '/workflows', title: 'Workflow Management' },
      { path: '/analytics', title: 'Analytics' }
    ]

    for (const adminPage of adminPages) {
      await page.goto(adminPage.path)
      await expect(page.locator('h1')).toContainText(adminPage.title)
      await expect(page.url()).toContain(adminPage.path)
    }

    // Admin should see all navigation options
    await expect(checkAdminAccess(page)).resolves.toBe(true)
  })
})
