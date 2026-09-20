import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import RootLayout, { ThemedStatusBar } from '../_layout';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { ThemeProvider } from '@/theme';

const mockStatusBar = jest.fn();
jest.mock('expo-status-bar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    StatusBar: (props: any) => {
      mockStatusBar(props);
      return React.createElement(View, { testID: 'mock-status-bar', accessibilityLabel: props.style });
    },
  };
});

const mockReplace = jest.fn();
let mockSegments: string[] = [];

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    useRouter: () => ({
      replace: mockReplace,
    }),
    useSegments: () => mockSegments,
    Slot: () => React.createElement(Text, { testID: 'slot-content' }, 'Slot Content'),
  };
});

const mockMigrateDatabase = jest.fn();
jest.mock('@/data/db', () => ({
  getDatabase: jest.fn().mockReturnValue({}),
}));
jest.mock('@/data/migrator', () => ({
  migrateDatabase: (...args: any[]) => mockMigrateDatabase(...args),
}));

jest.mock('@/data/repositories/UserSettingsRepository', () => ({
  userSettingsRepository: {
    get: jest.fn(),
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

describe('ThemedStatusBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolved dark theme: ThemedStatusBar -> style="light"', async () => {
    await render(
      <ThemeProvider mode="DARK">
        <ThemedStatusBar />
      </ThemeProvider>
    );

    expect(mockStatusBar).toHaveBeenCalledWith(expect.objectContaining({ style: 'light' }));
  });

  it('resolved light theme: ThemedStatusBar -> style="dark"', async () => {
    await render(
      <ThemeProvider mode="LIGHT">
        <ThemedStatusBar />
      </ThemeProvider>
    );

    expect(mockStatusBar).toHaveBeenCalledWith(expect.objectContaining({ style: 'dark' }));
  });

  it('SYSTEM runtime appearance change: status bar updates with resolved isDark', async () => {
    const colorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    const { rerender } = await render(
      <ThemeProvider mode="SYSTEM">
        <ThemedStatusBar />
      </ThemeProvider>
    );

    expect(mockStatusBar).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'dark' }));

    // Transition system to dark
    colorSchemeSpy.mockReturnValue('dark');
    await rerender(
      <ThemeProvider mode="SYSTEM">
        <ThemedStatusBar />
      </ThemeProvider>
    );

    expect(mockStatusBar).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'light' }));
  });
});

