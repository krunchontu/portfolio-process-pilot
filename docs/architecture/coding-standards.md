# ProcessPilot Coding Standards

## Overview

This document defines the coding standards and conventions used in ProcessPilot, extracted from the existing production-ready codebase patterns.

## 🎯 General Principles

- **Consistency**: Follow existing patterns in the codebase
- **Clarity**: Write self-documenting code with meaningful names
- **Security**: Always validate inputs and sanitize outputs
- **Performance**: Use connection pooling, caching, and efficient queries
- **Testing**: Include tests for new features and bug fixes

## 📁 File Organization & Naming

### Backend (Node.js/Express)

```text
backend/src/
├── config/          # Configuration files (camelCase)
├── middleware/      # Express middleware (camelCase) 
├── models/         # Database models (PascalCase)
├── routes/         # API route handlers (camelCase)
├── services/       # Business logic services (camelCase)
├── utils/          # Utility functions (camelCase)
└── database/       # Migrations and seeds
```

### Frontend (React/Vite)

```text
frontend/src/
├── components/     # Reusable components (PascalCase)
├── pages/          # Route components (PascalCase)
├── contexts/       # React contexts (PascalCase)
├── services/       # API clients (camelCase)
└── hooks/          # Custom hooks (camelCase)
```

## 🔤 Naming Conventions

### JavaScript/Node.js
- **Files**: camelCase (`userService.js`, `authMiddleware.js`)
- **Functions**: camelCase (`createUser`, `validateRequest`)
- **Variables**: camelCase (`userId`, `requestData`)
- **Constants**: UPPER_SNAKE_CASE (`API_VERSION`, `MAX_RETRIES`)
- **Classes**: PascalCase (`UserModel`, `RequestService`)

### React/JSX
- **Components**: PascalCase (`RequestCard`, `LoadingSpinner`)
- **Hooks**: camelCase starting with `use` (`useAuth`, `useDebounce`)
- **Props**: camelCase (`requestId`, `onSubmit`)

### Database
- **Tables**: snake_case (`users`, `request_history`)
- **Columns**: snake_case (`created_at`, `user_id`) 
- **Indexes**: descriptive (`idx_requests_status_created`)

### Standardized Naming Convention (Story 2.1)
- **Database Columns**: snake_case (`created_at`, `user_id`, `workflow_id`) - PostgreSQL standard
- **JavaScript Properties**: camelCase (`createdAt`, `userId`, `workflowId`) - JavaScript standard
- **API Responses**: camelCase for consistency with frontend consumption
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `API_TIMEOUT`)
- **Components/Classes**: PascalCase (`RequestCard`, `UserModel`)

### Database-JavaScript Property Mapping Strategy
- Use camelCase in JavaScript/JSON for API responses and frontend consumption
- Use snake_case for database column names following PostgreSQL conventions
- Implement consistent property mapping in model layers to convert between conventions
- Database queries should use snake_case column names directly
- API responses should present camelCase properties to frontend

#### Property Mapping Examples
```javascript
// ✅ Good: Consistent database to JavaScript mapping
const mapDatabaseToJavaScript = (dbRecord) => ({
  id: dbRecord.id,
  userId: dbRecord.user_id,           // snake_case → camelCase
  workflowId: dbRecord.workflow_id,   // snake_case → camelCase  
  createdAt: dbRecord.created_at,     // snake_case → camelCase
  updatedAt: dbRecord.updated_at,     // snake_case → camelCase
  currentStepIndex: dbRecord.current_step_index
})

// ✅ Good: API response format (camelCase for frontend)
{
  "id": "123",
  "userId": "456", 
  "workflowId": "789",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}

// ✅ Good: Database query (snake_case columns)
const user = await db('users')
  .select('id', 'user_name', 'created_at', 'updated_at')
  .where('user_id', userId)
  .first()
```

## 📝 Code Style

### JavaScript/Node.js

```javascript
// ✅ Good: Clear function with proper error handling
const createRequest = async (requestData) => {
  try {
    // Validate input
    const { error, value } = requestSchema.validate(requestData)
    if (error) {
      throw new ValidationError('Invalid request data', error.details)
    }

    // Business logic
    const request = await Request.create(value)
    
    // Log success
    logger.info('Request created', { 
      requestId: request.id,
      userId: value.created_by 
    })
    
    return request
  } catch (error) {
    logger.error('Failed to create request', { 
      error: error.message,
      requestData 
    })
    throw error
  }
}

// ❌ Avoid: No validation, poor error handling
const createRequest = (data) => {
  return Request.create(data)
}
```

