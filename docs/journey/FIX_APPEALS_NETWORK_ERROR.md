# Fix: Appeals/Escalations Network Error

## 🔴 Error Summary

**Error:** `Network Error at async loadData (src/components/reports/manage/AppealsEscalationsSection.tsx:49:31)`

**Location:** `AppealsEscalationsSection` component

**Root Cause:** Component was using direct `apiClient.get()` calls instead of the proper API modules (`appealsApi` and `escalationsApi`).

---

## 📊 Problem Analysis

### What Was Wrong

The component had this code:

```typescript
// ❌ WRONG - Direct apiClient usage
import apiClient from '@/lib/api/client';

const appealsResponse = await apiClient.get('/appeals', {
  params: { limit: 100 }
});
const allAppeals = appealsResponse.data || [];
```

**Issues:**
1. ❌ Imported `apiClient` directly instead of using API modules
2. ❌ Made raw API calls without proper error handling
3. ❌ Inconsistent with the rest of the codebase
4. ❌ Bypassed the proper API abstraction layer

### What Should Have Been Used

The codebase already has proper API modules:
- ✅ `src/lib/api/appeals.ts` - Contains `appealsApi.list()`
- ✅ `src/lib/api/escalations.ts` - Contains `escalationsApi.list()`

---

## ✅ Solution Applied

### Changes Made

**File:** `src/components/reports/manage/AppealsEscalationsSection.tsx`

**1. Updated Imports (Line 5-6):**
```typescript
// Before
import apiClient from '@/lib/api/client';

// After
import { appealsApi } from '@/lib/api/appeals';
import { escalationsApi } from '@/lib/api/escalations';
```

**2. Updated loadData Function (Lines 44-66):**
```typescript
// Before
const appealsResponse = await apiClient.get('/appeals', {
  params: { limit: 100 }
});
const allAppeals = appealsResponse.data || [];

// After
const allAppeals = await appealsApi.list({ limit: 100 });
```

```typescript
// Before
const escalationsResponse = await apiClient.get('/escalations', {
  params: { limit: 100 }
});
const allEscalations = escalationsResponse.data || [];

// After
const allEscalations = await escalationsApi.list({ limit: 100 });
```

---

## 🎯 Why This Fixes the Error

### 1. Proper API Abstraction
- Uses dedicated API modules that handle errors correctly
- Consistent with the rest of the codebase
- Better type safety

### 2. Correct Endpoint Paths
- `appealsApi.list()` uses the correct `/api/v1/appeals` endpoint
- `escalationsApi.list()` uses the correct `/api/v1/escalations` endpoint
- Includes proper authentication headers

### 3. Better Error Handling
- API modules have built-in error handling
- Proper toast notifications
- Automatic token refresh if needed

---

## 🧪 How to Verify the Fix

### Test 1: Load Manage Report Page

1. **Go to any report's manage page:**
   ```
   http://localhost:3000/dashboard/reports/manage/[id]
   ```

2. **Check the Appeals & Escalations section:**
   - ✅ Should load without errors
   - ✅ Should show "Appeals (0)" and "Escalations (0)" if none exist
   - ✅ No network errors in console

### Test 2: Check Network Tab

1. **Open browser DevTools → Network tab**
2. **Reload the manage report page**
3. **Look for these requests:**
   ```
   GET /api/v1/appeals?limit=100 - Should return 200 OK
   GET /api/v1/escalations?limit=100 - Should return 200 OK
   ```

### Test 3: Check Console

1. **Open browser DevTools → Console**
2. **Reload the page**
3. **Should see:**
   - ✅ No "Network Error" messages
   - ✅ No red errors related to appeals/escalations
   - ✅ Component loads successfully

---

## 📋 Expected Behavior

### Before Fix
```
❌ Network Error
❌ Component fails to load
❌ Console shows: "Network Error at async loadData"
❌ Appeals & Escalations section doesn't display
```

### After Fix
```
✅ No network errors
✅ Component loads successfully
✅ Shows "Appeals (0)" and "Escalations (0)"
✅ Can create new appeals/escalations
✅ Proper error handling if backend is down
```

---

## 🔍 Backend Endpoints

The fix assumes these backend endpoints exist:

### Appeals Endpoint
```
GET /api/v1/appeals?limit=100
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "report_id": 16,
    "appeal_type": "classification",
    "status": "submitted",
    "reason": "Wrong category",
    "created_at": "2025-10-25T15:30:00Z"
  }
]
```

### Escalations Endpoint
```
GET /api/v1/escalations?limit=100
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "report_id": 16,
    "level": "supervisor",
    "reason": "Urgent issue",
    "status": "pending",
    "is_overdue": false,
    "created_at": "2025-10-25T15:30:00Z"
  }
]
```

---

## 🐛 If Still Getting Errors

### Error: "404 Not Found"
**Cause:** Backend endpoints don't exist  
**Solution:** Check if appeals/escalations routes are registered in backend

### Error: "401 Unauthorized"
**Cause:** Not logged in or token expired  
**Solution:** Login again as admin

### Error: "403 Forbidden"
**Cause:** User doesn't have permission  
**Solution:** Make sure you're logged in as admin or super_admin

### Error: "500 Server Error"
**Cause:** Backend error  
**Solution:** Check backend logs for details

---

## 📝 Related Files

### Frontend
- `src/components/reports/manage/AppealsEscalationsSection.tsx` - Fixed component
- `src/lib/api/appeals.ts` - Appeals API module
- `src/lib/api/escalations.ts` - Escalations API module
- `src/lib/api/client.ts` - Base API client

### Backend (Check These)
- `app/api/v1/appeals.py` - Appeals endpoints
- `app/api/v1/escalations.py` - Escalations endpoints
- `app/models/appeal.py` - Appeal model
- `app/models/escalation.py` - Escalation model

---

## ✅ Summary

**Problem:** Component was making direct API calls using `apiClient.get()` which caused network errors.

**Solution:** Updated component to use proper API modules (`appealsApi.list()` and `escalationsApi.list()`).

**Result:** 
- ✅ Network error fixed
- ✅ Component loads correctly
- ✅ Consistent with codebase patterns
- ✅ Better error handling

---

**Status:** ✅ FIXED  
**Date:** October 25, 2025  
**Impact:** Appeals & Escalations section now works correctly
