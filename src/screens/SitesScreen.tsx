/**
 * Sites screen — pick which sites the run should call.
 *
 * Candidates are grouped under their first label. A site with no sign-in
 * (`authStyle === 'none'`) can be checked immediately; a site that needs
 * sign-in stays disabled until a token is stored for its `apiHost` (shown as
 * "Signed in"), which happens through the Login web view. "Next" is enabled once
 * at least one site is checked.
 */

import React, { useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Text, Button, Badge, Checkbox } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import type { CandidateSite } from '@sudobility/raidr_agent_types';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { getSiteToken } from '@/lib/secureStorage';
import {
  groupByLabel,
  canSelect,
  needsSignIn,
  isNextEnabled,
} from '@/lib/sites';
import { trackScreenView, trackButtonClick } from '@/analytics';
import type { SitesScreenProps } from '@/navigation/types';

export default function SitesScreen({ navigation }: SitesScreenProps) {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const candidates = useRunFlowStore(s => s.candidates);
  const { selected, authorized, toggle, setAuthorized } = useSelectionStore();

  useEffect(() => {
    trackScreenView('Sites');
  }, []);

  // Seed `authorized` from the Keychain: a site we already hold a token for is
  // immediately selectable. Re-run on focus so a token stored in the Login step
  // is reflected on return.
  const seedAuthorized = useCallback(() => {
    let cancelled = false;
    (async () => {
      for (const site of candidates) {
        if (!needsSignIn(site)) {
          continue;
        }
        const token = await getSiteToken(site.apiHost);
        if (!cancelled && token) {
          setAuthorized(site.apiHost, true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidates, setAuthorized]);

  useFocusEffect(seedAuthorized);

  const groups = groupByLabel(candidates);
  const nextEnabled = isNextEnabled(selected);

  const handleNext = useCallback(() => {
    trackButtonClick('sites_next');
    navigation.navigate('Results');
  }, [navigation]);

  const renderRow = (site: CandidateSite) => {
    const checkable = canSelect(site, authorized);
    const isAuthorized = authorized.has(site.apiHost);
    return (
      <View
        key={site.apiHost}
        className='flex-row items-center py-3 px-4 border-t border-foreground/10'
      >
        <View className='flex-1 mr-3'>
          <View className='flex-row items-center mb-1'>
            <Badge
              variant={needsSignIn(site) ? 'warning' : 'success'}
              size='sm'
            >
              {needsSignIn(site)
                ? t('sites.auth.required')
                : t('sites.auth.none')}
            </Badge>
            <Text size='xs' color='muted' className='ml-2'>
              {t('sites.tools', { count: site.toolCount })}
            </Text>
          </View>
          <Text size='base' weight='semibold'>
            {site.title}
          </Text>
          {site.description ? (
            <Text size='sm' color='muted' numberOfLines={2}>
              {site.description}
            </Text>
          ) : null}
          {needsSignIn(site) ? (
            <View className='mt-2 flex-row'>
              {isAuthorized ? (
                <Text size='sm' color='success'>
                  {t('sites.signedIn')}
                </Text>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  onPress={() => {
                    trackButtonClick('sites_login');
                    navigation.navigate('Login', { apiHost: site.apiHost });
                  }}
                  accessibilityLabel={t('sites.logIn')}
                >
                  {t('sites.logIn')}
                </Button>
              )}
            </View>
          ) : null}
        </View>
        <Checkbox
          checked={selected.has(site.apiHost)}
          disabled={!checkable}
          onChange={() => toggle(site.apiHost)}
          accessibilityLabel={site.title}
        />
      </View>
    );
  };

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 96 },
        ]}
      >
        {candidates.length === 0 ? (
          <View className='px-4 py-8'>
            <Text size='base' color='muted'>
              {t('sites.empty')}
            </Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.label || 'other'} className='mb-6'>
              <Text
                size='sm'
                weight='semibold'
                color='muted'
                transform='uppercase'
                className='mb-2 px-4 tracking-wide'
              >
                {group.label || t('sites.otherLabel')}
              </Text>
              <View className='rounded-lg overflow-hidden bg-card [&>*:first-child]:border-t-0'>
                {group.sites.map(renderRow)}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <View
        className='absolute left-0 right-0 bottom-0 px-4 pt-3 bg-background border-t border-foreground/10'
        style={{ paddingBottom: tabBarHeight + 12 }}
      >
        <Button
          variant='primary'
          disabled={!nextEnabled}
          onPress={handleNext}
          accessibilityLabel={t('sites.next')}
          testID='sites-next'
        >
          {t('sites.next')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16 },
});
