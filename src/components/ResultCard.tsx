/**
 * ResultCard — one row of a run's results.
 *
 * Shows the result image (when present), its title and a short summary, and
 * in the lower-left corner the icon of every site it is on: one icon and the
 * domain for a plain result, the stacked icons and "On N sites" for one the
 * `dedupe` step merged. Shared by the Results stream and a past run in
 * History.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type { ResultItem } from '@sudobility/raidr_agent_types';
import SiteIcon from './SiteIcon';
import type { SiteBadge } from '@/hooks/useSiteBadges';

interface ResultCardProps {
  item: ResultItem;
  /** The sites this result is on, one per site (more than one when merged). */
  sites: SiteBadge[];
  onPress: () => void;
}

const ICON = 22;

export default function ResultCard({ item, sites, onPress }: ResultCardProps) {
  const { t } = useTranslation();
  const merged = sites.length > 1;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={
        merged
          ? `${item.title}, ${t('results.onSites', { count: sites.length })}`
          : `${item.title}, ${sites[0]?.domain ?? ''}`
      }
      className='flex-1 rounded-lg overflow-hidden bg-card border border-foreground/10'
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          className='w-full h-40'
          resizeMode='cover'
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View className='flex-1 p-4'>
        <Text size='base' weight='semibold' className='mb-1'>
          {item.title}
        </Text>
        {item.summary ? (
          <Text size='sm' color='muted' numberOfLines={3}>
            {item.summary}
          </Text>
        ) : null}
        <View
          className='flex-row items-center mt-auto pt-3'
          testID='result-sites'
        >
          <View className='flex-row'>
            {sites.slice(0, 5).map((site, i) => (
              <View
                key={site.apiHost}
                className='rounded-md bg-card border border-card'
                style={i > 0 ? styles.stacked : undefined}
              >
                <SiteIcon
                  {...(site.iconUrl ? { iconUrl: site.iconUrl } : {})}
                  domain={site.domain}
                  size={ICON}
                />
              </View>
            ))}
          </View>
          <Text size='xs' weight='medium' color='muted' className='ml-2'>
            {merged
              ? t('results.onSites', { count: sites.length })
              : sites[0]?.domain ?? item.siteTitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Merged sites' icons overlap a little, like a stack.
  stacked: { marginLeft: -6 },
});
