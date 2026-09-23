import React from 'react';
import { I18nManager, type StyleProp, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme, type IconSizeKey } from '@/theme';
import {
  ExactTimeClockIcon,
  PrayerCalendarIcon,
  AnytimeSunIcon,
  RepeatCycleIcon,
  MoreOptionsSlidersIcon,
  TaskPencilIcon,
  TaskMosqueIcon,
  MoreOptionsCogIcon,
  ReminderBellIcon,
  PriorityFlagIcon,
  DurationClockIcon,
  NotesDocumentIcon,
  SubtasksChecklistIcon,
  AttachmentClipIcon,
  TagsTagIcon,
  PrivateEyeIcon,
  HabitRepeatIcon,
} from './icons/TaskIcons';

export * from './icons/TaskIcons';

export type IconName =
  | 'calendar'
  | 'calendar-star'
  | 'clock'
  | 'check'
  | 'settings'
  | 'prayer'
  | 'mosque'
  | 'moon'
  | 'sun'
  | 'bell'
  | 'location'
  | 'search'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'plus'
  | 'minus'
  | 'close'
  | 'alert'
  | 'info'
  | 'trash'
  | 'user'
  | 'star'
  | 'journal'
  | 'lock'
  | 'home'
  | 'restaurant'
  | 'laptop'
  | 'book'
  | 'call'
  | 'barbell'
  | 'arrow-left'
  | 'edit'
  | 'pencil'
  | 'refresh'
  | 'circle'
  | 'chevron-up'
  | 'options'
  | 'flag'
  | 'document'
  | 'checkbox'
  | 'attach'
  | 'pricetag'
  | 'eye'
  | 'eye-off'
  | 'sync'
  | 'more'
  | 'dots-horizontal'
  | 'palette'
  | 'calculator'
  | 'crown'
  | 'bulb'
  | 'flash'
  | 'sliders'
  | 'map-pin'
  | 'bolt'
  | 'brush'
  | 'image'
  | 'monitor'
  | 'check-circle'
  | 'star-outline'
  | 'calendar-check'
  | 'format-font'
  | 'duration';

export interface IconProps {
  name: IconName;
  size?: number | IconSizeKey;
  color?: string;
  dotColor?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
  /** When true: suppresses icon from accessibility traversal (use inside labeled Pressables) */
  decorative?: boolean;
  /** When true: applies horizontal flip in RTL layouts to correct directional glyph orientation */
  directional?: boolean;
}

type ResolvedIconDef =
  | { lib: 'fa5'; name: string; solid?: boolean }
  | { lib: 'mci'; name: keyof typeof MaterialCommunityIcons.glyphMap }
  | { lib: 'ionicons'; name: keyof typeof Ionicons.glyphMap };

/**
 * Mapping from unified abstract icon names to underlying vector icon identifiers
 */
const ICON_DEF_MAP: Record<IconName, ResolvedIconDef> = {
  // Islamic & Header
  prayer: { lib: 'fa5', name: 'mosque', solid: true },
  mosque: { lib: 'fa5', name: 'mosque', solid: true },

  // Task form & Schedule
  calendar: { lib: 'mci', name: 'calendar-month-outline' },
  'calendar-star': { lib: 'mci', name: 'calendar-star-outline' },
  clock: { lib: 'ionicons', name: 'time-outline' },
  sun: { lib: 'mci', name: 'weather-sunny' },
  edit: { lib: 'mci', name: 'pencil-outline' },
  pencil: { lib: 'mci', name: 'pencil-outline' },
  refresh: { lib: 'mci', name: 'repeat' },
  options: { lib: 'mci', name: 'tune-variant' },
  settings: { lib: 'mci', name: 'cog' },

  // More options rows
  bell: { lib: 'mci', name: 'bell-outline' },
  flag: { lib: 'mci', name: 'flag-outline' },
  duration: { lib: 'ionicons', name: 'time-outline' },
  document: { lib: 'mci', name: 'file-document-outline' },
  checkbox: { lib: 'mci', name: 'format-list-checks' },
  attach: { lib: 'mci', name: 'paperclip' },
  pricetag: { lib: 'mci', name: 'tag-outline' },
  eye: { lib: 'mci', name: 'eye-outline' },
  'eye-off': { lib: 'mci', name: 'eye-off-outline' },
  sync: { lib: 'mci', name: 'repeat' },

  // Common UI & Navigation
  moon: { lib: 'ionicons', name: 'moon-outline' },
  check: { lib: 'ionicons', name: 'checkmark' },
  location: { lib: 'ionicons', name: 'location-outline' },
  search: { lib: 'ionicons', name: 'search-outline' },
  'chevron-right': { lib: 'ionicons', name: 'chevron-forward' },
  'chevron-left': { lib: 'ionicons', name: 'chevron-back' },
  'chevron-down': { lib: 'ionicons', name: 'chevron-down' },
  'chevron-up': { lib: 'ionicons', name: 'chevron-up' },
  plus: { lib: 'ionicons', name: 'add' },
  minus: { lib: 'ionicons', name: 'remove' },
  close: { lib: 'ionicons', name: 'close' },
  alert: { lib: 'ionicons', name: 'alert-circle-outline' },
  info: { lib: 'ionicons', name: 'information-circle-outline' },
  trash: { lib: 'ionicons', name: 'trash-outline' },
  user: { lib: 'ionicons', name: 'person-outline' },
  star: { lib: 'ionicons', name: 'star' },
  journal: { lib: 'ionicons', name: 'book-outline' },
  lock: { lib: 'ionicons', name: 'lock-closed-outline' },
  home: { lib: 'ionicons', name: 'home' },
  restaurant: { lib: 'ionicons', name: 'restaurant-outline' },
  laptop: { lib: 'ionicons', name: 'laptop-outline' },
  book: { lib: 'ionicons', name: 'book-outline' },
  call: { lib: 'ionicons', name: 'call' },
  barbell: { lib: 'ionicons', name: 'barbell-outline' },
  'arrow-left': { lib: 'ionicons', name: 'arrow-back' },
  circle: { lib: 'ionicons', name: 'ellipse-outline' },
  more: { lib: 'ionicons', name: 'ellipsis-horizontal' },
  'dots-horizontal': { lib: 'ionicons', name: 'ellipsis-horizontal' },
  palette: { lib: 'ionicons', name: 'color-palette-outline' },
  calculator: { lib: 'mci', name: 'calculator-variant-outline' },
  crown: { lib: 'fa5', name: 'crown', solid: true },
  bulb: { lib: 'ionicons', name: 'bulb-outline' },
  flash: { lib: 'ionicons', name: 'flash-outline' },
  sliders: { lib: 'mci', name: 'tune-variant' },
  'map-pin': { lib: 'mci', name: 'map-marker' },
  bolt: { lib: 'mci', name: 'lightning-bolt' },
  brush: { lib: 'ionicons', name: 'brush-outline' },
  image: { lib: 'mci', name: 'image-outline' },
  monitor: { lib: 'ionicons', name: 'desktop-outline' },
  'check-circle': { lib: 'ionicons', name: 'checkmark-circle' },
  'star-outline': { lib: 'ionicons', name: 'star-outline' },
  'calendar-check': { lib: 'mci', name: 'calendar-check-outline' },
  'format-font': { lib: 'mci', name: 'format-font' },
};

