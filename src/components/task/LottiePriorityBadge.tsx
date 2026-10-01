import React, { useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const priorityAnimation = require('../../assets/lottie/priority.json');

export interface LottiePriorityBadgeProps {
  size?: number;
  testID?: string;
  accessibilityLabel?: string;
}

export function LottiePriorityBadge({
  size = 32,
  testID,
  accessibilityLabel = 'Important task',
}: LottiePriorityBadgeProps) {
  const animRef = useRef<LottieView>(null);

  return (
    <View
      testID={testID ?? 'priority-lottie-badge'}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <LottieView
        ref={animRef}
        source={priorityAnimation}
        autoPlay
        loop
        style={{
          width: size * 1.35,
          height: size * 1.35,
        }}
        resizeMode="contain"
      />
      {/* Hidden text for screen readers */}
      <Text style={styles.srOnly}>IMPORTANT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
});
