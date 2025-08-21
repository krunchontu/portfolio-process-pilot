const emailService = require('../../src/services/emailService');

describe('Email Service', () => {
  let originalEnv;

  beforeAll(() => {
    // Save original environment variables
    originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS
    };
  });

  afterAll(() => {
    // Restore original environment variables
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(emailService).toBeDefined();
      expect(typeof emailService.sendEmail).toBe('function');
      expect(typeof emailService.verifyConnection).toBe('function');
    });

    it('should handle missing SMTP configuration', () => {
      // Clear SMTP environment variables
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      expect(emailService.isConfigured).toBe(false);
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      // Ensure SMTP is not configured for these tests
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      emailService.isConfigured = false;
    });

    it('should return error when not configured', async () => {
      const result = await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test message'
      );

      expect(result).toEqual({
        success: false,
        error: 'Email service not configured'
      });
    });

    it('should handle array of recipients', async () => {
      const result = await emailService.sendEmail(
        ['test1@example.com', 'test2@example.com'],
        'Test Subject',
        'Test message'
      );

      expect(result).toEqual({
        success: false,
        error: 'Email service not configured'
      });
    });
  });

  describe('verifyConnection', () => {
    it('should return error when not configured', async () => {
      emailService.isConfigured = false;
      emailService.transporter = null;

      const result = await emailService.verifyConnection();

      expect(result).toEqual({
        success: false,
        error: 'Email service not configured'
      });
    });
  });

  describe('notification templates', () => {
    beforeEach(() => {
      emailService.isConfigured = false;
    });

    it('should have sendRequestSubmittedNotification method', () => {
      expect(typeof emailService.sendRequestSubmittedNotification).toBe('function');
    });

    it('should have sendRequestApprovedNotification method', () => {
      expect(typeof emailService.sendRequestApprovedNotification).toBe('function');
    });

    it('should have sendRequestRejectedNotification method', () => {
      expect(typeof emailService.sendRequestRejectedNotification).toBe('function');
    });

    it('should have sendRequestEscalatedNotification method', () => {
      expect(typeof emailService.sendRequestEscalatedNotification).toBe('function');
    });

    it('should have sendPasswordResetNotification method', () => {
      expect(typeof emailService.sendPasswordResetNotification).toBe('function');
    });

    it('should have sendWelcomeNotification method', () => {
      expect(typeof emailService.sendWelcomeNotification).toBe('function');
    });

    it('should attempt to send welcome notification', async () => {
      const mockUser = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        role: 'employee',
        department: 'IT'
      };

      const result = await emailService.sendWelcomeNotification(mockUser, 'temp123');

      expect(result).toEqual({
        success: false,
        error: 'Email service not configured'
      });
    });

    it('should attempt to send password reset notification', async () => {
      const mockUser = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = await emailService.sendPasswordResetNotification(mockUser, 'reset123');

      expect(result).toEqual({
        success: false,
        error: 'Email service not configured'
      });
    });
  });

  describe('helper methods', () => {
    it('should have getWorkflowApprovers method', () => {
      expect(typeof emailService.getWorkflowApprovers).toBe('function');
    });

    it('should have sendBulkNotifications method', () => {
      expect(typeof emailService.sendBulkNotifications).toBe('function');
    });

    it('should handle bulk notifications when not configured', async () => {
      emailService.isConfigured = false;

      const notifications = [
        {
          to: 'user1@example.com',
          subject: 'Test 1',
          text: 'Test message 1'
        },
        {
          to: 'user2@example.com',
          subject: 'Test 2',
          text: 'Test message 2'
        }
      ];

      const results = await emailService.sendBulkNotifications(notifications);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        to: 'user1@example.com',
        subject: 'Test 1',
        success: false,
        error: 'Email service not configured'
      });
      expect(results[1]).toMatchObject({
        to: 'user2@example.com',
        subject: 'Test 2',
        success: false,
        error: 'Email service not configured'
      });
    });
  });

  describe('template methods', () => {
    it('should have all required notification templates', () => {
      const templateMethods = [
        'sendRequestSubmittedNotification',
        'sendRequestApprovedNotification', 
        'sendRequestRejectedNotification',
        'sendRequestEscalatedNotification',
        'sendPasswordResetNotification',
        'sendWelcomeNotification'
      ];

      templateMethods.forEach(method => {
        expect(typeof emailService[method]).toBe('function');
      });
    });
  });
});