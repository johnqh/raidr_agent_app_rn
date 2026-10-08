/**
 * Result sources — where to get one merged result.
 *
 * Opened from a results row the `dedupe` step merged (the same concert on two
 * ticket sites): one row per copy with the site's icon and domain and what
 * sets that copy apart (the step's note, e.g. "$85 · GA", or the copy's
 * price when there is no note). Choosing a site opens that copy's detail.
 *
 * Typed with a decoupled route prop so it serves both the Ask stack and the
 * History stack.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import SiteIcon from '@/components/SiteIcon';
import Screen from '@/components/layout/Screen';
import TileGrid from '@/components/layout/TileGrid';
import { useSiteBadges } from '@/hooks/useSiteBadges';
import { copyDetail } from '@/lib/results';
import { trackScreenView, trackButtonClick } from '@/analytics';
import type {
  ResultDetailParams,
  ResultSourcesParams,
} from '@/navigation/types';

interface ResultSourcesScreenProps {
  route: RouteProp<{ ResultSources: ResultSourcesParams }, 'ResultSources'>;
}

type SourcesNavigation = NativeStackNavigationProp<{
  ResultDetail: ResultDetailParams;
}>;

export default function ResultSourcesScreen({
  route,
}: ResultSourcesScreenProps) {
  const { copies } = route.params;
  const { t } = useTranslation();
  const navigation = useNavigation<SourcesNavigation>();
  const hosts = useMemo(
    () => [...new Set(copies.map(c => c.item.apiHost))],
    [copies]
  );
  const badges = useSiteBadges(hosts);

  useEffect(() => {
    trackScreenView('ResultSources');
  }, []);

  const first = copies[0]?.item;
  return (
    <Screen title={t('resultSources.title')} layout='list'>
      {first ? (
        <Text size='lg' weight='semibold' className='mb-1'>
          {first.title}
        </Text>
      ) : null}
      <Text size='sm' color='muted' className='mb-4'>
        {t('resultSources.subtitle', { count: hosts.length })}
      </Text>
      <TileGrid minTileWidth={260}>
        {copies.map(copy => {
          const badge = badges[copy.item.apiHost];
          const detail = copyDetail(copy);
          return (
            <Pressable
              key={copy.item.id}
              onPress={() => {
                trackButtonClick('result_source', {
                  site: copy.item.apiHost,
                });
                navigation.navigate('ResultDetail', { item: copy.item });
              }}
              accessibilityRole='button'
              accessibilityLabel={
                detail ? `${badge?.domain}, ${detail}` : badge?.domain
              }
              className='flex-1 flex-row items-center p-4 rounded-lg bg-card border border-foreground/10'
            >
              <SiteIcon
                {...(badge?.iconUrl ? { iconUrl: badge.iconUrl } : {})}
                domain={badge?.domain ?? copy.item.apiHost}
                size={32}
              />
              <View className='flex-1 mx-3'>
                <Text size='base' weight='semibold'>
                  {badge?.domain ?? copy.item.apiHost}
                </Text>
                {detail ? (
                  <Text size='sm' className='mt-0.5'>
                    {detail}
                  </Text>
                ) : null}
                {copy.item.title !== first?.title ? (
                  <Text size='xs' color='muted' numberOfLines={1}>
                    {copy.item.title}
                  </Text>
                ) : null}
              </View>
              <Text size='lg' color='muted'>
                ›
              </Text>
            </Pressable>
          );
        })}
      </TileGrid>
    </Screen>
  );
}
