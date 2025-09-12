# ProcessPilot Source Tree Structure

## Overview

This document provides a comprehensive guide to ProcessPilot's source tree organization, file purposes, and navigation paths for development teams and AI agents working on the codebase.

## 📁 Project Root Structure

```text
portfolio-process-pilot/
├── backend/                    # Node.js/Express API (Production Ready)
├── frontend/                   # React/Vite SPA (Modern Stack)
├── docs/                      # Comprehensive project documentation
├── .ai/                       # AI development tools and debug logs
├── .github/                   # GitHub workflows and templates
├── .env.example               # Environment configuration template
├── .gitignore                # Git ignore patterns
├── CLAUDE.md                 # AI agent instructions and patterns
├── README.md                 # Project overview and quick start
└── package.json              # Root package.json for workspace management
```

## 🔧 Backend Architecture (`backend/`)

### Core Application Structure

```text
backend/
├── src/                       # Source code root
│   ├── app.js                # Express application setup (363 lines)
│   ├── server.js             # Server entry point and startup
│   ├── config/               # Configuration modules
│   │   ├── database.js       # Multi-provider DB abstraction (247 lines)
│   │   ├── swagger.js        # OpenAPI 3.0 specification (328 lines)
│   │   └── cors.js           # CORS security configuration
│   ├── middleware/           # Express middleware stack
│   │   ├── auth.js           # JWT authentication with httpOnly cookies
│   │   ├── csrf.js           # CSRF protection (Double Submit Cookie)
│   │   ├── rateLimiting.js   # Progressive rate limiting (156 lines)
│   │   ├── sanitization.js   # Input sanitization and XSS prevention
│   │   ├── validation.js     # Request validation with Joi schemas
│   │   └── errorHandler.js   # Centralized error handling middleware
│   ├── models/               # Database models (Knex.js)
│   │   ├── User.js           # User management with roles (Employee/Manager/Admin)
│   │   ├── Workflow.js       # Configurable approval chains
│   │   ├── Request.js        # Core workflow requests with state machine
│   │   └── RequestHistory.js # Complete audit trail for compliance
│   ├── routes/               # RESTful API endpoints
│   │   ├── auth.js           # Authentication endpoints (login/logout/refresh)
│   │   ├── requests.js       # Request CRUD operations with workflow
│   │   ├── workflows.js      # Workflow management API
│   │   ├── users.js          # User administration with role-based access
│   │   ├── analytics.js      # Dashboard metrics and reporting (178 lines)
│   │   └── health.js         # Monitoring endpoints (5 health check types)
│   ├── services/             # Business logic layer
│   │   └── emailService.js   # Production SMTP with health monitoring
│   ├── utils/                # Utility modules
│   │   ├── logger.js         # Enterprise Winston logging (189 lines)
│   │   ├── apiResponse.js    # Standardized API response formats
│   │   └── validation.js     # Shared validation schemas
│   ├── database/             # Database layer
│   │   ├── migrations/       # Schema migrations (Knex.js)
│   │   │   ├── 001_create_users.js
│   │   │   ├── 002_create_workflows.js
│   │   │   ├── 003_create_requests.js
│   │   │   └── 004_create_request_history.js
│   │   └── seeds/            # Sample data generation
│   │       ├── 001_users.js
│   │       ├── 002_workflows.js
│   │       └── 003_requests.js
│   └── adapters/             # Multi-provider database adapters
│       ├── postgresql.js     # PostgreSQL adapter
│       ├── supabase.js       # Supabase BaaS adapter
│       ├── planetscale.js    # PlanetScale MySQL adapter
│       ├── neon.js           # Neon serverless adapter
│       └── railway.js        # Railway managed hosting adapter
├── tests/                    # Jest test suites (47% coverage)
│   ├── models/              # Model unit tests
│   │   ├── User.test.js
│   │   ├── Workflow.test.js
│   │   └── Request.test.js
│   ├── routes/              # API integration tests
│   │   ├── auth.test.js
│   │   ├── requests.test.js
│   │   └── workflows.test.js
│   ├── middleware/          # Middleware unit tests
│   │   ├── auth.test.js
│   │   └── rateLimiting.test.js
│   └── test-utils/          # Testing utilities
│       ├── dbSetup.js       # Database test setup with cross-platform support
│       └── fixtures.js      # Test data fixtures
├── logs/                    # Winston log files (gitignored)
│   ├── combined.log         # All application logs
│   ├── error.log            # Error-level logs only
│   ├── access.log           # HTTP access logs
│   └── exceptions.log       # Unhandled exceptions
├── package.json             # Backend dependencies and scripts
├── package-lock.json        # Locked dependency versions
├── .env.example             # Backend environment variables template
├── .env.baas.example       # Multi-provider database configurations
├── knexfile.js             # Knex.js database configuration
└── jest.config.js          # Jest testing configuration
```

