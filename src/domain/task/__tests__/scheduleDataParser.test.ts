import { parseScheduleData, serializeScheduleData } from '../scheduleDataParser';
import {
  parseTags,
  serializeTags,
  parseSubtasks,
  serializeSubtasks,
  parseEligiblePrayerSections,
  serializeEligiblePrayerSections,
  parseOverrideData,
  serializeOverrideData,
  parseReminderRule,
  parseHijriRecurrence,
} from '../jsonBoundary';
import { DataIntegrityError } from '../errors';

describe('Schedule Data Parser (SD-01 - SD-06)', () => {
  it('SD-01: Parse EXACT_TIME with valid localTime', () => {
    const raw = '{"localTime":"18:00"}';
    const parsed = parseScheduleData('EXACT_TIME', raw);
    expect(parsed).toEqual({ localTime: '18:00' });
  });

  it('SD-02: Parse PRAYER_RELATIVE with valid anchor, direction, and offset', () => {
    const raw = JSON.stringify({
      anchorPrayer: 'MAGHRIB',
      direction: 'AFTER',
      offsetMinutes: 30,
    });
    const parsed = parseScheduleData('PRAYER_RELATIVE', raw);
    expect(parsed).toEqual({
      anchorPrayer: 'MAGHRIB',
      direction: 'AFTER',
      offsetMinutes: 30,
    });
  });

  it('SD-03: Parse PRAYER_WINDOW with valid start and end prayers', () => {
    const raw = JSON.stringify({
      startPrayer: 'FAJR',
      endPrayer: 'ASR',
    });
    const parsed = parseScheduleData('PRAYER_WINDOW', raw);
    expect(parsed).toEqual({
      startPrayer: 'FAJR',
      endPrayer: 'ASR',
    });
  });

  it('SD-04: Parse ANYTIME_TODAY with empty object payload', () => {
    const raw = '{}';
    const parsed = parseScheduleData('ANYTIME_TODAY', raw);
    expect(parsed).toEqual({});
  });

  it('SD-05: Invalid JSON shape throws DataIntegrityError', () => {
    const raw = '{"anchorPrayer":"FAJR"}';
    expect(() => parseScheduleData('EXACT_TIME', raw)).toThrow(DataIntegrityError);
  });

  it('SD-06: Extraneous type field in incoming JSON is ignored and does not break parsing', () => {
    const raw = '{"type":"EXACT_TIME","localTime":"18:00"}';
    const parsed = parseScheduleData('EXACT_TIME', raw);
    expect(parsed).toEqual({ localTime: '18:00' });
    expect((parsed as any).type).toBeUndefined();
  });

  describe('Edge cases and boundary validation', () => {
    it('rejects invalid localTime format in EXACT_TIME (e.g. 24:00, 18:60, letters)', () => {
      expect(() => parseScheduleData('EXACT_TIME', '{"localTime":"24:00"}')).toThrow(DataIntegrityError);
      expect(() => parseScheduleData('EXACT_TIME', '{"localTime":"18:60"}')).toThrow(DataIntegrityError);
      expect(() => parseScheduleData('EXACT_TIME', '{"localTime":"abc"}')).toThrow(DataIntegrityError);
      expect(() => parseScheduleData('EXACT_TIME', '{"localTime":1800}')).toThrow(DataIntegrityError);
    });

    it('rejects invalid prayer anchor in PRAYER_RELATIVE (including SUNRISE)', () => {
      expect(() =>
        parseScheduleData(
          'PRAYER_RELATIVE',
          '{"anchorPrayer":"SUNRISE","direction":"AFTER","offsetMinutes":10}'
        )
      ).toThrow(DataIntegrityError);
      expect(() =>
        parseScheduleData(
          'PRAYER_RELATIVE',
          '{"anchorPrayer":"INVALID","direction":"AFTER","offsetMinutes":10}'
        )
      ).toThrow(DataIntegrityError);
    });

    it('rejects negative or fractional offsetMinutes in PRAYER_RELATIVE', () => {
      expect(() =>
        parseScheduleData(
          'PRAYER_RELATIVE',
          '{"anchorPrayer":"FAJR","direction":"BEFORE","offsetMinutes":-10}'
        )
      ).toThrow(DataIntegrityError);
      expect(() =>
        parseScheduleData(
          'PRAYER_RELATIVE',
          '{"anchorPrayer":"FAJR","direction":"BEFORE","offsetMinutes":10.5}'
        )
      ).toThrow(DataIntegrityError);
    });

    it('rejects invalid direction in PRAYER_RELATIVE', () => {
      expect(() =>
        parseScheduleData(
          'PRAYER_RELATIVE',
          '{"anchorPrayer":"DHUHR","direction":"DURING","offsetMinutes":0}'
        )
      ).toThrow(DataIntegrityError);
    });

    it('rejects non-prayer values in PRAYER_WINDOW', () => {
      expect(() =>
        parseScheduleData('PRAYER_WINDOW', '{"startPrayer":"FAJR","endPrayer":"SUNRISE"}')
      ).toThrow(DataIntegrityError);
      expect(() =>
        parseScheduleData('PRAYER_WINDOW', '{"startPrayer":"INVALID","endPrayer":"ISHA"}')
      ).toThrow(DataIntegrityError);
    });

    it('rejects non-JSON or array payloads in parseScheduleData', () => {
      expect(() => parseScheduleData('EXACT_TIME', 'not a json')).toThrow(DataIntegrityError);
      expect(() => parseScheduleData('EXACT_TIME', '[]')).toThrow(DataIntegrityError);
    });

    it('serializeScheduleData produces clean JSON and strips redundant type field', () => {
      const data = { localTime: '09:30', type: 'EXACT_TIME' } as any;
      const serialized = serializeScheduleData('EXACT_TIME', data);
      expect(serialized).toBe('{"localTime":"09:30"}');
    });
  });
});

