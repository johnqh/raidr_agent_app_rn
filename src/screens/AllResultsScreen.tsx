/**
 * All results — every result of a `single` / `best` run, opened from the
 * best result's "See all N results". A list when the window is narrow, tiles
 * when wide; merged duplicates show once ({@link ResultList}).
 *
 * Typed with a decoupled route prop so it serves both the Ask stack (a live
 * run) and the History stack (a saved one).
 */

import React, { useEffect } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/layout/Screen';
import ResultList from '@/components/ResultList';
import { trackScreenView } from '@/analytics';
import type { AllResultsParams } from '@/navigation/types';

interface AllResultsScreenProps {
  route: RouteProp<{ AllResults: AllResultsParams }, 'AllResults'>;
}

export default function AllResultsScreen({ route }: AllResultsScreenProps) {
  const { results, groups, best } = route.params;
  const { t } = useTranslation();

  useEffect(() => {
    trackScreenView('AllResults');
  }, []);

  return (
    <Screen
      title={t('results.allTitle', { count: results.length })}
      layout='list'
    >
      <ResultList
        results={results}
        groups={groups ?? null}
        best={best ?? null}
      />
    </Screen>
  );
}