### React/JSX

```jsx
// ✅ Good: Clear component with proper hooks
const RequestCard = ({ request, onAction }) => {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleApprove = useCallback(async () => {
    setIsLoading(true)
    try {
      await onAction(request.id, 'approve')
      toast.success('Request approved')
    } catch (error) {
      toast.error('Failed to approve request')
    } finally {
      setIsLoading(false)
    }
  }, [request.id, onAction])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold">{request.title}</h3>
      <button 
        onClick={handleApprove}
        disabled={isLoading}
        className="btn btn-primary"
      >
        {isLoading ? 'Approving...' : 'Approve'}
      </button>
    </div>
  )
}

// ❌ Avoid: Inline handlers, no error handling
const RequestCard = ({ request }) => {
  return (
    <div>
      <h3>{request.title}</h3>
      <button onClick={() => approveRequest(request.id)}>
        Approve
      </button>
    </div>
  )
}
```

## 🛡️ Security Standards

### Input Validation
```javascript
// ✅ Always validate with Joi schemas
const requestSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).required(),
  amount: Joi.number().positive().precision(2).when('type', {
    is: 'expense',
    then: Joi.required()
  })
})

// ✅ Sanitize HTML input
const sanitizedDescription = sanitizeHtml(description, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {}
})
```

### Authentication & Authorization
```javascript
// ✅ Require authentication for protected routes
router.use('/api/requests', authenticateToken)

// ✅ Check permissions before operations
const canApproveRequest = (user, request) => {
  return user.role === 'admin' || 
         (user.role === 'manager' && user.department === request.department)
}
```

## 📊 Database Standards

### Model Definitions
```javascript
// ✅ Good: Clear model with validation
const User = {
  tableName: 'users',
  
  async create(userData) {
    const { error, value } = userSchema.validate(userData)
    if (error) throw new ValidationError('Invalid user data', error.details)
    
    return await db('users').insert(value).returning('*')
  },
  
  async findByEmail(email) {
    return await db('users').where({ email }).first()
  }
}
```

### Query Patterns
```javascript
// ✅ Good: Use parameterized queries
const requests = await db('requests')
  .where('created_by', userId)
  .where('status', 'pending')
  .orderBy('created_at', 'desc')
  .limit(limit)
  .offset(offset)

// ❌ Avoid: String concatenation (SQL injection risk)
const query = `SELECT * FROM requests WHERE user_id = ${userId}`
```

## 🧪 Testing Standards

### Backend Tests
```javascript
// ✅ Good: Comprehensive test with setup/teardown
describe('User Service', () => {
  let testDb

  beforeAll(async () => {
    testDb = await testUtils.setupTestDb()
  })

  afterEach(async () => {
    await testUtils.cleanupTestDb()
  })

  it('should create user with valid data', async () => {
    const userData = testUtils.generateTestUser()
    
    const user = await UserService.create(userData)
    
    expect(user).toHaveProperty('id')
    expect(user.email).toBe(userData.email)
  })
})
```

### Frontend Tests
```javascript
// ✅ Good: Component test with user interaction
test('RequestCard calls onApprove when approve button clicked', async () => {
  const mockOnAction = jest.fn()
  const request = { id: '1', title: 'Test Request' }
  
  render(<RequestCard request={request} onAction={mockOnAction} />)
  
  const approveButton = screen.getByText('Approve')
  await user.click(approveButton)
  
  expect(mockOnAction).toHaveBeenCalledWith('1', 'approve')
})
```

## 🔄 API Standards

### Request/Response Format
```javascript
// ✅ Standard success response
res.json({
  success: true,
  data: result,
  message: 'Operation completed successfully',
  meta: {
    timestamp: new Date().toISOString(),
    requestId: req.correlationId
  }
})

// ✅ Standard error response  
res.status(400).json({
  success: false,
  error: 'Validation failed',
  code: 'VALIDATION_ERROR',
  details: validationErrors,
  meta: {
    timestamp: new Date().toISOString(),
    requestId: req.correlationId
  }
})
```

### Route Organization
```javascript
// ✅ Good: RESTful routes with proper middleware
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const requests = await RequestService.list(req.user, req.query)
    res.json(successResponse(requests))
  } catch (error) {
    res.status(500).json(errorResponse(error.message))
  }
})
```

## 📝 Documentation Standards

### Code Comments
```javascript
// ✅ Good: Explain WHY, not WHAT
// Cache health results to prevent monitoring system from overwhelming the app
const getCachedHealth = async () => {
  // Use cached result if less than 30 seconds old
  if (healthCache.data && (now - healthCache.timestamp) < 30000) {
    return healthCache.data
  }
  // ... perform fresh health checks
}

// ❌ Avoid: Obvious comments
// Increment counter by 1
counter++
```

