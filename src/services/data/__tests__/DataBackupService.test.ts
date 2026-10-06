import { DataBackupService, type BackupDataV1 } from '../DataBackupService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { getDatabase, runInTransaction } from '@/data/db';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { plannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { notificationReconciliationService } from '@/services/notification/NotificationReconciliationService';
import { widgetSyncCoordinator } from '@/services/widget/WidgetSyncCoordinator';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///documents/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn().mockReturnValue(false),
}));

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/data/db', () => ({
  getDatabase: jest.fn(),
  runInTransaction: jest.fn(),
}));

jest.mock('@/data/repositories/UserSettingsRepository', () => ({
  userSettingsRepository: {
    get: jest.fn(),
    upsert: jest.fn(),
  },
}));

jest.mock('@/services/PlannerRefreshCoordinator', () => ({
  plannerRefreshCoordinator: {
    fullRefresh: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/notification/NotificationReconciliationService', () => ({
  notificationReconciliationService: {
    reconcile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/widget/WidgetSyncCoordinator', () => ({
  widgetSyncCoordinator: {
    sync: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('DataBackupService', () => {
  let service: DataBackupService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataBackupService();

    mockDb = {
      select: jest.fn(() => ({
        from: jest.fn().mockResolvedValue([]),
      })),
      delete: jest.fn(() => ({
        where: jest.fn().mockReturnValue({ run: jest.fn() }),
        run: jest.fn(),
      })),
      insert: jest.fn(() => ({
        values: jest.fn().mockReturnValue({ run: jest.fn() }),
      })),
    };
    (getDatabase as jest.Mock).mockReturnValue(mockDb);
  });

  describe('exportBackup', () => {
    it('creates a JSON backup and offers sharing', async () => {
      const result = await service.exportBackup();

      expect(result.success).toBe(true);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('IslamicPlanner_Backup_'),
        expect.any(String),
        expect.any(Object)
      );

      const writtenJson = JSON.parse(
        (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1]
      );
      expect(writtenJson.version).toBe(1);
      expect(writtenJson.appName).toBe('IslamicPlanner');
      expect(writtenJson.tables).toBeDefined();

      expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('importBackupJson', () => {
    it('rejects invalid JSON string', async () => {
      const result = await service.importBackupJson('not valid json');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });

    it('rejects backup with invalid version or appName', async () => {
      const result = await service.importBackupJson(
        JSON.stringify({ version: 2, appName: 'OtherApp' })
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Incompatible or invalid backup file');
    });

    it('atomically restores valid backup and preserves local entitlement state', async () => {
      (userSettingsRepository.get as jest.Mock).mockResolvedValue({
        isPremium: true,
        onboardingCompleted: true,
      });

      (runInTransaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          delete: jest.fn(() => ({ run: jest.fn() })),
          insert: jest.fn(() => ({
            values: jest.fn().mockReturnValue({ run: jest.fn() }),
          })),
        };
        return cb(tx);
      });

      const validBackup: BackupDataV1 = {
        version: 1,
        exportedAt: '2026-10-04T12:00:00.000Z',
        appName: 'IslamicPlanner',
        tables: {
          taskDefinitions: [{ id: 'def_1', title: 'Recite Surah Kahf' }],
          taskOccurrences: [{ id: 'occ_1', taskDefinitionId: 'def_1' }],
          userSettings: [{ id: 'default', calculationMethod: 'MWL', isPremium: false, onboardingCompleted: false }],
          hijriMonthOverrides: [],
          worshipItemSettings: [],
          streakData: [],
        },
      };

      const result = await service.importBackupJson(JSON.stringify(validBackup));

      expect(result.success).toBe(true);
      expect(runInTransaction).toHaveBeenCalledTimes(1);
      expect(plannerRefreshCoordinator.fullRefresh).toHaveBeenCalledTimes(1);
      expect(notificationReconciliationService.reconcile).toHaveBeenCalledTimes(1);
      expect(widgetSyncCoordinator.sync).toHaveBeenCalledTimes(1);
    });
  });

  describe('eraseAllData', () => {
    it('deletes all tables, wipes SecureStore keys, cancels notifications and resets onboarding', async () => {
      (runInTransaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          delete: jest.fn(() => ({ run: jest.fn() })),
          insert: jest.fn(() => ({
            values: jest.fn().mockReturnValue({ run: jest.fn() }),
          })),
        };
        return cb(tx);
      });

      const resetSpy = jest.spyOn(useOnboardingStore.getState(), 'reset');
      const initSpy = jest.spyOn(useOnboardingStore.getState(), 'initialize').mockResolvedValue(undefined as any);

      const result = await service.eraseAllData();

      expect(result.success).toBe(true);
      expect(runInTransaction).toHaveBeenCalledTimes(1);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('journal_biometric_lock_enabled_v1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('journal_encryption_key_v1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('app_islamic_theme_id_v1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('premium_notify_me_v1');
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(resetSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledTimes(1);
    });
  });
});
