/**
 * ResultList — a run's results as cards: one column when narrow, tiles when
 * wide ({@link TileGrid}). Duplicates the `dedupe` step merged show once with
 * every site's icon; such a card opens Result sources, any other the Result
 * detail (with why it was picked, when it is the best). Shared by Results,
 * All results and a past run in History — each stack has both screens.
 */

import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  BestData,
  ResultGroup,
  ResultItem,
} from '@sudobility/raidr_agent_types';
import ResultCard from './ResultCard';
import TileGrid from './layout/TileGrid';
import { useSiteBadges } from '@/hooks/useSiteBadges';
import { copySites, displayItems, type DisplayItem } from '@/lib/results';
import { trackButtonClick } from '@/analytics';
import type {
  ResultDetailParams,
  ResultSourcesParams,
} from '@/navigation/types';

type ResultNavigation = NativeStackNavigationProp<{
  ResultDetail: ResultDetailParams;
  ResultSources: ResultSourcesParams;
}>;

interface ResultListProps {
  results: ResultItem[];
  groups?: ResultGroup[] | null;
  best?: BestData | null;
}

export default function ResultList({ results, groups, best }: ResultListProps) {
  const navigation = useNavigation<ResultNavigation>();
  const rows = useMemo(() => displayItems(results, groups), [results, groups]);
  const hosts = useMemo(
    () => [...new Set(results.map(r => r.apiHost))],
    [results]
  );
  const badges = useSiteBadges(hosts);

  const open = (row: DisplayItem) => {
    if (row.copies.length > 1) {
      trackButtonClick('results_open_merged', { copies: row.copies.length });
      navigation.navigate('ResultSources', { copies: row.copies });
      return;
    }
    navigation.navigate('ResultDetail', {
      item: row.item,
      ...(best?.resultId === row.item.id ? { reason: best.reason } : {}),
    });
  };

  return (
    <TileGrid testID='result-list'>
      {rows.map(row => (
        <ResultCard
          key={row.key}
          item={row.item}
          sites={copySites(row.copies).map(host => badges[host]!)}
          onPress={() => open(row)}
        />
      ))}
    </TileGrid>
  );
}
