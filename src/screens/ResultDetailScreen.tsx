/**
 * Result detail — the full answer for one result card.
 *
 * A recipe result shows its ingredients (bulleted), steps (numbered) and
 * time/servings; any other result shows its `fields` as label/value rows. When
 * a source URL is present, a "View source" button opens it in the browser.
 *
 * Typed with a decoupled route prop so the one component serves both the Ask
 * stack (live results) and the History stack (saved results).
 */

import React, { useCallback, useEffect } from 'react';
import { View, ScrollView, Image, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { Text, Button, Badge, List, ListItem } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type { ResultItem } from '@sudobility/raidr_agent_types';
import { trackScreenView, trackButtonClick } from '@/analytics';

interface ResultDetailScreenProps {
  route: RouteProp<{ ResultDetail: { item: ResultItem } }, 'ResultDetail'>;
}

export default function ResultDetailScreen({ route }: ResultDetailScreenProps) {
  const { item } = route.params;
  const { t } = useTranslation();

  useEffect(() => {
    trackScreenView('ResultDetail');
  }, []);

  const handleOpenSource = useCallback(() => {
    if (item.sourceUrl) {
      trackButtonClick('result_view_source');
      Linking.openURL(item.sourceUrl).catch(() => {
        // Ignore: the OS reports its own failure to open the URL.
      });
    }
  }, [item.sourceUrl]);

  const recipe = item.recipe;

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
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

        {item.sourceUrl ? (
          <Button
            variant='outline'
            onPress={handleOpenSource}
            accessibilityLabel={t('resultDetail.viewSource')}
          >
            {t('resultDetail.viewSource')}
          </Button>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
