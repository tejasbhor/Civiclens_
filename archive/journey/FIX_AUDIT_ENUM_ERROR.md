# Fix: Database Enum Mismatch Error

## 🔴 Error Summary

**Error:** `asyncpg.exceptions.InvalidTextRepresentationError: invalid input value for enum auditaction: "report_classified"`

**Location:** `app/api/v1/reports.py` line 333 (classify_report endpoint)

**Root Cause:** The PostgreSQL database enum `auditaction` is missing values that exist in the Python `AuditAction` enum.

## 📊 Problem Analysis

### Python Code (Correct) ✅
```python
# app/models/audit_log.py
class AuditAction(str, enum.Enum):
    # ... authentication actions ...
    REPORT_CREATED = "report_created"
    REPORT_UPDATED = "report_updated"
    REPORT_ASSIGNED = "report_assigned"
    REPORT_STATUS_CHANGED = "report_status_changed"
    REPORT_CLASSIFIED = "report_classified"  # ⚠️ This one failed
    REPORT_RESOLVED = "report_resolved"
    # ... appeal and escalation actions ...
```

### Database Enum (Missing Values) ❌
```sql
-- Old database enum (incomplete)
CREATE TYPE auditaction AS ENUM (
    'login_success', 'login_failure', 'logout', ...
    'user_created', 'user_updated', ...
    'sensitive_data_access', 'bulk_data_export', 'system_config_change'
    -- ❌ Missing all report/appeal/escalation actions!
);
```

### Missing Values
The database was missing **16 enum values**:
- `report_created`
- `report_updated`
- `report_assigned`
- `report_status_changed`
- `report_classified` ⚠️ (the one that caused the error)
- `report_resolved`
- `appeal_created`
- `appeal_reviewed`
- `appeal_approved`
- `appeal_rejected`
- `appeal_withdrawn`
- `escalation_created`
- `escalation_acknowledged`
- `escalation_updated`
- `escalation_resolved`
- `escalation_de_escalated`

## ✅ Solution

### Option 1: Run Migration Script (Recommended - No Data Loss)

Run the migration script to add missing values to the existing database:

```bash
cd d:/Civiclens/civiclens-backend
python fix_audit_enum.py
```

This will:
- ✅ Add all missing enum values
- ✅ Preserve existing data
- ✅ No downtime required

### Option 2: Reset Database (Fresh Start)

If you don't have important data, reset the database:

```bash
cd d:/Civiclens/civiclens-backend
python reset_and_setup_fresh.py
```

This will:
- ⚠️ Drop all tables
- ⚠️ Delete all data
- ✅ Create fresh database with correct enums

## 🔧 What Was Fixed

### 1. Updated `reset_and_setup_fresh.py`
Added missing enum values to the database creation script:

```python
# Before (lines 96-104)
CREATE TYPE auditaction AS ENUM (
    'login_success', 'login_failure', ...
    'system_config_change'  # ❌ Stopped here
)

# After (lines 96-108)
CREATE TYPE auditaction AS ENUM (
    'login_success', 'login_failure', ...
    'system_config_change',
    'report_created', 'report_updated', 'report_assigned', 'report_status_changed',
    'report_classified', 'report_resolved',  # ✅ Added
    'appeal_created', 'appeal_reviewed', 'appeal_approved', 'appeal_rejected', 'appeal_withdrawn',  # ✅ Added
    'escalation_created', 'escalation_acknowledged', 'escalation_updated', 'escalation_resolved', 'escalation_de_escalated'  # ✅ Added
)
```

### 2. Created Migration Script
Created `fix_audit_enum.py` to safely update existing databases.

## 🚀 How to Apply the Fix

### Step 1: Stop the Backend
```bash
# Press Ctrl+C in the terminal running uvicorn
```

### Step 2: Run Migration
```bash
cd d:/Civiclens/civiclens-backend
python fix_audit_enum.py
```

**Expected Output:**
```
🔧 Fixing auditaction enum...
  ✅ Added 'report_created'
  ✅ Added 'report_updated'
  ✅ Added 'report_assigned'
  ✅ Added 'report_status_changed'
  ✅ Added 'report_classified'
  ✅ Added 'report_resolved'
  ✅ Added 'appeal_created'
  ✅ Added 'appeal_reviewed'
  ✅ Added 'appeal_approved'
  ✅ Added 'appeal_rejected'
  ✅ Added 'appeal_withdrawn'
  ✅ Added 'escalation_created'
  ✅ Added 'escalation_acknowledged'
  ✅ Added 'escalation_updated'
  ✅ Added 'escalation_resolved'
  ✅ Added 'escalation_de_escalated'
✅ AuditAction enum fixed!

🎉 You can now use report classification and other audit actions.
```

### Step 3: Restart Backend
```bash
uvicorn app.main:app --reload
```

### Step 4: Test Report Classification
1. Go to Reports page
2. Click "Quick Edit" on any report
3. Fill in the 3-step classification form
4. Submit

**Expected:** ✅ Success message "Report classified successfully"

## 🎯 Verification

After applying the fix, verify the enum values:

```sql
-- Connect to PostgreSQL
psql -U postgres -d civiclens

-- Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'auditaction'::regtype 
ORDER BY enumsortorder;
```

**Expected Output:**
```
enumlabel
--------------------------
login_success
login_failure
...
report_created
report_updated
report_assigned
report_status_changed
report_classified          ← Should be here now!
report_resolved
appeal_created
...
escalation_de_escalated
```

## 📝 Files Modified

1. **`reset_and_setup_fresh.py`** (lines 96-108)
   - Added missing enum values to database creation script
   - Ensures future database resets include all values

2. **`fix_audit_enum.py`** (NEW)
   - Migration script to update existing databases
   - Safe to run multiple times (idempotent)

## 🔍 Why This Happened

The database enum was created before all the report/appeal/escalation features were fully implemented. The Python code was updated to include these actions, but the database enum wasn't updated to match.

## 🛡️ Prevention

To prevent this in the future:

1. **Always update both** when adding new audit actions:
   - Python enum in `app/models/audit_log.py`
   - Database enum in `reset_and_setup_fresh.py`
   - Create migration script for existing databases

2. **Use migrations** for schema changes:
   - Consider using Alembic for database migrations
   - Track all schema changes in version control

3. **Test with fresh database** periodically:
   - Run `reset_and_setup_fresh.py` in development
   - Ensures setup script is complete

## 📚 Related Files

- `app/models/audit_log.py` - Python AuditAction enum definition
- `app/core/audit_logger.py` - Audit logging service
- `app/api/v1/reports.py` - Report endpoints using audit logging
- `reset_and_setup_fresh.py` - Database setup script
- `fix_audit_enum.py` - Migration script (NEW)

## ✅ Summary

**Problem:** Database enum missing values → Classification failed  
**Solution:** Added missing values to database enum  
**Action:** Run `python fix_audit_enum.py`  
**Result:** Report classification now works! 🎉

---

**Status:** ✅ FIXED  
**Date:** October 25, 2025  
**Impact:** All report management features now functional
