/**
 * Android Medium Widget Component - Islamic Planner (M18)
 *
 * Displays:
 *   - App header "Islamic Planner"
 *   - Current prayer + start time
 *   - Next prayer: "Prayer at HH:MM AM/PM" (static time, no JS countdown)
 *   - Up to 3 pending tasks (title + schedule label)
 *   - SETUP_REQUIRED: calm setup prompt
 *
 * Architecture notes:
 *   - Uses React Native StyleSheet (no @expo/ui - Android only)
 *   - NO JS countdown timer
 *   - Light theme for M18; dark variant deferred to M21
 *   - Tap handled via WIDGET_CLICK event in widgetTaskHandler (deep link)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetSnapshot, WidgetTaskEntry } from '../../src/services/widget/types';

// Design tokens - must be literal values (no @/theme import in widget bundle)
const COLORS = {
  background: '#FFFFFF',
  brandGreen: '#2ECC71',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  separator: '#E5E7EB',
  importantAccent: '#F59E0B',
};

type MediumWidgetProps = WidgetSnapshot;

function TaskRow({ task }: { task: WidgetTaskEntry }) {
  return (
    <View style={taskStyles.row}>
      <View
        style={[
          taskStyles.dot,
          { backgroundColor: task.priority === 'IMPORTANT' ? COLORS.importantAccent : COLORS.brandGreen },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text style={taskStyles.title} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={taskStyles.label} numberOfLines={1}>
          {task.scheduleLabel}
        </Text>
      </View>
    </View>
  );
}

const taskStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 12,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
});

export function MediumWidgetComponent(props: MediumWidgetProps) {
  if (props.isSetupRequired) {
    return (
      <View style={styles.setupContainer}>
        <Text style={styles.appTitle}>Islamic Planner</Text>
        <Text style={styles.setupText}>Open app to finish setup.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Left column: prayer */}
      <View style={styles.prayerColumn}>
        <Text style={styles.appTitle}>Islamic Planner</Text>

        <Text style={styles.arabicName}>{props.currentPrayer.arabicName}</Text>
        <Text style={styles.prayerName}>{props.currentPrayer.name}</Text>
        <Text style={styles.prayerTime}>{props.currentPrayer.startsAtLocal}</Text>

        {props.nextPrayer && (
          <View style={styles.nextContainer}>
            <Text style={styles.nextLabel}>Next</Text>
            <Text style={styles.nextPrayerName}>{props.nextPrayer.name}</Text>
            <Text style={styles.nextPrayerTime}>{props.nextPrayer.startsAtLocal}</Text>
          </View>
        )}
      </View>

      {/* Separator */}
      <View style={styles.verticalSeparator} />

      {/* Right column: tasks */}
      <View style={styles.tasksColumn}>
        <Text style={styles.tasksHeader}>Tasks</Text>

        {props.tasks.length === 0 ? (
          <Text style={styles.noTasks}>No pending tasks</Text>
        ) : (
          props.tasks.map(task => <TaskRow key={task.occurrenceId} task={task} />)
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    flexDirection: 'row',
  },
  setupContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerColumn: {
    flex: 1,
    marginRight: 10,
  },
  tasksColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  verticalSeparator: {
    width: 1,
    backgroundColor: COLORS.separator,
  },
  appTitle: {
    color: COLORS.brandGreen,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  arabicName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  prayerName: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  prayerTime: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  nextContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.separator,
    paddingTop: 6,
  },
  nextLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  nextPrayerName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  nextPrayerTime: {
    color: COLORS.brandGreen,
    fontSize: 12,
    fontWeight: '600',
  },
  tasksHeader: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 4,
  },
  noTasks: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  setupText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
