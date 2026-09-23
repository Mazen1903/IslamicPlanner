import React from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface AddTaskButtonProps {
  onPress?: () => void;
}

export function AddTaskButton({ onPress }: AddTaskButtonProps) {
  const { colors, typography, touchTargets } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/add');
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Add Task"
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: touchTargets.min,
          backgroundColor: pressed ? colors.primaryPressed : colors.primaryLight,
          borderColor: colors.primary,
        },
      ]}
      testID="today-add-task-button"
    >
      <View style={[styles.plusCircle, { backgroundColor: colors.primary }]}>
        <Icon name="plus" size={16} color={colors.textOnPrimary} decorative />
      </View>
      <Text style={[typography.labelLarge, styles.buttonText, { color: colors.primary }]}>
        Add Task
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    marginTop: 4,
    marginBottom: 24,
  },
  plusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
