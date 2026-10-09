import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { AppBackButton } from '@/components/common/AppBackButton';
import { REMINDER_BACKGROUNDS, getBackgroundById } from '@/constants/reminderBackgrounds';
import { getSoundById } from '@/constants/reminderSounds';
import { SoundPicker } from './SoundPicker';

export interface ReminderStyleSubViewProps {
  taskTitle: string;
  backgroundId: string;
  soundId: string;
  playbackCount: 1 | 3 | 'LOOP';
  onUpdateBackgroundId: (bgId: string) => void;
  onUpdateSoundId: (soundId: string) => void;
  onUpdatePlaybackCount: (count: 1 | 3 | 'LOOP') => void;
  onBack: () => void;
}

export function ReminderStyleSubView({
  taskTitle,
  backgroundId,
  soundId,
  playbackCount,
  onUpdateBackgroundId,
  onUpdateSoundId,
  onUpdatePlaybackCount,
  onBack,
}: ReminderStyleSubViewProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const activeBackground = getBackgroundById(backgroundId);
  const activeSound = getSoundById(soundId);

  return (
    <View style={styles.container} testID="reminder-style-subview">
      {/* Navigation Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <AppBackButton
          onPress={onBack}
          accessibilityLabel="Back to reminder settings"
          testID="reminder-style-back-btn"
          size={40}
        />

        <View style={styles.headerTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
            Alarm Style
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Customize full-screen lock screen appearance
          </Text>
        </View>

        <View style={{ width: touchTargets.min }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Live Lock Screen Mockup Card */}
        <View
          style={[
            styles.previewFrame,
            shadows.elevated,
            {
              backgroundColor: activeBackground.colorGradient[0],
              borderColor: colors.border,
              borderRadius: radii.xl,
            },
          ]}
          testID="lockscreen-alarm-preview"
        >
          {/* Subtle gradient secondary tint */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: activeBackground.colorGradient[1],
                opacity: 0.7,
                borderRadius: radii.xl,
              },
            ]}
          />

          {/* Status bar mock */}
          <View style={styles.mockStatusBar}>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', fontSize: 11 }]}>02:30</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Icon name="bell" size={12} color="rgba(255,255,255,0.8)" decorative />
            </View>
          </View>

          {/* Clock Display */}
          <View style={styles.mockClockArea}>
            <Text style={[typography.displayLarge, styles.mockClockText]}>02:30</Text>
            <Text style={[typography.labelMedium, { color: 'rgba(255,255,255,0.85)', marginTop: 2 }]}>
              Tuesday, 6 October
            </Text>
          </View>

          {/* Task Title Banner */}
          <View style={[styles.mockTaskCard, { borderRadius: radii.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Icon name="bell" size={16} color="#FBBF24" decorative />
              <Text style={[typography.caption, { color: '#FBBF24', marginStart: 6, fontWeight: '700' }]}>
                TASK ALARM
              </Text>
            </View>
            <Text
              style={[
                typography.headlineMedium,
                { color: '#FFFFFF', fontWeight: '700', fontSize: 18, textAlign: 'center' },
              ]}
              numberOfLines={2}
            >
              {taskTitle.trim() || 'Important Spiritual Task'}
            </Text>
          </View>

          {/* Action Buttons Mock */}
          <View style={styles.mockButtonsRow}>
            <View style={[styles.mockActionButton, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radii.pill }]}>
              <Text style={[typography.labelMedium, { color: '#FFFFFF', fontWeight: '600' }]}>Snooze (10m)</Text>
            </View>
            <View style={[styles.mockActionButton, { backgroundColor: '#10B981', borderRadius: radii.pill }]}>
              <Text style={[typography.labelMedium, { color: '#FFFFFF', fontWeight: '700' }]}>Done</Text>
            </View>
          </View>
        </View>

        {/* 1. Wallpaper / Background Picker */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>
            Lock Screen Background
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 6, gap: 10 }}
        >
          {REMINDER_BACKGROUNDS.map(bg => {
            const isSelected = backgroundId === bg.id;
            return (
              <Pressable
                key={bg.id}
                onPress={() => onUpdateBackgroundId(bg.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Background: ${bg.name}`}
                testID={`bg-option-${bg.id}`}
                style={({ pressed }) => [
                  styles.bgCard,
                  isSelected && shadows.card,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2.5 : 1,
                    borderRadius: radii.md,
                    backgroundColor: bg.colorGradient[0],
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: bg.colorGradient[1],
                      opacity: 0.6,
                      borderRadius: radii.md,
                    },
                  ]}
                />
                <View style={styles.bgCardContent}>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={12} color={colors.textOnPrimary} decorative />
                    </View>
                  )}
                  <Text
                    style={[
                      typography.caption,
                      { color: '#FFFFFF', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 },
                    ]}
                    numberOfLines={1}
                  >
                    {bg.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 2. Sound Selector Row */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>
            Alarm Sound
          </Text>
        </View>

        <Pressable
          onPress={() => setShowSoundPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Change sound: ${activeSound.name}`}
          testID="alarm-sound-row"
          style={({ pressed }) => [
            styles.soundRow,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={[
                styles.soundIconBadge,
                {
                  backgroundColor: 'transparent',
                  borderRadius: radii.pill,
                  marginEnd: spacing.md,
                },
              ]}
            >
              <Icon name="bell" size={38} color={colors.primary} decorative />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                {activeSound.name}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                {activeSound.description || 'Tap to choose from bundled sounds or your audio'}
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={16} color={colors.textTertiary} directional decorative />
        </Pressable>

        {/* 3. Playback Repeats */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>
            Sound Playback
          </Text>
        </View>

        <View style={styles.playbackRow}>
          {([1, 3, 'LOOP'] as const).map(option => {
            const isSelected = playbackCount === option;
            const label = option === 1 ? 'Play Once' : option === 3 ? 'Repeat 3×' : 'Continuous Loop';
            const sub = option === 1 ? 'Single chime' : option === 3 ? 'Repeats 3 times' : 'Until dismissed';

            return (
              <Pressable
                key={String(option)}
                onPress={() => onUpdatePlaybackCount(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Playback: ${label}`}
                testID={`playback-${String(option).toLowerCase()}`}
                style={({ pressed }) => [
                  styles.playbackChip,
                  isSelected && shadows.card,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radii.md,
                    padding: spacing.sm,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? colors.primaryDark : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '600',
                      textAlign: 'center',
                    },
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textSecondary,
                      fontSize: 10,
                      textAlign: 'center',
                      marginTop: 2,
                    },
                  ]}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Sound Picker Modal */}
      <SoundPicker
        visible={showSoundPicker}
        onClose={() => setShowSoundPicker(false)}
        selectedSoundId={soundId}
        onSelectSound={id => {
          onUpdateSoundId(id);
          setShowSoundPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  previewFrame: {
    height: 280,
    width: '100%',
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  mockStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockClockArea: {
    alignItems: 'center',
  },
  mockClockText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 1,
    lineHeight: 52,
  },
  mockTaskCard: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 14,
    alignItems: 'center',
  },
  mockButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mockActionButton: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 8,
  },
  bgCard: {
    width: 90,
    height: 90,
    padding: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bgCardContent: {
    position: 'relative',
    zIndex: 2,
  },
  checkCircle: {
    position: 'absolute',
    top: -50,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  soundIconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackRow: {
    flexDirection: 'row',
    gap: 8,
  },
  playbackChip: {
    flex: 1,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
});
