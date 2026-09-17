import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, type IconSizeKey } from '@/theme';

export type IconName =
  | 'calendar'
  | 'clock'
  | 'check'
  | 'settings'
  | 'prayer'
  | 'moon'
  | 'sun'
  | 'bell'
  | 'location'
  | 'search'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'plus'
  | 'close'
  | 'alert'
  | 'info'
  | 'trash'
  | 'user'
  | 'star';

export interface IconProps {
  name: IconName;
  size?: number | IconSizeKey;
  color?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Mapping from unified abstract icon names to underlying vector icon identifiers
 */
const ICON_MAP: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  calendar: 'calendar-outline',
  clock: 'time-outline',
  check: 'checkmark',
  settings: 'settings-outline',
  prayer: 'compass-outline',
  moon: 'moon-outline',
  sun: 'sunny-outline',
  bell: 'notifications-outline',
  location: 'location-outline',
  search: 'search-outline',
  'chevron-right': 'chevron-forward',
  'chevron-left': 'chevron-back',
  'chevron-down': 'chevron-down',
  plus: 'add',
  close: 'close',
  alert: 'alert-circle-outline',
  info: 'information-circle-outline',
  trash: 'trash-outline',
  user: 'person-outline',
  star: 'star',
};

export function Icon({
  name,
  size = 'md',
  color,
  style,
  accessibilityLabel,
  testID,
}: IconProps) {
  const theme = useTheme();

  const resolvedSize = typeof size === 'number' ? size : theme.iconSizes[size];
  const resolvedColor = color ?? theme.colors.textPrimary;
  const ioniconName = ICON_MAP[name] ?? 'help-circle-outline';

  return (
    <Ionicons
      testID={testID}
      name={ioniconName}
      size={resolvedSize}
      color={resolvedColor}
      style={style}
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityRole="image"
    />
  );
}