### Key Backend Files Explained

#### **Application Core**
- **`src/app.js`** (363 lines) - Complete Express application setup with enterprise middleware stack
- **`src/server.js`** - Server startup with graceful shutdown handling
- **`src/config/database.js`** (247 lines) - Sophisticated multi-provider database abstraction

#### **Business Logic Layer**
- **`src/models/Request.js`** - Core workflow engine with state machine implementation
- **`src/models/User.js`** - User management with role-based access control
- **`src/models/Workflow.js`** - Configurable approval chains and step definitions

#### **API Layer**
- **`src/routes/requests.js`** - Complete CRUD operations with workflow integration
- **`src/routes/analytics.js`** (178 lines) - Dashboard metrics and business intelligence
- **`src/routes/health.js`** - 5 different health check endpoints for monitoring

#### **Security & Infrastructure**
- **`src/middleware/rateLimiting.js`** (156 lines) - Progressive rate limiting with security logging
- **`src/utils/logger.js`** (189 lines) - Enterprise logging with structured data and correlation IDs
- **`src/config/swagger.js`** (328 lines) - Complete OpenAPI 3.0 specification

## ⚛️ Frontend Architecture (`frontend/`)

### React Application Structure

```text
frontend/
├── src/                      # React application source
│   ├── App.jsx              # Root application component with routing
│   ├── main.jsx             # React 18 entry point with StrictMode
│   ├── index.css            # Global styles and Tailwind imports
│   ├── pages/               # Route-level components
│   │   ├── LoginPage.jsx    # Authentication interface
│   │   ├── DashboardPage.jsx    # Analytics dashboard with charts
│   │   ├── RequestsPage.jsx     # Request list and management
│   │   ├── RequestDetailPage.jsx # Comprehensive workflow UI (558 lines)
│   │   ├── WorkflowsPage.jsx    # Workflow configuration interface
│   │   ├── UsersPage.jsx        # User management (admin only)
│   │   └── ProfilePage.jsx      # User profile management
│   ├── components/          # Reusable UI components
│   │   ├── Layout/          # Application layout components
│   │   │   ├── Header.jsx   # Navigation header with user menu
│   │   │   ├── Sidebar.jsx  # Navigation sidebar with role-based menu
│   │   │   └── Footer.jsx   # Application footer
│   │   ├── UI/              # Base UI components
│   │   │   ├── Button.jsx   # Reusable button component
│   │   │   ├── Input.jsx    # Form input with validation
│   │   │   ├── Modal.jsx    # Modal dialog component
│   │   │   ├── LoadingSpinner.jsx # Loading state indicator
│   │   │   └── ErrorBoundary.jsx  # Error boundary for error handling
│   │   ├── Request/         # Request-specific components
│   │   │   ├── RequestCard.jsx    # Request list item with actions
│   │   │   ├── RequestForm.jsx    # Request creation form
│   │   │   ├── WorkflowViewer.jsx # Workflow progress visualization
│   │   │   └── ActionModal.jsx    # Request approval/rejection modal
│   │   ├── Dashboard/       # Dashboard components
│   │   │   ├── MetricsCard.jsx    # Dashboard metric display
│   │   │   ├── ChartWidget.jsx    # Chart visualization component
│   │   │   └── ActivityFeed.jsx   # Recent activity display
│   │   └── Forms/           # Form components
│   │       ├── FormField.jsx      # Reusable form field wrapper
│   │       └── ValidationMessage.jsx # Form validation display
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.jsx  # Authentication state management
│   │   ├── NotificationContext.jsx # Toast notification system
│   │   └── ThemeContext.jsx # Theme/dark mode (future enhancement)
│   ├── services/            # API integration layer
│   │   ├── api.js           # Axios client with interceptors and auto-refresh
│   │   ├── authAPI.js       # Authentication API methods
│   │   ├── requestsAPI.js   # Request CRUD API methods
│   │   ├── workflowsAPI.js  # Workflow management API methods
│   │   ├── usersAPI.js      # User management API methods
│   │   └── analyticsAPI.js  # Analytics and reporting API methods
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js       # Authentication hook
│   │   ├── useDebounce.js   # Performance optimization hook
│   │   ├── useLocalStorage.js # Local storage hook
│   │   └── usePermissions.js  # Role-based permission hook
│   ├── utils/               # Utility functions
│   │   ├── constants.js     # Application constants
│   │   ├── formatters.js    # Date/currency formatters
│   │   ├── validators.js    # Form validation utilities
│   │   └── helpers.js       # General helper functions
│   └── styles/              # Additional styling
│       ├── components.css   # Component-specific styles
│       └── utilities.css    # Utility classes
├── public/                  # Static assets
│   ├── index.html           # HTML template
│   ├── favicon.ico          # Application icon
│   └── manifest.json        # PWA manifest
├── tests/                   # Frontend test suites
│   ├── components/          # Component tests (Vitest + Testing Library)
│   │   ├── RequestCard.test.jsx
│   │   ├── LoginPage.test.jsx
│   │   └── RequestDetailPage.test.jsx
│   ├── e2e/                # End-to-end tests (Playwright)
│   │   ├── auth.spec.js     # Authentication flows
│   │   ├── requests.spec.js # Request management workflows
│   │   ├── workflows.spec.js    # Workflow configuration
│   │   ├── admin.spec.js        # Administrative functions
│   │   ├── accessibility.spec.js # WCAG 2.1 compliance tests
│   │   ├── performance.spec.js   # Performance testing
│   │   ├── security.spec.js      # Security validation (XSS, CSRF)
│   │   ├── error-handling.spec.js # Error scenario handling
│   │   ├── mobile-responsive.spec.js # Mobile device testing
│   │   └── navigation.spec.js        # Navigation and routing
│   ├── utils/               # Test utilities
│   │   ├── testUtils.jsx    # React testing utilities
│   │   └── mockData.js      # Mock data for testing
│   └── setup.js             # Test environment setup
├── package.json             # Frontend dependencies and scripts
├── package-lock.json        # Locked dependency versions
├── vite.config.js           # Vite build configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── vitest.config.js         # Vitest testing configuration
└── playwright.config.js     # Playwright E2E testing configuration
```

