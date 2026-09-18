/**
 * Widget color/style tokens for M18.
 *
 * Widget components cannot import from @/theme because widget bundle code
 * runs in an isolated runtime (iOS: WidgetKit; Android: AppWidget host).
 * All necessary design tokens are duplicated here as plain literals.
 *
 * M18 colour palette is a minimal functional subset.
 * Full design token alignment is deferred to M21 (Dark Mode).
 */

/** Brand palette */
export const COLORS = {
  /** Brand green: prayer indicator active */
  brandGreen: '#2ECC71',
  /** Brand green muted: prayer indicator inactive */
  brandGreenMuted: '#2ECC7144',

  /** Light theme */
  lightBackground: '#FFFFFF',
  lightSurface: '#F5F3EE',
  lightText: '#1A1A2E',
  lightTextMuted: '#6B7280',
  lightBorder: '#E5E7EB',

  /** Dark theme */
  darkBackground: '#1A1A2E',
  darkSurface: '#252541',
  darkText: '#F9FAFB',
  darkTextMuted: '#9CA3AF',
  darkBorder: '#374151',

  /** Priority indicator */
  importantAccent: '#F59E0B',
} as const;

/** Font sizes - matches minimum accessibility requirements */
export const FONT_SIZES = {
  /** Primary prayer label - iOS 14pt / Android 14sp */
  prayerName: 14,
  /** Time display - iOS 20pt / Android 20sp */
  prayerTime: 20,
  /** Task title - iOS 12pt minimum / Android 12sp minimum */
  taskTitle: 12,
  /** Schedule label - iOS 11pt / Android 11sp */
  scheduleLabel: 11,
  /** Widget title - iOS 16pt / Android 16sp */
  widgetTitle: 16,
} as const;

/** Widget name identifiers (must match app.json plugin config) */
export const WIDGET_NAMES = {
  small: 'IslamicPlannerSmall',
  medium: 'IslamicPlannerMedium',
} as const;
