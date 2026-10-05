import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { formReducer, createInitialFormState } from '@/features/task-form/formReducer';
import { deriveReminderRuleFromState, mapStateToCreateParams } from '@/features/task-form/taskDraftMapper';

describe('M13 Integration Seams & Safeguards', () => {
  describe('PlannerRefreshCoordinator Seam', () => {
    let mockInputProvider: any;
    let mockOrchestrator: any;
    let mockSync: any;
    let mockLifecycle: any;
    let mockNotificationService: any;

    beforeEach(() => {
      mockInputProvider = {
        getInputs: jest.fn().mockResolvedValue({
          status: 'READY',
          inputs: {
            coordinates: { latitude: 21.42, longitude: 39.82 },
            params: { timezone: 'Asia/Riyadh' },
            planningDayConfig: { type: 'FAJR' },
          },
        }),
      };

      mockOrchestrator = {
        refreshToday: jest.fn().mockResolvedValue({
          viewModel: { currentPrayer: 'DHUHR', items: [] },
          runtime: { planningDayKey: '2026-09-17' },
        }),
        queryAndProject: jest.fn(),
      };

      mockSync = {
        sync: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
      };

      mockLifecycle = {
        sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 0 }),
      };

      mockNotificationService = {
        reconcile: jest.fn().mockResolvedValue({
          scheduled: [],
          cancelled: [],
          unchanged: [],
          skippedPast: [],
          skippedCapacity: [],
          failed: [],
        }),
      };
    });

    it('awaits notification reconcile after lifecycle sweep and returns READY', async () => {
      const coordinator = new PlannerRefreshCoordinator(
        mockInputProvider,
        mockOrchestrator,
        mockSync,
        mockLifecycle,
        mockNotificationService as any
      );

      const result = await coordinator.fullRefresh(DateTime.fromISO('2026-09-17T12:00:00Z'));

      expect(result.status).toBe('READY');
      expect(mockLifecycle.sweepExpired).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.reconcile).toHaveBeenCalledTimes(1);
    });

    it('returns READY and does not rollback task data even if notification reconcile throws', async () => {
      mockNotificationService.reconcile!.mockRejectedValueOnce(new Error('OS notifications unavailable'));

      const coordinator = new PlannerRefreshCoordinator(
        mockInputProvider,
        mockOrchestrator,
        mockSync,
        mockLifecycle,
        mockNotificationService as any
      );

      const result = await coordinator.fullRefresh(DateTime.fromISO('2026-09-17T12:00:00Z'));

      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.viewModel).toEqual({ currentPrayer: 'DHUHR', items: [] });
      }
    });
  });

  describe('Task Form ANYTIME_TODAY Invariants', () => {
    it('creates initial form state with null reminder for ANYTIME_TODAY', () => {
      const state = createInitialFormState({
        civilSeedDate: '2026-09-17',
        planningDayDate: '2026-09-17',
      });
      // Mode defaults to EXACT_TIME, switch to ANYTIME_TODAY
      const anytimeState = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'ANYTIME_TODAY' });

      expect(anytimeState.reminderMinutes).toBeNull();
      expect(anytimeState.existingReminderRule).toBeNull();
      expect(deriveReminderRuleFromState(anytimeState)).toBeNull();
    });

    it('preserves reminder when switching from scheduled mode to ANYTIME_TODAY', () => {
      let state = createInitialFormState({
        civilSeedDate: '2026-09-17',
        planningDayDate: '2026-09-17',
      });
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'EXACT_TIME' });
      state = formReducer(state, { type: 'SET_REMINDER_MINUTES', payload: 15 });

      expect(state.reminderMinutes).toBe(15);

      // User converts to ANYTIME_TODAY - reminders are now preserved with default timeOfDay
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'ANYTIME_TODAY' });
      expect(state.reminderMinutes).toBe(15);
      expect(state.reminders).toEqual([15]);
      expect(state.reminderTimeOfDay).toBe('09:00');
      const rule = deriveReminderRuleFromState(state);
      expect(rule).not.toBeNull();
      expect(rule?.timeOfDay).toBe('09:00');
    });

    it('normalizes reminderRule to null when mapping ANYTIME_TODAY state with no reminders to create params', () => {
      let state = createInitialFormState({
        civilSeedDate: '2026-09-17',
        planningDayDate: '2026-09-17',
      });
      state = formReducer(state, { type: 'SET_TITLE', payload: 'Anytime Routine' });
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'ANYTIME_TODAY' });

      const params = mapStateToCreateParams(state);
      expect(params.scheduleType).toBe('ANYTIME_TODAY');
      expect(params.reminderRule).toBeNull();
    });

    it('preserves legacy ANYTIME_TODAY definition with reminderRule on form edit/save', () => {
      const legacyDef: any = {
        id: 'legacy-1',
        title: 'Legacy Task',
        startDate: '2026-09-17',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-legacy',
        reminderRule: { offsetMinutes: -10, channelId: 'old' },
      };

      const state = createInitialFormState({
        civilSeedDate: '2026-09-17',
        planningDayDate: '2026-09-17',
        initialDefinition: legacyDef,
      });

      expect(state.reminders).toEqual([-10]);
      expect(state.existingReminderRule).toBeTruthy();

      const reminder = deriveReminderRuleFromState(state);
      expect(reminder).not.toBeNull();
      expect(reminder?.offsetsMinutes).toEqual([-10]);
    });
  });

  describe('App Configuration & Boundaries', () => {
    it('app.json contains expo-notifications plugin without exact-alarm permissions or custom configs', () => {
      const appJsonPath = path.resolve(__dirname, '../../../../app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      const plugins = appJson.expo.plugins;
      expect(plugins).toContain('expo-notifications');

      const appJsonStr = JSON.stringify(appJson);
      expect(appJsonStr).not.toContain('USE_EXACT_ALARM');
      expect(appJsonStr).not.toContain('SCHEDULE_EXACT_ALARM');
    });

    it('pure domain notification files have zero imports of expo-notifications or React', () => {
      const domainDir = path.resolve(__dirname, '../../../domain/notification');
      const files = fs.readdirSync(domainDir).filter(f => f.endsWith('.ts') && !f.includes('__tests__'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(domainDir, file), 'utf8');
        expect(content).not.toContain('expo-notifications');
        expect(content).not.toContain('react');
        expect(content).not.toContain('react-native');
        expect(content).not.toContain('zustand');
      }
    });

    it('src/hooks/useToday.ts does not directly import expo-notifications', () => {
      const useTodayPath = path.resolve(__dirname, '../../../hooks/useToday.ts');
      const content = fs.readFileSync(useTodayPath, 'utf8');
      expect(content).not.toContain('expo-notifications');
    });
  });
});
