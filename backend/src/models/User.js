const { db } = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
  static get tableName() {
    return 'users';
  }

  // Create new user
  static async create(userData) {
    const { password, ...rest } = userData;
    const password_hash = await bcrypt.hash(password, 12);
    
    const [user] = await db(this.tableName)
      .insert({ ...rest, password_hash })
      .returning('*');
    
    // Remove password hash from returned object
    delete user.password_hash;
    return user;
  }

  // Find user by ID
  static async findById(id) {
    const user = await db(this.tableName)
      .where('id', id)
      .first();
    
    if (user) {
      delete user.password_hash;
    }
    return user;
  }

  // Find user by email
  static async findByEmail(email) {
    return await db(this.tableName)
      .where('email', email)
      .first();
  }

  // Validate password
  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update user
  static async update(id, updates) {
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }
    
    const [user] = await db(this.tableName)
      .where('id', id)
      .update({ ...updates, updated_at: new Date() })
      .returning('*');
    
    if (user) {
      delete user.password_hash;
    }
    return user;
  }

  // Update last login
  static async updateLastLogin(id) {
    return await db(this.tableName)
      .where('id', id)
      .update({ last_login: new Date() });
  }

  // List users with filters
  static async list(filters = {}) {
    let query = db(this.tableName).select('id', 'email', 'first_name', 'last_name', 'role', 'department', 'is_active', 'created_at');
    
    if (filters.role) {
      query = query.where('role', filters.role);
    }
    
    if (filters.department) {
      query = query.where('department', filters.department);
    }
    
    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }
    
    return await query.orderBy('created_at', 'desc');
  }

  // Delete user (soft delete)
  static async delete(id) {
    return await db(this.tableName)
      .where('id', id)
      .update({ is_active: false, updated_at: new Date() });
  }

  // Get managers for department
  static async getManagersByDepartment(department) {
    return await db(this.tableName)
      .select('id', 'email', 'first_name', 'last_name')
      .where('role', 'manager')
      .where('department', department)
      .where('is_active', true);
  }
}

module.exports = User;