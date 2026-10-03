/**
 * ResultCard — one answer from a run.
 *
 * Shows the result image (when present), its title, a badge for the site it came
 * from, and a short summary. Shared by the Results stream and the saved results
 * of a past run in History.
 */

import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text, Badge } from '@sudobility/components-rn';
import type { ResultItem } from '@sudobility/raidr_agent_types';

interface ResultCardProps {
  item: ResultItem;
  onPress: () => void;
}

export default function ResultCard({ item, onPress }: ResultCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={item.title}
      className='mb-3 rounded-lg overflow-hidden bg-card border border-foreground/10'
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          className='w-full h-40'
          resizeMode='cover'
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View className='p-4'>
        <View className='flex-row items-start justify-between mb-1'>
          <Text size='base' weight='semibold' className='flex-1 mr-2'>
            {item.title}
          </Text>
          {item.siteTitle ? (
            <Badge variant='primary' size='sm'>
              {item.siteTitle}
            </Badge>
          ) : null}
        </View>
        {item.summary ? (
          <Text size='sm' color='muted' numberOfLines={3}>
            {item.summary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
