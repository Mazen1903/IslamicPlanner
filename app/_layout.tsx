import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { initNotificationHandler } from '@/services/notification/NotificationBootstrap';

export default function RootLayout() {
  useEffect(() => {
    initNotificationHandler();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
