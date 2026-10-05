import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface ReflectionCardProps {
  fieldKey: string;
  label: string;
  emoji: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  accentColor: string;
  bgLight: string;
  isExpanded: boolean;
  onToggle: () => void;
  testID?: string;
}

export function ReflectionCard({
  fieldKey,
  label,
  emoji,
  subtitle,
  placeholder,
  value,
  onChangeText,
  accentColor,
  bgLight,
  isExpanded,
  onToggle,
  testID,
}: ReflectionCardProps) {
  const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value.trim().length > 0;

  return (
    <View
      style={[
        styles.rowCard,
        {
          borderRadius: radii.md ?? 12,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : colors.surface,
          borderColor: isExpanded
            ? accentColor
            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
          borderWidth: isExpanded ? 1.5 : 1,
          marginBottom: spacing.sm,
        },
      ]}
    >
      {/* Accent Indicator Bar on Start Edge */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: accentColor,
            borderTopLeftRadius: radii.md ?? 12,
            borderBottomLeftRadius: radii.md ?? 12,
          },
        ]}
      />

      {/* Row Header - Always clickable to expand/collapse */}
      <Pressable
        onPress={onToggle}
        testID={testID ?? `reflection-row-${fieldKey}`}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${hasValue ? 'Answered' : 'Not answered'}.`}
        accessibilityState={{ expanded: isExpanded }}
        style={({ pressed }) => [
          styles.headerPressable,
          {
            minHeight: touchTargets.min,
            opacity: pressed ? 0.75 : 1,
            paddingVertical: spacing.sm + 2,
            paddingStart: spacing.md + 4,
            paddingEnd: spacing.md,
          },
        ]}
      >
        {/* Soft Circle Icon */}
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : bgLight,
              borderRadius: radii.pill,
            },
          ]}
        >
          <Text style={styles.badgeEmoji}>{emoji}</Text>
        </View>

        {/* Title and Subtitle / Preview */}
        <View style={styles.titleColumn}>
          <View style={styles.labelRow}>
            <Text
              style={[
                typography.labelLarge,
                styles.labelText,
                { color: colors.textPrimary },
              ]}
            >
              {label}
            </Text>
            {hasValue && (
              <View
                style={[
                  styles.checkBadge,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Icon name="check" size={10} color={accentColor} decorative />
              </View>
            )}
          </View>

          <Text
            style={[
              typography.caption,
              styles.subtitleText,
              { color: hasValue ? colors.textPrimary : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {hasValue ? value.trim() : subtitle}
          </Text>
        </View>

        {/* Trailing chevron */}
        <View style={styles.chevronWrapper}>
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-right'}
            size={16}
            color={colors.textTertiary}
            decorative
            directional
          />
        </View>
      </Pressable>

      {/* Expanded TextInput Section */}
      {isExpanded && (
        <View
          style={[
            styles.inputSection,
            {
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
              paddingHorizontal: spacing.md + 4,
              paddingBottom: spacing.md,
              paddingTop: spacing.xs,
            },
          ]}
        >
          {hasValue && (
            <View style={styles.clearRow}>
              <Pressable
                onPress={() => onChangeText('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Clear ${label}`}
              >
                <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
                  Clear
                </Text>
              </Pressable>
            </View>
          )}

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            autoFocus
            textAlignVertical="top"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={[
              styles.textInput,
              typography.bodyMedium,
              {
                color: colors.textPrimary,
                lineHeight: 22,
              },
            ]}
            accessibilityLabel={label}
            accessibilityHint={placeholder}
            testID={`reflection-field-${fieldKey}`}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  headerPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 18,
  },
  titleColumn: {
    flex: 1,
    marginStart: 12,
    marginEnd: 8,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  checkBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleText: {
    marginTop: 2,
    fontSize: 12,
  },
  chevronWrapper: {
    marginStart: 'auto',
  },
  inputSection: {
    borderTopWidth: 1,
  },
  clearRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  textInput: {
    minHeight: 64,
    padding: 0,
  },
});
