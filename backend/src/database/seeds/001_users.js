const bcrypt = require('bcryptjs')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Clear existing entries
  await knex('users').del()

  // Hash password for all users (using 'password123' for demo)
  const passwordHash = await bcrypt.hash('password123', 12)

  // Insert seed entries
  await knex('users').insert([
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@processpilot.com',
      password_hash: passwordHash,
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin',
      department: 'IT',
      is_active: true
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'manager.hr@processpilot.com',
      password_hash: passwordHash,
      first_name: 'Sarah',
      last_name: 'Johnson',
      role: 'manager',
      department: 'HR',
      is_active: true
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'manager.it@processpilot.com',
      password_hash: passwordHash,
      first_name: 'Mike',
      last_name: 'Chen',
      role: 'manager',
      department: 'IT',
      is_active: true
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'employee.jane@processpilot.com',
      password_hash: passwordHash,
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'employee',
      department: 'HR',
      manager_id: '00000000-0000-0000-0000-000000000002',
      is_active: true
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'employee.john@processpilot.com',
      password_hash: passwordHash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'employee',
      department: 'IT',
      manager_id: '00000000-0000-0000-0000-000000000003',
      is_active: true
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      email: 'employee.alice@processpilot.com',
      password_hash: passwordHash,
      first_name: 'Alice',
      last_name: 'Brown',
      role: 'employee',
      department: 'Marketing',
      is_active: true
    }
  ])

  console.log('✅ Users seeded successfully')
  console.log('📧 Demo login credentials:')
  console.log('   Admin: admin@processpilot.com / password123')
  console.log('   Manager: manager.hr@processpilot.com / password123')
  console.log('   Employee: employee.jane@processpilot.com / password123')
}
