# ProcessPilot Technology Stack

## Overview

ProcessPilot is built with a modern, production-ready technology stack emphasizing enterprise-grade features, security, and scalability. This document provides the definitive reference for all technologies, versions, and configurations used in the system.

## 🎯 Architecture Pattern

**Pattern**: Full-stack monorepo with separate backend/frontend
**Deployment**: Production-ready with Kubernetes health probes
**Database**: Multi-provider abstraction layer supporting 6 database providers

## 🛠️ Core Technology Stack

### Runtime & Platform

| Technology | Version | Purpose | Configuration |
|------------|---------|---------|---------------|
| **Node.js** | ≥18.0.0 | Backend runtime | Engine specification in package.json |
| **npm** | Latest | Package management | Workspaces for monorepo structure |

### Backend Stack (Production-Ready)

| Technology | Version | Purpose | Implementation Notes |
|------------|---------|---------|---------------------|
| **Express.js** | 4.18.2 | Web framework | Enterprise middleware stack |
| **Knex.js** | 3.1.0 | Query builder & migrations | Multi-provider database abstraction |
| **pg** | 8.11.3 | PostgreSQL driver | Primary database driver |
| **mysql2** | 3.6.5 | MySQL driver | For PlanetScale support |
| **jsonwebtoken** | 9.0.2 | JWT authentication | Custom implementation with refresh tokens |
| **Joi** | 17.11.0 | Schema validation | Input validation across all endpoints |
| **Winston** | 3.11.0 | Enterprise logging | Structured JSON logs with correlation IDs |
| **helmet** | 7.1.0 | Security middleware | HTTP security headers |
| **express-rate-limit** | 7.1.5 | Rate limiting | Progressive user/IP-based limiting |
| **Nodemailer** | 6.9.7 | Email service | Production SMTP with health monitoring |

### Frontend Stack (Modern React)

| Technology | Version | Purpose | Implementation Notes |
|------------|---------|---------|---------------------|
| **React** | 18.2.0 | UI framework | Modern hooks-based patterns |
| **Vite** | 5.0.0 | Build system | Fast dev server, HMR, production optimization |
| **React Router** | 6.18.0 | Client-side routing | Protected routes with role-based access |
| **React Query** | 3.39.3 | Server state management | Caching, synchronization, optimistic updates |
| **React Hook Form** | 7.48.2 | Form management | Performance-optimized form handling |
| **Tailwind CSS** | 3.3.6 | Styling framework | Custom design system with Headless UI |
| **Headless UI** | 1.7.17 | Unstyled components | Accessible component primitives |
| **Axios** | 1.6.0 | HTTP client | Request/response interceptors, auto token refresh |

### Testing Infrastructure (Comprehensive)

| Technology | Version | Purpose | Coverage |
|------------|---------|---------|----------|
| **Jest** | 29.7.0 | Backend testing | 47% backend coverage with integration tests |
| **Supertest** | 6.3.3 | API testing | Full API route testing with database |
| **Vitest** | 1.0.0 | Frontend testing | Component tests with React Testing Library |
| **React Testing Library** | 14.1.2 | Component testing | User-centric testing approach |
| **Playwright** | 1.40.0 | E2E testing | 140+ test scenarios across user workflows |

## 🗄️ Database Ecosystem (Multi-Provider)

### Supported Database Providers

ProcessPilot supports 6 different database providers through a sophisticated abstraction layer:

| Provider | Type | Client | Pool Config | Use Case | Configuration |
|----------|------|--------|-------------|----------|--------------|
| **PostgreSQL** | Traditional | `pg` | 2-10 → 2-20 (prod) | Local development, dedicated servers | Standard PostgreSQL connection |
| **Supabase** | BaaS | `pg` | 1-20 | Real-time features, managed PostgreSQL | API key + database URL |
| **PlanetScale** | BaaS | `mysql2` | 1-10 | MySQL with database branching | Connection string authentication |
| **Neon** | Serverless | `pg` | 0-5 | Autoscaling PostgreSQL | Serverless connection pooling |
| **Railway** | BaaS | `pg` | 1-10 | Managed PostgreSQL hosting | Railway connection string |
| **Generic** | Flexible | Configurable | 1-10 | Any PostgreSQL-compatible service | Custom configuration |

### Database Tools & Migration

| Technology | Version | Purpose | Implementation |
|------------|---------|---------|----------------|
| **Knex Migrations** | 3.1.0 | Schema management | Version-controlled database evolution |
| **Database Seeds** | 3.1.0 | Sample data | Development and testing data sets |
| **Connection Pooling** | Built-in | Performance | Provider-optimized connection management |

### Provider Switching

```bash
# Environment-based provider selection
DB_PROVIDER=postgresql  # Default
DB_PROVIDER=supabase    # Switch to Supabase
DB_PROVIDER=neon        # Switch to Neon serverless
DB_PROVIDER=planetscale # Switch to PlanetScale
```

