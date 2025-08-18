# User Acceptance Testing (UAT) Plan – ProcessPilot

## 1. Objective
Validate that ProcessPilot meets business requirements and is ready for production use by end users.

## 2. Scope
- Functional UAT: request submission, approvals, workflow configuration
- Non-functional UAT: usability, performance, access control
- Out-of-scope: Integration with third-party HRMS

## 3. Entry Criteria
- All unit & integration tests passed
- Test environment deployed and stable
- Test data prepared (dummy employee & manager accounts)

## 4. Exit Criteria
- ≥95% test cases passed
- All critical defects resolved or deferred with approval
- UAT sign-off by business stakeholders

## 5. Test Scenarios
| ID | Scenario | Expected Result | Status |
|----|----------|-----------------|--------|
| UAT-01 | Employee submits request | Request saved, visible in dashboard | Pending |
| UAT-02 | Manager approves request | Status changes to “Approved”, notification sent | Pending |
| UAT-03 | Manager rejects request | Status changes to “Rejected”, notification sent | Pending |
| UAT-04 | Admin configures 2-step approval | Requests require 2 approvals before completion | Pending |
| UAT-05 | Unauthorized user tries to approve | Access denied | Pending |

## 6. Defect Management
- Defects logged in GitHub Issues
- Severity levels: Critical, High, Medium, Low
- Daily triage during UAT cycle

## 7. UAT Schedule
- Duration: 2 weeks
- Participants: 3 Employees, 2 Managers, 1 Admin, 1 System Owner
- Sign-off Meeting: [date]
