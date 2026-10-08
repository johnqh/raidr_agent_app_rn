/**
 * Ask screen — the app's entry point.
 *
 * The user describes what they want done. Pressing "Go" understands the
 * request with the device context (country, locale, time zone, clock) —
 * through `POST /intent` in cloud mode, or on this device with the user's own
 * AI key in local mode ({@link understandRequest}) — stashes the intent and
 * the ranked candidate sites in the run-flow store, opens the site selection
 * for the intent's selection mode, and moves on to the Sites step — through
 * the location permission screen first when the request is about "near me"
 * ({@link usePermissionGate}; it is not left in the back stack).
 *
 * Every step needs an account, so Go while signed out opens `SignInModal`
 * over this screen and continues with the request once the user signs in.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text, Button, Input, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import type { IntentResponse } from '@sudobility/raidr_agent_types';
import { useMutation } from '@tanstack/react-query';
import Screen from '@/components/layout/Screen';
import { usePermissionGate } from '@/hooks/usePermissionGate';
import { useAuth } from '@/context/AuthContext';
import SignInModal from '@/components/SignInModal';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { useAgentClient } from '@/hooks/useAgentClient';
import { understandRequest } from '@/lib/agentFlow';
import { getDeviceContext } from '@/lib/deviceContext';
import { initialSelection } from '@/lib/sites';
import {
  trackScreenView,
  trackButtonClick,
  trackError,
  trackEvent,
} from '@/analytics';
import type { AskScreenProps } from '@/navigation/types';

export default function AskScreen({ navigation }: AskScreenProps) {
  const { t } = useTranslation();
  const [request, setRequest] = useState('');
  const gate = usePermissionGate();

  const [showSignIn, setShowSignIn] = useState(false);
  // Go was pressed while signed out: run the request once sign-in succeeds.
  const goAfterSignIn = useRef(false);

  const { user, getToken } = useAuth();
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
    if (!user) {
      goAfterSignIn.current = true;
      setShowSignIn(true);
      return;
    }
    try {
      const { intent, candidates } = await classifyIntent.mutateAsync(trimmed);
      trackEvent('intent_understood', {
        selection: intent.selection,
        result_kind: intent.resultKind,
        candidates: candidates.length,
        location_needed: intent.location_needed,
      });
      resetSelection();
      for (const apiHost of initialSelection(intent.selection, candidates)) {
        selectSite(apiHost, true);
      }
      setFlow(trimmed, intent, candidates, null);
      if (intent.location_needed) {
        await gate.goWith('location', { name: 'Sites' });
      } else {
        navigation.navigate('Sites');
      }
    } catch (error) {
      trackError(error instanceof Error ? error.message : 'intent_failed');
    }
  }, [
    request,
    user,
    classifyIntent,
    resetSelection,
    selectSite,
    setFlow,
    navigation,
    gate,
  ]);

  useEffect(() => {
    if (user && goAfterSignIn.current) {
      goAfterSignIn.current = false;
      setShowSignIn(false);
      handleGo();
    }
  }, [user, handleGo]);

  // The modal reports success, then closes itself; `user` may arrive after
  // either, so only a close without a sign-in drops the pending request.
  const signedIn = useRef(false);
  const closeSignIn = useCallback(() => {
    if (!signedIn.current) {
      goAfterSignIn.current = false;
    }
    signedIn.current = false;
    setShowSignIn(false);
  }, []);
  const onSignedIn = useCallback(() => {
    signedIn.current = true;
  }, []);

  const busy = classifyIntent.isPending || gate.busy;
  const canSubmit = request.trim().length > 0 && !busy;

  return (
    <Screen title={t('ask.title')} hideBack valign='center'>
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
            {t(gate.busy ? 'ask.locating' : 'ask.classifying')}
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
      <SignInModal
        visible={showSignIn}
        onClose={closeSignIn}
        onSuccess={onSignedIn}
      />
    </Screen>
  );
}
