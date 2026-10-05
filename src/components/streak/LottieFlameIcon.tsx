import React, { useRef } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

const flameAnimation = require('../../assets/lottie/flame.json');

export interface LottieFlameIconProps {
  size?: number;
  offsetY?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * LottieFlameIcon – standalone fluid animated flame icon for streak UI.
 */
export function LottieFlameIcon({
  size = 36,
  offsetY = -3.5,
  style,
  testID = 'streak-flame-icon',
  accessibilityLabel = 'Streak flame',
}: LottieFlameIconProps) {
  const animRef = useRef<LottieView>(null);
  const lottieDimension = size * 1.8;

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <LottieView
        ref={animRef}
        source={flameAnimation}
        autoPlay
        loop
        renderMode="HARDWARE"
        style={{
          width: lottieDimension,
          height: lottieDimension,
          transform: [{ translateY: offsetY }],
        }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
