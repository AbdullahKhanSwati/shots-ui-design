import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as SplashScreen from 'expo-splash-screen';

import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ShotsProvider, useShots } from './src/store/ShotsStore';
import { colors } from './src/styles/theme';

SplashScreen.preventAutoHideAsync();

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
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
            <OfflineBanner />
          </ShotsProvider>
        </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

// Small toast-style pill reflecting offline / queued / syncing state.
// Positioned as an overlay so it never disturbs screen header layouts.
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
        bottom: (insets.bottom || 0) + 86,
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
