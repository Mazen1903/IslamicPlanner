import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ReminderSubView } from '../reminder/ReminderSubView';
import { ReminderStyleSubView } from '../reminder/ReminderStyleSubView';
import { SoundPicker } from '../reminder/SoundPicker';
import { REMINDER_SOUNDS } from '@/constants/reminderSounds';
import { REMINDER_BACKGROUNDS } from '@/constants/reminderBackgrounds';

let mockIsPremium = false;
jest.mock('@/hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    isLoading: false,
    isPremium: mockIsPremium,
    tier: mockIsPremium ? 'PREMIUM' : 'FREE',
    hasFeature: () => mockIsPremium,
    error: null,
    reload: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('Reminder Views (Phase 2 Reminders 2.0)', () => {
  beforeEach(() => {
    mockIsPremium = false;
  });
  describe('ReminderSubView', () => {
    const defaultProps = {
      taskTitle: 'Read Surah Al-Kahf',
      scheduleMode: 'EXACT_TIME' as const,
      reminderEnabled: true,
      reminders: [-15],
      prayerAnchors: [],
      reminderTimeOfDay: null,
      reminderType: 'STANDARD' as const,
      enhancedMode: 'FULL_SCREEN' as const,
      soundId: 'default',
      customSoundUri: null,
      playbackCount: 1 as const,
      backgroundId: 'night_mosque',
      timeSensitive: false,
      nag: false,
      onToggleEnabled: jest.fn(),
      onAddReminder: jest.fn(),
      onRemoveReminder: jest.fn(),
      onAddPrayerAnchor: jest.fn(),
      onRemovePrayerAnchor: jest.fn(),
      onSetTimeOfDay: jest.fn(),
      onSetReminderType: jest.fn(),
      onSetEnhancedMode: jest.fn(),
      onSetSoundId: jest.fn(),
      onSetTimeSensitive: jest.fn(),
      onSetNag: jest.fn(),
      onOpenAlarmStyle: jest.fn(),
      onBack: jest.fn(),
    };

    it('renders header, title, and master toggle correctly', async () => {
      const { getByText, getByTestId } = await render(
        <ThemeProvider>
          <ReminderSubView {...defaultProps} />
        </ThemeProvider>
      );

      expect(getByText('Reminder')).toBeTruthy();
      expect(getByText('Set timely alerts and alarms')).toBeTruthy();
      const masterSwitch = getByTestId('reminder-master-switch');
      expect(masterSwitch).toBeTruthy();

      await fireEvent(masterSwitch, 'valueChange', false);
      expect(defaultProps.onToggleEnabled).toHaveBeenCalledWith(false);
    });

    it('toggles preset chips on press', async () => {
      const onAddReminder = jest.fn();
      const onRemoveReminder = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <ReminderSubView
            {...defaultProps}
            reminders={[-15]}
            onAddReminder={onAddReminder}
            onRemoveReminder={onRemoveReminder}
          />
        </ThemeProvider>
      );

      // -15 is currently selected -> tapping removes it
      await fireEvent.press(getByTestId('preset-chip--15'));
      expect(onRemoveReminder).toHaveBeenCalledWith(-15);

      // 0 (At task time) is not selected -> tapping adds it
      await fireEvent.press(getByTestId('preset-chip-0'));
      expect(onAddReminder).toHaveBeenCalledWith(0);
    });

    it('opens custom drawer and adds custom offset duration', async () => {
      const onAddReminder = jest.fn();

      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <ReminderSubView
            {...defaultProps}
            reminders={[]}
            onAddReminder={onAddReminder}
          />
        </ThemeProvider>
      );

      expect(queryByTestId('custom-reminder-drawer')).toBeNull();

      // Open drawer
      await fireEvent.press(getByTestId('preset-chip-custom'));
      expect(getByTestId('custom-reminder-drawer')).toBeTruthy();

      // Add default 20m before
      await fireEvent.press(getByTestId('add-custom-offset-btn'));
      expect(onAddReminder).toHaveBeenCalledWith(-20);
    });

    it('displays active reminders with delete buttons', async () => {
      const onRemoveReminder = jest.fn();

      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <ReminderSubView
            {...defaultProps}
            reminders={[-30]}
            onRemoveReminder={onRemoveReminder}
          />
        </ThemeProvider>
      );

      expect(getByText('30 min before')).toBeTruthy();
      const deleteBtn = getByTestId('delete-reminder--30');
      await fireEvent.press(deleteBtn);
      expect(onRemoveReminder).toHaveBeenCalledWith(-30);
    });

    it('switches between standard and enhanced alarm types', async () => {
      const onSetReminderType = jest.fn();
      const onOpenAlarmStyle = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <ReminderSubView
            {...defaultProps}
            reminderType="ENHANCED"
            onSetReminderType={onSetReminderType}
            onOpenAlarmStyle={onOpenAlarmStyle}
          />
        </ThemeProvider>
      );

      await fireEvent.press(getByTestId('type-card-standard'));
      expect(onSetReminderType).toHaveBeenCalledWith('STANDARD');

      // Enhanced alarm style customization launcher
      const customizeBtn = getByTestId('customize-alarm-style-btn');
      await fireEvent.press(customizeBtn);
      expect(onOpenAlarmStyle).toHaveBeenCalled();
    });

    it('handles back button navigation', async () => {
      const onBack = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <ReminderSubView {...defaultProps} onBack={onBack} />
        </ThemeProvider>
      );

      await fireEvent.press(getByTestId('reminder-subview-back-btn'));
      expect(onBack).toHaveBeenCalled();
    });

    it('triggers paywall sheet when selecting enhanced alarm without premium', async () => {
      const onSetReminderType = jest.fn();

      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <ReminderSubView
            {...defaultProps}
            reminderType="STANDARD"
            onSetReminderType={onSetReminderType}
          />
        </ThemeProvider>
      );

      expect(queryByTestId('paywall-sheet')).toBeNull();
      await fireEvent.press(getByTestId('type-card-enhanced'));
      // Free user: type is NOT changed until purchase; paywall opens instead
      expect(onSetReminderType).not.toHaveBeenCalled();
      expect(getByTestId('paywall-sheet')).toBeTruthy();
    });

    it('selects enhanced alarm directly for premium users', async () => {
      mockIsPremium = true;
      const onSetReminderType = jest.fn();

      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <ReminderSubView
            {...defaultProps}
            reminderType="STANDARD"
            onSetReminderType={onSetReminderType}
          />
        </ThemeProvider>
      );

      await fireEvent.press(getByTestId('type-card-enhanced'));
      expect(onSetReminderType).toHaveBeenCalledWith('ENHANCED');
      expect(queryByTestId('paywall-sheet')).toBeNull();
    });
  });

  describe('ReminderStyleSubView', () => {
    const defaultProps = {
      taskTitle: 'Morning Dhikr & Quran',
      backgroundId: 'night_mosque',
      soundId: 'default',
      playbackCount: 1 as const,
      onUpdateBackgroundId: jest.fn(),
      onUpdateSoundId: jest.fn(),
      onUpdatePlaybackCount: jest.fn(),
      onBack: jest.fn(),
    };

    it('renders live preview card with task title', async () => {
      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <ReminderStyleSubView {...defaultProps} />
        </ThemeProvider>
      );

      expect(getByTestId('lockscreen-alarm-preview')).toBeTruthy();
      expect(getByText('Morning Dhikr & Quran')).toBeTruthy();
      expect(getByText('Alarm Style')).toBeTruthy();
    });

    it('allows selecting background wallpaper', async () => {
      const onUpdateBackgroundId = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <ReminderStyleSubView
            {...defaultProps}
            onUpdateBackgroundId={onUpdateBackgroundId}
          />
        </ThemeProvider>
      );

      const targetBg = REMINDER_BACKGROUNDS[2];
      await fireEvent.press(getByTestId(`bg-option-${targetBg.id}`));
      expect(onUpdateBackgroundId).toHaveBeenCalledWith(targetBg.id);
    });

    it('allows changing repeat count', async () => {
      const onUpdatePlaybackCount = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <ReminderStyleSubView
            {...defaultProps}
            onUpdatePlaybackCount={onUpdatePlaybackCount}
          />
        </ThemeProvider>
      );

      await fireEvent.press(getByTestId('playback-3'));
      expect(onUpdatePlaybackCount).toHaveBeenCalledWith(3);

      await fireEvent.press(getByTestId('playback-loop'));
      expect(onUpdatePlaybackCount).toHaveBeenCalledWith('LOOP');
    });

    it('calls onBack when back button pressed', async () => {
      const onBack = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <ReminderStyleSubView {...defaultProps} onBack={onBack} />
        </ThemeProvider>
      );

      await fireEvent.press(getByTestId('reminder-style-back-btn'));
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('SoundPicker', () => {
    const defaultProps = {
      visible: true,
      onClose: jest.fn(),
      selectedSoundId: 'default',
      onSelectSound: jest.fn(),
    };

    it('renders sound list and allows selection', async () => {
      const onSelectSound = jest.fn();

      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <SoundPicker {...defaultProps} onSelectSound={onSelectSound} />
        </ThemeProvider>
      );

      expect(getByText('Choose Sound')).toBeTruthy();

      const sound = REMINDER_SOUNDS[1];
      await fireEvent.press(getByTestId(`sound-item-${sound.id}`));
      expect(onSelectSound).toHaveBeenCalledWith(sound.id);
    });

    it('does not render when visible is false', async () => {
      const { queryByTestId } = await render(
        <ThemeProvider>
          <SoundPicker {...defaultProps} visible={false} />
        </ThemeProvider>
      );

      expect(queryByTestId('sound-picker-modal')).toBeNull();
    });
  });
});
