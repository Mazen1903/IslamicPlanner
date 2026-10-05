import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface JournalDeleteDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  testID?: string;
}

export function JournalDeleteDialog({
  visible,
  onConfirm,
  onCancel,
  isDeleting = false,
  testID = 'journal-delete-dialog',
}: JournalDeleteDialogProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID={testID}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessible={false} />

        <View
          accessibilityViewIsModal={true}
          style={[
            styles.card,
            shadows.elevated,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : colors.surface,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              borderRadius: radii.xl ?? 24,
              padding: spacing.xl,
            },
          ]}
          testID="journal-delete-dialog-content"
        >
          {/* Danger icon circle */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: radii.pill,
              },
            ]}
          >
            <Icon name="trash" size={24} color={colors.danger} decorative />
          </View>

          <Text
            accessibilityRole="header"
            style={[
              typography.headlineMedium,
              styles.title,
              { color: colors.textPrimary, marginTop: spacing.md },
            ]}
          >
            Delete this journal entry?
          </Text>

          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center', lineHeight: 20 },
            ]}
          >
            This entry cannot be recovered.
          </Text>

          <View style={[styles.actionsRow, { marginTop: spacing.xl }]}>
            <Pressable
              onPress={onCancel}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: pressed
                    ? (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSecondary)
                    : 'transparent',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
                  borderRadius: radii.pill,
                  minHeight: touchTargets.min,
                  marginEnd: spacing.sm,
                },
              ]}
              testID="journal-delete-cancel-btn"
            >
              <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Delete entry"
              style={({ pressed }) => [
                styles.deleteBtn,
                {
                  backgroundColor: pressed ? colors.dangerPressed : colors.danger,
                  borderRadius: radii.pill,
                  minHeight: touchTargets.min,
                  opacity: isDeleting ? 0.7 : 1,
                },
              ]}
              testID="journal-delete-confirm-btn"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                  Delete
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 10,
  },
  deleteBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});