## 🔒 Security & Middleware Stack

### Authentication & Authorization

| Technology | Implementation | Features |
|------------|----------------|----------|
| **JWT Tokens** | Custom with httpOnly cookies | XSS protection, automatic refresh |
| **Refresh Tokens** | 7-day rotation | Long-term session management |
| **CSRF Protection** | Double Submit Cookie pattern | Additional XSS/CSRF protection layer |
| **Role-Based Access** | Employee → Manager → Admin | Hierarchical permission system |

### Security Middleware

| Middleware | Purpose | Configuration |
|------------|---------|---------------|
| **helmet** | HTTP security headers | CSP, HSTS, X-Frame-Options |
| **express-rate-limit** | Progressive rate limiting | User/IP-based with security logging |
| **sanitization** | Input sanitization | HTML sanitization, SQL injection prevention |
| **cors** | Cross-origin requests | Configurable origins and methods |

### Input Validation & Sanitization

| Technology | Purpose | Usage |
|------------|---------|-------|
| **Joi** | Schema validation | Request payload validation |
| **sanitize-html** | HTML sanitization | Prevent XSS attacks |
| **Parameterized Queries** | SQL injection prevention | All database operations |

## 📊 Monitoring & Observability

### Logging Infrastructure

| Component | Technology | Features |
|-----------|------------|----------|
| **Application Logs** | Winston | Structured JSON, correlation IDs |
| **HTTP Access Logs** | Morgan + Winston | Request/response logging |
| **Security Logs** | Winston Security Logger | Rate limit violations, auth failures |
| **Performance Logs** | Winston Performance Logger | Operation timing, bottleneck detection |

### Health Monitoring

| Endpoint | Purpose | Response Format |
|----------|---------|-----------------|
| `/health` | Basic health status | Simple JSON with database check |
| `/health/detailed` | System metrics dashboard | Comprehensive service status |
| `/health/metrics` | Prometheus metrics | Prometheus-compatible format |
| `/health/liveness` | Kubernetes liveness | Simple OK/NOT OK |
| `/health/readiness` | Kubernetes readiness | Dependency health checks |

### Log File Structure

```text
backend/logs/
├── combined.log          # All application logs with structured JSON
├── error.log            # Error-level logs for troubleshooting
├── access.log           # HTTP access logs with timing
├── warnings.log         # Warning-level logs (production)
├── app.log              # Application-specific logs (production)
├── exceptions.log       # Unhandled exceptions with stack traces
└── rejections.log       # Unhandled promise rejections
```

## 🔧 Development & Build Tools

### Development Environment

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **nodemon** | Backend hot reload | `npm run dev` |
| **Vite Dev Server** | Frontend hot reload | HMR with fast refresh |
| **Concurrently** | Run multiple processes | Backend + Frontend simultaneously |

### Code Quality & Linting

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **ESLint** | JavaScript linting | Shared config for backend/frontend |
| **Prettier** | Code formatting | Consistent formatting rules |
| **EditorConfig** | Editor consistency | Cross-IDE configuration |

### Build & Deployment

| Component | Tool | Output |
|-----------|------|--------|
| **Backend** | Node.js | Production-ready with PM2 support |
| **Frontend** | Vite | Optimized build in `dist/` folder |
| **Database** | Knex Migrations | Schema versioning and deployment |

## 📱 API & Integration

### API Documentation

| Tool | Purpose | Access |
|------|---------|--------|
| **Swagger/OpenAPI 3.0** | Interactive API docs | http://localhost:5000/docs |
| **JSON Schema** | API specification | Complete endpoint documentation |

### HTTP Client Configuration

```javascript
// Axios configuration with interceptors
const apiClient = axios.create({
  baseURL: process.env.VITE_API_URL,
  withCredentials: true, // Include httpOnly cookies
  headers: {
    'Content-Type': 'application/json'
  }
})

// Automatic token refresh interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      await refreshAuthToken()
      return apiClient.request(error.config)
    }
    return Promise.reject(error)
  }
)
```

## 🎨 Frontend Architecture Details

### State Management Strategy

| State Type | Technology | Purpose |
|------------|------------|---------|
| **Server State** | React Query | API data caching, synchronization |
| **Authentication State** | React Context | User session and role management |
| **Component State** | useState/useReducer | Local component state |
| **Form State** | React Hook Form | Performance-optimized form management |

### UI Component Architecture

