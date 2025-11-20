# Complete Work Page - Implementation Requirements

## 📋 Overview

The Complete Work page allows officers to submit completed tasks for verification by uploading after photos, documenting work details, and providing completion notes.

**Web Client Reference:** `http://localhost:8080/officer/task/14/complete`

---

## 🎯 Required Features

### 1. **After Photos Upload** ✅ REQUIRED
- **Min:** 1 photo
- **Max:** 5 photos total (before + after combined)
- **Types:** JPEG, PNG, WebP only
- **Size:** Max 10MB per photo
- **API:** `POST /media/upload/{report_id}`
- **Parameters:**
  - `file`: Image file
  - `upload_source`: "officer_after_photo"
  - `is_proof_of_work`: "true"
  - `caption`: "After completing work"

### 2. **Work Duration** ✅ REQUIRED
- **Type:** Number (hours)
- **Validation:**
  - Must be > 0
  - Must be <= 1000 hours (sanity check)
- **Format:** Decimal (e.g., 2.5 hours)

### 3. **Materials Used** ❌ OPTIONAL
- **Type:** Text
- **Description:** Materials/equipment used during work
- **Example:** "Cement bags: 5, Sand: 2 cubic meters, Paint: 10 liters"

### 4. **Completion Notes** ✅ REQUIRED
- **Type:** Multiline text
- **Min Length:** 10 characters
- **Description:** Detailed notes about work completed
- **Example:** "Fixed pothole on Main Street. Surface leveled and compacted. No drainage issues detected."

### 5. **Confirmation Checklist** ✅ REQUIRED
- **Required Checkboxes:**
  - ✅ "I confirm that the issue is completely resolved"
  - ✅ "I have cleaned up the work area"
  - ✅ "I have taken after photos as proof of work"
  - ✅ "I have documented all materials used"

### 6. **Submit for Verification**
- **API:** `POST /reports/{report_id}/submit-for-verification`
- **Body:**
  - `resolution_notes`: Combined string containing:
    - Completion notes
    - Work duration
    - Materials used
- **Status Transition:** `IN_PROGRESS` → `PENDING_VERIFICATION`

---

## 🔄 Complete Workflow

```
1. Officer navigates to Complete Work screen
   ├─ Screen shows task details
   └─ Shows "before" photos uploaded by citizen

2. Officer uploads "after" photos
   ├─ Select from camera/gallery
   ├─ Preview selected photos
   └─ Validate: 1-5 photos, correct format, size < 10MB

3. Officer fills work details form
   ├─ Work Duration: e.g., "3.5" hours
   ├─ Materials Used: e.g., "Cement, sand, gravel"
   └─ Completion Notes: "Detailed description of work done..."

4. Officer confirms checklist items
   ├─ Issue resolved ✅
   ├─ Area cleaned ✅
   ├─ Photos taken ✅
   └─ Materials documented ✅

5. Officer clicks "Submit for Verification"
   ├─ Validation runs (all required fields)
   ├─ Confirmation dialog appears
   └─ Officer confirms submission

6. System processes submission
   ├─ Upload after photos sequentially
   ├─ Submit work for verification
   ├─ Task status → PENDING_VERIFICATION
   └─ Navigate back to task detail

7. Success feedback
   ├─ Toast: "Work submitted successfully"
   ├─ Citizen notified
   └─ Admin can now verify work
```

---

## 📊 Web Client Analysis

### **Form Structure**

```typescript
// State Variables
const [afterPhotos, setAfterPhotos] = useState<PhotoPreview[]>([]);
const [completionNotes, setCompletionNotes] = useState("");
const [workDuration, setWorkDuration] = useState("");
const [materialsUsed, setMaterialsUsed] = useState("");
const [checklist, setChecklist] = useState({
  resolved: false,    // Required
  cleaned: false,     // Optional (not validated)
  photos: false,      // Auto-checked when photos added
  materials: false    // Optional (not validated)
});
```

### **Validation Rules**

```typescript
// 1. After Photos
if (afterPhotos.length === 0) {
  errors.photos = 'At least one after photo is required';
}

// 2. Completion Notes
if (!completionNotes.trim()) {
  errors.completionNotes = 'Work completion notes are required';
} else if (completionNotes.trim().length < 10) {
  errors.completionNotes = 'Completion notes must be at least 10 characters';
}

// 3. Work Duration
if (!workDuration.trim()) {
  errors.workDuration = 'Work duration is required';
} else {
  const duration = parseFloat(workDuration);
  if (isNaN(duration) || duration <= 0) {
    errors.workDuration = 'Please enter a valid work duration (hours)';
  } else if (duration > 1000) {
    errors.workDuration = 'Work duration seems unrealistic. Please verify.';
  }
}

// 4. Checklist - Only "resolved" is required
if (!checklist.resolved) {
  errors.checklist = 'Please confirm that the issue is completely resolved';
}
```

### **Photo Upload Process**

```typescript
// Upload each photo individually
const uploadPromises = afterPhotos.map(async (photoPreview) => {
  const formData = new FormData();
  formData.append('file', photoPreview.file);
  formData.append('upload_source', 'officer_after_photo');
  formData.append('is_proof_of_work', 'true');
  formData.append('caption', 'After completing work');

  return apiClient.post(`/media/upload/${id}`, formData);
});

// Use allSettled to allow partial success
const results = await Promise.allSettled(uploadPromises);

// Count successes/failures
const successCount = results.filter(r => r.status === 'fulfilled').length;
const failedCount = results.filter(r => r.status === 'rejected').length;
```

### **Submission Process**

