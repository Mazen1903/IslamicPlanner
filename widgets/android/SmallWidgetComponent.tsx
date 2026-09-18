/**
 * Android Small Widget Component - Islamic Planner (M18)
 *
 * Displays:
 *   - App header "Islamic Planner"
 *   - Current prayer name + start time
 *   - Next prayer: "Prayer at HH:MM AM/PM"
 *   - SETUP_REQUIRED: calm setup prompt
 *
 * Architecture notes:
 *   - Uses React Native StyleSheet (no @expo/ui - Android only)
 *   - NO JS countdown timer (display static local time from snapshot)
 *   - Light theme for M18; dark variant deferred to M21
 *   - Tap handled via WIDGET_CLICK event in widgetTaskHandler (deep link)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetSnapshot } from '../../src/services/widget/types';

// Design tokens - must be literal values (no @/theme import in widget bundle)
const COLORS = {
  background: '#FFFFFF',
  brandGreen: '#2ECC71',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  separator: '#E5E7EB',
};

type SmallWidgetProps = WidgetSnapshot;

export function SmallWidgetComponent(props: SmallWidgetProps) {
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
      {/* Header */}
      <Text style={styles.appTitle}>Islamic Planner</Text>

      {/* Current prayer */}
      <Text style={styles.arabicName}>{props.currentPrayer.arabicName}</Text>
      <Text style={styles.prayerName}>{props.currentPrayer.name}</Text>
      <Text style={styles.prayerTime}>{props.currentPrayer.startsAtLocal}</Text>

      {/* Next prayer: static local time (no JS countdown on Android M18) */}
      {props.nextPrayer && (
        <View style={styles.nextContainer}>
          <Text style={styles.nextLabel}>
            {'Next: '}
            <Text style={styles.nextTime}>
              {props.nextPrayer.name} at {props.nextPrayer.startsAtLocal}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 10,
  },
  setupContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    color: COLORS.brandGreen,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  arabicName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  prayerName: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  prayerTime: {
    color: COLORS.text,
    fontSize: 14,
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
    fontSize: 11,
  },
  nextTime: {
    color: COLORS.text,
    fontWeight: '500',
  },
  setupText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
