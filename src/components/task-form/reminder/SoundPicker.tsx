import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { REMINDER_SOUNDS, type ReminderSoundItem } from '@/constants/reminderSounds';
import { soundPreviewService, type SoundPlaybackState } from '@/services/sound/SoundPreviewService';

export interface SoundPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedSoundId: string;
  onSelectSound: (soundId: string) => void;
  isPremium?: boolean;
}

export function SoundPicker({
  visible,
  onClose,
  selectedSoundId,
  onSelectSound,
  isPremium = true,
}: SoundPickerProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const [playbackState, setPlaybackState] = useState<SoundPlaybackState>({
    isPlaying: false,
    activeSoundId: null,
  });

  useEffect(() => {
    return soundPreviewService.subscribe(setPlaybackState);
  }, []);

  const handleTogglePlay = (soundId: string) => {
    if (playbackState.isPlaying && playbackState.activeSoundId === soundId) {
      soundPreviewService.stopPreview();
    } else {
      soundPreviewService.playPreview(soundId);
    }
  };

  const handlePickCustomFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const customId = `custom:${file.uri}`;
        onSelectSound(customId);
      }
    } catch {
      Alert.alert('Unable to load audio', 'Could not access the selected audio file.');
    }
  };

  const handleClose = () => {
    soundPreviewService.stopPreview();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.shadowElevated }]} testID="sound-picker-modal">
      <Pressable style={styles.backdrop} onPress={handleClose} accessible={false} />
      <View
        style={[
            styles.sheetContainer,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.lg,
              maxHeight: '80%',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                Choose Sound
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Preview and select your notification or alarm sound
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close sound picker"
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

          {/* Sound List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.sm }}>
            {REMINDER_SOUNDS.map(sound => {
              const isSelected = selectedSoundId === sound.id;
              const isSoundPlaying = playbackState.isPlaying && playbackState.activeSoundId === sound.id;

              return (
                <Pressable
                  key={sound.id}
                  onPress={() => onSelectSound(sound.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Sound: ${sound.name}`}
                  testID={`sound-item-${sound.id}`}
                  style={({ pressed }) => [
                    styles.soundItem,
                    isSelected && shadows.card,
                    {
                      backgroundColor: isSelected ? colors.primaryLight + '30' : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      marginBottom: spacing.xs,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={styles.soundItemLeft}>
                    {/* Play/Stop preview button */}
                    <Pressable
                      onPress={() => handleTogglePlay(sound.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={isSoundPlaying ? `Stop previewing ${sound.name}` : `Preview ${sound.name}`}
                      style={[
                        styles.playButton,
                        {
                          backgroundColor: isSoundPlaying ? colors.primary : colors.surfaceSecondary,
                          borderRadius: radii.pill,
                          marginEnd: spacing.md,
                        },
                      ]}
                    >
                      <Icon
                        name={isSoundPlaying ? 'close' : 'chevron-right'}
                        size={16}
                        color={isSoundPlaying ? colors.textOnPrimary : colors.primary}
                        decorative
                      />
                    </Pressable>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text
                          style={[
                            typography.labelLarge,
                            {
                              color: isSelected ? colors.primaryDark : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {sound.name}
                        </Text>
                        {sound.tier === 'PREMIUM' && (
                          <View
                            style={[
                              styles.proBadge,
                              { backgroundColor: colors.warning + '24', borderRadius: radii.pill },
                            ]}
                          >
                            <Text style={[typography.caption, { color: colors.warning, fontSize: 10, fontWeight: '700' }]}>
                              PRO
                            </Text>
                          </View>
                        )}
                      </View>
                      {sound.description && (
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          {sound.description}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Radio Indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.surface }]} />}
                  </View>
                </Pressable>
              );
            })}

            {/* Custom Sound via Document Picker */}
            <Pressable
              onPress={handlePickCustomFile}
              accessibilityRole="button"
              accessibilityLabel="Pick custom audio file"
              testID="pick-custom-sound-btn"
              style={({ pressed }) => [
                styles.customSoundBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginTop: spacing.sm,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.playButton,
                    {
                      backgroundColor: colors.primaryLight,
                      borderRadius: radii.pill,
                      marginEnd: spacing.md,
                    },
                  ]}
                >
                  <Icon name="document" size={18} color={colors.primary} decorative />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                    Choose Your Own Sound...
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                    Select an audio file (.mp3, .wav) from your device
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} directional decorative />
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </View>
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
  sheetContainer: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
  },
  soundItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginEnd: 12,
  },
  playButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginStart: 6,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  customSoundBtn: {
    borderWidth: 1,
  },
});
