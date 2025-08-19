const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const config = require('./config')
const { logger, stream } = require('./utils/logger')
const { apiResponseMiddleware } = require('./utils/apiResponse')
const { globalErrorHandler, notFound } = require('./middleware/errorHandler')
const { testConnection } = require('./database/connection')
const csrfProtection = require('./middleware/csrf')
const { sanitizeInput, preventSqlInjection } = require('./middleware/sanitization')

// Import routes
const authRoutes = require('./routes/auth')
const requestRoutes = require('./routes/requests')
const workflowRoutes = require('./routes/workflows')
const userRoutes = require('./routes/users')
const analyticsRoutes = require('./routes/analytics')

const app = express()

// Trust proxy (for accurate IP addresses behind load balancers)
app.set('trust proxy', 1)

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors(config.cors))

// Compression middleware
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api/', limiter)

// Cookie parsing middleware
app.use(cookieParser())

// Session middleware (required for CSRF protection)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Input sanitization and SQL injection prevention
app.use(sanitizeInput())
app.use(preventSqlInjection)

// Logging middleware
app.use(morgan(config.logging.format, { stream }))

// CSRF protection middleware
app.use(csrfProtection.generateToken)
app.use(csrfProtection.validateToken)
app.use(csrfProtection.addTokenToResponse)

// API response standardization middleware
app.use(apiResponseMiddleware)

// Health check endpoint (before rate limiting)
app.get('/health', async (req, res) => {
  try {
    const { healthCheck } = require('./database/connection')
    const dbHealth = await healthCheck()
    
    const healthData = {
      status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      database: dbHealth,
      timestamp: new Date().toISOString()
    }

    const statusCode = dbHealth.status === 'healthy' ? 200 : 503
    res.success(statusCode, 'Health check completed', healthData)
  } catch (error) {
    res.internalError('Health check failed', error)
  }
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/users', userRoutes)
app.use('/api/analytics', analyticsRoutes)

// API info endpoint
app.get('/api', (req, res) => {
  const apiInfo = {
    name: 'ProcessPilot API',
    version: '1.0.0',
    description: 'Workflow & Approval Engine API',
    endpoints: {
      auth: '/api/auth',
      requests: '/api/requests',
      workflows: '/api/workflows',
      users: '/api/users',
      analytics: '/api/analytics'
    },
    documentation: '/api/docs',
    health: '/health'
  }
  
  res.success(200, 'API information retrieved', apiInfo)
})

// Handle unmatched routes
app.use(notFound)

// Global error handling middleware
app.use(globalErrorHandler)

// Initialize database connection
const initializeApp = async () => {
  try {
    await testConnection()
    logger.info('✅ Database connection established')
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error)
    process.exit(1)
  }
}

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`)

  // Close database connections
  const { closeConnection } = require('./database/connection')
  await closeConnection()

  logger.info('✅ Graceful shutdown completed')
  process.exit(0)
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

module.exports = { app, initializeApp }
