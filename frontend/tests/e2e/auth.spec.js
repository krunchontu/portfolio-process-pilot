import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    // Check if login form elements are present
    await expect(page.locator('h1')).toContainText('Sign In')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Check for error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('should redirect to dashboard on successful login', async ({ page }) => {
    // Mock successful login (you'll need to set up test user in backend)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should navigate to register page', async ({ page }) => {
    // Click register link
    await page.click('text=Create an account')

    // Should navigate to register page
    await expect(page).toHaveURL('/register')
    await expect(page.locator('h1')).toContainText('Create Account')
  })
})

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('should display registration form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create Account')
    await expect(page.locator('input[name="first_name"]')).toBeVisible()
    await expect(page.locator('input[name="last_name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    await page.fill('input[type="password"]', '123')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
  })
})

test.describe('Logout Flow', () => {
  test('should logout user and redirect to login', async ({ page }) => {
    // First login (assuming we have a test user)
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard')

    // Click logout
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should invalidate session after logout', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')

    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')

    // Try to access protected route
    await page.goto('/requests')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Password Reset Flow', () => {
  test('should display forgot password option', async ({ page }) => {
    await page.goto('/login')

    const forgotPasswordLink = page.locator('text=Forgot Password?, text=Reset Password')
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click()

      // Should navigate to password reset page
      await expect(page).toHaveURL(/\/reset-password|\/forgot-password/)
      await expect(page.locator('input[type="email"]')).toBeVisible()
    }
  })
})

test.describe('Session Management', () => {
  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')

    // Refresh page
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should handle concurrent sessions properly', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      // Login in first session
      await page1.goto('http://localhost:3000/login')
      await page1.fill('input[type="email"]', 'employee@test.com')
      await page1.fill('input[type="password"]', 'password123')
      await page1.click('button[type="submit"]')

      await expect(page1).toHaveURL('/dashboard')

      // Login in second session
      await page2.goto('http://localhost:3000/login')
      await page2.fill('input[type="email"]', 'employee@test.com')
      await page2.fill('input[type="password"]', 'password123')
      await page2.click('button[type="submit"]')

      await expect(page2).toHaveURL('/dashboard')

      // Both sessions should work independently
      await page1.goto('/requests')
      await expect(page1).toHaveURL('/requests')

      await page2.goto('/profile')
      await expect(page2).toHaveURL('/profile')

    } finally {
      await context1.close()
      await context2.close()
    }
  })
})
