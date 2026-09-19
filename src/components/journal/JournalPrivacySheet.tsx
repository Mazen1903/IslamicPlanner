import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface JournalPrivacySheetProps {
  visible: boolean;
  lockEnabled: boolean;
  onToggleLock: () => void;
  onClose: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  testID?: string;
}

export function JournalPrivacySheet({
  visible,
  lockEnabled,
  onToggleLock,
  onClose,
  isLoading = false,
  errorMessage,
  testID = 'journal-privacy-modal',
}: JournalPrivacySheetProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessible={false} />

        <View
          accessibilityViewIsModal={true}
          style={[
            styles.sheetCard,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
            },
          ]}
          testID="journal-privacy-content"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight, borderRadius: radii.pill }]}>
              <Icon name="lock" size={24} color={colors.primary} />
            </View>
            <View style={[styles.titleContainer, { marginStart: spacing.md }]}>
              <Text
                accessibilityRole="header"
                style={[typography.headlineMedium, { color: colors.textPrimary }]}
              >
                Journal Privacy
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                Device Biometric Security
              </Text>
            </View>
          </View>

          {/* Body description */}
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.md, lineHeight: 20 },
            ]}
          >
            Lock your private journal entries on this device. When enabled, Face ID or
            fingerprint is required each time you open the Journal.
          </Text>

          {/* Toggle row */}
          <View
            style={[
              styles.toggleRow,
              {
                backgroundColor: colors.background,
                borderRadius: radii.md,
                borderColor: colors.border,
                padding: spacing.md,
                marginTop: spacing.lg,
              },
            ]}
          >
            <View style={styles.toggleLabelContainer}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary }]}>
                Journal Lock
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {lockEnabled ? 'Protected with biometrics' : 'Unrestricted on this device'}
              </Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={lockEnabled}
                onValueChange={onToggleLock}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                accessibilityRole="switch"
                accessibilityLabel="Toggle Journal Lock"
                accessibilityState={{ checked: lockEnabled }}
                testID="journal-lock-switch"
              />
            )}
          </View>

          {/* Error Message */}
          {errorMessage && (
            <Text
              style={[
                typography.bodySmall,
                { color: colors.warning, marginTop: spacing.md, textAlign: 'center' },
              ]}
              testID="journal-privacy-error"
            >
              {errorMessage}
            </Text>
          )}

          {/* Done Button */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [
              styles.doneButton,
              {
                backgroundColor: pressed ? colors.primaryLight : colors.background,
                borderColor: colors.border,
                borderRadius: radii.pill,
                minHeight: touchTargets.min,
                marginTop: spacing.xl,
              },
            ]}
            testID="journal-privacy-done-btn"
          >
            <Text style={[typography.labelLarge, { color: colors.textPrimary }]}>
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
  sheetCard: {
    width: '100%',
    maxWidth: 400,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  toggleLabelContainer: {
    flex: 1,
    paddingEnd: 12,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
