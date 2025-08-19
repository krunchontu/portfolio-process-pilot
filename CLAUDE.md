# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProcessPilot is a full-stack workflow and approval engine built with Node.js/Express backend and React frontend. It demonstrates enterprise-grade request management with multi-step approvals, role-based access control, and comprehensive testing.

## Architecture

### Backend (Node.js/Express)
- **API Structure**: RESTful routes organized by domain (auth, requests, workflows, users, analytics)
- **Database**: PostgreSQL with Knex.js ORM for migrations and queries
- **Authentication**: JWT-based with refresh token support and role-based access control
- **Models**: User, Request, Workflow, RequestHistory with proper relationships
- **Middleware**: Authentication, validation (Joi), error handling, rate limiting

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
npm run lint                # ESLint code checking
npm run lint:fix            # Auto-fix linting issues

# Database commands
npm run db:migrate          # Run latest migrations
npm run db:rollback         # Rollback last migration
npm run db:seed             # Run database seeds
npm run db:reset            # Rollback, migrate, and seed
```

### Frontend Commands
```bash
cd frontend
npm run dev                 # Start Vite dev server on port 3000
npm run build               # Production build
npm test                    # Run Vitest tests
npm run test:coverage       # Generate test coverage
npm run test:ui             # Run Vitest UI
npm run lint                # ESLint checking
npm run lint:fix            # Auto-fix linting issues
npm run type-check          # TypeScript type checking
```

### Running Individual Tests
```bash
# Backend
npm test User.test.js               # Specific test file
npm test -- --grep "auth"          # Tests matching pattern

# Frontend  
npm test RequestDetailPage          # Component tests
npm test -- --reporter=verbose     # Detailed output
```

## Database Architecture

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
- Automatic token refresh in API interceptors
- Role-based route protection in both frontend and backend

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
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Frontend Environment  
```bash
VITE_API_URL=http://localhost:5000/api
```

## Key Files to Understand

### Backend Core Files
- `src/app.js` - Express application setup and middleware configuration
- `src/routes/requests.js` - Request management API endpoints
- `src/models/Request.js` - Request model with workflow integration
- `src/middleware/auth.js` - JWT authentication and role verification

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
```