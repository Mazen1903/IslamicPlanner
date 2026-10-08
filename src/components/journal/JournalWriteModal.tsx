import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { SoftCircleButton } from './JournalCard';
import { JournalSaveStatus } from './JournalSaveStatus';
import type { SaveState } from '@/services/journal/JournalAutosaveController';

export interface JournalWriteModalProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChangeText: (text: string) => void;
  gregorianDisplay?: string;
  hijriDisplay?: string;
  saveState?: SaveState;
  testID?: string;
}

export function JournalWriteModal({
  visible,
  onClose,
  value,
  onChangeText,
  gregorianDisplay,
  hijriDisplay,
  saveState = 'idle',
  testID = 'journal-write-modal',
}: JournalWriteModalProps) {
  const { colors, spacing, radii, typography, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  // Auto-focus when modal becomes visible
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const trimmed = value.trim();
  const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const readMin = Math.max(1, Math.ceil(wordCount / 150));

  const insertTimestamp = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const snippet = `\n[${timeStr}] `;
    onChangeText(value + snippet);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      testID={testID}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Bar */}
          <View
            style={[
              styles.topBar,
              {
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <View style={styles.topLeftGroup}>
              <SoftCircleButton
                onPress={onClose}
                icon="chevron-left"
                accessibilityLabel="Close focus mode"
                size={34}
              />
              <View style={styles.titleColumn}>
                <Text style={[typography.headlineMedium, styles.screenTitle, { color: colors.textPrimary }]}>
                  Focus Mode
                </Text>
                {gregorianDisplay && (
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {gregorianDisplay}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.topRightActions}>
              <View style={styles.saveStatusWrapper}>
                <JournalSaveStatus state={saveState} />
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Done editing"
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                testID="journal-modal-done-btn"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.doneButton,
                    {
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Text style={[typography.labelMedium, { color: colors.textOnPrimary }]}>
                    Done
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* Quick Helper Action Pills */}
          <View
            style={[
              styles.helperPillBar,
              {
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.xs + 2,
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
              },
            ]}
          >
            <Pressable
              onPress={insertTimestamp}
              accessibilityRole="button"
              accessibilityLabel="Insert current time stamp"
              style={({ pressed }) => [
                styles.helperPill,
                {
                  backgroundColor: pressed
                    ? colors.primaryLight
                    : (isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary),
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0, 0, 0, 0.06)',
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Icon name="clock" size={12} color={colors.textSecondary} decorative />
              <Text style={[styles.helperPillText, { color: colors.textSecondary, marginStart: 4 }]}>
                Timestamp
              </Text>
            </Pressable>

            {wordCount > 0 && (
              <Text style={[typography.caption, { color: colors.textTertiary, marginStart: 'auto', fontSize: 11 }]}>
                {wordCount} words • ~{readMin} min
              </Text>
            )}
          </View>

          {/* Main Full-Screen Writing Surface */}
          <ScrollView
            style={styles.inputScroll}
            contentContainerStyle={[styles.inputScrollContent, { padding: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              placeholder="Let your thoughts flow freely..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect
              spellCheck
              style={[
                styles.modalInput,
                typography.bodyLarge,
                {
                  color: colors.textPrimary,
                  lineHeight: 28,
                },
              ]}
              accessibilityLabel="Full screen journal editor"
              testID="journal-modal-input"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleColumn: {
    justifyContent: 'center',
  },
  screenTitle: {
    letterSpacing: -0.3,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveStatusWrapper: {
    marginEnd: 4,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  helperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  helperPillText: {
    fontSize: 11,
  },
  inputScroll: {
    flex: 1,
  },
  inputScrollContent: {
    flexGrow: 1,
  },
  modalInput: {
    flex: 1,
    minHeight: 300,
    padding: 0,
  },
});
