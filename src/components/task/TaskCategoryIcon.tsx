import React from 'react';
import { View, StyleSheet, Image, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TASK_ICON_MAP } from '@/constants/taskIcons';
import { useTheme } from '@/theme';

export interface TaskCategoryIconProps {
  iconId?: string | null;
  size?: number;
  color?: string;
  backgroundColor?: string;
  containerSize?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function TaskCategoryIcon({
  iconId,
  size = 18,
  color,
  backgroundColor,
  containerSize,
  style,
  testID,
}: TaskCategoryIconProps) {
  const { colors } = useTheme();

  const iconDef = iconId ? TASK_ICON_MAP[iconId] : null;
  const effectiveColor = color ?? colors.primary;

  // Custom illustrated squircle image asset
  if (iconDef?.imageAsset) {
    const boxSize = containerSize ?? (backgroundColor ? size + 14 : size);
    return (
      <Image
        source={iconDef.imageAsset}
        style={[
          {
            width: boxSize,
            height: boxSize,
          },
          style as StyleProp<ImageStyle>,
        ]}
        resizeMode="contain"
        testID={testID}
      />
    );
  }

  const family = iconDef?.family ?? 'Ionicons';
  const iconName = iconDef?.iconName ?? 'checkmark-circle-outline';

  const renderIcon = () => {
    if (family === 'MaterialCommunityIcons') {
      return (
        <MaterialCommunityIcons
          name={iconName as any}
          size={size}
          color={effectiveColor}
          testID={testID ? `${testID}-mci` : undefined}
        />
      );
    }

    return (
      <Ionicons
        name={iconName as any}
        size={size}
        color={effectiveColor}
        testID={testID ? `${testID}-ion` : undefined}
      />
    );
  };

  if (backgroundColor || containerSize) {
    const boxSize = containerSize ?? size + 14;
    return (
      <View
        style={[
          styles.container,
          {
            width: boxSize,
            height: boxSize,
            borderRadius: boxSize / 2,
            backgroundColor: backgroundColor ?? colors.primaryLight,
          },
          style,
        ]}
        testID={testID}
      >
        {renderIcon()}
      </View>
    );
  }

  if (style) {
    return (
      <View style={style} testID={testID}>
        {renderIcon()}
      </View>
    );
  }

  return renderIcon();
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
