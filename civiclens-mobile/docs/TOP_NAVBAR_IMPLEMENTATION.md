# Top Navbar Component - Implementation Guide

## Overview
Created a reusable `TopNavbar` component that provides consistent navigation UI across all screens in the CivicLens mobile app. The navbar matches the dashboard design with a blue gradient background and dynamic content support.

## Component Location
`src/shared/components/TopNavbar.tsx`

## Features
- **Consistent Design**: Blue gradient (#1976D2 → #1565C0) matching dashboard
- **Dynamic Content**: Supports different configurations per screen
- **Flexible Actions**: Customizable left and right action buttons
- **Notification Badge**: Built-in support for notification counts
- **Location Selector**: Optional location display with dropdown
- **Search Bar**: Optional integrated search functionality
- **Back Navigation**: Automatic back button support

## Props

```typescript
interface TopNavbarProps {
  title?: string;                    // Page title
  showBack?: boolean;                // Show back button
  showLocation?: boolean;            // Show location selector
  location?: string;                 // Location text
  showNotifications?: boolean;       // Show notification icon
  notificationCount?: number;        // Notification badge count
  showProfile?: boolean;             // Show profile icon
  showLanguage?: boolean;            // Show language selector
  showSearch?: boolean;              // Show search bar
  onLocationPress?: () => void;      // Location click handler
  onNotificationPress?: () => void;  // Notification click handler
  onProfilePress?: () => void;       // Profile click handler
  onLanguagePress?: () => void;      // Language click handler
  onSearchPress?: () => void;        // Search click handler
  rightActions?: React.ReactNode;    // Custom right actions
}
```

## Usage Examples

### 1. Dashboard (Home Screen)
```tsx
<TopNavbar
  showLocation={true}
  location="Navi Mumbai, Kharghar"
  showLanguage={true}
  showNotifications={true}
  notificationCount={unreadCount}
  showProfile={true}
  showSearch={true}
  onLocationPress={() => console.log('Open location picker')}
  onNotificationPress={() => navigation.navigate('Notifications')}
  onProfilePress={() => navigation.navigate('Profile')}
  onLanguagePress={() => console.log('Open language selector')}
  onSearchPress={() => console.log('Open search')}
/>
```

### 2. Profile Screen
```tsx
<TopNavbar
  title="Profile"
  showNotifications={true}
  onNotificationPress={() => navigation.navigate('Notifications')}
/>
```

### 3. Notifications Screen
```tsx
<TopNavbar
  title="Notifications"
  showBack={true}
  rightActions={
    unreadCount > 0 ? (
      <>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{unreadCount}</Text>
        </View>
        <TouchableOpacity onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={24} color="#FFF" />
        </TouchableOpacity>
      </>
    ) : null
  }
/>
```

### 4. Report Detail Screen
```tsx
<TopNavbar
  title={`Report #${report.report_number}`}
  showBack={true}
  rightActions={
    <TouchableOpacity onPress={handleCallSupport}>
      <Ionicons name="help-circle-outline" size={24} color="#FFF" />
    </TouchableOpacity>
  }
/>
```

### 5. My Reports Screen
```tsx
<TopNavbar
  title="My Reports"
  rightActions={
    <TouchableOpacity onPress={() => navigation.navigate('SubmitReport')}>
      <Ionicons name="add-circle" size={28} color="#FFF" />
    </TouchableOpacity>
  }
/>
```

## Implementation Steps

### 1. Import the Component
```tsx
import { TopNavbar } from '@shared/components';
```

### 2. Replace Existing Header
Remove old header implementation and replace with TopNavbar:

**Before:**
```tsx
<SafeAreaView style={styles.container} edges={['top']}>
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-back" size={24} color="#1E293B" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>My Screen</Text>
  </View>
  {/* Content */}
</SafeAreaView>
```

**After:**
```tsx
<View style={styles.container}>
  <TopNavbar
    title="My Screen"
    showBack={true}
  />
  <View style={styles.content}>
    {/* Content */}
  </View>
</View>
```

### 3. Update Styles
Add margin-top to content to avoid navbar overlap:

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    marginTop: 110, // Space for navbar
  },
});
```

### 4. Remove Old Header Styles
Delete unused header-related styles:
- `header`
- `headerGradient`
- `headerContent`
- `headerTitle`
- `backButton`
- etc.

## Screens Updated

✅ **ProfileScreen** - Title with notifications
✅ **NotificationsScreen** - Back button with custom actions
✅ **ReportDetailScreen** - Dynamic title with help button
✅ **MyReportsScreen** - Title with add report button

## Benefits

1. **Consistency**: All screens now have the same navbar design
2. **Maintainability**: Single source of truth for navbar UI
3. **Flexibility**: Easy to customize per screen needs
4. **Reusability**: Can be used across all app screens
5. **Theme Compliance**: Matches dashboard gradient and colors

## Design Specifications

- **Gradient**: Linear gradient from #1976D2 to #1565C0
- **Height**: ~110px (including status bar padding)
- **Text Color**: White (#FFF)
- **Icon Size**: 22-28px depending on type
- **Padding**: 16px horizontal, 50px top (status bar), 16px bottom
- **Badge Color**: Red (#FF3B30) for notifications
- **Search Bar**: White background with rounded corners (28px radius)

## Future Enhancements

- [ ] Add animation for expand/collapse
- [ ] Support for custom gradients per screen
- [ ] Dark mode support
- [ ] Accessibility improvements (screen reader labels)
- [ ] Haptic feedback on button presses
- [ ] Animated notification badge
- [ ] Search autocomplete integration
