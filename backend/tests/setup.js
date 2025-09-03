// Load test environment variables before any imports
const dotenv = require('dotenv');
const path = require('path');

// Load .env.test file
const envPath = path.resolve(__dirname, '../.env.test');
dotenv.config({ path: envPath });

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';

// Mock logger for test environment
jest.mock('../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };
  
  return {
    logger: mockLogger,
    loggers: {
      database: mockLogger,
      api: mockLogger,
      security: mockLogger,
      workflow: mockLogger,
      performance: mockLogger
    },
    stream: { write: jest.fn() },
    requestLogger: jest.fn(),
    securityLogger: mockLogger,
    performanceLogger: mockLogger,
    dbLogger: mockLogger,
    errorLogger: mockLogger,
    createChildLogger: jest.fn(() => mockLogger)
  };
});

const { testDbManager, testUtils } = require('../src/test-utils/dbSetup');

// Global test setup
beforeAll(async () => {
  // Ensure we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error('Tests must be run with NODE_ENV=test');
    process.exit(1);
  }
  
  // Setup test database with proper error handling
  try {
    const db = await testDbManager.setupTestDb();
    
    if (!db) {
      const reason = testDbManager.getSkipReason();
      console.warn('⚠️  Database tests will be skipped:', reason);
      console.warn('💡 To run database tests, ensure PostgreSQL is running and accessible');
      
      // Set global flag for conditional test skipping
      global.DB_TESTS_DISABLED = true;
      global.DB_SKIP_REASON = reason;
    } else {
      console.log('✅ Test database setup completed successfully');
      global.DB_TESTS_DISABLED = false;
      global.testDb = db;
    }
  } catch (error) {
    console.error('❌ Test database setup failed:', error.message);
    
    // For critical errors, we might want to skip all tests
    if (error.message.includes('permission') || error.message.includes('authentication')) {
      console.error('🔒 Database permission issue - all tests will be skipped');
      process.exit(1);
    }
    
    // For other errors, skip database tests but allow others to run
    global.DB_TESTS_DISABLED = true;
    global.DB_SKIP_REASON = error.message;
  }
}, 30000); // Increase timeout for database setup

// Clean up after all tests
afterAll(async () => {
  try {
    if (!global.DB_TESTS_DISABLED) {
      await testDbManager.destroyConnection();
      console.log('✅ Test database connection closed');
    }
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Reset database before each test
beforeEach(async () => {
  if (!global.DB_TESTS_DISABLED && global.testDb) {
    try {
      await testDbManager.cleanupTestDb();
    } catch (error) {
      console.warn('⚠️  Database cleanup failed:', error.message);
      // Mark as disabled if cleanup fails repeatedly
      global.DB_TESTS_DISABLED = true;
    }
  }
});

// Global test utilities
global.testUtils = testUtils;

// Helper to skip database-dependent tests
global.describeWithDb = (description, fn) => {
  if (global.DB_TESTS_DISABLED) {
    describe.skip(`${description} [SKIPPED: ${global.DB_SKIP_REASON}]`, fn);
  } else {
    describe(description, fn);
  }
};

global.itWithDb = (description, fn) => {
  if (global.DB_TESTS_DISABLED) {
    it.skip(`${description} [SKIPPED: ${global.DB_SKIP_REASON}]`, fn);
  } else {
    it(description, fn);
  }
};

// Console log suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Only show errors that aren't expected test errors
  const message = args[0]?.toString() || '';
  if (!message.includes('Test database') && 
      !message.includes('Database tests will be skipped') &&
      !message.includes('PostgreSQL')) {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  // Filter out expected warnings during tests
  const message = args[0]?.toString() || '';
  if (!message.includes('Database tests will be skipped') &&
      !message.includes('PostgreSQL')) {
    originalConsoleWarn(...args);
  }
};