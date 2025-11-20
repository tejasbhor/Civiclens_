# Biometric Authentication Guide

## Overview

The CivicLens mobile app now supports biometric authentication (Face ID, Touch ID, Fingerprint, etc.) for quick and secure login. This feature uses the open-source `expo-local-authentication` package.

## Features

✅ **Biometric Availability Check** - Automatically detects if device supports biometrics
✅ **Multiple Biometric Types** - Supports Face ID, Touch ID, Fingerprint, and Iris recognition
✅ **Secure Credential Storage** - Uses hardware-backed encryption via expo-secure-store
✅ **User-Friendly Setup** - Optional prompt after successful login
✅ **Settings Management** - Enable/disable biometric login from settings
✅ **Fallback Support** - Allows device passcode as fallback
✅ **Error Handling** - Comprehensive error messages for all failure scenarios

## Architecture

### Core Components

#### 1. BiometricAuth Service (`src/shared/services/biometric/biometricAuth.ts`)

Main service class that handles all biometric operations:

- `checkAvailability()` - Check if biometric hardware exists and credentials are enrolled
- `authenticate()` - Perform biometric authentication with custom prompts
- `getBiometricTypeName()` - Get user-friendly name (Face ID, Touch ID, etc.)
- `enableBiometric()` - Enable biometric login for the app
- `disableBiometric()` - Disable biometric login
- `authenticateAndGetCredentials()` - Authenticate and retrieve stored phone number
- `storeCredentialsForBiometric()` - Store phone number for biometric login
- `clearBiometricCredentials()` - Clear all biometric data

#### 2. Auth Store Integration (`src/store/authStore.ts`)

Extended the Zustand auth store with biometric state and actions:

**State:**
- `biometricCapabilities` - Device biometric capabilities
- `isBiometricEnabled` - Whether user has enabled biometric login

**Actions:**
- `checkBiometricCapabilities()` - Check device capabilities
- `enableBiometric(phone)` - Enable biometric for a phone number
- `disableBiometric()` - Disable biometric login
- `authenticateWithBiometric()` - Authenticate and restore session

#### 3. UI Components

**BiometricLoginButton** (`src/features/auth/components/BiometricLoginButton.tsx`)
- Displays on login screen when biometric is available and enabled
- Shows appropriate icon and text based on biometric type
- Handles authentication and success/error callbacks

**BiometricSetupPrompt** (`src/features/auth/components/BiometricSetupPrompt.tsx`)
- Modal prompt shown after successful login
- Allows users to enable biometric authentication
- Can be skipped if user prefers not to use biometrics

**BiometricSettings** (`src/features/auth/components/BiometricSettings.tsx`)
- Settings UI for managing biometric authentication
- Toggle to enable/disable biometric login
- Test button to verify biometric works
- Shows appropriate messages when biometric is unavailable

## Usage

### 1. Display Biometric Login Button

Add to your login screen:

```tsx
import { BiometricLoginButton } from '@/features/auth/components';

<BiometricLoginButton
  onSuccess={(phone) => {
    // Handle successful biometric login
    console.log('Authenticated for phone:', phone);
  }}
  onError={(error) => {
    // Handle error
    console.error('Biometric error:', error);
  }}
/>
```

### 2. Prompt User to Enable Biometric After Login

Show setup prompt after successful OTP/password login:

```tsx
import { BiometricSetupPrompt } from '@/features/auth/components';

const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

// After successful login
const handleLoginSuccess = (phone: string) => {
  setShowBiometricPrompt(true);
};

<BiometricSetupPrompt
  visible={showBiometricPrompt}
  phone={userPhone}
  onClose={() => setShowBiometricPrompt(false)}
  onSetupComplete={() => {
    console.log('Biometric setup complete');
  }}
/>
```

### 3. Add Biometric Settings to Profile/Settings Screen

```tsx
import { BiometricSettings } from '@/features/auth/components';

<BiometricSettings phone={user.phone} />
```

### 4. Programmatic Usage

Use the BiometricAuth service directly:

```tsx
import { BiometricAuth } from '@shared/services/biometric';

// Check if biometric is available
const capabilities = await BiometricAuth.checkAvailability();
if (capabilities.isAvailable) {
  console.log('Biometric available:', BiometricAuth.getBiometricTypeName(capabilities.supportedTypes));
}

// Authenticate user
const result = await BiometricAuth.authenticate('Login to CivicLens');
if (result.success) {
  console.log('Authentication successful');
} else {
  console.error('Authentication failed:', result.error);
}

// Enable biometric for a user
await BiometricAuth.storeCredentialsForBiometric('+919876543210');
await BiometricAuth.enableBiometric();

// Check if enabled
const isEnabled = await BiometricAuth.isBiometricEnabled();
```

