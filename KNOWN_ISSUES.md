# Known Issues

**Last Updated:** 2025-11-21
**Project:** ProcessPilot MVP
**Status:** Pre-Launch

This document tracks all known issues, bugs, and technical debt identified during the MVP development. Issues are categorized by severity and component.

---

## Issue Classification

- 🔴 **Critical** - Blocks MVP launch, must fix immediately
- 🟠 **High** - Significant impact, fix before launch
- 🟡 **Medium** - Should fix for better UX/DX, not blocking
- 🟢 **Low** - Nice to have, can defer to v1.1

---

## Critical Issues 🔴

### CI-001: Test Infrastructure Broken
- **Component:** Backend Tests
- **Severity:** 🔴 Critical
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** Backend test suite fails with 71% failure rate due to multiple infrastructure issues
- **Impact:** Cannot verify code quality, blocks deployment confidence
- **Root Causes:**
  1. PostgreSQL not running (causes 11 test failures in auth.test.js)
  2. test-utils missing exports (setupTestDb, teardownTestDb not functions)
  3. Logger test expectations incorrect (expecting functions, receiving objects)
  4. API response snake_case vs camelCase mismatch
  5. Environment validation missing SESSION_SECRET check
  6. JWT_SECRET not set in some test contexts
- **Reproduction:**
  ```bash
  cd backend
  npm test
  # Result: 12/17 test suites fail
  ```
- **Files Affected:**
  - `backend/src/test-utils/dbSetup.js` - Missing exports
  - `backend/tests/utils/logger.test.js` - Wrong expectations
  - `backend/tests/utils/apiResponse.test.js` - Case mismatch
  - `backend/tests/config/env-validation.test.js` - Missing validation
  - `backend/tests/middleware/auth-middleware.test.js` - Missing JWT_SECRET
  - `backend/tests/middleware/auth.test.js` - Database connection
  - All security tests - Database connection issues
- **Assigned To:** Unassigned
- **Priority:** P0
- **Target Fix:** Phase 1 (Days 1-2)
- **Proposed Solution:**
  1. Add test database setup script
  2. Export setupTestDb and teardownTestDb functions
  3. Fix logger test assertions
  4. Standardize on camelCase in test expectations
  5. Add SESSION_SECRET to env validation
  6. Set JWT_SECRET in test setup files

---

## High Priority Issues 🟠

### HP-001: Frontend Admin Pages Are Stubs
- **Component:** Frontend
- **Severity:** 🟠 High
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** Three admin pages (Analytics, Users, Workflows) are non-functional 12-line stubs with "Coming soon" message
- **Impact:** Admin users cannot manage the system, missing critical MVP features
- **Files Affected:**
  - `frontend/src/pages/AnalyticsPage.jsx` - 12 lines only
  - `frontend/src/pages/UsersPage.jsx` - 12 lines only
  - `frontend/src/pages/WorkflowsPage.jsx` - 12 lines only
- **Backend Status:** APIs fully implemented and working
- **Assigned To:** Unassigned
- **Priority:** P0
- **Target Fix:** Phase 2 (Days 3-5)
- **Effort:** 24 hours total
  - UsersPage: 8 hours (list, create, edit, delete users)
  - WorkflowsPage: 8 hours (list, create, edit, delete workflows)
  - AnalyticsPage: 8 hours (dashboard with charts)

### HP-002: Missing Core Features
- **Component:** Backend + Frontend
- **Severity:** 🟠 High
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** Three features flagged as TODO are not implemented
- **Impact:** Incomplete user experience, missing expected functionality
- **Missing Features:**
  1. **Cancel Request** - `frontend/src/components/RequestCard.jsx:213`
     - No backend endpoint
     - No frontend button/modal
     - Needed for: Users to cancel their pending requests
  2. **Export Requests** - `frontend/src/pages/RequestsPage.jsx:132`
     - No backend CSV export endpoint
     - No frontend export button
     - Needed for: Reporting and record-keeping
  3. **Load More / Pagination** - `frontend/src/pages/RequestsPage.jsx:435`
     - Backend supports limit/offset but frontend doesn't use it
     - No "Load More" button or infinite scroll
     - Needed for: Performance with large datasets
