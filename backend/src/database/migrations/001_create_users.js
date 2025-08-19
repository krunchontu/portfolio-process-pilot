/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('email').notNullable().unique()
    table.string('password_hash').notNullable()
    table.string('first_name').notNullable()
    table.string('last_name').notNullable()
    table.enum('role', ['employee', 'manager', 'admin']).notNullable().defaultTo('employee')
    table.string('department')
    table.string('manager_id')
    table.boolean('is_active').defaultTo(true)
    table.timestamp('last_login')
    table.timestamps(true, true)

    // Indexes
    table.index(['email'])
    table.index(['role'])
    table.index(['department'])
    table.index(['is_active'])
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('users')
}
