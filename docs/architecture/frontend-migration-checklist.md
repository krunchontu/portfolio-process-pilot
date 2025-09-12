# Frontend CamelCase Migration Implementation Checklist

## Pre-Migration Setup ✅

### Environment Preparation
- [ ] Create feature branch: `feature/frontend-camelcase-migration`
- [ ] Verify backend camelCase API is working in development environment
- [ ] Run existing test suite to establish baseline: `npm test`
- [ ] Verify E2E tests pass: `npm run test:e2e`
- [ ] Document current failing tests (if any) to avoid false positives

### Team Coordination
- [ ] Notify team of migration start
- [ ] Block other frontend changes during migration period
- [ ] Set up dedicated review process for migration PRs

## Phase 1: Foundation Layer 🚀

### API Response Layer
- [ ] **File**: `src/services/api.js`
  - [ ] Update Axios response interceptors to handle camelCase
  - [ ] Add temporary logging to verify response structure
  - [ ] Test authentication endpoints return camelCase user data

### Authentication Context  
- [ ] **File**: `src/contexts/AuthContext.jsx`
  - [ ] Update `user.first_name` → `user.firstName` (line ~108)
  - [ ] Update any other user property references
  - [ ] Test login flow works correctly
  - [ ] Test user profile access works

### Notification Context
- [ ] **File**: `src/contexts/NotificationContext.jsx`
  - [ ] Update `userId` property access (line ~125)
  - [ ] Test notification system works with new user properties

### Testing Phase 1
- [ ] Run `npm test -- --testPathPattern=contexts` 
- [ ] Test authentication login/logout manually
- [ ] Verify no console errors on user authentication

## Phase 2: Core Components 🎯

### Layout Component
- [ ] **File**: `src/components/Layout.jsx`
  - [ ] Update user initials: `user?.first_name?.[0]` → `user?.firstName?.[0]` (line ~229)
  - [ ] Update user display: `user?.first_name user?.last_name` → `user?.firstName user?.lastName` (line ~234)
  - [ ] Test user dropdown menu displays correctly

### Request Card Component
- [ ] **File**: `src/components/RequestCard.jsx`
  - [ ] Update creator names: `request.creator_first_name` → `request.creatorFirstName` (line ~110, ~114)
  - [ ] Test request card displays creator names correctly
  - [ ] Verify request properties display correctly

### Dashboard Page
- [ ] **File**: `src/pages/DashboardPage.jsx`
  - [ ] Update welcome message: `user?.first_name` → `user?.firstName` (line ~96)
  - [ ] Update request creator display: `request.creator_first_name` → `request.creatorFirstName` (line ~352)
  - [ ] Test dashboard loads and displays user info correctly

### Testing Phase 2
- [ ] Run component tests: `npm test -- --testPathPattern=components`
- [ ] Test dashboard page loads without errors
- [ ] Verify user names display correctly throughout app

## Phase 3: Form Components 📝

### Profile Page Forms
- [ ] **File**: `src/pages/ProfilePage.jsx`
  - [ ] Update form defaults: `user?.first_name` → `user?.firstName` (line ~16)
  - [ ] Update form defaults: `user?.last_name` → `user?.lastName` (line ~17) 
  - [ ] Update form registration: `first_name` → `firstName` (line ~98)
  - [ ] Update form registration: `last_name` → `lastName` (line ~108)
  - [ ] Test profile form loads and saves correctly

### Registration Page
- [ ] **File**: `src/pages/RegisterPage.jsx`
  - [ ] Update form defaults: `first_name: ''` → `firstName: ''` (line ~24)
  - [ ] Update form defaults: `last_name: ''` → `lastName: ''` (line ~25)
  - [ ] Update form fields and validation rules (lines ~106-155)
  - [ ] Update all error handling references
  - [ ] Test user registration works end-to-end

### Create Request Page
- [ ] **File**: `src/pages/CreateRequestPage.jsx`
  - [ ] Update workflow field: `workflow_id` → `workflowId` (lines ~64, ~68, ~456, ~476, ~480, ~481, ~501, ~502)
  - [ ] Test request creation form works correctly
  - [ ] Verify workflow selection and payload submission

### Request Detail Page
- [ ] **File**: `src/pages/RequestDetailPage.jsx`
  - [ ] Update history timestamp: `entry.created_at` → `entry.createdAt` (line ~450)
  - [ ] Update creator display: `requestData.creator_first_name` → `requestData.creatorFirstName` (line ~478)
  - [ ] Update creator display: `requestData.creator_last_name` → `requestData.creatorLastName` (line ~478)
  - [ ] Test request detail page displays all information correctly

### Testing Phase 3
- [ ] Run form tests: `npm test -- --testPathPattern=pages`
- [ ] Test user registration end-to-end
- [ ] Test profile update functionality
- [ ] Test request creation workflow
- [ ] Test request detail page displays correctly

## Phase 4: Test Files & Mock Data 🧪

