/**
 * @swagger
 * components:
 *   schemas:
 *     HealthStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, degraded, unhealthy]
 *           description: Overall system health status
 *         uptime:
 *           type: number
 *           description: System uptime in seconds
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Health check timestamp
 *         version:
 *           type: string
 *           description: Application version
 *         environment:
 *           type: string
 *           enum: [development, test, production]
 *         services:
 *           $ref: '#/components/schemas/ServiceHealthStatus'
 *         system:
 *           $ref: '#/components/schemas/SystemMetrics'
 *
 *     ServiceHealthStatus:
 *       type: object
 *       properties:
 *         database:
 *           $ref: '#/components/schemas/DatabaseHealth'
 *         redis:
 *           $ref: '#/components/schemas/RedisHealth'
 *         external_apis:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ExternalServiceHealth'
 *
 *     DatabaseHealth:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy]
 *         response_time:
 *           type: string
 *           example: "15ms"
 *         pool_status:
 *           type: object
 *           properties:
 *             used:
 *               type: integer
 *             free:
 *               type: integer
 *             pending:
 *               type: integer
 *             max:
 *               type: integer
 *             min:
 *               type: integer
 *
 *     SystemMetrics:
 *       type: object
 *       properties:
 *         memory:
 *           type: object
 *           properties:
 *             used:
 *               type: string
 *               example: "125.5MB"
 *             total:
 *               type: string
 *               example: "512MB"
 *             percentage:
 *               type: number
 *               example: 24.5
 *         cpu:
 *           type: object
 *           properties:
 *             usage:
 *               type: number
 *               example: 15.7
 *         disk:
 *           type: object
 *           properties:
 *             free:
 *               type: string
 *               example: "2.5GB"
 *             used:
 *               type: string
 *               example: "1.2GB"
 */

const express = require('express')
const os = require('os')
const { promisify } = require('util')
const { exec } = require('child_process')
const { healthCheck } = require('../database/connection')
const { loggers } = require('../utils/logger')
const config = require('../config')
const { supabaseAdapter } = require('../adapters/supabase')

const router = express.Router()
const execAsync = promisify(exec)

