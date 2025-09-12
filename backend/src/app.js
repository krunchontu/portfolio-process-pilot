const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const config = require('./config')
const { logger, stream, requestLogger } = require('./utils/logger')
const { TIME, HTTP_STATUS } = require('./constants')
const { apiResponseMiddleware } = require('./utils/apiResponse')
const { globalErrorHandler, notFound } = require('./middleware/errorHandler')
const { testConnection } = require('./database/connection')
const csrfProtection = require('./middleware/csrf')
const { sanitizeInput, preventSqlInjection } = require('./middleware/sanitization')
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger')
const { progressiveLimiter, rateLimitInfo, burstProtection } = require('./middleware/rateLimiting')
const { additionalCorsHeaders, logCorsEvents } = require('./config/cors')

// Import routes
const authRoutes = require('./routes/auth')
const requestRoutes = require('./routes/requests')
const workflowRoutes = require('./routes/workflows')
const userRoutes = require('./routes/users')
const analyticsRoutes = require('./routes/analytics')
const healthRoutes = require('./routes/health')

const app = express()

// Trust proxy (for accurate IP addresses behind load balancers)
app.set('trust proxy', 1)

// Security middleware
app.use(helmet())

// CORS configuration with additional security headers and logging
app.use(cors(config.cors))
app.use(logCorsEvents)
app.use(additionalCorsHeaders)

// Compression middleware
app.use(compression())

// Enhanced rate limiting middleware with burst protection
app.use(rateLimitInfo)
app.use(burstProtection)
app.use('/api/', progressiveLimiter)

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
    maxAge: TIME.DAY // 24 hours
  }
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Input sanitization and SQL injection prevention
app.use(sanitizeInput())
app.use(preventSqlInjection)

// Enhanced request logging
app.use(requestLogger)

// HTTP access logging with Morgan
app.use(morgan(config.logging?.format || 'combined', { stream }))

// CSRF protection middleware
app.use(csrfProtection.generateToken)
app.use(csrfProtection.validateToken)
app.use(csrfProtection.addTokenToResponse)

// API response standardization middleware
app.use(apiResponseMiddleware)

// Health routes (before rate limiting for monitoring)
app.use('/health', healthRoutes)

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/users', userRoutes)
app.use('/api/analytics', analyticsRoutes)

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions))

// API documentation redirect
app.get('/api/docs', (req, res) => {
  res.redirect('/docs')
})

// Swagger JSON endpoint
app.get('/api/swagger.json', (req, res) => {
  res.json(specs)
})

// API info endpoint
app.get('/api', (req, res) => {
  const apiInfo = {
    name: 'ProcessPilot API',
    version: '1.0.0',
    description: 'Workflow & Approval Engine API',
    documentation: {
      swagger_ui: `${req.protocol}://${req.get('host')}/docs`,
      swagger_json: `${req.protocol}://${req.get('host')}/api/swagger.json`,
      postman_collection: `${req.protocol}://${req.get('host')}/api/postman.json`
    },
    endpoints: {
      auth: '/api/auth',
      requests: '/api/requests',
      workflows: '/api/workflows',
      users: '/api/users',
      analytics: '/api/analytics'
    },
    health: '/health'
  }

  res.success(HTTP_STATUS.OK, 'API information retrieved', apiInfo)
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
