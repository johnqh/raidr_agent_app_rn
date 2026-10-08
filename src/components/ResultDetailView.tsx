/**
 * The full answer for one result, shared by the Result detail screen and the
 * best result shown at the top of a `single` / `best` run (live and in
 * History).
 *
 * A recipe result shows its ingredients (bulleted), steps (numbered) and
 * time/servings; any other result shows its `fields` as label/value rows.
 * "Open on <site>" opens the result's page (`pageUrl`, built from the site's
 * routes) in the default browser on every platform, and is hidden when there
 * is none. A `sourceUrl` the extractor copied from the data is secondary.
 */

import React, { useCallback } from 'react';
import { View, Image, Linking } from 'react-native';
import { Text, Button, Badge, List, ListItem } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type { ResultItem } from '@sudobility/raidr_agent_types';
import { trackButtonClick } from '@/analytics';

interface ResultDetailViewProps {
  item: ResultItem;
  /** Why this result was picked as the best one. */
  reason?: string;
}

function openUrl(url: string): void {
  Linking.openURL(url).catch(() => {
    // Ignore: the OS reports its own failure to open the URL.
  });
}

export default function ResultDetailView({
  item,
  reason,
}: ResultDetailViewProps) {
  const { t } = useTranslation();
  const recipe = item.recipe;
  const pageUrl = item.pageUrl ?? '';
  const sourceUrl =
    item.sourceUrl && item.sourceUrl !== pageUrl ? item.sourceUrl : '';

  const handleOpenSite = useCallback(() => {
    if (pageUrl) {
      trackButtonClick('result_open_site');
      openUrl(pageUrl);
    }
  }, [pageUrl]);

  const handleOpenSource = useCallback(() => {
    if (sourceUrl) {
      trackButtonClick('result_view_source');
      openUrl(sourceUrl);
    }
  }, [sourceUrl]);

  return (
    <View>
      {reason ? (
        <View className='rounded-lg bg-card border border-primary/30 p-3 mb-4'>
          <Text size='xs' weight='semibold' color='muted' transform='uppercase'>
            {t('results.whyBest')}
          </Text>
          <Text size='sm' className='mt-1'>
            {reason}
          </Text>
        </View>
      ) : null}

      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          className='w-full h-52 rounded-lg mb-4'
          resizeMode='cover'
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <View className='flex-row items-start justify-between mb-2'>
        <Text size='2xl' weight='bold' className='flex-1 mr-2'>
          {item.title}
        </Text>
        {item.siteTitle ? (
          <Badge variant='primary' size='sm'>
            {item.siteTitle}
          </Badge>
        ) : null}
      </View>

      {item.summary ? (
        <Text size='base' color='muted' className='mb-4'>
          {item.summary}
        </Text>
      ) : null}

      {recipe ? (
        <>
          {recipe.totalMinutes != null || recipe.servings != null ? (
            <View className='flex-row mb-4'>
              {recipe.totalMinutes != null ? (
                <Badge variant='info' size='md' className='mr-2'>
                  {t('resultDetail.minutes', { count: recipe.totalMinutes })}
                </Badge>
              ) : null}
              {recipe.servings != null ? (
                <Badge variant='info' size='md'>
                  {t('resultDetail.servings', { count: recipe.servings })}
                </Badge>
              ) : null}
            </View>
          ) : null}

          {recipe.ingredients.length > 0 ? (
            <>
              <Text size='lg' weight='semibold' className='mb-2'>
                {t('resultDetail.ingredients')}
              </Text>
              <List
                type='unordered'
                marker='disc'
                spacing='sm'
                className='mb-4'
              >
                {recipe.ingredients.map((ingredient, index) => (
                  <ListItem key={index}>{ingredient}</ListItem>
                ))}
              </List>
            </>
          ) : null}

          {recipe.steps.length > 0 ? (
            <>
              <Text size='lg' weight='semibold' className='mb-2'>
                {t('resultDetail.steps')}
              </Text>
              <List
                type='ordered'
                marker='decimal'
                spacing='md'
                className='mb-4'
              >
                {recipe.steps.map((step, index) => (
                  <ListItem key={index} index={index + 1}>
                    {step}
                  </ListItem>
                ))}
              </List>
            </>
          ) : null}
        </>
      ) : item.fields.length > 0 ? (
        <View className='rounded-lg overflow-hidden bg-card mb-4'>
          {item.fields.map((field, index) => (
            <View
              key={`${field.label}-${index}`}
              className={`py-3 px-4 ${
                index > 0 ? 'border-t border-foreground/10' : ''
              }`}
            >
              <Text size='xs' color='muted' transform='uppercase'>
                {field.label}
              </Text>
              <Text size='base' className='mt-0.5'>
                {field.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {pageUrl ? (
        <Button
          variant='primary'
          className='mb-2'
          onPress={handleOpenSite}
          accessibilityLabel={t('resultDetail.openOn', {
            site: item.siteTitle || t('resultDetail.theSite'),
          })}
        >
          {t('resultDetail.openOn', {
            site: item.siteTitle || t('resultDetail.theSite'),
          })}
        </Button>
      ) : null}
      {sourceUrl ? (
        <Button
          variant='ghost'
          size='sm'
          onPress={handleOpenSource}
          accessibilityLabel={t('resultDetail.viewSource')}
        >
          {t('resultDetail.viewSource')}
        </Button>
      ) : null}
    </View>
  );
}
