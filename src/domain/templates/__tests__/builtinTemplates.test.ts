import { BUILTIN_TEMPLATES, getBuiltinTemplateById } from '../builtinTemplates';

describe('BUILTIN_TEMPLATES catalog', () => {
  it('contains core spiritual routines', () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(4);

    const morning = getBuiltinTemplateById('morning_adhkar');
    expect(morning).toBeDefined();
    expect(morning?.title).toBe('Morning Sunnah & Adhkar');
    expect(morning?.items.length).toBe(4);

    const jumuah = getBuiltinTemplateById('jumuah_checklist');
    expect(jumuah).toBeDefined();
    expect(jumuah?.title).toBe('Jumu’ah Friday Sunnahs');

    const evening = getBuiltinTemplateById('evening_routine');
    expect(evening).toBeDefined();

    const ramadan = getBuiltinTemplateById('ramadan_fasting');
    expect(ramadan).toBeDefined();
  });

  it('all template items specify valid icons and schedule modes', () => {
    for (const template of BUILTIN_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.title).toBeTruthy();
      expect(template.items.length).toBeGreaterThan(0);

      for (const item of template.items) {
        expect(item.title).toBeTruthy();
        expect(item.iconId).toBeTruthy();
        expect(['RELATIVE_TO_PRAYER', 'PRAYER_WINDOW', 'ANYTIME']).toContain(item.scheduleMode);

        if (item.scheduleMode === 'RELATIVE_TO_PRAYER') {
          expect(item.relativePrayer).toBeDefined();
          expect(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']).toContain(item.relativePrayer?.prayer);
        }

        if (item.scheduleMode === 'PRAYER_WINDOW') {
          expect(item.windowPrayer).toBeDefined();
          expect(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']).toContain(item.windowPrayer);
        }
      }
    }
  });

  it('returns undefined for non-existent template id', () => {
    expect(getBuiltinTemplateById('non_existent')).toBeUndefined();
  });
});
