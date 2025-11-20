# 📦 MinIO Setup & Configuration Fix

## 🎯 **ISSUE RESOLVED**

**Problem:** MinIO connection failed with "path in endpoint is not allowed" error.

**Root Cause:** Incorrect endpoint configuration in `.env` file - included protocol in endpoint URL.

---

## ✅ **CONFIGURATION FIX**

### **Before (Broken):**
```env
MINIO_ENDPOINT=http://localhost:9000  # ❌ WRONG - includes protocol
```

### **After (Fixed):**
```env
MINIO_ENDPOINT=localhost:9000  # ✅ CORRECT - hostname:port only
```

**Why this matters:** MinIO client expects just the hostname and port, not a full URL. The protocol is determined by the `MINIO_USE_SSL` setting.

---

## 🚀 **COMPLETE MINIO SETUP**

### **Step 1: Install MinIO Server**

#### **Option A: Using Docker (Recommended)**
```bash
# Pull MinIO image
docker pull minio/minio

# Run MinIO server
docker run -d \
  --name minio-server \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=tejasadmin" \
  -e "MINIO_ROOT_PASSWORD=StrongPass123!" \
  -v minio-data:/data \
  minio/minio server /data --console-address ":9001"
```

#### **Option B: Direct Installation (Windows)**
```bash
# Download MinIO executable
curl https://dl.min.io/server/minio/release/windows-amd64/minio.exe -o minio.exe

# Set environment variables
set MINIO_ROOT_USER=tejasadmin
set MINIO_ROOT_PASSWORD=StrongPass123!

# Start MinIO server
minio.exe server C:\minio-data --console-address ":9001"
```

### **Step 2: Verify MinIO is Running**

#### **Check Services:**
- **API Server**: http://localhost:9000
- **Web Console**: http://localhost:9001

#### **Login to Web Console:**
- **Username**: `tejasadmin`
- **Password**: `StrongPass123!`

### **Step 3: Create Bucket (Optional)**
```bash
# Using MinIO Client (mc)
mc alias set local http://localhost:9000 tejasadmin StrongPass123!
mc mb local/civiclens-media
```

---

## 🔧 **BACKEND CONFIGURATION**

### **Updated .env Configuration:**
```env
# MinIO Configuration
MINIO_ENDPOINT=localhost:9000          # ✅ Fixed - no protocol
MINIO_ACCESS_KEY=tejasadmin           # Must match MINIO_ROOT_USER
MINIO_SECRET_KEY=StrongPass123!       # Must match MINIO_ROOT_PASSWORD
MINIO_BUCKET=civiclens-media          # Bucket name for file storage
MINIO_USE_SSL=false                   # Set to true for HTTPS
```

### **How MinIO Client Works:**
```python
# The MinIO client constructs URLs like this:
if MINIO_USE_SSL:
    url = f"https://{MINIO_ENDPOINT}"  # https://localhost:9000
else:
    url = f"http://{MINIO_ENDPOINT}"   # http://localhost:9000
```

---

## 🔍 **TROUBLESHOOTING**

### **Common Issues & Solutions:**

#### **1. "Connection refused" Error**
```bash
# Check if MinIO is running
curl http://localhost:9000/minio/health/live

# If not running, start MinIO server
docker start minio-server
# OR
minio.exe server C:\minio-data
```

#### **2. "Access Denied" Error**
```bash
# Verify credentials match
MINIO_ROOT_USER=tejasadmin
MINIO_ROOT_PASSWORD=StrongPass123!

# Check .env file
MINIO_ACCESS_KEY=tejasadmin
MINIO_SECRET_KEY=StrongPass123!
```

#### **3. "Bucket not found" Error**
```bash
# Create bucket manually
mc mb local/civiclens-media

# Or let the backend create it automatically
# (Backend will create bucket on startup)
```

#### **4. "SSL/TLS" Errors**
```env
# For local development, use HTTP
MINIO_USE_SSL=false

# For production, use HTTPS
MINIO_USE_SSL=true
MINIO_ENDPOINT=your-minio-domain.com:9000
```

---

## 🧪 **TESTING MINIO CONNECTION**

### **Test Script:**
```python
# test_minio.py
from minio import Minio

try:
    client = Minio(
        "localhost:9000",
        access_key="tejasadmin",
        secret_key="StrongPass123!",
        secure=False
    )
    
    # Test connection
    buckets = client.list_buckets()
    print("✅ MinIO connection successful!")
    print(f"Buckets: {[b.name for b in buckets]}")
    
    # Test bucket creation
    bucket_name = "civiclens-media"
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
        print(f"✅ Created bucket: {bucket_name}")
    else:
        print(f"✅ Bucket exists: {bucket_name}")
        
except Exception as e:
    print(f"❌ MinIO connection failed: {e}")
```

### **Run Test:**
```bash
cd civiclens-backend
python test_minio.py
```

---

## 🚀 **START BACKEND WITH MINIO**

### **1. Ensure MinIO is Running:**
```bash
# Check MinIO status
curl http://localhost:9000/minio/health/live

# Expected response: 200 OK
```

### **2. Start Backend:**
```bash
cd civiclens-backend
uvicorn app.main:app --reload --host 0.0.0.0
```

### **3. Expected Startup Logs:**
```
📦 Checking MinIO connection...
✅ MinIO - Connected (bucket 'civiclens-media' exists)

============================================================
Service Status Summary:
============================================================
PostgreSQL: ✅ Ready
Redis:      ✅ Ready
MinIO:      ✅ Ready
============================================================
```

---

## 📱 **FILE UPLOAD TESTING**

### **Test File Upload:**
```bash
# Test endpoint
curl -X POST "http://localhost:8000/api/v1/media/upload/1/bulk" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-image.jpg"

# Expected response:
{
  "files": [
    {
      "id": 1,
      "file_url": "http://localhost:9000/civiclens-media/reports/1/1_20251112_143000_uuid.jpg",
      "file_type": "image",
      "file_size": 12345
    }
  ]
}
```

### **Verify File in MinIO:**
1. Open http://localhost:9001
2. Login with `tejasadmin` / `StrongPass123!`
3. Navigate to `civiclens-media` bucket
4. Check `reports/1/` folder for uploaded files

---

## 🔒 **PRODUCTION CONSIDERATIONS**

### **Security Settings:**
```env
# Production MinIO Configuration
MINIO_ENDPOINT=your-minio-server.com:9000
MINIO_ACCESS_KEY=production-access-key
MINIO_SECRET_KEY=super-secure-secret-key
MINIO_BUCKET=civiclens-production-media
MINIO_USE_SSL=true
```

### **Bucket Policies:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "*"},
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::civiclens-media/public/*"
    }
  ]
}
```

### **Network Security:**
- Use HTTPS in production (`MINIO_USE_SSL=true`)
- Restrict access with firewall rules
- Use strong, unique credentials
- Enable bucket versioning for data protection

---

## ✅ **SUCCESS CRITERIA**

After applying this fix, you should see:

### **Successful Startup:**
```
📦 Checking MinIO connection...
✅ MinIO - Connected (bucket 'civiclens-media' exists)
```

### **File Upload Works:**
- ✅ Images upload successfully
- ✅ Files stored in MinIO bucket
- ✅ Public URLs generated correctly
- ✅ Media accessible via web browser

### **No More Errors:**
- ❌ "path in endpoint is not allowed" - FIXED
- ❌ "Connection refused" - MinIO running
- ❌ "Access denied" - Credentials correct
- ❌ "Bucket not found" - Auto-created

**Your file upload system is now fully functional with MinIO!** 🎉
