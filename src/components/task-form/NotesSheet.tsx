import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { NotesHeaderBadgeIcon } from './NotesIcons';

export interface NotesSheetProps {
  visible: boolean;
  onClose: () => void;
  notes: string;
  onChangeNotes: (text: string) => void;
}

export function NotesSheet({
  visible,
  onClose,
  notes,
  onChangeNotes,
}: NotesSheetProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="notes-sheet-modal"
    >
      <View style={[styles.overlay, { backgroundColor: 'transparent' }]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          testID="notes-sheet-backdrop"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
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
            testID="notes-sheet"
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeftContainer}>
                <NotesHeaderBadgeIcon size={44} style={{ marginEnd: spacing.sm }} decorative />
                <View style={styles.titleContainer}>
                  <Text
                    accessibilityRole="header"
                    style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                  >
                    Task Notes
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    Add extra details, reminders, or reflections
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close notes sheet"
                testID="notes-sheet-close-btn"
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: spacing.xs }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Text Input Card */}
              <View
                style={[
                  styles.inputCard,
                  shadows.card,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radii.card,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <View style={styles.inputCardHeader}>
                  <Text
                    style={[
                      typography.labelMedium,
                      { color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
                    ]}
                  >
                    NOTES CONTENT
                  </Text>
                  {notes.length > 0 && (
                    <Pressable
                      onPress={() => onChangeNotes('')}
                      accessibilityRole="button"
                      accessibilityLabel="Clear notes"
                      testID="clear-notes-btn"
                      style={({ pressed }) => [
                        styles.clearBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={[typography.labelMedium, { color: colors.error, fontSize: 12, fontWeight: '600' }]}>
                        Clear
                      </Text>
                    </Pressable>
                  )}
                </View>

                <TextInput
                  value={notes}
                  onChangeText={onChangeNotes}
                  placeholder="Write any details, context, checklist items, or personal intentions..."
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel="Task notes"
                  testID="task-notes-input"
                  multiline={true}
                  scrollEnabled={true}
                  textAlignVertical="top"
                  style={[
                    styles.textInput,
                    typography.bodyMedium,
                    {
                      color: colors.textPrimary,
                      minHeight: 180,
                    },
                  ]}
                />

                <View style={styles.inputCardFooter}>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    {notes.length} characters
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Done Button */}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Done"
              testID="notes-sheet-done-btn"
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
        </KeyboardAvoidingView>
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
  keyboardContainer: {
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  sheetContainer: {
    maxHeight: '85%',
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
  inputCard: {
    borderWidth: 1,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clearBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  textInput: {
    padding: 0,
    fontSize: 15,
    lineHeight: 22,
  },
  inputCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

