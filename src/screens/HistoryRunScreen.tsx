/**
 * History run detail — the saved results of one past run.
 *
 * Loads the run (`GET /runs/:id`) and shows it the way a live run shows: the
 * per-site outcome as tiles (each site's icon and domain), then for a
 * `single` / `best` request the stored best result in full (with why) and
 * "See all N results" (All results, its own screen); otherwise the result
 * list, merged duplicates once (→ Result sources). A list when the window is
 * narrow, tiles when wide.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Badge, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useRun } from '@sudobility/raidr_agent_client';
import Screen, { READABLE_WIDTH } from '@/components/layout/Screen';
import TileGrid from '@/components/layout/TileGrid';
import ResultList from '@/components/ResultList';
import SiteIcon from '@/components/SiteIcon';
import BestResult from '@/components/BestResult';
import { useApi } from '@/context/ApiContext';
import { useAuth } from '@/context/AuthContext';
import { useSiteBadges } from '@/hooks/useSiteBadges';
import { bestResult, showsBest } from '@/lib/results';
import { trackScreenView, trackButtonClick } from '@/analytics';
import type { HistoryRunScreenProps } from '@/navigation/types';

export default function HistoryRunScreen({
  route,
  navigation,
}: HistoryRunScreenProps) {
  const { runId, request } = route.params;
  const { t } = useTranslation();

  const { networkClient, baseUrl } = useApi();
  const { getToken } = useAuth();
  const runQuery = useRun(networkClient, baseUrl, getToken, runId);

  useEffect(() => {
    trackScreenView('HistoryRun');
  }, []);

  const detail = runQuery.data;
  const top =
    detail && showsBest(detail.intent?.selection)
      ? bestResult(detail.results, detail.best)
      : null;
  const hosts = useMemo(
    () => (detail?.sites ?? []).map(s => s.apiHost),
    [detail]
  );
  const badges = useSiteBadges(hosts);

  return (
    <Screen title={t('history.runTitle')} layout='list'>
      <Text size='lg' weight='semibold' className='mb-4'>
        {request}
      </Text>

      {runQuery.isLoading ? (
        <View className='items-center py-8'>
          <Spinner size='large' />
        </View>
      ) : runQuery.isError || !detail ? (
        <Text size='sm' color='danger'>
          {t('history.error')}
        </Text>
      ) : (
        <>
          {detail.sites.length > 0 ? (
            <View className='mb-6'>
              <TileGrid minTileWidth={260}>
                {detail.sites.map(site => {
                  const badge = badges[site.apiHost];
                  const name = badge?.domain ?? site.apiHost;
                  return (
                    <View
                      key={site.apiHost}
                      className='flex-1 flex-row items-center p-4 rounded-lg bg-card border border-foreground/10'
                    >
                      <View className='mr-3'>
                        <SiteIcon
                          {...(badge?.iconUrl
                            ? { iconUrl: badge.iconUrl }
                            : {})}
                          domain={name}
                          size={28}
                        />
                      </View>
                      <Text size='base' className='flex-1 mr-3'>
                        {name}
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
                  );
                })}
              </TileGrid>
            </View>
          ) : null}

          {top ? (
            <View className='items-center'>
              <View style={styles.readable}>
                <BestResult
                  item={top.item}
                  reason={top.reason}
                  total={detail.results.length}
                  onSeeAll={() => {
                    trackButtonClick('history_see_all', {
                      count: detail.results.length,
                    });
                    navigation.navigate('AllResults', {
                      results: detail.results,
                      groups: detail.groups ?? [],
                      best: detail.best ?? null,
                    });
                  }}
                />
              </View>
            </View>
          ) : detail.results.length > 0 ? (
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
              <ResultList
                results={detail.results}
                groups={detail.groups ?? null}
                best={detail.best ?? null}
              />
            </>
          ) : (
            <Text size='sm' color='muted'>
              {t('results.empty')}
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  readable: { width: '100%', maxWidth: READABLE_WIDTH },
});
