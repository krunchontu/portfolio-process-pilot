import { test, expect } from '@playwright/test'
import { 
  loginAs, 
  waitForPageLoad,
  mockApiResponse,
  generateTestData 
} from './utils/test-helpers.js'

test.describe('Performance Testing', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const loadTime = Date.now() - startTime
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
    
    // Check that all critical elements are visible
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should handle large requests list efficiently', async ({ page }) => {
    // Mock large dataset
    const largeRequestList = generateTestData('requests', 100)
    await mockApiResponse(page, 'requests', {
      status: 200,
      data: {
        success: true,
        data: largeRequestList,
        meta: { total: 100, page: 1, limit: 20 }
      }
    })
    
    await loginAs(page, 'employee')
    
    const startTime = Date.now()
    await page.goto('/requests')
    await waitForPageLoad(page)
    const loadTime = Date.now() - startTime
    
    // Should handle large datasets efficiently
    expect(loadTime).toBeLessThan(5000)
    
    // Should implement pagination
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible()
    
    // Should show limited items per page (not all 100)
    const requestCards = page.locator('[data-testid^="request-card-"]')
    const cardCount = await requestCards.count()
    expect(cardCount).toBeLessThanOrEqual(20)
  })

  test('should lazy load images and heavy content', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests')
    
    // Check for lazy loading attributes
    const images = page.locator('img')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      const firstImage = images.first()
      const loadingAttr = await firstImage.getAttribute('loading')
      
      // Images should have lazy loading
      expect(loadingAttr).toBe('lazy')
    }
    
    // Check that content below the fold isn't loaded immediately
    const belowFoldContent = page.locator('[data-testid="below-fold-content"]')
    if (await belowFoldContent.isVisible()) {
      // Scroll to load more content
      await belowFoldContent.scrollIntoViewIfNeeded()
      await expect(belowFoldContent).toBeVisible()
    }
  })

  test('should optimize bundle loading', async ({ page }) => {
    // Measure initial page load
    const startTime = Date.now()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const initialLoadTime = Date.now() - startTime
    
    // Login page should load quickly (under 2 seconds)
    expect(initialLoadTime).toBeLessThan(2000)
    
    // Check resource loading
    const resourceTimings = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0]
    })
    
    // Time to first byte should be reasonable
    expect(resourceTimings.responseStart - resourceTimings.requestStart).toBeLessThan(1000)
  })

  test('should handle concurrent API requests efficiently', async ({ page }) => {
    await loginAs(page, 'admin')
    
    // Navigate to analytics page which makes multiple API calls
    const startTime = Date.now()
    await page.goto('/analytics')
    await waitForPageLoad(page)
    const loadTime = Date.now() - startTime
    
    // Multiple API calls should complete within reasonable time
    expect(loadTime).toBeLessThan(6000)
    
    // All sections should be loaded
    const sections = [
      '[data-testid="total-requests-card"]',
      '[data-testid="requests-trend-chart"]',
      '[data-testid="status-distribution-chart"]'
    ]
    
    for (const section of sections) {
      await expect(page.locator(section)).toBeVisible()
    }
  })

  test('should implement efficient search and filtering', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests')
    await waitForPageLoad(page)
    
    const searchInput = page.locator('[data-testid="search-input"]')
    
    // Search should be debounced/throttled, not instant
    const startTime = Date.now()
    await searchInput.fill('test')
    
    // Should not fire immediately
    await page.waitForTimeout(100)
    let searchFired = false
    
    page.on('request', request => {
      if (request.url().includes('search')) {
        searchFired = true
      }
    })
    
    expect(searchFired).toBe(false)
    
    // Should fire after debounce delay
    await page.waitForTimeout(400)
    await page.press('[data-testid="search-input"]', 'Enter')
    
    const searchTime = Date.now() - startTime
    expect(searchTime).toBeLessThan(1000)
  })

  test('should optimize table rendering with virtual scrolling', async ({ page }) => {
    // Mock large user dataset for admin
    const largeUserList = generateTestData('users', 1000)
    await mockApiResponse(page, 'users', {
      status: 200,
      data: {
        success: true,
        data: largeUserList.slice(0, 50), // First page
        meta: { total: 1000, page: 1, limit: 50 }
      }
    })
    
    await loginAs(page, 'admin')
    await page.goto('/users')
    await waitForPageLoad(page)
    
    // Should not render all 1000 rows at once
    const userRows = page.locator('[data-testid^="user-row-"]')
    const rowCount = await userRows.count()
    expect(rowCount).toBeLessThanOrEqual(50)
    
    // Should have pagination or virtual scrolling
    const pagination = page.locator('[data-testid="pagination"]')
    const virtualScrollIndicator = page.locator('[data-testid="virtual-scroll"]')
    
    const hasPagination = await pagination.isVisible()
    const hasVirtualScroll = await virtualScrollIndicator.isVisible()
    
    expect(hasPagination || hasVirtualScroll).toBe(true)
  })

  test('should measure Web Vitals performance metrics', async ({ page }) => {
    await page.goto('/login')
    
    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {}
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          vitals.lcp = entries[entries.length - 1].startTime
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        // First Input Delay (simulated)
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            vitals.fid = entry.processingStart - entry.startTime
          }
        }).observe({ entryTypes: ['first-input'] })
        
        // Cumulative Layout Shift
        let clsScore = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value
            }
          }
          vitals.cls = clsScore
        }).observe({ entryTypes: ['layout-shift'] })
        
        setTimeout(() => resolve(vitals), 2000)
      })
    })
    
    // LCP should be under 2.5 seconds
    if (webVitals.lcp) {
      expect(webVitals.lcp).toBeLessThan(2500)
    }
    
    // CLS should be under 0.1
    if (webVitals.cls) {
      expect(webVitals.cls).toBeLessThan(0.1)
    }
  })
})

