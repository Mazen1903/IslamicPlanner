import {
  JournalAutosaveController,
  createDefaultJournalPayload,
  isJournalPayloadEmpty,
} from '../JournalAutosaveController';
import { JournalService } from '../JournalService';
import { StaleWriteError } from '@/domain/journal/errors';
import type { JournalEntry } from '@/domain/journal/types';

describe('JournalAutosaveController', () => {
  let mockService: jest.Mocked<JournalService>;
  let controller: JournalAutosaveController;
  let stateChanges: string[];

  beforeEach(() => {
    jest.useFakeTimers();
    stateChanges = [];

    mockService = {
      getCurrentPlanningDayKey: jest.fn(),
      loadEntry: jest.fn(),
      saveEntry: jest.fn(),
      deleteEntry: jest.fn(),
      listHistory: jest.fn(),
      findByDateRange: jest.fn(),
    } as unknown as jest.Mocked<JournalService>;

    controller = new JournalAutosaveController(
      mockService,
      2000,
      state => stateChanges.push(state)
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Empty Draft & Initialization Policy', () => {
    it('isJournalPayloadEmpty correctly detects empty payloads', () => {
      expect(isJournalPayloadEmpty(null)).toBe(true);
      expect(isJournalPayloadEmpty(createDefaultJournalPayload())).toBe(true);
      expect(
        isJournalPayloadEmpty({
          body: '   ',
          reflections: { gratitude: '', wentWell: '', improvement: '  ', dua: '' },
        })
      ).toBe(true);
      expect(
        isJournalPayloadEmpty({
          body: 'Hello',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        })
      ).toBe(false);
      expect(
        isJournalPayloadEmpty({
          body: '',
          reflections: { gratitude: 'Alhamdulillah', wentWell: '', improvement: '', dua: '' },
        })
      ).toBe(false);
    });

    it('ASC-05: new untouched entry creates no DB row on beginSession', () => {
      controller.beginSession('2026-09-16');
      expect(controller.state).toBe('idle');
      expect(controller.isPersisted).toBe(false);
      expect(mockService.saveEntry).not.toHaveBeenCalled();
    });

    it('ASC-05b: new entry with empty edits creates no DB row when debounce fires', async () => {
      controller.beginSession('2026-09-16');
      controller.enqueueEdit({
        body: '   ',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockService.saveEntry).not.toHaveBeenCalled();
      expect(controller.state).toBe('idle');
    });

    it('ASC-15: existing persisted entry cleared to empty SAVES encrypted empty payload (does NOT delete)', async () => {
      const existingEntry: JournalEntry = {
        id: 'entry-123',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Existing thoughts',
          reflections: { gratitude: 'Good day', wentWell: '', improvement: '', dua: '' },
        },
        revision: 2,
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:00:00Z',
      };

      controller.beginSession('2026-09-16', existingEntry);
      expect(controller.isPersisted).toBe(true);

      mockService.saveEntry.mockResolvedValueOnce({
        id: 'entry-123',
        planningDayKey: '2026-09-16',
        payload: createDefaultJournalPayload(),
        revision: 3,
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:05:00Z',
      });

      // User clears all text
      controller.enqueueEdit(createDefaultJournalPayload());
      expect(controller.state).toBe('dirty');

      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockService.deleteEntry).not.toHaveBeenCalled();
      expect(mockService.saveEntry).toHaveBeenCalledWith({
        planningDayKey: '2026-09-16',
        payload: createDefaultJournalPayload(),
        revision: 2,
      });
      expect(controller.revision).toBe(3);
      expect(controller.state).toBe('saved');
    });
  });

  describe('Debounce and Coalescing', () => {
    it('ASC-01 & ASC-02: enqueueEdit debounces for 2000ms before saving', async () => {
      controller.beginSession('2026-09-16');

      mockService.saveEntry.mockResolvedValueOnce({
        id: 'entry-new',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'First line',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 1,
        createdAt: '2026-09-16T12:00:00Z',
        updatedAt: '2026-09-16T12:00:00Z',
      });

      controller.enqueueEdit({
        body: 'First line',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      expect(controller.state).toBe('dirty');
      expect(mockService.saveEntry).not.toHaveBeenCalled();

      // Advance partially
      jest.advanceTimersByTime(1000);
      expect(mockService.saveEntry).not.toHaveBeenCalled();

      // Complete debounce
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockService.saveEntry).toHaveBeenCalledTimes(1);
      expect(controller.state).toBe('saved');
    });

    it('ASC-03: multiple rapid edits coalesce to single write with latest payload', async () => {
      controller.beginSession('2026-09-16');

      mockService.saveEntry.mockResolvedValueOnce({
        id: 'entry-new',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Draft 3',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 1,
        createdAt: '2026-09-16T12:00:00Z',
        updatedAt: '2026-09-16T12:00:00Z',
      });

      controller.enqueueEdit({
        body: 'Draft 1',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });
      jest.advanceTimersByTime(500);

      controller.enqueueEdit({
        body: 'Draft 2',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });
      jest.advanceTimersByTime(500);

      controller.enqueueEdit({
        body: 'Draft 3',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(mockService.saveEntry).toHaveBeenCalledTimes(1);
      expect(mockService.saveEntry).toHaveBeenCalledWith({
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Draft 3',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: undefined,
      });
    });

    it('ASC-04: flush() immediately saves pending dirty draft without waiting for timer', async () => {
      controller.beginSession('2026-09-16');

      mockService.saveEntry.mockResolvedValueOnce({
        id: 'entry-flush',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Important draft',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 1,
        createdAt: '2026-09-16T12:00:00Z',
        updatedAt: '2026-09-16T12:00:00Z',
      });

      controller.enqueueEdit({
        body: 'Important draft',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      await controller.flush();

      expect(mockService.saveEntry).toHaveBeenCalledTimes(1);
      expect(controller.state).toBe('saved');
    });

    it('ASC-06: flush() on clean state is a no-op', async () => {
      controller.beginSession('2026-09-16');
      await controller.flush();
      expect(mockService.saveEntry).not.toHaveBeenCalled();
    });

    it('ASC-17: saves always use pinned planningDayKey even if current day changes (Fajr rollover)', async () => {
      controller.beginSession('2026-09-17');

      // Simulate Fajr rollover: service would now return next day
      mockService.getCurrentPlanningDayKey.mockResolvedValue('2026-09-18');

      mockService.saveEntry.mockResolvedValueOnce({
        id: 'entry-pinned',
        planningDayKey: '2026-09-17',
        payload: {
          body: 'Reflection written before and after Fajr',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 1,
        createdAt: '2026-09-17T04:59:00Z',
        updatedAt: '2026-09-17T05:01:00Z',
      });

      controller.enqueueEdit({
        body: 'Reflection written before and after Fajr',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      jest.advanceTimersByTime(2000);
      await controller.flush();

      // Must save to pinned original key (2026-09-17), NOT 2026-09-18
      expect(mockService.saveEntry).toHaveBeenCalledWith(
        expect.objectContaining({ planningDayKey: '2026-09-17' })
      );
      // Autosave controller must not query getCurrentPlanningDayKey during save
      expect(mockService.getCurrentPlanningDayKey).not.toHaveBeenCalled();
    });
  });

  describe('Write Serialization and Coalescing', () => {
    it('ASC-09 & ASC-10: writes are strictly serialized and newer drafts win', async () => {
      controller.beginSession('2026-09-16');

      let resolveFirstSave: (val: any) => void;
      const firstSavePromise = new Promise(resolve => {
        resolveFirstSave = resolve;
      });

      mockService.saveEntry.mockImplementationOnce(() => firstSavePromise as any);

      // Start first save via flush
      controller.enqueueEdit({
        body: 'Initial save',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });
      const flushPromise = controller.flush();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockService.saveEntry).toHaveBeenCalledTimes(1);
      expect(controller.state).toBe('saving');

      // User types newer edits while first save is in-flight
      controller.enqueueEdit({
        body: 'Newer text while saving',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      // Second save cannot start until first finishes
      expect(mockService.saveEntry).toHaveBeenCalledTimes(1);

      mockService.saveEntry.mockResolvedValueOnce({
        id: 'entry-1',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Newer text while saving',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 2,
        createdAt: '2026-09-16T12:00:00Z',
        updatedAt: '2026-09-16T12:00:00Z',
      });

      // Resolve first save
      resolveFirstSave!({
        id: 'entry-1',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Initial save',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 1,
        createdAt: '2026-09-16T12:00:00Z',
        updatedAt: '2026-09-16T12:00:00Z',
      });

      await flushPromise;
      await controller.flush();

      // Second save should automatically execute with the newer text
      expect(mockService.saveEntry).toHaveBeenCalledTimes(2);
      expect(mockService.saveEntry).toHaveBeenLastCalledWith({
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Newer text while saving',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 1,
      });
    });
  });

  describe('StaleWrite Recovery', () => {
    it('ASC-11 & ASC-12: StaleWriteError reloads latest entry and retries local draft once successfully', async () => {
      controller.beginSession('2026-09-16');

      mockService.saveEntry.mockRejectedValueOnce(
        new StaleWriteError('Revision conflict')
      );

      mockService.loadEntry.mockResolvedValueOnce({
        id: 'entry-stale',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Remote body',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 5,
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:00:00Z',
      });

      mockService.saveEntry.mockResolvedValueOnce({
        id: 'entry-stale',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Local draft',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 6,
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:05:00Z',
      });

      controller.enqueueEdit({
        body: 'Local draft',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      jest.advanceTimersByTime(2000);
      await controller.flush();

      expect(mockService.loadEntry).toHaveBeenCalledWith('2026-09-16');
      expect(mockService.saveEntry).toHaveBeenCalledTimes(2);
      expect(mockService.saveEntry).toHaveBeenLastCalledWith({
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Local draft',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 5,
      });
      expect(controller.state).toBe('saved');
      expect(controller.draftPayload?.body).toBe('Local draft');
    });

    it('ASC-13: repeated StaleWriteError on retry transitions to error state and retains draft', async () => {
      controller.beginSession('2026-09-16');

      mockService.saveEntry.mockRejectedValue(
        new StaleWriteError('Persistent revision conflict')
      );

      mockService.loadEntry.mockResolvedValueOnce({
        id: 'entry-stale',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'Remote body',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 5,
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:00:00Z',
      });

      controller.enqueueEdit({
        body: 'My precious text',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      jest.advanceTimersByTime(2000);
      await controller.flush();

      expect(mockService.saveEntry).toHaveBeenCalledTimes(2); // initial + 1 retry, no infinite loop
      expect(controller.state).toBe('error');
      expect(controller.draftPayload?.body).toBe('My precious text'); // Never lost
    });

    it('ASC-08: other save error transitions to error state and retains draft', async () => {
      controller.beginSession('2026-09-16');

      mockService.saveEntry.mockRejectedValueOnce(new Error('Network/DB failure'));

      controller.enqueueEdit({
        body: 'My text',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(controller.state).toBe('error');
      expect(controller.draftPayload?.body).toBe('My text');
    });
  });

  describe('Explicit Delete and Session Reset', () => {
    it('ASC-16: deleteCurrentEntry calls service.deleteEntry and resets entry state', async () => {
      const existingEntry: JournalEntry = {
        id: 'entry-to-delete',
        planningDayKey: '2026-09-16',
        payload: {
          body: 'To be deleted',
          reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
        },
        revision: 1,
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:00:00Z',
      };

      controller.beginSession('2026-09-16', existingEntry);
      mockService.deleteEntry.mockResolvedValueOnce(true);

      const success = await controller.deleteCurrentEntry();

      expect(success).toBe(true);
      expect(mockService.deleteEntry).toHaveBeenCalledWith('entry-to-delete');
      expect(controller.isPersisted).toBe(false);
      expect(controller.revision).toBeUndefined();
      expect(controller.draftPayload?.body).toBe('');
      expect(controller.state).toBe('idle');
    });

    it('ASC-14: reset() clears timer, revision, draft, and state', () => {
      controller.beginSession('2026-09-16');
      controller.enqueueEdit({
        body: 'Pending text',
        reflections: { gratitude: '', wentWell: '', improvement: '', dua: '' },
      });

      controller.reset();

      expect(controller.pinnedPlanningDayKey).toBeNull();
      expect(controller.revision).toBeUndefined();
      expect(controller.draftPayload).toBeNull();
      expect(controller.isPersisted).toBe(false);
      expect(controller.state).toBe('idle');

      // Advance timers to verify debounce was cancelled
      jest.advanceTimersByTime(2000);
      expect(mockService.saveEntry).not.toHaveBeenCalled();
    });
  });
});