describe('RootLayout Bootstrap & Hydration Contract (H-01..H-05, MB-03..MB-07)', () => {
  let initializeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMigrateDatabase.mockReset();
    mockMigrateDatabase.mockResolvedValue(undefined);
    useOnboardingStore.getState().reset();
    mockSegments = ['(tabs)', 'today'];
    initializeSpy = jest.spyOn(useOnboardingStore.getState(), 'initialize').mockImplementation(async () => {});
  });

  afterEach(() => {
    initializeSpy.mockRestore();
  });

  it('H-01: persisted DARK + system LIGHT -> RootGate does not mount before resolution; DARK used after resolution', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    let resolveDb: (val: any) => void = () => {};
    const dbPromise = new Promise(resolve => {
      resolveDb = resolve;
    });
    (userSettingsRepository.get as jest.Mock).mockReturnValue(dbPromise);

    await render(<RootLayout />);

    // Before persisted theme read resolves: RootGate must NOT mount
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(initializeSpy).not.toHaveBeenCalled();

    // Resolve persisted theme as DARK
    await act(async () => {
      resolveDb({ themeMode: 'DARK' });
    });

    await waitFor(() => {
      // After resolution: DARK is used before RootGate mounts
      expect(mockStatusBar).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'light' }));
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('H-02: persisted LIGHT + system DARK -> RootGate does not mount before resolution; LIGHT used after resolution', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    let resolveDb: (val: any) => void = () => {};
    const dbPromise = new Promise(resolve => {
      resolveDb = resolve;
    });
    (userSettingsRepository.get as jest.Mock).mockReturnValue(dbPromise);

    await render(<RootLayout />);

    // Before persisted theme read resolves: RootGate must NOT mount
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(initializeSpy).not.toHaveBeenCalled();

    // Resolve persisted theme as LIGHT
    await act(async () => {
      resolveDb({ themeMode: 'LIGHT' });
    });

    await waitFor(() => {
      // After resolution: LIGHT is used before RootGate mounts
      expect(mockStatusBar).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'dark' }));
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('H-03: theme repository read rejects -> SYSTEM fallback, theme settles, RootGate mounts, app does not crash', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let rejectDb: (err: any) => void = () => {};
    const dbPromise = new Promise((_, reject) => {
      rejectDb = reject;
    });
    (userSettingsRepository.get as jest.Mock).mockReturnValue(dbPromise);

    await render(<RootLayout />);

    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(initializeSpy).not.toHaveBeenCalled();

    // Reject DB read
    await act(async () => {
      rejectDb(new Error('SQLite connection unavailable'));
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        '[RootLayout] Failed to load persisted theme mode:',
        expect.any(Error)
      );
      // SYSTEM mode with system light -> style="dark"
      expect(mockStatusBar).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'dark' }));
      // Bootstrap state is READY, RootGate mounts, app does not crash
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });

    warnSpy.mockRestore();
  });

  it('H-04: while bootstrap is LOADING -> BootstrapLoadingView renders, RootGate does NOT render/mount, onboarding initialize does not run', async () => {
    // Unresolved promise simulates ongoing hydration
    const pendingPromise = new Promise(() => {});
    (userSettingsRepository.get as jest.Mock).mockReturnValue(pendingPromise);

    await render(<RootLayout />);

    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(initializeSpy).not.toHaveBeenCalled();
  });

  it('H-05: after READY -> existing M20 onboarding behavior remains (LOADING, PENDING, COMPLETE, ERROR)', async () => {
    (userSettingsRepository.get as jest.Mock).mockResolvedValue({ themeMode: 'LIGHT' });

    // Case 1: COMPLETE renders Slot on normal route
    useOnboardingStore.setState({ status: 'COMPLETE' });
    mockSegments = ['(tabs)', 'today'];

    const { rerender } = await render(<RootLayout />);

    await waitFor(() => {
      expect(screen.getByTestId('slot-content')).toBeTruthy();
    });

    // Case 2: PENDING on normal route redirects to /onboarding
    await act(async () => {
      useOnboardingStore.setState({ status: 'PENDING' });
    });
    await rerender(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      expect(screen.queryByTestId('slot-content')).toBeNull();
    });

    // Case 3: ERROR renders bootstrap error view with retry
    await act(async () => {
      useOnboardingStore.setState({ status: 'ERROR' });
    });
    await rerender(<RootLayout />);

    await waitFor(() => {
      expect(screen.getByTestId('bootstrap-error-view')).toBeTruthy();
      expect(screen.getByTestId('bootstrap-retry-button')).toBeTruthy();
    });
  });

  it('MB-03: Bootstrap ordering: migrateDatabase() resolves BEFORE userSettingsRepository.get() is called', async () => {
    const callOrder: string[] = [];

    mockMigrateDatabase.mockImplementation(async () => {
      callOrder.push('migrateDatabase');
    });

    (userSettingsRepository.get as jest.Mock).mockImplementation(async () => {
      callOrder.push('userSettingsRepository.get');
      return { themeMode: 'LIGHT' };
    });

    await render(<RootLayout />);

    await waitFor(() => {
      expect(callOrder).toEqual(['migrateDatabase', 'userSettingsRepository.get']);
    });
  });

  it('MB-04: READY is not reached until migration succeeds and theme initialization settles', async () => {
    let resolveMigration: () => void = () => {};
    const migrationPromise = new Promise<void>(resolve => {
      resolveMigration = resolve;
    });
    mockMigrateDatabase.mockReturnValue(migrationPromise);
    (userSettingsRepository.get as jest.Mock).mockResolvedValue({ themeMode: 'LIGHT' });

    await render(<RootLayout />);

    // While migration is in flight: RootGate does NOT mount
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(initializeSpy).not.toHaveBeenCalled();

    // Resolve migration
    await act(async () => {
      resolveMigration();
    });

    // Once settled: RootGate mounts and reaches READY
    await waitFor(() => {
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('MB-05: Migration rejection transitions to ERROR, prevents userSettingsRepository.get(), and keeps RootGate unmounted', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockMigrateDatabase.mockRejectedValue(new Error('Disk migration failed'));
    (userSettingsRepository.get as jest.Mock).mockResolvedValue({ themeMode: 'LIGHT' });

    await render(<RootLayout />);

    await waitFor(() => {
      expect(screen.getByTestId('bootstrap-error-view')).toBeTruthy();
    });

    // Invariants on migration failure:
    expect(userSettingsRepository.get).not.toHaveBeenCalled();
    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(initializeSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('MB-06: Migration rejection renders BootstrapErrorView and exposes Retry action', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockMigrateDatabase.mockRejectedValue(new Error('Migration fatal error'));

    await render(<RootLayout />);

    expect(await screen.findByTestId('bootstrap-error-view')).toBeTruthy();
    expect(screen.getByTestId('bootstrap-retry-button')).toBeTruthy();
    expect(screen.getByText('Unable to load app setup.')).toBeTruthy();

    errorSpy.mockRestore();
  });

  it('MB-07: Bootstrap retry resets state to LOADING and invokes migrateDatabase() again', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // First attempt rejects, second attempt succeeds
    mockMigrateDatabase
      .mockRejectedValueOnce(new Error('Transient DB lock'))
      .mockResolvedValueOnce(undefined);

    (userSettingsRepository.get as jest.Mock).mockResolvedValue({ themeMode: 'LIGHT' });
    useOnboardingStore.setState({ status: 'COMPLETE' });

    await render(<RootLayout />);

    // Wait for first attempt to fail and show error view
    expect(await screen.findByTestId('bootstrap-error-view')).toBeTruthy();
    expect(mockMigrateDatabase).toHaveBeenCalledTimes(1);

    // Tap retry button
    await act(async () => {
      fireEvent.press(screen.getByTestId('bootstrap-retry-button'));
    });

    // Second attempt is called and succeeds, transitioning to READY and mounting RootGate
    await waitFor(() => {
      expect(mockMigrateDatabase).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('slot-content')).toBeTruthy();
    });

    errorSpy.mockRestore();
  });
});
