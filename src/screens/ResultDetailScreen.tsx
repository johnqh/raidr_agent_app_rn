/**
 * Result detail — the full answer for one result card ({@link ResultDetailView}),
 * with why it was picked when it is the best result.
 *
 * Typed with a decoupled route prop so the one component serves both the Ask
 * stack (live results) and the History stack (saved results).
 */

import React, { useEffect } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/layout/Screen';
import ResultDetailView from '@/components/ResultDetailView';
import { trackScreenView } from '@/analytics';
import type { ResultDetailParams } from '@/navigation/types';

interface ResultDetailScreenProps {
  route: RouteProp<{ ResultDetail: ResultDetailParams }, 'ResultDetail'>;
}

export default function ResultDetailScreen({ route }: ResultDetailScreenProps) {
  const { item, reason } = route.params;
  const { t } = useTranslation();

  useEffect(() => {
    trackScreenView('ResultDetail');
  }, []);

  return (
    <Screen title={t('resultDetail.title')}>
      <ResultDetailView item={item} reason={reason} />
    </Screen>
  );
}
