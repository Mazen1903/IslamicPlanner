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
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID={testID}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View
          style={[
            styles.card,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing.xl,
            },
          ]}
          testID="journal-delete-dialog-content"
        >
          <Text style={[typography.headlineMedium, { color: colors.textPrimary }]}>
            Delete this journal entry?
          </Text>

          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
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
                styles.button,
                {
                  backgroundColor: pressed ? colors.border : colors.background,
                  borderColor: colors.border,
                  borderRadius: radii.sm,
                  minHeight: touchTargets.min,
                  marginRight: spacing.sm,
                },
              ]}
              testID="journal-delete-cancel-btn"
            >
              <Text style={[typography.labelMedium, { color: colors.textPrimary }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Delete entry"
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: pressed ? colors.dangerPressed : colors.danger,
                  borderRadius: radii.sm,
                  minHeight: touchTargets.min,
                },
              ]}
              testID="journal-delete-confirm-btn"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={[typography.labelMedium, { color: colors.textOnPrimary }]}>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    zIndex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
