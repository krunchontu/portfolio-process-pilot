/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('requests', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('type').notNullable()
    table.uuid('workflow_id').references('id').inTable('workflows').onDelete('RESTRICT')
    table.uuid('created_by').references('id').inTable('users').onDelete('RESTRICT')
    table.jsonb('payload').notNullable()
    table.enum('status', ['pending', 'approved', 'rejected', 'cancelled']).notNullable().defaultTo('pending')
    table.integer('current_step_index').defaultTo(0)
    table.jsonb('steps').notNullable()
    table.timestamp('submitted_at').defaultTo(knex.fn.now())
    table.timestamp('completed_at')
    table.integer('sla_hours')
    table.timestamp('sla_deadline')
    table.timestamps(true, true)

    // Indexes
    table.index(['type'])
    table.index(['status'])
    table.index(['created_by'])
    table.index(['workflow_id'])
    table.index(['submitted_at'])
    table.index(['sla_deadline'])
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('requests')
}
