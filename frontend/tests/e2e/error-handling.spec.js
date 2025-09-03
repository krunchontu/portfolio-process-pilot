import { test, expect } from '@playwright/test'
import {
  loginAs,
  waitForPageLoad,
  simulateNetworkError,
  mockApiResponse
} from './utils/test-helpers.js'

test.describe('Error Handling and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'employee')
  })

  test('should handle API network errors gracefully', async ({ page }) => {
    await page.goto('/requests')

    // Simulate network failure for requests API
    await simulateNetworkError(page, '**/api/requests**')

    // Try to refresh the page or make an API call
    await page.reload()

    // Should show error message instead of breaking
    await expect(page.locator('[data-testid="error-message"], .error-banner')).toBeVisible()
    await expect(page.locator('text=Unable to load requests')).toBeVisible()

    // Should show retry button
    const retryButton = page.locator('[data-testid="retry-button"]')
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeEnabled()
    }

    // Application should remain functional for other features
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible()
  })

  test('should handle API server errors (500)', async ({ page }) => {
    // Mock 500 error response
    await mockApiResponse(page, 'requests', {
      status: 500,
      data: {
        success: false,
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR'
      }
    })

    await page.goto('/requests')

    // Should show server error message
    await expect(page.locator('[data-testid="server-error"]')).toBeVisible()
    await expect(page.locator('text=Something went wrong on our end')).toBeVisible()

    // Should provide helpful actions
    await expect(page.locator('[data-testid="contact-support"]')).toBeVisible()
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('should handle validation errors from API', async ({ page }) => {
    await page.goto('/requests/create')

    // Mock validation error response
    await mockApiResponse(page, 'requests', {
      status: 400,
      data: {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          validation_errors: [
            'Start date cannot be in the past',
            'End date must be after start date'
          ]
        }
      }
    })

    // Fill and submit form
    await page.selectOption('[data-testid="request-type"]', 'leave-request')
    await page.fill('[data-testid="start-date"]', '2023-01-01') // Past date
    await page.fill('[data-testid="end-date"]', '2022-12-31') // Before start date
    await page.fill('[data-testid="reason"]', 'Test request')
    await page.click('button[type="submit"]')

    // Should show validation errors
    await expect(page.locator('text=Start date cannot be in the past')).toBeVisible()
    await expect(page.locator('text=End date must be after start date')).toBeVisible()

    // Form should remain editable
    await expect(page.locator('[data-testid="start-date"]')).toBeEditable()
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
  })

  test('should handle authentication errors', async ({ page }) => {
    await page.goto('/requests')

    // Mock 401 unauthorized response
    await mockApiResponse(page, 'requests', {
      status: 401,
      data: {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }
    })

    await page.reload()

    // Should redirect to login page
    await expect(page).toHaveURL('/login')
    await expect(page.locator('text=Your session has expired')).toBeVisible()
  })

  test('should handle permission denied errors', async ({ page }) => {
    // Mock 403 forbidden response
    await mockApiResponse(page, 'users', {
      status: 403,
      data: {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN'
      }
    })

    // Try to access admin page as employee
    await page.goto('/users')

    // Should show access denied message
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
    await expect(page.locator('text=You don\'t have permission')).toBeVisible()

    // Should provide navigation back to allowed areas
    await expect(page.locator('[data-testid="go-back-button"]')).toBeVisible()
  })

  test('should handle timeout errors', async ({ page, context }) => {
    // Set low timeout for testing
    context.setDefaultTimeout(1000)

    // Mock slow response
    await page.route('**/api/requests**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
      await route.continue()
    })

    await page.goto('/requests')

    // Should show timeout message
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible()
    await expect(page.locator('text=Request timed out')).toBeVisible()
  })

  test('should recover from errors when API comes back online', async ({ page }) => {
    await page.goto('/requests')

    // First, simulate network error
    await simulateNetworkError(page, '**/api/requests**')
    await page.reload()

    // Verify error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()

    // Remove network simulation (API comes back online)
    await page.unroute('**/api/requests**')

    // Click retry button
    const retryButton = page.locator('[data-testid="retry-button"]')
    if (await retryButton.isVisible()) {
      await retryButton.click()

      // Should recover and load data
      await expect(page.locator('[data-testid="requests-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
    }
  })
})

