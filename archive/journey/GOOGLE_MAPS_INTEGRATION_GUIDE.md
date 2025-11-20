# Google Maps Integration Setup Guide

## Overview
The CivicLens system now includes Google Maps integration for enhanced location services, providing accurate address resolution and place search functionality.

---

## 🔧 **Setup Instructions**

### **1. Get Google Maps API Key**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: Choose your project or create a new one
3. **Enable APIs**:
   - Google Maps JavaScript API
   - Google Places API
   - Google Geocoding API
4. **Create API Key**:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the generated API key
5. **Restrict API Key** (Recommended):
   - Set application restrictions (HTTP referrers)
   - Set API restrictions to only the APIs you need

### **2. Configure Environment Variables**

Update your `.env.local` file:
```bash
# Google Maps Integration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### **3. Test the Integration**

1. **Start the Development Server**:
   ```bash
   cd civiclens-admin
   npm run dev
   ```

2. **Test Location Features**:
   - Open the Create Report modal
   - Try the "Use Current Location" button
   - Test address search functionality
   - Verify coordinates are accurate

---

## 🎯 **Features Implemented**

### **1. Enhanced Location Input**
- **Address Search**: Type-ahead search with Google Places API
- **Current Location**: GPS + reverse geocoding for accurate addresses
- **Place Selection**: Click to select from search results
- **Coordinate Display**: Real-time lat/lng coordinates

### **2. Reverse Geocoding**
- **Accurate Addresses**: Converts GPS coordinates to readable addresses
- **Indian Address Format**: Optimized for Indian address components
- **Fallback Support**: Graceful degradation if API fails

### **3. Place Search**
- **Auto-complete**: Real-time search suggestions
- **Structured Results**: Main text + secondary text display
- **Place Details**: Full address and coordinates on selection

---

## 🔍 **Code Structure**

### **Google Maps Service**
```typescript
// Location: civiclens-admin/src/lib/services/google-maps.ts

class GoogleMapsService {
  // Get current location with address
  async getLocationWithAddress(): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  }>

  // Search for places
  async searchPlaces(query: string): Promise<SearchResult[]>

  // Get place details by ID
  async getPlaceDetails(placeId: string): Promise<PlaceDetails>
}
```

### **Enhanced CreateReportModal**
```typescript
// Location: civiclens-admin/src/components/reports/CreateReportModal.tsx

// Features:
- Address search with dropdown results
- Current location with reverse geocoding
- Real-time coordinate display
- Improved user experience
```

---

## 🛡️ **Security Best Practices**

### **1. API Key Restrictions**
```javascript
// Restrict to your domains only
const allowedDomains = [
  'localhost:3000',
  'your-domain.com',
  '*.your-domain.com'
];
```

### **2. Rate Limiting**
- Monitor API usage in Google Cloud Console
- Set up billing alerts
- Implement client-side caching

### **3. Error Handling**
```typescript
// Graceful fallback if Google Maps fails
try {
  const address = await googleMapsService.reverseGeocode(lat, lng);
} catch (error) {
  // Fallback to coordinate-based description
  const address = `Near ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;
}
```

---

## 📊 **API Usage Optimization**

### **1. Caching Strategy**
- Cache reverse geocoding results for 5 minutes
- Cache place search results for 1 minute
- Use browser localStorage for frequently accessed places

### **2. Request Optimization**
- Debounce search requests (300ms)
- Limit search results to 10 items
- Use component restrictions for India (`country: 'IN'`)

### **3. Cost Management**
```typescript
// Optimize API calls
const config = {
  language: 'en',
  region: 'IN',
  componentRestrictions: { country: 'IN' },
  types: ['address', 'establishment', 'geocode']
};
```

---

## 🧪 **Testing**

### **1. Manual Testing**
- [ ] Current location button works
- [ ] Address search returns relevant results
- [ ] Place selection updates coordinates
- [ ] Coordinates display correctly
- [ ] Fallback works without API key

### **2. Error Scenarios**
- [ ] No internet connection
- [ ] Invalid API key
- [ ] API quota exceeded
- [ ] Location permission denied
- [ ] GPS unavailable

### **3. Performance Testing**
- [ ] Search response time < 1 second
- [ ] Location fetch time < 3 seconds
- [ ] No memory leaks with repeated use

---

## 🚀 **Production Deployment**

### **1. Environment Setup**
```bash
# Production environment variables
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=prod_api_key_here
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
```

### **2. API Key Security**
- Use separate API keys for dev/staging/prod
- Set up proper domain restrictions
- Monitor usage and set billing alerts
- Rotate keys regularly

### **3. Performance Monitoring**
- Track API response times
- Monitor error rates
- Set up alerts for quota limits
- Log failed geocoding attempts

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **"Google Maps API not loaded"**
```typescript
// Solution: Check API key and network connectivity
if (!window.google) {
  console.error('Google Maps API not loaded');
  // Fallback to basic location
}
```

#### **"Geocoding failed"**
```typescript
// Solution: Check API key permissions and quota
try {
  const result = await fetch(geocodingUrl);
  if (!result.ok) {
    throw new Error(`HTTP ${result.status}`);
  }
} catch (error) {
  // Use coordinate fallback
}
```

#### **"No results found"**
```typescript
// Solution: Expand search criteria or use fallback
if (results.length === 0) {
  // Try broader search or show manual input
}
```

---

## 📈 **Future Enhancements**

### **1. Advanced Features**
- [ ] Map visualization in report details
- [ ] Geofencing for area-based routing
- [ ] Heatmap for issue density
- [ ] Route optimization for officers

### **2. Offline Support**
- [ ] Cache frequently used addresses
- [ ] Offline map tiles
- [ ] Sync location data when online

### **3. Analytics Integration**
- [ ] Location-based report analytics
- [ ] Geographic clustering
- [ ] Area performance metrics

---

## 📋 **API Pricing (Reference)**

### **Google Maps Platform Pricing**
- **Geocoding API**: $5 per 1,000 requests
- **Places API**: $17 per 1,000 requests
- **Maps JavaScript API**: $7 per 1,000 loads

### **Cost Optimization Tips**
- Use session tokens for Places API
- Implement client-side caching
- Set up billing alerts
- Monitor usage regularly

---

## ✅ **Conclusion**

The Google Maps integration enhances the CivicLens platform with:

- **Better User Experience**: Accurate location input
- **Professional Quality**: Government-grade location services
- **Scalable Architecture**: Production-ready implementation
- **Cost Effective**: Optimized API usage

The integration is now ready for production use with proper API key configuration! 🎉