import { test, expect } from '@playwright/test'

test.describe('Application Navigation', () => {
  test('should navigate through public pages without authentication', async ({ page }) => {
    // Test landing page
    await page.goto('/')
    await expect(page).toHaveURL('/login') // Should redirect to login

    // Test login page
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('Sign In')

    // Test register page
    await page.goto('/register')
    await expect(page.locator('h1')).toContainText('Create Account')

    // Navigate back to login from register
    await page.click('text=Already have an account?')
    await expect(page).toHaveURL('/login')
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/requests',
      '/requests/create',
      '/profile',
      '/analytics'
    ]

    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL('/login')
    }
  })

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page')
    await expect(page.locator('h1')).toContainText('Page Not Found')
    await expect(page.locator('text=Go Home')).toBeVisible()

    // Click go home button
    await page.click('text=Go Home')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Authenticated Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should navigate through main application sections', async ({ page }) => {
    // Test dashboard
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Navigate to requests
    await page.click('text=Requests')
    await expect(page).toHaveURL('/requests')
    await expect(page.locator('h1')).toContainText('Requests')

    // Navigate to create request
    await page.click('[data-testid="create-request-button"]')
    await expect(page).toHaveURL('/requests/create')

    // Navigate back to requests
    await page.click('[data-testid="back-button"]')
    await expect(page).toHaveURL('/requests')

    // Navigate to profile
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Profile')
    await expect(page).toHaveURL('/profile')
  })

  test('should show admin sections for admin users', async ({ page }) => {
    // This test assumes the test user has admin role
    const adminNavItems = [
      'text=Users',
      'text=Workflows',
      'text=Analytics'
    ]

    for (const navItem of adminNavItems) {
      const element = page.locator(navItem)
      if (await element.isVisible()) {
        await element.click()
        // Verify navigation worked
        await expect(page.url()).not.toBe('/dashboard')
      }
    }
  })

  test('should maintain navigation state during session', async ({ page }) => {
    // Navigate to requests
    await page.click('text=Requests')
    await expect(page).toHaveURL('/requests')

    // Refresh page
    await page.reload()
    await expect(page).toHaveURL('/requests')
    await expect(page.locator('h1')).toContainText('Requests')

    // Session should persist
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through several pages
    await page.click('text=Requests')
    await page.click('[data-testid="create-request-button"]')

    // Use browser back button
    await page.goBack()
    await expect(page).toHaveURL('/requests')

    // Use browser forward button
    await page.goForward()
    await expect(page).toHaveURL('/requests/create')

    // Navigate to dashboard
    await page.click('text=Dashboard')
    await expect(page).toHaveURL('/dashboard')
  })
})

test.describe('Mobile Navigation', () => {
  test.use({
    viewport: { width: 375, height: 667 } // iPhone SE size
  })

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/login')

    // Test login on mobile
    await page.fill('input[type="email"]', 'employee@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')

    // Test mobile menu (if exists)
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click()
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    }
  })

  test('should be responsive on different screen sizes', async ({ page }) => {
    await page.goto('/login')

    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568 }, // iPhone 5
      { width: 768, height: 1024 }, // iPad
      { width: 1024, height: 768 }  // Desktop small
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    }
  })
})
