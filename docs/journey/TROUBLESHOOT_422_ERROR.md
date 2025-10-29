# 🔍 Troubleshooting 422 Error

## ⚠️ **CRITICAL: Did you restart the backend?**

The backend code changes **will NOT work** until you restart the backend!

---

## 🚀 **STEP 1: RESTART BACKEND**

```bash
# In the backend terminal:
# Press Ctrl+C to stop

# Then start again:
cd D:\Civiclens\civiclens-backend
uvicorn app.main:app --reload --port 8000
```

**Wait for:**
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## 🔍 **STEP 2: CHECK CONSOLE FOR ACTUAL ERROR**

After restarting backend, try uploading again and check the browser console for:

```
Error detail: {
  "detail": "actual error message here"
}
```

**Look for lines that say:**
- `Error response:`
- `Error detail:`
- `Showing error to user:`

---

## 🐛 **POSSIBLE ERRORS:**

### **Error 1: "Maximum 5 images allowed per report"**
**Cause:** Backend not restarted, still using old code
**Fix:** Restart backend (see Step 1)

### **Error 2: "Cannot submit for verification from status: acknowledged"**
**Cause:** Task status is not IN_PROGRESS
**Fix:** Make sure you did "Start Work" first

### **Error 3: "Not authorized to update this task"**
**Cause:** Officer not assigned to this task
**Fix:** Check task assignment

### **Error 4: "Report not found"**
**Cause:** Invalid report ID
**Fix:** Check the report ID in URL

---

## 📋 **CHECKLIST:**

Before uploading after photos:

- [ ] Backend is running
- [ ] Backend was restarted after code changes
- [ ] You're logged in as officer
- [ ] Task is assigned to you
- [ ] You did "Start Work" (status is IN_PROGRESS)
- [ ] You uploaded before photos
- [ ] Browser console is open (F12)

---

## 🧪 **TEST STEPS:**

1. **Restart Backend**
   ```bash
   Ctrl+C
   uvicorn app.main:app --reload --port 8000
   ```

2. **Open Browser Console**
   - Press F12
   - Go to Console tab

3. **Try Upload**
   - Upload 3 after photos
   - Click "Submit for Verification"

4. **Check Console**
   - Look for "Error detail:" line
   - Copy the exact error message

5. **Share Error**
   - Tell me what the "detail" says

---

## 📊 **BACKEND LOGS:**

Also check the backend terminal for errors:

```
INFO:     127.0.0.1:xxxxx - "POST /api/v1/media/upload/26 HTTP/1.1" 422 Unprocessable Entity
```

**Look for lines after this that show the actual error**

---

## ✅ **WHAT TO DO:**

1. ✅ Restart backend
2. ✅ Open browser console (F12)
3. ✅ Try uploading 3 photos
4. ✅ Copy the exact error from console
5. ✅ Share the error message with me

**The error message will tell us exactly what's wrong!**
