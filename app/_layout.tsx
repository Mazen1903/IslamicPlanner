import React, { useEffect, useState, useCallback } from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, type ThemeMode } from '@/theme';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { initNotificationHandler } from '@/services/notification/NotificationBootstrap';

export default function RootLayout() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('SYSTEM');

  useEffect(() => {
    initNotificationHandler();
    userSettingsRepository
      .get()
      .then(settings => {
        if (settings?.themeMode) {
          setThemeMode(settings.themeMode as ThemeMode);
        }
      })
      .catch(err => {
        console.warn('[RootLayout] Failed to load persisted theme mode:', err);
      });
  }, []);

  const handleModeChange = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      await userSettingsRepository.upsert({ themeMode: mode });
    } catch (err) {
      console.warn('[RootLayout] Failed to persist theme mode:', err);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider mode={themeMode} onModeChange={handleModeChange}>
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
