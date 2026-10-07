import type { TaskTemplate } from './types';

export const BUILTIN_TEMPLATES: TaskTemplate[] = [
  {
    id: 'morning_adhkar',
    title: 'Morning Sunnah & Adhkar',
    arabicTitle: 'Adhkar As-Sabah',
    description: 'Establish spiritual barakah at dawn with Fajr Sunnah, morning remembrances, and Quran.',
    iconId: 'mosque',
    badge: 'Daily',
    items: [
      {
        title: 'Fajr Sunnah (2 Rak’ahs)',
        notes: 'Better than the world and all that is in it.',
        iconId: 'mosque',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'FAJR', offsetMinutes: -15 },
      },
      {
        title: 'Morning Adhkar',
        notes: 'Remembrances of morning protection and praise.',
        iconId: 'dua',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'FAJR', offsetMinutes: 15 },
      },
      {
        title: 'Morning Quran Recitation',
        notes: 'Indeed, the recitation of dawn is ever witnessed.',
        iconId: 'quran',
        scheduleMode: 'PRAYER_WINDOW',
        windowPrayer: 'FAJR',
      },
      {
        title: 'Hydrate & Morning Water',
        notes: 'Sunnah of taking water and breakfast for physical vitality.',
        iconId: 'water',
        scheduleMode: 'ANYTIME',
      },
    ],
  },
  {
    id: 'jumuah_checklist',
    title: 'Jumu’ah Friday Sunnahs',
    arabicTitle: 'Sunan Al-Jumuah',
    description: 'Weekly Friday routine for purity, Surah Al-Kahf, and the special hour of supplication.',
    iconId: 'quran',
    badge: 'Weekly',
    items: [
      {
        title: 'Friday Ghusl & Clean Clothes',
        notes: 'Sunnah bath, miswak, and pleasant fragrance.',
        iconId: 'cleanup',
        scheduleMode: 'PRAYER_WINDOW',
        windowPrayer: 'DHUHR',
      },
      {
        title: 'Recite Surah Al-Kahf',
        notes: 'A light for the believer between two Fridays.',
        iconId: 'quran',
        scheduleMode: 'PRAYER_WINDOW',
        windowPrayer: 'DHUHR',
      },
      {
        title: 'Early Attendance for Jumu’ah',
        notes: 'Arriving early before the Imam ascends the minbar.',
        iconId: 'mosque',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'DHUHR', offsetMinutes: -30 },
      },
      {
        title: 'Hour of Response Supplication (Du’a)',
        notes: 'Seek the last hour before Maghrib for accepted du’a.',
        iconId: 'dua',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'MAGHRIB', offsetMinutes: -45 },
      },
    ],
  },
  {
    id: 'evening_routine',
    title: 'Evening Adhkar & Witr',
    arabicTitle: 'Adhkar Al-Masaa',
    description: 'Wind down your day with evening supplications, Surah Al-Mulk, and Witr prayer.',
    iconId: 'dua',
    badge: 'Nightly',
    items: [
      {
        title: 'Evening Adhkar',
        notes: 'Remembrances of evening security and tawakkul.',
        iconId: 'dua',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'ASR', offsetMinutes: 20 },
      },
      {
        title: 'Recite Surah Al-Mulk',
        notes: 'Intercession and protection from punishment.',
        iconId: 'quran',
        scheduleMode: 'PRAYER_WINDOW',
        windowPrayer: 'ISHA',
      },
      {
        title: 'Journal & Daily Muhasabah',
        notes: 'Brief self-reflection and gratitude before rest.',
        iconId: 'journal',
        scheduleMode: 'PRAYER_WINDOW',
        windowPrayer: 'ISHA',
      },
      {
        title: 'Pray Witr & Night Intention',
        notes: 'Make the last of your prayer at night Witr.',
        iconId: 'mosque',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'ISHA', offsetMinutes: 30 },
      },
    ],
  },
  {
    id: 'ramadan_fasting',
    title: 'Fasting & Ramadan Routine',
    arabicTitle: 'Siyam Ramadan',
    description: 'Suhoor, Quran reading, Iftar supplication, and Taraweeh congregation.',
    iconId: 'meal',
    badge: 'Season',
    items: [
      {
        title: 'Suhoor & Tahajjud',
        notes: 'Eat suhoor for indeed there is blessing in it.',
        iconId: 'meal',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'FAJR', offsetMinutes: -45 },
      },
      {
        title: 'Fajr in Congregation',
        notes: 'Begin the fast with Fajr in the mosque.',
        iconId: 'mosque',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'FAJR', offsetMinutes: 0 },
      },
      {
        title: 'Iftar & Maghrib Du’a',
        notes: 'The fasting person has a supplication that is not rejected.',
        iconId: 'meal',
        scheduleMode: 'RELATIVE_TO_PRAYER',
        relativePrayer: { prayer: 'MAGHRIB', offsetMinutes: 0 },
      },
      {
        title: 'Taraweeh & Night Prayers',
        notes: 'Whoever stands in Ramadan with faith and seeking reward.',
        iconId: 'mosque',
        scheduleMode: 'PRAYER_WINDOW',
        windowPrayer: 'ISHA',
      },
    ],
  },
];

export function getBuiltinTemplateById(id: string): TaskTemplate | undefined {
  return BUILTIN_TEMPLATES.find(t => t.id === id);
}
