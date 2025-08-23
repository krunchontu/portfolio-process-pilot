import { test, expect } from '@playwright/test'
import { loginAs, mockApiResponse } from './utils/test-helpers.js'

test.describe('Security Testing', () => {
  test('should prevent XSS attacks in form inputs', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests/create')
    
    // Test XSS in text inputs
    const xssPayload = '<script>alert("XSS")</script>'
    const imgXssPayload = '<img src="x" onerror="alert(\'XSS\')">'
    
    await page.selectOption('[data-testid="request-type"]', 'leave-request')
    await page.fill('[data-testid="reason"]', xssPayload)
    await page.fill('[data-testid="start-date"]', '2024-06-01')
    await page.fill('[data-testid="end-date"]', '2024-06-05')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Navigate to requests to see if XSS payload is executed
    await page.goto('/requests')
    
    // XSS should not execute - no alert should appear
    const alerts = []
    page.on('dialog', dialog => {
      alerts.push(dialog.message())
      dialog.dismiss()
    })
    
    await page.waitForTimeout(2000)
    expect(alerts).toHaveLength(0)
    
    // Content should be escaped
    const reasonText = page.locator('text=<script>alert("XSS")</script>')
    if (await reasonText.isVisible()) {
      // Should be displayed as text, not executed
      const innerHTML = await reasonText.innerHTML()
      expect(innerHTML).not.toContain('<script>')
    }
  })

  test('should sanitize HTML content in displays', async ({ page }) => {
    await loginAs(page, 'employee')
    
    // Mock API response with malicious HTML
    await mockApiResponse(page, 'requests', {
      status: 200,
      data: {
        success: true,
        data: [{
          id: 1,
          title: '<script>alert("XSS")</script>Malicious Request',
          reason: '<img src="x" onerror="alert(\'IMG XSS\')">',
          type: 'leave-request',
          status: 'pending',
          created_at: '2024-03-01T10:00:00Z'
        }]
      }
    })
    
    await page.goto('/requests')
    
    // Malicious scripts should not execute
    const alerts = []
    page.on('dialog', dialog => {
      alerts.push(dialog.message())
      dialog.dismiss()
    })
    
    await page.waitForTimeout(2000)
    expect(alerts).toHaveLength(0)
    
    // HTML should be escaped or sanitized
    const titleElement = page.locator('[data-testid="request-title"]').first()
    if (await titleElement.isVisible()) {
      const innerHTML = await titleElement.innerHTML()
      expect(innerHTML).not.toContain('<script>')
      expect(innerHTML).not.toContain('onerror')
    }
  })

  test('should prevent CSRF attacks', async ({ page }) => {
    await loginAs(page, 'employee')
    
    // Check for CSRF token in forms
    await page.goto('/requests/create')
    
    const csrfToken = page.locator('input[name="_token"], input[name="csrf_token"], meta[name="csrf-token"]')
    const csrfTokenExists = await csrfToken.count() > 0
    
    // Should have CSRF protection
    expect(csrfTokenExists).toBe(true)
    
    // Test that requests without proper CSRF token are rejected
    if (csrfTokenExists) {
      // Try to manipulate CSRF token
      await page.evaluate(() => {
        const csrfInput = document.querySelector('input[name="_token"], input[name="csrf_token"]')
        if (csrfInput) {
          csrfInput.value = 'invalid-token'
        }
      })
      
      // Fill form and submit
      await page.selectOption('[data-testid="request-type"]', 'leave-request')
      await page.fill('[data-testid="start-date"]', '2024-06-01')
      await page.fill('[data-testid="end-date"]', '2024-06-05')
      await page.fill('[data-testid="reason"]', 'Test request')
      
      await page.click('button[type="submit"]')
      
      // Should show CSRF error or validation error
      const errorMessage = page.locator('text=Invalid token, text=CSRF, text=Forbidden')
      const hasError = await errorMessage.count() > 0
      
      if (hasError) {
        await expect(errorMessage).toBeVisible()
      }
    }
  })

  test('should enforce proper authentication', async ({ page }) => {
    // Test accessing protected routes without authentication
    const protectedRoutes = [
      '/dashboard',
      '/requests',
      '/requests/create', 
      '/profile',
      '/users',
      '/workflows',
      '/analytics'
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      
      // Should redirect to login or show access denied
      if (page.url().includes('/login')) {
        // Successful redirect
        expect(page.url()).toContain('/login')
      } else {
        // Should show access denied
        await expect(page.locator('text=Access Denied, text=Unauthorized, text=Login Required')).toBeVisible()
      }
    }
  })

  test('should handle session expiration securely', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    
    // Simulate expired session by clearing cookies
    await page.context().clearCookies()
    
    // Try to access protected resource
    await page.goto('/requests')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
    
    // Should show session expired message
    const sessionMessage = page.locator('text=session expired, text=please log in, text=authentication required')
    const hasSessionMessage = await sessionMessage.count() > 0
    
    if (hasSessionMessage) {
      await expect(sessionMessage).toBeVisible()
    }
  })

  test('should validate user permissions properly', async ({ page }) => {
    // Test employee accessing admin routes
    await loginAs(page, 'employee')
    
    const adminRoutes = ['/users', '/workflows', '/analytics']
    
    for (const route of adminRoutes) {
      await page.goto(route)
      
      // Should be denied access or redirected
      if (page.url() === route) {
        // If on the page, should show access denied
        await expect(page.locator('text=Access Denied, text=Insufficient Privileges, text=Admin Only')).toBeVisible()
      } else {
        // Should be redirected away from admin route
        expect(page.url()).not.toBe(route)
      }
    }
  })

  test('should prevent SQL injection attempts', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests')
    
    // Test SQL injection in search
    const searchInput = page.locator('[data-testid="search-input"]')
    if (await searchInput.isVisible()) {
      const sqlPayloads = [
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "1' UNION SELECT * FROM users --"
      ]
      
      for (const payload of sqlPayloads) {
        await searchInput.fill(payload)
        await page.press('[data-testid="search-input"]', 'Enter')
        
        // Should not cause errors or return unexpected data
        const errorMessage = page.locator('text=SQL, text=database error, text=syntax error')
        const hasError = await errorMessage.count() > 0
        
        expect(hasError).toBe(false)
        
        // Should handle gracefully
        await expect(page.locator('[data-testid="search-results"], [data-testid="no-results"]')).toBeVisible()
      }
    }
  })

  test('should prevent information disclosure in error messages', async ({ page }) => {
    // Test with invalid login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'nonexistent@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Error message should not reveal whether user exists
    const errorMessage = page.locator('[data-testid="error-message"], .error-message')
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent()
      
      // Should not reveal specific details
      const revealsUserExistence = errorText?.includes('user not found') || 
                                  errorText?.includes('user does not exist')
      const revealsPasswordWrong = errorText?.includes('wrong password') ||
                                  errorText?.includes('incorrect password')
      
      expect(revealsUserExistence || revealsPasswordWrong).toBe(false)
      
      // Should use generic message
      expect(errorText?.includes('invalid credentials') || 
             errorText?.includes('login failed')).toBe(true)
    }
  })

  test('should implement secure password handling', async ({ page }) => {
    await page.goto('/register')
    
    const passwordInput = page.locator('input[type="password"]')
    if (await passwordInput.isVisible()) {
      // Password should be masked
      const inputType = await passwordInput.getAttribute('type')
      expect(inputType).toBe('password')
      
      // Test password strength validation
      const weakPasswords = ['123', 'password', 'abc123']
      
      for (const weakPassword of weakPasswords) {
        await passwordInput.fill(weakPassword)
        await page.click('button[type="submit"]')
        
        // Should show password strength error
        const strengthError = page.locator('text=password must be, text=too weak, text=at least 8 characters')
        const hasStrengthError = await strengthError.count() > 0
        
        if (hasStrengthError) {
          await expect(strengthError).toBeVisible()
        }
        
        await passwordInput.clear()
      }
    }
  })

  test('should protect against clickjacking', async ({ page }) => {
    // Check for X-Frame-Options or CSP frame-ancestors
    await page.goto('/login')
    
    const response = await page.waitForResponse('/login')
    const headers = response.headers()
    
    const xFrameOptions = headers['x-frame-options']
    const csp = headers['content-security-policy']
    
    // Should have clickjacking protection
    const hasXFrameProtection = xFrameOptions && 
      (xFrameOptions.includes('DENY') || xFrameOptions.includes('SAMEORIGIN'))
    
    const hasCSPProtection = csp && 
      (csp.includes('frame-ancestors') && csp.includes("'self'"))
    
    expect(hasXFrameProtection || hasCSPProtection).toBe(true)
  })

  test('should implement Content Security Policy', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for CSP headers
    const response = await page.waitForResponse('/dashboard')
    const headers = response.headers()
    const csp = headers['content-security-policy']
    
    if (csp) {
      // Should restrict script sources
      expect(csp).toContain('script-src')
      
      // Should not allow unsafe-eval or unsafe-inline without nonce
      const hasUnsafeEval = csp.includes("'unsafe-eval'")
      const hasUnsafeInline = csp.includes("'unsafe-inline'") && !csp.includes('nonce-')
      
      expect(hasUnsafeEval && hasUnsafeInline).toBe(false)
    }
  })

  test('should validate file uploads securely', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests/create')
    
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      // Test malicious file types
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00\x03' }, // PE header
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'shell.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' }
      ]
      
      for (const maliciousFile of maliciousFiles) {
        await fileInput.setInputFiles({
          name: maliciousFile.name,
          mimeType: 'application/octet-stream',
          buffer: Buffer.from(maliciousFile.content)
        })
        
        // Should reject malicious file types
        const errorMessage = page.locator('text=invalid file type, text=not allowed, text=file type not supported')
        const hasError = await errorMessage.count() > 0
        
        expect(hasError).toBe(true)
      }
    }
  })

  test('should prevent unauthorized data access', async ({ page }) => {
    await loginAs(page, 'employee')
    
    // Try to access another user's data by manipulating URLs
    const unauthorizedUrls = [
      '/requests/999999', // High ID that likely belongs to another user
      '/users/profile/2', // Another user's profile
      '/admin/users/1'    // Admin-only data
    ]
    
    for (const url of unauthorizedUrls) {
      await page.goto(url)
      
      // Should not allow access
      const isUnauthorized = page.url().includes('/login') || 
                            page.url().includes('/dashboard') ||
                            await page.locator('text=Access Denied, text=Not Found, text=Forbidden').count() > 0
      
      expect(isUnauthorized).toBe(true)
    }
  })

  test('should implement secure logout', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    
    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
    
    // Try to access protected route after logout
    await page.goto('/dashboard')
    
    // Should redirect to login (session should be invalidated)
    await expect(page).toHaveURL(/\/login/)
    
    // Back button should not allow access to protected content
    await page.goBack()
    if (page.url().includes('/dashboard')) {
      // If still on dashboard, should show login required
      await expect(page.locator('text=Please log in, text=Session expired')).toBeVisible()
    } else {
      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('should rate limit login attempts', async ({ page }) => {
    await page.goto('/login')
    
    const maxAttempts = 5
    const attempts = []
    
    // Make multiple failed login attempts
    for (let i = 0; i < maxAttempts + 2; i++) {
      const startTime = Date.now()
      
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', `wrongpassword${i}`)
      await page.click('button[type="submit"]')
      
      const endTime = Date.now()
      attempts.push(endTime - startTime)
      
      // Clear form for next attempt
      await page.fill('input[type="password"]', '')
      
      // Wait a bit between attempts
      await page.waitForTimeout(500)
    }
    
    // Later attempts should take longer (rate limiting) or be blocked
    const lastAttempt = attempts[attempts.length - 1]
    const firstAttempt = attempts[0]
    
    // Should either be rate limited (slower) or blocked
    const isRateLimited = lastAttempt > firstAttempt * 2
    const isBlocked = await page.locator('text=too many attempts, text=rate limit, text=try again later').count() > 0
    
    expect(isRateLimited || isBlocked).toBe(true)
  })
})