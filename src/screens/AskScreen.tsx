/**
 * Ask screen — the app's entry point.
 *
 * The user describes what they want done. Pressing "Go" understands the
 * request with the device context (country, locale, time zone, clock) —
 * through `POST /intent` in cloud mode, or on this device with the user's own
 * AI key in local mode ({@link understandRequest}) — stashes the intent and
 * the ranked candidate sites in the run-flow store, opens the site selection
 * for the intent's selection mode, and moves on to the Sites step.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import type { IntentResponse } from '@sudobility/raidr_agent_types';
import { useMutation } from '@tanstack/react-query';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAuth } from '@/context/AuthContext';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { useAgentClient } from '@/hooks/useAgentClient';
import { understandRequest } from '@/lib/agentFlow';
import { getDeviceContext } from '@/lib/deviceContext';
import { initialSelection } from '@/lib/sites';
import { getDeviceLocation } from '@/lib/deviceLocation';
import {
  trackScreenView,
  trackButtonClick,
  trackError,
  trackEvent,
} from '@/analytics';
import type { AskScreenProps } from '@/navigation/types';

export default function AskScreen({ navigation }: AskScreenProps) {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();
  const [request, setRequest] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  const { getToken } = useAuth();
  const client = useAgentClient();
  // Local mode is decided per press: with no saved key it runs in the cloud.
  const classifyIntent = useMutation<IntentResponse, Error, string>({
    mutationFn: text =>
      understandRequest(client, getToken, {
        request: text,
        ...getDeviceContext(),
      }),
  });
  const setFlow = useRunFlowStore(s => s.setFlow);
  const resetSelection = useSelectionStore(s => s.reset);
  const selectSite = useSelectionStore(s => s.select);

  useEffect(() => {
    trackScreenView('Ask');
  }, []);

  const handleGo = useCallback(async () => {
    const trimmed = request.trim();
    if (!trimmed || classifyIntent.isPending) {
      return;
    }
    trackButtonClick('ask_go');
    setLocationError(false);
    try {
      const { intent, candidates } = await classifyIntent.mutateAsync(trimmed);
      trackEvent('intent_understood', {
        selection: intent.selection,
        result_kind: intent.resultKind,
        candidates: candidates.length,
        location_needed: intent.location_needed,
      });
      let location = null;
      if (intent.location_needed) {
        const shareLocation = await new Promise<boolean>(resolve => {
          Alert.alert(
            t('ask.locationDisclosureTitle'),
            t('ask.locationDisclosure'),
            [
              {
                text: t('common.cancel'),
                style: 'cancel',
                onPress: () => resolve(false),
              },
              { text: t('common.continue'), onPress: () => resolve(true) },
            ],
            { cancelable: false }
          );
        });
        if (!shareLocation) {
          setLocationError(true);
          return;
        }
        setLocating(true);
        try {
          location = await getDeviceLocation();
        } catch {
          // A disabled location service or a failed position fix also blocks the run.
        } finally {
          setLocating(false);
        }
        if (!location) {
          setLocationError(true);
          return;
        }
      }
      resetSelection();
      for (const apiHost of initialSelection(intent.selection, candidates)) {
        selectSite(apiHost, true);
      }
      setFlow(trimmed, intent, candidates, location);
      navigation.navigate('Sites');
    } catch (error) {
      trackError(error instanceof Error ? error.message : 'intent_failed');
    }
  }, [
    request,
    classifyIntent,
    resetSelection,
    selectSite,
    setFlow,
    navigation,
    t,
  ]);

  const busy = classifyIntent.isPending || locating;
  const canSubmit = request.trim().length > 0 && !busy;

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 16 },
        ]}
        keyboardShouldPersistTaps='handled'
      >
        <Text size='xl' weight='semibold' className='mb-3'>
          {t('ask.heading')}
        </Text>
        <Input
          className='mb-3'
          placeholder={t('ask.placeholder')}
          value={request}
          onChangeText={setRequest}
          multiline
          editable={!busy}
          accessibilityLabel={t('ask.heading')}
          testID='ask-input'
        />
        <View className='items-end'>
          <Button
            variant='primary'
            disabled={!canSubmit}
            onPress={handleGo}
            accessibilityLabel={t('ask.go')}
            testID='ask-go'
          >
            {t('ask.go')}
          </Button>
        </View>
        {busy ? (
          <View className='flex-row items-center mt-4'>
            <Spinner size='small' />
            <Text size='sm' color='muted' className='ml-2'>
              {t(locating ? 'ask.locating' : 'ask.classifying')}
            </Text>
          </View>
        ) : null}
        {classifyIntent.isError ? (
          <Text size='sm' color='danger' className='mt-4'>
            {t('ask.error')}
            {classifyIntent.error?.message
              ? `\n${classifyIntent.error.message}`
              : ''}
          </Text>
        ) : null}
        {locationError ? (
          <Text size='sm' color='danger' className='mt-4'>
            {t('ask.locationRequired')}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
});
