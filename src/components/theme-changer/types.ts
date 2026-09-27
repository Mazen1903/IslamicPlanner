import type { ImageSourcePropType } from 'react-native';

export type ThemeCategory = 'pure_color' | 'texture' | 'scenery';

export interface ThemeGalleryItem {
  id: string;
  name: string;
  category: ThemeCategory;
  isPro?: boolean;
  isDark?: boolean;
  // Color properties
  color: string;
  background: string;
  dotColor?: string;
  // Assets
  thumbnailAsset?: ImageSourcePropType;
  previewAsset?: ImageSourcePropType;
  wallpaperAsset?: ImageSourcePropType;
}

export const PURE_COLOR_THEMES: ThemeGalleryItem[] = [
  {
    id: 'color_sky_blue',
    name: 'Sky Blue',
    category: 'pure_color',
    color: '#7AA7FF',
    background: '#E1F3FE',
  },
  {
    id: 'color_coral_pink',
    name: 'Coral Pink',
    category: 'pure_color',
    color: '#F47C96',
    background: '#FDF2F5',
  },
  {
    id: 'color_jade_teal',
    name: 'Jade Teal',
    category: 'pure_color',
    color: '#47B5A4',
    background: '#EEF8F6',
  },
  {
    id: 'color_dark_slate',
    name: 'Dark Slate',
    category: 'pure_color',
    color: '#353744',
    background: '#1A1B22',
    isDark: true,
  },
  {
    id: 'color_terracotta',
    name: 'Terracotta',
    category: 'pure_color',
    color: '#DE625E',
    background: '#FDF3F2',
    isPro: true,
  },
  {
    id: 'color_marigold',
    name: 'Marigold',
    category: 'pure_color',
    color: '#FFC539',
    background: '#FFFBF0',
    isPro: true,
  },
  {
    id: 'color_emerald',
    name: 'Emerald',
    category: 'pure_color',
    color: '#1EA273',
    background: '#EEF9F4',
    isPro: true,
  },
  {
    id: 'color_tangerine',
    name: 'Tangerine',
    category: 'pure_color',
    color: '#F4864B',
    background: '#FDF5F0',
    isPro: true,
  },
  {
    id: 'color_royal_purple',
    name: 'Royal Purple',
    category: 'pure_color',
    color: '#8F4BE8',
    background: '#F7F2FD',
    isPro: true,
  },
];

export const TEXTURE_THEMES: ThemeGalleryItem[] = [
  {
    id: 'texture_rice_paper',
    name: 'Rice Paper',
    category: 'texture',
    color: '#5B9DFF',
    dotColor: '#5B9DFF',
    background: '#F8F9FA',
    thumbnailAsset: require('../../../assets/themes/gallery/texture_1.png'),
    wallpaperAsset: require('../../../assets/themes/gallery/texture_paper_bg.png'),
    isPro: true,
  },
  {
    id: 'texture_kraft',
    name: 'Warm Parchment',
    category: 'texture',
    color: '#E05F5A',
    dotColor: '#E05F5A',
    background: '#F6F3EE',
    thumbnailAsset: require('../../../assets/themes/gallery/texture_2.png'),
    wallpaperAsset: require('../../../assets/themes/gallery/texture_paper_bg.png'),
    isPro: true,
  },
  {
    id: 'texture_lavender',
    name: 'Lavender Sheet',
    category: 'texture',
    color: '#8E4AE8',
    dotColor: '#8E4AE8',
    background: '#F5F2F9',
    thumbnailAsset: require('../../../assets/themes/gallery/texture_3.png'),
    wallpaperAsset: require('../../../assets/themes/gallery/texture_paper_bg.png'),
    isPro: true,
  },
  {
    id: 'texture_sage',
    name: 'Sage Linen',
    category: 'texture',
    color: '#1EA273',
    dotColor: '#1EA273',
    background: '#F2F6F3',
    thumbnailAsset: require('../../../assets/themes/gallery/texture_4.png'),
    wallpaperAsset: require('../../../assets/themes/gallery/texture_paper_bg.png'),
    isPro: true,
  },
];

