/**
 * Test Database Setup Utilities
 *
 * Provides utilities for setting up test databases, handling migrations,
 * and managing test data lifecycle.
 */

const { databaseConfig } = require('../config/database')
const knex = require('knex')
const logger = require('../utils/logger')

// Safe logger wrapper that works with both real and mocked loggers
const safeLogger = {
  info: (...args) => {
    if (typeof logger?.info === 'function') logger.info(...args)
    else console.log('[INFO]', ...args)
  },
  warn: (...args) => {
    if (typeof logger?.warn === 'function') logger.warn(...args)
    else console.warn('[WARN]', ...args)
  },
  error: (...args) => {
    if (typeof logger?.error === 'function') logger.error(...args)
    else console.error('[ERROR]', ...args)
  },
  debug: (...args) => {
    if (typeof logger?.debug === 'function') logger.debug(...args)
    else if (process.env.DEBUG) console.log('[DEBUG]', ...args)
  }
}

class TestDbManager {
  constructor() {
    this.db = null
    this.isSetup = false
    this.setupError = null
  }

  async setupTestDb() {
    if (this.isSetup) return this.db

    try {
      // First, try to connect to the test database
      this.db = knex(databaseConfig)

      // Test the connection
      await this.db.raw('SELECT 1')
      safeLogger.info('Test database connection successful')

      // Run migrations
      await this.runMigrations()

      this.isSetup = true
      return this.db
    } catch (error) {
      this.setupError = error
      safeLogger.error('Test database setup failed', {
        error: error.message,
        code: error.code,
        stack: error.stack
      })

      // Check if it's a connection issue
      if (this.isConnectionError(error)) {
        safeLogger.warn('PostgreSQL connection failed - tests will be skipped', {
          error: error.message,
          code: error.code
        })
        return null
      }

      // If it's a database not found error, try to create it
      if (this.isDatabaseNotFoundError(error)) {
        safeLogger.info('Test database not found, attempting to create it')
        await this.createTestDatabase()
        return await this.setupTestDb() // Retry
      }

      throw error
    }
  }

