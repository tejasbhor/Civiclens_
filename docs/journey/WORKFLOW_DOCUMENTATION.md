# CivicLens Report Workflow Documentation

## Overview
This document outlines the complete report lifecycle workflow with all dependencies, prerequisites, and second-order effects.

---

## Report Status Flow

```
RECEIVED
  ↓ (assign department)
ASSIGNED_TO_DEPARTMENT
  ↓ (assign officer)
ASSIGNED_TO_OFFICER
  ↓ (officer acknowledges)
ACKNOWLEDGED
  ↓ (officer starts work)
IN_PROGRESS
  ↓ (work completed)
PENDING_VERIFICATION
  ↓ (verified)
RESOLVED / REJECTED
```

---

## Status Transitions & Prerequisites

### 1. **RECEIVED → ASSIGNED_TO_DEPARTMENT**
**Prerequisites:**
- ✅ Department must be assigned to report (`department_id` must exist)
- ✅ Admin/Super Admin role required

**Actions:**
- Updates `report.department_id`
- Changes status to `ASSIGNED_TO_DEPARTMENT`
- Records status history

**Second-Order Effects:**
- Department receives notification
- Report appears in department's queue
- Department can now assign officers

---

### 2. **ASSIGNED_TO_DEPARTMENT → ASSIGNED_TO_OFFICER**
**Prerequisites:**
- ✅ Officer must be assigned (Task must exist)
- ✅ Officer user must exist in system
- ✅ Admin/Super Admin role required

**Actions:**
- Creates `Task` record with:
  - `assigned_to` = officer_user_id
  - `assigned_by` = current_user_id
  - `status` = ASSIGNED
  - `priority` = calculated or provided
- Changes report status to `ASSIGNED_TO_OFFICER`
- Records status history

**Second-Order Effects:**
- Officer receives notification
- Task appears in officer's workload
- Report no longer in department's unassigned queue
- Officer can now acknowledge the task

**⚠️ CRITICAL:** Cannot change status to `ASSIGNED_TO_OFFICER` without first creating a Task via `/assign-officer` endpoint

---

### 3. **ASSIGNED_TO_OFFICER → ACKNOWLEDGED**
**Prerequisites:**
- ✅ Task must exist for this report
- ✅ Officer must be the assigned officer OR admin

**Actions:**
- Updates `task.status` to ACKNOWLEDGED
- Updates `task.acknowledged_at` timestamp
- Changes report status to `ACKNOWLEDGED`

**Second-Order Effects:**
- Officer has confirmed they will work on it
- SLA timer starts
- Report appears in officer's active tasks

---

### 4. **ACKNOWLEDGED → IN_PROGRESS**
**Prerequisites:**
- ✅ Task must exist
- ✅ Officer must be assigned

**Actions:**
- Updates `task.status` to IN_PROGRESS
- Updates `task.started_at` timestamp
- Changes report status to `IN_PROGRESS`

**Second-Order Effects:**
- Officer is actively working
- Progress tracking begins
- Citizen can see work has started

---

### 5. **IN_PROGRESS → PENDING_VERIFICATION**
**Prerequisites:**
- ✅ Task must exist
- ✅ Work must be completed by officer

**Actions:**
- Changes status to `PENDING_VERIFICATION`
- Awaits verification from supervisor/admin

**Second-Order Effects:**
- Verification queue updated
- Officer's workload count decreases
- Supervisor notified

---

### 6. **PENDING_VERIFICATION → RESOLVED / REJECTED**
**Prerequisites:**
- ✅ Admin/Supervisor verification required
- ✅ Resolution notes should be provided

**Actions:**
- Updates `task.status` to RESOLVED/REJECTED
- Updates `task.resolved_at` timestamp
- Adds `resolution_notes`
- Changes report status to `RESOLVED` or `REJECTED`

**Second-Order Effects:**
- Citizen receives notification
- Officer's performance metrics updated
- Report closed in system
- Reputation points awarded (if applicable)

---

## Bulk Operations

### Bulk Status Change
**Endpoint:** `POST /api/v1/reports/bulk/status`

**Validation:**
1. Validates each transition individually
2. Skips reports with invalid transitions
3. Checks prerequisites (department/officer existence)
4. Returns detailed success/failure report

**Example Response:**
```json
{
  "total": 10,
  "successful": 8,
  "failed": 2,
  "errors": [
    {
      "report_id": "123",
      "error": "No officer assigned"
    },
    {
      "report_id": "456",
      "error": "Invalid status transition: acknowledged -> resolved"
    }
  ],
  "successful_ids": [1, 2, 3, 4, 5, 6, 7, 8],
  "failed_ids": [123, 456]
}
```

---

### Bulk Assign Department
**Endpoint:** `POST /api/v1/reports/bulk/assign-department`

**Actions:**
1. Verifies department exists
2. Assigns department to all reports
3. Auto-updates status to `ASSIGNED_TO_DEPARTMENT` if report is in `RECEIVED` or `PENDING_CLASSIFICATION`

