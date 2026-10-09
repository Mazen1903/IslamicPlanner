import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface DatePickerInputProps {
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
  const { colors, spacing, radii, typography, touchTargets } = useTheme();
  const [showCalendar, setShowCalendar] = useState(false);

  // Parse YYYY-MM-DD safely into DateTime object
  const selectedDt = DateTime.fromISO(value).isValid
    ? DateTime.fromISO(value)
    : DateTime.now();

  const [viewMonth, setViewMonth] = useState<DateTime>(selectedDt.startOf('month'));

  // Fix #5: Sync viewMonth when value prop changes externally
  useEffect(() => {
    const newDt = DateTime.fromISO(value);
    if (newDt.isValid) {
      setViewMonth(newDt.startOf('month'));
    }
  }, [value]);

  const isToday = selectedDt.hasSame(DateTime.now(), 'day');
  const formattedDate = isToday
    ? `Today, ${selectedDt.toFormat('MMM d, yyyy')}`
    : selectedDt.toFormat('EEE, MMM d, yyyy');

  const handlePrevMonth = () => {
    setViewMonth(prev => prev.minus({ months: 1 }));
  };

  const handleNextMonth = () => {
    setViewMonth(prev => prev.plus({ months: 1 }));
  };

  const handleSelectDay = (cellDt: DateTime) => {
    onChange(cellDt.toFormat('yyyy-MM-dd'));
    setShowCalendar(false);
  };

  // Build Sunday-first calendar grid (Sunday = 0, Monday = 1, ... Saturday = 6)
  const firstDayOfMonth = viewMonth.startOf('month');
  const startPad = firstDayOfMonth.weekday % 7;
  const gridStart = firstDayOfMonth.minus({ days: startPad });
  const daysInMonth = viewMonth.daysInMonth ?? 30;
  const totalCells = startPad + daysInMonth > 35 ? 42 : 35;
  const calendarCells: DateTime[] = [];
  for (let i = 0; i < totalCells; i++) {
    calendarCells.push(gridStart.plus({ days: i }));
  }

  const weekDayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={[styles.container, style]}>
      {/* Trigger Button */}
      <Pressable
        onPress={() => !disabled && setShowCalendar(prev => !prev)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formattedDate}`}
        accessibilityHint="Opens calendar to select a date"
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
          <Icon name="task-date" size={38} decorative />
        </View>
        <View style={styles.textColumn}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text
            style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '500', marginTop: 2 }]}
            testID={`${testID}-display`}
          >
            {formattedDate}
          </Text>
        </View>
        <Icon
          name={showCalendar ? 'chevron-down' : 'chevron-right'}
          size={18}
          color={colors.primary}
          directional
          decorative
        />
      </Pressable>

      {/* Inline Calendar View */}
      {showCalendar && (
        <View
          style={[
            styles.calendarContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginTop: spacing.xs,
            },
          ]}
          testID={`${testID}-calendar`}
        >
          {/* Header Row: Month / Year Navigation */}
          <View style={styles.calendarHeaderRow}>
            <Pressable
              onPress={handlePrevMonth}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              testID="date-picker-prev-month"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.navArrowButton}
            >
              <Icon name="chevron-left" size={20} color={colors.primary} decorative />
            </Pressable>

            <Text
              style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}
              testID="date-picker-month-title"
            >
              {viewMonth.toFormat('LLLL yyyy')}
            </Text>

            <Pressable
              onPress={handleNextMonth}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              testID="date-picker-next-month"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.navArrowButton}
            >
              <Icon name="chevron-right" size={20} color={colors.primary} decorative />
            </Pressable>
          </View>

          {/* Weekday Labels Row */}
          <View style={styles.weekDaysRow}>
            {weekDayHeaders.map((dayName, idx) => (
              <View key={idx} style={styles.weekDayHeaderCell}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                  {dayName}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Day Grid */}
          <View style={styles.gridContainer}>
            {calendarCells.map(cellDt => {
              const cellDateStr = cellDt.toFormat('yyyy-MM-dd');
              const isCellSelected = cellDt.hasSame(selectedDt, 'day');
              const isCellToday = cellDt.hasSame(DateTime.now(), 'day');
              const isCurrentMonth = cellDt.hasSame(viewMonth, 'month');

              return (
                <Pressable
                  key={cellDateStr}
                  onPress={() => handleSelectDay(cellDt)}
                  accessibilityRole="button"
                  accessibilityLabel={cellDt.toFormat('EEEE, MMMM d, yyyy')}
                  accessibilityState={{ selected: isCellSelected }}
                  testID={`date-cell-${cellDateStr}`}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isCellSelected && {
                      backgroundColor: colors.primary,
                      borderRadius: radii.pill,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: isCellSelected
                          ? colors.textOnPrimary
                          : isCurrentMonth
                          ? colors.textPrimary
                          : colors.textTertiary,
                        fontWeight: isCellSelected ? '700' : isCellToday ? '700' : '400',
                      },
                    ]}
                  >
                    {cellDt.day}
                  </Text>
                  {isCellToday && !isCellSelected && (
                    <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export interface TimePickerInputProps {
  value: string; // HH:mm (24h)
  onChange: (timeStr: string) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function to24Hour(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h = hour12 % 12;
  if (ampm === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function from24Hour(timeStr: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  const dt = DateTime.fromFormat(timeStr || '12:00', 'HH:mm');
  const validDt = dt.isValid ? dt : DateTime.fromFormat('12:00', 'HH:mm');
  const h24 = validDt.hour;
  const minute = validDt.minute;
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  // Fix #10: Don't round minutes — preserve exact values from saved tasks
  return { hour12, minute, ampm };
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 200
const PADDING_VERTICAL = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2; // 80

interface WheelColumnProps<T> {
  data: readonly T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  renderLabel: (value: T) => string;
  testIdPrefix: string;
  label: string;
}

function WheelColumn<T extends string | number>({
  data,
  selectedValue,
  onSelect,
  renderLabel,
  testIdPrefix,
  label,
}: WheelColumnProps<T>) {
  const { colors, typography, radii } = useTheme();
  const listRef = React.useRef<FlatList<T>>(null);

  React.useEffect(() => {
    const idx = data.indexOf(selectedValue);
    if (idx >= 0) {
      listRef.current?.scrollToOffset({
        offset: idx * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, []);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    const item = data[clampedIndex];
    if (item !== undefined && item !== selectedValue) {
      onSelect(item);
    }
  };

  return (
    <View style={styles.columnWrapper}>
      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: 6 }]}>
        {label}
      </Text>
      <View style={{ height: WHEEL_HEIGHT, width: '100%', overflow: 'hidden' }}>
        <FlatList
          ref={listRef}
          testID={`${testIdPrefix}-list`}
          data={data as T[]}
          keyExtractor={item => String(item)}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          initialNumToRender={data.length}
          maxToRenderPerBatch={data.length}
          contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          renderItem={({ item, index }) => {
            const isSelected = item === selectedValue;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  listRef.current?.scrollToOffset({
                    offset: index * ITEM_HEIGHT,
                    animated: true,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`${label} ${renderLabel(item)}`}
                accessibilityState={{ selected: isSelected }}
                testID={`${testIdPrefix}-${renderLabel(item).toLowerCase()}`}
                style={[
                  styles.slotItem,
                  {
                    height: ITEM_HEIGHT,
                    borderRadius: radii.md,
                    backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.headlineMedium,
                    {
                      color: isSelected ? colors.primaryDark : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                      textAlign: 'center',
                      opacity: isSelected ? 1 : 0.5,
                    },
                  ]}
                >
                  {renderLabel(item)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

export function TimePickerInput({
  value,
  onChange,
  label = 'Time',
  disabled = false,
  style,
  testID = 'time-picker-input',
}: TimePickerInputProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const { hour12, minute, ampm } = from24Hour(value);

  const formattedTime = DateTime.fromFormat(value || '12:00', 'HH:mm').isValid
    ? DateTime.fromFormat(value || '12:00', 'HH:mm').toFormat('h:mm a')
    : '12:00 PM';

  const handleSelectHour = (h: number) => {
    onChange(to24Hour(h, minute, ampm));
  };

  const handleSelectMinute = (m: number) => {
    onChange(to24Hour(hour12, m, ampm));
  };

  const handleSelectAmpm = (a: 'AM' | 'PM') => {
    onChange(to24Hour(hour12, minute, a));
  };

  return (
    <View style={[styles.container, style]}>
      {/* Trigger Button */}
      <Pressable
        onPress={() => !disabled && setShowPicker(prev => !prev)}
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
          <Icon name="task-time" size={38} decorative />
        </View>
        <View style={styles.textColumn}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text
            style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '500', marginTop: 2 }]}
            testID={`${testID}-display`}
          >
            {formattedTime}
          </Text>
        </View>
        <Icon
          name={showPicker ? 'chevron-down' : 'chevron-right'}
          size={18}
          color={colors.primary}
          directional
          decorative
        />
      </Pressable>

      {/* Inline Drum-roll / Slot-machine picker */}
      {showPicker && (
        <View
          style={[
            styles.timePickerContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginTop: spacing.xs,
            },
          ]}
          testID={`${testID}-picker`}
        >
          <View style={styles.timePickerColumnsRow}>
            {/* Shared center selection band */}
            <View
              pointerEvents="none"
              style={[
                styles.centerSelectionBand,
                {
                  top: 24 + PADDING_VERTICAL,
                  height: ITEM_HEIGHT,
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
            />

            {/* Hours Column */}
            <WheelColumn
              data={HOURS}
              selectedValue={hour12}
              onSelect={handleSelectHour}
              renderLabel={h => String(h)}
              testIdPrefix="time-hour"
              label="Hour"
            />

            {/* Separator Colon */}
            <View style={styles.colonWrapper}>
              <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                :
              </Text>
            </View>

            {/* Minutes Column */}
            <WheelColumn
              data={MINUTES}
              selectedValue={minute}
              onSelect={handleSelectMinute}
              renderLabel={m => String(m).padStart(2, '0')}
              testIdPrefix="time-minute"
              label="Minute"
            />

            {/* AM / PM Column */}
            <WheelColumn
              data={['AM', 'PM'] as const}
              selectedValue={ampm}
              onSelect={handleSelectAmpm}
              renderLabel={p => p}
              testIdPrefix="time-ampm"
              label="Period"
            />
          </View>

          {/* Done Button */}
          <Pressable
            onPress={() => setShowPicker(false)}
            accessibilityRole="button"
            accessibilityLabel="Done selecting time"
            testID={`${testID}-done`}
            style={({ pressed }) => [
              styles.doneButton,
              {
                backgroundColor: colors.primaryLight,
                borderRadius: radii.pill,
                marginTop: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[typography.labelLarge, { color: colors.primaryDark, fontWeight: '700' }]}>
              Done
            </Text>
          </Pressable>
        </View>
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  calendarContainer: {
    borderWidth: 1,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navArrowButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 2,
  },
  timePickerContainer: {
    borderWidth: 1,
  },
  timePickerColumnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },
  centerSelectionBand: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderWidth: 1,
    opacity: 0.45,
    zIndex: 0,
  },
  columnWrapper: {
    flex: 1,
    alignItems: 'center',
    zIndex: 1,
  },
  slotItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colonWrapper: {
    paddingHorizontal: 4,
    paddingTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  doneButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
