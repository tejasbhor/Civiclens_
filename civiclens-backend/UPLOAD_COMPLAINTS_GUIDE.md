# 📤 Upload Test Complaints Guide

## Overview
This script uploads test complaints from `test_ai_complaints.json` to your CivicLens backend with real images.

---

## ✅ Prerequisites

### 1. Backend Running
```powershell
# Make sure backend is running on http://localhost:8000
cd D:\Civiclens
.\START-ALL.ps1
# Or start backend only:
cd civiclens-backend
uv run uvicorn app.main:app --reload --host 0.0.0.0
```

### 2. Images Ready
Your images should be in:
```
test_images/
├── roads/
│   ├── 01_pothole_closeup.jpg
│   ├── 01_pothole_wide_angle.jpg
│   ├── 01_damaged_vehicle_tire.jpg
│   └── ... (more road images)
├── water/
├── sanitation/
├── streetlight/
├── drainage/
├── public_property/
├── electricity/
└── other/
```

**Currently you have**: Roads images only ✅

---

## 🚀 How to Run

### Step 1: Install Dependencies
```powershell
cd D:\Civiclens\civiclens-backend

# Install httpx (async HTTP client)
uv pip install httpx
```

### Step 2: Run Upload Script
```powershell
# Make sure you're in civiclens-backend directory
cd D:\Civiclens\civiclens-backend

# Run the script
uv run python upload_test_complaints.py
```

---

## 📋 What the Script Does

### 1. **Creates/Logs in Citizen User**
- **Name**: Mohan Vishwas
- **Phone**: +919021932646
- **Email**: mohan@gmail.com
- **Password**: MohanVishwas@9021

### 2. **Reads test_ai_complaints.json**
- Loads all 35 test complaints

### 3. **Checks for Images**
- For each complaint, checks if images exist in `test_images/{category}/`
- Looks for files like: `01_*.jpg`, `02_*.jpg`, etc.

### 4. **Uploads Reports with Images**
- **WITH images** → ✅ Creates report + uploads images
- **WITHOUT images** → ⏭️ Skips (will upload later when images ready)

### 5. **Shows Summary**
- ✅ Uploaded count
- ⏭️ Skipped count (no images)
- ❌ Failed count

---

## 📊 Expected Output

```
============================================================================
🚀 CIVICLENS TEST COMPLAINTS UPLOADER
============================================================================
Citizen: Mohan Vishwas
Phone: +919021932646
Email: mohan@gmail.com
============================================================================

============================================================================
STEP 1: User Authentication
============================================================================

🔐 Attempting login for: +919021932646
✅ Login successful! User ID: 5

============================================================================
STEP 2: Loading Test Complaints
============================================================================
✅ Loaded 35 complaints from JSON
✅ Images directory found: D:\Civiclens\civiclens-backend\test_images

============================================================================
STEP 3: Uploading Reports with Images
============================================================================

[1/35] Processing: Big pothole on Palm Beach Road near Vashi Railway...
   📸 Found 3 image(s)
   ✅ Report created: CL-2025-NMC-00001 (ID: 1)
   📤 Uploading 3 image(s)...
      [1/3] ✅ 01_pothole_closeup.jpg
      [2/3] ✅ 01_pothole_wide_angle.jpg
      [3/3] ✅ 01_damaged_vehicle_tire.jpg
   📊 Uploaded 3/3 images successfully

[2/35] Processing: Water pipeline burst on Belapur Station Road...
   ⏭️  Skipped - No images found in test_images/water/

... (continues for all 35 complaints)

============================================================================
📊 UPLOAD SUMMARY
============================================================================
✅ Uploaded:  6 reports
⏭️  Skipped:   29 reports (no images)
❌ Failed:    0 reports
📝 Total:     35 complaints
============================================================================

🎉 Success! Check your reports at:
   http://localhost:8080/citizen/reports

   Login with:
   Phone: +919021932646
   Password: MohanVishwas@9021
```

---

## 🎯 Current Status

Based on your setup:
- ✅ **Roads images ready** (complaints #1, #8, #14, #21, #28, #33)
- ⏳ **Other categories**: Will be skipped until images are added

The script will upload **~6 road complaints** right now and skip the rest.

---

## 🔄 Re-running the Script

**Can you run it multiple times?**
- ✅ Yes! The script will login (not re-create user)
- ⚠️ It will create **duplicate reports** each time
- 💡 Best for testing: Delete old reports via admin dashboard first

---

## 🐛 Troubleshooting

### Error: "Connection refused"
**Problem**: Backend not running
**Solution**:
```powershell
cd D:\Civiclens
.\START-ALL.ps1
# Wait for backend to start (~30 seconds)
```

### Error: "Login failed"
**Problem**: User doesn't exist yet
**Solution**: Script will auto-create user on first run

### Error: "No images found"
**Problem**: Images not in correct folder or wrong naming
**Solution**: Check image names match pattern `{id:02d}_*.jpg`
Example: `01_pothole_closeup.jpg` (not `1_pothole.jpg`)

### Error: "Failed to upload image"
**Problem**: Image file corrupted or MinIO not running
**Solution**:
```powershell
# Check MinIO is running
docker ps | findstr minio

# If not, start it
cd D:\docker
docker compose up -d
```

---

## 📸 Adding More Images Later

When you add more images:

1. **Download images** for other categories
2. **Name and organize** them correctly
3. **Run script again**:
   ```powershell
   uv run python upload_test_complaints.py
   ```
4. Script will **skip already uploaded** complaints and upload new ones

---

## 🎉 After Upload

### View Reports:
1. Open: http://localhost:8080
2. Login as Mohan Vishwas:
   - Phone: `+919021932646`
   - Password: `MohanVishwas@9021`
3. Go to "My Reports" to see uploaded complaints

### View in Admin Dashboard:
1. Open: http://localhost:3001
2. Login as Super Admin:
   - Phone: `+919999999999`
   - Password: `Admin123!`
3. See all reports, assign to departments

---

## 📝 Next Steps

1. ✅ Run upload script with roads images
2. ⏳ Download more images for other categories
3. ⏳ Re-run script to upload remaining complaints
4. ⏳ Test AI engine with real data
5. ⏳ Demonstrate complete workflow!

---

**Ready to upload? Run the script now!** 🚀

```powershell
cd D:\Civiclens\civiclens-backend
uv run python upload_test_complaints.py
```
