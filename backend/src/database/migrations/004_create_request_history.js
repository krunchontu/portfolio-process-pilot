/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('request_history', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('request_id').references('id').inTable('requests').onDelete('CASCADE');
    table.uuid('actor_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('actor_email'); // Backup in case user is deleted
    table.string('actor_role');
    table.enum('action', ['submit', 'approve', 'reject', 'cancel', 'escalate', 'sla_timeout']).notNullable();
    table.string('step_id');
    table.text('comment');
    table.jsonb('metadata');
    table.timestamp('performed_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['request_id']);
    table.index(['actor_id']);
    table.index(['action']);
    table.index(['performed_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('request_history');
};