## Security Considerations

### Secure Storage

All biometric-related data is stored using `expo-secure-store`, which provides:
- Hardware-backed encryption when available
- Keychain storage on iOS
- Keystore storage on Android
- Automatic encryption at rest

### Stored Data

The following data is stored securely:
- `biometric_enabled` - Boolean flag indicating if biometric is enabled
- `biometric_phone` - Phone number associated with biometric login
- `auth_token` - JWT access token (already stored for regular auth)
- `refresh_token` - JWT refresh token (already stored for regular auth)

### Authentication Flow

1. User enables biometric → Authenticate once to verify it works
2. Store phone number securely
3. On subsequent logins → Authenticate with biometric
4. If successful → Retrieve stored tokens and restore session
5. If tokens expired → User must login with OTP/password again

### Fallback Mechanisms

- Device passcode can be used as fallback (configurable)
- If biometric fails, user can still login with OTP/password
- Biometric can be disabled at any time from settings

## Platform-Specific Behavior

### iOS
- Uses Face ID or Touch ID based on device
- Requires `NSFaceIDUsageDescription` in Info.plist (handled by Expo)
- Fallback to device passcode available
- Custom fallback label supported

### Android
- Uses Fingerprint, Face, or Iris recognition based on device
- Requires `USE_BIOMETRIC` permission (handled by Expo)
- Fallback to device PIN/pattern/password
- Custom cancel label supported

## Error Handling

The implementation handles various error scenarios:

| Error | Description | User Action |
|-------|-------------|-------------|
| `user_cancel` | User cancelled authentication | Try again or use alternative login |
| `system_cancel` | System cancelled (e.g., app backgrounded) | Try again |
| `lockout` | Too many failed attempts | Wait and try again |
| `lockout_permanent` | Biometric locked permanently | Use device passcode |
| `not_enrolled` | No biometric credentials enrolled | Set up biometrics in device settings |
| `not_available` | Biometric hardware not available | Use alternative login method |

## Testing

### Test on Physical Device

Biometric authentication requires a physical device with biometric hardware. It will not work on simulators/emulators (except iOS Simulator with enrolled Face ID).

### iOS Simulator Testing

1. Open Simulator
2. Go to Features → Face ID → Enrolled
3. Use Features → Face ID → Matching Face to simulate successful authentication
4. Use Features → Face ID → Non-matching Face to simulate failure

### Android Emulator Testing

1. Create AVD with API 28+ and fingerprint sensor
2. Go to Settings → Security → Fingerprint
3. Enroll a fingerprint using the emulator's extended controls
4. Use extended controls to simulate fingerprint touch

## Requirements Met

This implementation satisfies **Requirement 13.4** from the requirements document:

✅ Integrate expo-local-authentication (Face ID, Touch ID, Biometrics)
✅ Implement biometric availability check
✅ Create biometric login flow
✅ Open Source: expo-local-authentication

## Future Enhancements

Potential improvements for future iterations:

1. **Biometric for Sensitive Actions** - Require biometric for sensitive operations (e.g., deleting reports)
2. **Multi-Device Support** - Allow biometric on multiple devices
3. **Biometric Timeout** - Require re-authentication after certain period
4. **Analytics** - Track biometric usage and success rates
5. **Accessibility** - Enhanced support for users with disabilities

## Troubleshooting

### Biometric Not Available

**Problem:** Button doesn't show or settings show "not available"

**Solutions:**
- Ensure device has biometric hardware
- Check that biometric credentials are enrolled in device settings
- Verify app has necessary permissions
- Restart the app

### Authentication Fails

**Problem:** Biometric authentication always fails

**Solutions:**
- Check if biometric is locked due to too many failed attempts
- Verify enrolled biometric credentials work in device settings
- Try disabling and re-enabling biometric in app settings
- Clear app data and re-enroll

### Stored Credentials Not Found

**Problem:** "No saved credentials found" error

**Solutions:**
- Ensure biometric was properly enabled after login
- Check that phone number was stored correctly
- Try disabling and re-enabling biometric
- Login with OTP/password and enable biometric again

## Dependencies

- `expo-local-authentication` - ^14.0.1 (or latest)
- `expo-secure-store` - ^13.0.2 (or latest)
- `zustand` - ^5.0.8 (or latest)

## References

- [Expo Local Authentication Docs](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [Expo Secure Store Docs](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [iOS Face ID Guidelines](https://developer.apple.com/design/human-interface-guidelines/face-id-and-touch-id)
- [Android Biometric Guidelines](https://developer.android.com/training/sign-in/biometric-auth)
