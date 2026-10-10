import React from 'react';
import { View, Text, Image, ScrollView, Easing as RNEasing } from 'react-native';

export type SharedValue<T> = {
  value: T;
};

export function useSharedValue<T>(init: T): SharedValue<T> {
  const ref = React.useRef<SharedValue<T>>({ value: init });
  return ref.current;
}

export function useAnimatedStyle<T extends Record<string, any>>(updater: () => T): T {
  try {
    return updater();
  } catch {
    return {} as T;
  }
}

export function withSpring(toValue: number, _config?: any, callback?: (finished: boolean) => void) {
  callback?.(true);
  return toValue;
}

export function withTiming(toValue: number, _config?: any, callback?: (finished: boolean) => void) {
  callback?.(true);
  return toValue;
}

export function withRepeat(animation: any, _numberOfReps?: number, _reverse?: boolean, callback?: (finished: boolean) => void) {
  callback?.(true);
  return animation;
}

export function withSequence(...animations: any[]) {
  return animations[animations.length - 1];
}

export function withDelay(_delayMs: number, animation: any) {
  return animation;
}

export function interpolate(
  value: number,
  inputRange: number[],
  outputRange: number[],
  _extrapolate?: any
): number {
  if (inputRange.length === 0 || outputRange.length === 0) return 0;
  if (value <= inputRange[0]) return outputRange[0];
  if (value >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];

  for (let i = 1; i < inputRange.length; i++) {
    if (value <= inputRange[i]) {
      const inMin = inputRange[i - 1];
      const inMax = inputRange[i];
      const outMin = outputRange[i - 1];
      const outMax = outputRange[i];
      const ratio = (value - inMin) / (inMax - inMin);
      return outMin + ratio * (outMax - outMin);
    }
  }
  return outputRange[outputRange.length - 1];
}

export function interpolateColor(
  _value: number,
  _inputRange: number[],
  outputRange: string[]
): string {
  return outputRange[0] ?? '#ffffff';
}

export const Extrapolation = {
  CLAMP: 'clamp',
  EXTEND: 'extend',
  IDENTITY: 'identity',
};

export const Easing = RNEasing;

export function runOnJS<T extends (...args: any[]) => any>(fn: T) {
  return fn;
}

export const LinearTransition = {
  duration: (_d?: number) => ({
    duration: () => LinearTransition,
    easing: () => LinearTransition,
    springify: () => LinearTransition,
    damping: () => LinearTransition,
  }),
  springify: () => ({
    damping: () => LinearTransition,
  }),
};

export const FadeIn = {
  duration: (_d?: number) => FadeIn,
  delay: (_d?: number) => FadeIn,
  easing: () => FadeIn,
};

export const FadeOut = {
  duration: (_d?: number) => FadeOut,
  delay: (_d?: number) => FadeOut,
  easing: () => FadeOut,
};

const AnimatedView = React.forwardRef(function AnimatedView(props: any, ref: any) {
  return React.createElement(View, { ref, ...props });
});
AnimatedView.displayName = 'AnimatedReanimated.View';

const AnimatedText = React.forwardRef(function AnimatedText(props: any, ref: any) {
  return React.createElement(Text, { ref, ...props });
});
AnimatedText.displayName = 'AnimatedReanimated.Text';

const AnimatedImage = React.forwardRef(function AnimatedImage(props: any, ref: any) {
  return React.createElement(Image, { ref, ...props });
});
AnimatedImage.displayName = 'AnimatedReanimated.Image';

const AnimatedScrollView = React.forwardRef(function AnimatedScrollView(props: any, ref: any) {
  return React.createElement(ScrollView, { ref, ...props });
});
AnimatedScrollView.displayName = 'AnimatedReanimated.ScrollView';

export function createAnimatedComponent(comp: any) {
  return comp;
}

const AnimatedReanimated = {
  View: AnimatedView,
  Text: AnimatedText,
  Image: AnimatedImage,
  ScrollView: AnimatedScrollView,
  createAnimatedComponent,
};

export default AnimatedReanimated;
