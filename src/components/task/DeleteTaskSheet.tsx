import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { SheetSafeArea } from '@/components/layout/SheetSafeArea';

export interface DeleteTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectScope: (scope: 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES') => void;
  taskTitle?: string;
  testID?: string;
}

export function DeleteTaskSheet({
  visible,
  onClose,
  onSelectScope,
  taskTitle = 'this task',
  testID = 'delete-task-sheet',
}: DeleteTaskSheetProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
      testID={testID}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          testID="delete-sheet-backdrop"
        />

        <SheetSafeArea backgroundColor={colors.surface} minBottomPadding={spacing.xxl}>
          <View
            style={[
              styles.sheetContainer,
              shadows.elevated,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.lg,
                paddingBottom: spacing.sm,
              },
            ]}
            testID="delete-sheet-content"
            accessibilityViewIsModal={true}
          >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: colors.dangerSurface,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Icon name="trash" size={24} color={colors.error} decorative />
            </View>
            <Text
              accessibilityRole="header"
              style={[
                typography.headlineMedium,
                { color: colors.textPrimary, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
              ]}
            >
              Delete Recurring Task
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
              ]}
              numberOfLines={2}
            >
              Choose which occurrences of “{taskTitle}” to remove.
            </Text>
          </View>

          {/* Options List */}
          <View style={[styles.optionsList, { marginTop: spacing.lg }]}>
            {/* Option 1: This occurrence only */}
            <Pressable
              onPress={() => onSelectScope('THIS_OCCURRENCE')}
              accessibilityRole="button"
              accessibilityLabel="Delete this occurrence only"
              testID="delete-scope-this-occurrence"
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  padding: spacing.md,
                  minHeight: touchTargets.min,
                },
              ]}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
                <Icon name="calendar" size={20} color={colors.primary} decorative />
              </View>
              <View style={styles.optionTextColumn}>
                <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '600' }]}>
                  This occurrence only
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Only remove the task on this specific date
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textTertiary} directional decorative />
            </Pressable>

            {/* Option 2: This and future occurrences */}
            <Pressable
              onPress={() => onSelectScope('THIS_AND_FUTURE')}
              accessibilityRole="button"
              accessibilityLabel="Delete this and all following occurrences"
              testID="delete-scope-this-and-future"
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  padding: spacing.md,
                  marginTop: spacing.sm,
                  minHeight: touchTargets.min,
                },
              ]}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
                <Icon name="clock" size={20} color={colors.primary} decorative />
              </View>
              <View style={styles.optionTextColumn}>
                <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '600' }]}>
                  This & following occurrences
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Remove from this date forward, keeping previous history
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textTertiary} directional decorative />
            </Pressable>

            {/* Option 3: All occurrences */}
            <Pressable
              onPress={() => onSelectScope('ALL_OCCURRENCES')}
              accessibilityRole="button"
              accessibilityLabel="Delete all occurrences of this task"
              testID="delete-scope-all-occurrences"
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor: pressed ? colors.dangerSurface : colors.surface,
                  borderColor: colors.error + '40',
                  borderRadius: radii.lg,
                  padding: spacing.md,
                  marginTop: spacing.sm,
                  minHeight: touchTargets.min,
                },
              ]}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: colors.dangerSurface, borderRadius: radii.md }]}>
                <Icon name="trash" size={20} color={colors.error} decorative />
              </View>
              <View style={styles.optionTextColumn}>
                <Text style={[typography.headlineMedium, { color: colors.error, fontSize: 16, fontWeight: '700' }]}>
                  All occurrences
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Delete the entire recurring series completely
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textTertiary} directional decorative />
            </Pressable>
          </View>

          {/* Cancel button */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel task deletion"
            testID="delete-sheet-cancel"
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: pressed ? colors.surfaceSecondary : colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: radii.pill,
                marginTop: spacing.lg,
                minHeight: touchTargets.min,
              },
            ]}
          >
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '600' }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
        </SheetSafeArea>
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
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    width: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionIconContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  optionTextColumn: {
    flex: 1,
    marginEnd: 8,
  },
  cancelButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