### Function Documentation
```javascript
/**
 * Process request through workflow state machine
 * @param {string} requestId - Request ID to process
 * @param {string} action - Action to perform (approve, reject, cancel)
 * @param {Object} context - User context and additional data
 * @returns {Promise<Object>} Updated request with new state
 * @throws {ValidationError} When action is invalid for current state
 */
const processWorkflowAction = async (requestId, action, context) => {
  // Implementation
}
```

## 🚀 Performance Standards

### Database Performance
```javascript
// ✅ Good: Use connection pooling
const dbConfig = {
  client: 'pg',
  pool: { min: 2, max: 10 },
  acquireConnectionTimeout: 60000
}

// ✅ Good: Include proper indexes
await db.schema.table('requests', table => {
  table.index(['status', 'created_at'])
  table.index(['created_by', 'status'])
})
```

### Caching Strategies  
```javascript
// ✅ Good: Cache expensive operations
const getCachedUserProfile = async (userId) => {
  const cached = cache.get(`user:${userId}`)
  if (cached) return cached
  
  const profile = await UserService.getProfile(userId)
  cache.set(`user:${userId}`, profile, 300) // 5 minute cache
  return profile
}
```

## 🔍 Naming Convention Enforcement

### ESLint Rules for Naming Consistency
```javascript
// .eslintrc.js - Add naming convention rules
{
  "rules": {
    // Enforce camelCase for variables and functions
    "camelcase": ["error", { 
      "properties": "always",
      "ignoreDestructuring": false,
      "ignoreImports": false,
      "ignoreGlobals": false
    }],
    // Allow snake_case for database column references
    "camelcase": ["error", {
      "allow": ["^[a-z]+(_[a-z]+)*$"] // Allow snake_case patterns
    }]
  }
}
```

### Automated Naming Validation
```javascript
// Example: Utility function to validate API response naming
const validateApiResponseNaming = (response) => {
  const invalidKeys = Object.keys(response).filter(key => {
    // Check if key contains underscores (should be camelCase)
    return key.includes('_') && !['__proto__', '__defineGetter__'].includes(key)
  })
  
  if (invalidKeys.length > 0) {
    console.warn(`API response contains snake_case properties: ${invalidKeys.join(', ')}`)
  }
}

// Database property mapping utility
const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
```

## 🔧 Development Workflow

### Git Standards
```bash
# ✅ Good: Descriptive commit messages
git commit -m "Add progressive rate limiting to auth endpoints

- Implement user-aware vs IP-aware rate limiting
- Add security event logging for violations
- Configure different limits for auth vs general API
- Skip health check endpoints from rate limiting

Fixes rate limiting gaps identified in security audit"

# ❌ Avoid: Vague commit messages
git commit -m "fix auth"
```

### Environment Configuration
```javascript
// ✅ Good: Environment validation
const requiredEnvVars = [
  'NODE_ENV',
  'DATABASE_URL', 
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
]

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`)
  }
})
```

## 📋 Code Review Checklist

### Before Submitting
- [ ] All tests pass (`npm test`)
- [ ] Code follows naming conventions
- [ ] Input validation implemented
- [ ] Error handling included
- [ ] Logging added for important operations
- [ ] Security considerations addressed
- [ ] Performance implications considered

### Review Focus Areas
- [ ] **Security**: Input validation, authentication, authorization
- [ ] **Error Handling**: Proper try/catch, meaningful error messages
- [ ] **Testing**: Adequate test coverage, edge cases covered
- [ ] **Performance**: Efficient queries, proper caching
- [ ] **Consistency**: Follows existing patterns and conventions

## 🔍 Common Patterns

### Middleware Pattern
```javascript
// Standard middleware structure
const middlewareName = (options = {}) => {
  return (req, res, next) => {
    try {
      // Middleware logic
      req.customProperty = processedValue
      next()
    } catch (error) {
      next(error) // Pass to error handler
    }
  }
}
```

### Service Layer Pattern
```javascript
// Standard service structure
class ServiceName {
  static async create(data) {
    // Validation
    // Business logic
    // Database operations  
    // Logging
    // Return result
  }
  
  static async findById(id) {
    // Similar pattern
  }
}
```

---

**Document Status**: Current coding standards extracted from production codebase ✅  
**Technical Debt**: Minor naming inconsistencies documented ✅  
**Maintenance**: Update as new patterns emerge during development ✅