# 🚀 Build APK for Android - Complete Guide

## ✅ Pre-Build Verification Complete!

### **✅ Dependencies Check**
- react-native-maps: ✅ Installed (^1.26.18)
- expo-local-authentication: ✅ Installed (^17.0.7)
- All plugins configured: ✅
- All permissions set: ✅

### **✅ Map Implementation**
- Current: Using placeholders (works for build)
- After build: Can use real MapView component
- Configuration: ✅ Ready

### **✅ Biometric Authentication**
- Implementation: ✅ Complete
- Testing: ⚠️ Requires physical device

### **✅ Build Configuration**
- EAS configuration: ✅ Created (`eas.json`)
- App configuration: ✅ Valid (`app.json`)
- Package name: ✅ `com.civiclens.mobile`

---

## 🎯 Build Options

### **Option 1: Development Build (RECOMMENDED for Testing)**

**Best for:**
- Testing biometric authentication
- Testing maps
- Debugging
- Internal testing

**Command:**
```bash
eas build --platform android --profile development
```

**Features:**
- Includes developer tools
- Can connect to Metro bundler
- Faster iteration
- Debug mode

---

### **Option 2: Preview Build (For Distribution Testing)**

**Best for:**
- Testing production-like build
- Sharing with testers
- Performance testing

**Command:**
```bash
eas build --platform android --profile preview
```

**Features:**
- Optimized bundle
- No dev tools
- Production-like performance

---

### **Option 3: Production Build**

**Best for:**
- Final release
- Google Play Store submission
- End users

**Command:**
```bash
eas build --platform android --profile production
```

**Features:**
- Fully optimized
- Minified code
- Obfuscated
- Release signing

---

## 📋 Step-by-Step Build Process

### **Step 1: Pre-Build Checklist** ✅

Run these checks:

```bash
# 1. Install dependencies
cd d:/Civiclens/civiclens-mobile
npm install

# 2. Type check
npm run type-check

# 3. Check for errors (optional)
npm run lint
```

**Manual Checks:**
- [ ] Update production API URL if needed (in `src/shared/config/env.ts`)
- [ ] Assets exist (icon.png, splash-icon.png, adaptive-icon.png)
- [ ] No hardcoded test credentials

---

### **Step 2: Install EAS CLI**

```bash
# Global installation
npm install -g eas-cli

# Verify installation
eas --version
```

---

### **Step 3: Login to Expo Account**

```bash
eas login

# Or create account
eas register
```

**Note:** You'll need an Expo account (free).

---

### **Step 4: Configure Build (First Time Only)**

```bash
cd d:/Civiclens/civiclens-mobile
eas build:configure
```

**What this does:**
- Creates/updates `eas.json` ✅ (Already created)
- Links project to your Expo account
- Sets up build profiles

**When prompted:**
- Platform: **Android**
- Build profile: **All** (development, preview, production)

---

### **Step 5: Start Build**

#### **For Development Build (Recommended First):**
```bash
eas build --platform android --profile development
```

#### **For Preview Build:**
```bash
eas build --platform android --profile preview
```

#### **For Production Build:**
```bash
eas build --platform android --profile production
```

**Build Process:**
1. Code uploaded to Expo servers
2. Dependencies installed
3. Native code compiled
4. APK generated
5. Available for download (~15-20 minutes)

---

### **Step 6: Monitor Build**

**CLI Output:**
- Build ID
- Progress updates
- Build URL

**Web Dashboard:**
- Visit: https://expo.dev/accounts/[your-account]/projects/civiclens-mobile/builds
- Monitor progress
- View logs
- Download APK when complete

---

### **Step 7: Download APK**

**Option A: From Web Dashboard**
1. Go to https://expo.dev
2. Navigate to your project
3. Click "Builds"
4. Download completed build

**Option B: From CLI**
```bash
# List recent builds
eas build:list

# Download specific build
eas build:download --platform android
```

---

## 📱 Install APK on Device

### **Method 1: Direct Install**

1. **Enable Unknown Sources:**
   - Settings → Security → Install unknown apps
   - Enable for Chrome/Files app

2. **Transfer APK:**
   - USB cable
   - Or download directly on device
   - Or use Google Drive

3. **Install:**
   - Tap APK file
   - Follow prompts
   - Open app

---

### **Method 2: ADB Install**

```bash
# Connect device via USB
adb devices

# Install APK
adb install path/to/civiclens.apk

# Or if device shows in list
adb -d install civiclens.apk
```

---

## 🧪 Post-Build Testing

### **Essential Tests:**

1. **App Launch:**
   - [ ] App opens without crash
   - [ ] Splash screen shows correctly
   - [ ] No white screen

2. **Authentication:**
   - [ ] Login with OTP works
   - [ ] Login with password works
   - [ ] Logout works

3. **Biometric Lock:**
   - [ ] Go to Profile → Security
   - [ ] Enable biometric
   - [ ] Close app completely
   - [ ] Reopen app
   - [ ] Fingerprint prompt shows
   - [ ] Unlock works
   - [ ] Disable works

4. **Core Features:**
   - [ ] Dashboard loads
   - [ ] Report submission works
   - [ ] Camera works
   - [ ] Location permission granted
   - [ ] Image upload works
   - [ ] Offline submission works

5. **Maps:**
   - [ ] Map placeholder or real map shows
   - [ ] No crashes on map screen

---

## 🎯 Environment Configuration

### **Current Setup:**

