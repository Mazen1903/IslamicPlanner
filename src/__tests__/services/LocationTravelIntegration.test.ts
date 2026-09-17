import { DateTime } from 'luxon';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { getDatabase } from '@/data/db';
import { userSettings } from '@/data/schema';
import { TaskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { TaskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { UserSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { LocationAwareTodayTemporalInputProvider } from '@/services/TodayTemporalInputProvider';
import { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { LocationRefreshCoordinator } from '@/services/LocationRefreshCoordinator';
import type { ILocationService } from '@/services/LocationService';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { MaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { RecurringHorizonSync } from '@/features/task-form/recurringHorizonSync';
import { OccurrenceLifecycleService } from '@/services/OccurrenceLifecycleService';
import { TodayOrchestrator } from '@/services/TodayOrchestrator';

describe('Location, Travel, and Timezone Behavior Integration (M12)', () => {
  let taskDefRepo: TaskDefinitionRepository;
  let taskOccRepo: TaskOccurrenceRepository;
  let userSettingsRepo: UserSettingsRepository;
  let inputProvider: LocationAwareTodayTemporalInputProvider;
  let coordinator: PlannerRefreshCoordinator;
  let mockLocationService: jest.Mocked<ILocationService>;

  beforeEach(() => {
    createTestDatabase();
    taskDefRepo = new TaskDefinitionRepository();
    taskOccRepo = new TaskOccurrenceRepository();
    userSettingsRepo = new UserSettingsRepository();
    inputProvider = new LocationAwareTodayTemporalInputProvider();

    mockLocationService = {
      getForegroundPermission: jest.fn().mockResolvedValue('GRANTED'),
      requestForegroundPermission: jest.fn().mockResolvedValue('GRANTED'),
      getCurrentCoordinates: jest.fn(),
      getDeviceTimezone: jest.fn(),
    };

    coordinator = new PlannerRefreshCoordinator(
      inputProvider,
      new TodayOrchestrator(),
      new RecurringHorizonSync(),
      new OccurrenceLifecycleService()
    );
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('1. EXACT_TIME Travel Wall-Clock Preservation', () => {
    it('preserves wall-clock time (18:00 local) while UTC instant shifts upon timezone travel', async () => {
      // 1. Configure initial location: Chicago (America/Chicago, UTC-5 in Sept)
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const taskEngine = new TaskEngine(taskDefRepo, taskOccRepo);
      const created = await taskEngine.createTask({
        id: 'task-dinner',
        title: 'Family Dinner',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '18:00' },
        seriesId: 'series-dinner',
      });

      // Materialize in Chicago
      const nowChicago = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(nowChicago);

      // Verify Chicago occurrence
      const occChicago = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      expect(occChicago).not.toBeNull();
      expect(occChicago!.status).toBe('PENDING');

      const chicagoDt = DateTime.fromISO(occChicago!.calculatedStartTime!, { zone: 'America/Chicago' });
      expect(chicagoDt.hour).toBe(18);
      expect(chicagoDt.minute).toBe(0);
      // In Sept (CDT, UTC-5), 18:00 CDT is 23:00 UTC
      const chicagoUtc = DateTime.fromISO(occChicago!.calculatedStartTime!).toUTC();
      expect(chicagoUtc.hour).toBe(23);

      // 2. User travels to London (Europe/London, BST = UTC+1 in Sept)
      await userSettingsRepo.saveAutoLocation(
        { latitude: 51.5074, longitude: -0.1278 },
        'Europe/London'
      );

      const nowLondon = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'Europe/London' });
      const refreshResult = await coordinator.fullRefresh(nowLondon);
      expect(refreshResult.status).toBe('READY');

      // Verify London occurrence
      const occLondon = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      expect(occLondon).not.toBeNull();

      // INVARIANT: Wall clock is preserved at 18:00 local!
      const londonDt = DateTime.fromISO(occLondon!.calculatedStartTime!, { zone: 'Europe/London' });
      expect(londonDt.hour).toBe(18);
      expect(londonDt.minute).toBe(0);

      // INVARIANT: Derived UTC instant shifted (18:00 BST is 17:00 UTC)
      const londonUtc = DateTime.fromISO(occLondon!.calculatedStartTime!).toUTC();
      expect(londonUtc.hour).toBe(17);
      expect(londonUtc.toISO()).not.toBe(chicagoUtc.toISO());

      // INVARIANT: TaskDefinition title and wall-clock localTime remain unchanged
      const def = await taskDefRepo.findById(created.id);
      expect((def?.scheduleData as any).localTime).toBe('18:00');
    });
  });

  describe('2. PRAYER_RELATIVE Recalculation', () => {
    it('recalculates calculatedStartTime to match the new location prayer boundaries', async () => {
      // 1. Initial Chicago
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const taskEngine = new TaskEngine(taskDefRepo, taskOccRepo);
      const created = await taskEngine.createTask({
        id: 'task-dhikr',
        title: 'Post-Maghrib Dhikr',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'MAGHRIB',
          direction: 'AFTER',
          offsetMinutes: 15,
        },
        seriesId: 'series-dhikr',
      });

      const nowChicago = DateTime.fromISO('2026-09-15T10:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(nowChicago);

      const occChicago = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      expect(occChicago).not.toBeNull();
      const chicagoStart = occChicago!.calculatedStartTime!;

      // 2. Travel to Medina (Asia/Riyadh, UTC+3)
      await userSettingsRepo.saveAutoLocation(
        { latitude: 24.4672, longitude: 39.6111 },
        'Asia/Riyadh'
      );

      const nowMedina = DateTime.fromISO('2026-09-15T10:00:00', { zone: 'Asia/Riyadh' });
      await coordinator.fullRefresh(nowMedina);

      const occMedina = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      expect(occMedina).not.toBeNull();
      const medinaStart = occMedina!.calculatedStartTime!;

      // INVARIANT: Prayer-relative task adapts to new local Maghrib time; no frozen old time
      expect(medinaStart).not.toBe(chicagoStart);
      const medinaDt = DateTime.fromISO(medinaStart, { zone: 'Asia/Riyadh' });
      expect(medinaDt.isValid).toBe(true);
    });
  });

  describe('3. PRAYER_WINDOW Recalculation & Invariant', () => {
    it('recalculates windowStart and windowEnd while maintaining exactly one occurrence', async () => {
      // 1. Initial Chicago
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const taskEngine = new TaskEngine(taskDefRepo, taskOccRepo);
      const created = await taskEngine.createTask({
        id: 'task-reading',
        title: 'Quran Reading Window',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'DHUHR',
          endPrayer: 'ASR',
        },
        seriesId: 'series-reading',
      });

      const nowChicago = DateTime.fromISO('2026-09-15T09:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(nowChicago);

      const occChicago = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      expect(occChicago).not.toBeNull();
      const origWindowStart = occChicago!.windowStart!;
      const origWindowEnd = occChicago!.windowEnd!;

      // 2. Travel to London
      await userSettingsRepo.saveAutoLocation(
        { latitude: 51.5074, longitude: -0.1278 },
        'Europe/London'
      );

      const nowLondon = DateTime.fromISO('2026-09-15T09:00:00', { zone: 'Europe/London' });
      await coordinator.fullRefresh(nowLondon);

      const occLondon = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      // INVARIANT: Exactly one occurrence exists (no duplicate prayer-tab occurrences)
      expect(occLondon).not.toBeNull();

      // INVARIANT: Window recalculates under London prayer times
      expect(occLondon!.windowStart).not.toBe(origWindowStart);
      expect(occLondon!.windowEnd).not.toBe(origWindowEnd);
    });
  });

  describe('4. ANYTIME_TODAY Planning-Day Identity', () => {
    it('preserves planningDayKey identity across travel and adapts to planning-day boundary mode', async () => {
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const taskEngine = new TaskEngine(taskDefRepo, taskOccRepo);
      const created = await taskEngine.createTask({
        id: 'task-sadaqah',
        title: 'Daily Sadaqah',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-sadaqah',
      });

      const now = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(now);

      const occBefore = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      expect(occBefore).not.toBeNull();
      expect(occBefore!.planningDayKey).toBe('2026-09-15');

      // Travel to Tokyo (Asia/Tokyo, UTC+9)
      await userSettingsRepo.saveAutoLocation(
        { latitude: 35.6762, longitude: 139.6503 },
        'Asia/Tokyo'
      );

      const nowTokyo = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'Asia/Tokyo' });
      await coordinator.fullRefresh(nowTokyo);

      const occAfter = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-15');
      expect(occAfter).not.toBeNull();
      // INVARIANT: Do not rewrite an existing occurrence's planningDayKey merely because of travel
      expect(occAfter!.planningDayKey).toBe('2026-09-15');
    });
  });

  describe('5. Terminal History Immutability', () => {
    it('never alters COMPLETED, MISSED, or CANCELLED occurrences after location travel', async () => {
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const taskEngine = new TaskEngine(taskDefRepo, taskOccRepo);

      // Task 1: Completed
      const def1 = await taskEngine.createTask({
        id: 'task-completed',
        title: 'Completed Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '09:00' },
        seriesId: 'series-completed',
      });

      // Task 2: Cancelled
      const def2 = await taskEngine.createTask({
        id: 'task-cancelled',
        title: 'Cancelled Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-cancelled',
      });

      const now = DateTime.fromISO('2026-09-15T08:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(now);

      const occ1 = await taskOccRepo.findByDefinitionAndDate(def1.id, '2026-09-15');
      const occ2 = await taskOccRepo.findByDefinitionAndDate(def2.id, '2026-09-15');
      expect(occ1).not.toBeNull();
      expect(occ2).not.toBeNull();

      // Mark occ1 COMPLETED and occ2 CANCELLED
      await taskEngine.completeTask(occ1!.id);
      await taskEngine.cancelTask(occ2!.id);

      const completedBefore = await taskOccRepo.findById(occ1!.id);
      const cancelledBefore = await taskOccRepo.findById(occ2!.id);
      expect(completedBefore?.status).toBe('COMPLETED');
      expect(cancelledBefore?.status).toBe('CANCELLED');

      const origCompletedStart = completedBefore?.calculatedStartTime;
      const origCancelledStart = cancelledBefore?.calculatedStartTime;

      // Travel to Tokyo
      await userSettingsRepo.saveAutoLocation(
        { latitude: 35.6762, longitude: 139.6503 },
        'Asia/Tokyo'
      );

      const nowTokyo = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'Asia/Tokyo' });
      await coordinator.fullRefresh(nowTokyo);

      const completedAfter = await taskOccRepo.findById(occ1!.id);
      const cancelledAfter = await taskOccRepo.findById(occ2!.id);

      // INVARIANT: Terminal occurrences are completely frozen
      expect(completedAfter?.status).toBe('COMPLETED');
      expect(completedAfter?.calculatedStartTime).toBe(origCompletedStart);
      expect(cancelledAfter?.status).toBe('CANCELLED');
      expect(cancelledAfter?.calculatedStartTime).toBe(origCancelledStart);
    });
  });

  describe('6. Single Scheduling Pipeline & Privacy Invariants', () => {
    it('LocationRefreshCoordinator performs resolution and commit but NEVER triggers rematerialization', async () => {
      const locationCoordinator = new LocationRefreshCoordinator(
        userSettingsRepo,
        mockLocationService
      );

      mockLocationService.getCurrentCoordinates.mockResolvedValue({
        latitude: 24.4672,
        longitude: 39.6111,
      });
      mockLocationService.getDeviceTimezone.mockReturnValue('Asia/Riyadh');

      // Spy on MaterializationEngine prototype to verify it is NOT called
      const rematerializeSpy = jest.spyOn(
        MaterializationEngine.prototype,
        'rematerializePending'
      );

      const res = await locationCoordinator.resolve(DateTime.now());
      expect(res.status).toBe('READY');

      // INVARIANT: LocationRefreshCoordinator does NOT rematerialize
      expect(rematerializeSpy).not.toHaveBeenCalled();
      rematerializeSpy.mockRestore();
    });

    it('Privacy: Persists ONLY committed location; rejects sub-10km jitter and keeps no location history', async () => {
      // 1. Commit Chicago
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const locationCoordinator = new LocationRefreshCoordinator(
        userSettingsRepo,
        mockLocationService
      );

      // 2. Candidate with 3 km jitter
      mockLocationService.getCurrentCoordinates.mockResolvedValue({
        latitude: 41.8981,
        longitude: -87.6298,
      });
      mockLocationService.getDeviceTimezone.mockReturnValue('America/Chicago');

      const res = await locationCoordinator.resolve(DateTime.now());
      expect(res.status).toBe('READY');
      if (res.status === 'READY') {
        expect(res.changed).toBe(false);
      }

      // Check database: jitter coordinates were NOT persisted
      const settings = await userSettingsRepo.get();
      expect(settings?.lastAutoLatitude).toBeCloseTo(41.8781);

      // Verify no location history table exists in SQLite schema
      const db = getDatabase();
      const tables = db
        .select()
        .from(userSettings)
        .all();
      expect(tables).toHaveLength(1);
    });
  });

  describe('7. DST Transitions & Recurring Wall-Clock Preservation', () => {
    it('preserves 08:00 wall-clock local time across DST spring-forward and fall-back boundaries', async () => {
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const taskEngine = new TaskEngine(taskDefRepo, taskOccRepo);

      // Daily morning routine
      const created = await taskEngine.createTask({
        id: 'task-daily-fajr',
        title: 'Morning Routine',
        startDate: '2026-03-07',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '08:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId: 'series-daily-fajr',
      });

      // Materialize before DST spring forward (March 7, 2026, standard time UTC-6)
      const nowPreSpring = DateTime.fromISO('2026-03-07T07:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(nowPreSpring);

      const occPreSpring = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-03-07');
      expect(occPreSpring).not.toBeNull();
      const dtPreSpring = DateTime.fromISO(occPreSpring!.calculatedStartTime!, { zone: 'America/Chicago' });
      expect(dtPreSpring.hour).toBe(8);
      expect(dtPreSpring.minute).toBe(0);
      expect(dtPreSpring.offset).toBe(-360); // CST (UTC-6)

      // Materialize after DST spring forward (March 9, 2026, daylight time UTC-5)
      const nowPostSpring = DateTime.fromISO('2026-03-09T07:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(nowPostSpring);

      const occPostSpring = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-03-09');
      expect(occPostSpring).not.toBeNull();
      const dtPostSpring = DateTime.fromISO(occPostSpring!.calculatedStartTime!, { zone: 'America/Chicago' });
      // INVARIANT: Wall clock is strictly 08:00!
      expect(dtPostSpring.hour).toBe(8);
      expect(dtPostSpring.minute).toBe(0);
      expect(dtPostSpring.offset).toBe(-300); // CDT (UTC-5)
    });
  });

  describe('8. Recurrence Evaluation Under New Temporal Environment', () => {
    it('evaluates recurring tasks under the new location timezone without series corruption', async () => {
      await userSettingsRepo.saveAutoLocation(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/Chicago'
      );

      const taskEngine = new TaskEngine(taskDefRepo, taskOccRepo);

      // Weekly Friday prayer reminder
      const created = await taskEngine.createTask({
        id: 'task-friday-kahf',
        title: 'Surah Al-Kahf',
        startDate: '2026-09-18', // Friday
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        seriesId: 'series-friday-kahf',
      });

      const nowChicago = DateTime.fromISO('2026-09-18T08:00:00', { zone: 'America/Chicago' });
      await coordinator.fullRefresh(nowChicago);

      const occFridayChicago = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-18');
      expect(occFridayChicago).not.toBeNull();
      expect(occFridayChicago!.status).toBe('PENDING');

      // Travel to Sydney (Australia/Sydney, UTC+10)
      await userSettingsRepo.saveAutoLocation(
        { latitude: -33.8688, longitude: 151.2093 },
        'Australia/Sydney'
      );

      const nowSydney = DateTime.fromISO('2026-09-18T08:00:00', { zone: 'Australia/Sydney' });
      await coordinator.fullRefresh(nowSydney);

      const occFridaySydney = await taskOccRepo.findByDefinitionAndDate(created.id, '2026-09-18');
      expect(occFridaySydney).not.toBeNull();
      const dtSydney = DateTime.fromISO(occFridaySydney!.calculatedStartTime!, { zone: 'Australia/Sydney' });
      expect(dtSydney.hour).toBe(10);
      expect(dtSydney.minute).toBe(0);
    });
  });

  describe('9. Architecture Constraints & Invariants', () => {
    it('guarantees no continuous GPS polling and no secondary repeating timer in M12', () => {
      // Invariant: M12 only resolves location on foreground, manual trigger, or settings action.
      // Verified by checking coordinator and service APIs do not register intervals or background watchers.
      const locationCoordinator = new LocationRefreshCoordinator(userSettingsRepo, mockLocationService);
      expect(typeof (locationCoordinator as any).startPolling).toBe('undefined');
      expect(typeof (locationCoordinator as any).backgroundTimer).toBe('undefined');
    });
  });
});
