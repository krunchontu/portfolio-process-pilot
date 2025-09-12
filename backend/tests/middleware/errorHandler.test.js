const { AppError, globalErrorHandler, catchAsync } = require('../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      originalUrl: '/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });
  
  describe('AppError', () => {
    it('should create operational error with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });
    
    it('should create error without code', () => {
      const error = new AppError('Test error', 500);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(null);
      expect(error.isOperational).toBe(true);
    });
  });
  
  describe('globalErrorHandler', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    
    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });
    
    it('should handle operational errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Test operational error', 400, 'TEST_ERROR');
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test operational error',
        code: 'TEST_ERROR',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
    
    it('should handle non-operational errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Database connection failed');
      error.statusCode = 500;
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong!',
        code: 'INTERNAL_ERROR',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
    
    it('should handle errors in test environment', () => {
      // In test environment, it should handle errors similar to production
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        code: 'TEST_ERROR',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
    
    it('should handle JWT errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
    
    it('should handle expired token errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
    
    it('should handle database unique violation', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Duplicate key');
      error.code = '23505';
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });
  
  describe('catchAsync', () => {
    it('should catch and forward async errors', async () => {
      const asyncFunction = catchAsync(async (req, res, next) => {
        throw new Error('Async error');
      });
      
      await asyncFunction(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Async error');
    });
    
    it('should call next normally for successful async function', async () => {
      const asyncFunction = catchAsync(async (req, res, next) => {
        res.json({ success: true });
      });
      
      await asyncFunction(req, res, next);
      
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });
  });
});