---

### Bulk Assign Officer
**Endpoint:** `POST /api/v1/reports/bulk/assign-officer`

**Actions:**
1. Verifies officer exists
2. Creates/updates Task for each report
3. Auto-updates status to `ASSIGNED_TO_OFFICER` if appropriate
4. Calculates priority based on severity and age

---

### Bulk Update Severity
**Endpoint:** `POST /api/v1/reports/bulk/update-severity`

**Actions:**
1. Updates severity for all reports
2. Recalculates priority for associated tasks
3. No status change

---

## Workflow Best Practices

### ✅ DO:
1. **Assign Department First** - Before changing status to `ASSIGNED_TO_DEPARTMENT`
2. **Assign Officer Before Status Change** - Use `/assign-officer` endpoint, don't just change status
3. **Validate Prerequisites** - Backend validates, but frontend should prevent invalid actions
4. **Use Bulk Endpoints** - More efficient than looping individual calls
5. **Check Transition Validity** - Use `statusTransitions` map in frontend
6. **Provide Notes** - Add context for status changes

### ❌ DON'T:
1. **Don't Change Status Without Prerequisites** - Will fail validation
2. **Don't Skip Workflow Steps** - Follow the defined flow
3. **Don't Loop Individual Calls** - Use bulk endpoints for multiple reports
4. **Don't Allow Backward Transitions** - Status can only move forward or to ON_HOLD
5. **Don't Bypass Officer Assignment** - Can't go to `ASSIGNED_TO_OFFICER` without Task

---

## Frontend Implementation

### Status Dropdown Filtering
```typescript
// Only show statuses that don't require prerequisites
const allowedBulkStatuses = Object.values(ReportStatus).filter(s => ![
  ReportStatus.ASSIGNED_TO_OFFICER,    // Requires officer assignment
  ReportStatus.ASSIGNED_TO_DEPARTMENT, // Requires department assignment
  ReportStatus.ACKNOWLEDGED,           // Requires officer
  ReportStatus.IN_PROGRESS,           // Requires officer
].includes(s));
```

### Transition Validation
```typescript
const statusTransitions: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.RECEIVED]: [ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.ASSIGNED_TO_DEPARTMENT]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ON_HOLD],
  [ReportStatus.ASSIGNED_TO_OFFICER]: [ReportStatus.ACKNOWLEDGED, ReportStatus.ON_HOLD],
  // ... etc
};

// Validate before allowing transition
const allowedNext = statusTransitions[currentStatus] || [];
const isValid = allowedNext.includes(newStatus);
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Prerequisites |
|----------|--------|---------|---------------|
| `/reports/{id}/assign-department` | POST | Assign department | Admin role |
| `/reports/{id}/assign-officer` | POST | Assign officer & create task | Admin role, department assigned |
| `/reports/{id}/status` | POST | Update status | Valid transition, prerequisites met |
| `/reports/bulk/status` | POST | Bulk status update | Admin role, password verification |
| `/reports/bulk/assign-department` | POST | Bulk assign department | Admin role, password verification |
| `/reports/bulk/assign-officer` | POST | Bulk assign officer | Admin role, password verification |
| `/reports/bulk/update-severity` | POST | Bulk update severity | Admin role, password verification |

---

## Security & Audit

### Password Verification
All bulk operations require administrator password verification:
1. Frontend collects password via `PasswordConfirmDialog`
2. Backend verifies via `/auth/verify-password`
3. Only proceeds if verification succeeds

### Audit Trail
Every status change is recorded in `report_status_history`:
- Old status
- New status
- Changed by (user_id)
- Timestamp
- Optional notes

---

## Error Handling

### Common Errors

**"Invalid status transition"**
- Cause: Trying to skip workflow steps
- Solution: Follow the defined workflow

**"No department assigned"**
- Cause: Trying to set status to `ASSIGNED_TO_DEPARTMENT` without department
- Solution: Assign department first

**"No officer assigned"**
- Cause: Trying to set status to `ASSIGNED_TO_OFFICER` without Task
- Solution: Use `/assign-officer` endpoint first

**"Password verification failed"**
- Cause: Incorrect admin password
- Solution: Re-enter correct password

---

## Future Enhancements

1. **Automated Workflows** - Auto-assign based on category/location
2. **SLA Tracking** - Time limits for each status
3. **Escalation Rules** - Auto-escalate if stuck in status too long
4. **Batch Scheduling** - Schedule bulk operations for off-peak hours
5. **Rollback Support** - Undo bulk operations if needed

---

## Conclusion

This workflow ensures:
- ✅ **Data Integrity** - Prerequisites enforced
- ✅ **Transparency** - Full audit trail
- ✅ **Government Compliance** - No backward transitions
- ✅ **Citizen Trust** - Clear, linear progress
- ✅ **Production Ready** - Comprehensive validation

Always think about second-order effects when making changes to the workflow!
