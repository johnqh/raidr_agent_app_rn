/**
 * Add credential, step one: a search box, and the sites whose domain
 * contains what was typed. Choosing one pushes the same `Login` screen the
 * agent flow uses (web view, popups, Google's user agent), with
 * `purpose: 'credential'`.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Input, Spinner, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/layout/Screen';
import SiteIcon from '@/components/SiteIcon';
import { useSiteSearch } from '@/hooks/useSiteSearch';
import { useSiteBadges } from '@/hooks/useSiteBadges';
import { useCredentialsStore } from '@/stores/credentialsStore';
import { useAddCredential } from '@/screens/settings/addCredentialContext';
import type { FindSiteScreenProps } from '@/navigation/types';
import { trackButtonClick } from '@/analytics';

export default function FindSiteScreen({ navigation }: FindSiteScreenProps) {
  const { t } = useTranslation();
  const { close } = useAddCredential();
  const [text, setText] = useState('');
  const search = useSiteSearch(text);
  const signedIn = useCredentialsStore(s => s.sites);
  const signedInHosts = useMemo(
    () => new Set(signedIn.map(s => s.apiHost)),
    [signedIn]
  );
  const apiHosts = useMemo(
    () => search.hits.map(h => h.apiHost),
    [search.hits]
  );
  const badges = useSiteBadges(apiHosts);

  let body: React.ReactNode;
  if (!search.enabled) {
    body = (
      <Text size='sm' color='muted' className='px-1'>
        {t('settings.addCredential.hint')}
      </Text>
    );
  } else if (search.isLoading) {
    body = <Spinner size='small' />;
  } else if (search.isError) {
    body = (
      <Text size='sm' color='danger' className='px-1'>
        {t('settings.addCredential.error')}
      </Text>
    );
  } else if (search.hits.length === 0) {
    body = (
      <Text size='sm' color='muted' className='px-1'>
        {t('settings.addCredential.noResults', { query: search.query })}
      </Text>
    );
  } else {
    body = (
      <View className='rounded-lg overflow-hidden bg-card'>
        {search.hits.map((hit, i) => (
          <React.Fragment key={hit.apiHost}>
            {i > 0 ? <View className='h-px ml-4 bg-border' /> : null}
            <Pressable
              onPress={() => {
                trackButtonClick('add_credential_site');
                navigation.navigate('Login', {
                  apiHost: hit.apiHost,
                  purpose: 'credential',
                });
              }}
              accessibilityRole='button'
              accessibilityLabel={hit.domain}
              testID={`find-site-${hit.apiHost}`}
              className='flex-row items-center py-3 px-4 min-h-[48px]'
            >
              <View className='mr-3'>
                <SiteIcon
                  domain={hit.domain}
                  size={32}
                  {...(badges[hit.apiHost]?.iconUrl
                    ? { iconUrl: badges[hit.apiHost]!.iconUrl }
                    : {})}
                />
              </View>
              <View className='flex-1 mr-3'>
                <Text size='base'>{hit.domain}</Text>
                {signedInHosts.has(hit.apiHost) ? (
                  <Text size='sm' color='muted' className='mt-0.5'>
                    {t('settings.addCredential.alreadySignedIn')}
                  </Text>
                ) : null}
              </View>
              <Text size='xl' color='muted'>
                {'›'}
              </Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    );
  }

  return (
    <Screen
      title={t('settings.addCredential.title')}
      hideBack
      headerRight={
        <Button
          variant='ghost'
          size='sm'
          onPress={close}
          accessibilityLabel={t('common.cancel')}
          testID='add-credential-cancel'
        >
          {t('common.cancel')}
        </Button>
      }
    >
      <View className='mb-4'>
        <Input
          value={text}
          onChangeText={setText}
          placeholder={t('settings.addCredential.placeholder')}
          autoFocus
          autoCapitalize='none'
          autoCorrect={false}
          autoComplete='off'
          keyboardType='url'
          returnKeyType='search'
          spellCheck={false}
          accessibilityLabel={t('settings.addCredential.placeholder')}
          testID='add-credential-search'
        />
      </View>
      {body}
    </Screen>
  );
}
