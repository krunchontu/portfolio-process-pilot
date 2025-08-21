const Workflow = require('../../src/models/Workflow');

describeWithDb('Workflow Model', () => {
  let testUser;
  
  beforeEach(async () => {
    testUser = await testUtils.createTestUser({
      email: 'admin@example.com',
      role: 'admin'
    });
  });
  
  describe('create', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        name: 'Leave Request',
        flow_id: 'leave-request',
        description: 'Standard leave request workflow',
        steps: [
          {
            stepId: 'manager-approval',
            order: 1,
            role: 'manager',
            actions: ['approve', 'reject'],
            slaHours: 48
          }
        ],
        notifications: {
          onSubmit: ['manager'],
          onApprove: ['employee']
        },
        created_by: testUser.id
      };
      
      const workflow = await Workflow.create(workflowData);
      
      expect(workflow).toBeDefined();
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe(workflowData.name);
      expect(workflow.flow_id).toBe(workflowData.flow_id);
      expect(workflow.description).toBe(workflowData.description);
      expect(workflow.steps).toEqual(workflowData.steps);
      expect(workflow.notifications).toEqual(workflowData.notifications);
      expect(workflow.is_active).toBe(true);
      expect(workflow.created_by).toBe(testUser.id);
    });
  });
  
  describe('findById', () => {
    it('should find workflow by ID with creator details', async () => {
      const workflow = await testUtils.createTestWorkflow({
        created_by: testUser.id
      });
      
      const found = await Workflow.findById(workflow.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(workflow.id);
      expect(found.creator_first_name).toBe(testUser.first_name);
      expect(found.creator_last_name).toBe(testUser.last_name);
      expect(found.creator_email).toBe(testUser.email);
    });
    
    it('should return null for non-existent workflow', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000999';
      const workflow = await Workflow.findById(nonExistentId);
      expect(workflow).toBeNull();
    });
  });
  
  describe('findByFlowId', () => {
    it('should find active workflow by flow_id', async () => {
      const workflow = await testUtils.createTestWorkflow({
        flow_id: 'test-flow',
        is_active: true
      });
      
      const found = await Workflow.findByFlowId('test-flow');
      
      expect(found).toBeDefined();
      expect(found.id).toBe(workflow.id);
      expect(found.flow_id).toBe('test-flow');
    });
    
    it('should not find inactive workflow', async () => {
      await testUtils.createTestWorkflow({
        flow_id: 'inactive-flow',
        is_active: false
      });
      
      const found = await Workflow.findByFlowId('inactive-flow');
      expect(found).toBeNull();
    });
  });
  
  describe('listActive', () => {
    beforeEach(async () => {
      await testUtils.createTestWorkflow({
        name: 'Active Flow 1',
        flow_id: 'active-1',
        is_active: true,
        created_by: testUser.id
      });
      await testUtils.createTestWorkflow({
        name: 'Active Flow 2',
        flow_id: 'active-2',
        is_active: true,
        created_by: testUser.id
      });
      await testUtils.createTestWorkflow({
        name: 'Inactive Flow',
        flow_id: 'inactive',
        is_active: false,
        created_by: testUser.id
      });
    });
    
    it('should list only active workflows', async () => {
      const workflows = await Workflow.listActive();
      
      expect(workflows).toHaveLength(2);
      workflows.forEach(workflow => {
        expect(workflow.is_active).toBe(true);
      });
    });
    
    it('should include creator information', async () => {
      const workflows = await Workflow.listActive();
      
      workflows.forEach(workflow => {
        expect(workflow.creator_first_name).toBe(testUser.first_name);
        expect(workflow.creator_last_name).toBe(testUser.last_name);
      });
    });
    
    it('should be sorted by name', async () => {
      const workflows = await Workflow.listActive();
      
      expect(workflows[0].name).toBe('Active Flow 1');
      expect(workflows[1].name).toBe('Active Flow 2');
    });
  });
  
  describe('update', () => {
    it('should update workflow properties', async () => {
      const workflow = await testUtils.createTestWorkflow();
      
      const updates = {
        name: 'Updated Workflow',
        description: 'Updated description',
        steps: [
          {
            stepId: 'new-step',
            order: 1,
            role: 'admin',
            actions: ['approve']
          }
        ]
      };
      
      const updated = await Workflow.update(workflow.id, updates);
      
      expect(updated.name).toBe(updates.name);
      expect(updated.description).toBe(updates.description);
      expect(updated.steps).toEqual(updates.steps);
      expect(updated.updated_at).toBeDefined();
    });
  });
  
  describe('deactivate', () => {
    it('should set is_active to false', async () => {
      const workflow = await testUtils.createTestWorkflow();
      
      await Workflow.deactivate(workflow.id);
      
      const updated = await Workflow.findById(workflow.id);
      expect(updated.is_active).toBe(false);
    });
  });
  
  describe('validateWorkflow', () => {
    it('should validate a correct workflow', async () => {
      const validWorkflow = {
        name: 'Test Workflow',
        flow_id: 'test-workflow',
        description: 'Test description',
        steps: [
          {
            stepId: 'step-1',
            order: 1,
            role: 'manager',
            actions: ['approve', 'reject']
          }
        ]
      };
      
      const result = Workflow.validateWorkflow(validWorkflow);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject workflow without name', async () => {
      const invalidWorkflow = {
        flow_id: 'test',
        steps: []
      };
      
      const result = Workflow.validateWorkflow(invalidWorkflow);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Workflow name is required');
    });
    
    it('should reject workflow without steps', async () => {
      const invalidWorkflow = {
        name: 'Test',
        flow_id: 'test',
        steps: []
      };
      
      const result = Workflow.validateWorkflow(invalidWorkflow);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one workflow step is required');
    });
    
    it('should validate step properties', async () => {
      const invalidWorkflow = {
        name: 'Test',
        flow_id: 'test',
        steps: [
          {
            // Missing stepId, role, actions
            order: 1
          }
        ]
      };
      
      const result = Workflow.validateWorkflow(invalidWorkflow);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step 1: Step ID is required');
      expect(result.errors).toContain('Step 1: Role is required');
      expect(result.errors).toContain('Step 1: At least one action is required');
    });
  });
});