// Cache for health check results (to avoid hammering services)
const healthCache = new Map()
const CACHE_DURATION = 30000 // 30 seconds

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Quick health status of the application
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: Service is degraded or unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now()

    // Check database health
    const dbHealth = await getFromCache('database', async () => {
      return await healthCheck()
    })

    const healthData = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      database: dbHealth,
      response_time: `${Date.now() - startTime}ms`
    }

    const statusCode = healthData.status === 'healthy' ? 200 : 503

    // Log health check
    loggers.main.info('Health check performed', {
      status: healthData.status,
      responseTime: healthData.response_time,
      dbStatus: dbHealth.status
    })

    return res.status(statusCode).json({
      success: true,
      message: 'Health check completed',
      data: healthData,
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    loggers.main.error('Health check failed', { error: error.message })
    return res.status(503).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR',
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  }
})

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health and system metrics
 *     description: Comprehensive health status including system metrics and service dependencies
 *     tags: [Health]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthStatus'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now()

    // Run health checks in parallel
    const [dbHealth, systemMetrics, serviceHealth] = await Promise.all([
      getFromCache('database', async () => await healthCheck()),
      getFromCache('system', async () => await getSystemMetrics()),
      getFromCache('services', async () => await checkExternalServices())
    ])

    const overallStatus = determineOverallStatus([
      dbHealth.status,
      serviceHealth.overall_status
    ])

    const healthData = {
      status: overallStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      response_time: `${Date.now() - startTime}ms`,
      services: {
        database: dbHealth,
        ...serviceHealth
      },
      system: systemMetrics,
      configuration: {
        node_version: process.version,
        platform: os.platform(),
        arch: os.arch(),
        db_provider: config.dbProvider,
        log_level: config.logging?.level || 'info'
      }
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503

    loggers.main.info('Detailed health check performed', {
      status: overallStatus,
      responseTime: healthData.response_time,
      services: Object.keys(healthData.services).length
    })

    return res.status(statusCode).json({
      success: true,
      message: 'Detailed health check completed',
      data: healthData,
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    loggers.main.error('Detailed health check failed', { error: error.message })
    return res.status(503).json({
      success: false,
      error: 'Detailed health check failed',
      code: 'HEALTH_CHECK_ERROR',
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  }
})

/**
 * @swagger
 * /health/liveness:
 *   get:
 *     summary: Kubernetes liveness probe
 *     description: Simple liveness check for container orchestration
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Application is alive
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "OK"
 */
router.get('/liveness', (req, res) => {
  // Simple liveness check - just verify the process is running
  res.status(200).send('OK')
})

/**
 * @swagger
 * /health/readiness:
 *   get:
 *     summary: Kubernetes readiness probe
 *     description: Readiness check including database connectivity
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Application is ready to serve traffic
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "READY"
 *       503:
 *         description: Application is not ready
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "NOT READY"
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check essential services for readiness
    const dbHealth = await healthCheck()

    if (dbHealth.status === 'healthy') {
      res.status(200).send('READY')
    } else {
      res.status(503).send('NOT READY')
    }
  } catch (error) {
    loggers.main.error('Readiness check failed', { error: error.message })
    res.status(503).send('NOT READY')
  }
})

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Application metrics
 *     description: Prometheus-compatible metrics endpoint
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await generatePrometheusMetrics()
    res.set('Content-Type', 'text/plain')
    res.send(metrics)
  } catch (error) {
    loggers.main.error('Metrics generation failed', { error: error.message })
    res.status(500).send('# Metrics unavailable')
  }
})

// Helper functions

async function getFromCache(key, fetcher, ttl = CACHE_DURATION) {
  const cached = healthCache.get(key)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data
  }

  try {
    const data = await fetcher()
    healthCache.set(key, { data, timestamp: now })
    return data
  } catch (error) {
    // Return cached data if fetch fails and we have it
    if (cached) {
      loggers.main.warn(`Using stale cache for ${key}`, { error: error.message })
      return cached.data
    }
    throw error
  }
}

async function getSystemMetrics() {
  const memoryUsage = process.memoryUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  // Get CPU usage
  const cpuUsage = await getCpuUsage()

  return {
    memory: {
      used: formatBytes(memoryUsage.rss),
      heap_used: formatBytes(memoryUsage.heapUsed),
      heap_total: formatBytes(memoryUsage.heapTotal),
      external: formatBytes(memoryUsage.external),
      system_total: formatBytes(totalMem),
      system_used: formatBytes(usedMem),
      system_free: formatBytes(freeMem),
      usage_percentage: ((usedMem / totalMem) * 100).toFixed(2)
    },
    cpu: {
      usage: cpuUsage,
      load_average: os.loadavg(),
      cores: os.cpus().length
    },
    uptime: {
      process: Math.floor(process.uptime()),
      system: Math.floor(os.uptime())
    },
    network: {
      interfaces: Object.keys(os.networkInterfaces()).length
    }
  }
}

async function getCpuUsage() {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage()
    const startTime = process.hrtime()

    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage)
      const endTime = process.hrtime(startTime)

      const totalTime = endTime[0] * 1000000 + endTime[1] / 1000 // microseconds
      const totalUsage = endUsage.user + endUsage.system
      const usage = (totalUsage / totalTime) * 100

      resolve(Math.min(100, Math.max(0, usage.toFixed(2))))
    }, 100)
  })
}

async function checkExternalServices() {
  const services = {}
  let healthyCount = 0
  let totalCount = 0

  // Check Supabase if configured
  if (config.dbProvider === 'supabase') {
    try {
      totalCount++
      const supabaseHealth = await supabaseAdapter.healthCheck()
      services.supabase = supabaseHealth
      if (supabaseHealth.status === 'healthy') healthyCount++
    } catch (error) {
      services.supabase = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Add other external service checks here
  // Example: Email service, Redis, external APIs, etc.

  const overall_status = totalCount === 0
    ? 'healthy'
    : (healthyCount === totalCount
      ? 'healthy'
      : (healthyCount > 0 ? 'degraded' : 'unhealthy'))

  return {
    overall_status,
    healthy_services: healthyCount,
    total_services: totalCount,
    services
  }
}

function determineOverallStatus(statuses) {
  const unhealthyCount = statuses.filter(s => s === 'unhealthy').length
  const degradedCount = statuses.filter(s => s === 'degraded').length

  if (unhealthyCount > 0) return 'unhealthy'
  if (degradedCount > 0) return 'degraded'
  return 'healthy'
}

async function generatePrometheusMetrics() {
  const memUsage = process.memoryUsage()
  const systemMetrics = await getSystemMetrics()
  const dbHealth = await healthCheck()

  const metrics = [
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${Math.floor(process.uptime())}`,
    '',
    '# HELP process_memory_rss_bytes Resident set size in bytes',
    '# TYPE process_memory_rss_bytes gauge',
    `process_memory_rss_bytes ${memUsage.rss}`,
    '',
    '# HELP process_memory_heap_bytes Heap memory usage in bytes',
    '# TYPE process_memory_heap_bytes gauge',
    `process_memory_heap_used_bytes ${memUsage.heapUsed}`,
    `process_memory_heap_total_bytes ${memUsage.heapTotal}`,
    '',
    '# HELP database_status Database health status (1=healthy, 0=unhealthy)',
    '# TYPE database_status gauge',
    `database_status ${dbHealth.status === 'healthy' ? 1 : 0}`,
    '',
    '# HELP database_connections Database connection pool status',
    '# TYPE database_connections gauge',
    `database_connections_used ${dbHealth.pool_status?.used || 0}`,
    `database_connections_free ${dbHealth.pool_status?.free || 0}`,
    `database_connections_max ${dbHealth.pool_status?.max || 0}`,
    ''
  ]

  return metrics.join('\n')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))}${sizes[i]}`
}

module.exports = router
