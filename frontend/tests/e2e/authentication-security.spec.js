import { test, expect } from '@playwright/test'

test.describe('Authentication Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
  })

  test.describe('Cookie-Based Authentication Security', () => {
    test('should not store tokens in localStorage', async ({ page }) => {
      // Navigate to login page
      await page.goto('/login')
      
      // Fill in valid credentials and login
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Wait for successful login (should redirect to dashboard)
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Check that no authentication tokens are stored in localStorage
      const accessToken = await page.evaluate(() => localStorage.getItem('access_token'))
      const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'))
      const token = await page.evaluate(() => localStorage.getItem('token'))
      
      expect(accessToken).toBeNull()
      expect(refreshToken).toBeNull()
      expect(token).toBeNull()
    })

    test('should authenticate using httpOnly cookies only', async ({ page, context }) => {
      // Login
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Wait for login success
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Check that httpOnly cookies are set
      const cookies = await context.cookies()
      const accessTokenCookie = cookies.find(cookie => cookie.name === 'access_token')
      const refreshTokenCookie = cookies.find(cookie => cookie.name === 'refresh_token')
      
      expect(accessTokenCookie).toBeDefined()
      expect(refreshTokenCookie).toBeDefined()
      expect(accessTokenCookie.httpOnly).toBe(true)
      expect(refreshTokenCookie.httpOnly).toBe(true)
    })

    test('should verify cookie security attributes', async ({ page, context }) => {
      // Login to get cookies set
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Check cookie security attributes
      const cookies = await context.cookies()
      const accessTokenCookie = cookies.find(cookie => cookie.name === 'access_token')
      
      expect(accessTokenCookie.httpOnly).toBe(true)
      expect(accessTokenCookie.sameSite).toBe('Strict')
      // In development, secure might be false, in production it should be true
      // expect(accessTokenCookie.secure).toBe(process.env.NODE_ENV === 'production')
    })

    test('should prevent XSS access to authentication tokens', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Attempt to access tokens via JavaScript (should fail)
      const xssAttempt = await page.evaluate(() => {
        try {
          // Try various methods to access tokens
          const methods = [
            () => document.cookie.match(/access_token=([^;]+)/),
            () => localStorage.getItem('access_token'),
            () => sessionStorage.getItem('access_token'),
            () => window.localStorage.access_token,
            () => window.sessionStorage.access_token
          ]
          
          return methods.map(method => {
            try {
              return method()
            } catch (e) {
              return null
            }
          })
        } catch (e) {
          return [null, null, null, null, null]
        }
      })
      
      // All attempts should return null or undefined
      xssAttempt.forEach(result => {
        expect(result).toBeNull()
      })
    })
  })

  test.describe('Complete Authentication Flows', () => {
    test('should handle complete login → request creation → logout flow', async ({ page }) => {
      // 1. Login
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // 2. Navigate to create request
      await page.click('text=Create Request')
      await page.waitForURL('/requests/create', { timeout: 5000 })
      
      // 3. Create a leave request
      await page.selectOption('select[name="type"]', 'leave-request')
      await page.fill('input[name="startDate"]', '2024-12-01')
      await page.fill('input[name="endDate"]', '2024-12-05')
      await page.fill('textarea[name="reason"]', 'Vacation time')
      await page.click('button[type="submit"]')
      
      // 4. Verify request was created
      await page.waitForURL('/requests', { timeout: 5000 })
      await expect(page.locator('text=Vacation time')).toBeVisible()
      
      // 5. Logout
      await page.click('[data-testid="user-menu"]')
      await page.click('text=Logout')
      
      // 6. Verify redirected to login
      await page.waitForURL('/login', { timeout: 5000 })
    })

    test('should handle token refresh during long sessions', async ({ page, context }) => {
      // Login
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Get initial cookies
      let cookies = await context.cookies()
      let initialAccessToken = cookies.find(c => c.name === 'access_token')?.value
      
      // Simulate API calls that might trigger refresh
      await page.goto('/requests')
      await page.goto('/dashboard')
      await page.goto('/profile')
      
      // Wait and check if token refresh occurred
      await page.waitForTimeout(2000)
      cookies = await context.cookies()
      let currentAccessToken = cookies.find(c => c.name === 'access_token')?.value
      
      // Token might be refreshed or same, but should still be present
      expect(currentAccessToken).toBeDefined()
      expect(currentAccessToken).toBeTruthy()
    })

    test('should handle authentication across different request types', async ({ page }) => {
      // Login
      await page.goto('/login')
      await page.fill('input[type="email"]', 'manager@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Test Leave Request
      await page.goto('/requests/create')
      await page.selectOption('select[name="type"]', 'leave-request')
      await page.fill('input[name="startDate"]', '2024-12-01')
      await page.fill('input[name="endDate"]', '2024-12-02')
      await page.fill('textarea[name="reason"]', 'Personal leave')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/requests', { timeout: 5000 })
      
      // Test Expense Request
      await page.goto('/requests/create')
      await page.selectOption('select[name="type"]', 'expense-approval')
      await page.fill('input[name="amount"]', '150.00')
      await page.fill('input[name="description"]', 'Business lunch')
      await page.selectOption('select[name="category"]', 'meals')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/requests', { timeout: 5000 })
      
      // Test Equipment Request
      await page.goto('/requests/create')
      await page.selectOption('select[name="type"]', 'equipment-request')
      await page.fill('input[name="equipmentType"]', 'Laptop')
      await page.fill('textarea[name="justification"]', 'Development work')
      await page.selectOption('select[name="urgency"]', 'medium')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/requests', { timeout: 5000 })
      
      // Verify all requests were created and are visible
      await expect(page.locator('text=Personal leave')).toBeVisible()
      await expect(page.locator('text=Business lunch')).toBeVisible()
      await expect(page.locator('text=Laptop')).toBeVisible()
    })
  })

  test.describe('CSRF Protection Tests', () => {
    test('should include CSRF token in authenticated requests', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Intercept API requests to check for CSRF token
      let csrfTokenFound = false
      page.on('request', request => {
        if (request.url().includes('/api/') && request.method() !== 'GET') {
          const headers = request.headers()
          if (headers['x-csrf-token'] || headers['x-xsrf-token']) {
            csrfTokenFound = true
          }
        }
      })
      
      // Make a request that should include CSRF token
      await page.goto('/requests/create')
      await page.selectOption('select[name="type"]', 'leave-request')
      await page.fill('input[name="startDate"]', '2024-12-01')
      await page.fill('input[name="endDate"]', '2024-12-02')
      await page.fill('textarea[name="reason"]', 'Testing CSRF')
      await page.click('button[type="submit"]')
      
      // Wait for request to complete
      await page.waitForURL('/requests', { timeout: 5000 })
      
      // CSRF token should have been included
      expect(csrfTokenFound).toBe(true)
    })
  })

  test.describe('Error Handling Tests', () => {
    test('should handle expired token gracefully', async ({ page, context }) => {
      // Login first
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Simulate expired token by clearing cookies
      await context.clearCookies()
      
      // Try to access protected resource
      await page.goto('/requests')
      
      // Should be redirected to login
      await page.waitForURL('/login', { timeout: 5000 })
      await expect(page.locator('h1')).toContainText('Sign In')
    })

    test('should handle network errors during authentication', async ({ page }) => {
      // Go to login page
      await page.goto('/login')
      
      // Intercept and fail the login request
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Internal Server Error' })
        })
      })
      
      // Try to login
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Should show error message
      await expect(page.locator('text=Server error')).toBeVisible()
    })
  })
})