**Development (auto-detects):**
```typescript
// src/shared/config/env.ts
API_BASE_URL: `http://${debuggerHost}:8000/api/v1`
// Auto-detects: http://192.168.1.33:8000/api/v1
```

**Production:**
```typescript
API_BASE_URL: 'https://api.civiclens.com/api'
```

### **To Change for Production Build:**

**Option 1: Update env.ts** (Before building)
```typescript
// src/shared/config/env.ts
const prodConfig: EnvConfig = {
  API_BASE_URL: 'https://your-actual-api.com/api/v1',  // ← Update this
  // ...
};
```

**Option 2: Use Environment Variable**
```bash
# Set environment
export EXPO_PUBLIC_ENV=production

# Then build
eas build --platform android --profile production
```

---

## 📦 Build Profiles Explained

### **Development Profile** (eas.json)
```json
"development": {
  "developmentClient": true,  // Can connect to Metro
  "distribution": "internal",  // Not for Play Store
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleDebug"
  }
}
```

**Use when:**
- Testing new features
- Debugging
- Rapid iteration

---

### **Preview Profile**
```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleRelease"
  }
}
```

**Use when:**
- Internal testing
- QA testing
- Performance testing
- Not for public release

---

### **Production Profile**
```json
"production": {
  "android": {
    "buildType": "apk",  // Or "aab" for Play Store
    "gradleCommand": ":app:assembleRelease"
  }
}
```

**Use when:**
- Final release
- Play Store submission
- End users

---

## 🔧 Troubleshooting

### **Build Fails: Native Dependencies**

**Error:** "Could not resolve react-native-maps"

**Solution:**
```bash
# Clear cache
npm cache clean --force

# Reinstall
rm -rf node_modules
npm install

# Try build again
eas build --platform android --profile development --clear-cache
```

---

### **Build Fails: Gradle Issues**

**Error:** "Task :app:assembleRelease FAILED"

**Solution:**
Check EAS build logs for specific error. Common fixes:
- Update Gradle version in android/build.gradle
- Clear build cache: `eas build --clear-cache`

---

### **Biometric Not Working**

**Issue:** Biometric prompt doesn't show

**Solution:**
1. Test on **physical device** (not emulator)
2. Ensure fingerprint/face is enrolled on device
3. Check device Settings → Security → Biometric

---

### **Maps Not Showing**

**Issue:** Maps show white screen or crash

**Current Status:**
- Using **placeholders** (blue background with grid)
- This is **intentional** and **correct**
- Real MapView will work in development/production builds

**To verify:**
- Placeholder should show: ✅
- No crashes: ✅
- Text says "Development build required": ✅

---

### **App Crashes on Launch**

**Debug steps:**
```bash
# Check device logs
adb logcat | grep -i "civiclens"

# Or filter for errors
adb logcat *:E

# Check specific error
adb logcat | grep -i "AndroidRuntime"
```

---

## 🎉 Build Complete Checklist

After successful build and install:

### **Functional Testing:**
- [ ] App installs successfully
- [ ] App opens without crash
- [ ] Login works (OTP and password)
- [ ] Dashboard loads
- [ ] Create report works
- [ ] Camera works
- [ ] Location works
- [ ] Biometric lock works
- [ ] Offline mode works
- [ ] Logout works

### **UI/UX Testing:**
- [ ] Splash screen looks good
- [ ] Navigation is smooth
- [ ] Maps show (placeholder or real)
- [ ] Bottom nav works
- [ ] All screens accessible

### **Performance:**
- [ ] App is responsive
- [ ] No lag or stuttering
- [ ] Images load properly
- [ ] Network requests complete

---

## 📚 Next Steps After Build

### **1. Test Thoroughly**
- Install on multiple devices
- Test all user flows
- Check offline functionality
- Verify biometric on different devices

### **2. Implement Real Maps (Optional)**
If you want real interactive maps instead of placeholders:

```bash
# Build includes react-native-maps support
# Just replace placeholder code with MapView
```

See `MAPS_IMPLEMENTATION_GUIDE.md` for details.

### **3. Gather Feedback**
- Share with team
- Internal testing
- Bug reports
- Feature requests

### **4. Prepare for Production**
- Update API URLs
- Remove debug code
- Add analytics
- Add crash reporting
- Build production APK

### **5. Play Store Submission**
```bash
# Build AAB for Play Store
eas build --platform android --profile production

# In app.json, set:
"android": {
  "buildType": "aab"  // Instead of "apk"
}
```

---

## 🚀 Quick Start Commands

**Complete build process in one go:**

```bash
# 1. Navigate to project
cd d:/Civiclens/civiclens-mobile

# 2. Install/update dependencies
npm install

# 3. Login (first time)
eas login

# 4. Build development APK
eas build --platform android --profile development

# 5. Wait for build to complete (~15-20 mins)

# 6. Download APK from provided link

# 7. Install on device and test!
```

---

## ✅ Summary

**What's Ready:**
- ✅ All dependencies installed
- ✅ Map support configured (using placeholders)
- ✅ Biometric authentication implemented
- ✅ Build configuration created
- ✅ Permissions set
- ✅ Plugins configured

**What You Need to Do:**
1. Run `eas login`
2. Run `eas build --platform android --profile development`
3. Wait for build
4. Download APK
5. Install and test

**Expected Result:**
- Working APK with all features
- Biometric authentication functional
- Maps show placeholders (or real maps if implemented)
- Offline-first submission works
- Production-ready mobile app! 🎉

---

## 🎯 Recommended First Build

```bash
eas build --platform android --profile development
```

**Why:**
- Includes dev tools
- Supports biometric
- Supports maps
- Fast to build
- Good for testing

**After testing development build:**
- Fix any issues
- Test thoroughly
- Then build preview/production

---

**✅ YOU'RE READY TO BUILD!** 🚀

Run:
```bash
eas build --platform android --profile development
```

And in 15-20 minutes, you'll have your APK! 📱
