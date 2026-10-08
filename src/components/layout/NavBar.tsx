/**
 * NavBar — the iOS-style bar on top of every screen, on every platform.
 *
 * A back chevron on the left when the stack has somewhere to go back to, the
 * screen's title centred, and an optional control on the right. The native
 * stack headers are off everywhere (`headerShown: false`): they do not draw
 * on macOS or Windows, and one bar keeps every platform the same.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * The back chevron, drawn with two borders of a rotated square rather than an
 * SVG icon: react-native-svg is not built for macOS, so SVG icons do not
 * draw there.
 */
function BackChevron({ color }: { color: string }) {
  return (
    <View style={styles.chevronBox}>
      <View style={[styles.chevron, { borderColor: color }]} />
    </View>
  );
}

/** Height of the bar itself, below the status bar inset. */
export const NAV_BAR_HEIGHT = 44;

export interface NavBarProps {
  title: string;
  /** Shown on the right, e.g. a toggle or a Done button. */
  right?: React.ReactNode;
  /** Never show the back chevron (the stack's first screen hides it anyway). */
  hideBack?: boolean;
}

export default function NavBar({ title, right, hideBack }: NavBarProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const canGoBack = !hideBack && navigation.canGoBack();

  return (
    <View
      className='bg-card border-b border-foreground/10'
      style={{ paddingTop: insets.top }}
      testID='nav-bar'
    >
      <View
        className='flex-row items-center px-2'
        style={{ height: NAV_BAR_HEIGHT }}
      >
        {/* The title is centred on the whole bar, under the side controls. */}
        <View
          pointerEvents='none'
          className='absolute left-0 right-0 items-center px-24'
          accessibilityRole='header'
        >
          <Text size='base' weight='semibold' numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View className='flex-1 flex-row items-center'>
          {canGoBack ? (
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole='button'
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              className='flex-row items-center py-2 pr-3'
              testID='nav-back'
            >
              <BackChevron color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
        <View className='flex-row items-center'>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chevronBox: { width: 24, height: 24, justifyContent: 'center' },
  chevron: {
    width: 13,
    height: 13,
    marginLeft: 8,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: '45deg' }],
  },
});
