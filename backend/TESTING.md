# Testing Guide - ProcessPilot Backend

## Overview

This project uses **Jest** as the primary testing framework with comprehensive unit and integration tests covering all critical components.

## Test Structure

```
tests/
├── setup.js              # Global test configuration
├── app.test.js           # Application-level tests
├── models/               # Model layer tests
│   ├── User.test.js
│   ├── Workflow.test.js
│   └── Request.test.js
├── middleware/           # Middleware tests
│   ├── auth.test.js
│   └── errorHandler.test.js
└── routes/               # API integration tests
    ├── auth.test.js
    ├── requests.test.js
    └── workflows.test.js
```

## Test Environment Setup

### Prerequisites

1. **PostgreSQL Database**: Test database `process_pilot_test`
2. **Node.js**: Version 18+ 
3. **Environment**: `.env.test` file configured

### Database Setup

```bash
# Create test database
createdb process_pilot_test

# Copy test environment
cp .env.test.example .env.test

# Update .env.test with your database credentials
```

## Running Tests

### All Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
```

### Specific Test Suites
```bash
npm run test:unit          # Unit tests only (models, middleware)
npm run test:integration   # Integration tests (API routes)
npm run test:ci           # CI optimized (no watch, coverage)
```

### Individual Test Files
```bash
npm test User.test.js      # Specific test file
npm test -- --grep "auth"  # Tests matching pattern
```

## Test Coverage

### Coverage Thresholds
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Coverage Reports
- **Console**: Summary displayed after tests
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info` for CI tools

## Test Utilities

### Global Test Helpers
Available via `global.testUtils`:

```javascript
// Create test user
const user = await testUtils.createTestUser({
  email: 'test@example.com',
  role: 'manager'
});

// Create test workflow
const workflow = await testUtils.createTestWorkflow({
  name: 'Custom Workflow'
});

// Generate JWT token
const token = testUtils.generateTestToken(user);
```

### Database Management
- **Clean State**: Database is reset before each test
- **Migrations**: Run automatically in test setup
- **Transactions**: Each test runs in isolation

## Writing Tests

### Model Tests
```javascript
describe('User Model', () => {
  describe('create', () => {
    it('should create user with hashed password', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      });
      
      expect(user.password_hash).toBeUndefined();
      expect(user.email).toBe('test@example.com');
    });
  });
});
```

### API Tests
```javascript
describe('Auth Routes', () => {
  it('should login with valid credentials', async () => {
    const user = await testUtils.createTestUser();
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.tokens).toBeDefined();
  });
});
```

### Middleware Tests
```javascript
describe('Auth Middleware', () => {
  it('should authenticate valid token', async () => {
    const user = await testUtils.createTestUser();
    const token = testUtils.generateTestToken(user);
    
    req.headers.authorization = `Bearer ${token}`;
    
    await authenticateToken(req, res, next);
    
    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
```

## Continuous Integration

### GitHub Actions
- **Trigger**: Push/PR to main/develop branches
- **Matrix**: Node.js 18.x, 20.x
- **Database**: PostgreSQL 15 service
- **Steps**: Lint → Unit Tests → Integration Tests → Coverage

### Coverage Integration
- **Codecov**: Automatic upload of coverage reports
- **PR Comments**: Coverage diff on pull requests
- **Badge**: Coverage badge in README

## Test Best Practices

### 1. Isolation
- Each test should be independent
- Use `beforeEach` for test data setup
- Clean state between tests

### 2. Descriptive Names
```javascript
// ✅ Good
it('should reject login with invalid password')

// ❌ Bad  
it('should fail login')
```

### 3. Arrange-Act-Assert
```javascript
it('should create user with default role', async () => {
  // Arrange
  const userData = { email: 'test@example.com', password: 'pass123' };
  
  // Act
  const user = await User.create(userData);
  
  // Assert
  expect(user.role).toBe('employee');
});
```

### 4. Test Edge Cases
- Invalid input
- Missing data
- Boundary conditions
- Error scenarios

### 5. Mock External Dependencies
```javascript
jest.mock('../src/utils/emailService');
```

## Performance Testing

### Load Testing Setup
```bash
# Install k6 (future enhancement)
npm install -g k6

# Run performance tests
k6 run tests/performance/load-test.js
```

## Debugging Tests

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Console Output
```bash
npm test -- --verbose        # Detailed output
npm test -- --silent         # Minimal output
```

### Test Debugging Tips
1. Use `console.log()` in tests
2. Run single test file: `npm test User.test.js`
3. Use `--watch` for rapid feedback
4. Check database state manually if needed

## Future Testing Enhancements

### Phase 2 Additions
- **E2E Tests**: Playwright for full user journeys
- **Contract Tests**: API contract validation
- **Performance Tests**: Load testing with k6
- **Visual Tests**: Screenshot testing for UI

### Phase 3 Additions
- **Security Tests**: OWASP ZAP integration
- **Accessibility Tests**: axe-core integration
- **Database Tests**: Data integrity validation
- **Chaos Engineering**: Failure scenario testing

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:watch` | Development mode |
| `npm run test:coverage` | Generate coverage |
| `npm run test:unit` | Model/middleware tests |
| `npm run test:integration` | API route tests |
| `npm run test:ci` | CI/CD optimized |

**Coverage Target**: 80% across all metrics
**Test Database**: `process_pilot_test`
**Framework**: Jest + Supertest