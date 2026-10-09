import React from 'react';
import { View, Text, Image, type StyleProp, type ViewStyle, type ImageSourcePropType } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme, type ThemeColors } from '@/theme';
import { PremiumLanternIcon } from '@/components/common/PremiumLanternIcon';

export interface SettingsIconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

// Background and illustration asset definitions retained for full compatibility
export const SETTINGS_ICONS = {
  // Main Hub Badges
  hubMosque: require('../../../assets/icons/settings/hub_mosque.png') as ImageSourcePropType,
  hubPlanner: require('../../../assets/icons/settings/hub_planner.png') as ImageSourcePropType,
  hubNotifications: require('../../../assets/icons/settings/hub_notifications.png') as ImageSourcePropType,
  hubAppearance: require('../../../assets/icons/settings/hub_appearance.png') as ImageSourcePropType,
  hubCalendar: require('../../../assets/icons/settings/hub_calendar.png') as ImageSourcePropType,
  hubWorship: require('../../../assets/icons/settings/hub_worship.png') as ImageSourcePropType,
  hubAccount: require('../../../assets/icons/settings/hub_account.png') as ImageSourcePropType,
  hubPremium: require('../../../assets/icons/settings/hub_premium.png') as ImageSourcePropType,
  hubAbout: require('../../../assets/icons/settings/hub_about.png') as ImageSourcePropType,

  // Prayer & Location Section Badges & Elements
  secLocation: require('../../../assets/icons/settings/sec_location.png') as ImageSourcePropType,
  rowManualPin: require('../../../assets/icons/settings/row_manual_pin.png') as ImageSourcePropType,
  secCalculator: require('../../../assets/icons/settings/sec_calculator.png') as ImageSourcePropType,
  secAsrSun: require('../../../assets/icons/settings/sec_asr_sun.png') as ImageSourcePropType,
  rowAsrCheck: require('../../../assets/icons/settings/row_asr_check.png') as ImageSourcePropType,
  secAdjustSliders: require('../../../assets/icons/settings/sec_adjust_sliders.png') as ImageSourcePropType,
  rowPreviewClock: require('../../../assets/icons/settings/row_preview_clock.png') as ImageSourcePropType,
  secInfoCircle: require('../../../assets/icons/settings/sec_info_circle.png') as ImageSourcePropType,
  btnBack: require('../../../assets/icons/settings/btn_back.png') as ImageSourcePropType,
  stepperMinus: require('../../../assets/icons/settings/stepper_minus.png') as ImageSourcePropType,
  stepperPlus: require('../../../assets/icons/settings/stepper_plus.png') as ImageSourcePropType,
  rowChevronDown: require('../../../assets/icons/settings/row_chevron_down.png') as ImageSourcePropType,

  // Planner Settings Section Badges & Elements
  secDayStartClock: require('../../../assets/icons/settings/sec_day_start_clock.png') as ImageSourcePropType,
  badgeGoldLock: require('../../../assets/icons/settings/badge_gold_lock.png') as ImageSourcePropType,
  secCompletedCheck: require('../../../assets/icons/settings/sec_completed_check.png') as ImageSourcePropType,
  secOverdueBolt: require('../../../assets/icons/settings/sec_overdue_bolt.png') as ImageSourcePropType,

  // Notifications Section Badges
  secPrayerAlertsMosque: require('../../../assets/icons/settings/sec_prayer_alerts_mosque.png') as ImageSourcePropType,
  secTaskRemindersCheck: require('../../../assets/icons/settings/sec_task_reminders_check.png') as ImageSourcePropType,
  secWorshipStar: require('../../../assets/icons/settings/sec_worship_star.png') as ImageSourcePropType,
  secGeneralBell: require('../../../assets/icons/settings/sec_general_bell.png') as ImageSourcePropType,

  // Appearance Section Badges & Thumbnails
  secThemePalette: require('../../../assets/icons/settings/sec_theme_palette.png') as ImageSourcePropType,
  secColorBrush: require('../../../assets/icons/settings/sec_color_brush.png') as ImageSourcePropType,
  secBgImage: require('../../../assets/icons/settings/sec_bg_image.png') as ImageSourcePropType,
  secDisplayAa: require('../../../assets/icons/settings/sec_display_aa.png') as ImageSourcePropType,
  optThemeSun: require('../../../assets/icons/settings/opt_theme_sun.png') as ImageSourcePropType,
  optThemeMoon: require('../../../assets/icons/settings/opt_theme_moon.png') as ImageSourcePropType,
  optThemeMonitor: require('../../../assets/icons/settings/opt_theme_monitor.png') as ImageSourcePropType,
  optCheckedGreen: require('../../../assets/icons/settings/opt_checked_green.png') as ImageSourcePropType,

  // Calendar Settings Section Badges
  calDateSystem: require('../../../assets/icons/settings/cal_date_system.png') as ImageSourcePropType,
  calIslamicDates: require('../../../assets/icons/settings/cal_islamic_dates.png') as ImageSourcePropType,
  calIslamicEvents: require('../../../assets/icons/settings/cal_islamic_events.png') as ImageSourcePropType,
  calEventNotif: require('../../../assets/icons/settings/cal_event_notif.png') as ImageSourcePropType,
  calPreferredView: require('../../../assets/icons/settings/cal_preferred_view.png') as ImageSourcePropType,
  calInfoCircle: require('../../../assets/icons/settings/cal_info_circle.png') as ImageSourcePropType,

  // Account & Sync Section Badges
  accSignIn: require('../../../assets/icons/settings/acc_sign_in.png') as ImageSourcePropType,
  accCloudSync: require('../../../assets/icons/settings/acc_cloud_sync.png') as ImageSourcePropType,
  accConnectedDevices: require('../../../assets/icons/settings/acc_connected_devices.png') as ImageSourcePropType,
  accSyncNow: require('../../../assets/icons/settings/acc_sync_now.png') as ImageSourcePropType,
  accDataMgmt: require('../../../assets/icons/settings/acc_data_mgmt.png') as ImageSourcePropType,
  accSecurityShield: require('../../../assets/icons/settings/acc_security_shield.png') as ImageSourcePropType,

  // Premium Screen Badges
  premCrown: require('../../../assets/icons/settings/prem_crown.png') as ImageSourcePropType,
  premGiftMission: require('../../../assets/icons/settings/prem_gift_mission.png') as ImageSourcePropType,

  // About & Help Section Badges
  aboutHelpCenter: require('../../../assets/icons/settings/about_help_center.png') as ImageSourcePropType,
  aboutContactSupport: require('../../../assets/icons/settings/about_contact_support.png') as ImageSourcePropType,
  aboutPrivacyPolicy: require('../../../assets/icons/settings/about_privacy_policy.png') as ImageSourcePropType,
  aboutTerms: require('../../../assets/icons/settings/about_terms.png') as ImageSourcePropType,
  aboutRateStar: require('../../../assets/icons/settings/about_rate_star.png') as ImageSourcePropType,

  // Bottom Navigation Bar Icons
  navHome: require('../../../assets/icons/nav/nav_home.png') as ImageSourcePropType,
  navCalendar: require('../../../assets/icons/nav/nav_calendar.png') as ImageSourcePropType,
  navTasks: require('../../../assets/icons/nav/nav_tasks.png') as ImageSourcePropType,
  navProgress: require('../../../assets/icons/nav/nav_progress.png') as ImageSourcePropType,
  navLibrary: require('../../../assets/icons/nav/nav_library.png') as ImageSourcePropType,
  navMore: require('../../../assets/icons/nav/nav_more.png') as ImageSourcePropType,

  // Background Thumbnails
  bgDefault: require('../../../assets/illustrations/settings_bg_default.png') as ImageSourcePropType,
  bgMinimal: require('../../../assets/illustrations/settings_bg_minimal.png') as ImageSourcePropType,
  bgDesert: require('../../../assets/illustrations/settings_bg_desert.png') as ImageSourcePropType,
  bgMasjid: require('../../../assets/illustrations/settings_bg_masjid.png') as ImageSourcePropType,
  bgNone: require('../../../assets/illustrations/settings_bg_none.png') as ImageSourcePropType,
};

