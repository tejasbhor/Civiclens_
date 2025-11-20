# 🔧 Issues to Fix

## Issues Identified:

### 1. ❌ "Invalid Date" in Status History
**Problem:** Date formatting shows "Invalid Date"
**Location:** ReportDetail component
**Cause:** Date parsing issue

### 2. ❌ Department Column Shows "-" Instead of Department Name
**Problem:** Department column in reports table shows "-" even when assigned
**Location:** Reports page table (line 1225)
**Cause:** `r.department?.name` is not being populated from API

### 3. ❌ Status Not Changing After Officer Assignment
**Problem:** Report status doesn't update to "assigned_to_officer" after assignment
**Location:** Backend API
**Cause:** Status transition not happening in backend

### 4. ❌ Missing "Create Report" Button
**Problem:** No button to create new reports
**Location:** Reports page header
**Solution:** Add "Create Report" button

---

## Solutions:

### Fix 1: Add "Create Report" Button
- Add button next to "Export CSV" in header
- Link to create report page or modal

### Fix 2: Fix Department Column Display
- Ensure API includes department relationship
- Check if `department` is being populated in response

### Fix 3: Fix Date Formatting
- Use proper date parsing in ReportDetail
- Handle timezone issues

### Fix 4: Fix Status Not Updating
- Check backend officer assignment endpoint
- Ensure status transitions to "assigned_to_officer"

---

## Priority:
1. **High:** Add Create Report Button
2. **High:** Fix Department Column
3. **Medium:** Fix Date Formatting
4. **Medium:** Fix Status Update
