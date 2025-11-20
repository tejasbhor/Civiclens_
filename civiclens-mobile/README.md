# CivicLens Mobile App

React Native mobile application for CivicLens civic engagement platform built with Expo.

## Prerequisites

- Node.js 18+ and npm
- Expo CLI
- Expo Go app on your mobile device (for testing)

## Getting Started

### Installation

```bash
npm install
```

### Running the App

#### Development Mode

```bash
npm start
```

This will start the Expo development server. You can then:

- Scan the QR code with Expo Go app (Android) or Camera app (iOS)
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator (macOS only)
- Press `w` to open in web browser

#### Platform-Specific Commands

```bash
npm run android  # Run on Android
npm run ios      # Run on iOS (macOS only)
npm run web      # Run in web browser
```

### Code Quality

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
npm run type-check    # Run TypeScript type checking
```

## Project Structure

```
civiclens-mobile/
├── src/
│   ├── features/          # Feature modules
│   ├── navigation/        # Navigation configuration
│   ├── shared/
│   │   ├── components/    # Reusable components
│   │   ├── config/        # App configuration
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── theme/         # Theme system
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── store/             # Global state management
├── assets/                # Images, fonts, etc.
└── App.tsx               # App entry point
```

## Environment Configuration

The app supports three environments:

- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

Copy `.env.example` and configure as needed.

## Tech Stack

- **Framework**: Expo SDK 54 / React Native 0.81
- **Language**: TypeScript (strict mode)
- **Navigation**: React Navigation 6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Storage**: Expo SecureStore, AsyncStorage
- **Camera**: Expo Camera
- **Location**: Expo Location

## Testing on Physical Device

1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Run `npm start`
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

## Building for Production

For production builds, you'll need to set up EAS Build:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

## Contributing

Please follow the code style enforced by ESLint and Prettier. Run `npm run lint:fix` and `npm run format` before committing.
