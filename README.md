# ProcessPilot 🚦

*A full-stack workflow and approval engine built with enterprise-grade security and modern architecture.*

---

## 📌 Project Overview

ProcessPilot is a comprehensive workflow and approval system that demonstrates enterprise-level request management with multi-step approvals, role-based access control, and robust security features. Users can submit various types of requests (leave, expense, equipment) that are routed through configurable approval workflows.

Note on status: See PROJECT_STATUS.md for the latest, authoritative progress and security status.

Documentation Encoding & Emoji Policy: See docs/EMOJI_ENCODING_POLICY.md for rules and CI checks.

This project showcases:

* **Full-Stack Architecture** → Node.js/Express backend + React frontend with TypeScript
* **Enterprise Security** → JWT with httpOnly cookies, CSRF protection, advanced rate limiting
* **Multi-Provider Database** → PostgreSQL, Supabase, PlanetScale, Neon, Railway support
* **Comprehensive Monitoring** → Health checks, Prometheus metrics, structured logging
* **API Documentation** → Complete OpenAPI 3.0 specification with interactive Swagger UI
* **Testing Strategy** → Jest (backend) + Vitest (frontend) + Playwright (E2E)
* **Business Analysis** → Requirements traceability, UAT plans, process documentation

---

## 🎯 Current Features

### ✅ **Implemented**
* **Authentication & Authorization** - JWT-based auth with httpOnly cookies and role-based access control
* **Request Management** - Submit, view, and track request status through configurable workflows
* **Workflow Engine** - Multi-step approval routing with SLA tracking and escalation
* **Security Hardening** - CSRF protection, input sanitization, advanced rate limiting, security logging
* **Multi-Provider Database** - PostgreSQL, Supabase, PlanetScale, Neon, Railway with pooling and health monitoring
* **API Documentation** - Complete OpenAPI 3.0 specification with interactive Swagger UI
* **Enterprise Logging** - Winston-based structured logging with multiple transports and request correlation
* **Health Monitoring** - Comprehensive health checks with Kubernetes probes and Prometheus metrics
* **API Standards** - Consistent error handling, Joi validation, standardized responses

### ⏳ **Next Phase**
* Analytics endpoints for dashboard metrics and reporting
* Workflow management APIs for dynamic workflow configuration
* User management endpoints for admin operations
* Email notification system integration
* Comprehensive test coverage expansion

---

## 🗂️ Repository Structure

```
portfolio-process-pilot/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── routes/            # API endpoints (auth, requests, workflows, users)
│   │   ├── models/            # Database models (User, Request, Workflow)
│   │   ├── middleware/        # Auth, validation, error handling, security
│   │   ├── database/          # Migrations, seeds, connection config
│   │   └── utils/             # Helpers, logging, API response utilities
│   ├── tests/                 # Jest test suites
│   └── package.json           # Dependencies and scripts
├── frontend/                  # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/            # Page components (Login, Dashboard, RequestDetail)
│   │   ├── components/       # Reusable UI components
│   │   ├── services/         # API client with axios interceptors
│   │   └── contexts/         # React contexts (Auth, Notifications)
│   ├── tests/                # Vitest + Playwright tests
│   └── package.json          # Dependencies and scripts
├── docs/                     # Business analysis artifacts
│   ├── REQUIREMENTS.md       # Functional requirements
│   ├── UAT-plan.md          # User acceptance testing plan
│   └── traceability-matrix.md # Requirements traceability
├── PROJECT_STATUS.md         # Detailed implementation progress
├── TODO_CHECKLIST.md         # Development task tracking
└── CLAUDE.md                 # Development guidelines and commands
```

---

## 🔧 Tech Stack

### **Backend (Node.js/Express)**
* **Core:** Express.js, Node.js 18+
* **Database:** PostgreSQL with Knex.js ORM
* **Authentication:** JWT with httpOnly cookies, bcryptjs
* **Security:** Helmet, CORS, CSRF protection, rate limiting, input sanitization
* **Validation:** Joi schemas
* **Testing:** Jest with Supertest
* **Documentation:** Swagger (planned)

### **Frontend (React/Vite)**
* **Framework:** React 18 with TypeScript
* **Build:** Vite with Hot Module Replacement
* **Styling:** TailwindCSS with Headless UI components
* **State:** React Query for server state, React Context for auth
* **Forms:** React Hook Form with validation
* **Testing:** Vitest + React Testing Library + Playwright
* **Routing:** React Router with protected routes

### **Database Schema**
* **Users:** Authentication, roles, profile data
* **Workflows:** Configurable approval chains
* **Requests:** Core request data with JSON payload
* **Request History:** Complete audit trail

---

## 📊 Business Analysis Deliverables

* **Requirements Specification** → [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)
* **Traceability Matrix** → [docs/traceability-matrix.md](docs/traceability-matrix.md)
* **UAT Plan & Test Cases** → [docs/UAT-plan.md](docs/UAT-plan.md)
* **Process Flow Documentation** → [docs/process-flow.mmd](docs/process-flow.mmd)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** 18+ and npm 8+
* **Database** - Choose from:
  - PostgreSQL 13+ (primary option)
  - Supabase account (BaaS option)
  - PlanetScale account (managed MySQL)
  - Neon account (serverless PostgreSQL)
  - Railway account (PostgreSQL hosting)
