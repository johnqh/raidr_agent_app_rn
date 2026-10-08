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
 *   and "See all N results", which opens All results (its own screen);
 * - `all`: the list (with a map for location requests) → Result detail. After
 *   every site finished, `data-groups` merges duplicates into one row showing
 *   each site's icon; such a row opens Result sources (pick a site) first.
 *
 * A `fallback` site whose calls all failed with 401/403 gets "Sign in to
 * <site> and retry": the Login web view, then a re-run of that site alone
 * (its earlier results and calls are replaced).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, Badge, Button, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type {
  BestData,
  CallData,
  ResultGroup,
  ResultItem,
  SitePlan,
  SiteStatusData,
} from '@sudobility/raidr_agent_types';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@sudobility/raidr_agent_client';
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
import { useSiteBadges } from '@/hooks/useSiteBadges';
import ResultList from '@/components/ResultList';
import Screen, { READABLE_WIDTH } from '@/components/layout/Screen';
import TileGrid from '@/components/layout/TileGrid';
import SiteIcon from '@/components/SiteIcon';
import ResultsMap from '@/components/ResultsMap';
import BestResult from '@/components/BestResult';
import { trackScreenView, trackButtonClick, trackEvent } from '@/analytics';
import type { ResultsScreenProps } from '@/navigation/types';

export default function ResultsScreen({ navigation }: ResultsScreenProps) {
  const { t } = useTranslation();

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
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState(0);
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');

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
        // The retried site's results are new; its old merges no longer hold.
        setGroups([]);
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
            case 'groups':
              setGroups(part.data.groups);
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
    showsBest(mode) && (!running || best) ? bestResult(results, best) : null;
  // The run's sites, for their domain and icon in the progress tiles.
  const siteHosts = useMemo(
    () => sites.map(s => s.apiHost),
    // `sites` is derived from `plan` each render; key on the plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan]
  );
  const badges = useSiteBadges(siteHosts);

  const seeAll = () => {
    trackButtonClick('results_see_all', { count: results.length });
    navigation.navigate('AllResults', { results, groups, best });
  };

  return (
    <Screen
      title={t('results.title')}
      layout='list'
      headerRight={
        locationNeeded && !showsBest(mode) && results.length > 0 ? (
          <Button
            variant='ghost'
            size='sm'
            onPress={() => setView(view === 'list' ? 'map' : 'list')}
            accessibilityLabel={t(
              view === 'list' ? 'results.map' : 'results.list'
            )}
          >
            {t(view === 'list' ? 'results.map' : 'results.list')}
          </Button>
        ) : undefined
      }
    >
      {/* Progress */}
      <Text
        size='sm'
        weight='semibold'
        color='muted'
        transform='uppercase'
        className='mb-2 tracking-wide'
      >
        {t('results.progress')}
      </Text>
      <View className='mb-6'>
        <TileGrid minTileWidth={260}>
          {sites.map(site => {
            const status = statuses[site.apiHost];
            const statusKey = status?.status ?? 'queued';
            const count = callCountFor(site.apiHost);
            const canRetry = retryable.some(r => r.apiHost === site.apiHost);
            const badge = badges[site.apiHost];
            const name = badge?.domain ?? site.title;
            return (
              <View
                key={site.apiHost}
                className='flex-1 p-4 rounded-lg bg-card border border-foreground/10'
              >
                <View className='flex-row items-center'>
                  <View className='mr-3'>
                    <SiteIcon
                      {...(badge?.iconUrl ? { iconUrl: badge.iconUrl } : {})}
                      domain={name}
                      size={28}
                    />
                  </View>
                  <View className='flex-1 mr-3'>
                    <Text size='base'>{name}</Text>
                    {count > 0 ? (
                      <Text size='xs' color='muted' className='mt-0.5'>
                        {t('results.calls', { count })}
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
                {status?.message ? (
                  <Text size='xs' color='muted' className='mt-2'>
                    {status.message}
                  </Text>
                ) : null}
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
                          site: name,
                        })}
                      >
                        {t('results.signInRetry', { site: name })}
                      </Button>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </TileGrid>
      </View>

      {/* Answers */}
      {top ? (
        <View className='items-center'>
          <View style={styles.readable}>
            <BestResult
              item={top.item}
              reason={top.reason}
              total={results.length}
              onSeeAll={seeAll}
            />
          </View>
        </View>
      ) : results.length > 0 && !showsBest(mode) ? (
        <>
          <Text
            size='sm'
            weight='semibold'
            color='muted'
            transform='uppercase'
            className='mb-2 tracking-wide'
          >
            {t('results.answers')}
          </Text>
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
            <ResultList results={results} groups={groups} best={best} />
          )}
        </>
      ) : results.length > 0 ? (
        <Text size='sm' color='muted'>
          {t('results.soFar', { count: results.length })}
        </Text>
      ) : null}

      {/* States */}
      {error ? (
        <Text size='sm' color='danger' className='mt-2'>
          {error}
        </Text>
      ) : running ? (
        <View className='flex-row items-center mt-2'>
          <Spinner size='small' />
          <Text size='sm' color='muted' className='ml-2'>
            {t('results.running')}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <Text size='sm' color='muted' className='mt-2'>
          {t('results.empty')}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  readable: { width: '100%', maxWidth: READABLE_WIDTH },
});
