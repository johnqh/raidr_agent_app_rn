/**
 * Sites screen — pick which sites the run should call.
 *
 * Candidates arrive ranked best-first, each with the reason it was suggested,
 * grouped under their first label. Each row shows the site's icon and its
 * domain (not the catalog's API title). Each label's sites are tiles: one
 * column when the window is narrow, a grid when wide; Next stays in a fixed
 * footer. The intent's selection mode decides the
 * control: `single` is a radio list (exactly one site; the top one starts
 * chosen), `best` / `all` are checkboxes (1–8 sites). Signing in is decided
 * in the next step: "Next" goes to Prepare, which works out which chosen
 * sites need it.
 */

import React, { useCallback, useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Text, Button, Checkbox } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import type { CandidateSite } from '@sudobility/raidr_agent_types';
import Screen from '@/components/layout/Screen';
import TileGrid from '@/components/layout/TileGrid';
import { useRunFlowStore } from '@/stores/runFlowStore';
import {
  canAddMore,
  groupByLabel,
  isNextEnabled,
  isSingleSelection,
  MAX_SELECTED_SITES,
  nextSelection,
  siteDomain,
} from '@/lib/sites';
import SiteIcon from '@/components/SiteIcon';
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
    const domain = siteDomain(site);
    return (
      <Pressable
        key={site.apiHost}
        onPress={() => choose(site.apiHost)}
        disabled={disabled}
        accessibilityRole={single ? 'radio' : 'checkbox'}
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={domain}
        className={`flex-1 flex-row items-start p-4 rounded-lg bg-card border ${
          checked ? 'border-primary' : 'border-foreground/10'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <View className='mr-3'>
          <SiteIcon
            {...(site.iconUrl ? { iconUrl: site.iconUrl } : {})}
            domain={domain}
          />
        </View>
        <View className='flex-1 mr-3'>
          <Text size='base' weight='semibold'>
            {domain}
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
            accessibilityLabel={domain}
          />
        )}
      </Pressable>
    );
  };

  return (
    <Screen
      title={t('sites.title')}
      layout='list'
      footer={
        <Button
          variant='primary'
          disabled={!nextEnabled}
          onPress={handleNext}
          accessibilityLabel={t('sites.next')}
          testID='sites-next'
        >
          {t('sites.next')}
        </Button>
      }
    >
      {candidates.length === 0 ? (
        <Text size='base' color='muted' className='py-8 text-center'>
          {t('sites.empty')}
        </Text>
      ) : (
        <>
          <Text size='sm' color='muted' className='mb-4'>
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
                className='mb-2 tracking-wide'
              >
                {group.label || t('sites.otherLabel')}
              </Text>
              <TileGrid>{group.sites.map(renderRow)}</TileGrid>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
