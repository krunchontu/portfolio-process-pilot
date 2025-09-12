const { db } = require('../database/connection')
const bcrypt = require('bcryptjs')
const { DATABASE } = require('../constants')

class User {
  static get tableName() {
    return 'users'
  }

  // Convert database record to API response format (snake_case → camelCase)
  static mapToApiResponse(user) {
    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }
  }

  // Convert multiple database records to API response format
  static mapArrayToApiResponse(users) {
    return users.map(user => this.mapToApiResponse(user))
  }

  // Convert camelCase input to snake_case for database operations
  static mapToDbColumns(userData) {
    const mapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      isActive: 'is_active',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }

    const dbData = {}
    for (const [key, value] of Object.entries(userData)) {
      const dbKey = mapping[key] || key
      dbData[dbKey] = value
    }
    return dbData
  }

  // Create new user
  static async create(userData) {
    const { password, ...rest } = userData
    const passwordHash = await bcrypt.hash(password, DATABASE.BCRYPT_SALT_ROUNDS)

    // Convert camelCase to snake_case for database
    const dbData = this.mapToDbColumns(rest)

    const [user] = await db(this.tableName)
      .insert({ ...dbData, password_hash: passwordHash })
      .returning('*')

    // Remove password hash from returned object
    delete user.password_hash
    return this.mapToApiResponse(user)
  }

  // Find user by ID (returns raw database record for internal use)
  static async findById(id) {
    const user = await db(this.tableName)
      .where('id', id)
      .first()

    if (user) {
      delete user.password_hash
    }
    return user
  }

  // Find user by ID for API response (returns mapped camelCase)
  static async findByIdForApi(id) {
    const user = await this.findById(id)
    return this.mapToApiResponse(user)
  }

  // Find user by email (returns raw database record for authentication)
  static async findByEmail(email) {
    return await db(this.tableName)
      .where('email', email)
      .first()
  }

  // Find user by email for API response (returns mapped camelCase)
  static async findByEmailForApi(email) {
    const user = await this.findByEmail(email)
    if (user) {
      delete user.password_hash
      return this.mapToApiResponse(user)
    }
    return null
  }

  // Validate password
  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }

  // Update user
  static async update(id, updates) {
    // Convert camelCase to snake_case for database
    const dbUpdates = this.mapToDbColumns(updates)

    if (updates.password) {
      dbUpdates.password_hash = await bcrypt.hash(updates.password, DATABASE.BCRYPT_SALT_ROUNDS)
      delete dbUpdates.password
    }

    const [user] = await db(this.tableName)
      .where('id', id)
      .update({ ...dbUpdates, updated_at: new Date() })
      .returning('*')

    if (user) {
      delete user.password_hash
      return this.mapToApiResponse(user)
    }
    return null
  }

  // Update last login
  static async updateLastLogin(id) {
    return await db(this.tableName)
      .where('id', id)
      .update({ last_login: new Date() })
  }

  // List users with filters and pagination
  static async list(options = {}) {
    const { role, department, active, search, limit = 50, offset = 0 } = options

    let query = db(this.tableName)
      .select([
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'department',
        'is_active',
        'last_login',
        'created_at',
        'updated_at'
      ])

    // Apply filters
    if (role) {
      query = query.where('role', role)
    }

    if (department) {
      query = query.where('department', department)
    }

    if (active !== undefined) {
      query = query.where('is_active', active)
    }

    if (search) {
      query = query.where(function () {
        this.whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('department', `%${search}%`)
      })
    }

    const users = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return this.mapArrayToApiResponse(users)
  }

  // Count users with filters
  static async count(options = {}) {
    const { role, department, active, search } = options

    let query = db(this.tableName)

    // Apply filters
    if (role) {
      query = query.where('role', role)
    }

    if (department) {
      query = query.where('department', department)
    }

    if (active !== undefined) {
      query = query.where('is_active', active)
    }

    if (search) {
      query = query.where(function () {
        this.whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('department', `%${search}%`)
      })
    }

    const result = await query.count('* as count').first()
    return parseInt(result.count)
  }

  // Delete user (soft delete)
  static async delete(id) {
    return await db(this.tableName)
      .where('id', id)
      .update({ is_active: false, updated_at: new Date() })
  }

  // Get managers for department
  static async getManagersByDepartment(department) {
    const managers = await db(this.tableName)
      .select('id', 'email', 'first_name', 'last_name')
      .where('role', 'manager')
      .where('department', department)
      .where('is_active', true)

    return this.mapArrayToApiResponse(managers)
  }
}

module.exports = User