export const SCENERY_THEMES: ThemeGalleryItem[] = [
  {
    id: 'scenery_lighthouse',
    name: 'Lighthouse Haven',
    category: 'scenery',
    color: '#0284C7',
    background: '#D9F2FC',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_lighthouse.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme10.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme10.jpeg'),
    isPro: true,
  },
  {
    id: 'scenery_family',
    name: 'Sunny Picnic',
    category: 'scenery',
    color: '#06B6D4',
    background: '#E2F8FA',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_family.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme9.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme9.jpeg'),
    isPro: true,
  },
  {
    id: 'scenery_night_road',
    name: 'Night Journey',
    category: 'scenery',
    color: '#38BDF8',
    background: '#16192E',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_night_road.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme8.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme8.jpeg'),
    isDark: true,
    isPro: true,
  },
  {
    id: 'scenery_cherry_blossom',
    name: 'Sakura River',
    category: 'scenery',
    color: '#F43F5E',
    background: '#FDF2F4',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_cherry_blossom.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme7.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme7.jpeg'),
    isPro: true,
  },
  {
    id: 'scenery_green_hill',
    name: 'Green Meadow',
    category: 'scenery',
    color: '#10B981',
    background: '#F0F9F4',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_green_hill.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme6.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme6.jpeg'),
    isPro: true,
  },
  {
    id: 'scenery_cyclist',
    name: 'Breeze Ride',
    category: 'scenery',
    color: '#0EA5E9',
    background: '#E0F5FE',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_cyclist_clean.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme5.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme5.jpeg'),
    isPro: true,
  },
  {
    id: 'scenery_eiffel',
    name: 'Parisian Twilight',
    category: 'scenery',
    color: '#818CF8',
    background: '#171B33',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_eiffel.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme4.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme4.jpeg'),
    isDark: true,
    isPro: true,
  },
  {
    id: 'scenery_mountain_camp',
    name: 'Twilight Campfire',
    category: 'scenery',
    color: '#A78BFA',
    background: '#1F1B36',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_mountain_camp.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme3.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme3.jpeg'),
    isDark: true,
    isPro: true,
  },
  {
    id: 'scenery_teddy',
    name: 'Warm Teddy',
    category: 'scenery',
    color: '#F472B6',
    background: '#FDF2F6',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_teddy.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme1.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme1.jpeg'),
    isPro: true,
  },
  {
    id: 'scenery_astronaut',
    name: 'Cosmic Journey',
    category: 'scenery',
    color: '#A3E635',
    background: '#121217',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_astronaut.png'),
    previewAsset: require('../../../assets/themes/gallery/Theme2.jpeg'),
    wallpaperAsset: require('../../../assets/themes/gallery/Theme2.jpeg'),
    isDark: true,
    isPro: true,
  },
  {
    id: 'scenery_sunflowers',
    name: 'Sunflower Bloom',
    category: 'scenery',
    color: '#EAB308',
    background: '#FDFBF0',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_sunflowers.png'),
    isPro: true,
  },
  {
    id: 'scenery_clouds',
    name: 'Skyward Dreams',
    category: 'scenery',
    color: '#38BDF8',
    background: '#E2F3FD',
    thumbnailAsset: require('../../../assets/themes/gallery/scenery_clouds.png'),
    isPro: true,
  },
];

export const ALL_GALLERY_THEMES: ThemeGalleryItem[] = [
  ...PURE_COLOR_THEMES,
  ...TEXTURE_THEMES,
  ...SCENERY_THEMES,
];

export const GALLERY_THEMES_MAP: Record<string, ThemeGalleryItem> = ALL_GALLERY_THEMES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, ThemeGalleryItem>,
);
