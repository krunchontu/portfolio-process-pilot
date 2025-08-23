const { validateEnvironment, ENV_SCHEMA, initializeEnvironment, getEnvironmentSummary } = require('../../src/config/env-validation')

describe('Environment Validation', () => {
  let originalEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('validateEnvironment', () => {
    it('should pass with valid minimal configuration', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb'
      }

      const result = validateEnvironment(testEnv)

      if (!result.isValid) {
        console.log('Validation errors:', result.errors)
      }

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail with missing required variables', () => {
      const testEnv = {
        NODE_ENV: 'development'
        // Missing JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('JWT_SECRET is required (JWT signing secret (minimum 32 characters))')
      expect(result.errors).toContain('JWT_REFRESH_SECRET is required (JWT refresh token secret (minimum 32 characters))')
      expect(result.errors).toContain('SESSION_SECRET is required (Session secret for CSRF protection)')
    })

    it('should validate JWT_SECRET minimum length', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'short',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('JWT_SECRET must be at least 32 characters long')
    })

    it('should reject default JWT secrets in production', () => {
      const testEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'your-super-secret-jwt-key-min-32-chars-long',
        JWT_REFRESH_SECRET: 'your-refresh-token-secret-key',
        SESSION_SECRET: 'your-session-secret-for-csrf'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('JWT_SECRET: JWT_SECRET must be changed from default value')
      expect(result.errors).toContain('JWT_REFRESH_SECRET: JWT_REFRESH_SECRET must be changed from default value')
      expect(result.errors).toContain('SESSION_SECRET: SESSION_SECRET must be changed from default value')
    })

    it('should validate NODE_ENV enum values', () => {
      const testEnv = {
        NODE_ENV: 'invalid',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('NODE_ENV must be one of: development, test, production')
    })

    it('should validate PORT as number within range', () => {
      const testEnv = {
        NODE_ENV: 'development',
        PORT: '80000', // Out of range
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('PORT must be no more than 65535')
    })

    it('should validate email format for SMTP_USER', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'invalid-email',
        SMTP_PASS: 'password'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('SMTP_USER must be a valid email address')
    })

    it('should validate URL format for DATABASE_URL', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        DB_PROVIDER: 'supabase',
        DATABASE_URL: 'not-a-valid-url'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('DATABASE_URL must be a valid URL')
    })

    it('should apply default values for optional fields', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(true)
      expect(result.env.PORT).toBe(5000) // Default value
      expect(result.env.HOST).toBe('localhost') // Default value
      expect(result.env.DB_PROVIDER).toBe('postgresql') // Default value
    })

    it('should handle conditional requirements for database configuration', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        DB_PROVIDER: 'postgresql'
        // Missing DB_HOST, DB_NAME, DB_USER, DB_PASSWORD (required for postgresql)
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('DB_HOST is required (Database host address)')
      expect(result.errors).toContain('DB_NAME is required (Database name)')
      expect(result.errors).toContain('DB_USER is required (Database username)')
    })

    it('should handle conditional requirements for SMTP configuration', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        SMTP_HOST: 'smtp.gmail.com'
        // Missing SMTP_USER, SMTP_PASS, FROM_EMAIL (required when SMTP_HOST is set)
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('SMTP_USER is required (SMTP username/email)')
      expect(result.errors).toContain('SMTP_PASS is required (SMTP password/app password)')
      expect(result.errors).toContain('FROM_EMAIL is required (Default sender email address)')
    })

    it('should validate boolean values', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        DB_SSL: 'invalid-boolean'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('DB_SSL must be a boolean value (true/false, 1/0, yes/no)')
    })

    it('should validate JWT token expiration format', () => {
      const testEnv = {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'test-session-secret-key-minimum-32-characters-long',
        JWT_EXPIRES_IN: 'invalid-format'
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('JWT_EXPIRES_IN format is invalid')
    })

    it('should have production-specific validations', () => {
      const testEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'production-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET: 'production-refresh-secret-key-minimum-32-characters-long',
        SESSION_SECRET: 'production-session-secret-key-minimum-32-characters-long',
        CORS_ORIGIN: 'http://localhost:3000', // Should not be localhost in production
        DB_PROVIDER: 'postgresql',
        DB_HOST: 'localhost',
        DB_NAME: 'process_pilot',
        DB_USER: 'postgres',
        DB_PASSWORD: 'password',
        DB_SSL: 'false' // Should be true in production
      }

      const result = validateEnvironment(testEnv)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('[PRODUCTION] CORS_ORIGIN must be configured for production domains')
      expect(result.errors).toContain('[PRODUCTION] Database SSL should be enabled in production')
    })
  })

  describe('getEnvironmentSummary', () => {
    it('should return environment summary without sensitive data', () => {
      const testEnv = {
        NODE_ENV: 'development',
        PORT: '3000',
        DB_PROVIDER: 'supabase',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'test@example.com',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'sensitive-secret',
        DB_PASSWORD: 'sensitive-password'
      }

      const summary = getEnvironmentSummary(testEnv)

      expect(summary).toEqual({
        NODE_ENV: 'development',
        PORT: '3000',
        DB_PROVIDER: 'supabase',
        EMAIL_CONFIGURED: true,
        REDIS_CONFIGURED: true,
        LOG_LEVEL: 'info'
      })

      // Should not include sensitive data
      expect(summary).not.toHaveProperty('JWT_SECRET')
      expect(summary).not.toHaveProperty('DB_PASSWORD')
    })

    it('should handle missing optional fields', () => {
      const testEnv = {
        NODE_ENV: 'test'
      }

      const summary = getEnvironmentSummary(testEnv)

      expect(summary).toEqual({
        NODE_ENV: 'test',
        PORT: 5000,
        DB_PROVIDER: 'postgresql',
        EMAIL_CONFIGURED: false,
        REDIS_CONFIGURED: false,
        LOG_LEVEL: 'info'
      })
    })
  })

  describe('ENV_SCHEMA validation', () => {
    it('should have valid schema definitions', () => {
      expect(ENV_SCHEMA).toBeDefined()
      expect(typeof ENV_SCHEMA).toBe('object')

      // Check required fields have proper structure
      const requiredFields = ['NODE_ENV', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET']
      
      requiredFields.forEach(field => {
        expect(ENV_SCHEMA[field]).toBeDefined()
        expect(ENV_SCHEMA[field]).toHaveProperty('type')
        expect(ENV_SCHEMA[field]).toHaveProperty('description')
      })
    })

    it('should have proper type definitions', () => {
      expect(ENV_SCHEMA.NODE_ENV.type).toBe('string')
      expect(ENV_SCHEMA.PORT.type).toBe('number')
      expect(ENV_SCHEMA.DB_SSL.type).toBe('boolean')
      expect(ENV_SCHEMA.SMTP_USER.type).toBe('email')
      expect(ENV_SCHEMA.DATABASE_URL.type).toBe('url')
    })

    it('should have proper validation constraints', () => {
      expect(ENV_SCHEMA.JWT_SECRET.minLength).toBe(32)
      expect(ENV_SCHEMA.PORT.min).toBe(1000)
      expect(ENV_SCHEMA.PORT.max).toBe(65535)
      expect(ENV_SCHEMA.NODE_ENV.enum).toContain('development')
      expect(ENV_SCHEMA.NODE_ENV.enum).toContain('production')
      expect(ENV_SCHEMA.NODE_ENV.enum).toContain('test')
    })

    it('should mark sensitive fields appropriately', () => {
      const sensitiveFields = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET', 'DB_PASSWORD', 'SMTP_PASS']
      
      sensitiveFields.forEach(field => {
        expect(ENV_SCHEMA[field].sensitive).toBe(true)
      })
    })
  })
})