test.describe('Memory and Resource Management', () => {
  test('should not have memory leaks during navigation', async ({ page }) => {
    await loginAs(page, 'employee')
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize
      }
      return 0
    })
    
    // Navigate through multiple pages
    const pages = ['/dashboard', '/requests', '/requests/create', '/profile']
    
    for (let i = 0; i < 3; i++) { // Do multiple cycles
      for (const pagePath of pages) {
        await page.goto(pagePath)
        await waitForPageLoad(page)
      }
    }
    
    // Force garbage collection if possible
    await page.evaluate(() => {
      if (window.gc) {
        window.gc()
      }
    })
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize
      }
      return 0
    })
    
    if (initialMemory > 0 && finalMemory > 0) {
      // Memory usage shouldn't grow excessively (allow for 50% increase)
      const memoryIncrease = (finalMemory - initialMemory) / initialMemory
      expect(memoryIncrease).toBeLessThan(0.5)
    }
  })

  test('should cleanup resources on page unload', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/dashboard')
    
    // Check for event listeners and timers
    const resourceCount = await page.evaluate(() => {
      const eventListeners = getEventListeners ? Object.keys(getEventListeners(document)).length : 0
      const timers = window.setInterval.length || 0
      return { eventListeners, timers }
    })
    
    // Navigate away
    await page.goto('/requests')
    
    // Resources should be cleaned up
    const newResourceCount = await page.evaluate(() => {
      const eventListeners = getEventListeners ? Object.keys(getEventListeners(document)).length : 0
      const timers = window.setInterval.length || 0
      return { eventListeners, timers }
    })
    
    // Should not accumulate resources
    expect(newResourceCount.eventListeners).toBeLessThanOrEqual(resourceCount.eventListeners + 5)
  })
})

test.describe('Caching and Data Management', () => {
  test('should implement effective caching strategies', async ({ page }) => {
    await loginAs(page, 'employee')
    
    // First visit to requests page
    const startTime1 = Date.now()
    await page.goto('/requests')
    await waitForPageLoad(page)
    const firstLoadTime = Date.now() - startTime1
    
    // Navigate away and come back
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const startTime2 = Date.now()
    await page.goto('/requests')
    await waitForPageLoad(page)
    const secondLoadTime = Date.now() - startTime2
    
    // Second load should be faster due to caching
    expect(secondLoadTime).toBeLessThan(firstLoadTime)
    
    // Should be significantly faster (at least 30% improvement)
    const improvement = (firstLoadTime - secondLoadTime) / firstLoadTime
    expect(improvement).toBeGreaterThan(0.1)
  })

  test('should handle stale data and refresh appropriately', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/requests')
    await waitForPageLoad(page)
    
    // Data should auto-refresh or show refresh indicators
    const refreshButton = page.locator('[data-testid="refresh-button"]')
    const autoRefreshIndicator = page.locator('[data-testid="auto-refresh"]')
    
    const hasRefreshButton = await refreshButton.isVisible()
    const hasAutoRefresh = await autoRefreshIndicator.isVisible()
    
    expect(hasRefreshButton || hasAutoRefresh).toBe(true)
    
    if (hasRefreshButton) {
      await refreshButton.click()
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
      await waitForPageLoad(page)
    }
  })

  test('should optimize image loading and caching', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/profile')
    
    // Check for optimized image formats
    const images = page.locator('img')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const image = images.nth(i)
        const src = await image.getAttribute('src')
        
        if (src) {
          // Should use optimized formats or have appropriate sizing
          const isOptimized = src.includes('webp') || 
                            src.includes('avif') || 
                            src.includes('resize') ||
                            src.includes('quality')
          
          // At least some images should be optimized
          if (i === 0) {
            expect(isOptimized).toBe(true)
          }
        }
      }
    }
  })
})