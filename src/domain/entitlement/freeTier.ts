/**
 * Free Tier limits and defaults for Islamic Planner.
 * All features outside these bounds are gated behind Premium.
 */

/**
 * Task icons are a Premium feature. Free users keep the default appearance
 * (no custom icon selected); picking any icon from the catalogue is gated.
 */
export const FREE_TASK_ICON_IDS: ReadonlySet<string> = new Set<string>([]);

export function isFreeTaskIcon(iconId: string | null | undefined): boolean {
  // Clearing the icon (reverting to default) is always allowed.
  if (!iconId) return true;
  return FREE_TASK_ICON_IDS.has(iconId);
}

/**
 * Only the base appearance modes are free. Every Islamic theme is Premium.
 */
export const FREE_THEME_IDS: ReadonlySet<string> = new Set([
  'system',
  'light',
  'dark',
]);

export function isFreeTheme(themeId: string): boolean {
  if (!themeId) return true;
  return FREE_THEME_IDS.has(themeId.toLowerCase());
}

export const FREE_SOUND_IDS: ReadonlySet<string> = new Set([
  'default',
  'soft_chime',
  'water_drop',
]);

export function isFreeSound(soundId: string): boolean {
  if (!soundId) return true;
  return FREE_SOUND_IDS.has(soundId);
}

export const FREE_TEMPLATE_LIMIT = 3;

export function isFreeTemplateCount(count: number): boolean {
  return count <= FREE_TEMPLATE_LIMIT;
}
