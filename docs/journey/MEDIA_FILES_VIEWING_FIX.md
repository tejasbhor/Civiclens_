# ✅ Media Files Viewing Fix - 404 Error Resolved

## 🐛 **Issue**

**User Report:** "Media files are not loading properly. When I click on a media file, it redirects to `http://localhost:8000/api/v1/media/reports/29/29_20251026_201610_...jpeg` and shows `{"detail":"Not Found"}`"

**Root Cause:** Frontend was incorrectly constructing media URLs by adding `/api/v1` prefix, but media files are served at `/media/...` (without `/api/v1`).

---

## 🔍 **Investigation**

### **What Was Happening:**

```
Backend stores file URL: "/media/reports/29/file.jpeg"
                              ↓
Frontend constructs URL: "http://localhost:8000/api/v1/media/reports/29/file.jpeg"
                              ↓
                         ❌ 404 Not Found!
```

### **Why It Was Wrong:**

1. **Backend Storage Service** (`storage_service.py`):
   ```python
   # Returns URL like: "/media/reports/29/file.jpeg"
   public_url = f"/media/{path}"
   ```

2. **Backend Main** (`main.py`):
   ```python
   # Media files are served at /media (NOT /api/v1/media)
   app.mount("/media", StaticFiles(directory=media_directory), name="media")
   ```

3. **Frontend** (TabsSection.tsx):
   ```typescript
   // ❌ WRONG - Adding /api/v1 prefix
   const fileUrl = media.file_url.startsWith('http') 
     ? media.file_url 
     : `${process.env.NEXT_PUBLIC_API_URL}${media.file_url}`;
   // Result: http://localhost:8000/api/v1/media/reports/29/file.jpeg ❌
   ```

### **Correct URL Structure:**

```
API Endpoints:    http://localhost:8000/api/v1/...
                  ↓
                  /api/v1/reports
                  /api/v1/media/upload/{report_id}
                  /api/v1/auth/login
                  etc.

Media Files:      http://localhost:8000/media/...
                  ↓
                  /media/reports/29/file.jpeg  ✅
                  /media/reports/30/audio.mp3  ✅
```

---

## ✅ **The Fix**

### **1. Created Media Utility Module**

**File:** `src/lib/utils/media.ts`

```typescript
/**
 * Get the base URL for the backend server (without /api/v1)
 */
export const getBackendBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  // Remove /api/v1 from the end if present
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

/**
 * Construct a proper media URL from a file_url
 * 
 * @param fileUrl - The file_url from the backend (e.g., "/media/reports/29/file.jpg")
 * @returns Complete URL to access the media file
 */
export const getMediaUrl = (fileUrl: string): string => {
  if (!fileUrl) {
    return '';
  }

  // If it's already a complete URL, return as-is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  // If it's a relative path, construct the full URL
  // Media files are served at http://localhost:8000/media/... (NOT /api/v1/media/...)
  const backendBaseUrl = getBackendBaseUrl();
  
  // Ensure the path starts with /
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  
  return `${backendBaseUrl}${path}`;
};
```

**How It Works:**

```typescript
// Input from backend
fileUrl = "/media/reports/29/file.jpeg"

// getBackendBaseUrl()
apiUrl = "http://localhost:8000/api/v1"
backendBaseUrl = "http://localhost:8000"  // ← Removes /api/v1

// getMediaUrl()
result = "http://localhost:8000" + "/media/reports/29/file.jpeg"
result = "http://localhost:8000/media/reports/29/file.jpeg"  ✅
```

### **2. Updated TabsSection.tsx**

```typescript
// BEFORE ❌
const fileUrl = media.file_url.startsWith('http') 
  ? media.file_url 
  : `${process.env.NEXT_PUBLIC_API_URL}${media.file_url}`;

// AFTER ✅
import { getMediaUrl } from '@/lib/utils/media';

const fileUrl = getMediaUrl(media.file_url);
```

### **3. Updated MediaGallery.tsx**

```typescript
// BEFORE ❌
<img src={media.file_url} alt="..." />

// AFTER ✅
import { getMediaUrl } from '@/lib/utils/media';

<img src={getMediaUrl(media.file_url)} alt="..." />
```

```typescript
// Download function
const downloadMedia = (media: Media) => {
  const link = document.createElement('a');
  link.href = getMediaUrl(media.file_url);  // ✅ Fixed
  link.download = `report_${report.id}_media_${media.id}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

---

## 📊 **URL Comparison**

### **Before (Broken):**

