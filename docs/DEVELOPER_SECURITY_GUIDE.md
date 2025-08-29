# ProcessPilot Developer Security Guide

**Quick Reference for Secure Development**  
**Version**: 1.0  
**Last Updated**: August 28, 2025

---

## 🚀 TL;DR - Security Essentials

✅ **Authentication is handled automatically via httpOnly cookies**  
✅ **Never manually manage tokens in frontend**  
✅ **Always use established middleware for protected routes**  
✅ **Input validation is required for all user data**  
✅ **Security tests must pass before merge**

---

## 🔐 Authentication Patterns

### ✅ **DO: Secure Authentication**

```javascript
// ✅ Frontend: Let cookies handle auth automatically
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // This enables secure cookie auth
  timeout: 10000
})

// ✅ Backend: Use established auth middleware
router.get('/secure-endpoint', authenticateToken, requireRole(['admin']), handler)

// ✅ Login response: Return user data only
return res.success(200, 'Login successful', {
  user  // Tokens are automatically set in httpOnly cookies
})
```

### ❌ **DON'T: Manual Token Management**

```javascript
// ❌ NEVER do this - tokens handled by cookies
localStorage.setItem('access_token', token)
const token = localStorage.getItem('access_token')

// ❌ NEVER return tokens in response body  
return res.json({ user, access_token: token, refresh_token: refreshToken })

// ❌ NEVER implement custom auth logic
if (req.headers.authorization) { /* custom auth */ }
```

---

## 🛡️ Input Security Patterns

### ✅ **DO: Secure Input Handling**

```javascript
// ✅ Always use validation schemas
const requestSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000),
  type: Joi.string().valid('leave', 'expense', 'equipment').required()
})

// ✅ Use middleware validation
router.post('/requests', validateRequest(requestSchema), handler)

// ✅ Let sanitization middleware handle XSS prevention
// Input is automatically sanitized by middleware
```

### ❌ **DON'T: Unsafe Input Practices**

```javascript
// ❌ NEVER trust raw user input
const user = await User.create(req.body)

// ❌ NEVER build queries with string concatenation  
const query = `SELECT * FROM users WHERE email = '${email}'`

// ❌ NEVER skip validation
router.post('/endpoint', handler) // Missing validation
```

---

## 🔑 Authorization Patterns

### ✅ **DO: Role-Based Access Control**

```javascript
// ✅ Use established role middleware
const { requireRole, requireAnyRole } = require('../middleware/auth')

// ✅ Single role requirement
router.get('/admin/users', authenticateToken, requireRole(['admin']), handler)

// ✅ Multiple role options
router.post('/requests/:id/approve', 
  authenticateToken, 
  requireAnyRole(['manager', 'admin']), 
  handler
)

// ✅ Check permissions in handlers
const canApprove = req.user.role === 'manager' || req.user.role === 'admin'
if (!canApprove) {
  return res.forbidden('Insufficient permissions')
}
```

### ❌ **DON'T: Manual Permission Checks**

```javascript
// ❌ Inconsistent permission logic
if (req.user && req.user.role && req.user.role === 'admin') { /* handler */ }

// ❌ Missing authentication check
router.get('/sensitive-data', handler) // No authenticateToken

// ❌ Hardcoded role checks
if (req.body.role === 'admin') { /* dangerous logic */ }
```

---

## 🔒 API Security Patterns

### ✅ **DO: Secure API Development**

```javascript
// ✅ Complete security middleware stack
router.post('/api/endpoint',
  rateLimiter,           // Rate limiting
  validateRequest(schema), // Input validation  
  authenticateToken,     // Authentication
  requireRole(['admin']), // Authorization
  handler                // Business logic
)

// ✅ Standardized error responses
return res.unauthorized('Access denied')
return res.badRequest('Invalid input data')
return res.forbidden('Insufficient permissions')

// ✅ Secure database queries (Knex handles parameterization)
const users = await User.query().where('department', department)
```

### ❌ **DON'T: Insecure API Patterns**

```javascript
// ❌ Missing security middleware
router.post('/sensitive-endpoint', handler)

// ❌ Information disclosure in errors
return res.status(500).json({ error: error.stack })

// ❌ Exposing internal details
return res.json({ 
  user: userWithPassword,  // Contains password_hash
  query: rawSqlQuery       // Exposes query structure
})
```

---

## 🧪 Security Testing Patterns

### ✅ **DO: Comprehensive Security Tests**

```javascript
// ✅ Test authentication flows
describe('Authentication Security', () => {
  test('should set httpOnly cookies on login', async () => {
    const response = await agent.post('/api/auth/login').send(credentials)
    
    expect(response.body.data.access_token).toBeUndefined() // No tokens in body
    const cookies = response.headers['set-cookie']
    expect(cookies.find(c => c.includes('access_token'))).toMatch(/HttpOnly/)
  })
})

// ✅ Test authorization enforcement
test('should enforce role-based access', async () => {
  await loginAsEmployee()
  const response = await agent.get('/api/admin/users')
  expect([401, 403]).toContain(response.status)
})

// ✅ Test input validation
test('should sanitize malicious input', async () => {
  const malicious = { title: '<script>alert("xss")</script>' }
  const response = await authenticatedRequest('/api/requests', malicious)
  expect(response.body.data.request.title).not.toContain('<script>')
})
```

### ❌ **DON'T: Incomplete Security Testing**

