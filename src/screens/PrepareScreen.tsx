/**
 * Prepare screen — between choosing sites and running them.
 *
 * On open it prepares the chosen sites (`POST /prepare` in the cloud, or
 * `prepareSites` on the device in local mode; {@link prepareRequest}): which
 * tools each site will use, whether it needs the user signed in, and one
 * merged form of the inputs the request does not already answer. The screen
 * then shows:
 *
 * - sites that must be signed in (`required`) with a Sign in button (the
 *   Login web view) or a "Signed in" check once a token is stored;
 * - sites that run without asking but can do more signed in (`fallback`;
 *   a stored token is sent with them);
 * - sites dropped as unsupported, with the reason;
 * - the form, prefilled with each field's default.
 *
 * Run is enabled when the form is valid and every `required` site is signed
 * in. It stores the plan and the coerced inputs in the run-flow store and
 * moves to Results.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Text, Button, Badge, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import type { PrepareResponse, SitePlan } from '@sudobility/raidr_agent_types';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAgentClient } from '@/hooks/useAgentClient';
import { useAuth } from '@/context/AuthContext';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { getSiteToken } from '@/lib/secureStorage';
import { prepareRequest } from '@/lib/agentFlow';
import { selectedInOrder } from '@/lib/sites';
import {
  checkForm,
  fallbackSites,
  initialDraft,
  isRunReady,
  sitesRequiringSignIn,
  supportedSites,
  unsupportedSites,
  type DraftValue,
  type FormDraft,
} from '@/lib/prepare';
import PreparedFormField from '@/components/PreparedFormField';
import {
  trackScreenView,
  trackButtonClick,
  trackError,
  trackEvent,
} from '@/analytics';
import type { PrepareScreenProps } from '@/navigation/types';

export default function PrepareScreen({ navigation }: PrepareScreenProps) {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const request = useRunFlowStore(s => s.request);
  const intent = useRunFlowStore(s => s.intent);
  const candidates = useRunFlowStore(s => s.candidates);
  const location = useRunFlowStore(s => s.location);
  const plan = useRunFlowStore(s => s.plan);
  const setPlan = useRunFlowStore(s => s.setPlan);
  const setInputs = useRunFlowStore(s => s.setInputs);

  const authorized = useSelectionStore(s => s.authorized);
  const setAuthorized = useSelectionStore(s => s.setAuthorized);

  const client = useAgentClient();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormDraft>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    trackScreenView('Prepare');
  }, []);

  // Prepare the chosen sites (again on Retry).
  useEffect(() => {
    if (!intent) {
      setError(t('results.missing'));
      setLoading(false);
      return;
    }
    let cancelled = false;
    const sites = selectedInOrder(
      candidates,
      useSelectionStore.getState().selected
    ).map(s => s.apiHost);
    setLoading(true);
    setError(null);
    setPlan(null);
    prepareRequest(client, getToken, {
      request,
      intent,
      sites,
      ...(location ? { location } : {}),
    })
      .then((response: PrepareResponse) => {
        if (cancelled) {
          return;
        }
        setPlan(response);
        setDraft(initialDraft(response.form));
        setTouched(new Set());
        trackEvent('prepare_ready', {
          sites: response.sites.length,
          unsupported: unsupportedSites(response).length,
          required: sitesRequiringSignIn(response).length,
          fallback: fallbackSites(response).length,
          fields: response.form.length,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        trackError('prepare_failed');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // Only on open and on Retry; the inputs come from the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Reflect tokens already stored (and one stored by the Login step on return).
  const seedAuthorized = useCallback(() => {
    let cancelled = false;
    if (!plan) {
      return undefined;
    }
    (async () => {
      for (const site of supportedSites(plan)) {
        if (site.login === 'none') {
          continue;
        }
        const token = await getSiteToken(site.apiHost);
        if (!cancelled) {
          setAuthorized(site.apiHost, !!token);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan, setAuthorized]);
  useFocusEffect(seedAuthorized);

  const form = useMemo(
    () => (plan ? checkForm(plan.form, draft) : null),
    [plan, draft]
  );
  const ready = !!plan && !!form && isRunReady(plan, form, authorized);

  const setField = useCallback((name: string, value: DraftValue) => {
    setDraft(prev => ({ ...prev, [name]: value }));
    setTouched(prev => (prev.has(name) ? prev : new Set(prev).add(name)));
  }, []);

  const signIn = useCallback(
    (site: SitePlan) => {
      trackButtonClick('prepare_sign_in', { login: site.login });
      navigation.navigate('Login', { apiHost: site.apiHost });
    },
    [navigation]
  );

  const handleRun = useCallback(() => {
    if (!plan || !form || !ready) {
      return;
    }
    trackButtonClick('prepare_run', {
      sites: supportedSites(plan).length,
      fields: plan.form.length,
      filled: Object.keys(form.inputs).length,
    });
    setInputs(form.inputs);
    navigation.navigate('Results');
  }, [plan, form, ready, setInputs, navigation]);

  const renderSignInRow = (site: SitePlan, index: number) => {
    const signedIn = authorized.has(site.apiHost);
    const required = site.login === 'required';
    return (
      <View
        key={site.apiHost}
        className={`py-3 px-4 ${
          index > 0 ? 'border-t border-foreground/10' : ''
        }`}
      >
        <View className='flex-row items-center justify-between'>
          <View className='flex-1 mr-3'>
            <View className='flex-row items-center mb-1'>
              <Text size='base' weight='semibold' className='mr-2'>
                {site.title}
              </Text>
              <Badge variant={required ? 'warning' : 'info'} size='sm'>
                {required
                  ? t('prepare.signInRequired')
                  : t('prepare.signInOptional')}
              </Badge>
            </View>
            <Text size='sm' color='muted'>
              {site.loginReason ||
                (required
                  ? t('prepare.requiredNote')
                  : t('prepare.fallbackNote'))}
            </Text>
          </View>
          {signedIn ? (
            <Text size='sm' color='success'>
              {`✓ ${t('sites.signedIn')}`}
            </Text>
          ) : (
            <Button
              variant={required ? 'primary' : 'outline'}
              size='sm'
              onPress={() => signIn(site)}
              accessibilityLabel={t('prepare.signInTo', { site: site.title })}
            >
              {required ? t('prepare.signIn') : t('prepare.signInForMore')}
            </Button>
          )}
        </View>
      </View>
    );
  };

  const signInSites = plan
    ? supportedSites(plan).filter(s => s.login !== 'none')
    : [];
  const dropped = plan ? unsupportedSites(plan) : [];
  const runnable = plan ? supportedSites(plan) : [];
  const missingSignIn = plan
    ? sitesRequiringSignIn(plan).filter(s => !authorized.has(s.apiHost))
    : [];

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 112 },
        ]}
        keyboardShouldPersistTaps='handled'
      >
        {loading ? (
          <View className='flex-row items-center py-6'>
            <Spinner size='small' />
            <Text size='sm' color='muted' className='ml-2'>
              {t('prepare.loading')}
            </Text>
          </View>
        ) : error || !plan ? (
          <View className='py-6'>
            <Text size='sm' color='danger'>
              {t('prepare.error')}
              {error ? `\n${error}` : ''}
            </Text>
            <View className='flex-row mt-4'>
              <Button
                variant='outline'
                onPress={() => setAttempt(n => n + 1)}
                accessibilityLabel={t('prepare.retry')}
              >
                {t('prepare.retry')}
              </Button>
            </View>
          </View>
        ) : (
          <>
            {runnable.length === 0 ? (
              <Text size='sm' color='danger' className='mb-6'>
                {t('prepare.noneSupported')}
              </Text>
            ) : null}

            {signInSites.length > 0 ? (
              <>
                <Text
                  size='sm'
                  weight='semibold'
                  color='muted'
                  transform='uppercase'
                  className='mb-2 px-1 tracking-wide'
                >
                  {t('prepare.signInHeading')}
                </Text>
                <View className='rounded-lg overflow-hidden bg-card mb-6'>
                  {signInSites.map(renderSignInRow)}
                </View>
              </>
            ) : null}

            {plan.form.length > 0 ? (
              <>
                <Text
                  size='sm'
                  weight='semibold'
                  color='muted'
                  transform='uppercase'
                  className='mb-2 px-1 tracking-wide'
                >
                  {t('prepare.formHeading')}
                </Text>
                <View className='rounded-lg bg-card p-4 mb-6'>
                  {plan.form.map(field => (
                    <PreparedFormField
                      key={field.name}
                      field={field}
                      value={draft[field.name]}
                      onChange={value => setField(field.name, value)}
                      error={
                        touched.has(field.name)
                          ? form?.errors[field.name]
                          : undefined
                      }
                    />
                  ))}
                </View>
              </>
            ) : runnable.length > 0 ? (
              <Text size='sm' color='muted' className='mb-6 px-1'>
                {t('prepare.noForm')}
              </Text>
            ) : null}

            {dropped.length > 0 ? (
              <>
                <Text
                  size='sm'
                  weight='semibold'
                  color='muted'
                  transform='uppercase'
                  className='mb-2 px-1 tracking-wide'
                >
                  {t('prepare.droppedHeading')}
                </Text>
                <View className='rounded-lg overflow-hidden bg-card mb-6'>
                  {dropped.map((site, index) => (
                    <View
                      key={site.apiHost}
                      className={`py-3 px-4 ${
                        index > 0 ? 'border-t border-foreground/10' : ''
                      }`}
                    >
                      <Text size='base'>{site.title}</Text>
                      <Text size='sm' color='muted'>
                        {site.unsupported}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
      <View
        className='absolute left-0 right-0 bottom-0 px-4 pt-3 bg-background border-t border-foreground/10'
        style={{ paddingBottom: tabBarHeight + 12 }}
      >
        {plan && missingSignIn.length > 0 ? (
          <Text size='xs' color='muted' className='mb-2'>
            {t('prepare.signInFirst', {
              sites: missingSignIn.map(s => s.title).join(', '),
            })}
          </Text>
        ) : plan && form && !form.valid ? (
          <Text size='xs' color='muted' className='mb-2'>
            {t('prepare.fillRequired')}
          </Text>
        ) : null}
        <Button
          variant='primary'
          disabled={!ready || loading}
          onPress={handleRun}
          accessibilityLabel={t('prepare.run')}
          testID='prepare-run'
        >
          {t('prepare.run')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