- **Assigned To:** Unassigned
- **Priority:** P0
- **Target Fix:** Phase 2 (Days 3-5)
- **Effort:** 8 hours total

### HP-003: Security Vulnerabilities
- **Component:** Dependencies
- **Severity:** 🟠 High
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** npm audit reports vulnerabilities in both backend and frontend
- **Impact:** Security risks, potential exploits
- **Details:**
  - Backend: 1 moderate severity vulnerability
  - Frontend: 7 vulnerabilities (3 moderate, 4 high)
- **Reproduction:**
  ```bash
  cd backend && npm audit
  cd frontend && npm audit
  ```
- **Assigned To:** Unassigned
- **Priority:** P0
- **Target Fix:** Phase 1 (Days 1-2)
- **Proposed Solution:**
  ```bash
  npm audit fix
  npm audit fix --force  # if needed
  # Review breaking changes
  ```

### HP-004: Dependency Conflicts
- **Component:** Build System
- **Severity:** 🟠 High
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** eslint-plugin-n version 17.23.1 conflicts with eslint-config-standard requirement (^15.0.0 || ^16.0.0)
- **Impact:** Cannot install dependencies without --legacy-peer-deps flag
- **Reproduction:**
  ```bash
  cd backend
  npm install
  # Fails with ERESOLVE error
  ```
- **Workaround:** `npm install --legacy-peer-deps`
- **Assigned To:** Unassigned
- **Priority:** P1
- **Target Fix:** Phase 1 (Days 1-2)
- **Proposed Solution:**
  1. Downgrade eslint-plugin-n to 16.x, OR
  2. Upgrade eslint-config-standard to 18.x (if available), OR
  3. Document --legacy-peer-deps requirement

---

## Medium Priority Issues 🟡

### MP-001: Console.log Usage
- **Component:** Backend + Frontend
- **Severity:** 🟡 Medium
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** 93 console.log statements found across the codebase
- **Impact:** Inconsistent logging, harder to debug in production
- **Breakdown:**
  - Backend: 74 occurrences across 7 files (mostly in seeds/config)
  - Frontend: 19 occurrences across 9 files (error handling, debugging)
- **Best Practice:** Use Winston logger (backend) and proper error handling (frontend)
- **Assigned To:** Unassigned
- **Priority:** P2
- **Target Fix:** Phase 1 (Days 1-2)
- **Effort:** 2 hours
- **Proposed Solution:**
  ```javascript
  // Before
  console.log('User created:', user);

  // After (backend)
  logger.info('User created', { userId: user.id, email: user.email });

  // After (frontend)
  // Remove or use proper error boundary
  ```

### MP-002: Database Schema Issue
- **Component:** Database Migrations
- **Severity:** 🟡 Medium
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** manager_id in users table is defined as string instead of proper UUID foreign key
- **Impact:** No database-level referential integrity, potential data issues
- **File:** `backend/src/database/migrations/001_create_users.js:14`
- **Current Schema:**
  ```javascript
  table.string('manager_id').nullable();
  ```
- **Expected Schema:**
  ```javascript
  table.uuid('manager_id').nullable()
    .references('id')
    .inTable('users')
    .onDelete('SET NULL')
    .onUpdate('CASCADE');
  ```
- **Assigned To:** Unassigned
- **Priority:** P2
- **Target Fix:** Phase 1 (Days 1-2)
- **Effort:** 1 hour (migration + testing)
- **Migration Required:** Yes (creates new migration)

### MP-003: Duplicate Test Files
- **Component:** Test Suite
- **Severity:** 🟡 Medium
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** Duplicate test files exist causing confusion
- **Impact:** Wasted test execution time, unclear which tests are canonical
- **Duplicates Found:**
  - `tests/middleware/auth.test.js` AND `tests/middleware/auth-middleware.test.js`
  - `tests/middleware/errorHandler.test.js` AND `tests/middleware/error-handler.test.js`
