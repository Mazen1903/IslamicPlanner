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

export function Collapsible({
  expanded,
  children,
  duration = 260,
  unmountOnCollapse = true,
  transitionKey,
  style,
  testID,
}: CollapsibleProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const [isRendered, setIsRendered] = useState(expanded);
  const progress = useSharedValue(expanded ? 1 : 0);
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

  const animatedStyle = useAnimatedStyle(() => {
    const isFullyExpanded = progress.value >= 1;
    let targetMaxHeight: number | undefined;

    if (isFullyExpanded) {
      targetMaxHeight = undefined;
    } else if (contentHeight > 0) {
      targetMaxHeight = contentHeight * progress.value;
    } else if (progress.value === 0) {
      targetMaxHeight = 0;
    } else {
      targetMaxHeight = undefined;
    }

    return {
      opacity: progress.value,
      maxHeight: targetMaxHeight,
      overflow: 'hidden',
    };
  });

  if (unmountOnCollapse && !expanded && !isRendered) {
    return null;
  }

  return (
    <Animated.View
      style={[animatedStyle, style]}
      testID={testID}
    >
      <View
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - contentHeight) > 1) {
            setContentHeight(h);
          }
        }}
        collapsable={false}
      >
        {children}
      </View>
    </Animated.View>
  );
}