```text
frontend/src/
├── components/           # Reusable UI components
│   ├── RequestCard.jsx   # Request list item with actions
│   ├── LoadingSpinner.jsx# Loading states
│   └── ErrorBoundary.jsx # Error handling component
├── pages/                # Route-level components  
│   ├── RequestDetailPage.jsx # Comprehensive workflow UI
│   ├── DashboardPage.jsx     # Analytics dashboard
│   └── LoginPage.jsx         # Authentication interface
├── contexts/             # React Context providers
│   ├── AuthContext.jsx   # Authentication state management
│   └── NotificationContext.jsx # Toast notifications
└── hooks/                # Custom React hooks
    └── useDebounce.js    # Performance optimization
```

## 🌐 Environment Configuration

### Environment Variables

#### Backend Environment

```bash
# Core Configuration
NODE_ENV=development|production|test
PORT=5000
API_VERSION=1.0

# Database Configuration
DB_PROVIDER=postgresql|supabase|planetscale|neon|railway|generic
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key-32-chars-minimum
JWT_REFRESH_SECRET=your-refresh-secret-32-chars-minimum
SESSION_SECRET=your-session-secret-for-csrf

# External Services
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

#### Frontend Environment

```bash
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Build Configuration
VITE_NODE_ENV=development|production
```

### Provider-Specific Configuration Examples

#### Supabase Configuration
```bash
DB_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

#### PlanetScale Configuration
```bash
DB_PROVIDER=planetscale
PLANETSCALE_HOST=your-db.planetscale.com
PLANETSCALE_USERNAME=your-username
PLANETSCALE_PASSWORD=your-password
```

## 🚀 Performance Optimizations

### Database Performance

```javascript
// Connection pooling configuration
const dbConfig = {
  client: 'pg',
  pool: {
    min: process.env.NODE_ENV === 'production' ? 2 : 1,
    max: process.env.NODE_ENV === 'production' ? 20 : 10,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000
  }
}
```

### Frontend Performance

| Technique | Implementation | Benefit |
|-----------|----------------|---------|
| **Code Splitting** | Vite + React.lazy | Reduced bundle size |
| **Tree Shaking** | Vite build optimization | Eliminate dead code |
| **Hot Module Replacement** | Vite development | Fast development cycles |
| **React Query Caching** | Automatic background updates | Reduced API calls |

### Caching Strategies

```javascript
// Health check result caching
const healthCache = {
  timestamp: 0,
  data: null,
  ttl: 30000  // 30 second cache
}

// API response caching with React Query
const { data, error, isLoading } = useQuery(
  ['requests', filters],
  () => requestsAPI.list(filters),
  {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000  // 10 minutes
  }
)
```

## 🔍 Development Commands Reference

### Backend Development
```bash
cd backend
npm run dev              # Development server with nodemon
npm test                 # Run all tests with coverage
npm run test:watch       # Watch mode for TDD
npm run test:unit        # Models and middleware tests only
npm run test:integration # API route tests only
npm run test:ci          # CI mode with coverage reports
npm run lint             # ESLint checking
npm run lint:fix         # Auto-fix linting issues

# Database commands
npm run db:migrate       # Run latest migrations
npm run db:rollback      # Rollback last migration  
npm run db:seed          # Run database seeds
npm run db:reset         # Rollback, migrate, and seed
```

### Frontend Development
```bash
cd frontend
npm run dev              # Vite dev server on port 3000
npm run build            # Production build
npm test                 # Vitest component tests
npm run test:coverage    # Generate test coverage
npm run test:ui          # Interactive test runner
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI
npm run lint             # ESLint checking
npm run lint:fix         # Auto-fix linting issues
npm run type-check       # TypeScript validation
npm run format           # Prettier formatting
npm run format:check     # Check formatting
```

## 🏗️ Production Deployment Stack

### Container & Orchestration Ready

| Technology | Purpose | Configuration |
|------------|---------|---------------|
| **Docker** | Containerization | Multi-stage builds for optimization |
| **Kubernetes** | Orchestration | Health probes configured |
| **PM2** | Process management | Cluster mode for Node.js |

### Health Probes Configuration

```yaml
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

# Kubernetes readiness probe  
readinessProbe:
  httpGet:
    path: /health/readiness
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## 📈 Technology Upgrade Path

### Current Version Status
- ✅ **Node.js 18+**: Latest LTS with ES modules support
- ✅ **React 18**: Concurrent features and modern patterns
- ✅ **Modern Build Tools**: Vite for fast development
- ✅ **Enterprise Logging**: Winston with structured data

### Future Considerations
- **TypeScript**: Consider gradual migration for better type safety
- **GraphQL**: Potential API evolution for complex data requirements  
- **Redis**: Add caching layer for high-traffic scenarios
- **Microservices**: Consider extraction for specific domains

---

**Document Status**: Complete technology stack documentation ✅  
**Production Ready**: All technologies configured for enterprise deployment ✅  
**Multi-Provider**: Database abstraction supports 6 providers ✅  
**Monitoring**: Comprehensive observability stack implemented ✅