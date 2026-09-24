import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as SplashScreen from 'expo-splash-screen';

import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ShotsProvider, useShots } from './src/store/ShotsStore';
import { colors } from './src/styles/theme';

SplashScreen.preventAutoHideAsync();

const navigationRef = createNavigationContainerRef();

const navTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 500));
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
        <AuthProvider>
          <ShotsProvider>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
            <SessionWatcher />
            <OfflineBanner />
          </ShotsProvider>
        </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

// When a signed-in session disappears (sign-out elsewhere, or the admin deleted
// this login) send the user back to Login. A deleted login also gets a notice.
const PUBLIC_ROUTES = ['Splash', 'Login', 'BusinessSelection'];
function SessionWatcher() {
  const { session, loading, revoked, clearRevoked } = useAuth();
  const hadSession = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (session) { hadSession.current = true; return; }
    if (!hadSession.current && !revoked) return;
    hadSession.current = false;
    if (navigationRef.isReady()) {
      const current = navigationRef.getCurrentRoute()?.name;
      if (!PUBLIC_ROUTES.includes(current)) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
    if (revoked) {
      Alert.alert('Signed out', 'Your login was removed by the admin. Please contact your manager if you need access again.');
      clearRevoked();
    }
  }, [session, loading, revoked, clearRevoked]);

  return null;
}

// Small toast-style pill reflecting offline / queued / syncing state.
// Pinned to the top as an overlay so it never covers the bottom tab bar or the
// on-screen confirmation buttons that live above it.
function OfflineBanner() {
  const { offline, pending, syncing } = useShots();
  const insets = useSafeAreaInsets();

  let icon = null;
  let text = null;
  let dot = '#F4B860';
  if (syncing && pending > 0) {
    icon = 'sync-outline'; dot = '#10B981';
    text = `Syncing ${pending} change${pending === 1 ? '' : 's'}…`;
  } else if (pending > 0) {
    icon = 'cloud-upload-outline';
    text = `${pending} change${pending === 1 ? '' : 's'} waiting to sync`;
  } else if (offline) {
    icon = 'cloud-offline-outline';
    text = 'Offline — showing saved data';
  }
  if (!text) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: (insets.top || 0) + 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(17,17,17,0.92)',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
        }}
      >
        <Ionicons name={icon} size={14} color={dot} />
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{text}</Text>
      </View>
    </View>
  );
}
