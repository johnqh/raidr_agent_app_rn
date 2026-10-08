/**
 * Screen — every screen's frame: the {@link NavBar} on top, then the content
 * laid out by what it is.
 *
 * - `center` (default) — not a list (a form, a detail, a question): one
 *   column of readable width in the middle of the window. With
 *   `valign='center'` (a single question or call to action: Ask, a permission)
 *   it is also vertically centred while shorter than the window; `top` (long
 *   pages: settings, forms, details) starts under the bar like iOS.
 * - `list` — list content: the full width, for a {@link TileGrid} (a list
 *   when narrow, tiles when wide); other blocks inside stay readable width.
 * - `fill` — the content takes the whole area and handles its own scrolling
 *   (a web view, a map).
 *
 * `footer` sits fixed under the content (a Next / Run bar). Bottom padding
 * clears the mobile tab bar.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import NavBar from './NavBar';

/** Widest a `center` column gets. */
export const READABLE_WIDTH = 640;

export interface ScreenProps {
  title: string;
  layout?: 'center' | 'list' | 'fill';
  /** Control on the right of the nav bar. */
  headerRight?: React.ReactNode;
  hideBack?: boolean;
  /** Fixed bar under the content. */
  footer?: React.ReactNode;
  /** `center` layout only: vertical placement while the content is short. */
  valign?: 'center' | 'top';
  /** Turn scrolling off for a moment (e.g. while dragging a row). */
  scrollEnabled?: boolean;
  children: React.ReactNode;
  testID?: string;
}

export default function Screen({
  title,
  layout = 'center',
  headerRight,
  hideBack,
  footer,
  valign = 'top',
  scrollEnabled = true,
  children,
  testID,
}: ScreenProps) {
  const tabBarHeight = useTabBarHeight();
  const bottom = (footer ? 0 : tabBarHeight) + 24;

  return (
    <View className='flex-1 bg-background' testID={testID}>
      <NavBar
        title={title}
        {...(headerRight ? { right: headerRight } : {})}
        {...(hideBack ? { hideBack } : {})}
      />
      {layout === 'fill' ? (
        <View className='flex-1'>{children}</View>
      ) : (
        <ScrollView
          className='flex-1'
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[
            layout === 'center' ? styles.center : styles.list,
            layout === 'center' && valign === 'top' ? styles.top : null,
            { paddingBottom: bottom },
          ]}
          keyboardShouldPersistTaps='handled'
        >
          {layout === 'center' ? (
            <View style={styles.column}>{children}</View>
          ) : (
            children
          )}
        </ScrollView>
      )}
      {footer ? (
        <View
          className='px-4 pt-3 bg-background border-t border-foreground/10 items-center'
          style={{ paddingBottom: tabBarHeight + 12 }}
        >
          <View style={styles.column}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  top: { justifyContent: 'flex-start' },
  list: { padding: 16 },
  column: { width: '100%', maxWidth: READABLE_WIDTH },
});
