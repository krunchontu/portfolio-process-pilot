/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('workflows', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name').notNullable()
    table.string('flow_id').notNullable().unique()
    table.text('description')
    table.jsonb('steps').notNullable()
    table.jsonb('notifications')
    table.boolean('is_active').defaultTo(true)
    table.uuid('created_by').references('id').inTable('users')
    table.timestamps(true, true)

    // Indexes
    table.index(['flow_id'])
    table.index(['is_active'])
    table.index(['created_by'])
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('workflows')
}
