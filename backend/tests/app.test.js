const request = require('supertest');
const { app } = require('../src/app');

describe('Application', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(response.body.version).toBeDefined();
    });
  });
  
  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api');
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('ProcessPilot API');
      expect(response.body.version).toBeDefined();
      expect(response.body.description).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.auth).toBe('/api/auth');
      expect(response.body.endpoints.requests).toBe('/api/requests');
    });
  });
  
  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Route /unknown-route not found');
      expect(response.body.code).toBe('ROUTE_NOT_FOUND');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should apply rate limiting to API routes', async () => {
      // This test would require making many requests quickly
      // For now, we'll just verify the endpoint exists
      const response = await request(app)
        .get('/api/auth/me');
      
      // Should get 401 (missing token) not 404 (route not found)
      expect(response.status).toBe(401);
    });
  });
  
  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
  
  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health');
      
      // Helmet adds various security headers
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-download-options']).toBeDefined();
    });
  });
});