import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

interface DatePickerInputProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function DatePickerInput({
  value,
  onChange,
  label = 'Date',
  disabled = false,
  style,
  testID = 'date-picker-input',
}: DatePickerInputProps) {
  const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Parse YYYY-MM-DD safely into Date object for picker
  const dt = DateTime.fromISO(value).isValid
    ? DateTime.fromISO(value)
    : DateTime.now();
  const dateObj = dt.toJSDate();

  const formattedDate = dt.toFormat('EEE, MMM d, yyyy');

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const isoStr = DateTime.fromJSDate(selectedDate).toFormat('yyyy-MM-dd');
      onChange(isoStr);
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formattedDate}`}
        accessibilityHint="Opens date picker to select a date"
        testID={testID}
        style={({ pressed }) => [
          styles.triggerButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            minHeight: touchTargets.min,
            paddingHorizontal: spacing.md,
            opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Icon name="calendar" size={18} color={colors.primary} style={{ marginEnd: spacing.sm }} decorative />
        <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
          {formattedDate}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textTertiary} decorative />
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          themeVariant={isDark ? 'dark' : 'light'}
          testID={`${testID}-picker`}
        />
      )}
    </View>
  );
}

interface TimePickerInputProps {
  value: string; // HH:mm (24h)
  onChange: (timeStr: string) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function TimePickerInput({
  value,
  onChange,
  label = 'Time',
  disabled = false,
  style,
  testID = 'time-picker-input',
}: TimePickerInputProps) {
  const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Parse HH:mm safely
  const timeDt = DateTime.fromFormat(value || '12:00', 'HH:mm').isValid
    ? DateTime.fromFormat(value || '12:00', 'HH:mm')
    : DateTime.fromFormat('12:00', 'HH:mm');
  const dateObj = timeDt.toJSDate();

  const formattedTime = timeDt.toFormat('h:mm a');

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const timeStr = DateTime.fromJSDate(selectedDate).toFormat('HH:mm');
      onChange(timeStr);
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formattedTime}`}
        accessibilityHint="Opens time picker to select time"
        testID={testID}
        style={({ pressed }) => [
          styles.triggerButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            minHeight: touchTargets.min,
            paddingHorizontal: spacing.md,
            opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Icon name="clock" size={18} color={colors.primary} style={{ marginEnd: spacing.sm }} decorative />
        <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
          {formattedTime}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textTertiary} decorative />
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={dateObj}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          themeVariant={isDark ? 'dark' : 'light'}
          testID={`${testID}-picker`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
