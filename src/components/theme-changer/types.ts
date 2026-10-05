import type { ImageSourcePropType } from 'react-native';

export type ThemeCategory = 'all' | 'sacred' | 'celestial' | 'nature';

export interface ThemeCategoryOption {
  id: ThemeCategory;
  label: string;
  icon: string;
}

export const THEME_CATEGORIES: ThemeCategoryOption[] = [
  { id: 'all', label: 'All', icon: 'palette' },
  { id: 'sacred', label: 'Sacred Places', icon: 'mosque' },
  { id: 'celestial', label: 'Celestial & Times', icon: 'moon' },
  { id: 'nature', label: 'Nature', icon: 'leaf' },
];

export interface ThemeGalleryItem {
  id: string; // 'default' or theme ID e.g. 'fajr_awakening'
  name: string;
  tagline?: string;
  isDark?: boolean;
  category?: ThemeCategory;
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
  tagline: 'Clean emerald design matching standard display mode.',
  isDark: false,
  category: 'all',
  wallpaperAsset: require('../../../assets/themes/cards/classic_default.jpg'),
  previewColors: {
    primary: '#0F8A52',
    background: '#F9F7F2',
    surface: '#FFFFFF',
    accent: '#D4A017',
  },
};