* **Git** for version control

### 1. Clone and Setup

```bash
git clone https://github.com/<your-username>/portfolio-process-pilot.git
cd portfolio-process-pilot
```

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and JWT secrets

# Setup database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Start development server
npm run dev
```

### 4. Access Application

* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
* **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

### 5. Default Login Credentials

After running database seeds:
* **Admin:** admin@processpilot.com / Admin123!
* **Manager:** manager@processpilot.com / Manager123!
* **Employee:** employee@processpilot.com / Employee123!

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:unit           # Models and middleware only
npm run test:integration    # API routes only
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run Vitest tests
npm run test:coverage       # Generate coverage report
npm run test:e2e            # Run Playwright E2E tests
npm run test:e2e:ui         # Playwright with UI
```

### Database Commands
```bash
cd backend
npm run db:migrate          # Run migrations
npm run db:rollback         # Rollback last migration
npm run db:seed             # Run seeds
npm run db:reset            # Reset, migrate, and seed
```

### Infrastructure & Monitoring
```bash
# API Documentation
open http://localhost:5000/docs              # Swagger UI

# Health Monitoring
curl http://localhost:5000/health            # Basic health check
curl http://localhost:5000/health/detailed   # Comprehensive system metrics
curl http://localhost:5000/health/metrics    # Prometheus metrics

# Log Monitoring
tail -f backend/logs/combined.log            # All application logs
tail -f backend/logs/error.log               # Error logs only
tail -f backend/logs/access.log              # HTTP access logs
```

---

## 📈 Development Progress

**Documentation Source of Truth**
- The authoritative project status is maintained in `PROJECT_STATUS.md`.
- Security posture and corrections are documented in `SECURITY_IMPLEMENTATION_UPDATE.md`.
- Other documents may be historical snapshots; when in doubt, defer to the files above.

### ✅ **Production Ready (80% Complete)**
- [x] **Core Business Logic** - Analytics, Workflows, Users APIs with full CRUD operations
- [x] **Authentication & Security** - JWT with httpOnly cookies, CSRF protection, advanced rate limiting
- [x] **Database Layer** - Multi-provider support, connection pooling, health monitoring
- [x] **Enterprise Infrastructure** - OpenAPI docs, Winston logging, health checks, Prometheus metrics
- [x] **Email System** - Production SMTP integration with request lifecycle notifications
- [x] **Testing Framework** - 47% coverage with robust database utilities and cross-platform support
- [x] **API Standards** - Consistent error handling, validation, standardized responses
- [x] **Request Management** - Complete workflow engine with approval routing and SLA tracking

### 🔄 **Final Phase (Current Focus)**
- [ ] **E2E Testing** - Comprehensive Playwright test coverage for critical user journeys
- [ ] **Environment Validation** - Startup validation for all configuration parameters
- [ ] **Production CORS** - Environment-specific CORS configuration
- [ ] **Code Quality** - Magic numbers replacement and naming standardization

### 🎯 **Future Enhancements**
- [ ] File upload capabilities with cloud storage integration
- [ ] Real-time notifications (WebSocket) for live updates
- [ ] Advanced caching strategies for performance optimization
- [ ] Mobile responsive improvements and PWA features
- [ ] Audit logging and compliance reporting

---

## 🛠️ Development Commands

### Quick Reference

```bash
# Full development setup
cd backend && npm run dev     # Terminal 1 (API server)
cd frontend && npm run dev    # Terminal 2 (React app)

# Run all tests
cd backend && npm test && cd ../frontend && npm test

# Code quality
npm run lint                  # Check code style
npm run lint:fix             # Auto-fix issues
npm run format               # Format with Prettier (frontend)
```

### API Docs & Types

```bash
# Generate API documentation
cd backend && npm run swagger:json    # Regenerate backend/docs/swagger.json

# Preview API documentation
cd backend && npm run dev             # Access at http://localhost:5000/docs
# Alternative: npm run docs:serve     # Serve docs locally

# Generate frontend types from API
cd frontend && npm run api:types      # Generate TypeScript types from swagger.json

# Common troubleshooting
# - If swagger.json is stale, regenerate with: npm run swagger:json
# - If /docs shows 404, ensure swagger.json exists in backend/docs/
# - Output location: backend/docs/swagger.json (committed to repo)
```

---

## 🧷 Git Hooks

- Enable shared hooks to run doc encoding/garble checks pre-commit:

```bash
git config core.hooksPath .githooks
```

- The hook blocks commits of Markdown files containing null bytes or control characters. To bypass in emergencies: `git commit --no-verify`.

---

## 📚 Documentation

* **[CLAUDE.md](CLAUDE.md)** - Development guidelines and commands
* **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Detailed implementation status
* **[TODO_CHECKLIST.md](TODO_CHECKLIST.md)** - Task tracking and priorities
* **[Backend Testing Guide](backend/TESTING.md)** - Testing strategies and utilities

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

*Built with ❤️ to demonstrate enterprise-grade full-stack development practices.*
