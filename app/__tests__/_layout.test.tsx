import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react-native';
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

describe('RootLayout Hydration Contract (H-01 through H-05)', () => {
  let initializeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('H-03: theme repository read rejects -> SYSTEM fallback, themeReady becomes true, RootGate mounts, app does not crash', async () => {
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
      // themeReady is true, RootGate mounts, app does not crash
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });

    warnSpy.mockRestore();
  });

  it('H-04: while themeReady=false -> BootstrapLoadingView renders, RootGate does NOT render/mount, onboarding initialize does not run', async () => {
    // Unresolved promise simulates ongoing hydration
    const pendingPromise = new Promise(() => {});
    (userSettingsRepository.get as jest.Mock).mockReturnValue(pendingPromise);

    await render(<RootLayout />);

    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(initializeSpy).not.toHaveBeenCalled();
  });

  it('H-05: after themeReady=true -> existing M20 onboarding behavior remains (LOADING, PENDING, COMPLETE, ERROR)', async () => {
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
});
