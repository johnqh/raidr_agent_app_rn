/**
 * The top of a `single` / `best` run's results: the one best result in full
 * (with why it was picked) and "See all N results" to switch to the list.
 * Shared by the live Results screen and a past run in History.
 */

import React from 'react';
import { View } from 'react-native';
import { Text, Button } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type { ResultItem } from '@sudobility/raidr_agent_types';
import ResultDetailView from './ResultDetailView';

interface BestResultProps {
  item: ResultItem;
  reason: string;
  /** How many results the run has in all. */
  total: number;
  onSeeAll: () => void;
}

export default function BestResult({
  item,
  reason,
  total,
  onSeeAll,
}: BestResultProps) {
  const { t } = useTranslation();
  return (
    <View>
      <Text
        size='sm'
        weight='semibold'
        color='muted'
        transform='uppercase'
        className='mb-2 px-1 tracking-wide'
      >
        {t('results.best')}
      </Text>
      <ResultDetailView item={item} reason={reason} />
      {total > 1 ? (
        <Button
          variant='outline'
          className='mt-4'
          onPress={onSeeAll}
          accessibilityLabel={t('results.seeAll', { count: total })}
          testID='results-see-all'
        >
          {t('results.seeAll', { count: total })}
        </Button>
      ) : null}
    </View>
  );
}
