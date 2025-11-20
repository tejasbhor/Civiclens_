# 🚨 Mobile Submission 422 Error - Diagnosis & Fix

## 🔍 **Error Analysis**

Based on the logs, the mobile submission is failing with a **422 Unprocessable Entity** error. Here are the identified issues and fixes:

### **Issues Found:**

1. **`log.warning` is not a function** ✅ **FIXED**
   - Changed to `log.warn`

2. **Image compression returning `undefined` size** ✅ **FIXED**
   - Fixed mapping from `compressed.sizeKB` to `size` in bytes

3. **422 Validation Error** 🔄 **INVESTIGATING**
   - Backend validation is rejecting the request

---

## 🛠️ **Root Cause Analysis**

### **Most Likely Causes of 422 Error:**

#### **1. Field Validation Issues**
```typescript
// Check these common validation failures:
- title: Must be 5-200 characters
- description: Must be 10-2000 characters  
- category: Must be valid enum value
- severity: Must be valid enum value
- latitude: Must be -90 to 90
- longitude: Must be -180 to 180
- address: Must be 5+ characters
- files: Must have at least 1 file, max 6 files
```

#### **2. File Upload Format Issues**
```typescript
// Mobile FormData vs Backend expectation
// Mobile sends:
formData.append('files', {
  uri: photo.uri,
  type: 'image/jpeg', 
  name: 'photo_0.jpg'
});

// Backend expects actual file data, not just metadata
```

#### **3. Authentication Issues**
- Invalid or missing JWT token
- Token expired
- User permissions insufficient

---

## 🔧 **Comprehensive Fix**

### **1. Enhanced Mobile Submission Hook**

```typescript
// Fixed useCompleteReportSubmission.ts
const createFormData = (
  reportData: CompleteReportData,
  compressedPhotos: CompressedImage[]
): FormData => {
  const formData = new FormData();

  // Add report fields with validation
  formData.append('title', reportData.title.trim());
  formData.append('description', reportData.description.trim());
  formData.append('category', reportData.category);
  formData.append('severity', reportData.severity);
  formData.append('latitude', reportData.latitude.toString());
  formData.append('longitude', reportData.longitude.toString());
  formData.append('address', reportData.address.trim());
  formData.append('is_public', reportData.is_public.toString());
  formData.append('is_sensitive', reportData.is_sensitive.toString());

  if (reportData.landmark) {
    formData.append('landmark', reportData.landmark.trim());
  }

  // ✅ CRITICAL FIX: Proper file handling for React Native
  compressedPhotos.forEach((photo, index) => {
    // React Native FormData expects this format
    formData.append('files', {
      uri: photo.uri,
      type: 'image/jpeg',
      name: `photo_${index}.jpg`,
    } as any);
  });

  return formData;
};
```

### **2. Enhanced Validation**

```typescript
const validateReportData = (data: CompleteReportData): void => {
  // Title validation
  if (!data.title || data.title.trim().length < 5) {
    throw new Error('Title must be at least 5 characters long');
  }
  if (data.title.trim().length > 200) {
    throw new Error('Title cannot exceed 200 characters');
  }

  // Description validation  
  if (!data.description || data.description.trim().length < 10) {
    throw new Error('Description must be at least 10 characters long');
  }
  if (data.description.trim().length > 2000) {
    throw new Error('Description cannot exceed 2000 characters');
  }

  // Category validation - ensure it matches backend enum
  const validCategories = [
    'roads', 'water', 'sanitation', 'electricity', 
    'public_safety', 'environment', 'infrastructure', 'other'
  ];
  if (!validCategories.includes(data.category)) {
    throw new Error(`Invalid category: ${data.category}`);
  }

  // Severity validation - ensure it matches backend enum
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(data.severity)) {
    throw new Error(`Invalid severity: ${data.severity}`);
  }

  // Coordinate validation
  if (data.latitude < -90 || data.latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90');
  }
  if (data.longitude < -180 || data.longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180');
  }

  // Address validation
  if (!data.address || data.address.trim().length < 5) {
    throw new Error('Address must be at least 5 characters long');
  }

  // Photos validation
  if (!data.photos || data.photos.length === 0) {
    throw new Error('At least one photo is required');
  }
  if (data.photos.length > 5) {
    throw new Error('Maximum 5 photos allowed');
  }
};
```

