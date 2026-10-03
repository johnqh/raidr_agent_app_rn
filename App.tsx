// Configure the Firebase China proxy before anything initializes Firebase.
// Blank/unset means standard Firebase (the library holds no default).
// NOTE: covers the Firebase JS SDK — which is now auth on every platform —
// but not the @react-native-firebase native modules (analytics, crashlytics,
// messaging, remote config), which still reach Google directly.
import { setFirebaseProxy } from '@sudobility/di';
import { env } from '@/config/env';
setFirebaseProxy(env.FIREBASE_PROXY || null);

import '@/polyfills/localStorage'; // Must be first — before any Zustand store import
import './global.css'; // NativeWind: Tailwind directives for className styling
import '@/config/designTheme'; // Activate the design-system theme (before any variants render)
import 'react-native-gesture-handler';
import '@/i18n'; // Initialize i18n
import React, { useState, useEffect } from 'react';
import { NativeModules, StyleSheet } from 'react-native';
NativeModules.DevLoadingView?.hide();
import { loadStoredLanguagePreference } from '@/i18n';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ApiProvider } from '@/context/ApiContext';
import { useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@sudobility/building_blocks_rn';
import { ThemeVarsProvider } from '@/components/ThemeVarsProvider';
import { AppNavigator } from '@/navigation';
import SplashScreen from '@/screens/SplashScreen';
import { initializeAllServices } from '@/di/initializeServices';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

function AppContent() {
  const { isReady } = useAuth();

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <>
      <AppNavigator />
      <StatusBar style='auto' />
    </>
  );
}

export default function App() {
  const [servicesReady, setServicesReady] = useState(false);

  useEffect(() => {
    initializeAllServices()
      .then(() => setServicesReady(true))
      .catch(error => {
        console.error('[App] Failed to initialize services:', error);
        // Still allow app to render even if some services fail
        setServicesReady(true);
      });
    loadStoredLanguagePreference();
  }, []);

  if (!servicesReady) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeVarsProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <ApiProvider>
                <QueryClientProvider client={queryClient}>
                  <AppContent />
                </QueryClientProvider>
              </ApiProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </ThemeVarsProvider>
    </GestureHandlerRootView>
  );
}
