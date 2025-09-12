# ProcessPilot – Business Requirements Document (BRD)

## 1. Project Purpose
Provide a lightweight workflow & approval engine that enables employees to submit requests (e.g., leave, expense) and route them through multi-step approvals, improving efficiency and traceability.

## 2. Objectives
- Reduce manual approval delays by 50%
- Provide transparent status tracking for all requests
- Enable configurable approval flows without code changes
- Support role-based access (Employee, Manager, Admin)

## 3. Scope
### In-Scope
- Request submission form
- Multi-level approval routing
- Status dashboard
- Configurable workflows (Admin UI)
- Notifications (email/SMS optional)

### Out-of-Scope
- Payroll integration
- Third-party HRMS sync
- Mobile app (future roadmap)

## 4. Stakeholders
- **Employee**: submits requests
- **Manager**: approves/rejects requests
- **Admin**: configures workflows
- **System Owner**: monitors KPIs

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|----------------------|
| FR-01 | Employee can submit a request | High | Form captures type, description, date; saved in DB |
| FR-02 | Manager can approve/reject | High | Decision recorded; request status updated |
| FR-03 | Admin can configure approval steps | Medium | UI to add/remove approval stages |
| FR-04 | Notifications sent on status change | Low | Email/SMS triggered on approval/rejection |

## 6. Non-Functional Requirements
- Availability: 99.5% uptime
- Performance: < 2s response time for common operations
- Security: Role-based access control
- Audit: Log all approval actions with timestamps

## 7. Assumptions & Constraints
- Initial deployment limited to one department
- Hosted on cloud (Heroku/Render + Vercel)
- PostgreSQL as primary DB
