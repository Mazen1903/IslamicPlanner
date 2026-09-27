import React from 'react';
import { View, Easing } from 'react-native';
import { Stack } from 'expo-router/js-stack';
import { useTheme } from '@/theme';

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
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
          cardStyleInterpolator: ({ current, next, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  // True push: settings list slides LEFT at full width,
                  // sub-screen slides in from RIGHT at the same speed.
                  translateX: next
                    ? next.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -layouts.screen.width],
                      })
                    : current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                },
              ],
            },
          }),
          gestureEnabled: false,
        }}
      />
    </View>
  );
}

