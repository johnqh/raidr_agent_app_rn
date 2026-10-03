/**
 * History run detail — the saved results of one past run.
 *
 * Loads the run (`GET /runs/:id`) and shows its per-site outcome and the saved
 * answer cards. Tapping a card opens the same Result detail used by a live run.
 */

import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Badge, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useRun } from '@sudobility/raidr_agent_client';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useApi } from '@/context/ApiContext';
import { useAuth } from '@/context/AuthContext';
import ResultCard from '@/components/ResultCard';
import { trackScreenView } from '@/analytics';
import type { HistoryRunScreenProps } from '@/navigation/types';

export default function HistoryRunScreen({
  route,
  navigation,
}: HistoryRunScreenProps) {
  const { runId, request } = route.params;
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const { networkClient, baseUrl } = useApi();
  const { getToken } = useAuth();
  const runQuery = useRun(networkClient, baseUrl, getToken, runId);

  useEffect(() => {
    trackScreenView('HistoryRun');
  }, []);

  const detail = runQuery.data;

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 16 },
        ]}
      >
        <Text size='lg' weight='semibold' className='mb-4'>
          {request}
        </Text>

        {runQuery.isLoading ? (
          <View className='items-center py-8'>
            <Spinner size='large' />
          </View>
        ) : runQuery.isError || !detail ? (
          <Text size='sm' color='danger' className='px-1'>
            {t('history.error')}
          </Text>
        ) : (
          <>
            {detail.sites.length > 0 ? (
              <View className='rounded-lg overflow-hidden bg-card mb-6'>
                {detail.sites.map((site, index) => (
                  <View
                    key={site.apiHost}
                    className={`flex-row items-center justify-between py-3 px-4 ${
                      index > 0 ? 'border-t border-foreground/10' : ''
                    }`}
                  >
                    <Text size='base' className='flex-1 mr-3'>
                      {site.apiHost}
                    </Text>
                    <Badge
                      variant={
                        site.status === 'failed'
                          ? 'danger'
                          : site.status === 'done'
                          ? 'success'
                          : 'info'
                      }
                      size='sm'
                    >
                      {t(`results.status.${site.status}`, site.status)}
                    </Badge>
                  </View>
                ))}
              </View>
            ) : null}

            {detail.results.length > 0 ? (
              <>
                <Text
                  size='sm'
                  weight='semibold'
                  color='muted'
                  transform='uppercase'
                  className='mb-2 px-1 tracking-wide'
                >
                  {t('results.answers')}
                </Text>
                {detail.results.map(item => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    onPress={() =>
                      navigation.navigate('ResultDetail', { item })
                    }
                  />
                ))}
              </>
            ) : (
              <Text size='sm' color='muted' className='px-1'>
                {t('results.empty')}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
