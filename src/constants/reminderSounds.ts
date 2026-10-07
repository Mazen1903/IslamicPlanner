export type SoundTier = 'FREE' | 'PREMIUM';

export interface ReminderSoundItem {
  id: string;
  name: string;
  tier: SoundTier;
  assetFile?: string; // filename in assets/sounds/
  durationSeconds?: number;
  description?: string;
}

export const REMINDER_SOUNDS: ReminderSoundItem[] = [
  {
    id: 'default',
    name: 'System Default',
    tier: 'FREE',
    description: 'Standard device notification tone',
  },
  {
    id: 'soft_chime',
    name: 'Soft Chime',
    tier: 'FREE',
    assetFile: 'soft_chime.wav',
    durationSeconds: 2,
    description: 'Gentle, calming bell chime',
  },
  {
    id: 'water_drop',
    name: 'Water Drop',
    tier: 'FREE',
    assetFile: 'water_drop.wav',
    durationSeconds: 1.5,
    description: 'Crisp droplet sound for mindful tasks',
  },
  {
    id: 'crystal_bell',
    name: 'Crystal Bell',
    tier: 'PREMIUM',
    assetFile: 'crystal_bell.wav',
    durationSeconds: 3,
    description: 'Resonant crystal bell with gentle sustain',
  },
  {
    id: 'temple_bowl',
    name: 'Singing Bowl',
    tier: 'PREMIUM',
    assetFile: 'temple_bowl.wav',
    durationSeconds: 4,
    description: 'Deep Tibetan singing bowl reverberation',
  },
  {
    id: 'morning_birds',
    name: 'Morning Birds',
    tier: 'PREMIUM',
    assetFile: 'morning_birds.wav',
    durationSeconds: 4,
    description: 'Peaceful dawn chorus birds chirping',
  },
  {
    id: 'desert_wind',
    name: 'Desert Wind',
    tier: 'PREMIUM',
    assetFile: 'desert_wind.wav',
    durationSeconds: 3.5,
    description: 'Subtle warm desert breeze sweep',
  },
  {
    id: 'tasbih_click',
    name: 'Tasbih Clicks',
    tier: 'PREMIUM',
    assetFile: 'tasbih_click.wav',
    durationSeconds: 2.5,
    description: 'Rhythmic wooden prayer beads clicking',
  },
  {
    id: 'gentle_harp',
    name: 'Gentle Rise',
    tier: 'PREMIUM',
    assetFile: 'gentle_harp.wav',
    durationSeconds: 3,
    description: 'Uplifting acoustic harp arpeggio',
  },
  {
    id: 'adhan_tone',
    name: 'Adhan-style Tone',
    tier: 'PREMIUM',
    assetFile: 'adhan_tone.wav',
    durationSeconds: 5,
    description: 'Melodic, non-vocal Islamic acoustic motif',
  },
];

export function getSoundById(id: string): ReminderSoundItem {
  return REMINDER_SOUNDS.find(s => s.id === id) ?? REMINDER_SOUNDS[0];
}
