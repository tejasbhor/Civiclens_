# Rebuild Instructions for Maps

The map module requires native code, so you need to rebuild the app.

## Quick Fix

### Option 1: Prebuild and Run (Recommended)

```bash
# Clear cache and prebuild
npx expo prebuild --clean

# For Android
npx expo run:android

# For iOS (Mac only)
npx expo run:ios
```

### Option 2: Development Build

```bash
# Install expo-dev-client if not already installed
npx expo install expo-dev-client

# Prebuild
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS (Mac only)
npx expo run:ios
```

## Why This is Needed

- `react-native-maps` requires native modules
- Expo Go doesn't support custom native modules
- You need a development build or standalone build

## After Rebuild

Once rebuilt, the app will work with:
- ✅ OpenStreetMap integration
- ✅ Interactive maps
- ✅ Custom markers
- ✅ Location tracking

## Troubleshooting

### Error: "RNMapsAirModule could not be found"
- Run `npx expo prebuild --clean`
- Delete `android/` and `ios/` folders
- Run `npx expo run:android` or `npx expo run:ios`

### Build fails?
- Make sure you have Android Studio (for Android) or Xcode (for iOS)
- Check that all dependencies are installed: `npm install`
- Try clearing cache: `npx expo start -c`

## Alternative: Use Expo Go Compatible Version

If you can't rebuild, you can temporarily use a simpler map placeholder until you can create a development build.