/**
 * Factory for creating crisp, high-resolution vector squircle badges
 */
function createSettingsBadgeIcon({
  defaultSize = 40,
  label,
  getBgColor,
  renderIcon,
}: {
  defaultSize?: number;
  label: string;
  getBgColor: (colors: ThemeColors) => string;
  renderIcon: (glyphSize: number, colors: ThemeColors) => React.ReactNode;
}) {
  return function SettingsBadgeIconComponent({
    size = defaultSize,
    style,
    testID,
    accessibilityLabel = label,
  }: SettingsIconProps) {
    const { colors } = useTheme();
    const glyphSize = Math.round(size * 0.52);
    const borderRadius = Math.round(size * 0.28);
    const bgColor = getBgColor(colors);

    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: bgColor,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        testID={testID}
      >
        {renderIcon(glyphSize, colors)}
      </View>
    );
  };
}

/**
 * Factory for creating crisp image-based squircle badges from assets
 */
function createSettingsHubImageIcon({
  source,
  label,
  defaultSize = 44,
}: {
  source: ImageSourcePropType;
  label: string;
  defaultSize?: number;
}) {
  return function SettingsHubImageIconComponent({
    size = defaultSize,
    style,
    testID,
    accessibilityLabel = label,
  }: SettingsIconProps) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        testID={testID}
      >
        <Image
          source={source}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
    );
  };
}

