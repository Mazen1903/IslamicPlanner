import type { ImageSourcePropType } from 'react-native';
import { useTheme } from './index';
import { HERO_ART } from '@/constants/heroArtAssets';

export function useHeroArt(): ImageSourcePropType {
  const { activeIslamicTheme, isDark } = useTheme();
  const themeId = activeIslamicTheme?.id;

  if (themeId && HERO_ART[themeId]) {
    return HERO_ART[themeId];
  }

  return isDark ? HERO_ART.default_dark : HERO_ART.default_light;
}