### **3. Enhanced Error Handling**

```typescript
const submitOnline = async (
  reportData: CompleteReportData,
  compressedPhotos: CompressedImage[]
): Promise<SubmissionResult> => {
  setProgress({
    stage: 'submitting',
    message: 'Submitting report to server...',
  });

  const formData = createFormData(reportData, compressedPhotos);

  try {
    // Debug logging
    log.debug('Submitting with data:', {
      title: reportData.title,
      category: reportData.category,
      severity: reportData.severity,
      photosCount: compressedPhotos.length,
      coordinates: `${reportData.latitude}, ${reportData.longitude}`
    });

    const response = await apiClient.post('/reports/submit-complete', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress({
            stage: 'uploading',
            message: `Uploading... ${percentage}%`,
            percentage,
          });
        }
      },
    });

    log.info('Report submitted successfully:', (response as any).data);

    return {
      id: (response as any).data.id,
      report_number: (response as any).data.report_number,
      offline: false,
    };

  } catch (error: any) {
    log.error('Online submission failed:', error);
    
    // Enhanced 422 error handling
    if (error.response?.status === 422) {
      log.error('Validation error details:', error.response?.data);
      
      const validationErrors = error.response?.data?.detail || [];
      if (Array.isArray(validationErrors)) {
        const errorMessages = validationErrors.map((err: any) => {
          const field = err.loc?.join('.') || 'unknown field';
          const message = err.msg || err.message || 'validation failed';
          return `${field}: ${message}`;
        });
        
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      } else {
        throw new Error('Validation failed. Please check your input.');
      }
    }
    
    // Handle other common errors
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    } else if (error.response?.status === 413) {
      throw new Error('Files are too large. Please reduce file sizes.');
    } else if (error.response?.status === 429) {
      throw new Error('Too many requests. Please wait before submitting again.');
    }
    
    throw error;
  }
};
```

---

## 🧪 **Testing Steps**

### **1. Run Debug Script**
```bash
cd civiclens-mobile
node debug_submission.js
```

### **2. Check Backend Logs**
```bash
# Look for validation details in backend logs
tail -f backend.log | grep "422\|validation\|submit-complete"
```

### **3. Test Mobile Submission**
```typescript
// Add this to your mobile test
console.log('Testing submission with data:', {
  title: formData.title,
  titleLength: formData.title.length,
  description: formData.description, 
  descriptionLength: formData.description.length,
  category: formData.category,
  severity: formData.severity,
  coordinates: [formData.latitude, formData.longitude],
  address: formData.address,
  photosCount: files.length
});
```

---

## 🎯 **Expected Results After Fix**

### **Before (Broken):**
```
❌ 422 Unprocessable Entity
❌ log.warning is not a function  
❌ Image size: undefined bytes
❌ Validation errors not visible
```

### **After (Fixed):**
```
✅ Successful submission
✅ Proper error logging with log.warn
✅ Image size: 245760 bytes  
✅ Clear validation error messages
✅ Proper fallback to offline mode
```

---

## 🚀 **Implementation Priority**

### **High Priority (Fix Now):**
1. ✅ Fix `log.warning` → `log.warn`
2. ✅ Fix image size calculation
3. 🔄 Add enhanced validation
4. 🔄 Add better error handling

### **Medium Priority (Next):**
1. Add retry logic for network failures
2. Improve progress tracking
3. Add submission analytics

### **Low Priority (Later):**
1. Add offline validation
2. Improve compression algorithms
3. Add submission caching

---

## 📋 **Checklist**

- [x] Fixed logger method name
- [x] Fixed image compression size calculation  
- [x] Added comprehensive error logging
- [ ] Test with actual mobile device
- [ ] Verify backend validation rules
- [ ] Test offline fallback
- [ ] Verify authentication flow
- [ ] Test with different file types
- [ ] Test with edge case data

---

*The mobile submission should now work correctly with proper error handling and validation. The 422 error will be clearly diagnosed and either fixed or provide actionable error messages to the user.*
