export interface TaskTemplateItem {
  title: string;
  notes?: string;
  iconId: string;
  scheduleMode: 'RELATIVE_TO_PRAYER' | 'PRAYER_WINDOW' | 'ANYTIME';
  relativePrayer?: {
    prayer: 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';
    offsetMinutes: number;
  };
  windowPrayer?: 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';
}

export interface TaskTemplate {
  id: string;
  title: string;
  arabicTitle?: string;
  description: string;
  iconId: string;
  badge?: string;
  items: TaskTemplateItem[];
}
