const { db } = require('../database/connection')
const bcrypt = require('bcryptjs')
const { DATABASE } = require('../constants')

class User {
  static get tableName() {
    return 'users'
  }

  // Create new user
  static async create(userData) {
    const { password, ...rest } = userData
    const password_hash = await bcrypt.hash(password, DATABASE.BCRYPT_SALT_ROUNDS)

    const [user] = await db(this.tableName)
      .insert({ ...rest, password_hash })
      .returning('*')

    // Remove password hash from returned object
    delete user.password_hash
    return user
  }

  // Find user by ID
  static async findById(id) {
    const user = await db(this.tableName)
      .where('id', id)
      .first()

    if (user) {
      delete user.password_hash
    }
    return user
  }

  // Find user by email
  static async findByEmail(email) {
    return await db(this.tableName)
      .where('email', email)
      .first()
  }

  // Validate password
  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }

  // Update user
  static async update(id, updates) {
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, DATABASE.BCRYPT_SALT_ROUNDS)
      delete updates.password
    }

    const [user] = await db(this.tableName)
      .where('id', id)
      .update({ ...updates, updated_at: new Date() })
      .returning('*')

    if (user) {
      delete user.password_hash
    }
    return user
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

    return await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
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
    return await db(this.tableName)
      .select('id', 'email', 'first_name', 'last_name')
      .where('role', 'manager')
      .where('department', department)
      .where('is_active', true)
  }
}

module.exports = User
