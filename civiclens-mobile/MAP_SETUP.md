# OpenStreetMap Setup for CivicLens Mobile

## 100% Open Source Map Implementation

The app uses **react-native-maps** with **OpenStreetMap** tiles - completely free and open source!

## Why OpenStreetMap?

✅ **No API Keys Required** - Zero cost, no billing  
✅ **Open Source** - Community-driven map data  
✅ **No Usage Limits** - Unlimited map loads  
✅ **Privacy-Friendly** - No tracking by big tech  
✅ **Production-Ready** - Used by major apps worldwide  

## Setup Instructions

### No Setup Required! 🎉

The map works out of the box with OpenStreetMap tiles:
- Tile Server: `https://tile.openstreetmap.org`
- No API keys needed
- No configuration required
- Just run the app!

```bash
# Start the app
npm start

# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

## Features Implemented

✅ **Interactive Map** with OpenStreetMap  
✅ **User Location** marker (blue dot)  
✅ **Nearby Reports** markers with severity colors:
  - 🔴 Critical (Red)
  - 🟠 High (Orange)
  - 🟡 Medium (Yellow)
  - 🟢 Low (Green)

✅ **Map Controls**:
  - My Location button
  - Compass
  - Scale
  - Zoom controls

✅ **Custom Markers** with icons  
✅ **Marker Info** (title, description on tap)  
✅ **Region Updates** (map follows user location)  

## Alternative Tile Providers (All Free!)

You can switch to other open-source tile providers:

### 1. OpenStreetMap (Default)
```typescript
<UrlTile
  urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  maximumZ={19}
/>
```

### 2. Carto (Light/Dark themes)
```typescript
// Light theme
<UrlTile
  urlTemplate="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
  maximumZ={19}
/>

// Dark theme
<UrlTile
  urlTemplate="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
  maximumZ={19}
/>
```

### 3. Stamen (Artistic styles)
```typescript
// Terrain
<UrlTile
  urlTemplate="https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png"
  maximumZ={18}
/>

// Watercolor
<UrlTile
  urlTemplate="https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png"
  maximumZ={18}
/>
```

## Troubleshooting

### Map not showing?
1. Check internet connection
2. Verify tile URL is accessible
3. Check console for errors
4. Ensure location permissions are granted

### Markers not appearing?
1. Verify `nearbyReports` data has latitude/longitude
2. Check marker coordinates are valid
3. Ensure map region includes marker locations

## Production Checklist

- [x] No API keys required ✅
- [x] No billing or costs ✅
- [x] Works on both Android and iOS ✅
- [ ] Test on real devices
- [ ] Implement marker clustering for many reports
- [ ] Handle location permissions properly
- [ ] Add offline map caching (optional)
- [ ] Consider self-hosting tiles for high traffic (optional)

## Best Practices

1. **Respect OSM Usage Policy**: Don't abuse the free tile servers
2. **Cache Tiles**: Implement caching to reduce server load
3. **Self-Host for Scale**: For high-traffic apps, host your own tile server
4. **Attribution**: Always show "© OpenStreetMap contributors"
5. **Error Handling**: Handle network errors gracefully

## Self-Hosting Tiles (Optional)

For production apps with high traffic, consider hosting your own tile server:

1. **TileServer GL** - https://github.com/maptiler/tileserver-gl
2. **OpenMapTiles** - https://openmaptiles.org/
3. **Tegola** - https://tegola.io/

This gives you full control and unlimited usage!
