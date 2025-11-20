# ✅ Backend Changes Complete - Before/After Photos Support

## 🎉 **BACKEND IS NOW READY FOR BEFORE/AFTER PHOTOS!**

---

## ✅ **CHANGES MADE**

### **1. File Upload Service** ✅ UPDATED
**File:** `app/services/file_upload_service.py`

**Changes:**
```python
# BEFORE:
async def upload_file(
    self,
    file: UploadFile,
    report_id: int,
    user_id: int,
    file_type: str,
    caption: Optional[str] = None,
    is_primary: bool = False
) -> Media:

# AFTER:
async def upload_file(
    self,
    file: UploadFile,
    report_id: int,
    user_id: int,
    file_type: str,
    caption: Optional[str] = None,
    is_primary: bool = False,
    upload_source: Optional[UploadSource] = None,  # ← NEW
    is_proof_of_work: bool = False  # ← NEW
) -> Media:
```

**Media Creation:**
```python
# BEFORE:
upload_source=UploadSource.CITIZEN_SUBMISSION,

# AFTER:
upload_source=upload_source or UploadSource.CITIZEN_SUBMISSION,
is_proof_of_work=is_proof_of_work,
```

---

### **2. Media Upload API** ✅ UPDATED
**File:** `app/api/v1/media.py`

**Endpoint:** `POST /api/v1/media/upload/{report_id}`

**New Parameters:**
```python
upload_source: Optional[str] = Form(
    None, 
    description="Upload source: citizen_submission, officer_before_photo, officer_after_photo"
)
is_proof_of_work: bool = Form(
    False, 
    description="Mark as proof of work (for officer completion photos)"
)
```

**Validation Logic:**
```python
# Convert upload_source string to enum
from app.models.media import UploadSource
source_enum = None
if upload_source:
    try:
        source_enum = UploadSource(upload_source)
    except ValueError:
        raise ValidationException(
            f"Invalid upload_source: {upload_source}. "
            "Must be one of: citizen_submission, officer_before_photo, officer_after_photo"
        )

# Pass to service
media = await upload_service.upload_file(
    file=file,
    report_id=report_id,
    user_id=current_user.id,
    file_type=file_type,
    caption=caption,
    is_primary=is_primary,
    upload_source=source_enum,  # ← NEW
    is_proof_of_work=is_proof_of_work  # ← NEW
)
```

---

## 📋 **API USAGE**

### **Upload Before Photo (Officer Starting Work)**

**Endpoint:** `POST /api/v1/media/upload/{report_id}`

**Form Data:**
```
file: [image file]
caption: "Before starting work"
upload_source: "officer_before_photo"
is_proof_of_work: false
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/media/upload/30" \
  -H "Authorization: Bearer {token}" \
  -F "file=@before_photo.jpg" \
  -F "caption=Before starting work" \
  -F "upload_source=officer_before_photo" \
  -F "is_proof_of_work=false"
```

**Response:**
```json
{
  "id": 123,
  "report_id": 30,
  "file_url": "/media/reports/30/20251027_083000_uuid.jpg",
  "file_type": "IMAGE",
  "file_size": 2048576,
  "mime_type": "image/jpeg",
  "is_primary": false,
  "caption": "Before starting work",
  "upload_source": "officer_before_photo",
  "is_proof_of_work": false,
  "created_at": "2025-10-27T08:30:00Z"
}
```

---

### **Upload After Photo (Officer Completing Work)**

**Endpoint:** `POST /api/v1/media/upload/{report_id}`

**Form Data:**
```
file: [image file]
caption: "After completing work"
upload_source: "officer_after_photo"
is_proof_of_work: true
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/media/upload/30" \
  -H "Authorization: Bearer {token}" \
  -F "file=@after_photo.jpg" \
  -F "caption=After completing work" \
  -F "upload_source=officer_after_photo" \
  -F "is_proof_of_work=true"
```

**Response:**
```json
{
  "id": 124,
  "report_id": 30,
  "file_url": "/media/reports/30/20251027_103000_uuid.jpg",
  "file_type": "IMAGE",
  "file_size": 2156789,
  "mime_type": "image/jpeg",
  "is_primary": false,
  "caption": "After completing work",
  "upload_source": "officer_after_photo",
  "is_proof_of_work": true,
  "created_at": "2025-10-27T10:30:00Z"
}
```

---

### **Get Report Media (Filter by Type)**

**Endpoint:** `GET /api/v1/media/report/{report_id}`

**Response:**
```json
{
  "media": [
    {
      "id": 120,
      "upload_source": "citizen_submission",
      "caption": "Pothole photo",
      "file_url": "...",
      "is_proof_of_work": false
    },
    {
      "id": 123,
      "upload_source": "officer_before_photo",
      "caption": "Before starting work",
      "file_url": "...",
      "is_proof_of_work": false
    },
    {
      "id": 124,
      "upload_source": "officer_after_photo",
      "caption": "After completing work",
      "file_url": "...",
      "is_proof_of_work": true
    }
  ]
}
```

---

## 🔧 **FRONTEND INTEGRATION**

### **TypeScript Service Example**

