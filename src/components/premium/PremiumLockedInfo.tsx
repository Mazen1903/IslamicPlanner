import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface PremiumLockedInfoProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  testID?: string;
}

export function PremiumLockedInfo({
  visible,
  onClose,
  title = 'Premium Feature',
  description = 'Custom planning-day boundaries let you choose exactly when your day begins — whether that’s Midnight or a fixed hour that works for your schedule.',
  testID = 'premium-locked-info',
}: PremiumLockedInfoProps) {
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
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close dialog backdrop"
          testID={`${testID}-backdrop`}
        />

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
          accessible
          accessibilityRole="alert"
          testID={`${testID}-content`}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radii.pill,
                  marginRight: spacing.sm,
                },
              ]}
            >
              <Icon name="lock" size={20} color={colors.primary} />
            </View>
            <Text
              style={[
                typography.headlineLarge,
                { color: colors.textPrimary, flex: 1 },
              ]}
              testID={`${testID}-title`}
            >
              {title}
            </Text>
          </View>

          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.md, lineHeight: 22 },
            ]}
            testID={`${testID}-description`}
          >
            {description}
          </Text>

          <Text
            style={[
              typography.bodySmall,
              {
                color: colors.textTertiary,
                marginTop: spacing.sm,
                fontStyle: 'italic',
              },
            ]}
            testID={`${testID}-notice`}
          >
            Purchasing will be available in a future update.
          </Text>

          <View style={[styles.actionsRow, { marginTop: spacing.xl }]}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="OK"
              accessibilityHint="Dismisses the informational dialog"
              testID={`${testID}-ok`}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                  minHeight: touchTargets.min,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>
                OK
              </Text>
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
    maxWidth: 400,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
});
