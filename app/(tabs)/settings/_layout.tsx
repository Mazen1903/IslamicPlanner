import React from 'react';
import { View, Easing } from 'react-native';
import { Stack } from 'expo-router/js-stack';
import { useTheme } from '@/theme';

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background },
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 420,
                easing: Easing.inOut(Easing.ease),
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 380,
                easing: Easing.inOut(Easing.ease),
              },
            },
          },
          cardStyleInterpolator: ({ current, next, layouts, index }) => {
            const width = layouts?.screen?.width || 390;
            const isRoot = index == null || index === 0;

            // Root screen (index === 0) should remain stable at 0 and not slide in from the right.
            // Sub-screens (index > 0) slide in from the right at full width.
            const translateFocused = isRoot
              ? 0
              : current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [width, 0],
                  extrapolate: 'clamp',
                });

            // True push: when another screen is pushed on top, slide left at full width.
            const translateUnfocused = next
              ? next.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -width],
                  extrapolate: 'clamp',
                })
              : 0;

            return {
              cardStyle: {
                transform: [
                  { translateX: translateFocused },
                  { translateX: translateUnfocused },
                ],
              },
            };
          },
          gestureEnabled: false,
        }}
      />
    </View>
  );
}

