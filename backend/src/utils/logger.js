const winston = require('winston')
const path = require('path')
const fs = require('fs')
const config = require('../config')
const { LOGGING } = require('../constants')

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
}

winston.addColors(colors)

// Custom format for console output with context
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info
    let log = `${timestamp} [${level}]: ${message}`

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`
    }

    return log
  })
)

// Enhanced format for file output with structured data
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.json()
)

// Create application-specific format with request tracking
const createAppFormat = (service) => winston.format.combine(
  winston.format.label({ label: service }),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Define transports based on environment
const getTransports = () => {
  const transports = []

  // Console transport (always enabled in development)
  if (config.nodeEnv === 'development' || process.env.LOG_CONSOLE === 'true') {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: config.nodeEnv === 'development' ? 'debug' : 'info'
      })
    )
  }

  // File transports
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // HTTP access log file
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  )

  // Production-specific transports
  if (config.nodeEnv === 'production') {
    // Separate file for warnings
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'warnings.log'),
        level: 'warn',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 3
      })
    )

    // Application-specific logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'app.log'),
        level: 'info',
        format: createAppFormat('ProcessPilot'),
        maxsize: 10485760,
        maxFiles: 7
      })
    )
  }

  return transports
}

// Create the main logger
const logger = winston.createLogger({
  level: config.logging?.level || 'info',
  levels,
  transports: getTransports(),
  exitOnError: false,
  // Handle rejections and exceptions
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: fileFormat
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: fileFormat
    })
  ]
})

// Create specialized loggers for different components
const createChildLogger = (service, additionalMeta = {}) => {
  return logger.child({
    service,
    ...additionalMeta
  })
}

// Component-specific loggers
const loggers = {
  main: logger,
  auth: createChildLogger('auth'),
  database: createChildLogger('database'),
  api: createChildLogger('api'),
  security: createChildLogger('security'),
  workflow: createChildLogger('workflow'),
  performance: createChildLogger('performance')
}

// Enhanced stream object for Morgan with request tracking
const stream = {
  write: (message) => {
    // Parse Morgan log format to extract useful info
    const trimmed = message.trim()
    const parts = trimmed.split(' ')

    if (parts.length >= 6) {
      const method = parts[0].replace(/"/g, '')
      const url = parts[1]
      const status = parts[2]
      const responseTime = parts[5]

      loggers.api.http('HTTP Request', {
        method,
        url,
        status: parseInt(status),
        responseTime,
        timestamp: new Date().toISOString()
      })
    } else {
      loggers.api.http(trimmed)
    }
  }
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now()

  // Add request ID for tracking
  req.requestId = require('uuid').v4()

  // Create request-specific logger
  req.logger = logger.child({
    requestId: req.requestId,
    userId: req.user?.id,
    userEmail: req.user?.email,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Log request start
  req.logger.info('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    headers: req.headers
  })

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const level = res.statusCode >= LOGGING.ERROR_STATUS_THRESHOLD ? 'warn' : 'info'

    req.logger[level]('Request completed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0
    })
  })

  next()
}

// Security event logger
const securityLogger = (event, details, req = null) => {
  const securityLog = {
    event,
    timestamp: new Date().toISOString(),
    severity: details.severity || 'medium',
    ...details
  }

  if (req) {
    securityLog.requestId = req.requestId
    securityLog.ip = req.ip
    securityLog.userAgent = req.get('User-Agent')
    securityLog.userId = req.user?.id
  }

  const level = details.severity === 'high' ? 'error' : 'warn'
  loggers.security[level]('Security Event', securityLog)
}

// Performance logger
const performanceLogger = (operation, duration, metadata = {}) => {
  loggers.performance.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata
  })
}

// Database operation logger
const dbLogger = (operation, query, duration, metadata = {}) => {
  loggers.database.debug('Database Operation', {
    operation,
    query: query.substring(0, LOGGING.QUERY_LENGTH_LIMIT), // Limit query length
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata
  })
}

// Error logger with context
const errorLogger = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    ...context
  })
}

// Startup logger
logger.info('Logger initialized', {
  level: config.logging?.level || 'info',
  environment: config.nodeEnv,
  logDirectory: logDir,
  transports: getTransports().map(t => t.constructor.name)
})

module.exports = {
  logger,
  loggers,
  stream,
  requestLogger,
  securityLogger,
  performanceLogger,
  dbLogger,
  errorLogger,
  createChildLogger
}
