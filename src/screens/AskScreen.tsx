/**
 * Ask screen — the app's entry point.
 *
 * The user describes what they want done. Pressing "Go" classifies the request
 * (`POST /intent`), stashes the intent + candidate sites in the run-flow store,
 * resets any previous site selection, and moves on to the Sites step.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input, Spinner } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '@sudobility/raidr_agent_lib';
import { useClassifyIntent } from '@sudobility/raidr_agent_client';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useApi } from '@/context/ApiContext';
import { useAuth } from '@/context/AuthContext';
import { useRunFlowStore } from '@/stores/runFlowStore';
import { getDeviceLocation } from '@/lib/deviceLocation';
import { trackScreenView, trackButtonClick, trackError } from '@/analytics';
import type { AskScreenProps } from '@/navigation/types';

export default function AskScreen({ navigation }: AskScreenProps) {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();
  const [request, setRequest] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  const { networkClient, baseUrl } = useApi();
  const { getToken } = useAuth();
  const classifyIntent = useClassifyIntent(networkClient, baseUrl, getToken);
  const setFlow = useRunFlowStore(s => s.setFlow);
  const resetSelection = useSelectionStore(s => s.reset);

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
      setFlow(trimmed, intent, candidates, location);
      navigation.navigate('Sites');
    } catch (error) {
      trackError(error instanceof Error ? error.message : 'intent_failed');
    }
  }, [request, classifyIntent, resetSelection, setFlow, navigation, t]);

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
