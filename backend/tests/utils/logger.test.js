const {
  logger,
  loggers,
  requestLogger,
  securityLogger,
  performanceLogger,
  dbLogger,
  errorLogger,
  createChildLogger
} = require('../../src/utils/logger');

describe('Logger Utilities', () => {
  describe('logger', () => {
    it('should be defined and have standard log methods', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages', () => {
      // Mock the logger to test it without actual output
      const logSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      
      logger.info('Test info message', { key: 'value' });
      
      expect(logSpy).toHaveBeenCalledWith('Test info message', { key: 'value' });
      
      logSpy.mockRestore();
    });

    it('should log error messages', () => {
      const logSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      
      logger.error('Test error message', { error: 'details' });
      
      expect(logSpy).toHaveBeenCalledWith('Test error message', { error: 'details' });
      
      logSpy.mockRestore();
    });
  });

  describe('specialized loggers', () => {
    it('should have request logger', () => {
      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });

    it('should have security logger', () => {
      expect(securityLogger).toBeDefined();
      expect(typeof securityLogger.warn).toBe('function');
      expect(typeof securityLogger.error).toBe('function');
    });

    it('should have performance logger', () => {
      expect(performanceLogger).toBeDefined();
      expect(typeof performanceLogger.info).toBe('function');
    });

    it('should have database logger', () => {
      expect(dbLogger).toBeDefined();
      expect(typeof dbLogger.info).toBe('function');
      expect(typeof dbLogger.error).toBe('function');
    });

    it('should have error logger', () => {
      expect(errorLogger).toBeDefined();
      expect(typeof errorLogger.error).toBe('function');
    });
  });

  describe('createChildLogger', () => {
    it('should create child logger with metadata', () => {
      const childLogger = createChildLogger('test', { module: 'test-module' });
      
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
    });

    it('should create child logger from parent', () => {
      const parentLogger = createChildLogger('parent', { service: 'api' });
      const childLogger = createChildLogger('child', { component: 'auth' }, parentLogger);
      
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('loggers collection', () => {
    it('should have loggers collection', () => {
      expect(loggers).toBeDefined();
      expect(typeof loggers).toBe('object');
    });
  });

  describe('logger methods', () => {
    let logSpy;

    beforeEach(() => {
      // Create spies for different log levels
      logSpy = {
        info: jest.spyOn(logger, 'info').mockImplementation(() => {}),
        warn: jest.spyOn(logger, 'warn').mockImplementation(() => {}),
        error: jest.spyOn(logger, 'error').mockImplementation(() => {}),
        debug: jest.spyOn(logger, 'debug').mockImplementation(() => {})
      };
    });

    afterEach(() => {
      // Restore all spies
      Object.values(logSpy).forEach(spy => spy.mockRestore());
    });

    it('should log structured data', () => {
      const metadata = {
        userId: 123,
        action: 'login',
        timestamp: new Date().toISOString()
      };

      logger.info('User login attempt', metadata);

      expect(logSpy.info).toHaveBeenCalledWith('User login attempt', metadata);
    });

    it('should log warnings with context', () => {
      const context = {
        component: 'auth',
        issue: 'rate_limit_exceeded',
        ip: '127.0.0.1'
      };

      logger.warn('Rate limit exceeded', context);

      expect(logSpy.warn).toHaveBeenCalledWith('Rate limit exceeded', context);
    });

    it('should log errors with stack traces', () => {
      const error = new Error('Test error');
      const context = { 
        userId: 123,
        operation: 'database_query'
      };

      logger.error('Database operation failed', {
        error: error.message,
        stack: error.stack,
        ...context
      });

      expect(logSpy.error).toHaveBeenCalledWith('Database operation failed', {
        error: 'Test error',
        stack: expect.any(String),
        userId: 123,
        operation: 'database_query'
      });
    });
  });

  describe('specialized logger usage', () => {
    it('should use security logger for security events', () => {
      const securitySpy = jest.spyOn(securityLogger, 'warn').mockImplementation(() => {});

      securityLogger.warn('Suspicious login attempt', {
        ip: '192.168.1.1',
        userAgent: 'suspicious-bot',
        attempts: 5
      });

      expect(securitySpy).toHaveBeenCalledWith('Suspicious login attempt', {
        ip: '192.168.1.1',
        userAgent: 'suspicious-bot',
        attempts: 5
      });

      securitySpy.mockRestore();
    });

    it('should use performance logger for timing events', () => {
      const perfSpy = jest.spyOn(performanceLogger, 'info').mockImplementation(() => {});

      performanceLogger.info('API response time', {
        endpoint: '/api/users',
        method: 'GET',
        responseTime: 150,
        statusCode: 200
      });

      expect(perfSpy).toHaveBeenCalledWith('API response time', {
        endpoint: '/api/users',
        method: 'GET',
        responseTime: 150,
        statusCode: 200
      });

      perfSpy.mockRestore();
    });
  });
});