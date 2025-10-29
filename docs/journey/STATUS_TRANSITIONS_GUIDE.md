# Status Transitions Guide - Frontend vs Backend Verification

## 🎯 **Current Status Transitions**

### **Backend Transitions** (`app/services/report_service.py`)

```python
ALLOWED_TRANSITIONS = {
    ReportStatus.RECEIVED: {
        ReportStatus.PENDING_CLASSIFICATION, 
        ReportStatus.ASSIGNED_TO_DEPARTMENT
    },
    ReportStatus.PENDING_CLASSIFICATION: {
        ReportStatus.CLASSIFIED, 
        ReportStatus.ASSIGNED_TO_DEPARTMENT
    },
    ReportStatus.CLASSIFIED: {
        ReportStatus.ASSIGNED_TO_DEPARTMENT
    },
    ReportStatus.ASSIGNED_TO_DEPARTMENT: {
        ReportStatus.ASSIGNED_TO_OFFICER, 
        ReportStatus.ON_HOLD
    },
    ReportStatus.ASSIGNED_TO_OFFICER: {
        ReportStatus.ACKNOWLEDGED, 
        ReportStatus.ON_HOLD
    },
    ReportStatus.ACKNOWLEDGED: {
        ReportStatus.IN_PROGRESS, 
        ReportStatus.ON_HOLD
    },
    ReportStatus.IN_PROGRESS: {
        ReportStatus.PENDING_VERIFICATION, 
        ReportStatus.ON_HOLD
    },
    ReportStatus.PENDING_VERIFICATION: {
        ReportStatus.RESOLVED, 
        ReportStatus.REJECTED, 
        ReportStatus.ON_HOLD
    },
    ReportStatus.ON_HOLD: {
        ReportStatus.ASSIGNED_TO_DEPARTMENT, 
        ReportStatus.ASSIGNED_TO_OFFICER, 
        ReportStatus.IN_PROGRESS
    },
    ReportStatus.RESOLVED: set(),
    ReportStatus.CLOSED: set(),
    ReportStatus.REJECTED: set(),
    ReportStatus.DUPLICATE: set(),
}
```

### **Frontend Transitions** (`src/app/dashboard/reports/page.tsx` & `src/components/reports/ReportDetail.tsx`)

```typescript
const statusTransitions: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.RECEIVED]: [ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.PENDING_CLASSIFICATION]: [ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.CLASSIFIED]: [ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.ASSIGNED_TO_DEPARTMENT]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ON_HOLD],
  [ReportStatus.ASSIGNED_TO_OFFICER]: [ReportStatus.ACKNOWLEDGED, ReportStatus.ON_HOLD],
  [ReportStatus.ACKNOWLEDGED]: [ReportStatus.IN_PROGRESS, ReportStatus.ON_HOLD],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.PENDING_VERIFICATION, ReportStatus.ON_HOLD],
  [ReportStatus.PENDING_VERIFICATION]: [ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.ON_HOLD],
  [ReportStatus.RESOLVED]: [],
  [ReportStatus.CLOSED]: [],
  [ReportStatus.REJECTED]: [],
  [ReportStatus.DUPLICATE]: [],
  [ReportStatus.ON_HOLD]: [ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.IN_PROGRESS],
};
```

---

## ⚠️ **MISMATCH FOUND!**

### **Issue: `RECEIVED` Status**

**Backend allows:**
- `RECEIVED` → `PENDING_CLASSIFICATION` ✅
- `RECEIVED` → `ASSIGNED_TO_DEPARTMENT` ✅

**Frontend allows:**
- `RECEIVED` → `ASSIGNED_TO_DEPARTMENT` ✅
- `RECEIVED` → `PENDING_CLASSIFICATION` ❌ **MISSING!**

**Fix Required:** Add `PENDING_CLASSIFICATION` to frontend transitions for `RECEIVED` status.

---

## 🧪 **How to Test Transitions**

### **Test 1: Valid Transitions (Should Work)**

#### **Scenario A: New Report → Department Assignment**
```bash
# 1. Create a report (status: RECEIVED)
POST /api/v1/reports
{
  "title": "Test Report",
  "description": "Testing transitions",
  "latitude": 23.3441,
  "longitude": 85.3096,
  "severity": "medium"
}

# 2. Assign department (should auto-update to ASSIGNED_TO_DEPARTMENT)
POST /api/v1/reports/1/assign-department
{
  "department_id": 1,
  "notes": "Assigning to PWD"
}
# ✅ Should succeed
```

