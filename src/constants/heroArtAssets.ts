import type { ImageSourcePropType } from 'react-native';

const CLASSIC_HERO: ImageSourcePropType = require('../../assets/hero/default_light.png');

export const HERO_ART: Record<string, ImageSourcePropType> = {
  rawdah_emerald: CLASSIC_HERO,
  fajr_awakening: CLASSIC_HERO,
  tahajjud_noor: CLASSIC_HERO,
  andalusian_oasis: CLASSIC_HERO,
  sacred_tawaf: CLASSIC_HERO,
  blessed_olive: CLASSIC_HERO,
  samarkand_turquoise: CLASSIC_HERO,
  celestial_caravan: CLASSIC_HERO,
  maghrib_lantern: CLASSIC_HERO,
  default_light: CLASSIC_HERO,
  default_dark: CLASSIC_HERO,
};
