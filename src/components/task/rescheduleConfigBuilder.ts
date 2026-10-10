import type { Prayer } from '@/constants/prayers';
import type { ScheduleConfig } from '@/domain/task/types';

export type RescheduleMode = 'PRAYER_RELATIVE' | 'EXACT_TIME' | 'PRAYER_WINDOW' | 'ANYTIME_TODAY';

export interface RescheduleConfigParams {
  mode: RescheduleMode;
  targetPrayer: Prayer;
  direction?: 'BEFORE' | 'AFTER';
  offsetMinutes?: number;
  exactTime?: string;
  endPrayer?: Prayer;
}

export function buildRescheduleConfig(params: RescheduleConfigParams): ScheduleConfig {
  const {
    mode,
    targetPrayer,
    direction = 'AFTER',
    offsetMinutes = 0,
    exactTime = '12:00',
    endPrayer = targetPrayer,
  } = params;

  switch (mode) {
    case 'PRAYER_RELATIVE': {
      const clampedOffset = Math.max(0, Math.min(720, Math.round(offsetMinutes || 0)));
      return {
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: targetPrayer,
          direction,
          offsetMinutes: clampedOffset,
        },
      };
    }
    case 'EXACT_TIME': {
      // Ensure "HH:mm" 24h format
      let formattedTime = '12:00';
      const match = exactTime.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
        const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));
        formattedTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }
      return {
        scheduleType: 'EXACT_TIME',
        scheduleData: {
          localTime: formattedTime,
        },
      };
    }
    case 'PRAYER_WINDOW': {
      return {
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: targetPrayer,
          endPrayer,
        },
      };
    }
    case 'ANYTIME_TODAY': {
      return {
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      };
    }
  }
}
