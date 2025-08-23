import { test, expect } from '@playwright/test'
import { loginAs, waitForPageLoad } from './utils/test-helpers.js'

test.describe('Accessibility (A11y) Testing', () => {
  test('should have proper semantic HTML structure', async ({ page }) => {
    await page.goto('/login')
    
    // Check for semantic elements
    const main = page.locator('main')
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const form = page.locator('form')
    
    await expect(main).toBeVisible()
    await expect(headings.first()).toBeVisible()
    await expect(form).toBeVisible()
    
    // Check heading hierarchy
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1) // Should have exactly one h1
    
    // Form should have proper labels
    const emailInput = page.locator('input[type="email"]')
    const emailLabel = page.locator('label[for="email"], label:has(input[type="email"])')
    
    await expect(emailInput).toBeVisible()
    await expect(emailLabel).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login')
    
    // Tab through form elements
    await page.keyboard.press('Tab')
    let focusedElement = await page.locator(':focus').getAttribute('type')
    expect(focusedElement).toBe('email')
    
    await page.keyboard.press('Tab')
    focusedElement = await page.locator(':focus').getAttribute('type')
    expect(focusedElement).toBe('password')
    
    await page.keyboard.press('Tab')
    focusedElement = await page.locator(':focus').getAttribute('type')
    expect(focusedElement).toBe('submit')
    
    // Should be able to submit form with Enter
    await page.fill('input[type="email"]', 'employee@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.keyboard.press('Enter')
    
    // Should submit and navigate to dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should have proper ARIA attributes', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Navigation should have proper ARIA labels
    const navigation = page.locator('nav')
    await expect(navigation).toHaveAttribute('aria-label')
    
    // Interactive elements should have proper roles
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      const role = await button.getAttribute('role')
      const ariaLabel = await button.getAttribute('aria-label')
      const textContent = await button.textContent()
      
      // Button should have role="button" or be a proper button element
      const hasProperRole = role === 'button' || await button.evaluate(el => el.tagName) === 'BUTTON'
      expect(hasProperRole).toBe(true)
      
      // Should have accessible text (either text content or aria-label)
      const hasAccessibleText = (textContent && textContent.trim().length > 0) || 
                               (ariaLabel && ariaLabel.trim().length > 0)
      expect(hasAccessibleText).toBe(true)
    }
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/login')
    
    // Check color contrast for important elements
    const elements = [
      'h1',
      'label',
      'button[type="submit"]',
      'input'
    ]
    
    for (const selector of elements) {
      const element = page.locator(selector).first()
      if (await element.isVisible()) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          }
        })
        
        // Basic check - should not have white text on white background
        const isNotWhiteOnWhite = !(
          styles.color.includes('rgb(255, 255, 255)') && 
          styles.backgroundColor.includes('rgb(255, 255, 255)')
        )
        expect(isNotWhiteOnWhite).toBe(true)
      }
    }
  })

  test('should work with screen readers (simulated)', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests')
    await waitForPageLoad(page)
    
    // Check for proper headings structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    const headingTexts = await Promise.all(headings.map(h => h.textContent()))
    
    // Should have meaningful heading text
    expect(headingTexts.every(text => text && text.trim().length > 0)).toBe(true)
    
    // Check for landmark regions
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').count()
    expect(landmarks).toBeGreaterThan(0)
    
    // Check for proper list structure
    const lists = page.locator('ul, ol')
    const listCount = await lists.count()
    
    if (listCount > 0) {
      // Lists should contain list items
      const firstList = lists.first()
      const listItems = firstList.locator('li')
      const itemCount = await listItems.count()
      expect(itemCount).toBeGreaterThan(0)
    }
  })

  test('should have accessible forms', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests/create')
    
    // All form inputs should have associated labels
    const inputs = page.locator('input, select, textarea')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const inputId = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledby = await input.getAttribute('aria-labelledby')
      
      if (inputId) {
        // Check for associated label
        const label = page.locator(`label[for="${inputId}"]`)
        const hasLabel = await label.count() > 0
        const hasAriaLabel = ariaLabel && ariaLabel.length > 0
        const hasAriaLabelledby = ariaLabelledby && ariaLabelledby.length > 0
        
        expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBe(true)
      }
    }
    
    // Required fields should be marked as such
    const requiredInputs = page.locator('input[required], select[required], textarea[required]')
    const requiredCount = await requiredInputs.count()
    
    for (let i = 0; i < requiredCount; i++) {
      const input = requiredInputs.nth(i)
      const ariaRequired = await input.getAttribute('aria-required')
      const required = await input.getAttribute('required')
      
      expect(required !== null || ariaRequired === 'true').toBe(true)
    }
  })

  test('should handle focus management properly', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests')
    await waitForPageLoad(page)
    
    // Test modal focus management
    const createButton = page.locator('[data-testid="create-request-button"]')
    if (await createButton.isVisible()) {
      await createButton.click()
      
      // Focus should move to the form
      await page.waitForTimeout(500) // Allow for navigation/loading
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
    
    // Test dropdown focus management
    const dropdowns = page.locator('select')
    const dropdownCount = await dropdowns.count()
    
    if (dropdownCount > 0) {
      const firstDropdown = dropdowns.first()
      await firstDropdown.focus()
      await firstDropdown.press('ArrowDown')
      
      // Should still be focused
      const isFocused = await firstDropdown.evaluate(el => document.activeElement === el)
      expect(isFocused).toBe(true)
    }
  })

  test('should provide meaningful error messages', async ({ page }) => {
    await page.goto('/login')
    
    // Submit empty form
    await page.click('button[type="submit"]')
    
    // Error messages should be accessible
    const errorMessages = page.locator('[role="alert"], .error-message, [data-testid*="error"]')
    const errorCount = await errorMessages.count()
    
    if (errorCount > 0) {
      const firstError = errorMessages.first()
      await expect(firstError).toBeVisible()
      
      // Error should have meaningful text
      const errorText = await firstError.textContent()
      expect(errorText && errorText.trim().length > 0).toBe(true)
      
      // Should be properly associated with form fields
      const ariaDescribedBy = await page.locator('input').first().getAttribute('aria-describedby')
      if (ariaDescribedBy) {
        const describingElement = page.locator(`#${ariaDescribedBy}`)
        await expect(describingElement).toBeVisible()
      }
    }
  })

  test('should be usable with keyboard only', async ({ page }) => {
    await page.goto('/login')
    
    // Complete entire login flow with keyboard only
    await page.keyboard.press('Tab') // Focus email
    await page.keyboard.type('employee@test.com')
    
    await page.keyboard.press('Tab') // Focus password
    await page.keyboard.type('password123')
    
    await page.keyboard.press('Tab') // Focus submit button
    await page.keyboard.press('Enter') // Submit form
    
    // Should successfully login
    await expect(page).toHaveURL('/dashboard')
    
    // Navigate through application with keyboard
    await page.keyboard.press('Tab') // Navigate to first interactive element
    
    // Should be able to reach navigation
    let tabCount = 0
    while (tabCount < 10) { // Safety limit
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      const tagName = await focusedElement.evaluate(el => el.tagName).catch(() => '')
      
      if (tagName === 'A' || tagName === 'BUTTON') {
        const href = await focusedElement.getAttribute('href')
        if (href && href.includes('/requests')) {
          await page.keyboard.press('Enter')
          break
        }
      }
      tabCount++
    }
    
    // Should navigate to requests page
    await expect(page).toHaveURL('/requests')
  })

  test('should support zoom and scaling', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    
    // Test 200% zoom
    await page.setViewportSize({ width: 800, height: 600 })
    await page.evaluate(() => {
      document.body.style.zoom = '200%'
    })
    
    // Content should still be visible and usable
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible()
    
    // Navigation should still work
    const requestsLink = page.locator('text=Requests')
    if (await requestsLink.isVisible()) {
      await requestsLink.click()
      await expect(page).toHaveURL('/requests')
    }
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '100%'
    })
  })

  test('should have accessible tables', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/users')
    await waitForPageLoad(page)
    
    const table = page.locator('table')
    if (await table.isVisible()) {
      // Table should have proper structure
      await expect(table.locator('thead')).toBeVisible()
      await expect(table.locator('tbody')).toBeVisible()
      
      // Headers should have proper scope
      const headers = table.locator('th')
      const headerCount = await headers.count()
      
      for (let i = 0; i < headerCount; i++) {
        const header = headers.nth(i)
        const scope = await header.getAttribute('scope')
        expect(scope === 'col' || scope === 'row').toBe(true)
      }
      
      // Table should have caption or aria-label
      const caption = table.locator('caption')
      const ariaLabel = await table.getAttribute('aria-label')
      
      const hasCaption = await caption.count() > 0
      const hasAriaLabel = ariaLabel && ariaLabel.length > 0
      
      expect(hasCaption || hasAriaLabel).toBe(true)
    }
  })

  test('should handle reduced motion preferences', async ({ page }) => {
    // Simulate user preference for reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    
    // Animations should be reduced or disabled
    const animatedElements = page.locator('[class*="animate"], [class*="transition"]')
    const animatedCount = await animatedElements.count()
    
    if (animatedCount > 0) {
      // Check that animations respect reduced motion
      const firstAnimated = animatedElements.first()
      const animationDuration = await firstAnimated.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return computed.animationDuration
      })
      
      // Animation duration should be very short or none
      expect(animationDuration === '0s' || animationDuration === 'none').toBe(true)
    }
  })
})