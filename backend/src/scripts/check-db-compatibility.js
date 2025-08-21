#!/usr/bin/env node

/**
 * Database Compatibility Checker
 *
 * Checks if the current database provider setup is compatible with the application
 * and suggests any required changes or installations.
 */

require('dotenv').config()
const { databaseConfig, getConnectionInfo } = require('../config/database')
const { logger } = require('../utils/logger')

async function checkCompatibility() {
  console.log('🔍 Checking database compatibility...\n')

  try {
    // Get connection info
    const connectionInfo = getConnectionInfo()
    console.log(`📊 Provider: ${connectionInfo.provider}`)
    console.log(`🏠 Host: ${connectionInfo.host}`)
    console.log(`🚪 Port: ${connectionInfo.port}`)
    console.log(`💾 Database: ${connectionInfo.database}`)
    console.log(`🔒 SSL: ${connectionInfo.ssl ? 'enabled' : 'disabled'}\n`)

    // Check required dependencies
    const requiredDeps = checkRequiredDependencies(connectionInfo.provider)
    if (requiredDeps.missing.length > 0) {
      console.log('❌ Missing required dependencies:')
      requiredDeps.missing.forEach(dep => {
        console.log(`   📦 ${dep.name} - ${dep.reason}`)
        console.log(`   💿 Install with: npm install ${dep.name}`)
      })
      console.log()
    } else {
      console.log('✅ All required dependencies are installed\n')
    }

    // Check configuration
    const configIssues = checkConfiguration(connectionInfo.provider, databaseConfig)
    if (configIssues.length > 0) {
      console.log('⚠️ Configuration issues found:')
      configIssues.forEach(issue => {
        console.log(`   🔧 ${issue}`)
      })
      console.log()
    } else {
      console.log('✅ Configuration looks good\n')
    }

    // Test connection (if possible)
    await testConnection(databaseConfig)

    // Provider-specific recommendations
    providerRecommendations(connectionInfo.provider)
  } catch (error) {
    console.error('❌ Compatibility check failed:', error.message)
    process.exit(1)
  }
}

function checkRequiredDependencies(provider) {
  const missing = []

  switch (provider) {
    case 'supabase':
      try {
        require.resolve('@supabase/supabase-js')
      } catch (e) {
        missing.push({
          name: '@supabase/supabase-js',
          reason: 'Required for Supabase-specific features'
        })
      }
      break

    case 'planetscale':
      try {
        require.resolve('mysql2')
      } catch (e) {
        missing.push({
          name: 'mysql2',
          reason: 'Required for MySQL/PlanetScale connections'
        })
      }
      break
  }

  // Check PostgreSQL driver for PostgreSQL-based providers
  const pgProviders = ['postgresql', 'supabase', 'neon', 'railway', 'generic']
  if (pgProviders.includes(provider)) {
    try {
      require.resolve('pg')
    } catch (e) {
      missing.push({
        name: 'pg',
        reason: 'Required for PostgreSQL connections'
      })
    }
  }

  return { missing }
}

function checkConfiguration(provider, config) {
  const issues = []

  // Check connection configuration
  if (!config.connection) {
    issues.push('Missing database connection configuration')
    return issues
  }

  // Provider-specific checks
  switch (provider) {
    case 'supabase':
      if (typeof config.connection === 'string') {
        if (!config.connection.includes('supabase.co')) {
          issues.push('Connection string does not appear to be a Supabase URL')
        }
      }
      break

    case 'planetscale':
      if (typeof config.connection === 'string') {
        if (!config.connection.includes('mysql://')) {
          issues.push('PlanetScale requires MySQL connection string (mysql://)')
        }
      }
      break

    case 'neon':
      if (typeof config.connection === 'string') {
        if (!config.connection.includes('neon.tech') && !config.connection.includes('neon.db')) {
          issues.push('Connection string does not appear to be a Neon URL')
        }
      }
      break
  }

  // Check pool configuration
  if (config.pool) {
    if (config.pool.min > config.pool.max) {
      issues.push('Pool min connections cannot be greater than max connections')
    }

    // Serverless recommendations
    if (['neon', 'planetscale'].includes(provider) && config.pool.min > 0) {
      issues.push('For serverless providers, consider setting DB_POOL_MIN=0 for cost optimization')
    }
  }

  return issues
}

async function testConnection(config) {
  console.log('🔗 Testing database connection...')

  try {
    const knex = require('knex')
    const db = knex(config)

    // Simple connection test
    await db.raw('SELECT 1 as test')
    console.log('✅ Database connection successful\n')

    // Check if tables exist
    const tableExists = await db.schema.hasTable('users')
    if (tableExists) {
      console.log('✅ Application tables detected (migrations have been run)\n')
    } else {
      console.log('⚠️ Application tables not found. Run migrations with: npm run db:migrate\n')
    }

    await db.destroy()
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`)
    console.log('💡 Make sure your database is running and credentials are correct\n')
  }
}

function providerRecommendations(provider) {
  console.log('💡 Provider-specific recommendations:\n')

  switch (provider) {
    case 'supabase':
      console.log('📱 Supabase Features Available:')
      console.log('   - Real-time subscriptions for live updates')
      console.log('   - Built-in file storage')
      console.log('   - Edge functions for serverless logic')
      console.log('   - Built-in authentication (optional)')
      console.log()
      console.log('🚀 Quick setup: npm run setup:supabase')
      break

    case 'planetscale':
      console.log('🌟 PlanetScale Features:')
      console.log('   - Serverless scaling')
      console.log('   - Database branching for schema changes')
      console.log('   - Built-in analytics')
      console.log()
      console.log('🚀 Quick setup: npm run setup:planetscale')
      console.log('⚠️ Note: Some PostgreSQL-specific features may need adjustment')
      break

    case 'neon':
      console.log('⚡ Neon Features:')
      console.log('   - Serverless PostgreSQL')
      console.log('   - Database branching')
      console.log('   - Scale to zero when idle')
      console.log()
      console.log('💰 Cost optimization: Set DB_POOL_MIN=0')
      break

    case 'railway':
      console.log('🚂 Railway Features:')
      console.log('   - Simple deployment')
      console.log('   - Built-in CI/CD')
      console.log('   - One-click PostgreSQL')
      break

    case 'postgresql':
      console.log('🐘 Local PostgreSQL:')
      console.log('   - Full control over configuration')
      console.log('   - Great for development')
      console.log('   - Consider connection pooling for production')
      break

    default:
      console.log('⚙️ Generic Configuration:')
      console.log('   - Make sure your database is PostgreSQL compatible')
      console.log('   - Test all features thoroughly')
      console.log('   - Monitor connection pool usage')
  }

  console.log()
  console.log('📚 For detailed setup instructions, see: docs/BaaS-Setup-Guide.md')
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkCompatibility().catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

module.exports = {
  checkCompatibility,
  checkRequiredDependencies,
  checkConfiguration
}
