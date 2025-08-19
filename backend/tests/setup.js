// Load test environment variables before any imports
const dotenv = require('dotenv');
const path = require('path');

// Load .env.test file
const envPath = path.resolve(__dirname, '../.env.test');
dotenv.config({ path: envPath });

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';

const { db } = require('../src/database/connection');

// Global test setup
beforeAll(async () => {
  // Ensure we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error('Tests must be run with NODE_ENV=test');
    process.exit(1);
  }
  
  // Set test database connection
  process.env.DB_NAME = process.env.DB_NAME || 'process_pilot_test';
  
  // Run migrations for test database
  try {
    await db.migrate.latest();
    console.log('✅ Test database migrations completed');
  } catch (error) {
    console.error('❌ Test database migration failed:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    // Clean up database
    await db.migrate.rollback();
    await db.destroy();
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Reset database before each test
beforeEach(async () => {
  // Truncate all tables
  const tables = ['request_history', 'requests', 'workflows', 'users'];
  
  for (const table of tables) {
    await db(table).truncate();
  }
});

// Global test utilities
global.testUtils = {
  // Create test user
  createTestUser: async (overrides = {}) => {
    const User = require('../src/models/User');
    const defaultUser = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
      role: 'employee',
      department: 'IT'
    };
    
    return await User.create({ ...defaultUser, ...overrides });
  },
  
  // Create test workflow
  createTestWorkflow: async (overrides = {}) => {
    const Workflow = require('../src/models/Workflow');
    const defaultWorkflow = {
      name: 'Test Workflow',
      flow_id: 'test-workflow',
      description: 'Test workflow description',
      steps: [
        {
          stepId: 'manager-approval',
          order: 1,
          role: 'manager',
          actions: ['approve', 'reject'],
          slaHours: 24
        }
      ],
      notifications: {
        onSubmit: ['manager'],
        onApprove: ['employee'],
        onReject: ['employee']
      }
    };
    
    return await Workflow.create({ ...defaultWorkflow, ...overrides });
  },
  
  // Generate JWT token for testing
  generateTestToken: (user) => {
    const { generateToken } = require('../src/middleware/auth');
    return generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
  }
};

// Console log suppression for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only show errors that aren't expected test errors
  if (!args[0]?.toString().includes('Test database')) {
    originalConsoleError(...args);
  }
};