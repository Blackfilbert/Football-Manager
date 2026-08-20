import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../src/context/GameContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import * as NavigationBar from 'expo-navigation-bar';
import Constants from 'expo-constants';
import { initAnalytics } from '../src/services/analytics';
import { initAppsFlyer } from '../src/services/appsflyer';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
import { initIAP, endIAP } from '../src/services/iap';

// Hide Android navigation bar for immersive fullscreen
if (Platform.OS === 'android') {
  NavigationBar.setVisibilityAsync('hidden').catch(() => {});
  NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
}

export default function RootLayout() {
  // Inject Twemoji Country Flags web font for flag emoji on Windows/Chromium
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: 'Twemoji Country Flags';
          unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
          src: url('https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1/dist/TwemojiCountryFlags.woff2') format('woff2');
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    initAnalytics();
    initAppsFlyer();
    // Initialize IAP & Ads — skip entirely in Expo Go (native modules unavailable)
    if (Platform.OS !== 'web' && !IS_EXPO_GO) {
      try {
        const iapMod = require('react-native-iap');
        if (iapMod) initIAP(iapMod).catch(() => {});
      } catch (_) {}
      try {
        const almMod = require('react-native-applovin-max');
        const { initAds } = require('../src/services/ads');
        if (almMod) initAds(almMod)?.catch?.(() => {});
      } catch (_) {}
    }
    if (Platform.OS === 'android') {
      const sub = NavigationBar.addVisibilityListener(({ visibility }) => {
        if (visibility === 'visible') {
          setTimeout(() => {
            NavigationBar.setVisibilityAsync('hidden').catch(() => {});
          }, 2000);
        }
      });
      return () => { sub.remove(); endIAP(); };
    }
    return () => { endIAP(); };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GameProvider>
          <View style={styles.root}>
            <StatusBar style="light" hidden={true} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="tabs" />
            </Stack>
          </View>
        </GameProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
});
