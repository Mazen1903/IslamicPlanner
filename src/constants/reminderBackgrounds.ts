export interface ReminderBackgroundItem {
  id: string;
  name: string;
  tier: 'FREE' | 'PREMIUM';
  colorGradient: [string, string];
  description: string;
}

export const REMINDER_BACKGROUNDS: ReminderBackgroundItem[] = [
  {
    id: 'theme',
    name: 'Theme Accent',
    tier: 'FREE',
    colorGradient: ['#1B4332', '#081C15'],
    description: 'Matches your current active Islamic theme palette',
  },
  {
    id: 'night_mosque',
    name: 'Night Mosque',
    tier: 'FREE',
    colorGradient: ['#0B132B', '#1C2541'],
    description: 'Quiet silhouette of minarets under starlight',
  },
  {
    id: 'kaaba_dusk',
    name: 'Kaaba Dusk',
    tier: 'PREMIUM',
    colorGradient: ['#2B1B17', '#4A2810'],
    description: 'Golden hour twilight over the holy sanctuary',
  },
  {
    id: 'desert_dunes',
    name: 'Desert Dunes',
    tier: 'PREMIUM',
    colorGradient: ['#6B4423', '#2C1810'],
    description: 'Serene warm sunset ripples across golden sand dunes',
  },
  {
    id: 'lantern_bokeh',
    name: 'Lantern Bokeh',
    tier: 'PREMIUM',
    colorGradient: ['#3A1C28', '#1A0C14'],
    description: 'Warm glowing Fanous lanterns with soft luminous bokeh',
  },
  {
    id: 'geometric_emerald',
    name: 'Arabesque Emerald',
    tier: 'PREMIUM',
    colorGradient: ['#10392B', '#061D15'],
    description: 'Intricate traditional Islamic geometric latticework',
  },
  {
    id: 'pastel_garden',
    name: 'Pastel Garden',
    tier: 'PREMIUM',
    colorGradient: ['#283618', '#606C38'],
    description: 'Subtle olive and eucalyptus botanicals',
  },
];

export function getBackgroundById(id?: string): ReminderBackgroundItem {
  if (!id) return REMINDER_BACKGROUNDS[0];
  return REMINDER_BACKGROUNDS.find(b => b.id === id) ?? REMINDER_BACKGROUNDS[0];
}
