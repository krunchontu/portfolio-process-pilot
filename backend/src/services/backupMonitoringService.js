/**
 * Backup Monitoring Service
 * Provides backup status monitoring, metrics, and alerting functionality
 */

const fs = require('fs').promises
const path = require('path')
const { loggers } = require('../utils/logger')

class BackupMonitoringService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/var/backups/processpilot'
    this.providers = ['postgresql', 'supabase', 'planetscale', 'neon', 'railway']
    this.cache = new Map()
    this.cacheExpiry = 60000 // 1 minute cache
  }

  /**
   * Get comprehensive backup status for all providers
   */
  async getBackupStatus() {
    const cacheKey = 'backup_status'
    const cached = this.cache.get(cacheKey)

    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data
    }

    try {
      const backupStatus = {
        overall_status: 'healthy',
        last_backup_age_hours: 0,
        providers: {},
        storage: await this.getStorageStatus(),
        retention_compliance: true,
        alerts: []
      }

      // Check each provider
      for (const provider of this.providers) {
        try {
          const providerStatus = await this.getProviderBackupStatus(provider)
          backupStatus.providers[provider] = providerStatus

          // Update overall status
          if (providerStatus.status === 'critical') {
            backupStatus.overall_status = 'critical'
          } else if (providerStatus.status === 'warning' && backupStatus.overall_status === 'healthy') {
            backupStatus.overall_status = 'warning'
          }

          // Track oldest backup
          if (providerStatus.last_backup_age_hours > backupStatus.last_backup_age_hours) {
            backupStatus.last_backup_age_hours = providerStatus.last_backup_age_hours
          }

          // Collect alerts
          backupStatus.alerts.push(...providerStatus.alerts)
        } catch (error) {
          loggers.main.warn(`Failed to check backup status for ${provider}`, { error: error.message })
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: backupStatus,
        timestamp: Date.now()
      })

      return backupStatus
    } catch (error) {
      loggers.main.error('Failed to get backup status', { error: error.message })
      return {
        overall_status: 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get backup status for specific provider
   */
  async getProviderBackupStatus(provider) {
    const providerDir = path.join(this.backupDir, provider)
    const status = {
      provider,
      status: 'healthy',
      configured: false,
      last_backup: null,
      last_backup_age_hours: 0,
      backup_count: {
        daily: 0,
        schema: 0,
        incremental: 0
      },
      file_sizes: {
        latest_mb: 0,
        total_mb: 0
      },
      alerts: [],
      retention_status: 'compliant'
    }

    try {
      // Check if provider is configured
      status.configured = await this.isProviderConfigured(provider)

      if (!status.configured) {
        status.status = 'not_configured'
        return status
      }

      // Check if backup directory exists
      try {
        await fs.access(providerDir)
      } catch {
        status.alerts.push({
          level: 'warning',
          message: `Backup directory not found: ${providerDir}`,
          timestamp: new Date().toISOString()
        })
        status.status = 'warning'
        return status
      }

      // Check daily backups
      const dailyDir = path.join(providerDir, 'daily')
      try {
        const dailyFiles = await this.getBackupFiles(dailyDir)
        status.backup_count.daily = dailyFiles.length

        if (dailyFiles.length > 0) {
          const latestBackup = dailyFiles[0] // Files are sorted by date
          status.last_backup = {
            file: latestBackup.name,
            timestamp: latestBackup.mtime.toISOString(),
            size_mb: Math.round(latestBackup.size / 1024 / 1024 * 100) / 100
          }

          status.last_backup_age_hours = Math.round(
            (Date.now() - latestBackup.mtime.getTime()) / (1000 * 60 * 60) * 100
          ) / 100

          status.file_sizes.latest_mb = status.last_backup.size_mb
          status.file_sizes.total_mb = Math.round(
            dailyFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024 * 100
          ) / 100
        }
      } catch (error) {
        loggers.main.debug(`Failed to read daily backups for ${provider}`, { error: error.message })
      }

      // Check schema backups
      try {
        const schemaDir = path.join(providerDir, 'schema')
        const schemaFiles = await this.getBackupFiles(schemaDir)
        status.backup_count.schema = schemaFiles.length
      } catch (error) {
        loggers.main.debug(`Failed to read schema backups for ${provider}`, { error: error.message })
      }

      // Check incremental backups
      try {
        const incrementalDir = path.join(providerDir, 'incremental')
        const incrementalFiles = await this.getBackupFiles(incrementalDir)
        status.backup_count.incremental = incrementalFiles.length
      } catch (error) {
        loggers.main.debug(`Failed to read incremental backups for ${provider}`, { error: error.message })
      }

      // Evaluate status based on backup age and availability
      this.evaluateProviderStatus(status)

      return status
    } catch (error) {
      status.status = 'error'
      status.alerts.push({
        level: 'error',
        message: `Failed to check backup status: ${error.message}`,
        timestamp: new Date().toISOString()
      })
      return status
    }
  }

  /**
   * Check if provider is configured
   */
  async isProviderConfigured(provider) {
    switch (provider) {
      case 'postgresql':
        return !!process.env.DATABASE_URL
      case 'supabase':
        return !!(process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_URL)
      case 'planetscale':
        return !!(process.env.PLANETSCALE_HOST && process.env.PLANETSCALE_USERNAME)
      case 'neon':
        return !!process.env.NEON_DATABASE_URL
      case 'railway':
        return !!process.env.RAILWAY_DATABASE_URL
      default:
        return false
    }
  }

  /**
   * Get backup files from directory, sorted by modification time (newest first)
   */
  async getBackupFiles(dir) {
    try {
      const files = await fs.readdir(dir)
      const backupFiles = files.filter(file =>
        file.endsWith('.dump') || file.endsWith('.sql')
      )

      const fileStats = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(dir, file)
          const stats = await fs.stat(filePath)
          return {
            name: file,
            path: filePath,
            size: stats.size,
            mtime: stats.mtime,
            ctime: stats.ctime
          }
        })
      )

      // Sort by modification time, newest first
      return fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    } catch (error) {
      return []
    }
  }

  /**
   * Evaluate provider backup status and generate alerts
   */
  evaluateProviderStatus(status) {
    const maxBackupAge = parseInt(process.env.BACKUP_MAX_AGE_HOURS) || 26 // 26 hours default
    const minBackupCount = parseInt(process.env.BACKUP_MIN_COUNT) || 1

    // Check backup age
    if (status.last_backup_age_hours > maxBackupAge) {
      status.status = 'critical'
      status.alerts.push({
        level: 'critical',
        message: `Last backup is ${status.last_backup_age_hours} hours old (max: ${maxBackupAge} hours)`,
        timestamp: new Date().toISOString()
      })
    } else if (status.last_backup_age_hours > (maxBackupAge * 0.8)) {
      status.status = 'warning'
      status.alerts.push({
        level: 'warning',
        message: `Backup age approaching limit: ${status.last_backup_age_hours} hours`,
        timestamp: new Date().toISOString()
      })
    }

    // Check backup count
    if (status.backup_count.daily < minBackupCount) {
      if (status.status === 'healthy') status.status = 'warning'
      status.alerts.push({
        level: 'warning',
        message: `Low backup count: ${status.backup_count.daily} (min: ${minBackupCount})`,
        timestamp: new Date().toISOString()
      })
    }

    // Check backup file size (if too small, might indicate corruption)
    const minFileSize = parseFloat(process.env.BACKUP_MIN_SIZE_MB) || 0.1
    if (status.file_sizes.latest_mb > 0 && status.file_sizes.latest_mb < minFileSize) {
      if (status.status === 'healthy') status.status = 'warning'
      status.alerts.push({
        level: 'warning',
        message: `Latest backup file is very small: ${status.file_sizes.latest_mb}MB`,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Get backup storage status
   */
  async getStorageStatus() {
    try {
      const stats = await fs.stat(this.backupDir)

      // Get directory size (approximate)
      const totalSize = await this.getDirectorySize(this.backupDir)

      return {
        backup_directory: this.backupDir,
        exists: true,
        total_size_mb: Math.round(totalSize / 1024 / 1024 * 100) / 100,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        permissions: stats.mode.toString(8).slice(-3)
      }
    } catch (error) {
      return {
        backup_directory: this.backupDir,
        exists: false,
        error: error.message
      }
    }
  }

  /**
   * Calculate directory size recursively
   */
  async getDirectorySize(dir) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true })
      let totalSize = 0

      for (const file of files) {
        const filePath = path.join(dir, file.name)
        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath)
        } else {
          const stats = await fs.stat(filePath)
          totalSize += stats.size
        }
      }

      return totalSize
    } catch (error) {
      return 0
    }
  }

  /**
   * Generate Prometheus metrics for backup monitoring
   */
  async getPrometheusMetrics() {
    const backupStatus = await this.getBackupStatus()
    const metrics = []

    // Overall backup status
    metrics.push('# HELP backup_status Overall backup system status (1=healthy, 0.5=warning, 0=critical)')
    metrics.push('# TYPE backup_status gauge')
    const statusValue = backupStatus.overall_status === 'healthy'
      ? 1
      : (backupStatus.overall_status === 'warning' ? 0.5 : 0)
    metrics.push(`backup_status ${statusValue}`)
    metrics.push('')

    // Backup age
    metrics.push('# HELP backup_age_hours Hours since last backup')
    metrics.push('# TYPE backup_age_hours gauge')
    metrics.push(`backup_age_hours ${backupStatus.last_backup_age_hours}`)
    metrics.push('')

    // Per-provider metrics
    for (const [provider, status] of Object.entries(backupStatus.providers)) {
      if (status.configured) {
        // Provider backup count
        metrics.push(`# HELP backup_count_${provider} Number of backups for ${provider}`)
        metrics.push(`# TYPE backup_count_${provider} gauge`)
        metrics.push(`backup_count_daily{provider="${provider}"} ${status.backup_count.daily}`)
        metrics.push(`backup_count_schema{provider="${provider}"} ${status.backup_count.schema}`)
        metrics.push(`backup_count_incremental{provider="${provider}"} ${status.backup_count.incremental}`)
        metrics.push('')

        // Provider backup size
        metrics.push(`# HELP backup_size_mb_${provider} Backup file sizes in MB for ${provider}`)
        metrics.push(`# TYPE backup_size_mb_${provider} gauge`)
        metrics.push(`backup_size_latest{provider="${provider}"} ${status.file_sizes.latest_mb}`)
        metrics.push(`backup_size_total{provider="${provider}"} ${status.file_sizes.total_mb}`)
        metrics.push('')

        // Provider status
        const providerStatusValue = status.status === 'healthy'
          ? 1
          : (status.status === 'warning' ? 0.5 : 0)
        metrics.push(`backup_provider_status{provider="${provider}"} ${providerStatusValue}`)
      }
    }

    // Storage metrics
    if (backupStatus.storage && backupStatus.storage.exists) {
      metrics.push('# HELP backup_storage_size_mb Total backup storage size in MB')
      metrics.push('# TYPE backup_storage_size_mb gauge')
      metrics.push(`backup_storage_size_mb ${backupStatus.storage.total_size_mb}`)
      metrics.push('')
    }

    return metrics.join('\n')
  }

  /**
   * Check if backup alerts should be sent
   */
  async shouldSendAlert(alert) {
    // Simple alert throttling - don't send same alert more than once per hour
    const alertKey = `${alert.level}_${alert.message}`
    const lastSent = this.cache.get(`alert_${alertKey}`)

    if (lastSent && (Date.now() - lastSent) < 3600000) { // 1 hour
      return false
    }

    this.cache.set(`alert_${alertKey}`, Date.now())
    return true
  }

  /**
   * Get backup verification status
   */
  async getBackupVerificationStatus() {
    // This would integrate with the test-backup-recovery.sh script
    // For now, return basic verification info
    return {
      last_verification: null,
      verification_status: 'not_implemented',
      verification_frequency: 'weekly',
      message: 'Automatic backup verification not yet implemented'
    }
  }
}

module.exports = new BackupMonitoringService()
