/**
 * Application Constants
 *
 * Centralized constants to replace magic numbers throughout the codebase
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
}

// Time Constants (in milliseconds)
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
}

// Time Constants (in seconds)
const TIME_SECONDS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60
}

// Database Constants
const DATABASE = {
  BCRYPT_SALT_ROUNDS: 12,
  CONNECTION_TIMEOUT: 5000,
  DESTROY_TIMEOUT: 5000,
  PLANETSCALE_TIMEOUT: 10000,
  QUERY_LOG_MAX_LENGTH: 200
}

// Rate Limiting Constants
const RATE_LIMIT = {
  WINDOW: {
    FIFTEEN_MINUTES: 15 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    ONE_MINUTE: 1 * 60 * 1000
  },
  LIMITS: {
    // Authentication limits
    AUTH_AUTHENTICATED: 10,
    AUTH_ANONYMOUS: 5,

    // API limits
    API_AUTHENTICATED: 1000,
    API_ANONYMOUS: 100,

    // Request creation limits
    REQUEST_CREATE_AUTHENTICATED: 50,
    REQUEST_CREATE_ANONYMOUS: 5,

    // Admin limits
    ADMIN_AUTHENTICATED: 500,
    ADMIN_ANONYMOUS: 10,

    // Burst protection limits
    BURST_AUTHENTICATED: 60,
    BURST_ANONYMOUS: 30
  }
}

// Server Constants
const SERVER = {
  DEFAULT_PORT: 5000,
  DEVELOPMENT_FRONTEND_PORT: 3000
}

// CORS Constants
const CORS = {
  OPTIONS_SUCCESS_STATUS: 200,
  DEFAULT_MAX_AGE: 86400, // 24 hours in seconds
  DEVELOPMENT_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ]
}

// Email Constants
const EMAIL = {
  RETRY_DELAY: 100, // milliseconds
  HEALTH_CHECK_TIMEOUT: 5000 // milliseconds
}

// Logging Constants
const LOGGING = {
  ERROR_STATUS_THRESHOLD: 400,
  QUERY_LENGTH_LIMIT: 200
}

// Validation Constants
const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_JWT_SECRET_LENGTH: 32,
  MAX_REQUEST_PAYLOAD_SIZE: 1024 * 1024, // 1MB
  MAX_FILE_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB default
  MAX_FILE_UPLOAD_SIZE_LIMIT: 100 * 1024 * 1024 // 100MB max
}

// Environment Constants
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production'
}

// Pagination Constants
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
}

// Request Workflow Constants
const WORKFLOW = {
  DEFAULT_SLA_HOURS: 24,
  MAX_STEPS: 10,
  STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  }
}

// User Roles
const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin'
}

// Cache Constants (for future Redis implementation)
const CACHE = {
  DEFAULT_TTL: 300, // 5 minutes
  SESSION_TTL: 1800, // 30 minutes
  USER_PROFILE_TTL: 900, // 15 minutes
  WORKFLOW_TTL: 3600 // 1 hour
}

module.exports = {
  HTTP_STATUS,
  TIME,
  TIME_SECONDS,
  DATABASE,
  RATE_LIMIT,
  SERVER,
  CORS,
  EMAIL,
  LOGGING,
  VALIDATION,
  ENVIRONMENT,
  PAGINATION,
  WORKFLOW,
  ROLES,
  CACHE
}
