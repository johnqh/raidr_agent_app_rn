/**
 * Sites screen — pick which sites the run should call.
 *
 * Candidates arrive ranked best-first, each with the reason it was suggested,
 * grouped under their first label. The intent's selection mode decides the
 * control: `single` is a radio list (exactly one site; the top one starts
 * chosen), `best` / `all` are checkboxes (1–8 sites). Signing in is decided
 * in the next step: "Next" goes to Prepare, which works out which chosen
 * sites need it.
 */

import React, { useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Checkbox } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import type { CandidateSite } from '@sudobility/raidr_agent_types';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useRunFlowStore } from '@/stores/runFlowStore';
import {
  canAddMore,
  groupByLabel,
  isNextEnabled,
  isSingleSelection,
  MAX_SELECTED_SITES,
  nextSelection,
} from '@/lib/sites';
import { trackScreenView, trackButtonClick } from '@/analytics';
import type { SitesScreenProps } from '@/navigation/types';

/** A radio mark: a ring, filled when chosen. */
function RadioMark({ checked }: { checked: boolean }) {
  return (
    <View
      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
        checked ? 'border-primary' : 'border-foreground/30'
      }`}
    >
      {checked ? <View className='w-3 h-3 rounded-full bg-primary' /> : null}
    </View>
  );
}

export default function SitesScreen({ navigation }: SitesScreenProps) {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const candidates = useRunFlowStore(s => s.candidates);
  const mode = useRunFlowStore(s => s.intent?.selection ?? 'all');
  const selected = useSelectionStore(s => s.selected);
  const select = useSelectionStore(s => s.select);

  useEffect(() => {
    trackScreenView('Sites');
  }, []);

  const single = isSingleSelection(mode);
  const groups = groupByLabel(candidates);
  const nextEnabled = isNextEnabled(mode, selected);
  const roomForMore = canAddMore(mode, selected);

  const choose = useCallback(
    (apiHost: string) => {
      const current = useSelectionStore.getState().selected;
      const next = nextSelection(mode, current, apiHost);
      for (const host of current) {
        if (!next.has(host)) {
          select(host, false);
        }
      }
      for (const host of next) {
        if (!current.has(host)) {
          select(host, true);
        }
      }
    },
    [mode, select]
  );

  const handleNext = useCallback(() => {
    trackButtonClick('sites_next', { selection: mode, count: selected.size });
    navigation.navigate('Prepare');
  }, [navigation, mode, selected.size]);

  const renderRow = (site: CandidateSite) => {
    const checked = selected.has(site.apiHost);
    const disabled = !checked && !roomForMore;
    return (
      <Pressable
        key={site.apiHost}
        onPress={() => choose(site.apiHost)}
        disabled={disabled}
        accessibilityRole={single ? 'radio' : 'checkbox'}
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={site.title}
        className={`flex-row items-center py-3 px-4 border-t border-foreground/10 ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        <View className='flex-1 mr-3'>
          <Text size='base' weight='semibold'>
            {site.title}
          </Text>
          {site.reason ? (
            <Text size='sm' className='mt-0.5'>
              {site.reason}
            </Text>
          ) : null}
          {site.description ? (
            <Text size='sm' color='muted' numberOfLines={2} className='mt-0.5'>
              {site.description}
            </Text>
          ) : null}
          <Text size='xs' color='muted' className='mt-1'>
            {t('sites.tools', { count: site.toolCount })}
          </Text>
        </View>
        {single ? (
          <RadioMark checked={checked} />
        ) : (
          <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={() => choose(site.apiHost)}
            accessibilityLabel={site.title}
          />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 96 },
        ]}
      >
        {candidates.length === 0 ? (
          <View className='px-4 py-8'>
            <Text size='base' color='muted'>
              {t('sites.empty')}
            </Text>
          </View>
        ) : (
          <>
            <Text size='sm' color='muted' className='mb-4 px-4'>
              {single
                ? t('sites.pickOne')
                : t('sites.pickMany', { max: MAX_SELECTED_SITES })}
            </Text>
            {groups.map(group => (
              <View key={group.label || 'other'} className='mb-6'>
                <Text
                  size='sm'
                  weight='semibold'
                  color='muted'
                  transform='uppercase'
                  className='mb-2 px-4 tracking-wide'
                >
                  {group.label || t('sites.otherLabel')}
                </Text>
                <View className='rounded-lg overflow-hidden bg-card [&>*:first-child]:border-t-0'>
                  {group.sites.map(renderRow)}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <View
        className='absolute left-0 right-0 bottom-0 px-4 pt-3 bg-background border-t border-foreground/10'
        style={{ paddingBottom: tabBarHeight + 12 }}
      >
        <Button
          variant='primary'
          disabled={!nextEnabled}
          onPress={handleNext}
          accessibilityLabel={t('sites.next')}
          testID='sites-next'
        >
          {t('sites.next')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16 },
});
