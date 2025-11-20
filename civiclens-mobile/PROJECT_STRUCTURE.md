# CivicLens Mobile - Project Structure

## Overview

This document describes the feature-based architecture of the CivicLens mobile application.

## Directory Structure

```
civiclens-mobile/
├── src/
│   ├── features/              # Feature modules (domain-driven)
│   │   ├── auth/             # Authentication feature
│   │   ├── reports/          # Issue reporting feature
│   │   ├── map/              # Map and location feature
│   │   ├── profile/          # User profile feature
│   │   └── ...               # Other features
│   │
│   ├── navigation/           # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   │
│   ├── shared/               # Shared resources
│   │   ├── components/       # Reusable UI components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   └── ...
│   │   │
│   │   ├── config/           # App configuration
│   │   │   └── env.ts        # Environment config
│   │   │
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useLocation.ts
│   │   │   └── ...
│   │   │
│   │   ├── services/         # API and external services
│   │   │   ├── api.ts        # HTTP client
│   │   │   ├── storage.ts    # Local storage
│   │   │   └── ...
│   │   │
│   │   ├── theme/            # Design system
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── types/            # Shared TypeScript types
│   │   │   ├── api.ts
│   │   │   ├── models.ts
│   │   │   └── ...
│   │   │
│   │   └── utils/            # Utility functions
│   │       ├── validation.ts
│   │       ├── formatting.ts
│   │       └── ...
│   │
│   └── store/                # Global state management (Zustand)
│       ├── authStore.ts
│       ├── reportStore.ts
│       └── ...
│
├── assets/                   # Static assets
│   ├── images/
│   ├── fonts/
│   └── ...
│
├── .env.development          # Development environment variables
├── .env.staging              # Staging environment variables
├── .env.production           # Production environment variables
├── .env.example              # Environment variables template
├── app.json                  # Expo configuration
├── babel.config.js           # Babel configuration
├── tsconfig.json             # TypeScript configuration
├── .eslintrc.js              # ESLint configuration
├── .prettierrc.js            # Prettier configuration
└── App.tsx                   # App entry point
```

## Feature Module Structure

Each feature follows a consistent structure:

```
features/[feature-name]/
├── components/           # Feature-specific components
│   ├── FeatureComponent.tsx
│   └── ...
├── screens/             # Feature screens
│   ├── FeatureScreen.tsx
│   └── ...
├── hooks/               # Feature-specific hooks
│   └── useFeature.ts
├── services/            # Feature-specific services
│   └── featureService.ts
├── types/               # Feature-specific types
│   └── types.ts
└── index.ts             # Public API exports
```

## Design Principles

### 1. Feature-Based Organization
- Code is organized by feature/domain rather than technical layer
- Each feature is self-contained with its own components, screens, and logic
- Promotes modularity and easier maintenance

### 2. Shared Resources
- Common components, utilities, and services are in the `shared` directory
- Prevents duplication and ensures consistency
- Easy to locate and reuse across features

### 3. Type Safety
- TypeScript strict mode enabled
- Comprehensive type definitions
- Catch errors at compile time

### 4. Separation of Concerns
- Business logic separated from UI components
- Services handle API calls and external integrations
- Stores manage global state
- Components focus on presentation

### 5. Path Aliases
- Use `@/` for src root
- Use `@shared/` for shared resources
- Use `@features/` for feature modules
- Use `@navigation/` for navigation
- Use `@store/` for state management

## Code Style

- **ESLint**: Enforces code quality and consistency
- **Prettier**: Automatic code formatting
- **TypeScript**: Strict type checking enabled
- **Naming Conventions**:
  - Components: PascalCase (e.g., `UserProfile.tsx`)
  - Files: camelCase (e.g., `userService.ts`)
  - Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
  - Hooks: camelCase with 'use' prefix (e.g., `useAuth.ts`)

## Environment Configuration

Three environments are supported:
- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

Environment variables are prefixed with `EXPO_PUBLIC_` to be accessible in the app.

## State Management

- **Zustand**: Lightweight global state management
- **React Query**: Server state and data fetching
- **AsyncStorage**: Persistent local storage
- **SecureStore**: Secure credential storage

## Navigation

- **React Navigation**: Native navigation library
- Stack navigation for hierarchical flows
- Tab navigation for main app sections
- Deep linking support for notifications

## Testing Strategy

- Unit tests for utilities and services
- Component tests for UI components
- Integration tests for feature flows
- E2E tests for critical user journeys
