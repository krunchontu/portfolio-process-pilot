/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Clear existing entries
  await knex('workflows').del()

  // Insert seed workflows
  await knex('workflows').insert([
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Leave Request Approval',
      flow_id: 'leave-approval',
      description: 'Standard leave request approval workflow',
      steps: JSON.stringify([
        {
          stepId: 'mgr-approval',
          order: 1,
          role: 'manager',
          actions: ['approve', 'reject'],
          slaHours: 48,
          onTimeout: {
            escalateTo: 'admin'
          }
        }
      ]),
      notifications: JSON.stringify({
        onSubmit: ['manager'],
        onApprove: ['employee'],
        onReject: ['employee', 'manager']
      }),
      is_active: true,
      created_by: '00000000-0000-0000-0000-000000000001'
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Expense Approval (Two-Step)',
      flow_id: 'expense-approval',
      description: 'Two-step expense approval for amounts over $500',
      steps: JSON.stringify([
        {
          stepId: 'mgr-approval',
          order: 1,
          role: 'manager',
          actions: ['approve', 'reject'],
          slaHours: 24,
          onTimeout: {
            escalateTo: 'admin'
          }
        },
        {
          stepId: 'admin-approval',
          order: 2,
          role: 'admin',
          actions: ['approve', 'reject'],
          slaHours: 72,
          required: false
        }
      ]),
      notifications: JSON.stringify({
        onSubmit: ['manager'],
        onApprove: ['employee'],
        onReject: ['employee', 'manager'],
        onEscalate: ['admin']
      }),
      is_active: true,
      created_by: '00000000-0000-0000-0000-000000000001'
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'Equipment Request',
      flow_id: 'equipment-request',
      description: 'IT equipment request approval workflow',
      steps: JSON.stringify([
        {
          stepId: 'it-manager-approval',
          order: 1,
          role: 'manager',
          actions: ['approve', 'reject'],
          slaHours: 48
        }
      ]),
      notifications: JSON.stringify({
        onSubmit: ['manager'],
        onApprove: ['employee'],
        onReject: ['employee']
      }),
      is_active: true,
      created_by: '00000000-0000-0000-0000-000000000003'
    }
  ])

  console.log('✅ Workflows seeded successfully')
}