```
Backend stores:  /media/reports/29/29_20251026_201610_b85c9556.jpeg
                      ↓
Frontend builds: http://localhost:8000/api/v1/media/reports/29/29_20251026_201610_b85c9556.jpeg
                      ↓
Server response: 404 Not Found ❌
```

### **After (Fixed):**

```
Backend stores:  /media/reports/29/29_20251026_201610_b85c9556.jpeg
                      ↓
Frontend builds: http://localhost:8000/media/reports/29/29_20251026_201610_b85c9556.jpeg
                      ↓
Server response: 200 OK - Image loads! ✅
```

---

## 🎯 **Backend Architecture**

### **FastAPI Main (`main.py`):**

```python
# Static file serving for media files
media_directory = settings.MEDIA_ROOT or "./media"

# Mount static files at /media (NOT /api/v1/media)
app.mount("/media", StaticFiles(directory=media_directory), name="media")
print(f"📁 Static media files mounted: /media -> {os.path.abspath(media_directory)}")
```

### **Storage Service (`storage_service.py`):**

```python
async def _upload_to_local(self, content, path, content_type) -> str:
    """Upload file to local storage"""
    # Create directory structure
    file_path = self.local_storage_path / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Generate public URL (relative to media root)
    public_url = f"/media/{path}"  # ← Returns /media/... NOT /api/v1/media/...
    
    return public_url
```

### **File Upload Service (`file_upload_service.py`):**

```python
# Upload to storage
file_url = await self.storage.upload_file(
    content=processed_content,
    filename=filename,
    content_type=validation_result['mime_type'],
    folder=f"reports/{report_id}"
)
# file_url = "/media/reports/29/file.jpeg"

# Create media record
media = Media(
    report_id=report_id,
    file_url=file_url,  # ← Stored as "/media/reports/29/file.jpeg"
    file_type=media_type,
    # ...
)
```

---

## 🔧 **Files Modified**

### **1. Created New File:**
- ✅ `src/lib/utils/media.ts` - Media URL utility functions

### **2. Updated Files:**
- ✅ `src/components/reports/manage/TabsSection.tsx` - Use getMediaUrl()
- ✅ `src/components/reports/manage/MediaGallery.tsx` - Use getMediaUrl()

---

## ✅ **Testing**

### **Test Case 1: View Image in Report Details**

**Before:**
```
Click on image → 404 Not Found ❌
URL: http://localhost:8000/api/v1/media/reports/29/file.jpeg
```

**After:**
```
Click on image → Image loads! ✅
URL: http://localhost:8000/media/reports/29/file.jpeg
```

### **Test Case 2: Play Audio File**

**Before:**
```
Click play → Audio not found ❌
URL: http://localhost:8000/api/v1/media/reports/29/audio.mp3
```

**After:**
```
Click play → Audio plays! ✅
URL: http://localhost:8000/media/reports/29/audio.mp3
```

### **Test Case 3: Download Media**

**Before:**
```
Click download → 404 error ❌
```

**After:**
```
Click download → File downloads! ✅
```

---

## 🎨 **Additional Utility Functions**

The new `media.ts` utility also includes:

```typescript
// Check if URL is an image
export const isImageUrl = (fileUrl: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  return imageExtensions.some(ext => fileUrl.toLowerCase().endsWith(ext));
};

// Check if URL is audio
export const isAudioUrl = (fileUrl: string): boolean => {
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
  return audioExtensions.some(ext => fileUrl.toLowerCase().endsWith(ext));
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
```

---

## 📝 **Summary**

### **Problem:**
- Frontend added `/api/v1` prefix to media URLs
- Media files are served at `/media/...` (without `/api/v1`)
- Result: 404 Not Found errors

### **Solution:**
- Created `getMediaUrl()` utility function
- Removes `/api/v1` from base URL
- Constructs correct media URLs
- Updated all components to use utility

### **Result:**
- ✅ Images load properly
- ✅ Audio files play properly
- ✅ Downloads work properly
- ✅ No more 404 errors

---

## 🎯 **Key Takeaway**

**API Endpoints vs Static Files:**

```
API Endpoints:     /api/v1/...     (for API calls)
Static Files:      /media/...      (for media files)
                   /static/...     (for static assets)
```

**Never mix them!**

---

**Status:** ✅ **FIXED!**

**Media files now load correctly throughout the application!** 🎉

**All media URLs are now properly constructed:**
- ✅ Images display in report details
- ✅ Audio files play in media player
- ✅ Downloads work correctly
- ✅ No more 404 errors