```typescript
// mediaService.ts
export const mediaService = {
  // Upload before photo
  async uploadBeforePhoto(
    reportId: number, 
    file: File, 
    caption?: string
  ): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_source', 'officer_before_photo');
    formData.append('is_proof_of_work', 'false');
    if (caption) formData.append('caption', caption);
    
    const response = await apiClient.post(
      `/media/upload/${reportId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  },

  // Upload after photo
  async uploadAfterPhoto(
    reportId: number, 
    file: File, 
    caption?: string
  ): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_source', 'officer_after_photo');
    formData.append('is_proof_of_work', 'true');
    if (caption) formData.append('caption', caption);
    
    const response = await apiClient.post(
      `/media/upload/${reportId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  },

  // Get report media
  async getReportMedia(reportId: number): Promise<Media[]> {
    const response = await apiClient.get(`/media/report/${reportId}`);
    return response.data.media;
  },

  // Filter photos by type
  filterPhotosByType(media: Media[], type: string): Media[] {
    return media.filter(m => m.upload_source === type);
  }
};

// Usage in component
const beforePhotos = mediaService.filterPhotosByType(
  allMedia, 
  'officer_before_photo'
);
const afterPhotos = mediaService.filterPhotosByType(
  allMedia, 
  'officer_after_photo'
);
```

---

## 🧪 **TESTING**

### **Test 1: Upload Before Photo**
```bash
# 1. Get auth token
TOKEN="your_jwt_token"

# 2. Upload before photo
curl -X POST "http://localhost:8000/api/v1/media/upload/30" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_before.jpg" \
  -F "caption=Before work" \
  -F "upload_source=officer_before_photo"

# Expected: 200 OK with media object
# Check: upload_source = "officer_before_photo"
```

### **Test 2: Upload After Photo**
```bash
curl -X POST "http://localhost:8000/api/v1/media/upload/30" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_after.jpg" \
  -F "caption=After work" \
  -F "upload_source=officer_after_photo" \
  -F "is_proof_of_work=true"

# Expected: 200 OK with media object
# Check: upload_source = "officer_after_photo"
# Check: is_proof_of_work = true
```

### **Test 3: Invalid Upload Source**
```bash
curl -X POST "http://localhost:8000/api/v1/media/upload/30" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg" \
  -F "upload_source=invalid_source"

# Expected: 400 Bad Request
# Error: "Invalid upload_source: invalid_source. Must be one of: ..."
```

### **Test 4: Get Media and Filter**
```bash
# Get all media
curl "http://localhost:8000/api/v1/media/report/30" \
  -H "Authorization: Bearer $TOKEN"

# Check response contains photos with different upload_source values
```

---

## ✅ **VALIDATION**

### **Upload Source Values:**
- ✅ `citizen_submission` - Default, for citizen-uploaded photos
- ✅ `officer_before_photo` - Before starting work
- ✅ `officer_after_photo` - After completing work

### **Constraints:**
- ✅ Max 5 images per report (total, all types)
- ✅ Max 10MB per image
- ✅ Supported formats: JPEG, PNG, WebP
- ✅ Auto-processing: resize, optimize, compress

---

## 📊 **DATABASE SCHEMA**

### **Media Table:**
```sql
SELECT 
  id,
  report_id,
  file_url,
  file_type,
  upload_source,  -- citizen_submission, officer_before_photo, officer_after_photo
  is_proof_of_work,  -- true for after photos
  caption,
  created_at
FROM media
WHERE report_id = 30
ORDER BY created_at;
```

**Example Query Results:**
```
id  | report_id | upload_source          | is_proof_of_work | caption
----|-----------|------------------------|------------------|------------------
120 | 30        | citizen_submission     | false            | Pothole photo
123 | 30        | officer_before_photo   | false            | Before work
124 | 30        | officer_after_photo    | true             | After work
```

---

## 🚀 **NEXT STEPS FOR FRONTEND**

### **1. Create Photo Upload Components**
```typescript
// BeforePhotoUpload.tsx
// AfterPhotoUpload.tsx
// PhotoComparison.tsx
```

### **2. Integrate with Task Flow**
```
Officer Dashboard
  ↓
Click Task
  ↓
Task Details
  ↓
[Start Work] Button
  ↓
Upload Before Photos Page
  ↓
Work in Progress
  ↓
[Complete Work] Button
  ↓
Upload After Photos Page
  ↓
Submit for Verification
```

### **3. Display Photos**
```typescript
// In verification interface
const beforePhotos = media.filter(m => 
  m.upload_source === 'officer_before_photo'
);
const afterPhotos = media.filter(m => 
  m.upload_source === 'officer_after_photo'
);

// Show side-by-side comparison
<PhotoComparison before={beforePhotos} after={afterPhotos} />
```

---

## ✅ **SUMMARY**

**Status:** ✅ **BACKEND COMPLETE & READY!**

**What's Done:**
- ✅ File upload service supports upload_source
- ✅ Media API accepts upload_source parameter
- ✅ Validation for upload_source values
- ✅ is_proof_of_work flag added
- ✅ Backward compatible (defaults to citizen_submission)

**What Frontend Can Do:**
- ✅ Upload before photos with proper tagging
- ✅ Upload after photos with proof flag
- ✅ Filter photos by type
- ✅ Display before/after comparison
- ✅ Build complete officer workflow

**Testing:**
- ✅ Test with cURL commands above
- ✅ Verify upload_source is saved correctly
- ✅ Verify is_proof_of_work flag works
- ✅ Check media retrieval and filtering

**Ready for Frontend Development!** 🎉

**Next: Build the officer photo upload pages!** 📸
