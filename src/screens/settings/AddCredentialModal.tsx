/**
 * Add credential: a modal holding a stack of its own — Find site, then the
 * agent flow's `Login` screen (`purpose: 'credential'`) — so the login web
 * view, its popups and the Google user-agent switch are the same code as in
 * a run.
 *
 * Inside the modal:
 * - a fresh `SafeAreaProvider`, because insets measured for the window are
 *   wrong for a sheet (the NavBar would leave a status bar's gap on top);
 * - a tab bar height of 0, because the tab bar's context reaches through
 *   the portal but the bar is not under the modal;
 * - an independent navigation tree, themed like the app's.
 *
 * It closes on Cancel, on the system back gesture, and once a sign-in made
 * while it was open is recorded in `credentialsStore`.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  NavigationIndependentTree,
  useTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import type { AddCredentialStackParamList } from '@/navigation/types';
import FindSiteScreen from '@/screens/FindSiteScreen';
import LoginScreen from '@/screens/LoginScreen';
import { useCredentialsStore } from '@/stores/credentialsStore';
import { AddCredentialContext } from './addCredentialContext';

const Stack = createNativeStackNavigator<AddCredentialStackParamList>();

export default function AddCredentialModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const sites = useCredentialsStore(s => s.sites);
  const openedAt = useRef(0);
  const context = useMemo(() => ({ close: onClose }), [onClose]);

  useEffect(() => {
    if (visible) {
      openedAt.current = Date.now();
    }
  }, [visible]);

  // A sign-in while open is what the modal was for.
  useEffect(() => {
    if (visible && sites.some(s => s.signedInAt >= openedAt.current)) {
      onClose();
    }
  }, [visible, sites, onClose]);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <BottomTabBarHeightContext.Provider value={0}>
          <AddCredentialContext.Provider value={context}>
            <NavigationIndependentTree>
              <NavigationContainer theme={theme}>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name='FindSite' component={FindSiteScreen} />
                  <Stack.Screen name='Login' component={LoginScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </NavigationIndependentTree>
          </AddCredentialContext.Provider>
        </BottomTabBarHeightContext.Provider>
      </SafeAreaProvider>
    </Modal>
  );
}