```typescript
// After photos are uploaded, submit for verification
const submitFormData = new FormData();
const notes = `${completionNotes.trim()}\n\nWork Duration: ${workDuration} hours\nMaterials Used: ${materialsUsed.trim() || 'N/A'}`;
submitFormData.append('resolution_notes', notes);

await apiClient.post(`/reports/${id}/submit-for-verification`, submitFormData);
```

---

## 🎨 UI/UX Design

### **Screen Layout**

```
┌─────────────────────────────────────┐
│  ← Submit Work for Verification     │  ← Top Navbar
├─────────────────────────────────────┤
│                                     │
│  📋 Task Information                │
│  ├─ Report #: RPT-1234              │
│  ├─ Title: Pothole on Main St      │
│  ├─ Status: IN_PROGRESS             │
│  └─ Officer: John Doe               │
│                                     │
│  📸 Before Photos (From Citizen)    │
│  ├─ [Photo 1] [Photo 2] [Photo 3]  │
│  └─ "These are the original photos" │
│                                     │
│  📸 Upload After Photos * Required  │
│  ├─ [+ Add Photo] (Button)          │
│  ├─ [Preview 1] [X]                 │
│  ├─ [Preview 2] [X]                 │
│  └─ "1-5 photos, max 10MB each"     │
│                                     │
│  ⏱️ Work Duration * Required        │
│  └─ [3.5______] hours               │
│                                     │
│  🛠️ Materials Used (Optional)       │
│  └─ [Cement, sand, gravel...]       │
│                                     │
│  📝 Completion Notes * Required     │
│  └─ [Fixed pothole successfully...] │
│                                     │
│  ✅ Confirmation Checklist          │
│  ├─ ☑️ Issue completely resolved *  │
│  ├─ ☐ Work area cleaned             │
│  ├─ ☐ After photos taken            │
│  └─ ☐ Materials documented          │
│                                     │
│  [Submit for Verification]          │  ← Primary Button
│                                     │
└─────────────────────────────────────┘
```

---

## 📱 Mobile Implementation Requirements

### **Navigation**
```typescript
// From Task Detail screen
navigation.navigate('SubmitVerification', { 
  taskId: task.report_id 
});

// After submission
navigation.navigate('TaskDetail', { 
  taskId: task.report_id 
});
```

### **Image Picker (React Native)**
```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission denied', 'We need camera roll permissions');
    return;
  }

  // Launch picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.8,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  if (!result.canceled) {
    // Process selected images
    result.assets.forEach(asset => {
      // Validate and add to afterPhotos
    });
  }
};
```

### **Camera (React Native)**
```typescript
const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission denied', 'We need camera permissions');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    allowsEditing: true,
  });

  if (!result.canceled) {
    // Add photo to afterPhotos
  }
};
```

---

## 🔧 Technical Implementation

### **File Structure**

```
d:/Civiclens/civiclens-mobile/
├─ src/
│  ├─ features/
│  │  └─ officer/
│  │     ├─ screens/
│  │     │  └─ OfficerSubmitVerificationScreen.tsx  ← NEW
│  │     ├─ types/
│  │     │  └─ submitVerification.types.ts          ← NEW
│  │     └─ styles/
│  │        └─ submitVerificationStyles.ts          ← NEW
```

### **Type Definitions**

```typescript
// submitVerification.types.ts
export interface PhotoPreview {
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  id: string;
}

export interface ChecklistState {
  resolved: boolean;    // Required
  cleaned: boolean;
  photos: boolean;      // Auto-checked
  materials: boolean;
}

export interface SubmitVerificationForm {
  afterPhotos: PhotoPreview[];
  workDuration: string;
  materialsUsed: string;
  completionNotes: string;
  checklist: ChecklistState;
}
```

---

## ✅ Implementation Checklist

### **Phase 1: Screen Setup**
- [ ] Create `OfficerSubmitVerificationScreen.tsx`
- [ ] Create `submitVerification.types.ts`
- [ ] Create `submitVerificationStyles.ts`
- [ ] Add navigation route to stack navigator

### **Phase 2: UI Components**
- [ ] Task information card (read-only)
- [ ] Before photos gallery (from citizen)
- [ ] After photos upload section
  - [ ] Pick from gallery button
  - [ ] Take photo button
  - [ ] Photo preview grid
  - [ ] Remove photo button
- [ ] Work duration input
- [ ] Materials used input (optional)
- [ ] Completion notes textarea
- [ ] Confirmation checklist
- [ ] Submit button

### **Phase 3: Form Logic**
- [ ] Image picker integration (gallery)
- [ ] Camera integration
- [ ] Photo validation (type, size, count)
- [ ] Photo preview management
- [ ] Form state management
- [ ] Real-time validation
- [ ] Character counter

### **Phase 4: API Integration**
- [ ] Photo upload endpoint
- [ ] Submit verification endpoint
- [ ] Error handling
- [ ] Loading states
- [ ] Success feedback

### **Phase 5: Validation & UX**
- [ ] Required field validation
- [ ] Inline error messages
- [ ] Confirmation dialog before submit
- [ ] Progress indicator during upload
- [ ] Handle partial upload failures

---

## 🎉 Success Criteria

1. ✅ Officer can upload 1-5 after photos
2. ✅ Officer can take photos with camera
3. ✅ Officer can remove unwanted photos
4. ✅ All required fields validated before submission
5. ✅ Photos upload successfully to backend
6. ✅ Work details submitted for verification
7. ✅ Task status changes to PENDING_VERIFICATION
8. ✅ Success feedback shown
9. ✅ Navigation back to task detail
10. ✅ Citizen receives notification

---

## 🚀 Ready to Implement!

All requirements analyzed and documented. Ready to start building the Complete Work screen! 🎉