// ─── 1. Main Hub Badges ───────────────────────────────────────────────────────
export const SettingsHubMosqueIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubMosque,
  label: 'Prayer & Location',
});

export const SettingsHubPlannerIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubPlanner,
  label: 'Planner',
});

export const SettingsHubNotificationsIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubNotifications,
  label: 'Notifications',
});

export const SettingsHubAppearanceIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubAppearance,
  label: 'Appearance',
});

export const SettingsAppearanceModeIcon = createSettingsBadgeIcon({
  defaultSize: 36,
  label: 'Appearance Mode',
  getBgColor: colors => colors.prayerFajr ?? 'rgba(43, 43, 92, 0.12)',
  renderIcon: (size, colors) => (
    <Ionicons name="color-palette" size={size} color={colors.primary} />
  ),
});

export const SettingsHubCalendarIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubCalendar,
  label: 'Calendar',
});

export const SettingsHubWorshipIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubWorship,
  label: 'Worship Suggestions',
});

export const SettingsHubAccountIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubAccount,
  label: 'Account & Sync',
});

export const SettingsHubPremiumIcon = createSettingsBadgeIcon({
  defaultSize: 44,
  label: 'Premium',
  getBgColor: colors => colors.prayerAsr,
  renderIcon: (size) => <PremiumLanternIcon size={Math.round(size * 0.9)} glow />,
});

export const SettingsHubAboutIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.hubAbout,
  label: 'About',
});

// ─── 2. Sub-Screen Section Badges ─────────────────────────────────────────────
export const SettingsSecLocationIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secLocation,
  label: 'Location',
  defaultSize: 40,
});

export const SettingsSecCalculatorIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secCalculator,
  label: 'Calculation Method',
  defaultSize: 40,
});

export const SettingsSecAsrSunIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secAsrSun,
  label: 'Asr Calculation Method',
  defaultSize: 40,
});

export const SettingsSecAdjustSlidersIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secAdjustSliders,
  label: 'Adjust Prayer Times',
  defaultSize: 40,
});

export const SettingsSecDayStartClockIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secDayStartClock,
  label: 'Day Start',
  defaultSize: 40,
});

export const SettingsSecCompletedCheckIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secCompletedCheck,
  label: 'Completed Tasks',
  defaultSize: 40,
});

export const SettingsSecOverdueBoltIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secOverdueBolt,
  label: 'Overdue Tasks',
  defaultSize: 40,
});

export const SettingsSecPrayerAlertsIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secPrayerAlertsMosque,
  label: 'Prayer Alerts',
  defaultSize: 40,
});

export const SettingsSecTaskRemindersIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secTaskRemindersCheck,
  label: 'Task Reminders',
  defaultSize: 40,
});

export const SettingsSecWorshipStarIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Worship Suggestions',
  getBgColor: colors => colors.prayerAsr,
  renderIcon: (size, colors) => <Ionicons name="star-outline" size={size} color={colors.warning} />,
});

export const SettingsSecJournalReminderIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Daily Journal',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => <Ionicons name="book-outline" size={size} color={colors.primary} />,
});

export const SettingsSecGeneralBellIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secGeneralBell,
  label: 'General',
  defaultSize: 40,
});

export const SettingsSecThemePaletteIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secThemePalette,
  label: 'Theme',
  defaultSize: 40,
});

export const SettingsSecColorBrushIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secColorBrush,
  label: 'Color',
  defaultSize: 40,
});

export const SettingsSecBgImageIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secBgImage,
  label: 'Background',
  defaultSize: 40,
});

export const SettingsSecDisplayAaIcon = createSettingsHubImageIcon({
  source: SETTINGS_ICONS.secDisplayAa,
  label: 'Display',
  defaultSize: 40,
});

export const SettingsCalDateSystemIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Date System',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => (
    <MaterialCommunityIcons name="calendar-range" size={size} color={colors.primary} />
  ),
});

export const SettingsCalIslamicDatesIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Show Islamic Dates',
  getBgColor: colors => colors.prayerIsha,
  renderIcon: (size, colors) => (
    <MaterialCommunityIcons name="moon-waning-crescent" size={size} color={colors.info} />
  ),
});

export const SettingsCalIslamicEventsIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Islamic Events',
  getBgColor: colors => colors.prayerAsr,
  renderIcon: (size, colors) => <Ionicons name="star-outline" size={size} color={colors.warning} />,
});

export const SettingsCalEventNotifIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Event Notifications',
  getBgColor: colors => colors.dangerSurface,
  renderIcon: (size, colors) => <Ionicons name="notifications-outline" size={size} color={colors.danger} />,
});

export const SettingsCalPreferredViewIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Preferred Calendar View',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => (
    <MaterialCommunityIcons name="view-agenda-outline" size={size} color={colors.primary} />
  ),
});

export const SettingsAccSignInIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Sign In',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => <Ionicons name="log-in-outline" size={size} color={colors.primary} />,
});

export const SettingsAccCloudSyncIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Cloud Sync',
  getBgColor: colors => colors.prayerIsha,
  renderIcon: (size, colors) => <Ionicons name="cloud-upload-outline" size={size} color={colors.info} />,
});

export const SettingsAccConnectedDevicesIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Connected Devices',
  getBgColor: colors => colors.surfaceSecondary,
  renderIcon: (size, colors) => (
    <MaterialCommunityIcons name="devices" size={size} color={colors.textSecondary} />
  ),
});

export const SettingsAccSyncNowIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Sync Now',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => <Ionicons name="sync-outline" size={size} color={colors.primary} />,
});

export const SettingsAccDataMgmtIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Data Management',
  getBgColor: colors => colors.surfaceSecondary,
  renderIcon: (size, colors) => <Ionicons name="server-outline" size={size} color={colors.textSecondary} />,
});

export const SettingsAccExportIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Export Backup',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => <Ionicons name="share-outline" size={size} color={colors.primary} />,
});

export const SettingsAccImportIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Import Backup',
  getBgColor: colors => colors.prayerFajr,
  renderIcon: (size, colors) => <Ionicons name="download-outline" size={size} color={colors.primary} />,
});

export const SettingsAccEraseIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Erase All Data',
  getBgColor: colors => colors.dangerSurface,
  renderIcon: (size, colors) => <Ionicons name="trash-outline" size={size} color={colors.error} />,
});

export const SettingsAccSecurityShieldIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Encrypted and Secure',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => (
    <Ionicons name="shield-checkmark-outline" size={size} color={colors.primary} />
  ),
});

export const SettingsPremCrownIcon = createSettingsBadgeIcon({
  defaultSize: 44,
  label: 'Go Premium',
  getBgColor: colors => colors.prayerAsr,
  renderIcon: (size) => <PremiumLanternIcon size={Math.round(size * 0.9)} glow />,
});

export const SettingsPremGiftMissionIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Support Our Mission',
  getBgColor: colors => colors.dangerSurface,
  renderIcon: (size, colors) => <Ionicons name="gift-outline" size={size} color={colors.danger} />,
});

export const SettingsAboutHelpCenterIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Help Center',
  getBgColor: colors => colors.surfaceSecondary,
  renderIcon: (size, colors) => (
    <Ionicons name="help-circle-outline" size={size} color={colors.textSecondary} />
  ),
});

export const SettingsAboutContactSupportIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Contact Support',
  getBgColor: colors => colors.primaryLight,
  renderIcon: (size, colors) => <Ionicons name="mail-outline" size={size} color={colors.primary} />,
});

export const SettingsAboutPrivacyPolicyIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Privacy Policy',
  getBgColor: colors => colors.surfaceSecondary,
  renderIcon: (size, colors) => <Ionicons name="shield-outline" size={size} color={colors.textSecondary} />,
});

export const SettingsAboutTermsIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Terms of Service',
  getBgColor: colors => colors.surfaceSecondary,
  renderIcon: (size, colors) => (
    <Ionicons name="document-text-outline" size={size} color={colors.textSecondary} />
  ),
});

export const SettingsAboutRateStarIcon = createSettingsBadgeIcon({
  defaultSize: 40,
  label: 'Rate the App',
  getBgColor: colors => colors.prayerAsr,
  renderIcon: (size, colors) => <Ionicons name="star" size={size} color={colors.warning} />,
});

