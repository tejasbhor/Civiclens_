# Dashboard Improvements Needed

## Current Status
✅ Task 5.1-5.2, 5.7 completed
✅ Backend API endpoint created (`/api/v1/reports/user/{user_id}/stats`)
✅ Basic dashboard layout with collapsible sections
✅ Bottom tab navigation

## Remaining Issues to Fix

### 1. Navigation Bar
- [ ] Move tab bar higher with rounded top corners
- [ ] Add shadow/elevation for modern look
- [ ] Ensure proper spacing from bottom

### 2. Bottom Sheet Modes
Need 3 modes instead of 2:
- [ ] **Minimized**: Only show pill handle + minimal preview
- [ ] **Default**: Show stats cards + Report button (current collapsed)
- [ ] **Expanded**: Show full details + quick actions (current expanded)

### 3. UI Polish
- [ ] Remove chevron icon from section header
- [ ] Keep only pill-shaped handle for dragging
- [ ] Make handle more prominent and draggable

### 4. Map Integration
- [ ] Install and configure `react-native-maps` properly for Expo
- [ ] Show real interactive map with user location
- [ ] Display nearby report markers
- [ ] Handle map permissions

### 5. Real Data Integration
- [ ] Remove hardcoded mock data from dashboard store
- [ ] Fetch real stats from backend API
- [ ] Handle loading states properly
- [ ] Show actual user data

### 6. Notification Bell
- [ ] Create notifications screen
- [ ] Fetch unread notification count
- [ ] Show badge with count
- [ ] Navigate to notifications on tap

### 7. Profile Section
- [ ] Create profile screen
- [ ] Show user info (name, phone, email)
- [ ] Add logout functionality
- [ ] Show user stats and reputation

## Implementation Priority

1. **HIGH**: Fix data fetching (remove hardcoded data)
2. **HIGH**: Implement 3-mode bottom sheet
3. **MEDIUM**: Polish navigation bar
4. **MEDIUM**: Add notification and profile screens
5. **LOW**: Integrate real map (requires native config)

## Notes
- Dashboard is 80% complete
- Main functionality works
- Needs polish and real data integration
- Map requires Expo configuration or EAS build
