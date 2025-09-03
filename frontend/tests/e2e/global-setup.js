import { chromium } from '@playwright/test'

/**
 * Global setup for E2E tests
 * This runs once before all test files
 */
async function globalSetup() {
  console.log('🚀 Starting E2E test global setup...')

  // Launch browser for setup tasks
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Wait for backend to be ready
    const maxRetries = 30
    let retries = 0

    while (retries < maxRetries) {
      try {
        console.log(`⏳ Checking backend health (attempt ${retries + 1}/${maxRetries})...`)

        const response = await page.goto('http://localhost:5000/health', {
          waitUntil: 'networkidle',
          timeout: 3000
        })

        if (response && response.ok()) {
          console.log('✅ Backend is healthy and ready!')
          break
        }
      } catch (error) {
        console.log(`❌ Backend not ready: ${error.message}`)
      }

      retries++
      if (retries < maxRetries) {
        await page.waitForTimeout(2000) // Wait 2 seconds before retry
      }
    }

    if (retries >= maxRetries) {
      console.error('❌ Backend failed to become ready within timeout')
      throw new Error('Backend health check failed')
    }

    // Wait for frontend to be ready
    retries = 0
    while (retries < maxRetries) {
      try {
        console.log(`⏳ Checking frontend (attempt ${retries + 1}/${maxRetries})...`)

        const response = await page.goto('http://localhost:3000', {
          waitUntil: 'networkidle',
          timeout: 3000
        })

        if (response && response.ok()) {
          console.log('✅ Frontend is ready!')
          break
        }
      } catch (error) {
        console.log(`❌ Frontend not ready: ${error.message}`)
      }

      retries++
      if (retries < maxRetries) {
        await page.waitForTimeout(2000)
      }
    }

    if (retries >= maxRetries) {
      console.error('❌ Frontend failed to become ready within timeout')
      throw new Error('Frontend health check failed')
    }

    // Verify test users exist in database
    try {
      console.log('🔍 Verifying test users...')

      const testUsers = [
        { email: 'employee@test.com', role: 'employee' },
        { email: 'manager@test.com', role: 'manager' },
        { email: 'admin@test.com', role: 'admin' }
      ]

      for (const user of testUsers) {
        // Try to login with test user
        await page.goto('http://localhost:3000/login')
        await page.fill('input[type="email"]', user.email)
        await page.fill('input[type="password"]', 'password123')
        await page.click('button[type="submit"]')

        // Check if login was successful
        await page.waitForTimeout(2000)

        if (page.url().includes('/dashboard')) {
          console.log(`✅ Test user ${user.email} (${user.role}) is ready`)

          // Logout for next user test
          await page.click('[data-testid="user-menu"]', { timeout: 3000 }).catch(() => {
            // Menu might not be available, try direct logout
            console.log(`⚠️  Could not find user menu for ${user.email}, skipping logout`)
          })

          try {
            await page.click('text=Logout', { timeout: 2000 })
          } catch (error) {
            console.log(`⚠️  Could not logout ${user.email}: ${error.message}`)
            // Clear cookies to force logout
            await page.context().clearCookies()
          }
        } else {
          console.log(`⚠️  Test user ${user.email} login failed - user may need to be created`)
        }
      }

    } catch (error) {
      console.log(`⚠️  Test user verification failed: ${error.message}`)
      console.log('Tests will continue but may fail if users don\'t exist')
    }

    console.log('🎯 Global setup completed successfully!')

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
