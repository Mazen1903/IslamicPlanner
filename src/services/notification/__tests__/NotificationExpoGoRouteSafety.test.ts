/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';

// Mock expo to simulate Expo Go environment
jest.mock('expo', () => {
  const actual = jest.requireActual('expo');
  return {
    ...actual,
    isRunningInExpoGo: jest.fn(() => true),
  };
});

// Mock expo-notifications to throw the exact fatal error encountered in Expo Go SDK 53+
jest.mock('expo-notifications', () => {
  throw new Error(
    'expo-notifications: Android Push notifications functionality provided by expo-notifications was removed from Expo Go with SDK 53.'
  );
});

describe('M24 Expo Go Route-Graph Compatibility (NG-05 to NG-09)', () => {
  let NotificationSchedulerAdapterModule: typeof import('../NotificationSchedulerAdapter');
  let NotificationChannelManagerModule: typeof import('../NotificationChannelManager');
  let NotificationReconciliationServiceModule: typeof import('../NotificationReconciliationService');
  let PlannerRefreshCoordinatorModule: typeof import('../../PlannerRefreshCoordinator');

  beforeAll(() => {
    // NG-05: Module load under Expo Go
    expect(() => {
      NotificationSchedulerAdapterModule = require('../NotificationSchedulerAdapter');
    }).not.toThrow();

    // NG-06: Route dependency evaluation under Expo Go
    expect(() => {
      NotificationChannelManagerModule = require('../NotificationChannelManager');
      NotificationReconciliationServiceModule = require('../NotificationReconciliationService');
      PlannerRefreshCoordinatorModule = require('../../PlannerRefreshCoordinator');
    }).not.toThrow();
  });

  describe('NG-05 — Scheduler adapter module load in Expo Go', () => {
    it('evaluates module without evaluating expo-notifications native runtime', () => {
      expect(NotificationSchedulerAdapterModule).toBeDefined();
      expect(NotificationSchedulerAdapterModule.NotificationSchedulerAdapter).toBeDefined();
      expect(NotificationSchedulerAdapterModule.notificationSchedulerAdapter).toBeDefined();
      expect(NotificationSchedulerAdapterModule.IosAuthorizationStatus).toBeDefined();
    });
  });

  describe('NG-06 — Reconciliation route dependency in Expo Go', () => {
    it('evaluates entire route-reachable notification dependency chain safely', () => {
      expect(NotificationReconciliationServiceModule.NotificationReconciliationService).toBeDefined();
      expect(NotificationReconciliationServiceModule.notificationReconciliationService).toBeDefined();
      expect(PlannerRefreshCoordinatorModule.PlannerRefreshCoordinator).toBeDefined();
      expect(PlannerRefreshCoordinatorModule.plannerRefreshCoordinator).toBeDefined();
    });
  });

  describe('NG-07 — Expo Go notification operation degradation', () => {
    it('adapter operations degrade safely without invoking expo-notifications', async () => {
      const adapter = new NotificationSchedulerAdapterModule.NotificationSchedulerAdapter();

      // getPermissionStatus degrades to DENIED
      const perm = await adapter.getPermissionStatus();
      expect(perm).toEqual({ canSchedule: false, canRequest: false, status: 'DENIED' });

      // requestPermission degrades to DENIED
      const reqPerm = await adapter.requestPermission();
      expect(reqPerm).toEqual({ canSchedule: false, canRequest: false, status: 'DENIED' });

      // scheduleNotification degrades to returning desired identifier
      const desired = {
        identifier: 'task-reminder:occ-123:default',
        occurrenceId: 'occ-123',
        taskDefinitionId: 'def-123',
        title: 'Fajr Task',
        triggerAtMs: 1789640000000,
        channelId: 'task-reminders',
        data: { kind: 'task-reminder' },
      };
      const scheduledId = await adapter.scheduleNotification(desired as any);
      expect(scheduledId).toBe('task-reminder:occ-123:default');

      // cancelScheduledNotification is a safe no-op
      await expect(adapter.cancelScheduledNotification('task-reminder:occ-123:default')).resolves.toBeUndefined();

      // getAllScheduledNotifications returns empty array
      const allScheduled = await adapter.getAllScheduledNotifications();
      expect(allScheduled).toEqual([]);
    });

    it('reconciliation operations degrade safely with empty reconcile result', async () => {
      const service = new NotificationReconciliationServiceModule.NotificationReconciliationService(
        undefined,
        undefined,
        NotificationSchedulerAdapterModule.notificationSchedulerAdapter,
        NotificationChannelManagerModule.notificationChannelManager
      );

      const result = await service.reconcile();
      expect(result).toEqual({
        scheduled: [],
        cancelled: [],
        unchanged: [],
        skippedPast: [],
        skippedCapacity: [],
        failed: [],
      });

      await expect(service.cancelOccurrenceReminder('occ-123')).resolves.toBeUndefined();
    });
  });

  describe('NG-08 — Native scheduler behavior preserved', () => {
    it('notificationRuntime detects environment availability correctly', () => {
      const { notificationsAvailable } = require('../notificationRuntime');
      // In this Expo Go mock test environment, notifications are not available
      expect(notificationsAvailable()).toBe(false);
    });
  });

  describe('NG-09 — Channel manager Expo Go safety', () => {
    it('channel creation is a safe no-op under Expo Go', async () => {
      const manager = new NotificationChannelManagerModule.NotificationChannelManager();
      await expect(manager.ensureChannel()).resolves.toBeUndefined();
    });
  });

  describe('Phase 7 — Route Graph Static Audit', () => {
    const routeReachableFiles = [
      'src/services/notification/NotificationBootstrap.ts',
      'src/services/notification/NotificationSchedulerAdapter.ts',
      'src/services/notification/NotificationChannelManager.ts',
      'src/services/notification/NotificationReconciliationService.ts',
      'src/services/notification/notificationRuntime.ts',
      'src/services/PlannerRefreshCoordinator.ts',
      'src/hooks/useToday.ts',
      'app/(tabs)/settings/notifications.tsx',
    ];

    it.each(routeReachableFiles)(
      '%s contains NO static runtime imports from expo-notifications',
      (relativeFilePath) => {
        const fullPath = path.resolve(__dirname, '../../../../', relativeFilePath);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Match static runtime import: import ... from 'expo-notifications'
        // Disallow: import * as ..., import { ... } from 'expo-notifications'
        // Allow: import type ... from 'expo-notifications'
        const staticRuntimeImportRegex = /^import\s+(?!type\s+)(?:[\w*\s{},]+)\s+from\s+['"]expo-notifications['"]/m;
        const match = content.match(staticRuntimeImportRegex);

        expect(match).toBeNull();
      }
    );
  });
});
