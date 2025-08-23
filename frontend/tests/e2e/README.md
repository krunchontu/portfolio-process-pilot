# End-to-End Testing with Playwright

This directory contains comprehensive E2E tests for the ProcessPilot application using Playwright.

## 🎯 Test Coverage Overview

Our E2E test suite covers 100+ scenarios across these critical areas:

### Core User Journeys
- **Authentication Flow** (`auth.spec.js`)
  - Login/logout with different user roles
  - Registration validation
  - Password reset flows
  - Session management
  - Concurrent sessions

- **Complete Workflows** (`workflow.spec.js`)
  - Full request lifecycle: submit → approve → complete
  - Multi-step approval workflows
  - Request rejection scenarios
  - Escalation workflows
  - Role-based permissions

- **Navigation & Usability** (`navigation.spec.js`)
  - Cross-application navigation
  - Protected route access
  - Browser back/forward handling
  - Mobile navigation patterns

### Advanced Features
- **Admin Functions** (`admin.spec.js`)
  - Analytics dashboard functionality
  - User management CRUD operations
  - Workflow configuration
  - Role-based access control

- **Request Management** (`requests.spec.js`)
  - Create different request types
  - Filter and search functionality
  - Request detail views
  - History tracking

### Quality Assurance
- **Error Handling** (`error-handling.spec.js`)
  - Network failures
  - API errors (4xx, 5xx)
  - Validation errors
  - Offline scenarios
  - Recovery mechanisms

- **Performance** (`performance.spec.js`)
  - Page load times
  - Large dataset handling
  - Memory leak prevention
  - Bundle optimization
  - Web Vitals metrics

- **Mobile & Responsive** (`mobile-responsive.spec.js`)
  - Cross-device compatibility
  - Touch interactions
  - Orientation changes
  - Mobile-specific UI patterns

- **Accessibility** (`accessibility.spec.js`)
  - Keyboard navigation
  - Screen reader compatibility
  - ARIA attributes
  - Color contrast
  - Focus management

- **Security** (`security.spec.js`)
  - XSS prevention
  - CSRF protection
  - SQL injection prevention
  - Authentication security
  - Input sanitization

## 🚀 Running E2E Tests

### Prerequisites

1. **Backend Running**: Ensure the backend is running on `http://localhost:5000`
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend Running**: Ensure the frontend is running on `http://localhost:3000`
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Users**: The following test users should exist in your database:
   - `employee@test.com` (role: employee, password: password123)
   - `manager@test.com` (role: manager, password: password123)  
   - `admin@test.com` (role: admin, password: password123)

### Running Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run specific test file
npx playwright test auth.spec.js

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run only failed tests
npx playwright test --last-failed

# Run tests on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Debug specific test
npx playwright test auth.spec.js --debug
```

### Test Results

After running tests, you can view detailed reports:

```bash
# Open HTML report
npx playwright show-report

# View trace files for failed tests
npx playwright show-trace test-results/[test-name]/trace.zip
```

## 🧪 Test Structure

### Test Files Organization

```
tests/e2e/
├── utils/
│   └── test-helpers.js          # Shared test utilities
├── auth.spec.js                 # Authentication tests
├── navigation.spec.js           # Navigation tests  
├── requests.spec.js             # Request management tests
├── workflow.spec.js             # Workflow lifecycle tests
├── admin.spec.js                # Admin functionality tests
├── error-handling.spec.js       # Error scenarios tests
├── performance.spec.js          # Performance tests
├── mobile-responsive.spec.js    # Mobile/responsive tests
├── accessibility.spec.js        # A11y tests
├── security.spec.js             # Security tests
├── global-setup.js              # Global test setup
└── README.md                    # This file
```

### Test Helpers and Utilities

The `utils/test-helpers.js` file provides:

- **loginAs(page, role)** - Login as different user roles
- **createTestRequest(page, type)** - Create test requests
- **performRequestAction(page, action, comment)** - Approve/reject requests
- **waitForPageLoad(page)** - Wait for page loading
- **mockApiResponse(page, endpoint, response)** - Mock API responses
- **simulateNetworkError(page, pattern)** - Test error scenarios

### Test Data

Predefined test data includes:
- **TEST_USERS** - User credentials for different roles
- **TEST_REQUESTS** - Sample request data for different types
- **generateTestData()** - Generate bulk test data

## 🔧 Configuration

### Playwright Configuration (`playwright.config.js`)

Key settings:
- **Global Setup**: Verifies backend/frontend health before tests
- **Parallel Execution**: Tests run in parallel for speed
- **Multiple Browsers**: Tests against Chrome, Firefox, Safari
- **Mobile Testing**: Includes mobile viewports
- **Retries**: Automatic retries on CI environments
- **Screenshots**: Captured on failure
- **Video**: Recorded on failure
- **Traces**: Detailed execution traces

### Browser Support

Tests run on:
- ✅ **Desktop Chrome** (Chromium)
- ✅ **Firefox** 
- ✅ **Safari** (WebKit)
- ✅ **Mobile Chrome** (Pixel 5)
- ✅ **Mobile Safari** (iPhone 12)

## 🐛 Debugging Tests

### Common Issues

1. **Test Users Not Found**
   ```bash
   # Create test users in database
   cd backend
   npm run db:seed
   ```

2. **Timeout Errors**
   ```bash
   # Increase timeout in playwright.config.js
   timeout: 60000
   ```

3. **Backend Not Ready**
   ```bash
   # Check backend health
   curl http://localhost:5000/health
   ```

4. **Frontend Not Loading**
   ```bash
   # Check frontend
   curl http://localhost:3000
   ```

### Debug Mode

```bash
# Run with debug mode
npx playwright test --debug

