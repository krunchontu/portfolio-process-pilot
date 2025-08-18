const jwt = require('jsonwebtoken');
const { 
  generateToken, 
  generateRefreshToken, 
  authenticateToken, 
  requireRole 
} = require('../../src/middleware/auth');
const config = require('../../src/config');

describe('Auth Middleware', () => {
  let testUser;
  
  beforeEach(async () => {
    testUser = await testUtils.createTestUser({
      email: 'auth@example.com',
      role: 'employee'
    });
  });
  
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role
      };
      
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });
  
  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = {
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role
      };
      
      const refreshToken = generateRefreshToken(payload);
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      expect(decoded.userId).toBe(payload.userId);
    });
  });
  
  describe('authenticateToken', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });
    
    it('should authenticate valid token', async () => {
      const token = testUtils.generateTestToken(testUser);
      req.headers.authorization = `Bearer ${token}`;
      
      await authenticateToken(req, res, next);
      
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(req.user.email).toBe(testUser.email);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should reject request without token', async () => {
      await authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      await authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        config.jwt.secret,
        { expiresIn: '0s' } // Immediate expiration
      );
      
      req.headers.authorization = `Bearer ${expiredToken}`;
      
      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    });
    
    it('should reject token for inactive user', async () => {
      // Deactivate user
      const User = require('../../src/models/User');
      await User.update(testUser.id, { is_active: false });
      
      const token = testUtils.generateTestToken(testUser);
      req.headers.authorization = `Bearer ${token}`;
      
      await authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    });
  });
  
  describe('requireRole', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = {
        user: testUser
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });
    
    it('should allow access for correct role', async () => {
      const middleware = requireRole('employee');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should allow access for multiple valid roles', async () => {
      const middleware = requireRole('employee', 'manager');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should reject access for incorrect role', async () => {
      const middleware = requireRole('admin');
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Required roles: admin',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject when user is not authenticated', async () => {
      req.user = null;
      const middleware = requireRole('employee');
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    });
  });
});