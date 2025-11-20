/**
 * Screen Padding Utilities
 * Consistent bottom padding calculations for screens with bottom tab navigation
 */

import { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Calculate bottom padding for screens with bottom tab navigation
 * Ensures content is not hidden behind the tab bar
 * 
 * @param insets - Safe area insets from useSafeAreaInsets()
 * @param extraPadding - Additional padding beyond the tab bar (default: 100)
 * @returns Bottom padding value
 */
export const getBottomTabPadding = (insets: EdgeInsets, extraPadding: number = 100): number => {
  return insets.bottom + extraPadding;
};

/**
 * Calculate tab bar height including safe area
 * Used for positioning elements relative to the tab bar
 * 
 * @param insets - Safe area insets from useSafeAreaInsets()
 * @param tabBarIconHeight - Height of the tab bar icons area (default: 60)
 * @returns Total tab bar height
 */
export const getTabBarHeight = (insets: EdgeInsets, tabBarIconHeight: number = 60): number => {
  const bottomPadding = Math.max(insets.bottom, 20);
  return tabBarIconHeight + bottomPadding;
};

/**
 * Get content container style with proper bottom padding
 * Ready-to-use style object for ScrollView contentContainerStyle
 * 
 * @param insets - Safe area insets from useSafeAreaInsets()
 * @param baseStyle - Base style object to merge with
 * @param extraPadding - Additional padding beyond the tab bar (default: 100)
 * @returns Style object with proper bottom padding
 */
export const getContentContainerStyle = (
  insets: EdgeInsets, 
  baseStyle: any = {}, 
  extraPadding: number = 100
) => {
  return [
    baseStyle,
    { paddingBottom: getBottomTabPadding(insets, extraPadding) }
  ];
};

/**
 * Constants for consistent spacing
 */
export const SCREEN_PADDING = {
  HORIZONTAL: 16,
  VERTICAL: 16,
  BOTTOM_TAB_EXTRA: 100, // Extra space beyond tab bar
  TAB_BAR_HEIGHT: 60,    // Icon area height
  MIN_BOTTOM_PADDING: 20, // Minimum bottom padding
} as const;
