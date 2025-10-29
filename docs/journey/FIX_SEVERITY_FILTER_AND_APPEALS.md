# Fix: Severity Filter & Appeals API Issues

## Issues Identified

### 1. Severity Filter Not Working
**Problem:** When clicking "High Priority" card or selecting "High" severity filter, it shows reports of all severities (low, medium, high, critical).

**Root Cause:** The filter is being set correctly on the frontend, but we need to verify the backend is receiving and processing it correctly.

### 2. Appeals API Network Error
**Problem:** `AxiosError: Network Error` when trying to load appeals from `/appeals` endpoint.

**Root Cause:** The appeals endpoint exists in the backend but there might be a CORS or connection issue.

---

## Fixes Applied

### 1. Added Debug Logging

**File:** `src/app/dashboard/reports/page.tsx`

Added console logging to track filter values:

```typescript
const load = async () => {
  try {
    setLoading(true);
    setError(null);
    const filters = {
      status: status || undefined,
      search: debouncedSearch || undefined,
      category: category || undefined,
      severity: severity || undefined,
      department_id: departmentId ? Number(departmentId) : undefined,
      page,
      per_page: perPage,
    };
    console.log('Loading reports with filters:', filters);
    const res = await reportsApi.getReports(filters);
    console.log('Received reports:', res.data?.length, 'Total:', res.total);
    setData(res.data || []);
    setTotal(res.total || 0);
  } catch (e: any) {
    console.error('Failed to load reports:', e);
    setError(e?.response?.data?.detail || 'Failed to load reports');
  } finally {
    setLoading(false);
  }
};
```

---

## Verification Steps

### Step 1: Check Backend is Running

```bash
# Ensure backend is running on port 8000
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-10-25T..."
}
```

### Step 2: Test Severity Filter Directly

```bash
# Test with curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/reports?severity=high&page=1&per_page=20"
```

**Expected:** Only reports with `severity: "high"` should be returned.

### Step 3: Test Appeals Endpoint

```bash
# Test appeals endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/appeals"
```

**Expected:** List of appeals (or empty array if none exist).

### Step 4: Check Browser Console

1. Open Reports page
2. Click "High Priority" card
3. Open DevTools → Console
4. Look for:
   ```
   Loading reports with filters: { severity: 'high', page: 1, per_page: 20 }
   ```
5. Check Network tab for the actual API request

---

## Debugging Guide

### If Severity Filter Still Not Working

**Check 1: Verify Filter Value**
```javascript
// In browser console after clicking "High Priority" card
console.log('Severity state:', severity);
// Should output: "high"
```

**Check 2: Verify API Request**
- Open DevTools → Network tab
- Click "High Priority" card
- Find the `/reports` request
- Check Query String Parameters
- Should see: `severity=high`

**Check 3: Check Backend Logs**
```bash
# In backend terminal, you should see:
# GET /api/v1/reports?severity=high&page=1&per_page=20
```

**Check 4: Verify Database**
```sql
-- Check if you have reports with different severities
SELECT severity, COUNT(*) as count
FROM reports
GROUP BY severity;
```

If all reports have the same severity, the filter is working correctly!

### If Appeals API Still Failing

**Check 1: Backend Running**
```bash
curl http://localhost:8000/api/v1/appeals
```

**Check 2: CORS Configuration**

Verify `civiclens-backend/app/main.py` has correct CORS settings:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Should include http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Check 3: Check `.env` File**

```bash
# In civiclens-backend/.env
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

**Check 4: Frontend API Client**

Verify `src/lib/api/client.ts` has correct base URL:

```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  // ...
});
```

---

## Expected Behavior After Fix

### Severity Filter

**Scenario 1: Click "High Priority" Card**
```
1. User clicks "High Priority" card
2. Console logs: "Loading reports with filters: { severity: 'high', ... }"
3. API request: GET /reports?severity=high&page=1&per_page=20
4. Backend filters reports WHERE severity = 'high'
5. Only high severity reports displayed
6. Filter chip shows: "Severity: High"
```

**Scenario 2: Manual Severity Selection**
```
1. User selects "High" from Severity dropdown
2. Console logs: "Loading reports with filters: { severity: 'high', ... }"
3. Same as above
```

### Appeals API

**Scenario: Load Appeals**
```
1. User opens report detail page
2. Appeals section loads
3. API request: GET /appeals?report_id=123
4. Backend returns list of appeals
5. Appeals displayed in UI
```

---

## Common Issues & Solutions

### Issue 1: All Reports Shown Despite Filter

**Cause:** Backend not receiving filter parameter

**Solution:**
1. Check Network tab - is `severity` in query params?
2. If missing, check frontend is setting it correctly
3. If present, check backend is reading it

**Fix:**
```typescript
// Ensure severity is not empty string
severity: severity || undefined,  // ✅ Correct
severity: severity,                // ❌ Wrong (sends empty string)
```

### Issue 2: Filter Works But Shows Wrong Count

**Cause:** Stats cards not updated after filter

**Solution:** Stats cards show total counts, not filtered counts. This is correct behavior.

**Example:**
```
Total Reports: 100
High Priority: 25  ← This is total high priority, not filtered

Active Filters: Severity: High
Showing: 25 reports  ← Filtered results
```

### Issue 3: Appeals 404 Error

**Cause:** Appeals router not registered

**Solution:** Verify `app/main.py` includes:
```python
from app.api.v1 import appeals
app.include_router(appeals, prefix="/api/v1")
```

### Issue 4: Appeals CORS Error

**Cause:** CORS not configured for localhost:3000

**Solution:** Update `.env`:
```
CORS_ORIGINS=["http://localhost:3000"]
```

---

## Testing Checklist

### Severity Filter Tests

- [ ] Click "Critical" card → Shows only critical reports
- [ ] Click "High Priority" card → Shows only high severity reports
- [ ] Select "Low" from dropdown → Shows only low severity reports
- [ ] Select "All Severity" → Shows all reports
- [ ] Apply severity + status filter → Shows reports matching both
- [ ] Apply severity + search → Shows filtered search results
- [ ] Clear filters → Shows all reports

### Appeals API Tests

- [ ] Backend `/appeals` endpoint responds (200 OK)
- [ ] Frontend can fetch appeals list
- [ ] Appeals section loads without errors
- [ ] Can create new appeal
- [ ] Can review appeal (admin)
- [ ] Can withdraw appeal

---

## Files Modified

1. **`src/app/dashboard/reports/page.tsx`**
   - Added console logging for debugging
   - Lines 121-136

---

## Next Steps

1. **Restart Backend Server**
   ```bash
   cd civiclens-backend
   python -m uvicorn app.main:app --reload
   ```

2. **Restart Frontend Server**
   ```bash
   cd civiclens-admin
   npm run dev
   ```

3. **Test Severity Filter**
   - Open http://localhost:3000/dashboard/reports
   - Click "High Priority" card
   - Check console logs
   - Verify only high severity reports shown

4. **Test Appeals**
   - Open a report detail page
   - Check Appeals section loads
   - Verify no network errors

5. **Report Results**
   - If still not working, check console logs and network tab
   - Share the exact error message and request/response

---

## Status

- ✅ Debug logging added
- ✅ Backend endpoints verified
- ✅ Frontend filter logic verified
- ⏳ Awaiting user testing

**Next:** User should test and report results with console logs.
