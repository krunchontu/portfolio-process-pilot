import { expect } from '@playwright/test'

/**
 * Test user credentials for different roles
 */
export const TEST_USERS = {
  employee: {
    email: 'employee@test.com',
    password: 'password123',
    role: 'employee'
  },
  manager: {
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager'
  },
  admin: {
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  }
}

/**
 * Login helper for different user roles
 */
export async function loginAs(page, userRole) {
  const user = TEST_USERS[userRole]
  if (!user) {
    throw new Error(`Unknown user role: ${userRole}`)
  }

  await page.goto('/login')
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')

  // Wait for successful login
  await expect(page).toHaveURL('/dashboard')
  return user
}

/**
 * Create test request data for different request types
 */
export const TEST_REQUESTS = {
  leaveRequest: {
    type: 'leave-request',
    data: {
      startDate: '2024-04-01',
      endDate: '2024-04-05',
      leaveType: 'vacation',
      reason: 'Family vacation - E2E test request'
    }
  },
  expenseRequest: {
    type: 'expense-approval',
    data: {
      amount: '250.00',
      currency: 'USD',
      expenseDate: '2024-03-15',
      category: 'travel',
      description: 'Client meeting expenses - E2E test'
    }
  },
  equipmentRequest: {
    type: 'equipment-request',
    data: {
      equipmentType: 'laptop',
      specifications: 'MacBook Pro 16" M3, 32GB RAM',
      urgency: 'high',
      justification: 'Current laptop failing - urgent replacement needed'
    }
  }
}

/**
 * Submit a test request
 */
export async function createTestRequest(page, requestType) {
  const requestData = TEST_REQUESTS[requestType]
  if (!requestData) {
    throw new Error(`Unknown request type: ${requestType}`)
  }

  await page.goto('/requests/create')

  // Select request type
  await page.selectOption('[data-testid="request-type"]', requestData.type)

  // Fill form based on request type
  switch (requestType) {
    case 'leaveRequest':
      await page.fill('[data-testid="start-date"]', requestData.data.startDate)
      await page.fill('[data-testid="end-date"]', requestData.data.endDate)
      await page.selectOption('[data-testid="leave-type"]', requestData.data.leaveType)
      await page.fill('[data-testid="reason"]', requestData.data.reason)
      break

    case 'expenseRequest':
      await page.fill('[data-testid="amount"]', requestData.data.amount)
      await page.selectOption('[data-testid="currency"]', requestData.data.currency)
      await page.fill('[data-testid="expense-date"]', requestData.data.expenseDate)
      await page.selectOption('[data-testid="category"]', requestData.data.category)
      await page.fill('[data-testid="description"]', requestData.data.description)
      break

    case 'equipmentRequest':
      await page.selectOption('[data-testid="equipment-type"]', requestData.data.equipmentType)
      await page.fill('[data-testid="specifications"]', requestData.data.specifications)
      await page.selectOption('[data-testid="urgency"]', requestData.data.urgency)
      await page.fill('[data-testid="justification"]', requestData.data.justification)
      break
  }

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for success
  await expect(page).toHaveURL('/requests')
  await expect(page.locator('.toast-success, [data-testid="success-message"]')).toBeVisible()

  return requestData
}

/**
 * Wait for loading states to complete
 */
export async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle')

  // Wait for any loading spinners to disappear
  const loadingSpinner = page.locator('[data-testid="loading-spinner"]')
  if (await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden' })
  }
}

/**
 * Check if user has access to admin features
 */
export async function checkAdminAccess(page) {
  const adminNavItems = [
    '[data-testid="nav-users"]',
    '[data-testid="nav-workflows"]',
    '[data-testid="nav-analytics"]'
  ]

  const hasAccess = []
  for (const item of adminNavItems) {
    const element = page.locator(item)
    hasAccess.push(await element.isVisible())
  }

  return hasAccess.some(access => access)
}

/**
 * Perform request action (approve/reject)
 */
export async function performRequestAction(page, action, comment = '') {
  const actionButton = page.locator(`[data-testid="${action}-button"]`)

  if (!(await actionButton.isVisible())) {
    throw new Error(`${action} button not visible - user may not have permission`)
  }

  await actionButton.click()

  // Fill comment if provided
  if (comment) {
    await page.fill('[data-testid="action-comment"]', comment)
  }

  // Confirm action
  await page.click('[data-testid="confirm-action"]')

  // Wait for success message
  await expect(page.locator('.toast-success, [data-testid="success-message"]')).toBeVisible()
}

/**
 * Navigate to specific request by ID
 */
export async function navigateToRequest(page, requestId) {
  await page.goto(`/requests/${requestId}`)
  await waitForPageLoad(page)
  await expect(page.locator('[data-testid="request-details"]')).toBeVisible()
}

/**
 * Fill search and filter controls
 */
export async function applyFiltersAndSearch(page, filters = {}) {
  if (filters.status) {
    await page.selectOption('[data-testid="status-filter"]', filters.status)
  }

  if (filters.type) {
    await page.selectOption('[data-testid="type-filter"]', filters.type)
  }

  if (filters.search) {
    await page.fill('[data-testid="search-input"]', filters.search)
    await page.press('[data-testid="search-input"]', 'Enter')
  }

  await waitForPageLoad(page)
}

/**
 * Check responsive design elements
 */
export async function checkResponsiveElements(page, expectedElements = []) {
  for (const element of expectedElements) {
    await expect(page.locator(element)).toBeVisible()
  }
}

/**
 * Simulate network error
 */
export async function simulateNetworkError(page, pattern = '**') {
  await page.route(pattern, route => {
    route.abort('failed')
  })
}

/**
 * Mock API responses
 */
export async function mockApiResponse(page, endpoint, response) {
  await page.route(`**/api/${endpoint}**`, async route => {
    await route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response.data)
    })
  })
}

/**
 * Generate test data for bulk operations
 */
export function generateTestData(type, count = 5) {
  const data = []

  for (let i = 0; i < count; i++) {
    switch (type) {
      case 'users':
        data.push({
          id: i + 1,
          first_name: `Test${i + 1}`,
          last_name: `User${i + 1}`,
          email: `test${i + 1}@example.com`,
          role: ['employee', 'manager', 'admin'][i % 3],
          department: ['IT', 'HR', 'Finance', 'Operations'][i % 4]
        })
        break

      case 'requests':
        data.push({
          id: i + 1,
          title: `Test Request ${i + 1}`,
          type: ['leave-request', 'expense-approval', 'equipment-request'][i % 3],
          status: ['pending', 'approved', 'rejected'][i % 3],
          created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
        })
        break

      case 'workflows':
        data.push({
          id: i + 1,
          name: `Test Workflow ${i + 1}`,
          description: `Automated test workflow ${i + 1}`,
          is_active: i % 2 === 0,
          steps: [
            { role: 'manager', order: 1 },
            { role: 'admin', order: 2 }
          ]
        })
        break
    }
  }

  return data
}