### Key Frontend Files Explained

#### **Application Core**
- **`src/App.jsx`** - Root component with React Router setup and protected routes
- **`src/main.jsx`** - React 18 entry point with providers and error boundaries
- **`src/pages/RequestDetailPage.jsx`** (558 lines) - Comprehensive workflow visualization

#### **State Management**
- **`src/contexts/AuthContext.jsx`** - Authentication state and user session management
- **`src/services/api.js`** - Axios configuration with automatic token refresh interceptors

#### **Business Components**  
- **`src/components/Request/RequestCard.jsx`** - Request list item with role-based actions
- **`src/components/Request/WorkflowViewer.jsx`** - Visual workflow progress indicator

## 📚 Documentation Structure (`docs/`)

```text
docs/
├── architecture.md          # Comprehensive technical reference (646 lines)
├── architecture-patterns.md # Advanced architecture patterns (1274 lines)
├── INFRASTRUCTURE_SUMMARY.md # Production readiness status (272 lines)
├── REQUIREMENTS.md          # Business requirements and specifications
├── BaaS-Setup-Guide.md      # Multi-provider database setup guide
├── UAT-plan.md             # User acceptance testing plan
├── PROJECT_MILESTONES.md    # Development milestones and progress
├── traceability-matrix.md   # Requirements traceability
├── process-flow.mmd         # Mermaid workflow diagrams
├── sample-flow.json         # Sample workflow configuration
├── architecture/            # Sharded architecture documentation
│   ├── coding-standards.md  # Development coding standards
│   ├── tech-stack.md        # Technology stack reference
│   └── source-tree.md       # This file - source tree navigation
└── stories/                 # User stories and development tasks
    ├── 1.1.cookie-based-authentication.md
    ├── 1.2.token-refresh-security.md
    ├── 1.3.authentication-integration-testing.md
    ├── 2.1.naming-convention-standardization.md
    ├── 2.2.console-statement-cleanup.md
    ├── 2.3.documentation-accuracy-update.md
    ├── 3.1.database-backup-recovery.md
    ├── 3.2.development-setup-guide.md
    └── 3.3.environment-variables-documentation.md
```

## 🤖 AI Development Tools (`.ai/`)

```text
.ai/
├── debug-log.md            # AI agent debug log and decision tracking
└── development-session-logs/ # Session-specific development logs
```

## 🔍 Navigation Patterns for Development

### Finding Core Business Logic

| Function | Primary File | Supporting Files |
|----------|-------------|------------------|
| **User Authentication** | `backend/src/middleware/auth.js` | `backend/src/routes/auth.js` |
| **Request Workflow** | `backend/src/models/Request.js` | `backend/src/routes/requests.js` |
| **User Management** | `backend/src/models/User.js` | `backend/src/routes/users.js` |
| **Workflow Configuration** | `backend/src/models/Workflow.js` | `backend/src/routes/workflows.js` |
| **Analytics & Reporting** | `backend/src/routes/analytics.js` | `frontend/src/pages/DashboardPage.jsx` |

### Finding UI Components

| Feature | Primary Component | Related Components |
|---------|------------------|-------------------|
| **Request Management** | `RequestDetailPage.jsx` | `RequestCard.jsx`, `WorkflowViewer.jsx` |
| **Dashboard** | `DashboardPage.jsx` | `MetricsCard.jsx`, `ChartWidget.jsx` |
| **Authentication** | `LoginPage.jsx` | `AuthContext.jsx`, `useAuth.js` |
| **User Administration** | `UsersPage.jsx` | `UserForm.jsx`, `PermissionsTable.jsx` |

