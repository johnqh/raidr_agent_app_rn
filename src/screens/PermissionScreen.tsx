/**
 * Permission screen — asks for one permission (`route.params.kind`) on its
 * own screen: an icon, what it is for, and the call to action in the middle.
 *
 * It sits *between* two steps without staying in the back stack: "Allow"
 * runs the permission ({@link PERMISSIONS}) and on success *replaces* this
 * screen with `route.params.next`, so back from the next screen returns to
 * the screen before. "Not now" goes back. When the OS refuses, it explains
 * and offers the system settings and another try.
 */

import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text as Glyph, View } from 'react-native';
import { Button, Spinner, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/layout/Screen';
import { PERMISSIONS, type PermissionKind } from '@/lib/permissions';
import { goTo } from '@/hooks/usePermissionGate';
import { useSettingsStore } from '@/stores/settingsStore';
import { trackButtonClick, trackScreenView } from '@/analytics';
import type { PermissionScreenProps } from '@/navigation/types';

/**
 * Each permission's symbol, as a glyph: SVG icons do not draw on macOS
 * (react-native-svg is not built there).
 */
const SYMBOLS: Record<PermissionKind, string> = {
  location: '📍',
};

export default function PermissionScreen({
  navigation,
  route,
}: PermissionScreenProps) {
  const { kind, next } = route.params;
  const { t } = useTranslation();
  const setGranted = useSettingsStore(s => s.setPermissionGranted);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    trackScreenView(`Permission:${kind}`);
  }, [kind]);

  const allow = async () => {
    trackButtonClick('permission_allow', { kind });
    setBusy(true);
    setRefused(false);
    const ok = await PERMISSIONS[kind].allow();
    setGranted(kind, ok);
    setBusy(false);
    if (ok) {
      // This screen leaves the stack: back from `next` returns to the screen before.
      goTo(navigation.replace, next);
    } else {
      setRefused(true);
    }
  };

  return (
    <Screen
      title={t(`permission.${kind}.navTitle`)}
      valign='center'
      testID='permission-screen'
    >
      <View className='items-center px-4'>
        <View className='w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6'>
          <Glyph style={styles.symbol}>{SYMBOLS[kind]}</Glyph>
        </View>
        <Text size='2xl' weight='bold' className='text-center mb-3'>
          {t(`permission.${kind}.title`)}
        </Text>
        <Text size='base' color='muted' className='text-center mb-2'>
          {t(`permission.${kind}.body`)}
        </Text>
        <Text size='sm' color='muted' className='text-center mb-8'>
          {t(`permission.${kind}.privacy`)}
        </Text>

        {refused ? (
          <Text size='sm' color='danger' className='text-center mb-4'>
            {t(`permission.${kind}.refused`)}
          </Text>
        ) : null}

        <View className='w-full max-w-sm'>
          {busy ? (
            <View className='flex-row items-center justify-center py-3'>
              <Spinner size='small' />
              <Text size='sm' color='muted' className='ml-2'>
                {t(`permission.${kind}.working`)}
              </Text>
            </View>
          ) : (
            <Button
              variant='primary'
              onPress={allow}
              accessibilityLabel={t(`permission.${kind}.allow`)}
              testID='permission-allow'
            >
              {refused
                ? t('permission.tryAgain')
                : t(`permission.${kind}.allow`)}
            </Button>
          )}
          {refused ? (
            <Button
              variant='outline'
              className='mt-3'
              onPress={() => {
                trackButtonClick('permission_settings', { kind });
                Linking.openSettings().catch(() => undefined);
              }}
              accessibilityLabel={t('permission.openSettings')}
            >
              {t('permission.openSettings')}
            </Button>
          ) : null}
          <Button
            variant='ghost'
            className='mt-3'
            disabled={busy}
            onPress={() => {
              trackButtonClick('permission_not_now', { kind });
              navigation.goBack();
            }}
            accessibilityLabel={t('permission.notNow')}
            testID='permission-not-now'
          >
            {t('permission.notNow')}
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  symbol: { fontSize: 38, lineHeight: 46 },
});
