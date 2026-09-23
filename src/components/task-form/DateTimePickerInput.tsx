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

  const isToday = dt.hasSame(DateTime.now(), 'day');
  const formattedDate = isToday
    ? `Today, ${dt.toFormat('MMM d, yyyy')}`
    : dt.toFormat('EEE, MMM d, yyyy');

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
            borderRadius: radii.card,
            minHeight: touchTargets.min,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.iconBox, { marginEnd: spacing.sm }]}>
          <Icon name="calendar" size={24} color={colors.textSecondary} dotColor={colors.primary} decorative />
        </View>
        <View style={styles.textColumn}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '500', marginTop: 2 }]}>
            {formattedDate}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.primary} directional decorative />
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
      <Pressable
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formattedTime}`}
        accessibilityHint="Opens time picker to select a time"
        testID={testID}
        style={({ pressed }) => [
          styles.triggerButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            minHeight: touchTargets.min,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.iconBox, { marginEnd: spacing.sm }]}>
          <Icon name="clock" size={24} color={colors.textSecondary} decorative />
        </View>
        <View style={styles.textColumn}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '500', marginTop: 2 }]}>
            {formattedTime}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.primary} directional decorative />
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
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
});
