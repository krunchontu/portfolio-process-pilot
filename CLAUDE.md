# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProcessPilot is a full-stack workflow and approval engine built with Node.js/Express backend and React frontend. It demonstrates enterprise-grade request management with multi-step approvals, role-based access control, and comprehensive testing.

## Architecture

### Backend (Node.js/Express) - PRODUCTION-READY
- **API Structure**: RESTful routes organized by domain (auth, requests, workflows, users, analytics)
- **Complete Business Logic**: Full CRUD operations for all entities with advanced querying and filtering
- **Database**: Multi-provider support (PostgreSQL, Supabase, PlanetScale, Neon, Railway) with Knex.js ORM
- **Authentication**: JWT-based with httpOnly cookies, refresh tokens, and role-based access control
- **Models**: User, Request, Workflow, RequestHistory with pagination, search, and relationship management
- **Email System**: Production SMTP integration with request lifecycle notifications and health monitoring
- **Analytics**: Dashboard metrics, request trends, workflow performance, and user activity tracking
- **Testing**: 47% coverage with robust database utilities and cross-platform compatibility
- **Middleware**: Authentication, validation (Joi), CSRF protection, input sanitization, sophisticated rate limiting
- **Documentation**: Complete OpenAPI 3.0 specification with Swagger UI
- **Logging**: Enterprise-grade Winston logging with structured data and multiple transports
- **Monitoring**: Comprehensive health checks with Kubernetes probes and Prometheus metrics
- **Security**: Progressive rate limiting, security event logging, SQL injection prevention

### Frontend (React/Vite)
- **State Management**: React Query for server state + AuthContext for authentication
- **Routing**: React Router with protected routes based on user roles
- **UI**: Tailwind CSS with custom design system, Headless UI components
- **Forms**: React Hook Form with comprehensive validation
- **Testing**: Vitest + React Testing Library for component testing

### Key Architectural Patterns
- **Request Flow**: Submit → Workflow Engine → Multi-step Approval → History Tracking
- **Role Hierarchy**: Employee → Manager → Admin (escalation supported)
- **API Design**: Consistent error handling, request/response validation, comprehensive logging

## Development Commands

### Backend Commands
```bash
cd backend
npm run dev                 # Start development server with nodemon
npm test                    # Run all tests with Jest
npm run test:watch          # Watch mode for development
npm run test:unit           # Models and middleware tests only
npm run test:integration    # API route tests only
npm run test:coverage       # Generate coverage report
npm run test:ci             # CI mode with coverage (no watch)
npm run lint                # ESLint code checking
npm run lint:fix            # Auto-fix linting issues

# Database commands
npm run db:migrate          # Run latest migrations
npm run db:rollback         # Rollback last migration
npm run db:seed             # Run database seeds
npm run db:reset            # Rollback, migrate, and seed

# Documentation and monitoring commands  
npm run docs:serve          # Serve Swagger documentation at /docs
curl localhost:5000/health/detailed  # Check system health and metrics
curl localhost:5000/health/metrics   # Get Prometheus metrics
```

### Frontend Commands
```bash
cd frontend
npm run dev                 # Start Vite dev server on port 3000
npm run build               # Production build
npm test                    # Run Vitest tests
npm run test:coverage       # Generate test coverage
npm run test:ui             # Run Vitest UI
npm run test:e2e            # Run Playwright E2E tests
npm run test:e2e:ui         # Run Playwright with UI
npm run lint                # ESLint checking
npm run lint:fix            # Auto-fix linting issues
npm run type-check          # TypeScript type checking
npm run format              # Format code with Prettier
npm run format:check        # Check formatting without changes
```

### Running Individual Tests
```bash
# Backend
npm test User.test.js               # Specific test file
npm test -- --grep "auth"          # Tests matching pattern
npm test tests/models/User.test.js  # Full path to test file

# Frontend  
npm test RequestDetailPage          # Component tests
npm test -- --reporter=verbose     # Detailed output
npm test src/pages/RequestDetailPage.test.jsx  # Full path to test file
```

## Database Architecture

### Multi-Provider Database Support
- **Primary**: PostgreSQL with connection pooling and retry logic
- **BaaS Options**: Supabase, PlanetScale, Neon, Railway support
- **Configuration**: Environment-based provider switching
- **Health Monitoring**: Connection status and pool metrics tracking

### Core Tables
- **users**: Authentication, roles (employee/manager/admin), profile data
- **workflows**: Configurable approval chains with step definitions
- **requests**: Core request data with payload (JSON), status tracking
- **request_history**: Audit trail of all actions and state changes

### Request Workflow Engine
- Requests follow predefined workflow steps based on request type
- Each step specifies required role, SLA hours, and escalation rules
- Current step tracked via `current_step_index` in requests table
- History automatically logged for all state changes and actions

## Authentication & Authorization

### JWT Implementation
- Access tokens (15min) + Refresh tokens (7 days)
- Stored in httpOnly cookies for XSS protection
- Automatic token refresh in API interceptors
- Role-based route protection in both frontend and backend
- CSRF protection with Double Submit Cookie pattern

### Role Permissions
- **Employee**: Submit requests, view own requests
- **Manager**: Approve/reject requests in assigned workflows
- **Admin**: Full system access, workflow configuration, user management

## API Patterns

### Request/Response Format
```javascript
// Success Response
{
  success: true,
  data: { /* response data */ },
  message: "Optional success message"
}

// Error Response  
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",
  details: { /* optional error details */ }
}
```

