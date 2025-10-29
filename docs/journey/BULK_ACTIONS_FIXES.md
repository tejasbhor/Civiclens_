# Bulk Actions - Issues & Fixes

## 🔴 Issues Identified

### 1. **422 Error on Bulk Status Update**
**Error:** `POST /api/v1/reports/bulk/status HTTP/1.1" 422 Unprocessable Entity`  
**Frontend shows:** `[object Object]`

**Root Cause:** The error message is not being displayed properly. The frontend is showing `[object Object]` instead of the actual error message.

### 2. **Delete Button Should Not Exist**
Reports cannot be deleted directly. They should be:
- **Archived** after resolution or if marked as spam
- **Retained** for a policy-defined period
- **Permanently deleted** only after the retention period

### 3. **Multiple Bulk Actions at Once**
Currently, you can only run one bulk action at a time. User wants to:
- Select department, status, and severity
- Execute all three actions with a single password confirmation

### 4. **Password Verification**
Need to verify that password verification is properly implemented in both frontend and backend.

---

## ✅ Fixes Applied

### Fix 1: Improve Error Display

The issue is that error objects are being displayed as `[object Object]`. We need to properly extract the error message.

**File:** `src/app/dashboard/reports/page.tsx`

**Problem:**
```typescript
alert(e?.response?.data?.detail || 'Bulk assign failed');
```

This doesn't handle all error formats properly.

**Solution:** Better error handling to extract the actual error message.

### Fix 2: Remove Delete Button

**File:** `src/app/dashboard/reports/page.tsx` (Lines 797-806)

The Delete button and `runBulkDelete` function should be removed. Reports should not be deletable from the UI.

### Fix 3: Backend Password Verification

**Status:** ✅ Already Implemented

**Backend Endpoint:** `/api/v1/auth/verify-password` (Line 254-276 in `auth.py`)

```python
@router.post("/verify-password")
async def verify_user_password(
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Verify current user's password for sensitive operations"""
    password = request.get("password")
    
    if not password:
        raise ValidationException("Password is required")
    
    # Get fresh user data with password hash
    user = await user_crud.get(db, current_user.id)
    if not user:
        raise UnauthorizedException("User not found")
    
    # Verify password
    if not user.hashed_password or not verify_password(password, user.hashed_password):
        raise UnauthorizedException("Invalid password")
    
    return {"verified": True, "message": "Password verified successfully"}
```

**Frontend Implementation:** ✅ Already calling `authApi.verifyPassword(password)` before each bulk action

---

## 🔧 Implementation

### Change 1: Fix Error Display

Update error handling to properly display error messages:

```typescript
} catch (e: any) {
  setPasswordDialog({ ...passwordDialog, isOpen: false });
  
  // Better error extraction
  let errorMessage = 'Operation failed';
  if (e?.response?.data?.detail) {
    if (typeof e.response.data.detail === 'string') {
      errorMessage = e.response.data.detail;
    } else if (Array.isArray(e.response.data.detail)) {
      errorMessage = e.response.data.detail.map(err => err.msg || err).join(', ');
    } else {
      errorMessage = JSON.stringify(e.response.data.detail);
    }
  } else if (e?.message) {
    errorMessage = e.message;
  }
  
  alert(errorMessage);
  setBulkRunning(false);
}
```

### Change 2: Remove Delete Button

**Remove these lines (797-806):**
```typescript
<button
  disabled={bulkRunning}
  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center gap-2"
  onClick={runBulkDelete}
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
  Delete
</button>
```

**Remove the function (377-432):**
```typescript
const runBulkDelete = () => { ... }
```

---

## 🐛 Debugging the 422 Error

### Step 1: Check What's Being Sent

Add console logging to see the exact payload:

```typescript
const runBulkChangeStatus = () => {
  // ... existing code ...
  
  onConfirm: async (password: string) => {
    try {
      await authApi.verifyPassword(password);
      
      // DEBUG: Log the payload
      const payload = {
        report_ids: validIds,
        new_status: bulkStatus as ReportStatus,
      };
      console.log('Sending bulk status update:', payload);
      console.log('Status value:', bulkStatus);
      console.log('Status type:', typeof bulkStatus);
      
      const result = await reportsApi.bulkUpdateStatus(payload);
      // ... rest of code
    }
  }
}
```

