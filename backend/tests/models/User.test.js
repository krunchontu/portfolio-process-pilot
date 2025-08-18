const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'john@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'employee',
        department: 'IT'
      };
      
      const user = await User.create(userData);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.first_name).toBe(userData.first_name);
      expect(user.last_name).toBe(userData.last_name);
      expect(user.role).toBe(userData.role);
      expect(user.department).toBe(userData.department);
      expect(user.is_active).toBe(true);
      expect(user.password_hash).toBeUndefined(); // Should be removed from response
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });
    
    it('should hash the password correctly', async () => {
      const userData = {
        email: 'jane@example.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Smith'
      };
      
      await User.create(userData);
      
      // Get user with password hash
      const userWithPassword = await User.findByEmail(userData.email);
      expect(userWithPassword.password_hash).toBeDefined();
      expect(userWithPassword.password_hash).not.toBe(userData.password);
      
      // Verify password can be validated
      const isValid = await bcrypt.compare(userData.password, userWithPassword.password_hash);
      expect(isValid).toBe(true);
    });
    
    it('should set default role to employee', async () => {
      const userData = {
        email: 'default@example.com',
        password: 'password123',
        first_name: 'Default',
        last_name: 'User'
      };
      
      const user = await User.create(userData);
      expect(user.role).toBe('employee');
    });
  });
  
  describe('findById', () => {
    it('should find user by ID and exclude password hash', async () => {
      const createdUser = await testUtils.createTestUser({
        email: 'find@example.com'
      });
      
      const foundUser = await User.findById(createdUser.id);
      
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(createdUser.email);
      expect(foundUser.password_hash).toBeUndefined();
    });
    
    it('should return null for non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000999';
      const user = await User.findById(nonExistentId);
      expect(user).toBeNull();
    });
  });
  
  describe('findByEmail', () => {
    it('should find user by email including password hash', async () => {
      const userData = {
        email: 'findby@example.com',
        password: 'password123',
        first_name: 'Find',
        last_name: 'ByEmail'
      };
      
      await User.create(userData);
      const user = await User.findByEmail(userData.email);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password_hash).toBeDefined();
    });
    
    it('should be case insensitive', async () => {
      await testUtils.createTestUser({
        email: 'case@example.com'
      });
      
      const user = await User.findByEmail('CASE@EXAMPLE.COM');
      expect(user).toBeDefined();
      expect(user.email).toBe('case@example.com');
    });
  });
  
  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const password = 'testpassword123';
      const user = await testUtils.createTestUser({ password });
      const userWithPassword = await User.findByEmail(user.email);
      
      const isValid = await User.validatePassword(password, userWithPassword.password_hash);
      expect(isValid).toBe(true);
    });
    
    it('should reject incorrect password', async () => {
      const user = await testUtils.createTestUser({ password: 'correct123' });
      const userWithPassword = await User.findByEmail(user.email);
      
      const isValid = await User.validatePassword('wrong123', userWithPassword.password_hash);
      expect(isValid).toBe(false);
    });
  });
  
  describe('update', () => {
    it('should update user information', async () => {
      const user = await testUtils.createTestUser();
      
      const updates = {
        first_name: 'Updated',
        last_name: 'Name',
        department: 'Marketing'
      };
      
      const updatedUser = await User.update(user.id, updates);
      
      expect(updatedUser.first_name).toBe(updates.first_name);
      expect(updatedUser.last_name).toBe(updates.last_name);
      expect(updatedUser.department).toBe(updates.department);
      expect(updatedUser.updated_at).toBeDefined();
    });
    
    it('should hash new password when updating', async () => {
      const user = await testUtils.createTestUser();
      const newPassword = 'newpassword123';
      
      await User.update(user.id, { password: newPassword });
      
      const updatedUser = await User.findByEmail(user.email);
      const isValid = await User.validatePassword(newPassword, updatedUser.password_hash);
      expect(isValid).toBe(true);
    });
  });
  
  describe('list', () => {
    beforeEach(async () => {
      // Create test users
      await testUtils.createTestUser({ 
        email: 'emp1@example.com', 
        role: 'employee', 
        department: 'IT',
        is_active: true 
      });
      await testUtils.createTestUser({ 
        email: 'mgr1@example.com', 
        role: 'manager', 
        department: 'IT',
        is_active: true 
      });
      await testUtils.createTestUser({ 
        email: 'emp2@example.com', 
        role: 'employee', 
        department: 'HR',
        is_active: false 
      });
    });
    
    it('should list all users without filters', async () => {
      const users = await User.list();
      expect(users).toHaveLength(3);
      
      // Should exclude password hash
      users.forEach(user => {
        expect(user.password_hash).toBeUndefined();
      });
    });
    
    it('should filter by role', async () => {
      const employees = await User.list({ role: 'employee' });
      expect(employees).toHaveLength(2);
      employees.forEach(user => {
        expect(user.role).toBe('employee');
      });
    });
    
    it('should filter by department', async () => {
      const itUsers = await User.list({ department: 'IT' });
      expect(itUsers).toHaveLength(2);
      itUsers.forEach(user => {
        expect(user.department).toBe('IT');
      });
    });
    
    it('should filter by active status', async () => {
      const activeUsers = await User.list({ is_active: true });
      expect(activeUsers).toHaveLength(2);
      activeUsers.forEach(user => {
        expect(user.is_active).toBe(true);
      });
    });
  });
});