### Common API Methods
```javascript
// Requests API
requestsAPI.list(params)                    # GET /api/requests
requestsAPI.create(data)                    # POST /api/requests  
requestsAPI.get(id)                         # GET /api/requests/:id
requestsAPI.action(id, action, {comment})   # POST /api/requests/:id/action

// Authentication
authAPI.login(credentials)                  # POST /api/auth/login
authAPI.getProfile()                        # GET /api/auth/me
```

## Frontend Architecture

### State Management Strategy
- **React Query**: Server state, caching, and synchronization
- **AuthContext**: User authentication state and role checks
- **Local State**: Component-specific state with useState/useReducer

### Component Structure
- **Pages**: Full page components (LoginPage, RequestsPage, etc.)
- **Components**: Reusable UI components (RequestCard, LoadingSpinner, etc.)
- **Layout**: App structure with navigation and error boundaries

### Request Detail Page Architecture
The RequestDetailPage (`frontend/src/pages/RequestDetailPage.jsx`) is a comprehensive component that demonstrates the full workflow visualization:
- Dynamic request type rendering (leave, expense, equipment)
- Workflow step progress with visual indicators
- Approval action handling with modal interface
- SLA tracking and deadline warnings
- Request history and audit trail display

## Testing Strategy

### Backend Testing (Jest)
- **Unit Tests**: Models, middleware, utilities
- **Integration Tests**: Full API route testing with database
- **Coverage Target**: 80% across all metrics
- **Test Database**: Separate `process_pilot_test` database with transaction isolation

### Frontend Testing (Vitest)
- **Component Tests**: React Testing Library with user interaction testing
- **Integration Tests**: API integration and state management
- **Coverage Reporting**: HTML and LCOV reports generated

### Test Utilities
Global test helpers available in backend tests:
```javascript
testUtils.createTestUser({email, role})     # Create test user
testUtils.createTestWorkflow({name})        # Create test workflow  
testUtils.generateTestToken(user)           # Generate JWT for testing
```

## Common Development Patterns

### Error Handling
- Backend: Centralized error middleware with consistent error formats
- Frontend: Error boundaries + React Query error handling + toast notifications

### Form Validation
- Backend: Joi schemas for request validation
- Frontend: React Hook Form with real-time validation

### API Integration
- Axios instance with automatic token refresh
- Request/response interceptors for logging and error handling
- Centralized API service methods

## Environment Configuration

### Backend Environment
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
DB_PROVIDER=postgresql  # Options: postgresql, supabase, planetscale, neon, railway
JWT_SECRET=your-secret-key-32-chars-minimum
JWT_REFRESH_SECRET=your-refresh-secret-32-chars-minimum
SESSION_SECRET=your-session-secret-for-csrf
```

### Frontend Environment  
```bash
VITE_API_URL=http://localhost:5000/api
```

### BaaS Provider Examples
```bash
# Supabase
DB_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# PlanetScale
DB_PROVIDER=planetscale
PLANETSCALE_HOST=your-db.planetscale.com
PLANETSCALE_USERNAME=your-username
PLANETSCALE_PASSWORD=your-password
```

## Key Files to Understand

### Backend Core Files
- `src/app.js` - Express application setup and comprehensive middleware configuration
- `src/config/swagger.js` - OpenAPI 3.0 specification and documentation configuration
- `src/utils/logger.js` - Enterprise Winston logging with structured data and multiple transports
- `src/routes/health.js` - Comprehensive health checks and monitoring endpoints
- `src/middleware/rateLimiting.js` - Sophisticated user/IP-based rate limiting
- `src/config/database.js` - Multi-provider database configuration system
- `src/services/emailService.js` - Production SMTP service with templates and health monitoring
- `src/test-utils/dbSetup.js` - Robust database testing utilities with conditional execution
- `src/routes/analytics.js` - Complete analytics API with dashboard metrics and reporting
- `src/routes/workflows.js` - Full CRUD workflow management API with search and validation
- `src/routes/users.js` - Comprehensive user management API with role-based permissions
- `src/routes/requests.js` - Request management API endpoints with workflow integration
- `src/models/User.js` - User model with advanced querying, pagination, and filtering
- `src/models/Workflow.js` - Workflow model with search capabilities and relationship management
- `src/models/Request.js` - Request model with workflow and email integration
- `src/middleware/auth.js` - JWT authentication with httpOnly cookies and role verification
- `src/middleware/csrf.js` - CSRF protection with Double Submit Cookie pattern
- `src/middleware/sanitization.js` - Input sanitization and SQL injection prevention

### Frontend Core Files
- `src/pages/RequestDetailPage.jsx` - Comprehensive request detail view
- `src/services/api.js` - API client with token management
- `src/contexts/AuthContext.jsx` - Authentication state management
- `src/components/RequestCard.jsx` - Request list item component

## Business Logic

### Request Types Supported
- **Leave Request**: Start/end dates, leave type, reason
- **Expense Approval**: Amount, currency, category, description, receipts
- **Equipment Request**: Equipment type, specifications, urgency, justification

### Workflow Configuration
Workflows define approval chains with:
- Step order and required roles
- SLA hours for each step
- Escalation rules and fallback approvers
- Conditional routing based on request attributes

## Database Setup

### Prerequisites
1. PostgreSQL 13+ installed and running
2. Create development database: `createdb process_pilot_dev`
3. Create test database: `createdb process_pilot_test`
4. Copy `.env.example` to `.env` and configure database connection

### Initial Setup
```bash
cd backend
npm run db:migrate    # Apply schema migrations
npm run db:seed       # Insert sample data

# Start development server
npm run dev           # Backend on http://localhost:5000

# Access development tools
# API Documentation: http://localhost:5000/docs
# Health Dashboard: http://localhost:5000/health/detailed  
# System Metrics: http://localhost:5000/health/metrics
```