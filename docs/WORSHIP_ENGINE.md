# Worship Engine

> [!IMPORTANT]
> **DEFERRED** — As of 2026-09-17, Worship Suggestions are deferred indefinitely.
> Journal replaces Worship in the permanent bottom navigation (M15/M16).
> Dormant Worship schema scaffolding (`worship_item_settings`, `worship_item_key`, source `WORSHIP`, `worship_suggestions_enabled`) remains in the database for potential future implementation.
> This document is preserved as a historical/future design reference. It does NOT describe current implementation work.

**Original Status:** Source of truth for worship suggestion generation  
**Updated:** 2026-09-14 (Rev 2 — architecture review)  
**Implements:** MASTER_PRODUCT_SPEC §26, §27, §28

---

## 1. Purpose

The Worship Engine generates voluntary/recommended worship opportunities as task occurrences, based on user-enabled settings. It is distinct from user-created tasks and routine-generated tasks.

---

## 2. Architecture

```text
WorshipItemDefinitions (static catalog)
         │
         ▼
WorshipEngine.generate(enabledItems, date, prayerTimes, hijriDate)
         │
         ▼
TaskDefinition[] (source = 'WORSHIP')
         │
         ▼
SchedulingEngine (resolves placement like any other task)
```

The Worship Engine:
1. Reads the static catalog of available worship items
2. Filters to user-enabled items
3. For a given date, determines which items are applicable
4. Creates/updates `TaskDefinition` records with `source = 'WORSHIP'`
5. The normal materialization pipeline handles occurrence generation

---

## 3. Worship Item Catalog

Each worship item is defined statically in code (not in the database). The database only stores user enable/disable preferences.

```typescript
interface WorshipItemDefinition {
  key: string;                        // unique identifier
  category: WorshipCategory;
  nameEn: string;                     // English display name
  descriptionEn: string;              // Brief description
  religiousClassification: 'SUNNAH' | 'RECOMMENDED' | 'VOLUNTARY';
  
  // Scheduling
  scheduleType: ScheduleType;
  scheduleData: ScheduleData;
  recurrenceType: 'GREGORIAN' | 'HIJRI' | 'CONDITIONAL';
  
  // For Gregorian recurrence
  recurrenceRule?: string;            // RRULE string
  
  // For Hijri recurrence
  hijriRecurrence?: HijriRecurrenceData;
  
  // For conditional (date-dependent) items
  isApplicable?: (context: WorshipContext) => boolean;
  
  // Default enabled
  defaultEnabled: boolean;
}

type WorshipCategory = 'VOLUNTARY_PRAYERS' | 'FASTING' | 'DAILY_WORSHIP' | 'SPECIAL_DAYS';

interface WorshipContext {
  gregorianDate: string;
  hijriDate: HijriDate;
  hijriMonth: number;
  hijriDay: number;
  dayOfWeek: number;         // 1=Monday, 7=Sunday
  prayerTimes: PrayerTimesResult;
}
```

---

## 4. Catalog Items

### 4.1 Voluntary Prayers

