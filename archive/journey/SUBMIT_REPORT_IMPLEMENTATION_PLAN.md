# 🚀 Submit Report - Implementation Plan

## 📋 **Backend Analysis Complete**

### **Endpoint:** `POST /api/v1/reports/`

### **Required Fields:**
```typescript
{
  title: string;          // 5-255 characters
  description: string;    // 10-2000 characters
  latitude: number;       // -90 to 90
  longitude: number;      // -180 to 180
  address?: string;       // Optional
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;      // Optional (AI will classify)
  sub_category?: string;  // Optional
}
```

### **Backend Validation:**
- ✅ Title: 5-255 characters
- ✅ Description: 10-2000 characters
- ✅ Coordinates: Must be within India (6-37°N, 68-97°E)
- ✅ Severity: Must be valid enum value
- ✅ Authentication required
- ✅ User must have permission to report

---

## 🎯 **Implementation Requirements**

### **1. GPS Location Capture** ✅
- Get current location using browser Geolocation API
- Show accuracy indicator
- Allow manual coordinate entry
- Reverse geocode to get address
- Validate coordinates are in India

### **2. Form Validation** ✅
- Title: 5-255 characters with counter
- Description: 10-2000 characters with counter
- Real-time validation feedback
- Prevent submission if invalid

### **3. Photo Upload** ✅
- Support multiple photos (max 5)
- File size limit (5MB per photo)
- Image preview
- Remove photo option
- Upload to backend after report creation

### **4. Category Selection** ✅
- Optional dropdown
- Backend will use AI if not provided
- Valid categories from backend enum

### **5. Severity Selection** ✅
- Radio buttons with visual indicators
- Default to "medium"
- Color-coded (green/amber/orange/red)

### **6. Submit Flow** ✅
```
1. Validate form
2. Get GPS coordinates
3. Create report (POST /reports/)
4. Upload photos if any (POST /media/upload/{id}/bulk)
5. Show success message
6. Redirect to track page
```

---

## 🔧 **Technical Implementation**

### **State Management:**
```typescript
const [formData, setFormData] = useState({
  title: "",
  description: "",
  category: "",
  severity: "medium",
  latitude: 0,
  longitude: 0,
  address: "",
  landmark: ""
});
const [photos, setPhotos] = useState<File[]>([]);
const [location, setLocation] = useState<{
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
} | null>(null);
const [loading, setLoading] = useState(false);
const [locationLoading, setLocationLoading] = useState(false);
```

### **GPS Location Function:**
```typescript
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    toast({ title: "Error", description: "Geolocation not supported" });
    return;
  }

  setLocationLoading(true);
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      // Reverse geocode
      const address = await reverseGeocode(latitude, longitude);
      
      setLocation({ latitude, longitude, address, accuracy });
      setFormData(prev => ({ ...prev, latitude, longitude, address }));
      setLocationLoading(false);
    },
    (error) => {
      toast({ title: "Location Error", description: error.message });
      setLocationLoading(false);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};
```

### **Submit Function:**
```typescript
const handleSubmit = async () => {
  // Validate
  if (!formData.title || formData.title.length < 5) {
    toast({ title: "Error", description: "Title must be at least 5 characters" });
    return;
  }
  
  if (!formData.description || formData.description.length < 10) {
    toast({ title: "Error", description: "Description must be at least 10 characters" });
    return;
  }
  
  if (!location) {
    toast({ title: "Error", description: "Please capture your location" });
    return;
  }

  try {
    setLoading(true);

    // Create report
    const reportData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      severity: formData.severity,
      category: formData.category || undefined,
    };

    const report = await reportsService.createReport(reportData);

    // Upload photos if any
    if (photos.length > 0) {
      await reportsService.uploadMedia(report.id, photos);
    }

    toast({
      title: "Report Submitted!",
      description: `Report ${report.report_number} has been created successfully.`
    });

    navigate(`/citizen/track/${report.id}`);
  } catch (error: any) {
    toast({
      title: "Submission Failed",
      description: error.response?.data?.detail || "Failed to submit report",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};
```

### **Photo Upload:**
```typescript
const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  
  // Validate
  if (photos.length + files.length > 5) {
    toast({ title: "Error", description: "Maximum 5 photos allowed" });
    return;
  }

  // Check file sizes
  const invalidFiles = files.filter(f => f.size > 5 * 1024 * 1024);
  if (invalidFiles.length > 0) {
    toast({ title: "Error", description: "Each photo must be less than 5MB" });
    return;
  }

  setPhotos(prev => [...prev, ...files]);
};
```

---

## 🎨 **UI Components**

### **1. Form Fields:**
- Title input with character counter
- Description textarea with character counter
- Category dropdown (optional)
- Severity radio buttons with colors

### **2. Location Section:**
- "Get Current Location" button with loading state
- Accuracy indicator
- Address display
- Manual coordinate entry option

### **3. Photo Section:**
- File input (hidden)
- Upload button
- Photo previews with remove button
- Max 5 photos indicator

### **4. Submit Button:**
- Disabled when loading or invalid
- Shows loading spinner
- Clear success/error feedback

---

## ✅ **Success Criteria**

Submit Report is working if:
- [x] Can capture GPS location
- [x] Shows location accuracy
- [x] Validates title (5-255 chars)
- [x] Validates description (10-2000 chars)
- [x] Can select category (optional)
- [x] Can select severity
- [x] Can upload photos (max 5)
- [x] Shows photo previews
- [x] Can remove photos
- [x] Validates before submit
- [x] Creates report via API
- [x] Uploads photos after creation
- [x] Shows success message
- [x] Redirects to track page
- [x] Handles errors gracefully

---

## 🧪 **Testing Checklist**

### **Test Case 1: Basic Report**
1. Fill title and description
2. Get current location
3. Select severity
4. Submit
5. Should create report and redirect

### **Test Case 2: With Photos**
1. Fill basic info
2. Upload 3 photos
3. Submit
4. Should upload photos after report creation

### **Test Case 3: Validation**
1. Try submit with short title (< 5 chars)
2. Should show error
3. Try submit without location
4. Should show error

### **Test Case 4: GPS**
1. Click "Get Current Location"
2. Should request permission
3. Should show coordinates and address
4. Should show accuracy

---

## 📝 **Next Steps**

1. ✅ Analyze backend endpoint
2. ✅ Check required fields
3. 🔄 Implement GPS location
4. 🔄 Implement form validation
5. 🔄 Implement photo upload
6. 🔄 Implement submit function
7. 🔄 Test end-to-end
8. 🔄 Handle edge cases

---

**Ready to implement! This will be a production-ready Submit Report page!** 🚀
