# ProcessPilot 🚦

*A full-stack workflow and approval engine built with enterprise-grade security and modern architecture.*

---

## 📌 Project Overview

ProcessPilot is a comprehensive workflow and approval system that demonstrates enterprise-level request management with multi-step approvals, role-based access control, and robust security features. Users can submit various types of requests (leave, expense, equipment) that are routed through configurable approval workflows.

**Current Status: 44% Complete** - Core foundation with security and database layers fully implemented.

This project showcases:

* **Full-Stack Architecture** → Node.js/Express backend + React frontend with TypeScript
* **Enterprise Security** → JWT with httpOnly cookies, CSRF protection, input sanitization
* **Database Design** → PostgreSQL with proper schema, foreign keys, connection pooling
* **Testing Strategy** → Jest (backend) + Vitest (frontend) + Playwright (E2E)
* **Business Analysis** → Requirements traceability, UAT plans, process documentation

---

## 🎯 Current Features

### ✅ **Implemented**
* **Authentication & Authorization** - JWT-based auth with role-based access (employee/manager/admin)
* **Request Management** - Submit, view, and track request status
* **Workflow Engine** - Multi-step approval routing with configurable workflows
* **Security Hardening** - CSRF protection, input sanitization, secure cookie handling
* **Database Layer** - PostgreSQL with migrations, seeds, and connection pooling
* **API Standards** - Consistent error handling, Joi validation, standardized responses

### ⏳ **In Progress**
* API documentation (Swagger)
* Analytics dashboard
* Comprehensive test coverage
* Winston logging implementation

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
* **PostgreSQL** 13+ installed and running
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

---

## 📈 Development Roadmap

### ✅ **Completed (44%)**
- [x] Authentication system with JWT and roles
- [x] Database schema with proper relationships
- [x] Request CRUD operations
- [x] Security hardening (CSRF, sanitization, httpOnly cookies)
- [x] API error handling and validation
- [x] Frontend authentication flow
- [x] Request detail and management UI

### 🔄 **In Progress (Current Sprint)**
- [ ] API documentation with Swagger
- [ ] Winston logging implementation
- [ ] Test coverage improvements
- [ ] Analytics dashboard endpoints

### 📋 **Planned Features**
- [ ] Complete workflow management API
- [ ] User management interface
- [ ] Email notification system
- [ ] File upload capabilities
- [ ] Real-time notifications (WebSocket)
- [ ] Advanced reporting and metrics
- [ ] Mobile responsive improvements

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
