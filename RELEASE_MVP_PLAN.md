# ProcessPilot MVP Release Plan

**Created:** 2025-11-21
**Status:** Planning Phase
**Target:** First MVP Release
**Goal:** Deliver a robust, cost-effective MVP with production-ready features

---

## Executive Summary

This document outlines the comprehensive plan to transform ProcessPilot from its current 65-70% complete state to a production-ready MVP. The plan prioritizes:

1. **Core functionality** over advanced features
2. **Robust engineering** over feature bloat
3. **Cost efficiency** with free-tier services
4. **Best practices** in security, testing, and deployment

---

## Table of Contents

- [1. Current State Analysis](#1-current-state-analysis)
- [2. MVP Feature Definition](#2-mvp-feature-definition)
- [3. Recommended Tech Stack (Free Tier)](#3-recommended-tech-stack-free-tier)
- [4. Implementation Roadmap](#4-implementation-roadmap)
- [5. Quality Assurance](#5-quality-assurance)
- [6. Deployment Strategy](#6-deployment-strategy)

---

## 1. Current State Analysis

### Test Suite Results (as of 2025-11-21)

**Backend Tests:**
- **Total Test Suites:** 17 files
- **Passing Suites:** 5/17 (29%)
- **Failing Suites:** 12/17 (71%)

**Key Failures:**
1. **Database Connection** - PostgreSQL not running (blocking 11 tests in auth.test.js)
2. **Test Utilities** - setupTestDb/teardownTestDb not exported properly
3. **Logger Tests** - Expecting functions but receiving objects (6 failures)
4. **API Response** - snake_case vs camelCase mismatch (2 failures)
5. **Environment Validation** - SESSION_SECRET not being validated properly (2 failures)
6. **JWT Tests** - Missing JWT_SECRET in some test contexts (2 failures)

**Passing Tests:**
- ✅ Error Handler Middleware (10/10 tests)
- ✅ Email Service (17/17 tests)
- ✅ CSRF Middleware (5/5 tests)
- ✅ Error Handling Middleware (2/2 tests)
- ✅ Document Encoding Check (5/5 tests)

**Frontend Tests:** Not executed yet

### Code Audit Summary

**What's Working:**
- ✅ Backend API structure (3,477 LOC across 6 route modules)
- ✅ Authentication & JWT implementation
- ✅ Database migrations and models
- ✅ Security middleware (CSRF, rate limiting, sanitization)
- ✅ Logging infrastructure
- ✅ Frontend core pages (Login, Dashboard, Requests, Request Detail, Create Request)

**What's Missing:**
- ❌ 3 Frontend Admin Pages (Analytics, Users, Workflows) - only 12-line stubs
- ❌ Request cancellation functionality
- ❌ Request export to CSV
- ❌ Pagination on requests list
- ❌ Docker containerization
- ❌ Passing test suite
- ❌ Production database setup

**Critical Issues:**
1. **Dependency Conflicts** - eslint-plugin-n version mismatch (required --legacy-peer-deps)
2. **Test Infrastructure Broken** - Cannot run tests without PostgreSQL
3. **Documentation Overstates Completion** - Claims 91%, actually 65-70%
4. **Console.log Usage** - 93 instances should use Winston logger
5. **Security Vulnerabilities** - 1 moderate (backend), 7 vulnerabilities (frontend)

---

## 2. MVP Feature Definition

### 2.1 Core Features (Must Have)

#### For Employees
- [x] **User Registration & Login** - JWT-based authentication
- [x] **Submit Requests** - Leave, Expense, Equipment requests
- [x] **View My Requests** - List with status filtering
- [x] **Track Request Status** - Real-time workflow progress
- [x] **Request Details** - Full request info with history
- [ ] **Cancel Pending Requests** - Before approval starts
- [ ] **Export My Requests** - Download as CSV

#### For Managers
- [x] **View Pending Approvals** - Requests awaiting my action
- [x] **Approve/Reject Requests** - With comments
- [x] **View Team Requests** - All requests from direct reports
- [ ] **Bulk Actions** - Approve/reject multiple requests
- [ ] **Dashboard Metrics** - Pending count, approval time stats

#### For Admins
- [ ] **User Management UI** - CRUD operations for users
- [ ] **Workflow Management UI** - Configure approval chains
- [ ] **Analytics Dashboard** - System-wide metrics and reports
- [ ] **System Health Monitoring** - Database, email, API status

### 2.2 Technical Requirements (Must Have)

- [x] **RESTful API** - Complete backend with 24+ endpoints
- [x] **Database Migrations** - Version-controlled schema
- [x] **Role-Based Access Control** - Employee/Manager/Admin
- [x] **Input Validation** - Joi schemas on all endpoints
- [x] **Error Handling** - Centralized error middleware
- [x] **Logging** - Winston structured logging
- [x] **Security Headers** - Helmet, CORS, CSRF protection
- [x] **Rate Limiting** - Progressive user/IP-based
- [ ] **Automated Tests** - 80%+ coverage, all passing
- [ ] **Docker Deployment** - One-command setup
- [ ] **CI/CD Pipeline** - Automated testing and deployment
- [ ] **API Documentation** - Swagger UI at /docs
- [ ] **Health Checks** - Kubernetes-ready probes

### 2.3 Features Explicitly OUT of Scope for MVP

These can be added in v1.1+:
- ❌ Real-time notifications (Socket.io exists but not critical)
- ❌ File attachments for requests
- ❌ Email notifications (infrastructure exists but SMTP optional)
- ❌ Advanced analytics (charts, trends, forecasts)
- ❌ Mobile app
- ❌ Multi-language support
- ❌ Audit log UI (data collected but no UI)
- ❌ Custom workflow builder (use predefined workflows)
- ❌ Slack/Teams integrations
- ❌ SSO/OAuth integration

---

## 3. Recommended Tech Stack (Free Tier)

### 3.1 Current Stack Assessment

| Component | Current | Assessment | Keep? |
|-----------|---------|------------|-------|
| **Runtime** | Node.js 18+ | ✅ Mature, LTS | ✅ Yes |
| **Backend Framework** | Express.js | ✅ Battle-tested | ✅ Yes |
| **Frontend Framework** | React 18 + Vite | ✅ Modern, fast | ✅ Yes |
| **Database ORM** | Knex.js | ✅ Flexible | ✅ Yes |
| **Styling** | Tailwind CSS | ✅ Efficient | ✅ Yes |
| **State Management** | React Query | ✅ Server state | ✅ Yes |
| **Testing** | Jest + Vitest | ✅ Standard | ✅ Yes |

### 3.2 Optimal Free-Tier Stack

#### Database (Choose ONE)

**🥇 RECOMMENDED: Neon (Serverless Postgres)**
- **Free Tier:** 0.5 GB storage, 10 GB data transfer/month
- **Pros:**
  - True PostgreSQL (no compromises)
  - Instant cold starts (serverless)
  - Branch databases for testing
  - No sleep/hibernation
- **Cons:** Limited storage for large datasets
- **Setup:** 5 minutes
- **URL:** https://neon.tech

**🥈 Alternative: Supabase (PostgreSQL BaaS)**
- **Free Tier:** 500 MB database, 1 GB file storage, 2 GB bandwidth
- **Pros:**
  - Full PostgreSQL features
  - Built-in auth (we don't need it)
  - Auto-backup (7 days)
- **Cons:** Projects pause after 7 days inactivity
- **Setup:** 5 minutes
- **URL:** https://supabase.com

**🥉 Alternative: Railway (PostgreSQL Hosting)**
- **Free Tier:** $5 credit/month (~500 hours uptime)
- **Pros:**
  - No hibernation
  - Simple deployment
  - Automatic backups
- **Cons:** Credit-based (not unlimited)
- **Setup:** 3 minutes
- **URL:** https://railway.app

**❌ NOT Recommended: PlanetScale**
- Free tier requires MySQL (we use PostgreSQL)
- Would require migration from pg to mysql2

#### Hosting (Choose ONE)

**🥇 RECOMMENDED: Render (Full-Stack Hosting)**
- **Free Tier:**
  - Web service: 750 hours/month
  - Static site: Unlimited bandwidth
  - PostgreSQL: 90 days, then $7/month (use Neon instead)
- **Pros:**
  - Zero-config deployments
  - Auto-deploy from GitHub
  - Free SSL certificates
  - No credit card required
- **Cons:**
  - Free tier spins down after 15min inactivity (50s cold start)
  - Limited to 512 MB RAM
- **Setup:** 10 minutes
- **URL:** https://render.com

**🥈 Alternative: Railway (Full-Stack Hosting)**
- **Free Tier:** $5 credit/month
- **Pros:**
  - No sleep/hibernation
  - Faster cold starts than Render
  - Built-in database
- **Cons:**
  - Credit-based (not unlimited)
  - Requires monitoring usage
- **Setup:** 5 minutes
- **URL:** https://railway.app

**🥉 Alternative: Fly.io (Container Hosting)**
- **Free Tier:**
  - 3 VMs @ 256 MB RAM
  - 3 GB persistent storage
  - 160 GB outbound data transfer
- **Pros:**
  - No sleep
  - Global edge deployment
  - Docker-native
- **Cons:**
  - Requires credit card
  - More complex setup
- **Setup:** 15 minutes
- **URL:** https://fly.io

**❌ NOT Recommended: Vercel/Netlify**
- Frontend-only (serverless functions too limited for Express app)
- Would require major architecture changes

#### Email (Optional for MVP)

**🥇 RECOMMENDED: Resend**
- **Free Tier:** 100 emails/day, 3,000/month
- **Pros:**
  - Developer-first API
  - No SMTP config needed
  - Excellent deliverability
  - Custom domain support
- **Cons:** Requires email verification
- **Setup:** 5 minutes
- **URL:** https://resend.com

**🥈 Alternative: SendGrid**
- **Free Tier:** 100 emails/day forever
- **Pros:**
  - Twilio backing (reliable)
  - Advanced analytics
- **Cons:** Requires 2FA, more complex setup
- **Setup:** 10 minutes
- **URL:** https://sendgrid.com

**🥉 Alternative: Make Email Optional**
- **Pros:** Simplest for MVP
- **Cons:** No notifications
- **Setup:** 0 minutes (already supported)

#### CI/CD

**🥇 RECOMMENDED: GitHub Actions (Already in place)**
- **Free Tier:** 2,000 minutes/month for private repos, unlimited for public
- **Pros:**
  - Already configured in project
  - 6 workflows ready to use
  - Native GitHub integration
- **Cons:** None for this use case
- **Setup:** 0 minutes (already done)
- **URL:** https://github.com

### 3.3 Final MVP Tech Stack Recommendation

```yaml
# Recommended Stack for Zero-Cost MVP

Runtime: Node.js 18 LTS
Backend: Express.js
Frontend: React 18 + Vite
Database: Neon (PostgreSQL)
Hosting:
  - Backend: Render
  - Frontend: Render Static Site
  - Database: Neon
ORM: Knex.js
Authentication: JWT (httpOnly cookies)
Styling: Tailwind CSS
State: React Query + AuthContext
Testing: Jest + Vitest + Playwright
CI/CD: GitHub Actions
Email: Optional (Resend if needed)
Monitoring: Render Metrics + Health Endpoints

Total Monthly Cost: $0
Setup Time: ~30 minutes
```

**Why This Stack?**
1. **True Free Tier** - No credit card, no trials, no limits hit easily
2. **Production-Ready** - Same stack used by companies in production
3. **Zero Config** - Auto-deploy from GitHub
4. **Reliable** - 99.9% uptime SLA on most services
5. **Scalable** - Easy upgrade path when needed

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Days 1-2)

**Priority: Critical | Estimated: 16 hours**

#### 1.1 Fix Test Infrastructure ⚠️
- [ ] Set up test database (Neon branch or local PostgreSQL)
- [ ] Fix test-utils exports (setupTestDb, teardownTestDb)
- [ ] Fix logger test expectations (object vs function)
- [ ] Fix apiResponse snake_case vs camelCase
- [ ] Fix environment validation (SESSION_SECRET)
- [ ] Verify all backend tests pass
- **Files:**
  - `backend/src/test-utils/dbSetup.js`
  - `backend/tests/utils/logger.test.js`
  - `backend/tests/utils/apiResponse.test.js`
  - `backend/tests/config/env-validation.test.js`
- **Success Criteria:** 90%+ tests passing

#### 1.2 Fix Security Vulnerabilities ⚠️
- [ ] Run `npm audit fix` on backend (1 moderate vulnerability)
- [ ] Run `npm audit fix` on frontend (7 vulnerabilities)
- [ ] Fix dependency conflicts (eslint-plugin-n)
- [ ] Update deprecated packages
- **Files:**
  - `backend/package.json`
  - `frontend/package.json`
- **Success Criteria:** Zero high/critical vulnerabilities

#### 1.3 Code Quality Cleanup
- [ ] Replace console.log with logger (93 instances)
- [ ] Remove duplicate test files
- [ ] Fix manager_id foreign key constraint
- [ ] Run linters and fix issues
- **Files:**
  - All files with console.log
  - `backend/src/database/migrations/001_create_users.js`
- **Success Criteria:** Zero linter errors

### Phase 2: Core MVP Features (Days 3-5)

**Priority: High | Estimated: 24 hours**

#### 2.1 Request Management Features
- [ ] Implement cancel request functionality
  - Backend: POST /api/requests/:id/cancel
  - Frontend: Cancel button in RequestCard + RequestDetailPage
  - Validation: Only pending requests, only request owner
- [ ] Implement export requests to CSV
  - Backend: GET /api/requests/export (stream CSV)
  - Frontend: Export button on RequestsPage
  - Fields: ID, type, status, requester, date, amount/days
- [ ] Implement pagination
  - Backend: Already supports limit/offset
  - Frontend: LoadMore button or infinite scroll
  - Default: 20 per page
- **Files:**
  - `backend/src/routes/requests.js`
  - `frontend/src/pages/RequestsPage.jsx`
  - `frontend/src/components/RequestCard.jsx`
  - `frontend/src/pages/RequestDetailPage.jsx`
- **Success Criteria:** All TODOs resolved

#### 2.2 Admin Pages - Users Management
- [ ] Build UsersPage.jsx (list all users)
  - Table with: name, email, role, status, created_at
  - Search/filter by role and status
  - Pagination (20 per page)
- [ ] Build UserEditModal.jsx
  - Edit role (employee/manager/admin)
  - Toggle active/inactive status
  - Assign manager
- [ ] Build CreateUserModal.jsx
  - Form: email, name, role, password
  - Validation with React Hook Form
- [ ] Wire up to existing backend API
  - GET /api/users (already exists)
  - POST /api/users (already exists)
  - PUT /api/users/:id (already exists)
  - DELETE /api/users/:id (already exists)
- **Files:**
  - `frontend/src/pages/UsersPage.jsx` (replace stub)
  - `frontend/src/components/UserEditModal.jsx` (new)
  - `frontend/src/components/CreateUserModal.jsx` (new)
- **Success Criteria:** Full CRUD for users

#### 2.3 Admin Pages - Workflows Management
- [ ] Build WorkflowsPage.jsx (list all workflows)
  - Table with: name, category, steps count, active
  - Search by name/category
  - View workflow steps
- [ ] Build WorkflowDetailModal.jsx
  - Display workflow steps
  - Show: step order, role, SLA hours
  - Edit button (modal)
- [ ] Build WorkflowEditModal.jsx
  - Edit workflow name, description
  - Add/remove/reorder steps
  - Configure step: role, SLA, escalation
- [ ] Wire up to existing backend API
  - GET /api/workflows (already exists)
  - POST /api/workflows (already exists)
  - PUT /api/workflows/:id (already exists)
  - DELETE /api/workflows/:id (already exists)
- **Files:**
  - `frontend/src/pages/WorkflowsPage.jsx` (replace stub)
  - `frontend/src/components/WorkflowDetailModal.jsx` (new)
  - `frontend/src/components/WorkflowEditModal.jsx` (new)
- **Success Criteria:** Full CRUD for workflows

#### 2.4 Admin Pages - Analytics Dashboard
- [ ] Build AnalyticsPage.jsx (dashboard layout)
  - 4 metric cards: Total Requests, Pending, Approved, Rejected
  - Request trend chart (last 30 days)
  - Request by type (pie chart)
  - Average approval time
- [ ] Install chart library (recharts already in package.json)
- [ ] Create chart components
  - RequestTrendChart.jsx (line chart)
  - RequestTypeChart.jsx (pie chart)
- [ ] Wire up to existing backend API
  - GET /api/analytics/dashboard (already exists)
  - GET /api/analytics/requests/trend (already exists)
- **Files:**
  - `frontend/src/pages/AnalyticsPage.jsx` (replace stub)
  - `frontend/src/components/RequestTrendChart.jsx` (new)
  - `frontend/src/components/RequestTypeChart.jsx` (new)
- **Success Criteria:** All charts rendering with live data

### Phase 3: Deployment (Days 6-7)

**Priority: High | Estimated: 16 hours**

#### 3.1 Docker Containerization
- [ ] Create backend/Dockerfile
  - Multi-stage build (builder + runtime)
  - Node 18 Alpine (small image)
  - Copy only production dependencies
  - Health check command
- [ ] Create frontend/Dockerfile
  - Build stage (npm run build)
  - Nginx serve stage
  - Optimized Nginx config
- [ ] Create docker-compose.yml
  - PostgreSQL service (for local dev)
  - Backend service
  - Frontend service
  - Environment variables
  - Volume mounts for development
- [ ] Create .dockerignore files
- [ ] Test full stack locally with Docker
- **Files:**
  - `backend/Dockerfile` (new)
  - `frontend/Dockerfile` (new)
  - `docker-compose.yml` (new)
  - `backend/.dockerignore` (new)
  - `frontend/.dockerignore` (new)
- **Success Criteria:** `docker-compose up` runs entire stack

#### 3.2 Production Database Setup (Neon)
- [ ] Create Neon account (free tier)
- [ ] Create production database
- [ ] Run migrations on production DB
- [ ] Create seed data (admin user, sample workflows)
- [ ] Get connection string
- [ ] Set up database backups (automatic in Neon)
- [ ] Create branch database for staging
- **Success Criteria:** Database accessible and migrated

#### 3.3 Production Hosting Setup (Render)
- [ ] Create Render account (no credit card needed)
- [ ] Connect GitHub repository
- [ ] Create Web Service for backend
  - Auto-deploy from main branch
  - Environment variables (DATABASE_URL, JWT secrets, etc.)
  - Start command: `npm start`
  - Health check: `/health`
- [ ] Create Static Site for frontend
  - Auto-deploy from main branch
  - Build command: `npm run build`
  - Publish directory: `dist`
- [ ] Configure custom domains (optional)
- [ ] Test deployment
- **Success Criteria:** Both apps deployed and accessible

#### 3.4 Environment Configuration
- [ ] Create production .env template
- [ ] Generate production secrets
  - JWT_SECRET (64 chars)
  - JWT_REFRESH_SECRET (64 chars)
  - SESSION_SECRET (64 chars)
- [ ] Configure CORS for production domain
- [ ] Set up environment variables in Render
- [ ] Test production environment
- **Success Criteria:** App works in production

### Phase 4: Testing & Quality (Days 8-9)

**Priority: High | Estimated: 16 hours**

#### 4.1 Backend Test Coverage
- [ ] Write tests for requests.js routes (currently missing)
  - POST /api/requests/:id/cancel
  - GET /api/requests/export
- [ ] Write tests for analytics.js routes (currently missing)
- [ ] Write tests for workflows.js routes (currently missing)
- [ ] Write tests for users.js routes (currently missing)
- [ ] Run test coverage report
- [ ] Fix any critical gaps
- **Success Criteria:** 80%+ coverage, all tests passing

#### 4.2 Frontend Test Coverage
- [ ] Write tests for new admin pages
  - UsersPage.test.jsx
  - WorkflowsPage.test.jsx
  - AnalyticsPage.test.jsx
- [ ] Write tests for new components
  - UserEditModal.test.jsx
  - WorkflowDetailModal.test.jsx
  - Chart component tests
- [ ] Write tests for new features
  - Cancel request flow
  - Export CSV flow
  - Pagination
- [ ] Run test coverage report
- **Success Criteria:** 70%+ coverage, all tests passing

#### 4.3 E2E Testing
- [ ] Update Playwright tests for new features
  - Admin user management flow
  - Workflow management flow
  - Cancel request flow
  - Export requests flow
- [ ] Run E2E tests against staging
- [ ] Fix any failures
- **Success Criteria:** All E2E tests passing

#### 4.4 Manual QA Checklist
- [ ] Test all user roles (employee, manager, admin)
- [ ] Test all CRUD operations
- [ ] Test error handling
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Test accessibility (keyboard navigation, screen readers)
- [ ] Test performance (Lighthouse score 90+)
- [ ] Test security (OWASP top 10)
- **Success Criteria:** Zero critical bugs

### Phase 5: Documentation (Day 10)

**Priority: Medium | Estimated: 8 hours**

#### 5.1 Update Project Documentation
- [ ] Update README.md
  - Remove misleading claims
  - Add deployment instructions
  - Add Docker instructions
  - Update feature list (accurate)
- [ ] Update CLAUDE.md
  - Reflect actual implementation
  - Update tech stack section
  - Add deployment section
- [ ] Update PROJECT_STATUS.md
  - Accurate completion percentages
  - List remaining issues
  - Link to KNOWN_ISSUES.md
- [ ] Create DEPLOYMENT.md
  - Step-by-step deployment guide
  - Environment setup
  - Troubleshooting
- [ ] Create CONTRIBUTING.md
  - Development setup
  - Testing guidelines
  - PR process
- **Success Criteria:** All docs accurate and helpful

#### 5.2 API Documentation
- [ ] Verify Swagger documentation complete
- [ ] Add examples to all endpoints
- [ ] Add error responses
- [ ] Test Swagger UI at /docs
- [ ] Generate static OpenAPI spec
- **Success Criteria:** Every endpoint documented

#### 5.3 User Documentation
- [ ] Create USER_GUIDE.md
  - Getting started
  - Submit a request
  - Approve/reject requests
  - Admin functions
- [ ] Create FAQ.md
  - Common questions
  - Troubleshooting
- [ ] Create CHANGELOG.md
  - v1.0.0 release notes
- **Success Criteria:** Users can onboard without help

---

## 5. Quality Assurance

### 5.1 Testing Standards

**Backend Testing Requirements:**
- **Unit Tests:** 80%+ coverage for models, middleware, utilities
- **Integration Tests:** 90%+ coverage for route handlers
- **Security Tests:** 100% coverage for auth, CSRF, sanitization
- **Test Isolation:** Each test should be independent
- **Test Data:** Use factories/fixtures, not hardcoded data
- **Assertions:** Use descriptive error messages

**Frontend Testing Requirements:**
- **Component Tests:** 70%+ coverage for all components
- **Page Tests:** 80%+ coverage for all pages
- **Integration Tests:** Critical user flows tested
- **E2E Tests:** Happy path for each user role
- **Accessibility:** WCAG 2.1 AA compliance

**Testing Tools:**
- Backend: Jest + Supertest
- Frontend: Vitest + React Testing Library
- E2E: Playwright
- Coverage: Istanbul (c8 for Vitest)

### 5.2 Code Quality Standards

**Linting:**
- ESLint configured for both backend and frontend
- Zero errors, zero warnings
- Prettier for consistent formatting
- Pre-commit hooks (optional but recommended)

**Code Review Checklist:**
- [ ] No console.log in production code
- [ ] All errors logged with Winston
- [ ] Input validation on all endpoints
- [ ] Proper error handling (try/catch)
- [ ] No hardcoded secrets
- [ ] No commented-out code
- [ ] Meaningful variable names
- [ ] Functions < 50 lines
- [ ] Files < 300 lines

**Security Checklist:**
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] No authentication bypass
- [ ] No authorization bypass
- [ ] No sensitive data exposure
- [ ] Rate limiting on all endpoints
- [ ] Input sanitization on all inputs

### 5.3 Performance Standards

**Backend:**
- API response time < 200ms (p95)
- Database query time < 100ms (p95)
- Payload size < 1MB
- Support 100 concurrent users

**Frontend:**
- Lighthouse Performance score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.0s
- Total bundle size < 500KB (gzipped)

**Database:**
- All queries use indexes
- No N+1 query problems
- Connection pooling configured
- Query timeout set (30s)

---

## 6. Deployment Strategy

### 6.1 Environment Setup

**Environments:**
1. **Development** - Local machine, hot reload
2. **Staging** - Render, auto-deploy from `develop` branch
3. **Production** - Render, auto-deploy from `main` branch

**Environment Variables:**
```bash
# Development (.env.local)
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/process_pilot_dev
JWT_SECRET=dev-secret-change-in-production
CORS_ORIGIN=http://localhost:3000

# Staging (.env.staging - in Render)
NODE_ENV=production
DATABASE_URL=postgresql://neon-staging-url
JWT_SECRET=<generate-64-char-secret>
CORS_ORIGIN=https://processpilot-staging.onrender.com

# Production (.env.production - in Render)
NODE_ENV=production
DATABASE_URL=postgresql://neon-production-url
JWT_SECRET=<generate-64-char-secret>
CORS_ORIGIN=https://processpilot.onrender.com
```

### 6.2 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] All linters passing
- [ ] Security audit clean
- [ ] Database migrations tested
- [ ] Environment variables set
- [ ] Secrets generated
- [ ] Health checks working

**Deployment Steps:**
1. Merge PR to `main` branch
2. GitHub Actions runs CI pipeline
3. If CI passes, Render auto-deploys
4. Health check passes
5. Smoke test critical flows
6. Monitor logs for errors

**Post-Deployment:**
- [ ] Verify app accessible
- [ ] Test login flow
- [ ] Test request submission
- [ ] Test approval flow
- [ ] Check error rates in logs
- [ ] Monitor performance metrics

### 6.3 Rollback Plan

**If deployment fails:**
1. Check Render logs for errors
2. If database issue, rollback migration
3. If app issue, revert to previous deploy in Render
4. If critical, scale down to zero until fixed

**Rollback Steps:**
```bash
# Render dashboard
1. Go to Web Service
2. Click "Events" tab
3. Click "Rollback" on previous successful deploy

# Database rollback (if needed)
npm run db:rollback
```

### 6.4 Monitoring & Alerting

**Health Checks:**
- Endpoint: GET /health/detailed
- Frequency: Every 60 seconds
- Checks: Database, API, Email (if configured)

**Metrics to Monitor:**
- Request rate (requests/min)
- Error rate (errors/min)
- Response time (p50, p95, p99)
- Database connections
- Memory usage
- CPU usage

**Alerting (optional for MVP):**
- Email alert if health check fails 3 times
- Email alert if error rate > 5%
- Email alert if response time > 1s

---

## 7. Success Criteria

### 7.1 MVP Launch Criteria

**Functional Requirements:**
- ✅ All core features implemented and working
- ✅ All admin pages functional (Users, Workflows, Analytics)
- ✅ All TODOs resolved
- ✅ Zero critical bugs

**Technical Requirements:**
- ✅ 80%+ backend test coverage, all passing
- ✅ 70%+ frontend test coverage, all passing
- ✅ All E2E tests passing
- ✅ Zero high/critical security vulnerabilities
- ✅ Zero linter errors
- ✅ Docker setup working
- ✅ Production deployment successful

**Documentation Requirements:**
- ✅ All docs accurate and up-to-date
- ✅ API fully documented (Swagger)
- ✅ User guide created
- ✅ Deployment guide created

**Performance Requirements:**
- ✅ API response time < 200ms (p95)
- ✅ Frontend Lighthouse score > 90
- ✅ Zero performance bottlenecks identified

### 7.2 Post-Launch Metrics

**Week 1:**
- Monitor error rates
- Monitor performance
- Collect user feedback
- Fix critical bugs

**Week 2-4:**
- Improve based on feedback
- Optimize performance
- Add missing minor features
- Plan v1.1 features

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database migrations fail | Low | High | Test on staging first, have rollback plan |
| Tests don't pass | Medium | High | Fix in Phase 1, block progress until resolved |
| Performance issues in prod | Low | Medium | Load test on staging, monitor metrics |
| Security vulnerabilities | Low | High | Run security audit, follow OWASP guidelines |
| Dependency conflicts | Medium | Low | Use --legacy-peer-deps, lock versions |

### 8.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Missing critical feature | Low | Medium | Review with stakeholders before launch |
| UX issues | Medium | Medium | User testing on staging, iterate based on feedback |
| Scalability limits | Low | Low | Free tier sufficient for MVP, easy upgrade path |
| Downtime | Low | Medium | Use reliable hosting (Render), health checks |

### 8.3 Timeline Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tasks take longer than estimated | Medium | Medium | Build in buffer (10 days vs 7 days estimate) |
| Blocker issues found | Low | High | Daily standup to identify blockers early |
| Scope creep | Medium | Medium | Strictly enforce "out of scope" list |

---

## 9. Timeline Summary

**Total Estimated Time:** 10 days (80 hours)

| Phase | Duration | Work Days | Status |
|-------|----------|-----------|--------|
| Phase 1: Foundation | 16 hours | Days 1-2 | ⏳ Pending |
| Phase 2: Core Features | 24 hours | Days 3-5 | ⏳ Pending |
| Phase 3: Deployment | 16 hours | Days 6-7 | ⏳ Pending |
| Phase 4: Testing | 16 hours | Days 8-9 | ⏳ Pending |
| Phase 5: Documentation | 8 hours | Day 10 | ⏳ Pending |

**Adjusted Timeline (with buffer):** 12-14 days

---

## 10. Next Steps

### Immediate Actions (Today)
1. ✅ Review and approve this plan
2. ⏳ Set up Neon database account
3. ⏳ Set up Render hosting account
4. ⏳ Create development branch (`develop`)
5. ⏳ Start Phase 1: Fix test infrastructure

### This Week
- Complete Phase 1 (Foundation)
- Complete Phase 2 (Core Features)
- Begin Phase 3 (Deployment)

### Next Week
- Complete Phase 3 (Deployment)
- Complete Phase 4 (Testing)
- Complete Phase 5 (Documentation)
- **LAUNCH MVP** 🚀

---

## Appendix A: Task Breakdown Template

**For tracking purposes, each major task should have:**

```markdown
### Task: [Task Name]
- **Priority:** [Critical/High/Medium/Low]
- **Estimated Time:** [X hours]
- **Assigned To:** [Name]
- **Status:** [Not Started/In Progress/Blocked/Completed]
- **Dependencies:** [List of blocking tasks]
- **Files Changed:**
  - `path/to/file1.js`
  - `path/to/file2.jsx`
- **Tests Added:**
  - `path/to/test1.test.js`
- **Success Criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2
- **Notes:** [Any additional context]
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-21 | Claude | Initial MVP plan created |

**Status:** Draft - Awaiting Approval
**Next Review:** After Phase 1 completion
