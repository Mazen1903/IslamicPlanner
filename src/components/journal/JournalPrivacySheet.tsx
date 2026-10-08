import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JOURNAL_ACTION_ASSETS } from '@/constants/journalIconAssets';

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
  const router = useRouter();
  const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();

  const handleOpenSettings = () => {
    onClose();
    router.push('/settings/journal-privacy' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={[styles.overlay, { backgroundColor: 'transparent' }]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessible={false} />

        <View
          accessibilityViewIsModal={true}
          style={[
            styles.bottomSheet,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.96)' : colors.surface,
              borderTopLeftRadius: radii.xl ?? 24,
              borderTopRightRadius: radii.xl ?? 24,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xxl,
            },
          ]}
          testID="journal-privacy-content"
        >
          {/* Grab Handle */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? 'rgba(15, 159, 74, 0.2)' : 'rgba(15, 159, 74, 0.1)',
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Image
                source={JOURNAL_ACTION_ASSETS.headerLock}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.titleContainer, { marginStart: spacing.md }]}>
              <Text
                accessibilityRole="header"
                style={[typography.headlineMedium, styles.titleText, { color: colors.textPrimary }]}
              >
                Journal Privacy
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                Device Biometric Security
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.md, lineHeight: 20 },
            ]}
          >
            Protect your thoughts and personal reflections on this device with Face ID, Touch ID, or PIN.
          </Text>

          {/* Toggle row card */}
          <View
            style={[
              styles.toggleCard,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : colors.background,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                borderRadius: radii.md ?? 12,
                padding: spacing.md,
                marginTop: spacing.lg,
              },
            ]}
          >
            <View style={styles.toggleLabelContainer}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary }]}>
                Biometric Lock
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
                { color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
              ]}
              testID="journal-privacy-error"
            >
              {errorMessage}
            </Text>
          )}

          {/* More Settings Link */}
          <Pressable
            onPress={handleOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Open all journal privacy settings"
            style={({ pressed }) => [
              styles.moreSettingsLink,
              { opacity: pressed ? 0.7 : 1, marginTop: spacing.md },
            ]}
            testID="journal-privacy-more-settings-btn"
          >
            <Text style={[typography.labelMedium, { color: colors.primary }]}>
              Advanced privacy settings →
            </Text>
          </Pressable>

          {/* Done Button */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [
              styles.doneWrapper,
              { opacity: pressed ? 0.85 : 1, marginTop: spacing.lg },
            ]}
            testID="journal-privacy-done-btn"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.doneGradient,
                {
                  borderRadius: radii.pill,
                  minHeight: touchTargets.comfortable,
                },
              ]}
            >
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>
                Done
              </Text>
            </LinearGradient>
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
    ...StyleSheet.absoluteFill,
  },
  bottomSheet: {
    width: '100%',
    zIndex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  titleText: {
    letterSpacing: -0.3,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  toggleLabelContainer: {
    flex: 1,
    paddingEnd: 12,
  },
  moreSettingsLink: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  doneWrapper: {
    width: '100%',
  },
  doneGradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