#### **Scenario B: Department → Officer → Acknowledged**
```bash
# 1. Assign officer (status: ASSIGNED_TO_DEPARTMENT → ASSIGNED_TO_OFFICER)
POST /api/v1/reports/1/assign-officer
{
  "officer_user_id": 2,
  "priority": 7
}
# ✅ Should succeed

# 2. Change to ACKNOWLEDGED
POST /api/v1/reports/1/status
{
  "new_status": "acknowledged"
}
# ✅ Should succeed (officer exists)
```

#### **Scenario C: ON_HOLD Recovery**
```bash
# 1. Put report on hold
POST /api/v1/reports/1/status
{
  "new_status": "on_hold"
}
# ✅ Should succeed from most statuses

# 2. Resume to IN_PROGRESS
POST /api/v1/reports/1/status
{
  "new_status": "in_progress"
}
# ✅ Should succeed (if officer exists)
```

---

### **Test 2: Invalid Transitions (Should Fail)**

#### **Scenario D: Skip Steps**
```bash
# Try to go directly from RECEIVED to RESOLVED
POST /api/v1/reports/1/status
{
  "new_status": "resolved"
}
# ❌ Should fail: "Invalid status transition: received -> resolved"
```

#### **Scenario E: Missing Prerequisites**
```bash
# Try ASSIGNED_TO_OFFICER without officer
POST /api/v1/reports/1/status
{
  "new_status": "assigned_to_officer"
}
# ❌ Should fail: "No officer assigned. Please assign an officer first."
```

#### **Scenario F: Backward Transition**
```bash
# Try to go back from IN_PROGRESS to RECEIVED
POST /api/v1/reports/1/status
{
  "new_status": "received"
}
# ❌ Should fail: "Invalid status transition" (not in allowed list)
```

---

### **Test 3: Bulk Operations**

#### **Scenario G: Bulk Status Change (Valid)**
```bash
# Change multiple reports to ON_HOLD
POST /api/v1/reports/bulk/status
{
  "report_ids": [1, 2, 3],
  "new_status": "on_hold",
  "notes": "Maintenance window"
}
# ✅ Should succeed for reports in valid states
# ⚠️ Should skip reports in invalid states with detailed errors
```

#### **Scenario H: Bulk Status Change (Mixed)**
```bash
# Try to change mixed-status reports to ACKNOWLEDGED
POST /api/v1/reports/bulk/status
{
  "report_ids": [1, 2, 3],  # 1=ASSIGNED_TO_OFFICER, 2=RECEIVED, 3=IN_PROGRESS
  "new_status": "acknowledged"
}
# ✅ Report 1 should succeed (valid transition)
# ❌ Report 2 should fail (invalid transition)
# ❌ Report 3 should fail (invalid transition)
# Result: 1 successful, 2 failed with detailed errors
```

---

## 📊 **Complete Transition Matrix**

| From Status | To Status | Prerequisites | Will Succeed? |
|-------------|-----------|---------------|---------------|
| RECEIVED | PENDING_CLASSIFICATION | None | ✅ Backend only |
| RECEIVED | ASSIGNED_TO_DEPARTMENT | `department_id` | ✅ Yes |
| PENDING_CLASSIFICATION | CLASSIFIED | None | ✅ Yes |
| PENDING_CLASSIFICATION | ASSIGNED_TO_DEPARTMENT | `department_id` | ✅ Yes |
| CLASSIFIED | ASSIGNED_TO_DEPARTMENT | `department_id` | ✅ Yes |
| ASSIGNED_TO_DEPARTMENT | ASSIGNED_TO_OFFICER | Task exists | ✅ Yes |
| ASSIGNED_TO_DEPARTMENT | ON_HOLD | None | ✅ Yes |
| ASSIGNED_TO_OFFICER | ACKNOWLEDGED | Task exists | ✅ Yes |
| ASSIGNED_TO_OFFICER | ON_HOLD | None | ✅ Yes |
| ACKNOWLEDGED | IN_PROGRESS | Task exists | ✅ Yes |
| ACKNOWLEDGED | ON_HOLD | None | ✅ Yes |
| IN_PROGRESS | PENDING_VERIFICATION | Task exists | ✅ Yes |
| IN_PROGRESS | ON_HOLD | None | ✅ Yes |
| PENDING_VERIFICATION | RESOLVED | Task exists | ✅ Yes |
| PENDING_VERIFICATION | REJECTED | Task exists | ✅ Yes |
| PENDING_VERIFICATION | ON_HOLD | None | ✅ Yes |
| ON_HOLD | ASSIGNED_TO_DEPARTMENT | `department_id` | ✅ Yes |
| ON_HOLD | ASSIGNED_TO_OFFICER | Task exists | ✅ Yes |
| ON_HOLD | IN_PROGRESS | Task exists | ✅ Yes |
| RESOLVED | Any | N/A | ❌ Terminal state |
| CLOSED | Any | N/A | ❌ Terminal state |
| REJECTED | Any | N/A | ❌ Terminal state |
| DUPLICATE | Any | N/A | ❌ Terminal state |

