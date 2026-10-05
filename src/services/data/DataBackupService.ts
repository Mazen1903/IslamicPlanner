import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { getDatabase, runInTransaction, type AppDatabase } from '@/data/db';
import { getTableColumns } from 'drizzle-orm';
import {
  taskDefinitions,
  taskOccurrences,
  userSettings,
  hijriMonthOverrides,
  journalEntries,
  streakData,
} from '@/data/schema';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { plannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { notificationReconciliationService } from '@/services/notification/NotificationReconciliationService';
import { widgetSyncCoordinator } from '@/services/widget/WidgetSyncCoordinator';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { JOURNAL_LOCK_PREF_SLOT } from '@/services/journal/JournalLockPreference';

export interface BackupDataV1 {
  version: 1;
  exportedAt: string;
  appName: 'IslamicPlanner';
  tables: {
    taskDefinitions: any[];
    taskOccurrences: any[];
    userSettings: any[];
    hijriMonthOverrides: any[];
    worshipItemSettings?: any[];
    streakData: any[];
  };
}

function pickAllowedColumns<T extends Record<string, any>>(table: any, row: T): Partial<T> {
  const cols = getTableColumns(table);
  const out: any = {};
  for (const key of Object.keys(cols)) {
    if (key in row) {
      out[key] = row[key];
    }
  }
  return out;
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  importedAt?: string;
  error?: string;
}

export class DataBackupService {
  /**
   * Exports app data (excluding encrypted journal) to a JSON file and presents the share sheet.
   */
  async exportBackup(): Promise<BackupResult> {
    try {
      const db = getDatabase();

      const [
        tasks,
        occurrences,
        settings,
        overrides,
        streaks,
      ] = await Promise.all([
        db.select().from(taskDefinitions),
        db.select().from(taskOccurrences),
        db.select().from(userSettings),
        db.select().from(hijriMonthOverrides),
        db.select().from(streakData),
      ]);

      const backup: BackupDataV1 = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: 'IslamicPlanner',
        tables: {
          taskDefinitions: tasks,
          taskOccurrences: occurrences,
          userSettings: settings,
          hijriMonthOverrides: overrides,
          streakData: streaks,
        },
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const fileName = `IslamicPlanner_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      const filePath = `${baseDir}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Islamic Planner Backup',
          UTI: 'public.json',
        });
      }

      return { success: true, filePath };
    } catch (err: any) {
      console.warn('[DataBackupService] Export failed:', err);
      return { success: false, error: err?.message || 'Export failed' };
    }
  }

  /**
   * Prompts the user to pick a backup JSON file and restores it.
   */
  async importBackupFromFile(): Promise<BackupResult> {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return { success: false, error: 'Document picker was canceled' };
      }

      const fileUri = pickerResult.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return await this.importBackupJson(fileContent);
    } catch (err: any) {
      console.warn('[DataBackupService] Import from file failed:', err);
      return { success: false, error: err?.message || 'Failed to read backup file' };
    }
  }

  /**
   * Parses, validates, and atomically applies a backup JSON string.
   */
  async importBackupJson(jsonString: string): Promise<BackupResult> {
    try {
      let data: any;
      try {
        data = JSON.parse(jsonString);
      } catch {
        return { success: false, error: 'Invalid JSON format in backup file' };
      }

      if (!data || data.version !== 1 || data.appName !== 'IslamicPlanner' || !data.tables) {
        return {
          success: false,
          error: 'Incompatible or invalid backup file format (version 1 required)',
        };
      }

      const db = getDatabase();

      // Read current device entitlement & onboarding so we don't wipe local purchase status
      const currentSettings = await userSettingsRepository.get();
      const preservedIsPremium = currentSettings?.isPremium ?? false;
      const preservedOnboardingCompleted = currentSettings?.onboardingCompleted ?? true;

      await runInTransaction(async (tx: any) => {
        // 1. Clear tables to be replaced
        await tx.delete(taskOccurrences);
        await tx.delete(taskDefinitions);
        await tx.delete(hijriMonthOverrides);
        await tx.delete(streakData);

        // 2. Insert imported rows if present with column whitelisting
        if (data.tables.taskDefinitions?.length > 0) {
          const rows = data.tables.taskDefinitions.map((r: any) => pickAllowedColumns(taskDefinitions, r));
          await tx.insert(taskDefinitions).values(rows);
        }
        if (data.tables.taskOccurrences?.length > 0) {
          const rows = data.tables.taskOccurrences.map((r: any) => pickAllowedColumns(taskOccurrences, r));
          await tx.insert(taskOccurrences).values(rows);
        }
        if (data.tables.hijriMonthOverrides?.length > 0) {
          const rows = data.tables.hijriMonthOverrides.map((r: any) => pickAllowedColumns(hijriMonthOverrides, r));
          await tx.insert(hijriMonthOverrides).values(rows);
        }
        if (data.tables.streakData?.length > 0) {
          const rows = data.tables.streakData.map((r: any) => pickAllowedColumns(streakData, r));
          await tx.insert(streakData).values(rows);
        }

        // 3. User settings merge: keep local isPremium and onboardingCompleted
        if (data.tables.userSettings?.length > 0) {
          const importedSetting = pickAllowedColumns(userSettings, data.tables.userSettings[0]);
          importedSetting.isPremium = preservedIsPremium;
          importedSetting.onboardingCompleted = preservedOnboardingCompleted;
          importedSetting.updatedAt = new Date().toISOString();

          await tx.delete(userSettings);
          await tx.insert(userSettings).values(importedSetting as any);
        }
      });

      // 4. Trigger downstream synchronizations
      try {
        await plannerRefreshCoordinator.fullRefresh();
      } catch (e) {
        console.warn('[DataBackupService] Planner refresh after import warning:', e);
      }

      try {
        await notificationReconciliationService.reconcile();
      } catch (e) {
        console.warn('[DataBackupService] Notification reconcile after import warning:', e);
      }

      try {
        await widgetSyncCoordinator.sync();
      } catch (e) {
        console.warn('[DataBackupService] Widget sync after import warning:', e);
      }

      return { success: true, importedAt: data.exportedAt };
    } catch (err: any) {
      console.warn('[DataBackupService] Import transaction failed:', err);
      return { success: false, error: err?.message || 'Import transaction failed' };
    }
  }

  /**
   * Completely wipes all user data across SQLite, SecureStore, and scheduled notifications,
   * returning the app state to fresh onboarding.
   */
  async eraseAllData(): Promise<BackupResult> {
    try {
      // 1. Wipe database tables
      await runInTransaction(async (tx: any) => {
        await tx.delete(taskOccurrences);
        await tx.delete(taskDefinitions);
        await tx.delete(hijriMonthOverrides);
        await tx.delete(streakData);
        await tx.delete(journalEntries);
        await tx.delete(userSettings);

        // Re-insert pristine default settings row with onboardingCompleted = false
        const now = new Date().toISOString();
        await tx.insert(userSettings).values({
          id: 'default',
          locationMode: 'AUTO',
          calculationMethod: 'MWL',
          asrMethod: 'SHAFI',
          highLatitudeRule: 'AUTO',
          polarCircleResolution: 'AQRAB_YAUM',
          prayerAdjustments: '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}',
          planningDayStart: 'FAJR',
          hijriGlobalAdjustment: 0,
          prayerAlertsEnabled: true,
          completedTasksMode: 'KEEP',
          overdueTasksMode: 'KEEP',
          prayerVibrationEnabled: true,
          taskRemindersEnabled: true,
          taskVibrationEnabled: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          defaultReminderMinutes: null,
          journalReminderEnabled: false,
          journalReminderTime: '21:30',
          themeMode: 'SYSTEM',
          isPremium: false,
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
        });
      });

      // 2. Clear SecureStore keys
      try {
        await SecureStore.deleteItemAsync(JOURNAL_LOCK_PREF_SLOT);
      } catch {}
      try {
        await SecureStore.deleteItemAsync('journal_encryption_key_v1');
      } catch {}
      try {
        await SecureStore.deleteItemAsync('app_islamic_theme_id_v1');
      } catch {}
      try {
        await SecureStore.deleteItemAsync('premium_notify_me_v1');
      } catch {}

      // 3. Cancel all scheduled notifications
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (err) {
        console.warn('[DataBackupService] Failed to cancel notifications on wipe:', err);
      }

      // 4. Sync widgets
      try {
        await widgetSyncCoordinator.sync();
      } catch (err) {
        console.warn('[DataBackupService] Failed to sync widget after wipe:', err);
      }

      // 5. Reset onboarding store so RootGate immediately redirects to /onboarding
      useOnboardingStore.getState().reset();
      await useOnboardingStore.getState().initialize();

      return { success: true };
    } catch (err: any) {
      console.warn('[DataBackupService] Erase all data failed:', err);
      return { success: false, error: err?.message || 'Erase all data failed' };
    }
  }
}

export const dataBackupService = new DataBackupService();
