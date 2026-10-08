import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { SettingsStackParamList } from './types';
import SettingsScreen from '@/screens/SettingsScreen';
import ApiKeysScreen from '@/screens/ApiKeysScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name='Settings'
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
      <Stack.Screen
        name='ApiKeys'
        component={ApiKeysScreen}
        options={{ title: t('apiKeys.title') }}
      />
    </Stack.Navigator>
  );
}
