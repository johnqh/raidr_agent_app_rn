/**
 * useTabBarHeight - iOS
 *
 * Returns the bottom tab bar height for content padding.
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export function useTabBarHeight(): number {
  return useBottomTabBarHeight();
}
