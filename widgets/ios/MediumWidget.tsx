'widget';
/**
 * iOS Medium Widget - Islamic Planner (M18)
 *
 * Displays:
 *   - App header "Islamic Planner" + planning day key
 *   - Current prayer name and start time (left column)
 *   - Next prayer name, start time, and native timer (left column)
 *   - Next 3 pending tasks: title + schedule label (right column)
 *   - SETUP_REQUIRED: calm setup prompt
 *
 * Architecture constraints (enforced by expo-widgets 'widget' directive):
 *   - NO React hooks inside this component
 *   - NO async/await inside this component function body
 *   - NO imports from main app bundle (Zustand, @/theme, etc.)
 *   - All data arrives via props (WidgetSnapshot)
 *   - Uses ONLY native SwiftUI primitives via @expo/ui/swift-ui
 */

import React from 'react';
import { createWidget } from 'expo-widgets';
import { VStack, HStack, Text, Spacer, Divider } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, frame, lineLimit } from '@expo/ui/swift-ui/modifiers';
import type { WidgetSnapshot, WidgetTaskEntry } from '../../src/services/widget/types';

// Design tokens (literal values - cannot import from @/theme in widget bundle)
const COLORS = {
  background: '#1A1A2E',
  brandGreen: '#2ECC71',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  importantAccent: '#F59E0B',
  separator: '#374151',
};

type MediumWidgetProps = WidgetSnapshot;

function TaskRow({ task }: { task: WidgetTaskEntry }) {
  const dotColor =
    task.priority === 'IMPORTANT' ? COLORS.importantAccent : COLORS.brandGreen;

  return (
    <HStack alignment="center" spacing={6}>
      <Text modifiers={[font({ size: 9, weight: 'bold' }), foregroundStyle(dotColor)]}>
        •
      </Text>
      <VStack alignment="leading" spacing={1}>
        <Text
          modifiers={[
            font({ size: 12, weight: 'medium' }),
            foregroundStyle(COLORS.text),
            lineLimit(1),
          ]}
        >
          {task.title}
        </Text>
        <Text
          modifiers={[
            font({ size: 10, weight: 'regular' }),
            foregroundStyle(COLORS.textMuted),
            lineLimit(1),
          ]}
        >
          {task.scheduleLabel}
        </Text>
      </VStack>
    </HStack>
  );
}

export function MediumWidgetLayout(props: MediumWidgetProps) {
  if (props.isSetupRequired) {
    return (
      <VStack
        alignment="center"
        spacing={8}
        modifiers={[padding({ all: 16 }), frame({ maxWidth: 360, maxHeight: 170 })]}
      >
        <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(COLORS.text)]}>
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
      spacing={6}
      modifiers={[padding({ all: 12 }), frame({ maxWidth: 360, maxHeight: 170 })]}
    >
      {/* Header */}
      <HStack alignment="center">
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(COLORS.brandGreen)]}>
          Islamic Planner
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'regular' }), foregroundStyle(COLORS.textMuted)]}>
          {props.planningDayKey}
        </Text>
      </HStack>

      <HStack alignment="top" spacing={12}>
        {/* Left column: Prayer times */}
        <VStack alignment="leading" spacing={3} modifiers={[frame({ minWidth: 120 })]}>
          <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(COLORS.text)]}>
            {props.currentPrayer.arabicName}
          </Text>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(COLORS.text)]}>
            {props.currentPrayer.name} · {props.currentPrayer.startsAtLocal}
          </Text>

          <Spacer minLength={4} />

          {props.nextPrayer ? (
            <VStack alignment="leading" spacing={1}>
              <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(COLORS.textMuted)]}>
                Next: {props.nextPrayer.name} · {props.nextPrayer.startsAtLocal}
              </Text>
              <HStack alignment="center" spacing={4}>
                <Text modifiers={[font({ size: 10, weight: 'regular' }), foregroundStyle(COLORS.brandGreen)]}>
                  in
                </Text>
                <Text
                  date={new Date(props.nextPrayer.startsAt)}
                  dateStyle="timer"
                  modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(COLORS.brandGreen)]}
                />
              </HStack>
            </VStack>
          ) : (
            <Text modifiers={[font({ size: 11, weight: 'regular' }), foregroundStyle(COLORS.textMuted)]}>
              Last prayer of day
            </Text>
          )}
        </VStack>

        <Divider />

        {/* Right column: Upcoming tasks */}
        <VStack alignment="leading" spacing={4} modifiers={[frame({ minWidth: 160 })]}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(COLORS.textMuted)]}>
            Tasks ({props.tasks.length})
          </Text>
          {props.tasks.length > 0 ? (
            props.tasks.slice(0, 3).map((task: WidgetTaskEntry) => (
              <TaskRow key={task.occurrenceId} task={task} />
            ))
          ) : (
            <Text modifiers={[font({ size: 11, weight: 'regular' }), foregroundStyle(COLORS.textMuted)]}>
              No tasks scheduled
            </Text>
          )}
        </VStack>
      </HStack>
    </VStack>
  );
}

export default createWidget<WidgetSnapshot>('IslamicPlannerMedium', MediumWidgetLayout);
