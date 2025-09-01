const request = require('supertest')
const { app } = require('../../src/app')
const User = require('../../src/models/User')
const { testDbManager, testUtils } = require('../../src/test-utils/dbSetup')

describe('Cookie Authentication Security Tests', () => {
  let testUser
  let agent

  beforeAll(async () => {
    await testUtils.setupTestDb()
  })

  beforeEach(async () => {
    await testUtils.cleanupTestDb()
    
    // Create test user
    testUser = await testUtils.createTestUser({
      email: 'security@example.com',
      password: 'password123',
      role: 'employee'
    })

    // Create persistent agent for cookie handling
    agent = request.agent(app)
  })

  afterAll(async () => {
    await testUtils.teardownTestDb()
  })

  describe('HttpOnly Cookie Security', () => {
    it('should set httpOnly cookies on login', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123'
        })

      expect(response.status).toBe(200)
      
      // Check Set-Cookie headers
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      
      const accessTokenCookie = cookies.find(cookie => cookie.includes('access_token'))
      const refreshTokenCookie = cookies.find(cookie => cookie.includes('refresh_token'))
      
      expect(accessTokenCookie).toContain('HttpOnly')
      expect(refreshTokenCookie).toContain('HttpOnly')
      expect(accessTokenCookie).toContain('SameSite=Strict')
      expect(refreshTokenCookie).toContain('SameSite=Strict')
    })

    it('should not return tokens in response body', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123'
        })

      expect(response.status).toBe(200)
      expect(response.body.tokens).toBeUndefined()
      expect(response.body.access_token).toBeUndefined()
      expect(response.body.refresh_token).toBeUndefined()
    })

    it('should authenticate subsequent requests with cookies', async () => {
      // Login to set cookies
      await agent
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123'
        })

      // Make authenticated request using cookies
      const response = await agent.get('/api/auth/me')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.user.email).toBe('security@example.com')
    })

    it('should reject requests without cookies', async () => {
      // Direct request without login/cookies
      const response = await request(app).get('/api/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('Token Refresh Security', () => {
    it('should refresh tokens using cookies only', async () => {
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123'
        })

      // Call refresh endpoint
      const refreshResponse = await agent.post('/api/auth/refresh')

      expect(refreshResponse.status).toBe(200)
      expect(refreshResponse.body.success).toBe(true)
      expect(refreshResponse.body.access_token).toBeUndefined() // No tokens in body
      
      // Check new cookies were set
      const cookies = refreshResponse.headers['set-cookie']
      expect(cookies).toBeDefined()
      
      const accessTokenCookie = cookies.find(cookie => cookie.includes('access_token'))
      expect(accessTokenCookie).toContain('HttpOnly')
    })

    it('should reject refresh without cookies', async () => {
      const response = await request(app).post('/api/auth/refresh')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Refresh token required')
    })

    it('should not accept refresh token in request body', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'fake-token' })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Refresh token required')
    })
  })

  describe('CSRF Protection', () => {
    let csrfToken

    beforeEach(async () => {
      // Login and get CSRF token
      await agent
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123'
        })

      // Get CSRF token from a GET request
      const getResponse = await agent.get('/api/auth/me')
      csrfToken = getResponse.body.csrfToken
    })

    it('should include CSRF token in safe requests', async () => {
      const response = await agent.get('/api/requests')
      
      expect(response.status).toBe(200)
      expect(response.body.csrfToken).toBeDefined()
    })

    it('should require CSRF token for unsafe requests', async () => {
      const response = await agent
        .post('/api/requests')
        .send({
          type: 'leave-request',
          payload: {
            startDate: '2024-12-01',
            endDate: '2024-12-02',
            reason: 'Test'
          }
        })

      // Should fail without CSRF token
      expect(response.status).toBe(403)
      expect(response.body.code).toBe('CSRF_TOKEN_MISSING')
    })

    it('should accept requests with valid CSRF token', async () => {
      const response = await agent
        .post('/api/requests')
        .set('X-CSRF-Token', csrfToken)
        .send({
          type: 'leave-request',
          payload: {
            startDate: '2024-12-01',
            endDate: '2024-12-02',
            reason: 'Test with CSRF'
          }
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })

  describe('Session Security', () => {
    it('should clear cookies on logout', async () => {
      // Login
      await agent
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123'
        })

      // Verify authenticated
      let authResponse = await agent.get('/api/auth/me')
      expect(authResponse.status).toBe(200)

      // Logout
      const logoutResponse = await agent.post('/api/auth/logout')
      expect(logoutResponse.status).toBe(200)

      // Check cookies are cleared
      const cookies = logoutResponse.headers['set-cookie']
      expect(cookies).toBeDefined()
      
      const accessTokenCookie = cookies.find(cookie => cookie.includes('access_token'))
      const refreshTokenCookie = cookies.find(cookie => cookie.includes('refresh_token'))
      
      // Cookies should be cleared (Max-Age=0)
      expect(accessTokenCookie).toContain('Max-Age=0')
      expect(refreshTokenCookie).toContain('Max-Age=0')

      // Subsequent requests should fail
      authResponse = await agent.get('/api/auth/me')
      expect(authResponse.status).toBe(401)
    })

    it('should handle expired tokens gracefully', async () => {
      // This would require mocking JWT with expired tokens
      // For now, we'll test the error handling path
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'access_token=invalid.jwt.token')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/api/health')

      // Check for security headers set by helmet middleware
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBe('0')
    })

    it('should set proper CORS headers for authenticated requests', async () => {
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123'
        })

      const response = await agent.get('/api/auth/me')

      expect(response.headers['access-control-allow-credentials']).toBe('true')
    })
  })

  describe('Rate Limiting Security', () => {
    it('should rate limit login attempts', async () => {
      const promises = []
      
      // Make multiple rapid login attempts
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        )
      }

      const responses = await Promise.all(promises)
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })
})