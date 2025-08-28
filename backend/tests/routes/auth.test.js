const request = require('supertest');
const { app } = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    let testUser;
    
    beforeEach(async () => {
      testUser = await testUtils.createTestUser({
        email: 'login@example.com',
        password: 'password123'
      });
    });
    
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.password_hash).toBeUndefined();
      // Tokens should not be in response body (cookie-based auth)
      expect(response.body.tokens).toBeUndefined();
      // Check that cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('access_token'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('refresh_token'))).toBe(true);
    });
    
    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
    
    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
    
    it('should reject deactivated user', async () => {
      await User.update(testUser.id, { is_active: false });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Account is deactivated');
      expect(response.body.code).toBe('ACCOUNT_DEACTIVATED');
    });
    
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          // missing password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('POST /api/auth/register', () => {
    it('should register new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        department: 'IT'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe('employee'); // default role
      expect(response.body.user.password_hash).toBeUndefined();
    });
    
    it('should reject duplicate email', async () => {
      await testUtils.createTestUser({
        email: 'duplicate@example.com'
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          first_name: 'Duplicate',
          last_name: 'User'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User with this email already exists');
      expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });
    
    it('should validate registration data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // too short
          first_name: '', // empty
          last_name: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });
  });
  
  describe('GET /api/auth/me', () => {
    let testUser, authToken;
    
    beforeEach(async () => {
      testUser = await testUtils.createTestUser();
      authToken = testUtils.generateTestToken(testUser);
    });
    
    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.password_hash).toBeUndefined();
    });
    
    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('MISSING_TOKEN');
    });
  });
  
  describe('POST /api/auth/logout', () => {
    let authToken;
    
    beforeEach(async () => {
      const testUser = await testUtils.createTestUser();
      authToken = testUtils.generateTestToken(testUser);
    });
    
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
  
  describe('POST /api/auth/change-password', () => {
    let testUser, authToken;
    
    beforeEach(async () => {
      testUser = await testUtils.createTestUser({
        password: 'oldpassword123'
      });
      authToken = testUtils.generateTestToken(testUser);
    });
    
    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          current_password: 'oldpassword123',
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');
      
      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'newpassword123'
        });
      
      expect(loginResponse.status).toBe(200);
    });
    
    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          current_password: 'wrongpassword',
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Current password is incorrect');
      expect(response.body.code).toBe('INVALID_CURRENT_PASSWORD');
    });
    
    it('should validate new password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          current_password: 'oldpassword123',
          new_password: '123' // too short
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('New password must be at least 8 characters long');
      expect(response.body.code).toBe('PASSWORD_TOO_SHORT');
    });
  });
});