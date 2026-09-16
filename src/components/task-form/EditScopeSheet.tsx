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
import type { EditScope } from '@/features/task-form/types';

interface EditScopeSheetProps {
  visible: boolean;
  onSelectScope: (scope: EditScope) => void;
  onCancel: () => void;
}

export function EditScopeSheet({
  visible,
  onSelectScope,
  onCancel,
}: EditScopeSheetProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const options: { scope: EditScope; label: string; desc: string; helper?: string }[] = [
    {
      scope: 'THIS_OCCURRENCE',
      label: 'This occurrence',
      desc: 'Change only this specific date. Keeps schedule and repeat unchanged.',
    },
    {
      scope: 'THIS_AND_FUTURE',
      label: 'This and future occurrences',
      desc: 'Change this date and all following occurrences.',
    },
    {
      scope: 'ALL_OCCURRENCES',
      label: 'All occurrences',
      desc: 'Change all occurrences in this repeating schedule.',
      helper: 'Applies to the current repeating schedule',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.sheetContainer,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
            },
          ]}
          testID="edit-scope-sheet"
        >
          <View style={styles.headerRow}>
            <Text style={[typography.headlineMedium, { color: colors.textPrimary }]}>
              Edit Recurring Task
            </Text>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel edit scope selection"
              style={[styles.closeButton, { minHeight: touchTargets.min, minWidth: touchTargets.min }]}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            How would you like to apply your changes?
          </Text>

          <View style={styles.optionsList}>
            {options.map(item => (
              <Pressable
                key={item.scope}
                onPress={() => onSelectScope(item.scope)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${item.desc}`}
                testID={`scope-option-${item.scope.toLowerCase()}`}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: pressed ? colors.primaryLight : colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                    padding: spacing.lg,
                    minHeight: touchTargets.comfortable,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {item.label}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                  {item.desc}
                </Text>
                {item.helper ? (
                  <Text style={[typography.caption, { color: colors.primaryDark, fontWeight: '600', marginTop: 4 }]}>
                    {item.helper}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
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
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    marginTop: 4,
  },
  optionCard: {
    borderWidth: 1,
  },
});