  async runMigrations() {
    try {
      const [batchNo, migrations] = await this.db.migrate.latest()

      if (migrations.length === 0) {
        safeLogger.info('Database is up to date - no migrations needed')
      } else {
        safeLogger.info('Migrations completed', {
          batchNo,
          migrationsRun: migrations.length,
          migrations: migrations.map(m => m.split('/').pop())
        })
      }

      return true
    } catch (error) {
      safeLogger.error('Migration failed', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  async createTestDatabase() {
    try {
      // Connect to the default postgres database to create our test database
      const adminConfig = { ...databaseConfig }

      // Modify connection to connect to postgres database instead
      if (typeof adminConfig.connection === 'object') {
        adminConfig.connection.database = 'postgres'
      } else {
        // Handle connection string
        adminConfig.connection = adminConfig.connection.replace(/\/[^/]*$/, '/postgres')
      }

      const adminDb = knex(adminConfig)

      try {
        const testDbName = this.getTestDatabaseName()

        // Check if database exists
        const result = await adminDb.raw(
          'SELECT 1 FROM pg_database WHERE datname = ?',
          [testDbName]
        )

        if (result.rows.length === 0) {
          // Create the test database
          await adminDb.raw(`CREATE DATABASE "${testDbName}"`)
          safeLogger.info('Test database created successfully', { database: testDbName })
        } else {
          safeLogger.info('Test database already exists', { database: testDbName })
        }
      } finally {
        await adminDb.destroy()
      }
    } catch (error) {
      safeLogger.error('Failed to create test database', {
        error: error.message,
        code: error.code
      })
      throw error
    }
  }

  async cleanupTestDb() {
    if (!this.db) return

    try {
      // Get list of all tables
      const tables = await this.db.raw(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename != 'knex_migrations'
        AND tablename != 'knex_migrations_lock'
        ORDER BY tablename DESC
      `)

      if (tables.rows.length > 0) {
        // Build comma-separated list of tables
        const tableNames = tables.rows.map(row => `"${row.tablename}"`).join(', ')

        // Truncate all tables at once with CASCADE to handle foreign keys
        // RESTART IDENTITY resets auto-increment sequences
        await this.db.raw(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`)

        safeLogger.debug('Test database cleaned', {
          tablesCleared: tables.rows.length
        })
      }
    } catch (error) {
      safeLogger.error('Failed to cleanup test database', {
        error: error.message
      })
      throw error
    }
  }

  async destroyConnection() {
    if (this.db) {
      try {
        await this.db.destroy()
        safeLogger.debug('Test database connection destroyed')
      } catch (error) {
        safeLogger.error('Error destroying database connection', {
          error: error.message
        })
      }
      this.db = null
      this.isSetup = false
    }
  }

  // Helper methods

  isConnectionError(error) {
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ECONNRESET' ||
           (error.message && error.message.includes('connect ECONNREFUSED'))
  }

  isDatabaseNotFoundError(error) {
    return error.code === '3D000' ||
           (error.message && error.message.includes('database') && error.message.includes('does not exist'))
  }

  getTestDatabaseName() {
    const config = databaseConfig.connection

    if (typeof config === 'object') {
      return config.database
    } else {
      // Extract database name from connection string
      const match = config.match(/\/([^/?]+)(\?|$)/)
      return match ? match[1] : 'process_pilot_test'
    }
  }

  canRunTests() {
    return this.isSetup && this.db && !this.setupError
  }

  getSkipReason() {
    if (!this.setupError) return null

    if (this.isConnectionError(this.setupError)) {
      return 'PostgreSQL server is not running or not accessible'
    }

    return `Database setup failed: ${this.setupError.message}`
  }
}

// Singleton instance
const testDbManager = new TestDbManager()

// Test utilities
const testUtils = {
  // Create test data helpers
  async createTestUser(overrides = {}) {
    const User = require('../models/User')
    const defaultData = {
      email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'employee',
      department: 'IT',
      isActive: true
    }

    return await User.create({ ...defaultData, ...overrides })
  },

  async createTestWorkflow(overrides = {}) {
    const Workflow = require('../models/Workflow')
    const defaultData = {
      name: `Test Workflow ${Date.now()}`,
      flow_id: `test-workflow-${Date.now()}`,
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
      },
      is_active: true
    }

    return await Workflow.create({ ...defaultData, ...overrides })
  },

  async createTestRequest(userId, workflowId, overrides = {}) {
    const Request = require('../models/Request')
    const defaultData = {
      type: 'leave-request',
      title: 'Test Leave Request',
      description: 'Test request description',
      status: 'pending',
      user_id: userId,
      workflow_id: workflowId,
      payload: {
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        leaveType: 'vacation',
        reason: 'Family vacation'
      },
      current_step_index: 0
    }

    return await Request.create({ ...defaultData, ...overrides })
  },

  // Generate test JWT token
  generateTestToken(user) {
    const jwt = require('jsonwebtoken')
    const config = require('../config')

    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    )
  },

  // Database lifecycle functions - convenience wrappers
  async setupTestDb() {
    return await testDbManager.setupTestDb()
  },

  async teardownTestDb() {
    await testDbManager.cleanupTestDb()
    await testDbManager.destroyConnection()
  },

  async cleanupTestDb() {
    return await testDbManager.cleanupTestDb()
  },

  // Check if tests can run
  canRunTests() {
    return testDbManager.canRunTests()
  },

  getSkipReason() {
    return testDbManager.getSkipReason()
  }
}

module.exports = {
  testDbManager,
  testUtils,
  // Export convenience functions at module level for direct import
  setupTestDb: testUtils.setupTestDb,
  teardownTestDb: testUtils.teardownTestDb,
  cleanupTestDb: testUtils.cleanupTestDb,
  canRunTests: testUtils.canRunTests,
  getSkipReason: testUtils.getSkipReason
}
