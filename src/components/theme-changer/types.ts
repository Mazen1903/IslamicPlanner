import type { ImageSourcePropType } from 'react-native';

export interface ThemeGalleryItem {
  id: string; // 'default' or theme ID e.g. 'fajr_awakening'
  name: string;
  arabicName: string;
  tagline?: string;
  isDark?: boolean;
  wallpaperAsset?: ImageSourcePropType;
  previewColors?: {
    primary: string;
    background: string;
    surface: string;
    accent: string;
  };
}

export const DEFAULT_THEME_ITEM: ThemeGalleryItem = {
  id: 'default',
  name: 'Classic Default',
  arabicName: 'النمط الافتراضي',
  tagline: 'Clean emerald design matching standard display mode.',
  isDark: false,
};
