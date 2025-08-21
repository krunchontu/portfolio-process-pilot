require('dotenv').config()

const config = {
  // Server
  port: process.env.PORT || 5000,
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Provider
  dbProvider: process.env.DB_PROVIDER || 'postgresql',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.FROM_EMAIL || 'noreply@processpilot.com'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  // File uploads
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    path: process.env.UPLOAD_PATH || './uploads'
  }
}

// Validation - JWT secrets required in all environments
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable must be set and at least 32 characters long')
}

if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET environment variable must be set and at least 32 characters long')
}

if (config.nodeEnv === 'production') {
  // Database validation is now handled by the database config module
  const requiredEnvVars = []
  
  // Check provider-specific requirements
  if (config.dbProvider === 'supabase' && !process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
    requiredEnvVars.push('SUPABASE_DB_URL or DATABASE_URL')
  }
  
  if (config.dbProvider === 'postgresql' && !process.env.DB_PASSWORD && !process.env.DATABASE_URL) {
    requiredEnvVars.push('DB_PASSWORD or DATABASE_URL')
  }
  
  if (requiredEnvVars.length > 0) {
    throw new Error(`Production environment missing: ${requiredEnvVars.join(', ')}`)
  }
}

module.exports = config