export function Icon({
  name,
  size = 'md',
  color,
  dotColor,
  style,
  accessibilityLabel,
  testID,
  decorative,
  directional,
}: IconProps) {
  const theme = useTheme();

  const resolvedSize = typeof size === 'number' ? size : theme.iconSizes[size];
  const resolvedColor = color ?? theme.colors.textPrimary;
  const def = ICON_DEF_MAP[name];

  const rtlStyle = directional && I18nManager.isRTL
    ? { transform: [{ scaleX: -1 }] }
    : undefined;

  const a11yProps = {
    testID,
    accessibilityLabel: decorative ? '' : (accessibilityLabel ?? name),
    accessibilityRole: (decorative ? 'none' : 'image') as any,
    importantForAccessibility: decorative ? ('no' as const) : undefined,
  };

  // Custom pixel-faithful icons matching design crops
  if (name === 'clock') {
    if (color === theme.colors.info) {
      return (
        <DurationClockIcon
          {...a11yProps}
          size={resolvedSize}
          style={[style as any, rtlStyle]}
        />
      );
    }
    return (
      <ExactTimeClockIcon
        {...a11yProps}
        size={resolvedSize}
        color={resolvedColor}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'calendar') {
    return (
      <PrayerCalendarIcon
        {...a11yProps}
        size={resolvedSize}
        color={resolvedColor}
        dotColor={dotColor ?? theme.colors.primary}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'sun') {
    return (
      <AnytimeSunIcon
        {...a11yProps}
        size={resolvedSize}
        color={resolvedColor}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'refresh') {
    return (
      <RepeatCycleIcon
        {...a11yProps}
        size={resolvedSize}
        color={resolvedColor}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'sync') {
    return (
      <HabitRepeatIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'options') {
    return (
      <MoreOptionsSlidersIcon
        {...a11yProps}
        size={resolvedSize}
        color={resolvedColor}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'settings') {
    return (
      <MoreOptionsCogIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'bell') {
    return (
      <ReminderBellIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'flag') {
    return (
      <PriorityFlagIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'duration') {
    return (
      <DurationClockIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'document') {
    return (
      <NotesDocumentIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'checkbox') {
    return (
      <SubtasksChecklistIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'attach') {
    return (
      <AttachmentClipIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'pricetag') {
    return (
      <TagsTagIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'eye') {
    return (
      <PrivateEyeIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (name === 'pencil' || name === 'edit') {
    return (
      <TaskPencilIcon
        {...a11yProps}
        size={resolvedSize}
        style={[style as any, rtlStyle]}
      />
    );
  }

  if (!def || def.lib === 'ionicons') {
    const ioniconName = (def?.name as keyof typeof Ionicons.glyphMap) ?? 'help-circle-outline';
    return (
      <Ionicons
        {...a11yProps}
        name={ioniconName}
        size={resolvedSize}
        color={resolvedColor}
        style={[style, rtlStyle]}
      />
    );
  }

  if (def.lib === 'mci') {
    return (
      <MaterialCommunityIcons
        {...a11yProps}
        name={def.name}
        size={resolvedSize}
        color={resolvedColor}
        style={[style, rtlStyle]}
      />
    );
  }

  if (def.lib === 'fa5') {
    return (
      <FontAwesome5
        {...a11yProps}
        name={def.name}
        solid={def.solid ?? true}
        size={resolvedSize}
        color={resolvedColor}
        style={[style, rtlStyle]}
      />
    );
  }

  return null;
}