# Run headed (see browser)
npx playwright test --headed

# Slow motion
npx playwright test --headed --slow-mo=1000
```

### Visual Debugging

```bash
# Generate and view trace
npx playwright test --trace=on
npx playwright show-trace trace.zip

# Screenshots
npx playwright test --screenshot=on

# Video recording
npx playwright test --video=on
```

## 📊 Test Metrics

### Coverage Areas
- 🔐 **Authentication**: 15+ scenarios
- 🔄 **Workflows**: 20+ scenarios  
- 🧭 **Navigation**: 12+ scenarios
- 👤 **User Management**: 18+ scenarios
- ⚠️ **Error Handling**: 25+ scenarios
- 📱 **Mobile/Responsive**: 15+ scenarios
- ♿ **Accessibility**: 12+ scenarios
- 🔒 **Security**: 20+ scenarios
- ⚡ **Performance**: 10+ scenarios

### Test Execution
- **Total Tests**: 140+ scenarios
- **Execution Time**: ~15-25 minutes (all browsers)
- **Parallel Workers**: 4 (configurable)
- **Browser Coverage**: 5 browsers/viewports

## 🛠️ Maintenance

### Adding New Tests

1. **Create new spec file** or add to existing one
2. **Use test helpers** from `utils/test-helpers.js`
3. **Follow naming conventions**: `should [action] [expected result]`
4. **Add proper test data** and cleanup
5. **Test across multiple browsers** if needed

### Updating Existing Tests

1. **Run specific test** to verify changes
2. **Update test helpers** if shared functionality changes
3. **Maintain test documentation**
4. **Consider impact on parallel execution**

### Performance Considerations

- **Use data-testid attributes** instead of text selectors
- **Implement proper waits** (`waitForLoadState`, `waitForSelector`)
- **Clean up test data** in afterEach hooks
- **Use page object patterns** for complex flows

## 📈 CI/CD Integration

### GitHub Actions / CI Configuration

```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    CI: true
    
- name: Upload test results
  uses: actions/upload-artifact@v2
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

### Test Reports

- **HTML Report**: Comprehensive visual report
- **JSON Report**: Machine-readable results
- **JUnit XML**: CI integration
- **Line Report**: Console output

## 🎯 Best Practices

1. **Stable Selectors**: Use `data-testid` attributes
2. **Proper Waits**: Wait for elements, not arbitrary timeouts
3. **Test Isolation**: Each test should be independent
4. **Realistic Data**: Use realistic test data
5. **Error Scenarios**: Test both happy and sad paths
6. **Cross-Browser**: Verify across multiple browsers
7. **Mobile First**: Include mobile testing
8. **Accessibility**: Include a11y testing
9. **Security**: Test security scenarios
10. **Performance**: Monitor performance regressions

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [ProcessPilot API Documentation](http://localhost:5000/docs)
- [Project README](../../README.md)

---

*This E2E test suite ensures ProcessPilot delivers a robust, secure, and accessible user experience across all supported platforms and devices.*