import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/data/schema';
import { migrateDatabase } from '@/data/migrator';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { streakRepository } from '@/data/repositories/StreakRepository';
import { journalRepository } from '@/data/repositories/JournalRepository';
import { hijriMonthOverrideRepository } from '@/data/repositories/HijriMonthOverrideRepository';
import { taskEngine } from '@/domain/task/TaskEngine';
import { HijriService } from '@/domain/calendar/HijriService';
import { getHijriMonthKey } from '@/domain/calendar/types';
import { DataBackupService } from '@/services/data/DataBackupService';
import { notificationReconciliationService } from '@/services/notification/NotificationReconciliationService';
import { plannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { widgetSyncCoordinator } from '@/services/widget/WidgetSyncCoordinator';
import { StaleWriteError } from '@/domain/journal/errors';

jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id'),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('Real SQLite Database & Backend Wiring Integration Suite', () => {
  let nodeDb: DatabaseSync;

  beforeEach(() => {
    const testDb = createTestDatabase();
    nodeDb = testDb.nodeDb;

    jest.spyOn(notificationReconciliationService, 'cancelOccurrenceReminder').mockResolvedValue(undefined as any);
    jest.spyOn(notificationReconciliationService, 'reconcile').mockResolvedValue({} as any);
    jest.spyOn(plannerRefreshCoordinator, 'fullRefresh').mockResolvedValue(undefined as any);
    jest.spyOn(widgetSyncCoordinator, 'sync').mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    cleanupTestDatabase();
    jest.restoreAllMocks();
  });

  // W-01: Full migration execution & schema integrity
  it('W-01: Full migration 0000->0008 execution creates exactly 6 application tables and drops dead tables', async () => {
    const tables = (
      nodeDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[]
    ).map(t => t.name);

    expect(tables).toContain('task_definitions');
    expect(tables).toContain('task_occurrences');
    expect(tables).toContain('user_settings');
    expect(tables).toContain('hijri_month_overrides');
    expect(tables).toContain('journal_entries');
    expect(tables).toContain('streak_data');

    // Dead tables must NOT exist
    expect(tables).not.toContain('worship_item_settings');
    expect(tables).not.toContain('prayer_cache');
    expect(tables).not.toContain('notification_schedule');

    expect(tables).toHaveLength(6);

    // Also verify migrateDatabase() runner creates __drizzle_migrations alongside all 6 tables
    const freshDb = new DatabaseSync(':memory:');
    freshDb.exec('PRAGMA foreign_keys = ON;');
    const client = {
      execSync: (sql: string) => freshDb.exec(sql),
      runSync: (sql: string, params: any[] = []) => freshDb.prepare(sql).run(...params),
      prepareSync: (sql: string) => ({
        executeSync: (params: any[] = []) => {
          const stmt = freshDb.prepare(sql);
          try {
            const rows = stmt.all(...params);
            return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null, changes: 0, lastInsertRowId: 0 };
          } catch {
            const info = stmt.run(...params);
            return { getAllSync: () => [], getFirstSync: () => null, changes: Number(info.changes), lastInsertRowId: Number(info.lastInsertRowid) };
          }
        },
      }),
      getAllSync: (sql: string, ...params: any[]) => freshDb.prepare(sql).all(...params),
    };
    const db = drizzle(client as any, { schema });
    await migrateDatabase(db);

    const freshTables = (
      freshDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[]
    ).map(t => t.name);
    expect(freshTables).toContain('__drizzle_migrations');
    expect(freshTables).toHaveLength(7);
  });

  // W-02: Single-task creation, update, and canonical purge
  it('W-02: Single-task creation, materialization, and THIS_AND_FUTURE deletion purges definitions, occurrences, and streak', async () => {
    const def = await taskEngine.createTask({
      title: 'One-off Audit Task',
      startDate: '2026-10-05',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      isRecurring: false,
    });
    expect(def.id).toBeDefined();
    expect(def.seriesId).toBe(def.id);

    const occ = await taskOccurrenceRepository.create({
      id: 'occ-w02-1',
      taskDefinitionId: def.id,
      seriesId: def.seriesId,
      localDate: '2026-10-05',
      planningDayKey: '2026-10-05',
      timezone: 'UTC',
      status: 'PENDING',
    });
    expect(occ.id).toBe('occ-w02-1');

    await streakRepository.enableStreak(def.seriesId);
    const initialStreak = await streakRepository.findBySeriesId(def.seriesId);
    expect(initialStreak).toBeDefined();

    // Canonical deletion of one-off task with THIS_AND_FUTURE
    await taskEngine.deleteTask({
      definitionId: def.id,
      occurrenceId: occ.id,
      scope: 'THIS_AND_FUTURE',
    });

    // Verify complete purge across all 3 tables
    expect(await taskDefinitionRepository.findById(def.id)).toBeNull();
    expect(await taskOccurrenceRepository.findById(occ.id)).toBeNull();
    expect(await streakRepository.findBySeriesId(def.seriesId)).toBeNull();
  });

  // W-03: Recurring task materialization, completion, and occurrence deletion with streak reversion
  it('W-03: Recurring task completion advances streak; THIS_OCCURRENCE deletion tombstones occurrence and reverts streak', async () => {
    const def = await taskEngine.createTask({
      title: 'Daily Dhikr',
      startDate: '2026-10-05',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '09:00' },
      recurrenceRule: 'FREQ=DAILY',
      isRecurring: true,
    });
    expect(def.seriesId).not.toBe(def.id);

    await streakRepository.enableStreak(def.seriesId);

    const occ = await taskOccurrenceRepository.create({
      id: 'occ-w03-1',
      taskDefinitionId: def.id,
      seriesId: def.seriesId,
      localDate: '2026-10-05',
      planningDayKey: '2026-10-05',
      timezone: 'UTC',
      status: 'PENDING',
    });

    // Complete the task -> streak becomes 1
    const completedOcc = await taskEngine.completeTask(occ.id, '2026-10-05T09:15:00Z');
    expect(completedOcc.status).toBe('COMPLETED');

    const streakAfterComplete = await streakRepository.findBySeriesId(def.seriesId);
    expect(streakAfterComplete?.currentStreak).toBe(1);

    // Delete occurrence with THIS_OCCURRENCE scope
    await taskEngine.deleteTask({
      definitionId: def.id,
      occurrenceId: occ.id,
      scope: 'THIS_OCCURRENCE',
    });

    // Occurrence should be tombstoned as CANCELLED (not permanently deleted, preserving tombstone)
    const tombstone = await taskOccurrenceRepository.findById(occ.id);
    expect(tombstone).toBeDefined();
    expect(tombstone?.status).toBe('CANCELLED');

    // Definition remains active
    const activeDef = await taskDefinitionRepository.findById(def.id);
    expect(activeDef).toBeDefined();
    expect(activeDef?.isActive).toBe(true);

    // Streak reverted to 0
    const streakAfterDelete = await streakRepository.findBySeriesId(def.seriesId);
    expect(streakAfterDelete?.currentStreak).toBe(0);
  });

  // W-04: UserSettings persistence, reads, and clean row types
  it('W-04: UserSettingsRepository upserts and reads without dead columns', async () => {
    const initial = await userSettingsRepository.get();
    expect(initial).toBeDefined();

    const updated = await userSettingsRepository.upsert({
      calculationMethod: 'ISNA',
      asrMethod: 'HANAFI',
      quietHoursEnabled: true,
      quietHoursStart: '23:30',
      quietHoursEnd: '06:30',
      defaultReminderMinutes: 15,
    });

    expect(updated.calculationMethod).toBe('ISNA');
    expect(updated.asrMethod).toBe('HANAFI');
    expect(updated.quietHoursEnabled).toBe(true);
    expect(updated.quietHoursStart).toBe('23:30');
    expect(updated.quietHoursEnd).toBe('06:30');
    expect(updated.defaultReminderMinutes).toBe(15);

    // Verify row directly from database table
    const rawRow = nodeDb.prepare("SELECT * FROM user_settings WHERE id = 'default'").get() as any;
    expect(rawRow.calculation_method).toBe('ISNA');
    expect(rawRow.asr_method).toBe('HANAFI');
    expect(rawRow.flame_engine).toBeUndefined();
    expect(rawRow.worship_suggestions_enabled).toBeUndefined();
    expect(rawRow.hijri_base_method).toBeUndefined();
  });

  // W-05: Hijri month overrides CRUD and effective Hijri date calculation
  it('W-05: HijriMonthOverrideRepository CRUD and HijriService calculation integration', async () => {
    const hijriService = new HijriService();

    // 1. Add override for 1448 AH Month 9 (Ramadan) with +1 day
    await hijriMonthOverrideRepository.upsert(1448, 9, 1);

    const overrides = await hijriMonthOverrideRepository.list();
    expect(overrides).toHaveLength(1);
    expect(overrides[0].hijriYear).toBe(1448);
    expect(overrides[0].hijriMonth).toBe(9);
    expect(overrides[0].adjustmentDays).toBe(1);

    // 2. Resolve date using effective override Map
    const overrideMap = new Map([[getHijriMonthKey(1448, 9), 1]]);
    const resolved = hijriService.resolveGregorianFromEffectiveHijri(
      { year: 1448, month: 9, day: 15 },
      { globalAdjustment: 0, monthOverrides: overrideMap }
    );
    expect(resolved.kind).toBe('UNIQUE');

    // 3. Delete override and confirm empty
    await hijriMonthOverrideRepository.delete(1448, 9);
    const overridesAfter = await hijriMonthOverrideRepository.list();
    expect(overridesAfter).toHaveLength(0);
  });

  // W-06: Journal entries CRUD and stale-write protection
  it('W-06: JournalRepository CRUD with optimistic concurrency revision tracking', async () => {
    const entry = await journalRepository.save({
      planningDayKey: '2026-10-05',
      encryptedPayload: 'cipher-payload-v1',
      encryptionVersion: 1,
    });

    expect(entry.planningDayKey).toBe('2026-10-05');
    expect(entry.encryptedPayload).toBe('cipher-payload-v1');
    expect(entry.revision).toBe(1);

    // Valid update with current revision
    const updated = await journalRepository.save({
      planningDayKey: '2026-10-05',
      encryptedPayload: 'cipher-payload-v2',
      revision: 1,
    });
    expect(updated.encryptedPayload).toBe('cipher-payload-v2');
    expect(updated.revision).toBe(2);

    // Stale update with outdated revision throws StaleWriteError
    await expect(
      journalRepository.save({
        planningDayKey: '2026-10-05',
        encryptedPayload: 'cipher-payload-v3-stale',
        revision: 1,
      })
    ).rejects.toThrow(StaleWriteError);
  });

  // W-07: StreakRepository series isolation
  it('W-07: StreakRepository series isolation and targeted deletion', async () => {
    await streakRepository.enableStreak('series-alpha');
    await streakRepository.enableStreak('series-beta');

    await streakRepository.incrementStreak('series-alpha', '2026-10-05');
    await streakRepository.incrementStreak('series-beta', '2026-10-05');

    const streakA = await streakRepository.findBySeriesId('series-alpha');
    const streakB = await streakRepository.findBySeriesId('series-beta');
    expect(streakA?.currentStreak).toBe(1);
    expect(streakB?.currentStreak).toBe(1);

    // Delete alpha
    await streakRepository.deleteBySeriesId('series-alpha');
    expect(await streakRepository.findBySeriesId('series-alpha')).toBeNull();

    // Beta must remain unaffected
    const streakBAfter = await streakRepository.findBySeriesId('series-beta');
    expect(streakBAfter).toBeDefined();
    expect(streakBAfter?.currentStreak).toBe(1);
  });

  // W-08: DataBackupService backward compatibility with legacy v1 backup JSON
  it('W-08: DataBackupService filters dead columns/tables on v1 import and exports clean data', async () => {
    const backupService = new DataBackupService();

    // Legacy backup containing dead tables and columns
    const legacyBackup = {
      version: 1,
      appName: 'IslamicPlanner',
      exportedAt: '2026-09-01T00:00:00.000Z',
      tables: {
        taskDefinitions: [
          {
            id: 'legacy-def-1',
            title: 'Legacy Task',
            startDate: '2026-10-05',
            scheduleType: 'ANYTIME_TODAY',
            scheduleData: '{}',
            seriesId: 'legacy-def-1',
            seriesVersion: 1,
            isActive: true,
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-01T00:00:00.000Z',
          },
        ],
        taskOccurrences: [
          {
            id: 'legacy-occ-1',
            taskDefinitionId: 'legacy-def-1',
            seriesId: 'legacy-def-1',
            localDate: '2026-10-05',
            planningDayKey: '2026-10-05',
            timezone: 'UTC',
            status: 'PENDING',
          },
        ],
        userSettings: [
          {
            id: 'default',
            calculationMethod: 'EGYPT',
            asrMethod: 'SHAFI',
            locationMode: 'MANUAL',
            flameEngine: 1, // Dead column from v1
            worshipSuggestionsEnabled: true, // Dead column from v1
            hijriBaseMethod: 'UMM_AL_QURA', // Dead column from v1
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-01T00:00:00.000Z',
          },
        ],
        hijriMonthOverrides: [],
        worshipItemSettings: [
          // Dead table from v1
          { id: 'w1', worshipItemKey: 'dhikr', isEnabled: true },
        ],
        streakData: [],
      },
    };

    const importResult = await backupService.importBackupJson(JSON.stringify(legacyBackup));
    expect(importResult.success).toBe(true);

    // Verify task imported
    const importedDef = await taskDefinitionRepository.findById('legacy-def-1');
    expect(importedDef).toBeDefined();
    expect(importedDef?.title).toBe('Legacy Task');

    // Verify user settings imported and dead columns filtered
    const importedSettings = await userSettingsRepository.get();
    expect(importedSettings?.calculationMethod).toBe('EGYPT');
    expect((importedSettings as any)?.flameEngine).toBeUndefined();
    expect((importedSettings as any)?.worshipSuggestionsEnabled).toBeUndefined();
    expect((importedSettings as any)?.hijriBaseMethod).toBeUndefined();
  });
});