describe('JSON Boundary Helpers & Corruption Tests', () => {
  describe('Tags Boundary', () => {
    it('parses valid tags array', () => {
      expect(parseTags('["work","urgent"]')).toEqual(['work', 'urgent']);
      expect(parseTags(null)).toEqual([]);
    });

    it('throws DataIntegrityError on malformed tags JSON', () => {
      expect(() => parseTags('{not json}')).toThrow(DataIntegrityError);
      expect(() => parseTags('[1, 2, 3]')).toThrow(DataIntegrityError);
      expect(() => parseTags('{"tags":["work"]}')).toThrow(DataIntegrityError);
    });

    it('serializes tags array', () => {
      expect(serializeTags(['tag1', 'tag2'])).toBe('["tag1","tag2"]');
      expect(serializeTags([])).toBeNull();
      expect(serializeTags(null)).toBeNull();
    });
  });

  describe('Subtasks Boundary', () => {
    it('parses valid subtask templates', () => {
      const valid = '[{"id":"sub-1","title":"Item 1"},{"id":"sub-2","title":"Item 2"}]';
      const parsed = parseSubtasks(valid);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ id: 'sub-1', title: 'Item 1' });
    });

    it('throws DataIntegrityError on malformed subtasks JSON', () => {
      expect(() => parseSubtasks('not-json')).toThrow(DataIntegrityError);
      expect(() => parseSubtasks('{"id":"sub-1"}')).toThrow(DataIntegrityError);
      expect(() => parseSubtasks('[{"id":"","title":"Title"}]')).toThrow(DataIntegrityError);
      expect(() => parseSubtasks('[{"id":"sub-1"}]')).toThrow(DataIntegrityError);
    });

    it('throws DataIntegrityError on duplicate subtask IDs', () => {
      const dup = '[{"id":"sub-1","title":"A"},{"id":"sub-1","title":"B"}]';
      expect(() => parseSubtasks(dup)).toThrow(DataIntegrityError);
    });

    it('serializes subtasks', () => {
      const items = [{ id: '1', title: 'A' }];
      expect(serializeSubtasks(items)).toBe('[{"id":"1","title":"A"}]');
      expect(serializeSubtasks([])).toBeNull();
      expect(serializeSubtasks(null)).toBeNull();
    });
  });

  describe('Eligible Prayer Sections Boundary', () => {
    it('parses valid prayer sections array', () => {
      expect(parseEligiblePrayerSections('["FAJR","DHUHR"]')).toEqual(['FAJR', 'DHUHR']);
      expect(parseEligiblePrayerSections(null)).toBeNull();
    });

    it('throws DataIntegrityError on invalid prayers like SUNRISE', () => {
      expect(() => parseEligiblePrayerSections('["FAJR","SUNRISE"]')).toThrow(DataIntegrityError);
      expect(() => parseEligiblePrayerSections('["UNKNOWN"]')).toThrow(DataIntegrityError);
      expect(() => parseEligiblePrayerSections('not-json')).toThrow(DataIntegrityError);
    });

    it('serializes eligible prayer sections', () => {
      expect(serializeEligiblePrayerSections(['FAJR', 'ASR'])).toBe('["FAJR","ASR"]');
      expect(serializeEligiblePrayerSections([])).toBeNull();
      expect(serializeEligiblePrayerSections(null)).toBeNull();
    });
  });

  describe('Occurrence Override Data Boundary', () => {
    it('parses valid overrideData', () => {
      const raw = '{"completedSubtaskIds":["sub-1"],"title":"Overridden"}';
      expect(parseOverrideData(raw)).toEqual({
        completedSubtaskIds: ['sub-1'],
        title: 'Overridden',
      });
      expect(parseOverrideData(null)).toBeNull();
    });

    it('throws DataIntegrityError on malformed overrideData', () => {
      expect(() => parseOverrideData('{malformed')).toThrow(DataIntegrityError);
      expect(() => parseOverrideData('["not an object"]')).toThrow(DataIntegrityError);
      expect(() => parseOverrideData('{"completedSubtaskIds":[123]}')).toThrow(DataIntegrityError);
      expect(() => parseOverrideData('{"title":123}')).toThrow(DataIntegrityError);
    });

    it('serializes overrideData', () => {
      const data = { completedSubtaskIds: ['a', 'b'] };
      expect(serializeOverrideData(data)).toBe('{"completedSubtaskIds":["a","b"]}');
      expect(serializeOverrideData(null)).toBeNull();
    });
  });

  describe('Reminder & Hijri Recurrence Boundary', () => {
    it('parses and rejects malformed reminderRule JSON', () => {
      expect(parseReminderRule('{"offsetMinutes":15}')).toEqual({ offsetMinutes: 15 });
      expect(parseReminderRule(null)).toBeNull();
      expect(() => parseReminderRule('malformed')).toThrow(DataIntegrityError);
    });

    it('parses and rejects malformed hijriRecurrence JSON', () => {
      expect(
        parseHijriRecurrence('{"hijriDays":[13,14,15],"hijriMonths":null,"description":"White Days"}')
      ).toEqual({ hijriDays: [13, 14, 15], hijriMonths: null, description: 'White Days' });
      expect(parseHijriRecurrence(null)).toBeNull();
      expect(() => parseHijriRecurrence('malformed')).toThrow(DataIntegrityError);
      expect(() => parseHijriRecurrence('{"hijriDays":"invalid"}')).toThrow(DataIntegrityError);
    });
  });
});
