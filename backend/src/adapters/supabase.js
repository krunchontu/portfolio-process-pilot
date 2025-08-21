/**
 * Supabase Integration Adapter
 * 
 * This adapter provides additional Supabase-specific features on top of the standard PostgreSQL connection.
 * It includes authentication integration, real-time subscriptions, and edge functions.
 */

const { createClient } = require('@supabase/supabase-js')
const { logger } = require('../utils/logger')

class SupabaseAdapter {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Client for public operations (with RLS)
    this.client = null
    // Admin client for server operations (bypasses RLS)
    this.adminClient = null
    
    this.initialized = false
  }

  /**
   * Initialize Supabase clients
   */
  async initialize() {
    if (this.initialized) return

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      logger.warn('⚠️ Supabase URL or Anon Key not provided - Supabase features disabled')
      return
    }

    try {
      // Public client (respects RLS)
      this.client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      // Admin client (bypasses RLS)
      if (this.supabaseServiceKey) {
        this.adminClient = createClient(this.supabaseUrl, this.supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
      }

      this.initialized = true
      logger.info('✅ Supabase adapter initialized successfully')
    } catch (error) {
      logger.error('❌ Failed to initialize Supabase adapter:', error)
      throw error
    }
  }

  /**
   * Get client for operations (public or admin)
   */
  getClient(admin = false) {
    if (!this.initialized) {
      throw new Error('Supabase adapter not initialized. Call initialize() first.')
    }
    return admin ? (this.adminClient || this.client) : this.client
  }

  /**
   * Authenticate user with Supabase Auth (if using Supabase Auth instead of JWT)
   */
  async authenticateUser(email, password) {
    const client = this.getClient()
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      logger.error('Supabase auth error:', error)
      throw new Error(error.message)
    }
    
    return data
  }

  /**
   * Create user with Supabase Auth
   */
  async createUser(email, password, metadata = {}) {
    const client = this.getClient(true) // Use admin client
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    })
    
    if (error) {
      logger.error('Supabase user creation error:', error)
      throw new Error(error.message)
    }
    
    return data
  }

  /**
   * Set up real-time subscription for request updates
   */
  async subscribeToRequests(callback) {
    const client = this.getClient()
    
    const subscription = client
      .channel('requests_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'requests'
      }, callback)
      .subscribe()
    
    logger.info('📡 Real-time subscription set up for requests table')
    return subscription
  }

  /**
   * Set up real-time subscription for request history
   */
  async subscribeToRequestHistory(requestId, callback) {
    const client = this.getClient()
    
    const subscription = client
      .channel(`request_history_${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'request_history',
        filter: `request_id=eq.${requestId}`
      }, callback)
      .subscribe()
    
    logger.info(`📡 Real-time subscription set up for request ${requestId} history`)
    return subscription
  }

  /**
   * Use Supabase Storage for file uploads
   */
  async uploadFile(bucket, filePath, file, options = {}) {
    const client = this.getClient()
    
    const { data, error } = await client.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      })
    
    if (error) {
      logger.error('Supabase storage upload error:', error)
      throw new Error(error.message)
    }
    
    return data
  }

  /**
   * Get public URL for uploaded file
   */
  getFilePublicUrl(bucket, filePath) {
    const client = this.getClient()
    const { data } = client.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return data.publicUrl
  }

  /**
   * Call Supabase Edge Function
   */
  async callEdgeFunction(functionName, body = {}, options = {}) {
    const client = this.getClient()
    
    const { data, error } = await client.functions.invoke(functionName, {
      body,
      ...options
    })
    
    if (error) {
      logger.error(`Supabase edge function ${functionName} error:`, error)
      throw new Error(error.message)
    }
    
    return data
  }

  /**
   * Get database statistics using Supabase's built-in analytics
   */
  async getDatabaseStats() {
    const client = this.getClient(true)
    
    try {
      // Get table sizes
      const { data: tableSizes } = await client.rpc('get_table_sizes')
      
      // Get connection count
      const { data: connections } = await client.rpc('get_connection_count')
      
      return {
        tableSizes,
        connections,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to get Supabase database stats:', error)
      return null
    }
  }

  /**
   * Health check for Supabase services
   */
  async healthCheck() {
    try {
      const client = this.getClient()
      
      // Test database connection
      const { data, error } = await client.from('users').select('count').limit(1)
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
        throw error
      }

      return {
        status: 'healthy',
        database: 'connected',
        realtime: client.realtime?.isConnected() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Supabase health check failed:', error)
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Export singleton instance
const supabaseAdapter = new SupabaseAdapter()

module.exports = {
  supabaseAdapter,
  SupabaseAdapter
}