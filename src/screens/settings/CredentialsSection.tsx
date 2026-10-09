/**
 * The sites the user is signed in to (`credentialsStore`), each with its
 * icon, domain and when, and a Sign out; "Sign out of all sites" under the
 * list. Both ask first. What a sign-out removes is `siteSessions.ts`'s.
 * "Add Credential" opens {@link AddCredentialModal}: find a site, sign in.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import SiteIcon from '@/components/SiteIcon';
import { useSiteBadges } from '@/hooks/useSiteBadges';
import { useCredentialsStore } from '@/stores/credentialsStore';
import { signOutOfAllSites, signOutOfSite } from '@/lib/siteSessions';
import type { SiteCredential } from '@/lib/siteCredentials';
import { trackButtonClick, trackEvent } from '@/analytics';
import { SettingsGroup, SettingsRow } from './SettingsRows';
import AddCredentialModal from './AddCredentialModal';

export default function CredentialsSection() {
  const { t, i18n } = useTranslation();
  const sites = useCredentialsStore(s => s.sites);
  const apiHosts = useMemo(() => sites.map(s => s.apiHost), [sites]);
  const badges = useSiteBadges(apiHosts);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const closeAdd = useCallback(() => setAdding(false), []);

  const addButton = (
    <Button
      variant='primary'
      onPress={() => {
        trackButtonClick('add_credential');
        setAdding(true);
      }}
      accessibilityLabel={t('settings.addCredential.cta')}
      testID='credentials-add'
    >
      {t('settings.addCredential.cta')}
    </Button>
  );
  const modal = <AddCredentialModal visible={adding} onClose={closeAdd} />;

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  }, []);

  const confirmSignOut = useCallback(
    (site: SiteCredential, domain: string) => {
      trackButtonClick('site_sign_out');
      Alert.alert(
        t('settings.credentials.signOutTitle', { domain }),
        t('settings.credentials.signOutConfirm', { domain }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.credentials.signOut'),
            style: 'destructive',
            onPress: () =>
              run(async () => {
                await signOutOfSite(site);
                trackEvent('site_signed_out');
              }),
          },
        ]
      );
    },
    [run, t]
  );

  const confirmSignOutAll = useCallback(() => {
    trackButtonClick('site_sign_out_all');
    Alert.alert(
      t('settings.credentials.signOutAll'),
      t('settings.credentials.signOutAllConfirm', { count: sites.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.credentials.signOutAll'),
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await signOutOfAllSites(sites);
              trackEvent('site_signed_out_all');
            }),
        },
      ]
    );
  }, [run, sites, t]);

  if (sites.length === 0) {
    return (
      <>
        <Text size='base' color='muted' className='mb-4 px-1'>
          {t('settings.credentials.empty')}
        </Text>
        {addButton}
        {modal}
      </>
    );
  }

  return (
    <>
      <SettingsGroup footer={t('settings.credentials.description')}>
        {sites.map(site => {
          const badge = badges[site.apiHost];
          const domain = badge?.domain ?? site.apiHost;
          return (
            <SettingsRow
              key={site.apiHost}
              label={domain}
              description={
                site.signedInAt
                  ? t('settings.credentials.signedInAt', {
                      date: new Date(site.signedInAt).toLocaleDateString(
                        i18n.language
                      ),
                    })
                  : undefined
              }
              leading={
                <SiteIcon
                  domain={domain}
                  size={32}
                  {...(badge?.iconUrl ? { iconUrl: badge.iconUrl } : {})}
                />
              }
            >
              <Button
                variant='destructive-outline'
                size='sm'
                disabled={busy}
                onPress={() => confirmSignOut(site, domain)}
                accessibilityLabel={`${t(
                  'settings.credentials.signOut'
                )}: ${domain}`}
                testID={`credential-sign-out-${site.apiHost}`}
              >
                {t('settings.credentials.signOut')}
              </Button>
            </SettingsRow>
          );
        })}
      </SettingsGroup>
      <View className='gap-3'>
        {addButton}
        <Button
          variant='destructive-outline'
          disabled={busy}
          onPress={confirmSignOutAll}
          accessibilityLabel={t('settings.credentials.signOutAll')}
          testID='credentials-sign-out-all'
        >
          {t('settings.credentials.signOutAll')}
        </Button>
      </View>
      {modal}
    </>
  );
}
