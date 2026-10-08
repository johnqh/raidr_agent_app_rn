/**
 * Result detail — the full answer for one result card ({@link ResultDetailView}),
 * with why it was picked when it is the best result.
 *
 * Typed with a decoupled route prop so the one component serves both the Ask
 * stack (live results) and the History stack (saved results).
 */

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import ResultDetailView from '@/components/ResultDetailView';
import { trackScreenView } from '@/analytics';
import type { ResultDetailParams } from '@/navigation/types';

interface ResultDetailScreenProps {
  route: RouteProp<{ ResultDetail: ResultDetailParams }, 'ResultDetail'>;
}

export default function ResultDetailScreen({ route }: ResultDetailScreenProps) {
  const { item, reason } = route.params;

  useEffect(() => {
    trackScreenView('ResultDetail');
  }, []);

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ResultDetailView item={item} reason={reason} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
