import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export interface CollapsibleProps {
  expanded: boolean;
  children: React.ReactNode;
  duration?: number;
  unmountOnCollapse?: boolean;
  transitionKey?: any;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Height-animated collapsible.
 *
 * Content is rendered inside an absolutely positioned child so it always lays out at its
 * natural height (independent of the animated wrapper height). The wrapper's explicit
 * `height` is driven by `measuredHeight * progress`, which avoids any dependence on
 * maxHeight clamping or first-frame measurement.
 */
export function Collapsible({
  expanded,
  children,
  duration = 260,
  unmountOnCollapse = true,
  transitionKey,
  style,
  testID,
}: CollapsibleProps) {
  const [isRendered, setIsRendered] = useState(expanded);
  const progress = useSharedValue(expanded ? 1 : 0);
  const measuredHeight = useSharedValue(0);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (expanded) {
      setIsRendered(true);
      progress.value = withTiming(1, {
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      progress.value = withTiming(
        0,
        {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        finished => {
          if (finished && unmountOnCollapse) {
            runOnJS(setIsRendered)(false);
          }
        }
      );
    }
  }, [expanded, duration, unmountOnCollapse, progress, transitionKey]);

  const innerAnimatedStyle = useAnimatedStyle(() => {
    const isAnimating = progress.value > 0 && progress.value < 1;
    return {
      position: isAnimating ? 'absolute' : 'relative',
      top: 0,
      start: 0,
      end: 0,
      width: '100%',
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    if (progress.value === 0) {
      return {
        opacity: 0,
        height: 0,
      };
    }
    if (progress.value >= 1) {
      return {
        opacity: 1,
        height: undefined,
      };
    }
    return {
      opacity: progress.value,
      height: measuredHeight.value * progress.value,
    };
  });

  if (unmountOnCollapse && !expanded && !isRendered) {
    return null;
  }

  return (
    <Animated.View
      style={[{ width: '100%', overflow: 'hidden' }, animatedStyle, style]}
      testID={testID}
    >
      <Animated.View
        style={innerAnimatedStyle}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - measuredHeight.value) > 0.5) {
            measuredHeight.value = h;
          }
        }}
        collapsable={false}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