### Configuration Files by Purpose

| Configuration Type | File Location | Purpose |
|-------------------|---------------|---------|
| **Database** | `backend/knexfile.js` | Knex.js database configuration |
| **API Documentation** | `backend/src/config/swagger.js` | OpenAPI 3.0 specification |
| **Rate Limiting** | `backend/src/middleware/rateLimiting.js` | Progressive rate limiting rules |
| **CORS** | `backend/src/config/cors.js` | Cross-origin request configuration |
| **Logging** | `backend/src/utils/logger.js` | Winston logging configuration |
| **Frontend Build** | `frontend/vite.config.js` | Vite build and dev server config |
| **Styling** | `frontend/tailwind.config.js` | Tailwind CSS customization |

## 🧪 Testing File Organization

### Backend Tests
```text
backend/tests/
├── models/          # Unit tests for data models
├── routes/          # Integration tests for API endpoints
├── middleware/      # Unit tests for middleware functions
└── test-utils/      # Shared testing utilities
```

### Frontend Tests
```text
frontend/tests/
├── components/      # Component unit tests (Vitest + Testing Library)
├── e2e/            # End-to-end tests (Playwright - 140+ scenarios)
└── utils/          # Testing utilities and mock data
```

## 📊 Code Metrics & Complexity

### File Size & Complexity Indicators

| File | Lines | Complexity | Purpose |
|------|-------|------------|---------|
| `docs/architecture.md` | 646 | High | Complete system documentation |
| `docs/architecture-patterns.md` | 1274 | Expert | Advanced architectural patterns |
| `frontend/src/pages/RequestDetailPage.jsx` | 558 | High | Comprehensive workflow UI |
| `backend/src/app.js` | 363 | Medium | Express app setup |
| `backend/src/config/swagger.js` | 328 | Medium | OpenAPI specification |
| `backend/src/config/database.js` | 247 | High | Multi-provider DB abstraction |
| `backend/src/utils/logger.js` | 189 | Medium | Enterprise logging |
| `backend/src/routes/analytics.js` | 178 | Medium | Analytics API |
| `backend/src/middleware/rateLimiting.js` | 156 | Medium | Progressive rate limiting |

## 🎯 Development Workflow Paths

### Adding New Features

1. **Backend API**: 
   - Add model in `backend/src/models/`
   - Create routes in `backend/src/routes/`
   - Add tests in `backend/tests/`

2. **Frontend UI**:
   - Create page in `frontend/src/pages/`
   - Add components in `frontend/src/components/`
   - Update routing in `frontend/src/App.jsx`

3. **Database Changes**:
   - Create migration in `backend/database/migrations/`
   - Update seeds if needed in `backend/database/seeds/`

### Common Development Tasks

| Task | Files to Modify | Commands to Run |
|------|-----------------|-----------------|
| **Add API Endpoint** | `routes/*.js`, `models/*.js` | `npm test` (backend) |
| **Add UI Component** | `components/*.jsx`, `pages/*.jsx` | `npm test` (frontend) |
| **Database Schema** | `database/migrations/*.js` | `npm run db:migrate` |
| **Authentication** | `middleware/auth.js`, `AuthContext.jsx` | Full test suite |

## 🔧 Build & Deployment Artifacts

### Generated Files (gitignored)
```text
backend/logs/           # Winston log files
backend/node_modules/   # Backend dependencies
frontend/dist/          # Vite production build
frontend/node_modules/  # Frontend dependencies
.env                    # Environment variables
*.log                   # Various log files
coverage/               # Test coverage reports
```

## 📋 File Naming Conventions

### Backend Conventions
- **Config Files**: `camelCase.js` (`database.js`, `swagger.js`)
- **Models**: `PascalCase.js` (`User.js`, `Request.js`)
- **Routes**: `camelCase.js` (`requests.js`, `auth.js`)
- **Middleware**: `camelCase.js` (`rateLimiting.js`, `auth.js`)

### Frontend Conventions
- **Components**: `PascalCase.jsx` (`RequestCard.jsx`, `LoadingSpinner.jsx`)
- **Pages**: `PascalCase.jsx` (`LoginPage.jsx`, `DashboardPage.jsx`)
- **Hooks**: `camelCase.js` (`useAuth.js`, `useDebounce.js`)
- **Utilities**: `camelCase.js` (`formatters.js`, `validators.js`)

---

**Document Status**: Complete source tree reference ✅  
**Navigation Aid**: All key files and paths documented ✅  
**Development Ready**: Clear paths for common development tasks ✅  
**Architecture Aligned**: Matches existing comprehensive documentation ✅