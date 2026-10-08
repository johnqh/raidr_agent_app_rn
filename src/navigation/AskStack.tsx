import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { AskStackParamList } from './types';
import AskScreen from '@/screens/AskScreen';
import PermissionScreen from '@/screens/PermissionScreen';
import AllResultsScreen from '@/screens/AllResultsScreen';
import SitesScreen from '@/screens/SitesScreen';
import PrepareScreen from '@/screens/PrepareScreen';
import LoginScreen from '@/screens/LoginScreen';
import ResultsScreen from '@/screens/ResultsScreen';
import ResultDetailScreen from '@/screens/ResultDetailScreen';
import ResultSourcesScreen from '@/screens/ResultSourcesScreen';

const Stack = createNativeStackNavigator<AskStackParamList>();

export function AskStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      // Every screen draws its own iOS-style NavBar (src/components/layout):
      // native headers do not render on macOS / Windows.
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name='Ask'
        component={AskScreen}
        options={{ title: t('ask.title') }}
      />
      <Stack.Screen
        name='Permission'
        component={PermissionScreen}
        options={{ title: t('permission.title') }}
      />
      <Stack.Screen
        name='Sites'
        component={SitesScreen}
        options={{ title: t('sites.title') }}
      />
      <Stack.Screen
        name='Prepare'
        component={PrepareScreen}
        options={{ title: t('prepare.title') }}
      />
      <Stack.Screen
        name='Login'
        component={LoginScreen}
        options={{ title: t('login.title'), presentation: 'modal' }}
      />
      <Stack.Screen
        name='Results'
        component={ResultsScreen}
        options={{ title: t('results.title') }}
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
