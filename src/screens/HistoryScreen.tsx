/**
 * History screen — past runs.
 *
 * Lists previous runs newest-first (`GET /runs`): the request text, a status
 * badge, site/result counts and the date — a list when narrow, tiles when
 * wide. Tapping one opens the saved run.
 */

import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Text, Badge, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useRuns } from '@sudobility/raidr_agent_client';
import type { RunSummary } from '@sudobility/raidr_agent_types';
import Screen from '@/components/layout/Screen';
import TileGrid from '@/components/layout/TileGrid';
import { useApi } from '@/context/ApiContext';
import { useAuth } from '@/context/AuthContext';
import { trackScreenView } from '@/analytics';
import type { HistoryScreenProps } from '@/navigation/types';

function statusVariant(
  status: RunSummary['status']
): 'success' | 'danger' | 'info' {
  if (status === 'done') {
    return 'success';
  }
  if (status === 'failed') {
    return 'danger';
  }
  return 'info';
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { t } = useTranslation();

  const { networkClient, baseUrl } = useApi();
  const { getToken } = useAuth();
  const runsQuery = useRuns(networkClient, baseUrl, getToken);

  useEffect(() => {
    trackScreenView('History');
  }, []);

  const runs = runsQuery.data ?? [];

  return (
    <Screen title={t('history.title')} layout='list' hideBack>
      {runsQuery.isLoading ? (
        <View className='items-center py-8'>
          <Spinner size='large' />
        </View>
      ) : runsQuery.isError ? (
        <Text size='sm' color='danger' className='px-1'>
          {t('history.error')}
        </Text>
      ) : runs.length === 0 ? (
        <Text size='base' color='muted' className='px-1'>
          {t('history.empty')}
        </Text>
      ) : (
        <TileGrid>
          {runs.map(runItem => (
            <Pressable
              key={runItem.id}
              className='flex-1 p-4 rounded-lg bg-card border border-foreground/10'
              onPress={() =>
                navigation.navigate('HistoryRun', {
                  runId: runItem.id,
                  request: runItem.request,
                })
              }
              accessibilityRole='button'
              accessibilityLabel={runItem.request}
            >
              <View className='flex-row items-start justify-between'>
                <Text size='base' className='flex-1 mr-2' numberOfLines={2}>
                  {runItem.request}
                </Text>
                <Badge variant={statusVariant(runItem.status)} size='sm'>
                  {t(`history.status.${runItem.status}`, runItem.status)}
                </Badge>
              </View>
              <Text size='xs' color='muted' className='mt-1'>
                {t('history.counts', {
                  sites: runItem.siteCount,
                  results: runItem.resultCount,
                })}
                {'  ·  '}
                {new Date(runItem.createdAt).toLocaleDateString()}
              </Text>
            </Pressable>
          ))}
        </TileGrid>
      )}
    </Screen>
  );
}
