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
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
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

  const insertBismillah = () => {
    const bismillah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\n\n';
    if (!value.includes('بِسْمِ ٱللَّهِ')) {
      onChangeText(bismillah + value);
    }
  };

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
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <View style={styles.dateBlock}>
              {gregorianDisplay && (
                <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {gregorianDisplay}
                </Text>
              )}
              {hijriDisplay && (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {hijriDisplay}
                </Text>
              )}
            </View>

            <View style={styles.topRightActions}>
              <View style={styles.saveStatusWrapper}>
                <JournalSaveStatus state={saveState} />
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Done editing"
                style={({ pressed }) => [
                  styles.doneButton,
                  {
                    backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                    borderRadius: radii.pill,
                  },
                ]}
                testID="journal-modal-done-btn"
              >
                <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Helper Action Pills */}
          <View
            style={[
              styles.helperPillBar,
              {
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.xs,
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
              },
            ]}
          >
            <Pressable
              onPress={insertBismillah}
              accessibilityRole="button"
              accessibilityLabel="Insert Bismillah heading"
              style={({ pressed }) => [
                styles.helperPill,
                {
                  backgroundColor: pressed
                    ? colors.primaryLight
                    : (isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary),
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Text style={[styles.helperPillText, { color: colors.primaryDark }]}>
                ﷽ Bismillah
              </Text>
            </Pressable>

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
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Icon name="clock" size={12} color={colors.textSecondary} decorative />
              <Text style={[styles.helperPillText, { color: colors.textSecondary, marginStart: 4 }]}>
                Timestamp
              </Text>
            </Pressable>
          </View>

          {/* Main Full-Screen Writing Surface */}
          <ScrollView
            style={styles.editorScroll}
            contentContainerStyle={[styles.editorScrollContent, { padding: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              placeholder="What is on your heart and mind today? Take your time..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect
              spellCheck
              style={[
                styles.textInput,
                typography.bodyLarge,
                {
                  color: colors.textPrimary,
                  lineHeight: 28,
                },
              ]}
              accessibilityLabel="Distraction-free journal editor"
              testID="journal-modal-input"
            />
          </ScrollView>

          {/* Bottom Bar: Word Count & Status */}
          <View
            style={[
              styles.bottomBar,
              {
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 12 }]}>
              📝 {wordCount} {wordCount === 1 ? 'word' : 'words'} • ~{readMin} min read
            </Text>

            <Text style={[typography.caption, { color: colors.primaryDark, fontWeight: '600', fontSize: 11 }]}>
              {saveState === 'saving' ? 'Auto-saving...' : 'Auto-saved'}
            </Text>
          </View>
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
  dateBlock: {
    flex: 1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveStatusWrapper: {
    justifyContent: 'center',
  },
  doneButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
  },
  helperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  helperPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    flexGrow: 1,
    minHeight: 300,
  },
  textInput: {
    flex: 1,
    padding: 0,
    fontSize: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
});
