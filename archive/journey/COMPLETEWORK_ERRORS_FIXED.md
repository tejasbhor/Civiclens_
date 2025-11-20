# ✅ CompleteWork Errors Fixed!

## 🐛 **ERRORS FOUND:**

### **Error 1: Cannot read properties of undefined (reading 'filter')**
```
Line 79: mediaResponse.data.media.filter(...)
TypeError: Cannot read properties of undefined (reading 'filter')
```

**Root Cause:**
- Code expected: `mediaResponse.data.media` (nested object)
- API returns: `mediaResponse.data` (array directly)

**Fix:**
```typescript
// BEFORE (Wrong):
const before = mediaResponse.data.media.filter(...)

// AFTER (Correct):
const mediaList = Array.isArray(mediaResponse.data) ? mediaResponse.data : [];
const before = mediaList.filter(...)
```

---

### **Error 2: 422 Unprocessable Entity**
```
POST /api/v1/reports/26/submit-for-verification
422 (Unprocessable Entity)
```

**Possible Causes:**
1. Report status is not IN_PROGRESS
2. Officer not assigned to this task
3. Validation error in backend

**Fix Applied:**
- Added better error logging to see actual error message
- Will show detailed error in toast

---

## ✅ **FIXES APPLIED:**

### **1. Media Response Structure Fix**
```typescript
// Load media
const mediaResponse = await axios.get(
  `${import.meta.env.VITE_API_URL}/media/report/${id}`,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`
    }
  }
);

// Filter before photos - API returns array directly
const mediaList = Array.isArray(mediaResponse.data) ? mediaResponse.data : [];
const before = mediaList.filter(
  (m: any) => m.upload_source === 'officer_before_photo'
);
setBeforePhotos(before);
```

**Why:**
- Backend endpoint `/media/report/{id}` returns `List[MediaResponse]`
- Not wrapped in `{ media: [...] }`
- Returns array directly

---

### **2. Better Error Logging**
```typescript
catch (error: any) {
  console.error('Failed to complete work:', error);
  console.error('Error response:', error.response?.data);  // ← New!
  toast({
    title: "Error",
    description: error.response?.data?.detail || 
                 error.response?.data?.message ||  // ← New!
                 "Failed to submit work",
    variant: "destructive"
  });
}
```

**Why:**
- Shows actual backend error message
- Helps debug 422 errors
- Better user feedback

---

## 🔍 **DEBUGGING 422 ERROR:**

### **Check Backend Requirements:**

**Endpoint:** `POST /reports/{id}/submit-for-verification`

**Requirements:**
1. ✅ Report must exist
2. ✅ Officer must be assigned to task
3. ✅ Report status must be IN_PROGRESS
4. ✅ resolution_notes (optional Form parameter)

**Validation:**
```python
# Backend checks:
if report.status != ReportStatus.IN_PROGRESS:
    raise ValidationException(
        f"Cannot submit for verification from status: {report.status}"
    )
```

---

## 🧪 **TESTING STEPS:**

### **Test the Fix:**
```
1. Login as officer
2. Go to task details
3. Verify task status is IN_PROGRESS
4. Click "Submit for Verification"
5. Check console for error details
6. Verify:
   - Before photos load ✅
   - No filter error ✅
   - See actual 422 error message
```

### **If 422 Still Occurs:**

**Check Console for:**
```javascript
Error response: {
  detail: "Cannot submit for verification from status: acknowledged"
  // or
  detail: "Not authorized to update this task"
  // or
  detail: [validation error details]
}
```

**Common Issues:**
1. **Status not IN_PROGRESS**: Need to start work first
2. **Not assigned**: Officer not assigned to this task
3. **Missing photos**: Need at least 1 after photo

---

## 📊 **CORRECT WORKFLOW:**

```
1. Task Status: ASSIGNED_TO_OFFICER
   ↓
2. Officer clicks "Acknowledge"
   → Status: ACKNOWLEDGED
   ↓
3. Officer clicks "Start Work"
   → Upload before photos
   → Status: IN_PROGRESS ← Required for submit!
   ↓
4. Officer clicks "Submit for Verification"
   → Navigate to CompleteWork page
   → Upload after photos
   → Submit
   → Status: PENDING_VERIFICATION
```

---

## ✅ **SUMMARY:**

**Fixes Applied:**
1. ✅ Fixed media response structure (array vs object)
2. ✅ Added safety check with Array.isArray()
3. ✅ Added better error logging
4. ✅ Shows detailed error messages

**Next Steps:**
1. Test the page again
2. Check console for actual 422 error message
3. Verify task is in IN_PROGRESS status
4. Ensure officer started work first

**The filter error is fixed! The 422 error will now show the actual reason.** 🎉
