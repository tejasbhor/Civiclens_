# 🔧 Fix AI Worker Issues

## Issues Found

1. ❌ **Unicode Encoding Error** - Emojis can't be displayed in Windows console (cp1252)
2. ❌ **Missing AI System User** - AI engine needs a dedicated admin user for operations

---

## ✅ Solutions Applied

### **1. Fixed Unicode Encoding (ALREADY FIXED)**

The `ai_worker.py` has been updated to use UTF-8 encoding for console output.

**What was changed:**
- Console and file handlers now explicitly use UTF-8 encoding
- Supports emojis (✅, 🤖, 📊, etc.) on Windows

**No action needed** - this is already fixed in the code.

---

### **2. Create AI System User (ACTION REQUIRED)**

The AI engine needs a dedicated system user to perform automated operations.

**Run this command:**

```powershell
cd D:\Civiclens\civiclens-backend
python -m app.db.seeds.create_ai_system_user
```

**What this does:**
- Creates a system admin user called "AI Engine"
- Email: `ai-system@civiclens.local`
- Role: Super Admin
- Used for automated report classification and assignment

---

## 🚀 How to Restart AI Worker

After creating the AI system user, restart the AI worker:

### **Option 1: Restart Everything (Recommended)**

```powershell
# From D:\Civiclens
.\START-ALL.ps1
```

### **Option 2: Restart Only AI Worker**

1. Press `Ctrl+C` in the AI worker terminal
2. Wait for graceful shutdown message
3. Run again:
   ```powershell
   cd D:\Civiclens\civiclens-backend
   python -m app.workers.ai_worker
   ```

---

## 📊 Expected Output After Fixes

### **Before (With Errors):**
```
--- Logging error ---
UnicodeEncodeError: 'charmap' codec can't encode character '\u2705'
...
2025-11-21 09:34:46 | ERROR    | AI-ENGINE | No active admin user found
```

### **After (Fixed):**
```
2025-11-21 09:50:00 | INFO     | AI-ENGINE | ✅ Sentence transformer loaded successfully
2025-11-21 09:50:10 | INFO     | AI-ENGINE | ✅ Classification model loaded successfully
2025-11-21 09:50:15 | INFO     | AI-ENGINE | 🤖 AI Pipeline: Processing report 1
2025-11-21 09:50:20 | INFO     | AI-ENGINE | ✅ Pipeline completed for report 1 (5.2s)
2025-11-21 09:50:20 | INFO     | AI-ENGINE | ✅ Auto-assigned to Public Works Department
```

---

## 🎯 Step-by-Step Instructions

### **Step 1: Create AI System User**

```powershell
cd D:\Civiclens\civiclens-backend
python -m app.db.seeds.create_ai_system_user
```

**Expected output:**
```
Creating AI System User...
✓ AI System User created successfully
  Email: ai-system@civiclens.local
  Role: Super Admin
  Status: Active
```

---

### **Step 2: Restart Services**

**Easiest way - restart all:**
```powershell
cd D:\Civiclens
.\START-ALL.ps1
```

Or manually restart just the AI worker in its terminal.

---

### **Step 3: Verify Everything Works**

Watch the AI worker logs - you should see:

✅ **No more Unicode errors**
✅ **Emojis display correctly** (✅, 🤖, 📊, etc.)
✅ **Reports get auto-assigned** to departments
✅ **No "AI Engine user not found" errors**

---

## 🐛 Troubleshooting

### **Issue: "Module not found: app.db.seeds.create_ai_system_user"**

**Solution:** Make sure you're in the backend directory:
```powershell
cd D:\Civiclens\civiclens-backend
python -m app.db.seeds.create_ai_system_user
```

---

### **Issue: Still seeing Unicode errors**

**Solution:** Restart the AI worker terminal completely:
1. Close the terminal window
2. Open a new PowerShell terminal
3. Run START-ALL.ps1 again

---

### **Issue: "AI System User already exists"**

**This is fine!** The script detects existing user and updates it.

---

### **Issue: Reports not getting auto-assigned**

**Check:**
1. ✓ AI system user is created (run seed script)
2. ✓ Departments exist in database (should be seeded already)
3. ✓ AI worker is running (check START-ALL.ps1 output)
4. ✓ Reports are being created and queued

---

## 📝 What Happens Now?

After these fixes:

1. **Upload complaints** using your script
2. **AI worker automatically processes them:**
   - Classifies category (roads, water, etc.)
   - Determines severity (low, medium, high)
   - Routes to department (Public Works, Water Supply, etc.)
   - Auto-assigns if confidence is high
3. **View results** in admin dashboard

---

## 🎉 Summary

- ✅ **Unicode encoding fixed** - emojis now work on Windows
- 🔄 **Need to create AI system user** - run seed script
- 🔄 **Need to restart AI worker** - use START-ALL.ps1

**Run this now:**
```powershell
cd D:\Civiclens\civiclens-backend
python -m app.db.seeds.create_ai_system_user
```

Then restart everything!
