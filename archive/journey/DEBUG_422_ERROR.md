# Debug 422 Error - Quick Guide

## 🔴 The Problem

You're getting:
```
POST /api/v1/reports/bulk/status HTTP/1.1" 422 Unprocessable Entity
```

And frontend shows: `[object Object]` (now fixed to show actual error)

---

## 🔧 Quick Debug Steps

### Step 1: Add Debug Logging (Temporary)

Add this to `runBulkChangeStatus` function in `page.tsx` (around line 310):

```typescript
// Use bulk endpoint
console.log('=== DEBUG BULK STATUS UPDATE ===');
console.log('Valid IDs:', validIds);
console.log('Bulk Status:', bulkStatus);
console.log('Bulk Status Type:', typeof bulkStatus);
console.log('ReportStatus Enum:', ReportStatus);
console.log('Is valid enum?', Object.values(ReportStatus).includes(bulkStatus as ReportStatus));

const payload = {
  report_ids: validIds,
  new_status: bulkStatus as ReportStatus,
};
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('================================');

const result = await reportsApi.bulkUpdateStatus(payload);
```

### Step 2: Try the Action Again

1. Open browser DevTools → Console
2. Select reports with status "on_hold"
3. Try to change to "in_progress"
4. Check console output

### Step 3: Check Network Tab

1. Open DevTools → Network tab
2. Try the bulk action
3. Find the failed request: `bulk/status`
4. Click on it
5. Check **Payload** tab to see what was sent
6. Check **Response** tab to see the error

---

## 🎯 What to Look For

### In Console

**Good Output:**
```
=== DEBUG BULK STATUS UPDATE ===
Valid IDs: [16, 17, 18]
Bulk Status: in_progress
Bulk Status Type: string
Is valid enum?: true
Payload: {
  "report_ids": [16, 17, 18],
  "new_status": "in_progress"
}
================================
```

**Bad Output (Problem):**
```
Valid IDs: []  ← NO REPORTS!
```
or
```
Bulk Status: undefined  ← NO STATUS SELECTED!
```
or
```
Is valid enum?: false  ← INVALID STATUS VALUE!
```

### In Network Tab

**Request Payload (What frontend sends):**
```json
{
  "report_ids": [16, 17, 18],
  "new_status": "in_progress"
}
```

**Response (What backend returns):**
```json
{
  "detail": [
    {
      "loc": ["body", "new_status"],
      "msg": "value is not a valid enumeration member",
      "type": "type_error.enum"
    }
  ]
}
```

---

## 🔍 Common 422 Causes & Fixes

### Cause 1: Invalid Status Value

**Error:**
```json
{
  "detail": "value is not a valid enumeration member"
}
```

**Fix:** Status value doesn't match backend enum

**Backend expects (from report.py):**
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

**Check:** Make sure `bulkStatus` is one of these exact values (lowercase, underscores)

---

### Cause 2: Empty Report IDs

**Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "report_ids"],
      "msg": "ensure this value has at least 1 items",
      "type": "value_error.list.min_items"
    }
  ]
}
```

**Fix:** No reports selected or all filtered out

**Check:**
```typescript
console.log('Selected IDs:', Array.from(selectedIds));
console.log('All Visible IDs:', Array.from(allVisibleIds));
console.log('Valid IDs:', validIds);
```

---

### Cause 3: Too Many Reports

**Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "report_ids"],
      "msg": "ensure this value has at most 100 items",
      "type": "value_error.list.max_items"
    }
  ]
}
```

**Fix:** Backend limits bulk operations to 100 reports

**Solution:** Select fewer reports or implement pagination for bulk actions

---

### Cause 4: Invalid Report IDs

**Error:**
```json
{
  "detail": "Report not found: 999"
}
```

**Fix:** One or more report IDs don't exist

**Check:**
```typescript
console.log('Report IDs:', validIds);
console.log('Reports in table:', sortedData.map(r => r.id));
```

---

### Cause 5: Status Transition Not Allowed

**Error:**
```json
{
  "detail": "Invalid status transition from 'received' to 'resolved'"
}
```

**Fix:** This is expected! The frontend already filters invalid transitions

**Check:** Look at the `invalidTransitions` array in the code

---

## 🧪 Test Cases

### Test 1: Valid Transition
```
Reports: 3 reports with status "on_hold"
Action: Change to "in_progress"
Expected: ✅ Success
```

### Test 2: Invalid Transition
```
Reports: 3 reports with status "received"
Action: Change to "resolved"
Expected: ⚠️ Skipped (frontend filters these out)
```

### Test 3: Mixed Statuses
```
Reports: 2 "on_hold", 1 "received"
Action: Change to "in_progress"
Expected: ✅ 2 succeed, 1 skipped
```

---

## 📊 Backend Validation Rules

From `BulkStatusUpdateRequest` in `reports.py`:

```python
class BulkStatusUpdateRequest(BaseModel):
    report_ids: list[int] = Field(..., min_length=1, max_length=100)
    new_status: ReportStatus
    notes: str | None = None
```

**Validation:**
1. ✅ `report_ids` must be a list of integers
2. ✅ `report_ids` must have 1-100 items
3. ✅ `new_status` must be valid `ReportStatus` enum value
4. ✅ `notes` is optional

---

## 🎯 Quick Fix Checklist

- [ ] Check console for debug output
- [ ] Verify `validIds` is not empty
- [ ] Verify `bulkStatus` is a valid enum value
- [ ] Check Network tab for actual request/response
- [ ] Check backend logs for validation errors
- [ ] Verify reports actually exist in database
- [ ] Check if status transition is allowed

---

## 💡 Most Likely Cause

Based on the error happening when trying to update "on_hold" reports:

**The status value is probably correct**, but:

1. **Check if reports are actually selected**
   - `validIds` might be empty after filtering

2. **Check if transition is allowed**
   - Frontend might be filtering out all reports

3. **Check backend logs**
   - Backend might have additional validation

---

## 🚀 Next Steps

1. **Add the debug logging** (Step 1 above)
2. **Try the bulk action** and check console
3. **Check Network tab** for request/response
4. **Share the debug output** if still stuck

The debug output will tell us exactly what's being sent and why it's failing!

---

**TIP:** After debugging, remove the console.log statements to keep the code clean.
