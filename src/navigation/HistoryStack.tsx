import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { HistoryStackParamList } from './types';
import HistoryScreen from '@/screens/HistoryScreen';
import HistoryRunScreen from '@/screens/HistoryRunScreen';
import ResultDetailScreen from '@/screens/ResultDetailScreen';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name='History'
        component={HistoryScreen}
        options={{ title: t('history.title') }}
      />
      <Stack.Screen
        name='HistoryRun'
        component={HistoryRunScreen}
        options={{ title: t('history.runTitle') }}
      />
      <Stack.Screen
        name='ResultDetail'
        component={ResultDetailScreen}
        options={{ title: t('resultDetail.title') }}
      />
    </Stack.Navigator>
  );
}
