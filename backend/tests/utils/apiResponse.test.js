const { 
  success,
  error,
  created,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  internalError,
  tooManyRequests
} = require('../../src/utils/apiResponse');

describe('API Response Utilities', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('success', () => {
    it('should send success response with default values', () => {
      success(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation successful',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });

    it('should send success response with custom data and message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Data retrieved successfully';

      success(res, 200, message, data);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        data,
        meta: {
          timestamp: expect.any(String)
        }
      });
    });

    it('should include custom meta data', () => {
      const meta = { pagination: { total: 10 } };

      success(res, 200, 'Success', null, meta);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        meta: {
          timestamp: expect.any(String),
          pagination: { total: 10 }
        }
      });
    });
  });

  describe('error', () => {
    it('should send error response with default values', () => {
      error(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'An error occurred',
        code: 'INTERNAL_ERROR',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });

    it('should send error response with custom values', () => {
      const message = 'Custom error';
      const code = 'CUSTOM_ERROR';
      const details = { field: 'value' };

      error(res, 400, message, code, details);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        code,
        details,
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('created', () => {
    it('should send 201 created response', () => {
      const data = { id: 1 };

      created(res, 'Resource created', data);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource created',
        data,
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('tooManyRequests', () => {
    it('should send 429 too many requests response', () => {
      const message = 'Rate limit exceeded';

      tooManyRequests(res, message);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('unauthorized', () => {
    it('should send 401 unauthorized response', () => {
      unauthorized(res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('forbidden', () => {
    it('should send 403 forbidden response', () => {
      forbidden(res, 'Access denied');

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('notFound', () => {
    it('should send 404 not found response', () => {
      notFound(res, 'User', '123');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User with identifier \'123\' not found',
        code: 'RESOURCE_NOT_FOUND',
        details: {
          resource: 'User',
          identifier: '123'
        },
        meta: {
          timestamp: expect.any(String)
        }
      });
    });

    it('should send generic not found response without identifier', () => {
      notFound(res, 'User');

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        code: 'RESOURCE_NOT_FOUND',
        details: {
          resource: 'User',
          identifier: null
        },
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('conflict', () => {
    it('should send 409 conflict response', () => {
      const details = { field: 'email', value: 'test@test.com' };

      conflict(res, 'Email already exists', details);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email already exists',
        code: 'CONFLICT',
        details,
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('validationError', () => {
    it('should send validation error with array of errors', () => {
      const errors = ['Field is required', 'Email is invalid'];

      validationError(res, errors);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          validation_errors: errors
        },
        meta: {
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle single error string', () => {
      const error = 'Field is required';

      validationError(res, error);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          validation_errors: [error]
        },
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('internalError', () => {
    it('should send 500 internal server error response', () => {
      internalError(res, 'Database connection failed');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed',
        code: 'INTERNAL_ERROR',
        meta: {
          timestamp: expect.any(String)
        }
      });
    });
  });
});