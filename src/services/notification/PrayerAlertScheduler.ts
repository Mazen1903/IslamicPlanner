import { DateTime } from 'luxon';
import { PrayerEngine } from '@/domain/prayer/PrayerEngine';
import { PRAYERS, type Prayer } from '@/constants/prayers';
import { LocationAwareTodayTemporalInputProvider } from '@/services/TodayTemporalInputProvider';
import type { DesiredNotification } from '@/domain/notification/types';
import { NOTIFICATION_PAYLOAD_VERSION } from '@/domain/notification/types';
import type { NotificationChannelManagerAPI } from './NotificationChannelManager';
import { notificationChannelManager } from './NotificationChannelManager';

export const PRAYER_ALERT_PREFIX = 'prayer-alert:';

export function isPrayerAlertNotificationId(id: string): boolean {
  return typeof id === 'string' && id.startsWith(PRAYER_ALERT_PREFIX);
}

export function buildPrayerAlertId(prayer: Prayer, date: string): string {
  return `${PRAYER_ALERT_PREFIX}${prayer.toLowerCase()}:${date}`;
}

export interface PrayerAlertSchedulerAPI {
  getDesiredPrayerAlerts(nowMs: number, prayerVibrationEnabled?: boolean): Promise<DesiredNotification[]>;
}

export class PrayerAlertScheduler implements PrayerAlertSchedulerAPI {
  constructor(
    private readonly temporalProvider = new LocationAwareTodayTemporalInputProvider(),
    private readonly channelManager: NotificationChannelManagerAPI = notificationChannelManager
  ) {}

  async getDesiredPrayerAlerts(
    nowMs: number,
    prayerVibrationEnabled = true
  ): Promise<DesiredNotification[]> {
    const inputResult = await this.temporalProvider.getInputs();
    if (inputResult.status !== 'READY') {
      return [];
    }

    const { coordinates, params } = inputResult.inputs;
    const nowDt = DateTime.fromMillis(nowMs, { zone: params.timezone });
    if (!nowDt.isValid) {
      return [];
    }

    const startDate = nowDt.toISODate()!;
    const endDate = nowDt.plus({ days: 2 }).toISODate()!; // 3 days total

    let prayerTimesMap;
    try {
      prayerTimesMap = PrayerEngine.calculateRange(startDate, endDate, coordinates, params);
    } catch {
      return [];
    }

    const channelId = this.channelManager.getPrayerChannelId(prayerVibrationEnabled);
    const desiredAlerts: DesiredNotification[] = [];

    // The 5 obligatory prayer alerts
    const alertPrayers: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

    prayerTimesMap.forEach((dayTimes, dateStr) => {
      for (const prayer of alertPrayers) {
        const prayerDt: DateTime = dayTimes[prayer.toLowerCase() as keyof typeof dayTimes] as DateTime;
        if (!prayerDt || !prayerDt.isValid) {
          continue;
        }

        const triggerAtMs = prayerDt.toMillis();
        if (triggerAtMs > nowMs) {
          const identifier = buildPrayerAlertId(prayer, dateStr);
          const prayerTitle = prayer.charAt(0) + prayer.slice(1).toLowerCase();

          desiredAlerts.push({
            identifier,
            occurrenceId: `prayer-${prayer.toLowerCase()}-${dateStr}`,
            taskDefinitionId: `prayer-def-${prayer.toLowerCase()}`,
            title: `${prayerTitle} Prayer`,
            triggerAtMs,
            channelId,
            data: {
              kind: 'prayer-alert',
              prayerName: prayer,
              date: dateStr,
              triggerAtMs,
              payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
              body: `Time for ${prayerTitle} prayer · ${prayerDt.toFormat('h:mm a')}`,
            },
          });
        }
      }
    });

    // Sort by triggerAtMs ascending
    desiredAlerts.sort((a, b) => a.triggerAtMs - b.triggerAtMs);
    return desiredAlerts;
  }
}

export const prayerAlertScheduler = new PrayerAlertScheduler();