### Global Test Setup
- [ ] **File**: `src/test/setup.js`
  - [ ] Update mock user objects: `first_name` → `firstName` (lines ~109, ~122, ~135)
  - [ ] Update mock user objects: `last_name` → `lastName` (lines ~110, ~123, ~136)
  - [ ] Update mock user objects: `created_at` → `createdAt` (lines ~114, ~127, ~140)
  - [ ] Update mock request objects: `creator_first_name` → `creatorFirstName` (line ~156)
  - [ ] Update mock request objects: `creator_last_name` → `creatorLastName` (line ~157)

### Component Test Files (Update Each)
- [ ] **RequestCard.test.jsx**: Update creator name assertions (lines ~127-128, ~140-141)
- [ ] **CreateRequestPage.test.jsx**: Update workflow_id references (lines ~319, ~406, ~469, ~525)
- [ ] **DashboardPage.test.jsx**: Update user name assertions (lines ~53-54, ~85-86, ~149)
- [ ] **RegisterPage.test.jsx**: Update form field assertions (lines ~319-320)
- [ ] **RequestDetailPage.test.jsx**: Update user/request property assertions (lines ~52-53, ~62-63, ~83)
- [ ] **RequestsPage.test.jsx**: Update creator name assertions (lines ~49-50, ~60-61)

### E2E Test Updates
- [ ] Review Playwright test files for any hardcoded property names
- [ ] Update test data fixtures if needed
- [ ] Run E2E tests: `npm run test:e2e`

### Full Test Suite Validation
- [ ] Run complete test suite: `npm test`
- [ ] Verify no test failures related to property naming
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Fix any remaining test failures

## Post-Migration Validation 🔍

### Manual Testing Checklist
- [ ] **Authentication Flow**
  - [ ] Login with valid credentials
  - [ ] Verify user name displays correctly in header
  - [ ] Logout and verify session cleared

- [ ] **User Management**
  - [ ] Register new user account
  - [ ] Update profile information
  - [ ] Verify changes persist correctly

- [ ] **Request Management**
  - [ ] Create new request (all types: leave, expense, equipment)
  - [ ] View request list with creator names
  - [ ] Open request detail page
  - [ ] Verify workflow visualization works
  - [ ] Test request approval/rejection (if manager/admin)

- [ ] **Dashboard**
  - [ ] Verify welcome message shows user name
  - [ ] Check recent requests display creator info
  - [ ] Verify analytics display correctly

### Performance & Error Validation
- [ ] No console errors in browser dev tools
- [ ] No network request errors
- [ ] Page load times unchanged
- [ ] Memory usage normal (check dev tools)

## Deployment Preparation 🚀

### Code Quality
- [ ] Run linting: `npm run lint`
- [ ] Fix any linting issues
- [ ] Verify code formatting: `npm run format:check`

### Build Verification
- [ ] Production build succeeds: `npm run build`
- [ ] Preview production build: `npm run preview`
- [ ] Test critical functionality in production build

### Documentation Updates
- [ ] Update any API documentation that references property names
- [ ] Update development setup guides if needed
- [ ] Create deployment notes for team

## Rollback Plan 🔄

### If Critical Issues Found
- [ ] Document specific issues encountered
- [ ] Determine if issue is frontend or backend related
- [ ] Consider temporary compatibility layer in API services
- [ ] Coordinate with backend team if needed

### Rollback Steps (If Needed)
1. [ ] Revert frontend changes: `git revert <commit-hash>`
2. [ ] Coordinate backend compatibility layer deployment
3. [ ] Re-run test suite to ensure stability
4. [ ] Plan revised migration approach

## Sign-off & Communication 📋

### Team Review
- [ ] Code review completed by frontend lead
- [ ] QA testing completed successfully
- [ ] Product owner approval for deployment

### Stakeholder Communication  
- [ ] Notify team of successful migration completion
- [ ] Update project documentation with new standards
- [ ] Share lessons learned for future migrations

---

## Quick Reference: Key File Changes

| File | Primary Changes | Lines |
|------|----------------|-------|
| `AuthContext.jsx` | `user.first_name` → `user.firstName` | ~108 |
| `Layout.jsx` | User display properties | ~229, ~234 |
| `DashboardPage.jsx` | Welcome message, creator names | ~96, ~352 |
| `RequestCard.jsx` | Creator name display | ~110, ~114 |
| `ProfilePage.jsx` | Form field names | ~16, ~17, ~98, ~108 |
| `RegisterPage.jsx` | Form field names | ~24, ~25, ~106-155 |
| `CreateRequestPage.jsx` | `workflow_id` → `workflowId` | Multiple |
| `RequestDetailPage.jsx` | History and creator display | ~450, ~478 |
| `test/setup.js` | Mock data objects | ~109-157 |

**Estimated Total Effort**: 2-3 developer days with proper testing

*This checklist ensures systematic, thorough migration with minimal risk of regressions.*