// ─── 3. Standalone Icons ──────────────────────────────────────────────────────
export function SettingsBackButtonIcon({
  size = 32,
  style,
  testID,
  accessibilityLabel = 'Back',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.btnBack}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsRowManualPinIcon({
  size = 28,
  style,
  testID,
  accessibilityLabel = 'Manual Location Pin',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.rowManualPin}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsRowAsrCheckIcon({
  size = 22,
  style,
  testID,
  accessibilityLabel = 'Selected',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.rowAsrCheck}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsCheckCircleIcon({
  size = 22,
  style,
  testID,
  accessibilityLabel = 'Selected',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.rowAsrCheck}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsRowPreviewClockIcon({
  size = 36,
  style,
  testID,
  accessibilityLabel = 'Preview Clock',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.rowPreviewClock}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsSecInfoCircleIcon({
  size = 36,
  style,
  testID,
  accessibilityLabel = 'Info',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.secInfoCircle}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsStepperMinusIcon({
  size = 32,
  style,
  testID,
  accessibilityLabel = 'Decrease',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.stepperMinus}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsStepperPlusIcon({
  size = 32,
  style,
  testID,
  accessibilityLabel = 'Increase',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.stepperPlus}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsRowChevronDownIcon({
  size = 20,
  style,
  testID,
  accessibilityLabel = 'Expand',
}: SettingsIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Image
        source={SETTINGS_ICONS.rowChevronDown}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function SettingsCalInfoCircleIcon({
  size = 36,
  style,
  testID,
  accessibilityLabel = 'Info',
}: SettingsIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons name="information-circle-outline" size={size} color={colors.textTertiary} />
    </View>
  );
}

export function SettingsOptThemeSun({
  size = 36,
  style,
  testID,
  accessibilityLabel = 'Light Theme',
}: SettingsIconProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          backgroundColor: '#FFF7ED',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(245, 158, 11, 0.25)',
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons name="sunny" size={Math.round(size * 0.58)} color="#F59E0B" />
    </View>
  );
}

export function SettingsOptThemeMoon({
  size = 36,
  style,
  testID,
  accessibilityLabel = 'Dark Theme',
}: SettingsIconProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          backgroundColor: '#1E1B4B',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(129, 140, 248, 0.3)',
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons name="moon" size={Math.round(size * 0.55)} color="#818CF8" />
    </View>
  );
}

export function SettingsOptThemeMonitor({
  size = 36,
  style,
  testID,
  accessibilityLabel = 'System Theme',
}: SettingsIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          backgroundColor: colors.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="theme-light-dark"
        size={Math.round(size * 0.6)}
        color={colors.primary}
      />
    </View>
  );
}

// ─── 4. Navigation Icons (tintable vector icons) ──────────────────────────────
export function NavHomeIcon({
  size = 22,
  color,
  style,
  testID,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <Ionicons name="home" size={size} color={color ?? colors.tabInactive} />
    </View>
  );
}

export function NavPlannerIcon({
  size = 22,
  color,
  style,
  testID,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={size} color={color ?? colors.tabInactive} />
    </View>
  );
}

export function NavCalendarIcon({
  size = 22,
  color,
  style,
  testID,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <MaterialCommunityIcons name="calendar-month-outline" size={size} color={color ?? colors.tabInactive} />
    </View>
  );
}

export function NavTasksIcon({
  size = 22,
  color,
  style,
  testID,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={size} color={color ?? colors.tabInactive} />
    </View>
  );
}

export function NavProgressIcon({
  size = 22,
  color,
  style,
  testID,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <Ionicons name="trending-up" size={size} color={color ?? colors.tabInactive} />
    </View>
  );
}

export function NavLibraryIcon({
  size = 22,
  color,
  style,
  testID,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <Ionicons name="book-outline" size={size} color={color ?? colors.tabInactive} />
    </View>
  );
}

export function NavMoreIcon({
  size = 22,
  color,
  style,
  testID,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} testID={testID}>
      <Ionicons name="ellipsis-horizontal" size={size} color={color ?? colors.tabInactive} />
    </View>
  );
}

// ─── 5. Premium Lock Badge ───────────────────────────────────────────────────
export function SettingsBadgeGoldLock({
  style,
  testID,
  width = 68,
  height = 21,
}: {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  width?: number;
  height?: number;
}) {
  const { colors, radii } = useTheme();
  return (
    <View
      style={[
        {
          minWidth: width,
          height,
          backgroundColor: colors.prayerAsr,
          borderColor: colors.warning,
          borderWidth: 1,
          borderRadius: radii.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
        },
        style,
      ]}
      accessibilityLabel="Premium Feature"
      accessibilityRole="image"
      testID={testID}
    >
      <PremiumLanternIcon size={12} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.warning, marginLeft: 3 }}>
        PRO
      </Text>
    </View>
  );
}
