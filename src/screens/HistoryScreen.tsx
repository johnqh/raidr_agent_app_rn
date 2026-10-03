/**
 * History screen — past runs.
 *
 * Lists previous runs newest-first (`GET /runs`): the request text, a status
 * badge, site/result counts and the date. Tapping a row opens the saved run.
 */

import React, { useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Badge, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useRuns } from '@sudobility/raidr_agent_client';
import type { RunSummary } from '@sudobility/raidr_agent_types';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
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
  const tabBarHeight = useTabBarHeight();

  const { networkClient, baseUrl } = useApi();
  const { getToken } = useAuth();
  const runsQuery = useRuns(networkClient, baseUrl, getToken);

  useEffect(() => {
    trackScreenView('History');
  }, []);

  const runs = runsQuery.data ?? [];

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 16 },
        ]}
      >
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
          <View className='rounded-lg overflow-hidden bg-card'>
            {runs.map((runItem, index) => (
              <Pressable
                key={runItem.id}
                className={`py-3 px-4 ${
                  index > 0 ? 'border-t border-foreground/10' : ''
                }`}
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
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
