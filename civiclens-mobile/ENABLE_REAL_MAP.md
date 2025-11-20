# Enable Real OpenStreetMap

The real map implementation is preserved and ready to use!

## Quick Switch (2 Steps)

### Step 1: Uncomment the MapView Import

In `CitizenHomeScreen.tsx`, line 21:

**Change from:**
```typescript
// MapView temporarily disabled - requires development build
// import MapView, { Marker, PROVIDER_DEFAULT, Region, UrlTile } from 'react-native-maps';
```

**To:**
```typescript
// Real OpenStreetMap - No API Key Required!
import MapView, { Marker, PROVIDER_DEFAULT, Region, UrlTile } from 'react-native-maps';
```

### Step 2: Replace Placeholder with Real Map

Find the map placeholder section (around line 85) and replace:

**Replace this:**
```typescript
{/* Map Placeholder - Requires Development Build for Full Map */}
<View style={styles.mapPlaceholder}>
  {/* ... placeholder code ... */}
</View>
```

**With this:**
```typescript
{/* Interactive Map - OpenStreetMap (Open Source, No API Key) */}
<MapView
  style={styles.map}
  provider={PROVIDER_DEFAULT}
  initialRegion={mapRegion}
  region={mapRegion}
  showsUserLocation={true}
  showsMyLocationButton={true}
  showsCompass={true}
  showsScale={true}
  loadingEnabled={true}
  loadingIndicatorColor="#1976D2"
  onRegionChangeComplete={setMapRegion}
  mapType="standard"
>
  {/* OpenStreetMap Tiles - Free and Open Source */}
  <UrlTile
    urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    maximumZ={19}
    flipY={false}
    zIndex={-1}
  />

  {/* User Location Marker */}
  {userLocation && (
    <Marker
      coordinate={{
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }}
      title="Your Location"
      description="You are here"
    >
      <View style={styles.userLocationMarker}>
        <View style={styles.userLocationDot} />
      </View>
    </Marker>
  )}

  {/* Nearby Reports Markers */}
  {nearbyReports.map((report) => (
    <Marker
      key={report.id}
      coordinate={{
        latitude: report.latitude,
        longitude: report.longitude,
      }}
      title={report.title}
      description={report.category}
    >
      <View style={[
        styles.customMarker,
        report.severity === 'critical' && styles.markerCritical,
        report.severity === 'high' && styles.markerHigh,
        report.severity === 'medium' && styles.markerMedium,
        report.severity === 'low' && styles.markerLow,
      ]}>
        <Ionicons name="alert-circle" size={20} color="#FFF" />
      </View>
    </Marker>
  ))}
</MapView>
```

### Step 3: Update Styles

Replace the placeholder styles with real map styles:

**Replace:**
```typescript
mapPlaceholder: { ... }
mapBackground: { ... }
// etc.
```

**With:**
```typescript
map: {
  ...StyleSheet.absoluteFillObject,
},
customMarker: {
  width: 36,
  height: 36,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 3,
  borderColor: '#FFF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
},
userLocationMarker: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#2196F3',
  borderWidth: 3,
  borderColor: '#FFF',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
},
userLocationDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#FFF',
},
```

### Step 4: Build and Run

```bash
# Prebuild with native modules
npx expo prebuild --clean

# Run on Android
npx expo run:android

# Or iOS (Mac only)
npx expo run:ios
```

## What You Get

✅ **Real OpenStreetMap** - Interactive, zoomable, pannable  
✅ **No API Keys** - Completely free and open source  
✅ **User Location** - Blue dot showing your position  
✅ **Report Markers** - Color-coded by severity  
✅ **Tap for Info** - Marker details on tap  
✅ **Production Ready** - Used by major apps worldwide  

## Files to Reference

All the real map code is documented in:
- `MAP_SETUP.md` - Full OpenStreetMap setup guide
- `REBUILD_INSTRUCTIONS.md` - How to build with native modules
- `app.json` - Already configured with react-native-maps plugin

Everything is ready - just uncomment and rebuild! 🚀
