import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { TaskPriority } from '@/domain/task/types';
import {
  PriorityHeaderBadgeIcon,
  PriorityNormalBadgeIcon,
  PriorityImportantBadgeIcon,
} from './RepeatIcons';

export interface PrioritySheetProps {
  visible: boolean;
  onClose: () => void;
  priority: TaskPriority;
  onSelectPriority: (priority: TaskPriority) => void;
}

export function PrioritySheet({
  visible,
  onClose,
  priority,
  onSelectPriority,
}: PrioritySheetProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const handleSelect = (p: TaskPriority) => {
    onSelectPriority(p);
  };

  const isNormal = priority === 'NORMAL';
  const isImportant = priority === 'IMPORTANT';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="priority-sheet-modal"
    >
      <View style={[styles.overlay, { backgroundColor: 'transparent' }]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          testID="priority-sheet-backdrop"
        />
        <View
          accessibilityViewIsModal={true}
          style={[
            styles.sheetContainer,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.lg,
            },
          ]}
          testID="priority-sheet"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeftContainer}>
              <PriorityHeaderBadgeIcon size={44} style={{ marginEnd: spacing.sm }} decorative />
              <View style={styles.titleContainer}>
                <Text
                  accessibilityRole="header"
                  style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                >
                  Task Priority
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Mark the importance of this task
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close priority selection"
              testID="priority-sheet-close-btn"
              style={[
                styles.closeButton,
                {
                  minHeight: touchTargets.min,
                  minWidth: touchTargets.min,
                  borderRadius: radii.pill,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            >
              <Icon name="close" size={20} color={colors.textSecondary} decorative />
            </Pressable>
          </View>

          {/* Options */}
          <View style={{ marginVertical: spacing.sm }}>
            {/* Normal Option Card */}
            <Pressable
              onPress={() => handleSelect('NORMAL')}
              accessibilityRole="radio"
              accessibilityState={{ selected: isNormal }}
              accessibilityLabel="Priority option: Normal"
              testID="priority-option-normal"
              style={({ pressed }) => [
                styles.optionCard,
                isNormal && shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isNormal ? colors.primary : colors.border,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isNormal ? colors.primary : colors.border,
                    backgroundColor: isNormal ? colors.primary : 'transparent',
                    marginEnd: spacing.sm,
                  },
                ]}
              >
                {isNormal && <View style={[styles.radioDot, { backgroundColor: colors.surface }]} />}
              </View>

              <View style={{ marginEnd: spacing.sm }}>
                <PriorityNormalBadgeIcon size={38} decorative />
              </View>

              <View style={styles.optionTextContainer}>
                <Text
                  style={[
                    typography.headlineMedium,
                    {
                      color: colors.textPrimary,
                      fontSize: 16,
                      fontWeight: isNormal ? '700' : '600',
                    },
                  ]}
                >
                  Normal
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Standard priority for routine daily tasks and reminders.
                </Text>
              </View>
            </Pressable>

            {/* Important Option Card */}
            <Pressable
              onPress={() => handleSelect('IMPORTANT')}
              accessibilityRole="radio"
              accessibilityState={{ selected: isImportant }}
              accessibilityLabel="Priority option: Important"
              testID="priority-option-important"
              style={({ pressed }) => [
                styles.optionCard,
                isImportant && shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isImportant ? colors.error : colors.border,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isImportant ? colors.error : colors.border,
                    backgroundColor: isImportant ? colors.error : 'transparent',
                    marginEnd: spacing.sm,
                  },
                ]}
              >
                {isImportant && <View style={[styles.radioDot, { backgroundColor: colors.surface }]} />}
              </View>

              <View style={{ marginEnd: spacing.sm }}>
                <PriorityImportantBadgeIcon size={38} decorative />
              </View>

              <View style={styles.optionTextContainer}>
                <Text
                  style={[
                    typography.headlineMedium,
                    {
                      color: isImportant ? colors.error : colors.textPrimary,
                      fontSize: 16,
                      fontWeight: isImportant ? '700' : '600',
                    },
                  ]}
                >
                  Important
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  High-priority task with urgent alerts and priority sorting.
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Done Button */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            testID="priority-sheet-done-btn"
            style={[
              styles.doneButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.md,
                paddingVertical: 14,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.headlineMedium, { color: colors.textOnPrimary, textAlign: 'center' }]}>
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    maxHeight: '80%',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionTextContainer: {
    flex: 1,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
