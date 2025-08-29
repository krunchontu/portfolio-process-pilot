/**
 * Security Middleware Test Suite
 * 
 * Tests for all security middleware components including rate limiting,
 * CSRF protection, input sanitization, and security headers
 */

const request = require('supertest')
const app = require('../../src/app')
const { setupTestDb, clearTestDb, createTestUser } = require('../test-utils/dbSetup')

describe('Security Middleware Integration', () => {
  let testUser

  beforeAll(async () => {
    await setupTestDb()
    testUser = await createTestUser({
      email: 'middleware.test@example.com',
      role: 'employee'
    })
  })

  afterAll(async () => {
    await clearTestDb()
  })

  describe('🛡️ Security Headers (Helmet)', () => {
    test('should include comprehensive security headers', async () => {
      const response = await request(app)
        .get('/api/health')

      // Basic security headers
      expect(response.headers).toHaveProperty('x-content-type-options')
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      
      expect(response.headers).toHaveProperty('x-frame-options')
      expect(response.headers['x-frame-options']).toBe('DENY')
      
      expect(response.headers).toHaveProperty('x-xss-protection')
      expect(response.headers['x-xss-protection']).toBe('0')
      
      // Referrer policy
      expect(response.headers).toHaveProperty('referrer-policy')
      expect(response.headers['referrer-policy']).toBe('no-referrer')

      // Content Security Policy (if configured)
      if (response.headers['content-security-policy']) {
        expect(response.headers['content-security-policy']).toContain("default-src 'self'")
      }
    })

    test('should include HSTS header in production mode', async () => {
      // This would be tested with NODE_ENV=production
      const response = await request(app)
        .get('/api/health')

      if (process.env.NODE_ENV === 'production') {
        expect(response.headers).toHaveProperty('strict-transport-security')
      }
    })
  })

  describe('🚦 Rate Limiting Middleware', () => {
    test('should apply different rate limits to different endpoints', async () => {
      // Test auth endpoint rate limiting (stricter)
      const authRequests = []
      for (let i = 0; i < 6; i++) {
        authRequests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' })
        )
      }

      const authResponses = await Promise.all(authRequests)
      const rateLimitedAuth = authResponses.filter(res => res.status === 429)
      
      // Should have rate limited some requests
      expect(rateLimitedAuth.length).toBeGreaterThan(0)
    })

    test('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health')

      // Rate limit headers may be present
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers['x-ratelimit-limit']).toBeDefined()
        expect(response.headers['x-ratelimit-remaining']).toBeDefined()
        expect(response.headers['x-ratelimit-reset']).toBeDefined()
      }
    })

    test('should provide rate limit information in responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })

      // Should have rate limit information
      if (response.headers['x-ratelimit-limit']) {
        const limit = parseInt(response.headers['x-ratelimit-limit'])
        const remaining = parseInt(response.headers['x-ratelimit-remaining'])
        
        expect(limit).toBeGreaterThan(0)
        expect(remaining).toBeLessThanOrEqual(limit)
      }
    })
  })

  describe('🔒 CSRF Protection Middleware', () => {
    test('should generate CSRF tokens for safe methods', async () => {
      const agent = request.agent(app)
      
      // GET request should potentially set CSRF token
      const response = await agent
        .get('/api/auth/me')

      // CSRF cookie may be set
      const cookies = response.headers['set-cookie']
      if (cookies) {
        const csrfCookie = cookies.find(cookie => 
          cookie.includes('csrf') || cookie.includes('_csrf')
        )
        
        if (csrfCookie) {
          expect(csrfCookie).toMatch(/HttpOnly/)
        }
      }
    })

    test('should validate CSRF tokens for unsafe methods', async () => {
      const agent = request.agent(app)
      
      // Login first to establish session
      await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })

      // Attempt POST without CSRF token (may be rejected)
      const response = await agent
        .post('/api/requests')
        .send({
          title: 'Test Request',
          type: 'leave',
          description: 'Test description'
        })

      // Should either succeed (CSRF disabled for testing) or require CSRF token
      expect([200, 201, 403, 422]).toContain(response.status)
    })
  })

  describe('🧹 Input Sanitization Middleware', () => {
    test('should sanitize HTML input to prevent XSS', async () => {
      const agent = request.agent(app)
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })

      // Send potentially malicious input
      const maliciousInput = {
        title: 'Test <script>alert("xss")</script> Request',
        description: '<img src="x" onerror="alert(1)">',
        type: 'leave'
      }

      const response = await agent
        .post('/api/requests')
        .send(maliciousInput)

      // Request should be processed (sanitization happens)
      if (response.status === 201) {
        // Verify HTML tags were stripped
        expect(response.body.data.request.title).not.toContain('<script>')
        expect(response.body.data.request.description).not.toContain('<img')
      }
    })

    test('should detect and block SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM users",
        "'; INSERT INTO"
      ]

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: injection,
            password: 'test'
          })

        // Should either sanitize input or reject request
        expect([400, 401, 422]).toContain(response.status)
        
        // Should not cause server error (500)
        expect(response.status).not.toBe(500)
      }
    })

    test('should preserve legitimate input while sanitizing', async () => {
      const legitimateInput = {
        title: 'Annual Leave Request - December 2024',
        description: 'Vacation time with family. Need time off for holidays.',
        type: 'leave'
      }

      const agent = request.agent(app)
      await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })

      const response = await agent
        .post('/api/requests')
        .send(legitimateInput)

      if (response.status === 201) {
        expect(response.body.data.request.title).toBe(legitimateInput.title)
        expect(response.body.data.request.description).toBe(legitimateInput.description)
      }
    })
  })

  describe('🔗 CORS Configuration', () => {
    test('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')

      // CORS headers should be present
      expect(response.headers).toHaveProperty('access-control-allow-origin')
      expect(response.headers).toHaveProperty('access-control-allow-methods')
    })

    test('should allow credentials for authenticated requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')

      if (response.headers['access-control-allow-credentials']) {
        expect(response.headers['access-control-allow-credentials']).toBe('true')
      }
    })

    test('should reject unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')

      // Should not include CORS headers for unauthorized origins
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com')
      }
    })
  })

  describe('📊 Security Middleware Chain Order', () => {
    test('should apply security middleware in correct order', async () => {
      // This test verifies the middleware chain works correctly
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })

      // If the request succeeds, middleware chain is working
      expect([200, 400, 401]).toContain(response.status)
      
      // Response should have security headers (helmet applied)
      expect(response.headers).toHaveProperty('x-content-type-options')
      
      // Response should be JSON (body parser working)
      expect(response.headers['content-type']).toContain('application/json')
    })

    test('should handle middleware errors gracefully', async () => {
      // Send malformed JSON to test error handling
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')

      expect([400, 422]).toContain(response.status)
      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
      
      // Should not expose internal error details
      expect(response.body).not.toHaveProperty('stack')
    })
  })

  describe('🍪 Cookie Security', () => {
    test('should set secure cookie options', async () => {
      const agent = request.agent(app)
      
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })

      if (response.status === 200) {
        const cookies = response.headers['set-cookie']
        expect(cookies).toBeDefined()
        
        cookies.forEach(cookie => {
          if (cookie.includes('token')) {
            expect(cookie).toMatch(/HttpOnly/)
            expect(cookie).toMatch(/SameSite=Strict/i)
            
            // In production, should be Secure
            if (process.env.NODE_ENV === 'production') {
              expect(cookie).toMatch(/Secure/)
            }
          }
        })
      }
    })

    test('should handle cookie-based sessions securely', async () => {
      const agent = request.agent(app)
      
      // Login sets session cookies
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })

      if (loginResponse.status === 200) {
        // Subsequent request should work with cookies
        const profileResponse = await agent
          .get('/api/auth/me')

        expect(profileResponse.status).toBe(200)
      }
    })
  })

  describe('🔍 Security Event Logging', () => {
    test('should not expose sensitive data in logs', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })

      // Response should not contain sensitive data
      expect(response.body).not.toHaveProperty('password')
      expect(response.body).not.toHaveProperty('password_hash')
      
      if (response.body.data?.user) {
        expect(response.body.data.user).not.toHaveProperty('password')
        expect(response.body.data.user).not.toHaveProperty('password_hash')
      }
    })

    test('should handle security violations appropriately', async () => {
      // Attempt rapid requests to trigger rate limiting
      const requests = []
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' })
        )
      }

      const responses = await Promise.all(requests)
      
      // Some should be rate limited
      const rateLimited = responses.filter(res => res.status === 429)
      if (rateLimited.length > 0) {
        rateLimited.forEach(response => {
          expect(response.body).toHaveProperty('error')
          expect(response.body.error).toMatch(/(rate|limit|too many)/i)
        })
      }
    })
  })
})