- **Assigned To:** Unassigned
- **Priority:** P2
- **Target Fix:** Phase 1 (Days 1-2)
- **Effort:** 30 minutes
- **Proposed Solution:**
  1. Compare test coverage of both files
  2. Merge unique tests into one file
  3. Delete duplicate
  4. Use consistent naming (kebab-case or camelCase)

### MP-004: Deprecated Dependencies
- **Component:** Dependencies
- **Severity:** 🟡 Medium
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** Multiple deprecated npm packages in use
- **Impact:** Future security/compatibility issues
- **Deprecated Packages:**
  - lodash.get@4.4.2 - Use optional chaining (?.) instead
  - lodash.isequal@4.5.0 - Use require('node:util').isDeepStrictEqual
  - inflight@1.0.6 - Memory leak, use lru-cache instead
  - glob@7.x - Upgrade to glob@9+
  - rimraf@3.x - Upgrade to rimraf@4+
  - superagent@8.x - Upgrade to v10.2.2+
  - supertest@6.x - Upgrade to v7.1.3+
  - eslint@8.x - Upgrade to eslint@9+
- **Assigned To:** Unassigned
- **Priority:** P2
- **Target Fix:** Phase 1 (Days 1-2)
- **Effort:** 2 hours
- **Proposed Solution:** Upgrade packages one by one, test after each

### MP-005: Missing Test Coverage
- **Component:** Backend Tests
- **Severity:** 🟡 Medium
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** Major route files have zero test coverage
- **Impact:** Unknown bugs, low confidence in deployments
- **Files Without Tests:**
  - `backend/src/routes/requests.js` - 249 LOC, 0 tests
  - `backend/src/routes/analytics.js` - 878 LOC, 0 tests
  - `backend/src/routes/workflows.js` - 534 LOC, 0 tests
  - `backend/src/routes/users.js` - 820 LOC, 0 tests
- **Models Without Tests:**
  - `backend/src/models/Request.js` - No tests
  - `backend/src/models/RequestHistory.js` - No tests
- **Assigned To:** Unassigned
- **Priority:** P1
- **Target Fix:** Phase 4 (Days 8-9)
- **Effort:** 16 hours
- **Success Criteria:** 80%+ coverage for all routes

---

## Low Priority Issues 🟢

### LP-001: Documentation Overstates Completion
- **Component:** Documentation
- **Severity:** 🟢 Low
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** PROJECT_STATUS.md claims 91% complete (29/32 tasks), but actual completion is 65-70%
- **Impact:** Misleading for stakeholders and contributors
- **Files Affected:**
  - `PROJECT_STATUS.md`
  - `TODO_CHECKLIST.md`
  - `CLAUDE.md` (claims "PRODUCTION-READY" frontend)
- **Assigned To:** Unassigned
- **Priority:** P3
- **Target Fix:** Phase 5 (Day 10)
- **Effort:** 1 hour
- **Proposed Solution:** Update to reflect actual state

### LP-002: No Docker Configuration
- **Component:** DevOps
- **Severity:** 🟢 Low (but blocks easy deployment)
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** No Dockerfile, docker-compose.yml, or container configuration
- **Impact:** Harder to onboard developers, harder to deploy
- **Missing Files:**
  - `backend/Dockerfile`
  - `frontend/Dockerfile`
  - `docker-compose.yml`
  - `.dockerignore` files
- **Assigned To:** Unassigned
- **Priority:** P1 (needed for MVP deployment)
- **Target Fix:** Phase 3 (Days 6-7)
- **Effort:** 4 hours

### LP-003: Complex Environment Configuration
- **Component:** Configuration
- **Severity:** 🟢 Low
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** .env.example has 202 lines with 50+ configuration variables
- **Impact:** Overwhelming for new developers, most are optional
- **Complexity:**
  - 5 database provider options (only need 1)
  - SMTP configuration (optional for MVP)
  - Redis (future feature, not used)
  - Slack/Teams webhooks (not implemented)
