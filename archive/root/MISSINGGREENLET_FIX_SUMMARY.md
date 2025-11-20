# MissingGreenlet Error Fix - Complete Report Submission

## Problem
`sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here`

### Root Cause
When accessing `current_user.id` or `current_user.email` **after database operations** (commits/rollbacks), the SQLAlchemy ORM object becomes **detached from the async session**. Attempting to access attributes on a detached object in an async context triggers SQLAlchemy to try lazy-loading, which fails because the async greenlet context is no longer available.

### Error Locations
The error occurred at multiple points in `/api/v1/reports/submit-complete`:
- Line 385: `user_id=current_user.id` in `upload_multiple_files()` call (after db operations)
- Line 441: `current_user.id` in background task
- Lines 516, 543: `current_user.id` in audit log metadata (error handlers)

## Solution

### Critical Fix Pattern
**Always extract ORM object attributes BEFORE any database operations that might detach the object.**

### Changes Made

#### 1. Extract User Attributes at Function Start
```python
@router.post("/submit-complete")
async def submit_complete_report(...):
    start_time = time.time()
    
    # CRITICAL: Extract user attributes BEFORE any database operations
    # to prevent SQLAlchemy detachment issues (MissingGreenlet error)
    user_id = current_user.id
    user_email = current_user.email
    
    # Now use user_id and user_email throughout the function
```

#### 2. Updated Validation Function Signature
```python
async def _validate_complete_submission(
    db: AsyncSession,
    user_id: int,  # Added parameter
    title: str,
    # ... other params
    current_user: User
) -> None:
```

#### 3. Replaced All current_user.id References
- Line 138-140: Rate limiting check
- Line 246-247: Audit log metadata
- Line 340: Report creation
- Line 390: Media upload service
- Line 442: Background task
- Line 517: Error audit log
- Line 543: Error audit log

## Files Modified
- `D:/Civiclens/civiclens-backend/app/api/v1/reports_complete.py`

## Testing
After applying this fix:
1. Restart the backend server
2. Submit a report from the mobile app with media files
3. Verify no `MissingGreenlet` errors in logs
4. Confirm report creation and media upload succeed
5. Check audit logs are properly recorded

## Key Takeaway
**SQLAlchemy Async Pattern:** Always extract needed attributes from ORM objects at the beginning of async request handlers, before any database operations that might commit or rollback the session.

## Prevention
For future development:
1. Extract all needed ORM attributes at the start of async functions
2. Never access ORM object attributes after `db.commit()` or `db.rollback()`
3. Pass primitive values (int, str) instead of ORM objects to nested functions
4. Be especially careful in error handlers where rollback occurs
