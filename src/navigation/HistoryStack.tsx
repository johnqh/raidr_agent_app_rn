import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { HistoryStackParamList } from './types';
import HistoryScreen from '@/screens/HistoryScreen';
import HistoryRunScreen from '@/screens/HistoryRunScreen';
import AllResultsScreen from '@/screens/AllResultsScreen';
import ResultDetailScreen from '@/screens/ResultDetailScreen';
import ResultSourcesScreen from '@/screens/ResultSourcesScreen';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      // Every screen draws its own iOS-style NavBar (src/components/layout):
      // native headers do not render on macOS / Windows.
      screenOptions={{ headerShown: false }}
    >
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
        name='AllResults'
        component={AllResultsScreen}
        options={{ title: t('results.title') }}
      />
      <Stack.Screen
        name='ResultSources'
        component={ResultSourcesScreen}
        options={{ title: t('resultSources.title') }}
      />
      <Stack.Screen
        name='ResultDetail'
        component={ResultDetailScreen}
        options={{ title: t('resultDetail.title') }}
      />
    </Stack.Navigator>
  );
}
