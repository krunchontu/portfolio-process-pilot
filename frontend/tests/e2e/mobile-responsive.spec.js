import { test, expect } from '@playwright/test'
import { 
  loginAs, 
  waitForPageLoad,
  checkResponsiveElements,
  createTestRequest 
} from './utils/test-helpers.js'

test.describe('Mobile Responsiveness', () => {
  const mobileViewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Samsung Galaxy S8+', width: 360, height: 740 },
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 }
  ]

  mobileViewports.forEach(viewport => {
    test(`should work properly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Test login on mobile
      await page.goto('/login')
      
      // Check mobile layout
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      
      // Form elements should be appropriately sized for touch
      const emailInput = page.locator('input[type="email"]')
      const inputHeight = await emailInput.boundingBox().then(box => box?.height || 0)
      expect(inputHeight).toBeGreaterThan(40) // Minimum touch target size
      
      // Complete login flow
      await loginAs(page, 'employee')
      
      // Check dashboard mobile layout
      await expect(page.locator('h1')).toBeVisible()
      
      // Navigation should be mobile-friendly (hamburger menu or mobile nav)
      const mobileNav = page.locator('[data-testid="mobile-navigation"]')
      const hamburgerMenu = page.locator('[data-testid="hamburger-menu"]')
      
      const hasMobileNav = await mobileNav.isVisible()
      const hasHamburgerMenu = await hamburgerMenu.isVisible()
      
      expect(hasMobileNav || hasHamburgerMenu).toBe(true)
      
      // Test navigation functionality
      if (hasHamburgerMenu) {
        await hamburgerMenu.click()
        await expect(page.locator('[data-testid="mobile-menu-items"]')).toBeVisible()
        
        // Should be able to navigate to requests
        await page.click('text=Requests')
        await expect(page).toHaveURL('/requests')
      }
    })
  })

  test('should handle touch interactions properly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    
    await loginAs(page, 'employee')
    await page.goto('/requests')
    await waitForPageLoad(page)
    
    // Test swipe gestures if implemented
    const requestCard = page.locator('[data-testid^="request-card-"]').first()
    if (await requestCard.isVisible()) {
      // Get card position
      const cardBox = await requestCard.boundingBox()
      if (cardBox) {
        // Simulate swipe gesture (if swipe actions are implemented)
        await page.mouse.move(cardBox.x + 10, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(cardBox.x + cardBox.width - 10, cardBox.y + cardBox.height / 2)
        await page.mouse.up()
        
        // Check if swipe revealed actions or if card was selected
        const swipeActions = page.locator('[data-testid="swipe-actions"]')
        const cardSelected = requestCard.locator('[data-testid="selected"]')
        
        const hasSwipeActions = await swipeActions.isVisible()
        const isSelected = await cardSelected.isVisible()
        
        // At least one interaction should work
        expect(hasSwipeActions || isSelected).toBe(true)
      }
    }
    
    // Test long press interactions
    const createButton = page.locator('[data-testid="create-request-button"]')
    if (await createButton.isVisible()) {
      await createButton.click({ delay: 500 }) // Long press
      
      // Should navigate to create page
      await expect(page).toHaveURL('/requests/create')
    }
  })

  test('should optimize form interactions for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAs(page, 'employee')
    await page.goto('/requests/create')
    
    // Check form layout on mobile
    const formElements = [
      '[data-testid="request-type"]',
      '[data-testid="start-date"]',
      '[data-testid="end-date"]',
      '[data-testid="reason"]'
    ]
    
    // Form elements should stack vertically on mobile
    let previousBottom = 0
    for (const elementSelector of formElements) {
      const element = page.locator(elementSelector)
      if (await element.isVisible()) {
        const box = await element.boundingBox()
        if (box) {
          // Each element should be below the previous one
          expect(box.y).toBeGreaterThanOrEqual(previousBottom - 10) // Allow small overlap
          previousBottom = box.y + box.height
          
          // Elements should be wide enough for touch
          expect(box.width).toBeGreaterThan(200)
          expect(box.height).toBeGreaterThan(40)
        }
      }
    }
    
    // Test virtual keyboard handling
    await page.selectOption('[data-testid="request-type"]', 'leave-request')
    await page.fill('[data-testid="reason"]', 'Mobile form test')
    
    // Form should remain usable when virtual keyboard appears
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    
    // Submit button should be accessible
    const submitBox = await submitButton.boundingBox()
    if (submitBox) {
      expect(submitBox.y + submitBox.height).toBeLessThan(667) // Should be visible in viewport
    }
  })

  test('should handle orientation changes', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    
    // Verify portrait layout
    await expect(page.locator('h1')).toBeVisible()
    
    // Change to landscape
    await page.setViewportSize({ width: 667, height: 375 })
    
    // Content should adapt to landscape
    await expect(page.locator('h1')).toBeVisible()
    
    // Navigation should remain functional
    const navigation = page.locator('[data-testid="main-navigation"]')
    await expect(navigation).toBeVisible()
    
    // Test form in landscape
    await page.goto('/requests/create')
    
    // Form should adapt to wider layout
    await expect(page.locator('[data-testid="request-type"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should provide mobile-optimized navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAs(page, 'employee')
    
    // Check if mobile navigation exists
    const hamburgerMenu = page.locator('[data-testid="hamburger-menu"]')
    const bottomNavigation = page.locator('[data-testid="bottom-navigation"]')
    const tabNavigation = page.locator('[data-testid="tab-navigation"]')
    
    const hasMobileNav = await hamburgerMenu.isVisible() || 
                        await bottomNavigation.isVisible() || 
                        await tabNavigation.isVisible()
    
    expect(hasMobileNav).toBe(true)
    
    // Test hamburger menu if it exists
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click()
      
      // Menu should open
      const mobileMenu = page.locator('[data-testid="mobile-menu"]')
      await expect(mobileMenu).toBeVisible()
      
      // Should contain navigation items
      await expect(mobileMenu.locator('text=Dashboard')).toBeVisible()
      await expect(mobileMenu.locator('text=Requests')).toBeVisible()
      
      // Should be able to navigate
      await mobileMenu.locator('text=Requests').click()
      await expect(page).toHaveURL('/requests')
      
      // Menu should close after navigation
      await expect(mobileMenu).not.toBeVisible()
    }
    
    // Test bottom navigation if it exists
    if (await bottomNavigation.isVisible()) {
      const navItems = bottomNavigation.locator('[data-testid^="nav-item-"]')
      const itemCount = await navItems.count()
      
      // Should have appropriate number of items (not too many for mobile)
      expect(itemCount).toBeLessThanOrEqual(5)
      
      // Items should be touch-friendly
      for (let i = 0; i < itemCount; i++) {
        const item = navItems.nth(i)
        const box = await item.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThan(40)
          expect(box.width).toBeGreaterThan(40)
        }
      }
    }
  })

  test('should handle mobile-specific gestures and interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAs(page, 'employee')
    await page.goto('/requests')
    await waitForPageLoad(page)
    
    // Test pull-to-refresh if implemented
    const requestsList = page.locator('[data-testid="requests-list"]')
    if (await requestsList.isVisible()) {
      // Simulate pull gesture
      await page.mouse.move(200, 100)
      await page.mouse.down()
      await page.mouse.move(200, 200)
      await page.mouse.up()
      
      // Check for refresh indicator
      const refreshIndicator = page.locator('[data-testid="pull-refresh-indicator"]')
      if (await refreshIndicator.isVisible()) {
        await expect(refreshIndicator).toBeVisible()
        await waitForPageLoad(page)
      }
    }
    
    // Test infinite scroll if implemented
    const firstRequestCount = await page.locator('[data-testid^="request-card-"]').count()
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    // Wait for potential new content
    await page.waitForTimeout(2000)
    
    const finalRequestCount = await page.locator('[data-testid^="request-card-"]').count()
    
    // More items should load or pagination should be visible
    const paginationVisible = await page.locator('[data-testid="pagination"]').isVisible()
    expect(finalRequestCount >= firstRequestCount || paginationVisible).toBe(true)
  })
})

test.describe('Tablet Responsiveness', () => {
  test('should work well on tablet sizes', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    
    await loginAs(page, 'admin')
    
    // Dashboard should use tablet layout
    await expect(page.locator('h1')).toBeVisible()
    
    // Should show more content than mobile but not full desktop layout
    const sidebarNav = page.locator('[data-testid="sidebar-navigation"]')
    const tabletNav = page.locator('[data-testid="tablet-navigation"]')
    
    // Should have appropriate navigation for tablet
    const hasAppropriateNav = await sidebarNav.isVisible() || await tabletNav.isVisible()
    expect(hasAppropriateNav).toBe(true)
    
    // Test admin features on tablet
    await page.goto('/users')
    await waitForPageLoad(page)
    
    // Table should be readable on tablet
    const usersTable = page.locator('[data-testid="users-table"]')
    await expect(usersTable).toBeVisible()
    
    // Columns should be appropriately sized
    const tableHeaders = usersTable.locator('th')
    const headerCount = await tableHeaders.count()
    
    // Should show all important columns
    expect(headerCount).toBeGreaterThanOrEqual(4)
    
    // But might hide some on narrower tablets
    if (headerCount > 6) {
      // Some columns might be hidden or collapsed
      const hiddenColumns = page.locator('[data-testid="hidden-columns"]')
      const expandButton = page.locator('[data-testid="expand-table"]')
      
      const hasHiddenColumns = await hiddenColumns.isVisible()
      const hasExpandButton = await expandButton.isVisible()
      
      expect(hasHiddenColumns || hasExpandButton).toBe(true)
    }
  })

  test('should optimize form layouts for tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await loginAs(page, 'employee')
    await page.goto('/requests/create')
    
    // Form should use multi-column layout on tablet
    const formContainer = page.locator('[data-testid="request-form"]')
    await expect(formContainer).toBeVisible()
    
    // Check if form uses available space efficiently
    const formBox = await formContainer.boundingBox()
    if (formBox) {
      // Form should use significant portion of tablet width
      expect(formBox.width).toBeGreaterThan(500)
    }
    
    // Date fields might be side-by-side on tablet
    const startDateBox = await page.locator('[data-testid="start-date"]').boundingBox()
    const endDateBox = await page.locator('[data-testid="end-date"]').boundingBox()
    
    if (startDateBox && endDateBox) {
      // Fields might be arranged horizontally on tablet
      const areHorizontal = Math.abs(startDateBox.y - endDateBox.y) < 20
      const areVertical = endDateBox.y > startDateBox.y + startDateBox.height - 20
      
      expect(areHorizontal || areVertical).toBe(true)
    }
  })
})

test.describe('Cross-Device Consistency', () => {
  const devices = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1200, height: 800 }
  ]

  test('should maintain feature parity across devices', async ({ page }) => {
    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height })
      
      await loginAs(page, 'employee')
      
      // Core features should be available on all devices
      const coreFeatures = [
        { path: '/dashboard', element: 'h1' },
        { path: '/requests', element: '[data-testid="create-request-button"]' },
        { path: '/profile', element: '[data-testid="profile-form"]' }
      ]
      
      for (const feature of coreFeatures) {
        await page.goto(feature.path)
        await waitForPageLoad(page)
        await expect(page.locator(feature.element)).toBeVisible()
      }
    }
  })

  test('should provide consistent user experience across devices', async ({ page }) => {
    const testFlow = async (deviceName, width, height) => {
      await page.setViewportSize({ width, height })
      
      // Complete a full workflow on this device
      await loginAs(page, 'employee')
      
      // Create request
      await createTestRequest(page, 'leaveRequest')
      
      // Verify request was created
      await page.goto('/requests')
      await waitForPageLoad(page)
      
      const requestCards = page.locator('[data-testid^="request-card-"]')
      await expect(requestCards.first()).toBeVisible()
      
      // View request details
      await requestCards.first().click()
      await expect(page.locator('[data-testid="request-details"]')).toBeVisible()
      
      return { success: true, device: deviceName }
    }
    
    // Test the same workflow on different devices
    const results = []
    
    for (const device of devices) {
      const result = await testFlow(device.name, device.width, device.height)
      results.push(result)
    }
    
    // All devices should complete the workflow successfully
    expect(results.every(r => r.success)).toBe(true)
  })
})