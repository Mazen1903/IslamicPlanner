import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Index from '../index';
import RootLayout from '../_layout';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

let mockSegments: string[] = [];
let lastRedirectHref: string | null = null;

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return {
    useRouter: () => ({
      replace: jest.fn(),
    }),
    useSegments: () => mockSegments,
    Redirect: ({ href }: { href: string }) => {
      lastRedirectHref = href;
      return React.createElement(View, { testID: 'redirect-component', accessibilityLabel: href });
    },
    Slot: () => {
      // Simulate Slot rendering Index when at root route '/' (empty segments)
      if (mockSegments.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const IndexComp = require('../index').default;
        return React.createElement(IndexComp);
      }
      return React.createElement(Text, { testID: 'slot-content' }, 'Slot Content');
    },
  };
});

jest.mock('@/data/db', () => ({
  getDatabase: jest.fn().mockReturnValue({}),
}));

jest.mock('@/data/migrator', () => ({
  migrateDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/data/repositories/UserSettingsRepository', () => ({
  userSettingsRepository: {
    get: jest.fn().mockResolvedValue({ themeMode: 'LIGHT' }),
    upsert: jest.fn(),
  },
}));

jest.mock('@/services/notification/NotificationBootstrap', () => ({
  initNotificationHandler: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children, style }: any) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { View } = require('react-native');
      return React.createElement(View, { style }, children);
    },
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

describe('Root Route Index (IR-01, IR-02, IR-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastRedirectHref = null;
    mockSegments = [];
    useOnboardingStore.getState().reset();
    jest.spyOn(useOnboardingStore.getState(), 'initialize').mockImplementation(async () => {});
  });

  it('IR-01: app/index.tsx renders only canonical <Redirect href="/(tabs)/planner" />', async () => {
    await render(<Index />);

    expect(screen.getByTestId('redirect-component')).toBeTruthy();
    expect(lastRedirectHref).toBe('/(tabs)/planner');
  });

  it('IR-02: app/index.tsx contains zero store reads, database reads, or onboarding decision logic', () => {
    const indexPath = path.resolve(__dirname, '..', 'index.tsx');
    expect(fs.existsSync(indexPath)).toBe(true);

    const content = fs.readFileSync(indexPath, 'utf8');

    // Invariant: No store reads
    expect(content).not.toContain('useOnboardingStore');
    expect(content).not.toContain('useTodayStore');

    // Invariant: No database imports or reads
    expect(content).not.toContain('userSettingsRepository');
    expect(content).not.toContain('getDatabase');
    expect(content).not.toContain('drizzle');

    // Invariant: No decision branching
    expect(content).not.toContain('if ');
    expect(content).not.toContain('switch ');
    expect(content).not.toContain('?');

    // Invariant: Pure redirect
    expect(content).toContain('Redirect href="/(tabs)/planner"');
  });

  it('IR-04: COMPLETE state at root route "/" permits Slot and resolves toward Planner via index redirect', async () => {
    useOnboardingStore.setState({ status: 'COMPLETE' });
    mockSegments = []; // root route '/'

    await render(<RootLayout />);

    // Slot mounts Index, which renders the redirect to /(tabs)/planner
    expect(await screen.findByTestId('redirect-component')).toBeTruthy();
    expect(lastRedirectHref).toBe('/(tabs)/planner');
  });
});
