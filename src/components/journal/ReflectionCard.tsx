import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';

export interface ReflectionCardProps {
  label: string;
  emoji: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  accentColor: string;
  bgLight: string;
  testID?: string;
}

export function ReflectionCard({
  label,
  emoji,
  placeholder,
  value,
  onChangeText,
  accentColor,
  bgLight,
  testID,
}: ReflectionCardProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value.trim().length > 0;

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          borderRadius: radii.card,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.75)' : colors.surface,
          borderColor: isFocused
            ? accentColor
            : (hasValue
                ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)')
                : (isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border)),
          borderWidth: isFocused ? 1.5 : 1,
          padding: spacing.md,
          marginBottom: spacing.sm + 2,
        },
      ]}
      testID={testID}
    >
      {/* Left Accent indicator line */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: accentColor,
            borderTopLeftRadius: radii.card,
            borderBottomLeftRadius: radii.card,
          },
        ]}
      />

      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.emojiBadge,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : bgLight,
                borderRadius: radii.sm,
              },
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>
          <Text
            style={[
              typography.labelMedium,
              {
                color: colors.textPrimary,
                fontWeight: '700',
                marginStart: spacing.xs + 2,
              },
            ]}
          >
            {label}
          </Text>
        </View>

        {hasValue && (
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
        )}
      </View>

      {/* Input Field */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          typography.bodyMedium,
          {
            color: colors.textPrimary,
            lineHeight: 22,
          },
        ]}
        accessibilityLabel={label}
        accessibilityHint={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingStart: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiBadge: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 14,
  },
  input: {
    minHeight: 52,
    padding: 0,
    paddingStart: 2,
    marginTop: 2,
  },
});
