const { app, initializeApp } = require('./app')
const config = require('./config')
const { logger } = require('./utils/logger')
const { initializeEnvironment } = require('./config/env-validation')

// Initialize the application
const startServer = async () => {
  try {
    // Validate and initialize environment configuration first
    const validatedEnv = initializeEnvironment()

    // Initialize database and other services
    await initializeApp()

    // Start the HTTP server
    const server = app.listen(config.port, config.host, () => {
      logger.info(`🚀 ProcessPilot API server running on http://${config.host}:${config.port}`)
      logger.info(`📝 Environment: ${config.nodeEnv}`)
      logger.info(`📊 Process ID: ${process.pid}`)
    })

    return server
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server only if this file is run directly
if (require.main === module) {
  startServer()
}

module.exports = { startServer }
