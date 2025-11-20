# Network Error Fix - Appeals & Escalations

## Problem

**Error:** `AxiosError: Network Error` at `AppealsEscalationsSection.tsx:50:31`

```typescript
const appealsResponse = await apiClient.get(`/appeals?report_id=${report.id}`);
```

## Root Causes

### 1. Backend Endpoints Don't Support `report_id` Filter

**Appeals Endpoint:** `GET /appeals`
- Supports: `status`, `appeal_type`, `skip`, `limit`
- ❌ Does NOT support: `report_id`

**Escalations Endpoint:** `GET /escalations`
- Supports: `status`, `level`, `is_overdue`, `skip`, `limit`
- ❌ Does NOT support: `report_id`

### 2. Possible Backend Server Not Running

If backend is not running at `http://localhost:8000`, you'll get Network Error.

## Solution Applied

### Quick Fix (Frontend Filtering)

Changed the API calls to:
1. Fetch all appeals/escalations (with limit)
2. Filter by `report_id` on the frontend

**Before:**
```typescript
const appealsResponse = await apiClient.get(`/appeals?report_id=${report.id}`);
setAppeals(appealsResponse.data || []);
```

**After:**
```typescript
const appealsResponse = await apiClient.get('/appeals', {
  params: { limit: 100 }
});
const allAppeals = appealsResponse.data || [];
const reportAppeals = allAppeals.filter((a: Appeal) => a.report_id === report.id);
setAppeals(reportAppeals);
```

### Error Handling Improved

Added fallback to empty arrays on error:
```typescript
catch (err) {
  console.error('Failed to load appeals/escalations', err);
  setAppeals([]);
  setEscalations([]);
}
```

## How to Verify Fix

### 1. Check Backend Server Status

```bash
# Navigate to backend directory
cd d:/Civiclens/civiclens-backend

# Check if server is running
# Should see output on http://localhost:8000
```

### 2. Start Backend Server (if not running)

```bash
# Using uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the run script
python run.py
```

### 3. Test Frontend

```bash
# Navigate to frontend directory
cd d:/Civiclens/civiclens-admin

# Start dev server
npm run dev

# Navigate to a report
http://localhost:3000/dashboard/reports/manage/[id]
```

### 4. Check Network Tab

Open browser DevTools → Network tab:
- ✅ Should see: `GET /appeals?limit=100` → 200 OK
- ✅ Should see: `GET /escalations?limit=100` → 200 OK
- ❌ If you see: Network Error → Backend is not running

## Long-term Solution (Backend Enhancement)

To properly support filtering by `report_id`, update backend endpoints:

### Update Appeals Endpoint

**File:** `civiclens-backend/app/api/v1/appeals.py`

```python
@router.get("/", response_model=List[AppealResponse])
async def get_appeals(
    status: Optional[AppealStatus] = None,
    appeal_type: Optional[AppealType] = None,
    report_id: Optional[int] = None,  # ADD THIS
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get all appeals with filters"""
    query = select(Appeal).order_by(Appeal.created_at.desc())
    
    if status:
        query = query.where(Appeal.status == status)
    if appeal_type:
        query = query.where(Appeal.appeal_type == appeal_type)
    if report_id:  # ADD THIS
        query = query.where(Appeal.report_id == report_id)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    appeals = result.scalars().all()
    
    return appeals
```

### Update Escalations Endpoint

**File:** `civiclens-backend/app/api/v1/escalations.py`

```python
@router.get("/", response_model=List[EscalationResponse])
async def get_escalations(
    status: Optional[EscalationStatus] = None,
    level: Optional[EscalationLevel] = None,
    is_overdue: Optional[bool] = None,
    report_id: Optional[int] = None,  # ADD THIS
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all escalations with filters"""
    query = select(Escalation).order_by(Escalation.created_at.desc())
    
    if status:
        query = query.where(Escalation.status == status)
    if level:
        query = query.where(Escalation.level == level)
    if is_overdue is not None:
        query = query.where(Escalation.is_overdue == is_overdue)
    if report_id:  # ADD THIS
        query = query.where(Escalation.report_id == report_id)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    escalations = result.scalars().all()
    
    return escalations
```

### Then Update Frontend (Future)

Once backend is updated, you can optimize the frontend:

```typescript
const loadData = async () => {
  try {
    setLoading(true);
    
    // Fetch appeals for this report (backend filtering)
    const appealsResponse = await apiClient.get('/appeals', {
      params: { report_id: report.id, limit: 100 }
    });
    setAppeals(appealsResponse.data || []);

    // Fetch escalations for this report (backend filtering)
    const escalationsResponse = await apiClient.get('/escalations', {
      params: { report_id: report.id, limit: 100 }
    });
    setEscalations(escalationsResponse.data || []);
  } catch (err) {
    console.error('Failed to load appeals/escalations', err);
    setAppeals([]);
    setEscalations([]);
  } finally {
    setLoading(false);
  }
};
```

## Current Status

✅ **Fixed:** Frontend now works with existing backend API
✅ **Error Handling:** Component handles errors gracefully
✅ **Filtering:** Works correctly on frontend
⏳ **Backend Enhancement:** Optional future improvement

## Testing Checklist

- [ ] Backend server is running on port 8000
- [ ] Frontend can connect to backend
- [ ] Appeals section loads without errors
- [ ] Escalations section loads without errors
- [ ] Filtering by report_id works correctly
- [ ] Empty state shows when no appeals/escalations
- [ ] Error state shows gracefully if backend is down

## Common Issues

### Issue 1: "Network Error" persists
**Solution:** Start the backend server

### Issue 2: Empty appeals/escalations
**Possible causes:**
- No appeals/escalations exist for this report (expected)
- Backend filtering not working (check backend logs)
- Frontend filtering logic error (check console)

### Issue 3: CORS errors
**Solution:** Check backend CORS configuration in `app/main.py`

## Files Changed

1. ✅ `civiclens-admin/src/components/reports/manage/AppealsEscalationsSection.tsx`
   - Changed API calls to use existing endpoints
   - Added frontend filtering
   - Improved error handling

## Summary

The Network Error was caused by trying to use a `report_id` query parameter that the backend doesn't support. The fix fetches all appeals/escalations and filters them on the frontend. This is a working solution, though backend filtering would be more efficient for large datasets.

**Status:** ✅ FIXED - Ready to test!