### Step 2: Check Backend Validation

The backend expects:
```python
class BulkStatusUpdateRequest(BaseModel):
    report_ids: list[int] = Field(..., min_length=1, max_length=100)
    new_status: ReportStatus  # Must be valid enum value
    notes: str | None = None
```

Valid `ReportStatus` values:
- `"received"`
- `"pending_classification"`
- `"classified"`
- `"assigned_to_department"`
- `"assigned_to_officer"`
- `"acknowledged"`
- `"in_progress"`
- `"pending_verification"`
- `"resolved"`
- `"closed"`
- `"rejected"`
- `"duplicate"`
- `"on_hold"`

### Step 3: Common Causes of 422 Error

1. **Invalid status value** - Status not in enum
2. **Empty report_ids array** - No reports selected
3. **Invalid report IDs** - Non-integer values
4. **Status transition validation** - Backend might be rejecting invalid transitions

### Step 4: Check Backend Logs

Look for the actual validation error in backend logs:
```bash
# In backend terminal, you should see something like:
INFO:     127.0.0.1:51986 - "POST /api/v1/reports/bulk/status HTTP/1.1" 422 Unprocessable Entity

# The logs should show the validation error details
```

---

## 🎯 Testing the Fixes

### Test 1: Verify Error Messages Display Correctly

1. Stop the backend
2. Try a bulk action
3. Should see: "Network error. Please check your connection." (not `[object Object]`)

### Test 2: Verify Delete Button is Removed

1. Select reports
2. Bulk actions bar should show:
   - ✅ Select Department + Assign button
   - ✅ Select Status + Update button
   - ✅ Change Severity + Update button
   - ✅ Export Selected button
   - ❌ NO Delete button

### Test 3: Verify Password Verification Works

1. Select reports
2. Choose a bulk action
3. Enter **wrong password**
4. Should see: "Invalid password" error
5. Try again with **correct password**
6. Should proceed with the action

### Test 4: Debug 422 Error

1. Open browser DevTools → Console
2. Select reports with status "on_hold"
3. Try to change status to "in_progress"
4. Check console for the debug logs
5. Check Network tab for the actual request payload
6. Check backend logs for validation error details

---

## 📊 Expected vs Actual

### Bulk Status Update Request

**Expected Payload:**
```json
{
  "report_ids": [1, 2, 3],
  "new_status": "in_progress"
}
```

**Backend Validation:**
- ✅ `report_ids` must be array of integers
- ✅ `report_ids` must have 1-100 items
- ✅ `new_status` must be valid ReportStatus enum value
- ✅ User must be admin

**Possible 422 Causes:**
1. `new_status` is not a valid enum value
2. `report_ids` is empty or has > 100 items
3. `report_ids` contains non-integer values
4. Backend validation logic rejects the transition

---

## 🔍 Next Steps

1. **Apply the fixes** (error display + remove delete button)
2. **Add debug logging** to see exact payload being sent
3. **Check backend logs** for the actual validation error
4. **Test with different status transitions** to isolate the issue

---

## 📝 Notes

### Password Verification
- ✅ Backend endpoint exists and works
- ✅ Frontend calls it before each bulk action
- ✅ Proper error handling for wrong password

### Bulk Actions Implementation
- ✅ Backend endpoints exist for all bulk operations
- ✅ Frontend uses bulk endpoints (not loops)
- ✅ Password confirmation required for each action
- ✅ Progress modal shows results
- ⚠️ Error messages not displaying properly (needs fix)
- ❌ Delete button should not exist (needs removal)

### Archive Functionality
- ❌ Not yet implemented
- 📋 Should be added as a separate feature
- 📋 Should have retention policy configuration
- 📋 Should only allow archiving resolved/spam reports

---

**Status:** Partial fixes needed  
**Priority:** High (422 error blocking bulk operations)  
**Next Action:** Apply fixes and debug 422 error