test.describe('Form Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'employee')
  })

  test('should show client-side validation errors', async ({ page }) => {
    await page.goto('/requests/create')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Should show required field errors
    await expect(page.locator('text=Request type is required')).toBeVisible()
    await expect(page.locator('text=This field is required')).toHaveCount(2) // Multiple required fields

    // Form should not submit
    await expect(page).toHaveURL('/requests/create')
  })

  test('should validate date fields properly', async ({ page }) => {
    await page.goto('/requests/create')

    await page.selectOption('[data-testid="request-type"]', 'leave-request')

    // Test invalid date formats
    await page.fill('[data-testid="start-date"]', 'invalid-date')
    await page.fill('[data-testid="end-date"]', '2024-01-01')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Invalid date format')).toBeVisible()

    // Test logical date validation (end before start)
    await page.fill('[data-testid="start-date"]', '2024-06-01')
    await page.fill('[data-testid="end-date"]', '2024-05-31')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=End date must be after start date')).toBeVisible()
  })

  test('should validate expense amounts', async ({ page }) => {
    await page.goto('/requests/create')

    await page.selectOption('[data-testid="request-type"]', 'expense-approval')

    // Test negative amount
    await page.fill('[data-testid="amount"]', '-100')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Amount must be positive')).toBeVisible()

    // Test invalid amount format
    await page.fill('[data-testid="amount"]', 'abc')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid amount format')).toBeVisible()

    // Test extremely large amount
    await page.fill('[data-testid="amount"]', '999999999999')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Amount exceeds maximum limit')).toBeVisible()
  })

  test('should handle file upload errors', async ({ page }) => {
    await page.goto('/requests/create')

    await page.selectOption('[data-testid="request-type"]', 'expense-approval')

    const fileInput = page.locator('[data-testid="receipt-upload"]')
    if (await fileInput.isVisible()) {
      // Test file size limit
      const largeFileBuffer = Buffer.alloc(10 * 1024 * 1024) // 10MB file
      await fileInput.setInputFiles({
        name: 'large-receipt.jpg',
        mimeType: 'image/jpeg',
        buffer: largeFileBuffer
      })

      await expect(page.locator('text=File size too large')).toBeVisible()

      // Test invalid file type
      await fileInput.setInputFiles({
        name: 'receipt.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('fake exe content')
      })

      await expect(page.locator('text=Invalid file type')).toBeVisible()
    }
  })

  test('should preserve form data after validation errors', async ({ page }) => {
    await page.goto('/requests/create')

    // Fill form with some valid and some invalid data
    await page.selectOption('[data-testid="request-type"]', 'leave-request')
    await page.fill('[data-testid="start-date"]', '2024-06-01')
    await page.fill('[data-testid="end-date"]', '2024-05-31') // Invalid - before start
    await page.fill('[data-testid="reason"]', 'Important vacation')

    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('text=End date must be after start date')).toBeVisible()

    // But other form data should be preserved
    await expect(page.locator('[data-testid="request-type"]')).toHaveValue('leave-request')
    await expect(page.locator('[data-testid="start-date"]')).toHaveValue('2024-06-01')
    await expect(page.locator('[data-testid="reason"]')).toHaveValue('Important vacation')
  })
})

test.describe('Offline and Connectivity', () => {
  test('should handle offline state', async ({ page, context }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests')

    // Go offline
    await context.setOffline(true)

    // Try to create new request
    await page.goto('/requests/create')

    // Should show offline message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()
    await expect(page.locator('text=You are currently offline')).toBeVisible()

    // Form submission should be disabled or queued
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()

    // Come back online
    await context.setOffline(false)

    // Should automatically detect connection restoration
    await expect(page.locator('[data-testid="online-message"]')).toBeVisible()
    await expect(submitButton).toBeEnabled()
  })

  test('should handle slow network connections', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
      await route.continue()
    })

    await loginAs(page, 'employee')
    await page.goto('/requests')

    // Should show loading states
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible()

    // Eventually should load content
    await expect(page.locator('[data-testid="requests-list"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible()
  })
})

test.describe('Browser Compatibility', () => {
  test('should handle browser-specific features gracefully', async ({ page }) => {
    await loginAs(page, 'employee')

    // Test localStorage availability
    await page.goto('/dashboard')

    // Test if app works when localStorage is disabled
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = () => {
        throw new Error('localStorage disabled')
      }
    })

    // Navigate to new page - should handle localStorage errors
    await page.goto('/requests')

    // App should still function
    await expect(page.locator('h1')).toContainText('Requests')
  })

  test('should work with cookies disabled', async ({ context, page }) => {
    // Disable cookies
    await context.addCookies([])

    await page.goto('/login')

    // Login might not work with cookies disabled for JWT storage
    await page.fill('input[type="email"]', 'employee@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show appropriate error message
    await expect(page.locator('text=Cookies are required')).toBeVisible()
  })
})