```javascript
// ❌ Missing security assertions
test('should create request', async () => {
  const response = await request('/api/requests').send(data)
  expect(response.status).toBe(201) // No security validation
})

// ❌ Not testing error conditions
// Missing tests for: unauthorized access, invalid input, rate limiting
```

---

## 📊 Security Monitoring Patterns

### ✅ **DO: Proper Security Logging**

```javascript
// ✅ Use structured security logging
const { loggers } = require('../utils/logger')

// ✅ Log security events
loggers.security.warn('Rate limit exceeded', {
  userId: req.user?.id || 'anonymous',
  ip: req.ip,
  endpoint: req.originalUrl,
  attempts: violationCount
})

// ✅ Log authentication events  
loggers.auth.info('User login successful', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.get('User-Agent')
})
```

### ❌ **DON'T: Insecure Logging Practices**

```javascript
// ❌ Log sensitive data
console.log('User data:', { password: user.password, token: jwt })

// ❌ Expose stack traces in production
console.error('Error:', error.stack)

// ❌ No security context
console.log('Request failed') // Missing who, what, when, where
```

---

## 🚨 Common Security Pitfalls

### **1. Authentication Bypass**
```javascript
// ❌ DANGEROUS: Optional authentication
const token = req.cookies.access_token || req.headers.authorization
if (token) { /* authenticate */ } // Authentication should be required!

// ✅ CORRECT: Always require authentication for protected routes
router.get('/protected', authenticateToken, handler) // Authentication required
```

### **2. Authorization Failures**
```javascript
// ❌ DANGEROUS: Client-side authorization
if (user.role === 'admin') { showAdminPanel() } // Client can be manipulated

// ✅ CORRECT: Server-side authorization
router.get('/admin/data', authenticateToken, requireRole(['admin']), handler)
```

### **3. Input Validation Bypass**
```javascript
// ❌ DANGEROUS: Partial validation
const { title } = req.body
await Request.create({ title, ...req.body }) // req.body might contain malicious fields

// ✅ CORRECT: Complete validation
const validatedData = await schema.validateAsync(req.body)
await Request.create(validatedData)
```

### **4. Information Disclosure**
```javascript
// ❌ DANGEROUS: Exposing sensitive data
return res.json({ user }) // May contain password_hash

// ✅ CORRECT: Clean response data
const { password_hash, ...safeUser } = user
return res.success('User retrieved', { user: safeUser })
```

---

## 🔧 Development Workflow

### **Pre-Commit Security Checklist**

- [ ] **Authentication**: All protected routes use `authenticateToken`
- [ ] **Authorization**: Role checks applied where needed  
- [ ] **Input Validation**: All user inputs validated with Joi schemas
- [ ] **Error Handling**: No sensitive data leaked in error responses
- [ ] **Security Tests**: Added tests for new security-relevant code
- [ ] **Logging**: Security events properly logged with context

### **Code Review Security Focus**

- [ ] **No hardcoded secrets** in code
- [ ] **No localStorage usage** for sensitive data
- [ ] **Proper middleware chain** for all endpoints
- [ ] **Input sanitization** handled by middleware
- [ ] **Database queries** use parameterization (Knex handles this)
- [ ] **Error responses** don't expose internal details

### **Security Testing Commands**

```bash
# Run security-specific tests
npm test -- tests/security/
npm test -- --grep="security|auth|csrf|sanitization"

# Run with security environment variables  
JWT_SECRET=test_key JWT_REFRESH_SECRET=test_refresh npm test

# Check security middleware loading
npm run test:middleware
```

---

## 📚 Quick Reference

### **Secure API Endpoint Pattern**
```javascript
router.post('/api/resource',
  rateLimiter,                    // 1. Rate limiting
  validateRequest(resourceSchema), // 2. Input validation
  authenticateToken,              // 3. Authentication  
  requireRole(['manager']),       // 4. Authorization
  async (req, res) => {           // 5. Business logic
    try {
      const result = await Model.create(req.validatedBody)
      return res.success('Created successfully', { result })
    } catch (error) {
      return res.internalError('Creation failed', error)
    }
  }
)
```

### **Secure Frontend API Call**
```javascript
// ✅ Cookies handle auth automatically
const response = await api.post('/api/resource', data)

// ✅ Handle errors properly  
if (!response.data.success) {
  toast.error(response.data.error)
  return
}

// ✅ Use returned data safely
const { resource } = response.data.data
```

### **Security Validation Schema Example**
```javascript
const requestSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).allow(''),
  type: Joi.string().valid('leave', 'expense', 'equipment').required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  metadata: Joi.object().max(10).unknown(false) // Limit object properties
})
```

---

## 🚀 Security-First Development

### **Remember: Security is Not Optional**

1. **Every endpoint** needs authentication/authorization consideration
2. **Every input** needs validation and sanitization  
3. **Every error** needs secure handling
4. **Every feature** needs security tests
5. **Every deploy** needs security verification

### **When in Doubt**

1. **Ask**: Is this endpoint properly secured?
2. **Test**: Write a security test to verify  
3. **Review**: Have security-focused code reviews
4. **Monitor**: Check security logs for anomalies
5. **Update**: Keep security dependencies current

---

**Remember**: ProcessPilot's security architecture is already excellent. Follow these patterns to maintain and enhance our security posture. When implementing new features, security is part of the definition of "done."

---

**Security Status**: ✅ **Production Ready**  
**Next Security Review**: Quarterly (Q4 2025)  
**Security Contact**: Development Team Lead

*Keep this guide handy during development. Security is everyone's responsibility!*