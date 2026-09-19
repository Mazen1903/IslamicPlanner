import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RootGate } from '../_layout';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { ThemeProvider } from '@/theme';

const mockReplace = jest.fn();
let mockSegments: string[] = [];

jest.mock('@/data/repositories/UserSettingsRepository', () => ({
  userSettingsRepository: {
    get: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
  },
}));

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

describe('RootGate Routing and Authorization (B-series tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().reset();
    mockSegments = [];
    jest.spyOn(useOnboardingStore.getState(), 'initialize').mockImplementation(async () => {});
  });

  it('B-05: LOADING does NOT render Slot; renders bootstrap loading view', async () => {
    useOnboardingStore.setState({ status: 'LOADING' });
    mockSegments = ['(tabs)', 'today'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('B-06: ERROR does NOT render Slot; renders bootstrap error/retry view', async () => {
    useOnboardingStore.setState({ status: 'ERROR' });
    mockSegments = ['(tabs)', 'today'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(screen.getByTestId('bootstrap-error-view')).toBeTruthy();
    expect(screen.getByTestId('bootstrap-retry-button')).toBeTruthy();
    expect(screen.getByText('Unable to load app setup.')).toBeTruthy();
  });

  it('B-06b: ERROR retry button triggers store retry', async () => {
    const retrySpy = jest.spyOn(useOnboardingStore.getState(), 'retry').mockResolvedValue(undefined);
    useOnboardingStore.setState({ status: 'ERROR' });

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('bootstrap-retry-button'));
    expect(retrySpy).toHaveBeenCalledTimes(1);
    retrySpy.mockRestore();
  });

  it('B-07: PENDING + deep link to Today -> Today never renders; redirects to /onboarding', async () => {
    useOnboardingStore.setState({ status: 'PENDING' });
    mockSegments = ['(tabs)', 'today'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    // Synchronous suppression of Slot
    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('B-08: PENDING + deep link to task route -> task component never renders; redirects to /onboarding', async () => {
    useOnboardingStore.setState({ status: 'PENDING' });
    mockSegments = ['task', '123'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('B-09: PENDING + deep link to Settings -> Settings component never renders; redirects to /onboarding', async () => {
    useOnboardingStore.setState({ status: 'PENDING' });
    mockSegments = ['(tabs)', 'settings'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('B-10: COMPLETE + route /onboarding -> onboarding component never renders; redirects to /today', async () => {
    useOnboardingStore.setState({ status: 'COMPLETE' });
    mockSegments = ['onboarding'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('B-12: No redirect loop: PENDING + /onboarding stays on onboarding and renders Slot', async () => {
    useOnboardingStore.setState({ status: 'PENDING' });
    mockSegments = ['onboarding'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.getByTestId('slot-content')).toBeTruthy();
    expect(screen.queryByTestId('bootstrap-loading-view')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('B-12b: COMPLETE + normal app route renders Slot without redirect', async () => {
    useOnboardingStore.setState({ status: 'COMPLETE' });
    mockSegments = ['(tabs)', 'today'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.getByTestId('slot-content')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('B-13: mustRedirectToOnboarding and mustRedirectToToday are derived synchronously during render without refs', async () => {
    useOnboardingStore.setState({ status: 'PENDING' });
    mockSegments = ['(tabs)', 'journal'];

    await render(
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('slot-content')).toBeNull();
    expect(screen.getByTestId('bootstrap-loading-view')).toBeTruthy();
  });
});
