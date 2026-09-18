import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useJournal } from '../useJournal';
import { JournalService } from '@/services/journal/JournalService';
import { JournalLockController } from '@/services/journal/JournalLockController';
import { JournalAutosaveController } from '@/services/journal/JournalAutosaveController';
import { AppState } from 'react-native';
import type { JournalEntry } from '@/domain/journal/types';

// Mock useFocusEffect from expo-router
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    useFocusEffect: (callback: () => any) => {
      const callbackRef = React.useRef(callback);
      callbackRef.current = callback;
      React.useEffect(() => {
        return callbackRef.current();
      }, []);
    },
  };
});

// Mock loadUserHijriAdjustmentConfig
jest.mock('@/services/journal/journalDateUtils', () => {
  const actual = jest.requireActual('@/services/journal/journalDateUtils');
  return {
    ...actual,
    loadUserHijriAdjustmentConfig: jest.fn().mockResolvedValue({ globalAdjustment: 0 }),
  };
});

describe('useJournal Hook', () => {
  let mockService: jest.Mocked<JournalService>;
  let mockLockController: jest.Mocked<JournalLockController>;
  let mockAutosaveController: jest.Mocked<JournalAutosaveController>;

  const defaultEntry: JournalEntry = {
    id: 'entry-uuid-100',
    planningDayKey: '2026-09-16',
    payload: {
      body: 'Initial body text',
      reflections: { gratitude: 'Alhamdulillah', wentWell: '', improvement: '', dua: '' },
    },
    revision: 1,
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-09-16T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      getCurrentPlanningDayKey: jest.fn().mockResolvedValue('2026-09-16'),
      loadEntry: jest.fn().mockResolvedValue(defaultEntry),
      saveEntry: jest.fn(),
      deleteEntry: jest.fn().mockResolvedValue(true),
      listHistory: jest.fn().mockResolvedValue([]),
      findByDateRange: jest.fn(),
    } as unknown as jest.Mocked<JournalService>;

    mockLockController = {
      checkOnFocus: jest.fn().mockResolvedValue('unlocked'),
      unlock: jest.fn().mockResolvedValue('unlocked'),
      lock: jest.fn(),
      enableLock: jest.fn().mockResolvedValue({ success: true }),
      disableLock: jest.fn().mockResolvedValue({ success: true }),
      onBackground: jest.fn(),
      isEnabled: false,
      isSessionUnlocked: true,
      errorMessage: null,
      state: 'unlocked',
    } as unknown as jest.Mocked<JournalLockController>;

    mockAutosaveController = {
      beginSession: jest.fn(),
      enqueueEdit: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      deleteCurrentEntry: jest.fn().mockResolvedValue(true),
      reset: jest.fn(),
      state: 'idle',
      draftPayload: null,
      pinnedPlanningDayKey: '2026-09-16',
    } as unknown as jest.Mocked<JournalAutosaveController>;
  });

  it('ED-01 & ED-02: bootstraps session, resolves planningDayKey once, loads entry into READY mode', async () => {
    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('READY');
    });

    expect(mockService.getCurrentPlanningDayKey).toHaveBeenCalledTimes(1);
    expect(mockService.loadEntry).toHaveBeenCalledWith('2026-09-16');
    expect(mockAutosaveController.beginSession).toHaveBeenCalledWith(
      '2026-09-16',
      defaultEntry
    );
    expect(result.current.pinnedPlanningDayKey).toBe('2026-09-16');
    expect(result.current.draftPayload.body).toBe('Initial body text');
    expect(result.current.isHistorical).toBe(false);
  });

  it('ED-09 & ED-10: returns SETUP_REQUIRED when planning day cannot be resolved', async () => {
    mockService.getCurrentPlanningDayKey.mockResolvedValueOnce(null);

    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('SETUP_REQUIRED');
    });

    expect(mockService.loadEntry).not.toHaveBeenCalled();
  });

  it('BIO-02 & BIO-06: starts in LOCKED mode when lock is enabled, unlocks upon onUnlockPress', async () => {
    mockLockController.checkOnFocus.mockResolvedValueOnce('locked');
    (mockLockController as any).isEnabled = true;

    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('LOCKED');
    });
    expect(result.current.lockEnabled).toBe(true);

    // Press unlock
    await act(async () => {
      await result.current.onUnlockPress();
    });

    expect(mockLockController.unlock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.mode).toBe('READY');
    });
  });

  it('ED-04 & ED-05: onBodyChange and onReflectionChange update draft and call autosaveController.enqueueEdit', async () => {
    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('READY');
    });

    await act(async () => {
      result.current.onBodyChange('Updated body text');
    });

    await waitFor(() => {
      expect(result.current.draftPayload.body).toBe('Updated body text');
    });
    expect(mockAutosaveController.enqueueEdit).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Updated body text' })
    );

    await act(async () => {
      result.current.onReflectionChange('wentWell', 'Finished milestone');
    });

    expect(result.current.draftPayload.reflections.wentWell).toBe('Finished milestone');
    expect(mockAutosaveController.enqueueEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        reflections: expect.objectContaining({ wentWell: 'Finished milestone' }),
      })
    );
  });

  it('HIST-03 & HIST-04: onHistoryOpen flushes draft and displays history mode', async () => {
    const mockList = [
      {
        id: 'hist-1',
        planningDayKey: '2026-09-15',
        revision: 1,
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z',
      },
    ];
    mockService.listHistory.mockResolvedValueOnce(mockList);

    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('READY');
    });

    await act(async () => {
      await result.current.onHistoryOpen();
    });

    expect(mockAutosaveController.flush).toHaveBeenCalledTimes(1);
    expect(mockService.listHistory).toHaveBeenCalledTimes(1);
    expect(result.current.mode).toBe('HISTORY');
    expect(result.current.historyEntries).toEqual(mockList);
  });

  it('HIST-04 & HIST-05: onSelectHistoryEntry loads historical entry, onReturnToToday returns to current day', async () => {
    const histEntry: JournalEntry = {
      id: 'hist-1',
      planningDayKey: '2026-09-15',
      payload: {
        body: 'Yesterday thoughts',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      },
      revision: 1,
      createdAt: '2026-09-15T10:00:00Z',
      updatedAt: '2026-09-15T10:00:00Z',
    };

    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('READY');
    });

    // Select historical entry
    mockService.loadEntry.mockResolvedValueOnce(histEntry);
    await act(async () => {
      await result.current.onSelectHistoryEntry({
        id: 'hist-1',
        planningDayKey: '2026-09-15',
        revision: 1,
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z',
      });
    });

    expect(result.current.mode).toBe('READY');
    expect(result.current.isHistorical).toBe(true);
    expect(result.current.activePlanningDayKey).toBe('2026-09-15');
    expect(result.current.draftPayload.body).toBe('Yesterday thoughts');

    // Return to today
    mockService.loadEntry.mockResolvedValueOnce(defaultEntry);
    await act(async () => {
      await result.current.onReturnToToday();
    });

    expect(result.current.isHistorical).toBe(false);
    expect(result.current.activePlanningDayKey).toBe('2026-09-16');
    expect(result.current.draftPayload.body).toBe('Initial body text');
  });

  it('HIST-07: explicit delete confirmation calls deleteCurrentEntry', async () => {
    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('READY');
    });

    await act(async () => {
      result.current.onDeletePress();
    });
    expect(result.current.showDeleteDialog).toBe(true);

    await act(async () => {
      await result.current.onDeleteConfirm();
    });

    expect(mockAutosaveController.deleteCurrentEntry).toHaveBeenCalledTimes(1);
    expect(result.current.showDeleteDialog).toBe(false);
  });

  it('flushes draft on AppState transition to background and relocks if lock enabled', async () => {
    (mockLockController as any).isEnabled = true;
    (AppState as any).currentState = 'active';

    const { result } = await renderHook(() =>
      useJournal({
        service: mockService,
        lockController: mockLockController,
        autosaveController: mockAutosaveController,
      })
    );

    await waitFor(() => {
      expect(result.current.mode).toBe('READY');
    });

    // Simulate AppState going background
    await act(async () => {
      const changeListeners = (AppState.addEventListener as jest.Mock).mock.calls;
      const lastListener = changeListeners[changeListeners.length - 1][1];
      await lastListener('background');
    });

    expect(mockAutosaveController.flush).toHaveBeenCalled();
    expect(mockLockController.onBackground).toHaveBeenCalledTimes(1);
  });
});
