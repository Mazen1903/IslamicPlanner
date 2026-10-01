import React, { useRef } from 'react';
import {
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Vibration,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface TactileActionButtonProps {
  title: string;
  iconName: IconName;
  onPress: () => void;
  variant: 'danger' | 'success';
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function TactileActionButton({
  title,
  iconName,
  onPress,
  variant,
  testID,
  accessibilityLabel,
  style,
  disabled = false,
}: TactileActionButtonProps) {
  const { typography, isDark } = useTheme();
  const pressAnim = useRef(new Animated.Value(0)).current;

  // Tactile 3D button palette with bottom shadow bevel lips
  const colorsConfig = variant === 'danger'
    ? {
        face: isDark ? '#EF4444' : '#EF4444',
        lip: isDark ? '#991B1B' : '#B91C1C',
        text: '#FFFFFF',
        icon: '#FFFFFF',
      }
    : {
        face: isDark ? '#16A34A' : '#16A34A',
        lip: isDark ? '#14532D' : '#15803D',
        text: '#FFFFFF',
        icon: '#FFFFFF',
      };

  const handlePressIn = () => {
    if (disabled) return;
    try {
      Vibration.vibrate(15);
    } catch {}
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(pressAnim, {
      toValue: 0,
      damping: 14,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2.5],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      testID={testID}
      style={[styles.pressableContainer, style]}
    >
      <Animated.View
        style={[
          styles.buttonSurface,
          {
            backgroundColor: colorsConfig.face,
            borderBottomColor: colorsConfig.lip,
            borderBottomWidth: 4,
            opacity: disabled ? 0.6 : 1,
            transform: [{ translateY }],
          },
        ]}
      >
        <Icon
          name={iconName}
          size={19}
          color={colorsConfig.icon}
          decorative
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            typography.labelLarge,
            styles.buttonLabel,
            { color: colorsConfig.text },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableContainer: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
  },
  buttonSurface: {
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 15,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