| Key | Name | Schedule | Recurrence | Classification |
|---|---|---|---|---|
| `RAWATIB_FAJR` | Fajr Sunnah (2 rak'ah) | Prayer Relative: Fajr, BEFORE, 15 min | Daily | Sunnah |
| `RAWATIB_DHUHR_BEFORE` | Dhuhr Sunnah Before (4 rak'ah) | Prayer Relative: Dhuhr, BEFORE, 15 min | Daily | Sunnah |
| `RAWATIB_DHUHR_AFTER` | Dhuhr Sunnah After (2 rak'ah) | Prayer Relative: Dhuhr, AFTER, 10 min | Daily | Sunnah |
| `RAWATIB_MAGHRIB` | Maghrib Sunnah (2 rak'ah) | Prayer Relative: Maghrib, AFTER, 5 min | Daily | Sunnah |
| `RAWATIB_ISHA` | Isha Sunnah (2 rak'ah) | Prayer Relative: Isha, AFTER, 5 min | Daily | Sunnah |
| `DUHA` | Duha Prayer | Prayer Window: Sunrise → Dhuhr | Daily | Recommended |
| `WITR` | Witr Prayer | Prayer Window: Isha → (next) Fajr | Daily | Sunnah |
| `QIYAM` | Qiyam al-Layl | Prayer Window: Isha → (next) Fajr | Daily | Voluntary |

### 4.2 Fasting

| Key | Name | Schedule | Recurrence | Classification |
|---|---|---|---|---|
| `FAST_MONDAY` | Monday Fast | Anytime Today | Weekly (Monday) | Sunnah |
| `FAST_THURSDAY` | Thursday Fast | Anytime Today | Weekly (Thursday) | Sunnah |
| `WHITE_DAYS` | White Days Fast | Anytime Today | Hijri: 13, 14, 15 of each month | Sunnah |
| `SHAWWAL_SIX` | Six Days of Shawwal | Anytime Today | Conditional: Shawwal 2-30 | Sunnah |
| `ARAFAH_FAST` | Day of Arafah Fast | Anytime Today | Conditional: Dhul Hijjah 9 | Sunnah |
| `ASHURA_FAST` | Ashura Fast | Anytime Today | Conditional: Muharram 9-10 | Sunnah |

### 4.3 Daily Worship

| Key | Name | Schedule | Recurrence | Classification |
|---|---|---|---|---|
| `MORNING_ADHKAR` | Morning Adhkar | Prayer Relative: Fajr, AFTER, 5 min | Daily | Sunnah |
| `EVENING_ADHKAR` | Evening Adhkar | Prayer Relative: Asr, AFTER, 5 min | Daily | Sunnah |
| `QURAN_READING` | Qur'an Reading | Prayer Window: Fajr → Asr | Daily | Recommended |
| `SALAWAT` | Send Salawat on the Prophet ﷺ | Anytime Today | Daily | Sunnah |

### 4.4 Special Days & Seasons

| Key | Name | Schedule | Applicable condition | Classification |
|---|---|---|---|---|
| `FRIDAY_SURAH_KAHF` | Read Surah Al-Kahf | Anytime Today | Friday | Sunnah |
| `FRIDAY_SALAWAT` | Extra Salawat (Friday) | Anytime Today | Friday | Sunnah |
| `DHUL_HIJJAH_WORSHIP` | Extra Worship (Dhul Hijjah) | Anytime Today | Dhul Hijjah 1-10 | Recommended |
| `LAYLAT_AL_QADR` | Laylat al-Qadr Opportunity | Prayer Window: Isha → Fajr | Ramadan odd nights 21-29 | Voluntary |

---

## 5. Generation Logic

```typescript
class WorshipEngine {
  private catalog: WorshipItemDefinition[];
  
  async generateForDate(
    date: string,
    enabledKeys: Set<string>,
    context: WorshipContext
  ): Promise<TaskDefinition[]> {
    const generated: TaskDefinition[] = [];
    
    for (const item of this.catalog) {
      if (!enabledKeys.has(item.key)) continue;
      
      // Check if applicable to this date
      if (!this.isApplicableOnDate(item, context)) continue;
      
      // Create or find existing TaskDefinition
      const taskDef = this.buildTaskDefinition(item);
      generated.push(taskDef);
    }
    
    return generated;
  }
  
  private isApplicableOnDate(item: WorshipItemDefinition, ctx: WorshipContext): boolean {
    // For Gregorian recurrence, check RRULE
    if (item.recurrenceType === 'GREGORIAN' && item.recurrenceRule) {
      return rruleOccursOn(item.recurrenceRule, ctx.gregorianDate);
    }
    
    // For Hijri recurrence — uses effective calendar (base + global adj + per-month override)
    if (item.recurrenceType === 'HIJRI' && item.hijriRecurrence) {
      return hijriRecurrenceEngine.occursOn(item.hijriRecurrence, ctx.effectiveHijriDate);
    }
    
    // For conditional items
    if (item.recurrenceType === 'CONDITIONAL' && item.isApplicable) {
      return item.isApplicable(ctx);
    }
    
    return false;
  }
  
  private buildTaskDefinition(item: WorshipItemDefinition): TaskDefinition {
    return {
      id: `worship-${item.key}`,  // Deterministic ID for worship items
      title: item.nameEn,
      description: item.descriptionEn,
      source: 'WORSHIP',
      worshipItemId: item.key,
      scheduleType: item.scheduleType,
      scheduleData: item.scheduleData,
      priority: 'NORMAL',
      // ... other fields
    };
  }
}
```

---

## 6. Worship Date Safeguards (§27)

All Hijri-dependent worship items use the **effective Hijri calendar** via `HijriService.getEffectiveDate()`, which applies: base calendar method → global adjustment → per-month override (if any). See DATA_MODEL.md §2.4 and DECISIONS.md ADR-018.

### 6.1 Moon-Sighting Variation

- The base converter uses calculated Umm al-Qura dates, which may not match local moon sighting
- Users can set a global adjustment (-2 to +2 days) for general correction
- Users can set **per-Hijri-month overrides** keyed by year + month (e.g., "Ramadan 1448 starts 1 day later")
- A per-month override **replaces** the global adjustment for that month
- Historical overrides are preserved and never auto-deleted
- Worship generation calls `HijriService.getEffectiveDate(gregorianDate)` — it does NOT use raw converter output
- Example: if Ramadan 1448 has override +1, all Ramadan worship items (Laylat al-Qadr, fasting) shift by +1 day

### 6.2 Ramadan and Eid

- Ramadan start/end dates use the effective Hijri calendar (base + adjustment + per-month override)
- The app does NOT claim to know the exact start date universally
- Display: "Based on your calendar settings. Actual dates may vary by region."
- Users can adjust Ramadan specifically via per-month override (ADR-018)

### 6.3 Laylat al-Qadr

- Presented as "Laylat al-Qadr Opportunity" — NOT "Laylat al-Qadr is tonight"
- Applicable on odd nights of the last 10 days of Ramadan (21, 23, 25, 27, 29)
- Each night is a separate opportunity, not a guaranteed date

### 6.4 Six Days of Shawwal

- NOT auto-scheduled on 6 specific days
- Presented as daily opportunities during Shawwal (after Eid day 1)
- User chooses which days to complete
- Optional future feature: track count of completed days (out of 6)

### 6.5 White Days

- Based on user's effective Hijri calendar (base + adjustment + per-month override)
- Labeled as "Recommended fasting" not "Required fasting"

---

## 7. Visual Distinction (§26.6)

Worship tasks carry metadata for visual distinction:

```typescript
interface WorshipTaskMetadata {
  source: 'WORSHIP';
  worshipItemKey: string;
  religiousClassification: 'SUNNAH' | 'RECOMMENDED' | 'VOLUNTARY';
}
```

UI renders:
- Subtle mosque/crescent icon badge on worship task cards
- "Sunnah" / "Recommended" / "Voluntary" label visible in task detail
- No large colored section separators — integrated into the normal task list

---

## 8. Master Toggle Behavior (§26.2)

- `worshipSuggestionsEnabled = false` → no worship items generated
- Toggling OFF:
  - Preserves individual item enable/disable preferences
  - Hides all worship-generated tasks from Today view
  - Cancels worship-related notifications
- Toggling ON:
  - Restores previously enabled items
  - Regenerates applicable worship tasks

---

## 9. Prayer Completion (§28)

**Default:** No prayer tracking. Prayers organize the day but are not themselves tracked.

**Premium optional feature (future):**
- If enabled, each prayer tab shows a subtle check-off
- Opt-in, easy to disable
- No XP, no streak pressure, no score, no ranking
- Data stored locally, never shared
- Does not dominate the Today screen

**Implementation:**
```typescript
// Only if Premium + feature enabled
interface PrayerCompletionRecord {
  id: string;
  prayer: Prayer;
  localDate: string;
  completedAt: string;
}
```

Deferred to M19+ (Premium milestone).

---

## 10. Test Requirements

1. Daily worship items generated correctly for a given date
2. Weekly items (Monday fast) only generated on correct day
3. Hijri items (White Days) generated on correct Hijri dates
4. Hijri adjustment shifts generation dates correctly
5. Conditional items (Shawwal, Arafah, Ashura) fire on correct dates
6. Laylat al-Qadr opportunities appear on odd nights 21-29 of Ramadan
7. Master toggle OFF suppresses all worship generation
8. Individual toggle OFF suppresses specific item
9. Re-enabling regenerates applicable items
10. Worship tasks carry correct `source = 'WORSHIP'` metadata
11. Worship tasks flow through normal scheduling pipeline
12. Cross-prayer placement works for worship items (e.g., Duha spanning sunrise→Dhuhr)