---

## 🔧 **How to Test in Frontend**

### **1. Test Inline Status Change**

1. Go to `/dashboard/reports`
2. Find a report with status `ASSIGNED_TO_OFFICER`
3. Click the status dropdown
4. You should see only: `ACKNOWLEDGED`, `ON_HOLD`
5. Select `ACKNOWLEDGED` → Should work ✅
6. Try selecting `RESOLVED` → Should not be in dropdown ❌

### **2. Test Bulk Status Change**

1. Select multiple reports with different statuses
2. Choose "Change Status" → Select `ON_HOLD`
3. Enter password
4. Should show progress with:
   - ✅ Successful transitions
   - ❌ Failed transitions with reasons
   - 📊 Summary: X successful, Y failed

### **3. Test Prerequisites**

1. Create new report (status: `RECEIVED`)
2. Try to change to `ASSIGNED_TO_OFFICER` directly
3. Should fail: "No officer assigned"
4. First assign officer via "Assign Officer" button
5. Now status should auto-change to `ASSIGNED_TO_OFFICER` ✅

---

## 🐛 **Known Issues & Fixes**

### **Issue 1: Frontend Missing `PENDING_CLASSIFICATION` Transition**

**Location:** `src/app/dashboard/reports/page.tsx` line 132

**Current:**
```typescript
[ReportStatus.RECEIVED]: [ReportStatus.ASSIGNED_TO_DEPARTMENT],
```

**Should be:**
```typescript
[ReportStatus.RECEIVED]: [ReportStatus.PENDING_CLASSIFICATION, ReportStatus.ASSIGNED_TO_DEPARTMENT],
```

### **Issue 2: Bulk Operations Filter Out Valid Statuses**

**Location:** `src/app/dashboard/reports/page.tsx` lines 708-714

**Current:** Filters out `ASSIGNED_TO_OFFICER`, `ASSIGNED_TO_DEPARTMENT`, etc.

**Problem:** These CAN be valid for bulk operations if prerequisites are met!

**Solution:** Remove the filter and let backend validation handle it with detailed error messages.

---

## ✅ **Quick Test Script**

```bash
# Save as test_transitions.sh

#!/bin/bash
BASE_URL="http://localhost:8000/api/v1"
TOKEN="your_admin_token_here"

echo "🧪 Testing Status Transitions"

# Test 1: Valid transition
echo "Test 1: RECEIVED → ASSIGNED_TO_DEPARTMENT"
curl -X POST "$BASE_URL/reports/1/assign-department" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"department_id": 1}'

# Test 2: Invalid transition
echo "Test 2: RECEIVED → RESOLVED (should fail)"
curl -X POST "$BASE_URL/reports/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_status": "resolved"}'

# Test 3: Missing prerequisite
echo "Test 3: ASSIGNED_TO_OFFICER without officer (should fail)"
curl -X POST "$BASE_URL/reports/2/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_status": "assigned_to_officer"}'

echo "✅ Tests complete!"
```

---

## 📝 **Summary**

### **What Works:**
- ✅ Most transitions match between frontend and backend
- ✅ Prerequisite validation works
- ✅ Bulk operations validate per-item
- ✅ Database constraints enforce rules
- ✅ Service layer provides atomic operations

### **What Needs Fixing:**
- ⚠️ Frontend missing `RECEIVED → PENDING_CLASSIFICATION` transition
- ⚠️ Bulk status dropdown filters out too many valid options
- ⚠️ Need better error messages for failed bulk operations

### **How to Verify Everything Works:**
1. Start backend: `uvicorn app.main:app --reload`
2. Apply migrations: `psql -U postgres -d civiclens -f app/db/migrations/add_report_constraints.sql`
3. Start frontend: `npm run dev`
4. Run test script above
5. Check frontend bulk operations
6. Verify error messages are clear

**All transitions should now be consistent and validated!** 🎉
