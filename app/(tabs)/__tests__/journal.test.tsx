import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import JournalScreen from '../journal';
import * as useJournalModule from '@/hooks/useJournal';

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(cb => cb()),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock('@/components/today/SetupRequiredState', () => {
  const RN = jest.requireActual('react-native');
  return {
    SetupRequiredState: () => (
      <RN.View testID="setup-required-state">
        <RN.Text>Set your prayer location to begin</RN.Text>
      </RN.View>
    ),
  };
});

describe('JournalScreen (M16 Screen)', () => {
  const defaultHookReturn: useJournalModule.UseJournalReturn = {
    mode: 'READY',
    pinnedPlanningDayKey: '2026-09-16',
    activePlanningDayKey: '2026-09-16',
    isHistorical: false,
    gregorianDisplay: 'Wednesday, 16 Sep 2026',
    hijriDisplay: '5 Rabi al-Thani 1448 AH',
    draftPayload: {
      body: 'Today thoughts',
      reflections: { gratitude: 'Alhamdulillah', wentWell: '', improvement: '', dua: '' },
    },
    saveState: 'idle',
    lockEnabled: false,
    lockErrorMessage: null,
    historyEntries: [],
    showDeleteDialog: false,
    showPrivacySheet: false,
    isDeleting: false,
    isTogglingLock: false,
    hasDayRolledOver: false,
    loadError: null,
    onBodyChange: jest.fn(),
    onReflectionChange: jest.fn(),
    onHistoryOpen: jest.fn().mockResolvedValue(undefined),
    onSelectHistoryEntry: jest.fn().mockResolvedValue(undefined),
    onReturnToToday: jest.fn().mockResolvedValue(undefined),
    onDeletePress: jest.fn(),
    onDeleteConfirm: jest.fn().mockResolvedValue(undefined),
    onDeleteCancel: jest.fn(),
    onUnlockPress: jest.fn().mockResolvedValue(undefined),
    onPrivacySheetOpen: jest.fn(),
    onPrivacySheetClose: jest.fn(),
    onToggleLock: jest.fn().mockResolvedValue(undefined),
    onRetryLoad: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders READY mode with Header, Editor, and Reflections', async () => {
    jest.spyOn(useJournalModule, 'useJournal').mockReturnValue(defaultHookReturn);

    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Journal')).toBeTruthy();
    expect(screen.getByText('Wednesday, 16 Sep 2026')).toBeTruthy();
    expect(screen.getByText('5 Rabi al-Thani 1448 AH')).toBeTruthy();
    expect(screen.getByDisplayValue('Today thoughts')).toBeTruthy();
    expect(screen.getByText('Reflections')).toBeTruthy();
  });

  it('renders SETUP_REQUIRED when planning day cannot be resolved', async () => {
    jest.spyOn(useJournalModule, 'useJournal').mockReturnValue({
      ...defaultHookReturn,
      mode: 'SETUP_REQUIRED',
    });

    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(screen.getByTestId('setup-required-state')).toBeTruthy();
  });

  it('renders LOCKED mode with JournalLockedState', async () => {
    jest.spyOn(useJournalModule, 'useJournal').mockReturnValue({
      ...defaultHookReturn,
      mode: 'LOCKED',
      lockEnabled: true,
    });

    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Journal Locked')).toBeTruthy();
    expect(screen.getByTestId('journal-unlock-btn')).toBeTruthy();
  });

  it('renders HISTORY mode with JournalHistory', async () => {
    jest.spyOn(useJournalModule, 'useJournal').mockReturnValue({
      ...defaultHookReturn,
      mode: 'HISTORY',
      historyEntries: [
        {
          id: 'hist-1',
          planningDayKey: '2026-09-15',
          revision: 1,
          createdAt: '2026-09-15T10:00:00Z',
          updatedAt: '2026-09-15T10:00:00Z',
        },
      ],
    });

    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByTestId('journal-history-row-2026-09-15')).toBeTruthy();
  });

  it('renders LOAD_ERROR mode with error message and retry button', async () => {
    const onRetryLoad = jest.fn();
    jest.spyOn(useJournalModule, 'useJournal').mockReturnValue({
      ...defaultHookReturn,
      mode: 'LOAD_ERROR',
      loadError: 'Failed to read database',
      onRetryLoad,
    });

    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Failed to read database')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-retry-btn'));
    });
    expect(onRetryLoad).toHaveBeenCalledTimes(1);
  });
});
