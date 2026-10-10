import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Image } from 'react-native';
import { useTheme } from '@/theme';
import { JournalCard } from './JournalCard';
import { JournalEntryHeaderBadgeIcon } from './JournalIcons';
import { JournalSaveStatus } from './JournalSaveStatus';
import { JournalWriteModal } from './JournalWriteModal';
import { JOURNAL_ACTION_ASSETS } from '@/constants/journalIconAssets';
import type { SaveState } from '@/services/journal/JournalAutosaveController';

export interface JournalEditorRef {
  openFocusMode: () => void;
}

export interface JournalEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  gregorianDisplay?: string;
  hijriDisplay?: string;
  saveState?: SaveState;
}

export const JournalEditor = forwardRef<JournalEditorRef, JournalEditorProps>(
  function JournalEditor(
    {
      value,
      onChangeText,
      placeholder = 'Write your thoughts...',
      testID = 'journal-editor-input',
      gregorianDisplay,
      hijriDisplay,
      saveState = 'idle',
    },
    ref
  ) {
    const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      openFocusMode: () => {
        setModalVisible(true);
      },
    }));

    // Word count & read time
    const trimmed = value.trim();
    const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    const readMin = Math.max(1, Math.ceil(wordCount / 150));

    return (
      <JournalCard
        icon={<JournalEntryHeaderBadgeIcon size={26} />}
        title="Today's Entry"
        testID="journal-editor-card"
        headerRight={
          <Pressable
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open distraction-free full screen writing mode"
            style={({ pressed }) => [
              styles.focusModeButton,
              {
                backgroundColor: pressed
                  ? colors.primaryLight
                  : (isDark ? 'rgba(15, 159, 74, 0.18)' : 'rgba(15, 159, 74, 0.08)'),
                borderColor: isDark ? 'rgba(15, 159, 74, 0.3)' : 'rgba(15, 159, 74, 0.2)',
                borderRadius: radii.pill,
                minHeight: touchTargets.min,
              },
            ]}
            testID="journal-fullscreen-btn"
          >
            <Image
              source={JOURNAL_ACTION_ASSETS.focusPencilGreen}
              style={{
                width: 14,
                height: 14,
                tintColor: isDark ? colors.primary : undefined,
              }}
              resizeMode="contain"
            />
            <Text
              style={[
                typography.labelSmall,
                { color: colors.primaryDark, marginStart: 4 },
              ]}
            >
              Focus Mode
            </Text>
          </Pressable>
        }
      >
        {/* Bordered Rounded Input Box */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : colors.background,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              borderRadius: radii.md ?? 12,
            },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect
            spellCheck
            style={[
              styles.input,
              typography.bodyLarge,
              {
                color: colors.textPrimary,
                lineHeight: 22,
              },
            ]}
            accessibilityLabel="Journal entry body"
            accessibilityHint="Write your thoughts for this planning day"
            testID={testID}
          />
        </View>

        {/* Footer: Tips or word count + save state on left, Expand on right */}
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            {wordCount > 0 ? (
              <View style={styles.metricsRow}>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, fontSize: 11 },
                  ]}
                  testID="journal-word-count"
                >
                  📝 {wordCount} words • ~{readMin} min read
                </Text>
                <View style={styles.saveStatusWrapper}>
                  <JournalSaveStatus state={saveState} />
                </View>
              </View>
            ) : (
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, fontSize: 11 },
                ]}
                testID="journal-word-count"
              >
                💡 Tap Focus Mode for distraction-free writing
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => setModalVisible(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Expand editor"
            style={({ pressed }) => [
              styles.expandButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: colors.primary, fontSize: 12 },
              ]}
            >
              Expand
            </Text>
            <Image
              source={JOURNAL_ACTION_ASSETS.expandArrowGreen}
              style={{
                width: 12,
                height: 12,
                marginStart: 3,
                tintColor: isDark ? colors.primary : undefined,
              }}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        {/* Full-Screen Writing Modal */}
        <JournalWriteModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          value={value}
          onChangeText={onChangeText}
          gregorianDisplay={gregorianDisplay}
          hijriDisplay={hijriDisplay}
          saveState={saveState}
        />
      </JournalCard>
    );
  }
);

const styles = StyleSheet.create({
  focusModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  inputContainer: {
    borderWidth: 1,
    padding: 12,
    minHeight: 110,
  },
  input: {
    minHeight: 86,
    padding: 0,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  footerLeft: {
    flex: 1,
    paddingEnd: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  saveStatusWrapper: {
    marginStart: 4,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
