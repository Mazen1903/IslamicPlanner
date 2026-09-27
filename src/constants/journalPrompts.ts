/**
 * Curated Islamic Muhasaba & Reflection Prompts
 * Designed for daily spiritual self-audit, gratitude, and mindful living.
 */
export const JOURNAL_PROMPTS: string[] = [
  'What is one blessing I experienced today that I almost took for granted?',
  'What deed did I do today purely for the sake of Allah?',
  'Where did I fall short today, and how can I do better tomorrow inshaAllah?',
  'How did I bring peace or joy to someone around me today?',
  'What ayah, hadith, or reminder touched my heart today?',
  'Write a heartfelt dua for yourself, your family, and the Ummah.',
  'What challenged my patience today, and how did I react?',
  'What is one habit or action I want to stop or minimize tomorrow?',
  'What did I learn today that brought me closer to Allah?',
  'Who is someone I need to forgive, make peace with, or pray for?',
  'What intention (niyyah) do I want to carry into tomorrow?',
  'How was the presence of my heart during my prayers today?',
  'What is one act of hidden charity or kindness I can plan for tomorrow?',
  'If today were my last day, what would I wish I had done differently?',
  'Name three things you say "Alhamdulillah" for today without hesitation.',
  'What occupied my mind and heart the most today? Was it worthy?',
];

/**
 * Returns a deterministic set of prompts for a given planning day key (YYYY-MM-DD).
 */
export function getDailyPrompts(dayKey: string, count: number = 3): string[] {
  if (!dayKey || JOURNAL_PROMPTS.length === 0) {
    return JOURNAL_PROMPTS.slice(0, count);
  }

  // Simple string hash for deterministic rotation by day
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash << 5) - hash + dayKey.charCodeAt(i);
    hash |= 0;
  }
  const startIndex = Math.abs(hash) % JOURNAL_PROMPTS.length;

  const result: string[] = [];
  for (let i = 0; i < Math.min(count, JOURNAL_PROMPTS.length); i++) {
    const idx = (startIndex + i) % JOURNAL_PROMPTS.length;
    result.push(JOURNAL_PROMPTS[idx]);
  }
  return result;
}