- **Assigned To:** Unassigned
- **Priority:** P3
- **Target Fix:** Phase 1 (Days 1-2)
- **Effort:** 1 hour
- **Proposed Solution:**
  1. Create .env.minimal with only required vars
  2. Move optional configs to .env.advanced
  3. Remove unused provider examples

### LP-004: Missing Pre-commit Hooks
- **Component:** Developer Experience
- **Severity:** 🟢 Low
- **Status:** Open
- **Discovered:** 2025-11-21
- **Description:** No pre-commit hooks to enforce code quality
- **Impact:** Inconsistent commits, linter errors pushed to repo
- **Recommended Hooks:**
  - Run linter on staged files
  - Run prettier on staged files
  - Run affected tests
  - Check commit message format
- **Assigned To:** Unassigned
- **Priority:** P3
- **Target Fix:** Post-MVP
- **Effort:** 2 hours
- **Tool:** husky + lint-staged

---

## Resolved Issues ✅

_None yet - will be moved here when fixed_

---

## Issue Statistics

| Severity | Open | In Progress | Resolved | Total |
|----------|------|-------------|----------|-------|
| 🔴 Critical | 1 | 0 | 0 | 1 |
| 🟠 High | 4 | 0 | 0 | 4 |
| 🟡 Medium | 5 | 0 | 0 | 5 |
| 🟢 Low | 4 | 0 | 0 | 4 |
| **Total** | **14** | **0** | **0** | **14** |

---

## Issue Tracking Process

### How to Report an Issue
1. Check if issue already exists in this document
2. If new, add to appropriate severity section
3. Use the issue template below
4. Assign priority (P0-P3)
5. Update statistics table

### Issue Template
```markdown
### [SEVERITY]-###: [Title]
- **Component:** [Backend/Frontend/Database/DevOps/Docs]
- **Severity:** [🔴/🟠/🟡/🟢] [Critical/High/Medium/Low]
- **Status:** [Open/In Progress/Blocked/Resolved]
- **Discovered:** [Date]
- **Description:** [What is the issue?]
- **Impact:** [How does it affect the system?]
- **Reproduction:** [Steps to reproduce]
- **Files Affected:** [List of files]
- **Assigned To:** [Name or Unassigned]
- **Priority:** [P0/P1/P2/P3]
- **Target Fix:** [Phase/Date]
- **Effort:** [Hours estimate]
- **Proposed Solution:** [How to fix]
```

### Status Definitions
- **Open** - Issue identified, not started
- **In Progress** - Actively being worked on
- **Blocked** - Waiting on dependency or decision
- **Resolved** - Fixed and verified
- **Won't Fix** - Decided not to fix (document why)

### Priority Definitions
- **P0** - Critical, blocks MVP launch, fix immediately
- **P1** - High priority, fix before launch
- **P2** - Medium priority, fix if time permits
- **P3** - Low priority, defer to v1.1+

---

## Next Actions

### Immediate (This Week)
1. Fix CI-001: Test Infrastructure (P0)
2. Fix HP-003: Security Vulnerabilities (P0)
3. Fix HP-004: Dependency Conflicts (P0)
4. Fix MP-001: Console.log Usage (P2)
5. Fix MP-002: Database Schema (P2)
6. Fix MP-003: Duplicate Test Files (P2)

### Phase 2 (Next Week)
7. Fix HP-001: Frontend Admin Pages (P0)
8. Fix HP-002: Missing Core Features (P0)
9. Fix MP-005: Missing Test Coverage (P1)

### Phase 3 (Week After)
10. Fix LP-002: Docker Configuration (P1)
11. Fix LP-001: Documentation (P3)
12. Fix LP-003: Environment Config (P3)

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-21 | Claude | Initial issue tracking document |

**Status:** Active
**Next Review:** Daily during MVP development
