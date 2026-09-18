'widget';
/**
 * iOS Small Widget - Islamic Planner (M18)
 *
 * Displays:
 *   - App header "Islamic Planner"
 *   - Current prayer name and start time
 *   - Next prayer name and start time
 *   - Native live countdown timer to next prayer via @expo/ui/swift-ui Text
 *   - SETUP_REQUIRED: calm setup prompt
 *
 * Architecture constraints (enforced by expo-widgets 'widget' directive):
 *   - NO React hooks inside this component
 *   - NO async/await inside this component function body
 *   - NO imports from main app bundle (Zustand, @/theme, etc.)
 *   - All data arrives via props (WidgetSnapshot)
 *   - Uses ONLY native SwiftUI primitives via @expo/ui/swift-ui
 *   - Native Date/timer rendering with @expo/ui/swift-ui Text (no JavaScript timers)
 */

import React from 'react';
import { createWidget } from 'expo-widgets';
import { VStack, HStack, Text, Spacer } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, frame } from '@expo/ui/swift-ui/modifiers';
import type { WidgetSnapshot } from '../../src/services/widget/types';

// Design tokens (literal values - cannot import from @/theme in widget bundle)
const COLORS = {
  background: '#1A1A2E',
  brandGreen: '#2ECC71',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  separator: '#374151',
};

type SmallWidgetProps = WidgetSnapshot;

export function SmallWidgetLayout(props: SmallWidgetProps) {
  if (props.isSetupRequired) {
    return (
      <VStack
        alignment="center"
        spacing={8}
        modifiers={[padding({ all: 16 }), frame({ maxWidth: 170, maxHeight: 170 })]}
      >
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(COLORS.text)]}>
          Islamic Planner
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'regular' }), foregroundStyle(COLORS.textMuted)]}>
          Open app to finish setup.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[padding({ all: 12 }), frame({ maxWidth: 170, maxHeight: 170 })]}
    >
      {/* Header */}
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(COLORS.brandGreen)]}>
        Islamic Planner
      </Text>

      <Spacer minLength={2} />

      {/* Current prayer */}
      <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(COLORS.text)]}>
        {props.currentPrayer.arabicName}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(COLORS.text)]}>
        {props.currentPrayer.name} · {props.currentPrayer.startsAtLocal}
      </Text>

      <Spacer minLength={4} />

      {/* Next prayer with native WidgetKit countdown timer */}
      {props.nextPrayer ? (
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(COLORS.textMuted)]}>
            Next: {props.nextPrayer.name} · {props.nextPrayer.startsAtLocal}
          </Text>
          <HStack alignment="center" spacing={4}>
            <Text modifiers={[font({ size: 11, weight: 'regular' }), foregroundStyle(COLORS.brandGreen)]}>
              in
            </Text>
            <Text
              date={new Date(props.nextPrayer.startsAt)}
              dateStyle="timer"
              modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(COLORS.brandGreen)]}
            />
          </HStack>
        </VStack>
      ) : (
        <Text modifiers={[font({ size: 11, weight: 'regular' }), foregroundStyle(COLORS.textMuted)]}>
          {props.currentPrayer.name} · Last prayer
        </Text>
      )}
    </VStack>
  );
}

export default createWidget<WidgetSnapshot>('IslamicPlannerSmall', SmallWidgetLayout);
