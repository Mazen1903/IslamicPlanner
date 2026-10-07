import {
  isFreeTaskIcon,
  isFreeTheme,
  isFreeSound,
  isFreeTemplateCount,
  FREE_TASK_ICON_IDS,
  FREE_THEME_IDS,
  FREE_SOUND_IDS,
  FREE_TEMPLATE_LIMIT,
} from '../freeTier';

describe('freeTier constants and helpers', () => {
  it('treats every task icon as premium; only clearing to default is free', () => {
    expect(isFreeTaskIcon('')).toBe(true); // no icon / default
    expect(isFreeTaskIcon(null)).toBe(true);
    expect(isFreeTaskIcon(undefined)).toBe(true);
    expect(isFreeTaskIcon('mosque')).toBe(false);
    expect(isFreeTaskIcon('quran')).toBe(false);
    expect(isFreeTaskIcon('water-hydration')).toBe(false);
    expect(isFreeTaskIcon('pencil')).toBe(false);
    expect(isFreeTaskIcon('fanous')).toBe(false);
    expect(FREE_TASK_ICON_IDS.size).toBe(0);
  });

  it('treats every Islamic theme as premium; only base modes are free', () => {
    expect(isFreeTheme('system')).toBe(true);
    expect(isFreeTheme('light')).toBe(true);
    expect(isFreeTheme('dark')).toBe(true);
    expect(isFreeTheme('SYSTEM')).toBe(true);
    expect(isFreeTheme('rawdah_emerald')).toBe(false);
    expect(isFreeTheme('fajr_awakening')).toBe(false);
    expect(isFreeTheme('andalusian_oasis')).toBe(false);
    expect(isFreeTheme('sacred_tawaf')).toBe(false);
    expect(FREE_THEME_IDS.size).toBe(3);
  });

  it('correctly identifies free and premium sounds', () => {
    expect(isFreeSound('default')).toBe(true);
    expect(isFreeSound('soft_chime')).toBe(true);
    expect(isFreeSound('water_drop')).toBe(true);
    expect(isFreeSound('crystal_bell')).toBe(false);
    expect(isFreeSound('adhan_tone')).toBe(false);
    expect(isFreeSound('morning_birds')).toBe(false);
  });

  it('enforces free template limit', () => {
    expect(FREE_TEMPLATE_LIMIT).toBe(3);
    expect(isFreeTemplateCount(0)).toBe(true);
    expect(isFreeTemplateCount(1)).toBe(true);
    expect(isFreeTemplateCount(3)).toBe(true);
    expect(isFreeTemplateCount(4)).toBe(false);
  });
});
