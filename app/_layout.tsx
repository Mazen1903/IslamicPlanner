import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme, type ThemeMode } from '@/theme';
import { Button } from '@/components/common/Button';
import { getDatabase } from '@/data/db';
import { migrateDatabase } from '@/data/migrator';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { initNotificationHandler } from '@/services/notification/NotificationBootstrap';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

export type BootstrapState = 'LOADING' | 'READY' | 'ERROR';

export function BootstrapLoadingView() {
  const theme = useTheme();
  return (
    <View
      testID="bootstrap-loading-view"
      style={[
        styles.centerContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export function BootstrapErrorView({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View
      testID="bootstrap-error-view"
      style={[
        styles.centerContainer,
        { backgroundColor: theme.colors.background, padding: theme.spacing.lg },
      ]}
    >
      <Text
        style={[
          theme.typography.headlineMedium,
          { color: theme.colors.textPrimary, marginBottom: theme.spacing.md, textAlign: 'center' },
        ]}
      >
        Unable to load app setup.
      </Text>
      <Button
        testID="bootstrap-retry-button"
        title="Retry"
        onPress={onRetry}
      />
    </View>
  );
}

/**
 * Renders the native status bar with the correct icon style for the active theme.
 * Must be rendered inside ThemeProvider.
 */
export function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export function RootGate() {
  const status = useOnboardingStore(s => s.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    useOnboardingStore.getState().initialize();
  }, []);

  const inOnboarding = segments[0] === 'onboarding';

  const mustRedirectToOnboarding = status === 'PENDING' && !inOnboarding;
  const mustRedirectToToday = status === 'COMPLETE' && inOnboarding;

  useEffect(() => {
    if (mustRedirectToOnboarding) {
      router.replace('/onboarding');
    } else if (mustRedirectToToday) {
      router.replace('/(tabs)/today');
    }
  }, [mustRedirectToOnboarding, mustRedirectToToday, router]);

  if (status === 'LOADING') {
    return <BootstrapLoadingView />;
  }

  if (status === 'ERROR') {
    return (
      <BootstrapErrorView
        onRetry={() => {
          useOnboardingStore.getState().retry();
        }}
      />
    );
  }

  if (mustRedirectToOnboarding || mustRedirectToToday) {
    return <BootstrapLoadingView />;
  }

  return <Slot />;
}

export default function RootLayout() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('SYSTEM');
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>('LOADING');
  const [retryTrigger, setRetryTrigger] = useState(0);

  const handleRetry = useCallback(() => {
    setBootstrapState('LOADING');
    setRetryTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Step 1: Notifications bootstrap (side-effect only, no DB)
      await initNotificationHandler();

      // Step 2: Runtime database migration (P0 fix: RB-M24-BOOTSTRAP)
      try {
        const db = getDatabase();
        await migrateDatabase(db);
      } catch (err) {
        console.error('[RootLayout] Database migration failed:', err);
        if (!cancelled) {
          setBootstrapState('ERROR');
        }
        return;
      }

      // Step 3: First app DB read (persisted theme) - safely post-migration
      try {
        const settings = await userSettingsRepository.get();
        if (settings?.themeMode && !cancelled) {
          setThemeMode(settings.themeMode as ThemeMode);
        }
      } catch (err) {
        console.warn('[RootLayout] Failed to load persisted theme mode:', err);
        // Non-fatal: app falls back to SYSTEM mode
      }

      // Step 4: Complete bootstrap lifecycle
      if (!cancelled) {
        setBootstrapState('READY');
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [retryTrigger]);

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
        <ThemedStatusBar />
        {bootstrapState === 'READY' && <RootGate />}
        {bootstrapState === 'LOADING' && <BootstrapLoadingView />}
        {bootstrapState === 'ERROR' && <BootstrapErrorView onRetry={handleRetry} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
