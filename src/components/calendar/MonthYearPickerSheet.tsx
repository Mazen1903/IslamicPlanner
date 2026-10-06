import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface MonthYearPickerSheetProps {
  visible: boolean;
  currentYear: number;
  currentMonth: number; // 1..12
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
  testID?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function MonthYearPickerSheet({
  visible,
  currentYear,
  currentMonth,
  onSelect,
  onClose,
  testID = 'month-year-picker-sheet',
}: MonthYearPickerSheetProps) {
  const { colors, typography, radii, spacing, shadows } = useTheme();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (visible) {
      setSelectedYear(currentYear);
    }
  }, [visible, currentYear]);

  if (!visible) {
    return null;
  }

  const realToday = DateTime.now();

  const handlePrevYear = () => {
    setSelectedYear(y => Math.max(1970, y - 1));
  };

  const handleNextYear = () => {
    setSelectedYear(y => Math.min(2100, y + 1));
  };

  const handleSelectMonth = (monthNumber: number) => {
    onSelect(selectedYear, monthNumber);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      {/* Explicit backdrop pressable without dim/shadow overlay (transparent per requirement) */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        testID="month-year-picker-backdrop"
        accessibilityRole="button"
        accessibilityLabel="Close month and year picker"
      />

      <View style={styles.sheetContainer} pointerEvents="box-none">
        <View
          accessibilityViewIsModal={true}
          style={[
            styles.sheetContent,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              padding: spacing.lg,
            },
          ]}
          testID="month-year-picker-content"
        >
          {/* Header with Title and Close Button */}
          <View style={styles.headerRow}>
            <Text
              accessibilityRole="header"
              style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}
            >
              Select Month & Year
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                  borderRadius: radii.pill,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close picker"
              testID="month-year-picker-close"
            >
              <Icon name="close" size="sm" color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Year Stepper */}
          <View
            style={[
              styles.yearStepper,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.lg,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                marginVertical: spacing.md,
              },
            ]}
          >
            <Pressable
              onPress={handlePrevYear}
              style={({ pressed }) => [
                styles.stepperButton,
                {
                  backgroundColor: pressed ? colors.primaryLight : 'transparent',
                  borderRadius: radii.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Previous year ${selectedYear - 1}`}
              testID="picker-prev-year"
            >
              <Icon name="chevron-left" size="sm" color={colors.primary} />
            </Pressable>

            <Text
              style={[
                typography.headlineMedium,
                { color: colors.textPrimary, fontWeight: '700' },
              ]}
              testID="picker-current-year"
            >
              {selectedYear}
            </Text>

            <Pressable
              onPress={handleNextYear}
              style={({ pressed }) => [
                styles.stepperButton,
                {
                  backgroundColor: pressed ? colors.primaryLight : 'transparent',
                  borderRadius: radii.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Next year ${selectedYear + 1}`}
              testID="picker-next-year"
            >
              <Icon name="chevron-right" size="sm" color={colors.primary} />
            </Pressable>
          </View>

          {/* 12-Month Grid (4 rows x 3 columns) */}
          <View style={styles.monthsGrid}>
            {MONTH_SHORT.map((monthStr, index) => {
              const monthNum = index + 1;
              const isSelected = selectedYear === currentYear && monthNum === currentMonth;
              const isRealCurrent =
                selectedYear === realToday.year && monthNum === realToday.month;

              return (
                <Pressable
                  key={monthStr}
                  onPress={() => handleSelectMonth(monthNum)}
                  style={({ pressed }) => [
                    styles.monthCell,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : pressed
                        ? colors.surfaceSecondary
                        : 'transparent',
                      borderColor: isSelected
                        ? colors.primary
                        : isRealCurrent
                        ? colors.border
                        : 'transparent',
                      borderWidth: isSelected ? 1.5 : isRealCurrent ? 1 : 0,
                      borderRadius: radii.md,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTH_NAMES[index]} ${selectedYear}`}
                  accessibilityState={{ selected: isSelected }}
                  testID={`picker-month-${monthNum}`}
                >
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: isSelected
                          ? colors.primary
                          : isRealCurrent
                          ? colors.textPrimary
                          : colors.textSecondary,
                        fontWeight: isSelected || isRealCurrent ? '700' : '500',
                      },
                    ]}
                  >
                    {monthStr}
                  </Text>
                  {isRealCurrent && !isSelected && (
                    <View
                      style={[
                        styles.currentDot,
                        { backgroundColor: colors.primary, borderRadius: radii.pill },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheetContent: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '31%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  currentDot: {
    width: 4,
    height: 4,
    position: 'absolute',
    bottom: 6,
  },
});
