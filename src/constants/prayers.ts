export type Prayer = 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';

export const PRAYERS: readonly Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;

export const PRAYER_ORDER: readonly Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;

export const PRAYER_NAMES: Record<Prayer, string> = {
  FAJR: 'Fajr',
  DHUHR: 'Dhuhr',
  ASR: 'Asr',
  MAGHRIB: 'Maghrib',
  ISHA: 'Isha',
};
