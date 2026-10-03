/**
 * Results screen — run the selected sites and stream the answers.
 *
 * On mount it collects each selected site's stored token, POSTs the run, and
 * reads the UI message stream ({@link startRun}): `data-site-status` drives the
 * per-site progress list, `data-call` feeds a per-site call count, `data-result`
 * appends answer cards, and `data-run` reports the run as a whole. Streaming
 * needs `expo/fetch` (iOS/Android); on desktop a not-yet-available notice shows
 * instead.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Badge, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import type {
  CallData,
  ResultItem,
  RunData,
  RunSiteSelection,
  SiteStatusData,
} from '@sudobility/raidr_agent_types';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAgentClient } from '@/hooks/useAgentClient';
import { useAuth } from '@/context/AuthContext';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { getSiteToken } from '@/lib/secureStorage';
import {
  startRun,
  isStreamingSupported,
  type RunHandle,
} from '@/lib/runTransport';
import ResultCard from '@/components/ResultCard';
import { trackScreenView } from '@/analytics';
import type { ResultsScreenProps } from '@/navigation/types';

export default function ResultsScreen({ navigation }: ResultsScreenProps) {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const request = useRunFlowStore(s => s.request);
  const intent = useRunFlowStore(s => s.intent);
  const candidates = useRunFlowStore(s => s.candidates);

  const client = useAgentClient();
  const { getToken } = useAuth();

  const [statuses, setStatuses] = useState<Record<string, SiteStatusData>>({});
  const [calls, setCalls] = useState<Record<string, CallData>>({});
  const [results, setResults] = useState<ResultItem[]>([]);
  const [run, setRun] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    trackScreenView('Results');
  }, []);

  useEffect(() => {
    if (!intent) {
      setError(t('results.missing'));
      setFinished(true);
      return;
    }
    if (!isStreamingSupported()) {
      setUnsupported(true);
      setFinished(true);
      return;
    }

    let cancelled = false;
    let handle: RunHandle | null = null;

    (async () => {
      const selectedHosts = Array.from(useSelectionStore.getState().selected);
      const sites: RunSiteSelection[] = await Promise.all(
        selectedHosts.map(async apiHost => {
          const token = await getSiteToken(apiHost);
          return token ? { apiHost, token } : { apiHost };
        })
      );
      if (cancelled) {
        return;
      }
      handle = startRun(
        client,
        getToken,
        { request, intent, sites },
        {
          onPart: part => {
            if (cancelled) {
              return;
            }
            switch (part.type) {
              case 'site-status':
                setStatuses(prev => ({
                  ...prev,
                  [part.data.apiHost]: part.data,
                }));
                break;
              case 'call':
                setCalls(prev => ({ ...prev, [part.data.callId]: part.data }));
                break;
              case 'result':
                setResults(prev =>
                  prev.some(r => r.id === part.data.id)
                    ? prev.map(r => (r.id === part.data.id ? part.data : r))
                    : [...prev, part.data]
                );
                break;
              case 'run':
                setRun(part.data);
                break;
            }
          },
          onError: err => {
            if (!cancelled) {
              setError(err.message);
              setFinished(true);
            }
          },
          onFinish: () => {
            if (!cancelled) {
              setFinished(true);
            }
          },
        }
      );
    })();

    return () => {
      cancelled = true;
      handle?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callCountFor = useCallback(
    (apiHost: string) =>
      Object.values(calls).filter(c => c.apiHost === apiHost).length,
    [calls]
  );

  const selectedSites = candidates.filter(c =>
    useSelectionStore.getState().selected.has(c.apiHost)
  );

  const running = !finished && (!run || run.status === 'running');

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 16 },
        ]}
      >
        {/* Progress */}
        <Text
          size='sm'
          weight='semibold'
          color='muted'
          transform='uppercase'
          className='mb-2 px-1 tracking-wide'
        >
          {t('results.progress')}
        </Text>
        <View className='rounded-lg overflow-hidden bg-card mb-6'>
          {selectedSites.map((site, index) => {
            const status = statuses[site.apiHost];
            const statusKey = status?.status ?? 'queued';
            const count = callCountFor(site.apiHost);
            return (
              <View
                key={site.apiHost}
                className={`flex-row items-center justify-between py-3 px-4 ${
                  index > 0 ? 'border-t border-foreground/10' : ''
                }`}
              >
                <View className='flex-1 mr-3'>
                  <Text size='base'>{site.title}</Text>
                  {count > 0 ? (
                    <Text size='xs' color='muted' className='mt-0.5'>
                      {t('results.calls', { count })}
                    </Text>
                  ) : null}
                  {status?.message ? (
                    <Text size='xs' color='muted' className='mt-0.5'>
                      {status.message}
                    </Text>
                  ) : null}
                </View>
                <Badge
                  variant={
                    statusKey === 'failed'
                      ? 'danger'
                      : statusKey === 'done'
                      ? 'success'
                      : 'info'
                  }
                  size='sm'
                >
                  {t(`results.status.${statusKey}`, statusKey)}
                </Badge>
              </View>
            );
          })}
        </View>

        {/* Results */}
        {results.length > 0 ? (
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
            {results.map(item => (
              <ResultCard
                key={item.id}
                item={item}
                onPress={() => navigation.navigate('ResultDetail', { item })}
              />
            ))}
          </>
        ) : null}

        {/* States */}
        {unsupported ? (
          <Text size='sm' color='muted' className='mt-2 px-1'>
            {t('results.unsupported')}
          </Text>
        ) : error ? (
          <Text size='sm' color='danger' className='mt-2 px-1'>
            {error}
          </Text>
        ) : running ? (
          <View className='flex-row items-center mt-2 px-1'>
            <Spinner size='small' />
            <Text size='sm' color='muted' className='ml-2'>
              {t('results.running')}
            </Text>
          </View>
        ) : results.length === 0 ? (
          <Text size='sm' color='muted' className='mt-2 px-1'>
            {t('results.empty')}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
