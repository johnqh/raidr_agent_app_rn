/**
 * Results screen — run the prepared sites and stream the answers.
 *
 * On mount it runs the sites the Prepare step kept, each with the tools it
 * chose and (for sites that sign in) the stored token, plus the user's form
 * inputs ({@link startAgentRun}: `POST /runs`, or on the device in local
 * mode). `data-site-status` drives the per-site progress list, `data-call`
 * a per-site call count, `data-result` the answers, `data-best` the pick.
 *
 * How answers show follows the intent's selection mode:
 * - `single` / `best`: the one best result in full, with why it was picked,
 *   and "See all N results" to switch to the list;
 * - `all`: the list (with a map for location requests) → Result detail.
 *
 * A `fallback` site whose calls all failed with 401/403 gets "Sign in to
 * <site> and retry": the Login web view, then a re-run of that site alone
 * (its earlier results and calls are replaced).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Text, Badge, Button, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type {
  BestData,
  CallData,
  ResultItem,
  SitePlan,
  SiteStatusData,
} from '@sudobility/raidr_agent_types';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@sudobility/raidr_agent_client';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAgentClient } from '@/hooks/useAgentClient';
import { useAuth } from '@/context/AuthContext';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { getSiteToken } from '@/lib/secureStorage';
import type { RunCallbacks, RunHandle } from '@/lib/runTransport';
import { startAgentRun } from '@/lib/agentFlow';
import {
  buildRunSites,
  sitesToRetryWithSignIn,
  supportedSites,
} from '@/lib/prepare';
import { bestResult, replaceSiteResults, showsBest } from '@/lib/results';
import ResultCard from '@/components/ResultCard';
import ResultsMap from '@/components/ResultsMap';
import BestResult from '@/components/BestResult';
import { trackScreenView, trackButtonClick, trackEvent } from '@/analytics';
import type { ResultsScreenProps } from '@/navigation/types';

export default function ResultsScreen({ navigation }: ResultsScreenProps) {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const request = useRunFlowStore(s => s.request);
  const intent = useRunFlowStore(s => s.intent);
  const location = useRunFlowStore(s => s.location);
  const plan = useRunFlowStore(s => s.plan);
  const inputs = useRunFlowStore(s => s.inputs);

  const client = useAgentClient();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [statuses, setStatuses] = useState<Record<string, SiteStatusData>>({});
  const [calls, setCalls] = useState<Record<string, CallData>>({});
  const [results, setResults] = useState<ResultItem[]>([]);
  const [best, setBest] = useState<BestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState(0);
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showAll, setShowAll] = useState(false);

  const cancelledRef = useRef(false);
  const handlesRef = useRef<RunHandle[]>([]);
  /** The fallback site the user went to sign in to, re-run on return. */
  const pendingRetryRef = useRef<SitePlan | null>(null);

  const sites = plan ? supportedSites(plan) : [];
  const mode = intent?.selection;

  useEffect(() => {
    trackScreenView('Results');
  }, []);

  /** Run some of the prepared sites; a retry replaces that site's earlier output. */
  const runSitesOf = useCallback(
    async (plans: SitePlan[], retry: boolean) => {
      if (!intent || plans.length === 0) {
        return;
      }
      setActiveRuns(n => n + 1);
      setStarted(true);
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          setActiveRuns(n => n - 1);
        }
      };

      if (retry) {
        const hosts = new Set(plans.map(p => p.apiHost));
        setCalls(prev =>
          Object.fromEntries(
            Object.entries(prev).filter(([, c]) => !hosts.has(c.apiHost))
          )
        );
        setResults(prev =>
          plans.reduce((acc, p) => replaceSiteResults(acc, p.apiHost, []), prev)
        );
        setStatuses(prev => {
          const next = { ...prev };
          for (const host of hosts) {
            delete next[host];
          }
          return next;
        });
        setError(null);
      }

      const tokens: Record<string, string | null> = {};
      for (const p of plans) {
        tokens[p.apiHost] =
          p.login === 'none' ? null : await getSiteToken(p.apiHost);
      }
      if (cancelledRef.current) {
        settle();
        return;
      }

      const callbacks: RunCallbacks = {
        onPart: part => {
          if (cancelledRef.current) {
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
            case 'best':
              // A one-site retry's pick does not override the run's.
              setBest(prev => (retry && prev ? prev : part.data));
              break;
            case 'run':
              break;
          }
        },
        onError: err => {
          if (!cancelledRef.current) {
            setError(err.message);
          }
          settle();
        },
        onFinish: () => {
          // Both modes save the run; refresh History.
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runs() });
          settle();
        },
      };

      try {
        const handle = await startAgentRun(
          client,
          getToken,
          {
            request,
            intent,
            sites: buildRunSites(plans, tokens),
            inputs,
            ...(location ? { location } : {}),
          },
          callbacks
        );
        if (cancelledRef.current) {
          handle.abort();
          settle();
          return;
        }
        handlesRef.current.push(handle);
      } catch (err) {
        if (!cancelledRef.current) {
          setError(err instanceof Error ? err.message : String(err));
        }
        settle();
      }
    },
    [client, getToken, intent, inputs, location, queryClient, request]
  );

  useEffect(() => {
    cancelledRef.current = false;
    if (!intent || !plan) {
      setError(t('results.missing'));
      return;
    }
    if (intent.location_needed && !location) {
      setError(t('ask.locationRequired'));
      return;
    }
    runSitesOf(supportedSites(plan), false);
    return () => {
      cancelledRef.current = true;
      for (const handle of handlesRef.current) {
        handle.abort();
      }
      handlesRef.current = [];
    };
    // Run once on open; retries go through `runSitesOf` directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from signing in for a retry: re-run that site if a token was stored.
  useFocusEffect(
    useCallback(() => {
      const site = pendingRetryRef.current;
      if (!site) {
        return;
      }
      let active = true;
      (async () => {
        const token = await getSiteToken(site.apiHost);
        if (!active || !token) {
          return;
        }
        pendingRetryRef.current = null;
        trackEvent('results_retry_started');
        runSitesOf([site], true);
      })();
      return () => {
        active = false;
      };
    }, [runSitesOf])
  );

  const retryWithSignIn = useCallback(
    (site: SitePlan) => {
      trackButtonClick('results_retry_sign_in');
      pendingRetryRef.current = site;
      navigation.navigate('Login', { apiHost: site.apiHost });
    },
    [navigation]
  );

  const callCountFor = useCallback(
    (apiHost: string) =>
      Object.values(calls).filter(c => c.apiHost === apiHost).length,
    [calls]
  );

  const running = !started || activeRuns > 0;
  const locationNeeded = intent?.location_needed === true;
  const retryable = running
    ? []
    : sitesToRetryWithSignIn(sites, Object.values(calls));
  const top =
    showsBest(mode) && !showAll && (!running || best)
      ? bestResult(results, best)
      : null;

  const renderList = () => (
    <>
      <View className='flex-row items-center justify-between mb-2 px-1'>
        <Text size='sm' weight='semibold' color='muted' transform='uppercase'>
          {t('results.answers')}
        </Text>
        <View className='flex-row'>
          {showsBest(mode) ? (
            <Button
              variant='ghost'
              size='sm'
              onPress={() => setShowAll(false)}
              accessibilityLabel={t('results.showBest')}
            >
              {t('results.showBest')}
            </Button>
          ) : null}
          {locationNeeded ? (
            <>
              <Button
                variant={view === 'list' ? 'primary' : 'outline'}
                size='sm'
                onPress={() => setView('list')}
              >
                {t('results.list')}
              </Button>
              <Button
                variant={view === 'map' ? 'primary' : 'outline'}
                size='sm'
                onPress={() => setView('map')}
              >
                {t('results.map')}
              </Button>
            </>
          ) : null}
        </View>
      </View>
      {view === 'map' && locationNeeded ? (
        <>
          <ResultsMap
            items={results}
            userLocation={location}
            onSelect={item => navigation.navigate('ResultDetail', { item })}
          />
          {!results.some(item => item.location != null) ? (
            <Text size='sm' color='muted' className='mt-2'>
              {t('results.noMapResults')}
            </Text>
          ) : null}
        </>
      ) : (
        results.map(item => (
          <ResultCard
            key={item.id}
            item={item}
            onPress={() =>
              navigation.navigate('ResultDetail', {
                item,
                ...(best?.resultId === item.id ? { reason: best.reason } : {}),
              })
            }
          />
        ))
      )}
    </>
  );

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
          {sites.map((site, index) => {
            const status = statuses[site.apiHost];
            const statusKey = status?.status ?? 'queued';
            const count = callCountFor(site.apiHost);
            const canRetry = retryable.some(r => r.apiHost === site.apiHost);
            return (
              <View
                key={site.apiHost}
                className={`py-3 px-4 ${
                  index > 0 ? 'border-t border-foreground/10' : ''
                }`}
              >
                <View className='flex-row items-center justify-between'>
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
                {canRetry ? (
                  <View className='mt-2'>
                    <Text size='xs' color='muted' className='mb-2'>
                      {t('results.signInNeeded')}
                    </Text>
                    <View className='flex-row'>
                      <Button
                        variant='outline'
                        size='sm'
                        onPress={() => retryWithSignIn(site)}
                        accessibilityLabel={t('results.signInRetry', {
                          site: site.title,
                        })}
                      >
                        {t('results.signInRetry', { site: site.title })}
                      </Button>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Results */}
        {top ? (
          <BestResult
            item={top.item}
            reason={top.reason}
            total={results.length}
            onSeeAll={() => {
              trackButtonClick('results_see_all', { count: results.length });
              setShowAll(true);
            }}
          />
        ) : results.length > 0 && (!showsBest(mode) || showAll) ? (
          renderList()
        ) : results.length > 0 ? (
          <Text size='sm' color='muted' className='px-1'>
            {t('results.soFar', { count: results.length })}
          </Text>
        ) : null}

        {/* States */}
        {error ? (
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
