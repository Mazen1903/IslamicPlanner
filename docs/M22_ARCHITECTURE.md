# M22 — Accessibility / RTL Architecture

**Status:** ARCHITECTURE FROZEN LOCALLY — PENDING LEAD APPROVAL
**Milestone:** M22 — Accessibility / RTL
**React Native version:** 0.86.3
**M21 baseline / origin/main:** `a8c837c6ef6c27d3bc81a48b6e1d12e6489874f1`
**Initial freeze commit:** `20c68e2`
**Hardening commit:** `c79cdaf`
**Finalization commit:** *(this revision)*
**Date finalized:** 2026-09-19

---

## 1. Milestone Overview

M22 makes the application materially accessible and RTL-ready. It addresses two related but distinct concerns:

- **Part A — Accessibility:** Expose correct accessible names, roles, states, touch targets, modal isolation, text scaling, error announcements, and non-color signals to screen readers (VoiceOver / TalkBack).
- **Part B — RTL Layout Readiness:** Audit all directional styling; establish the logical-direction and directional-glyph contract; resolve prayer-tab, bottom-nav, and calendar RTL ordering.

M22 must not change domain logic, scheduling behavior, database schema, or planner semantics.

---

## 2. Complete Production File Audit

**Authoritative scope:** `app/**/*.{ts,tsx}` and `src/components/**/*.{ts,tsx}`, excluding any file under `__tests__`.

**Independently verified count: 82 production files** (PowerShell enumeration, 2026-09-19).

### 2.1 Audit Disposition Legend

- **CHANGE:** M22 production changes required
- **COMPLIANT:** Inspected — already compliant, no change needed
- **PLACEHOLDER:** Stub/placeholder component, no production UI
- **BARREL:** Index barrel file — no UI, no accessibility concerns
- **OUT-OF-SCOPE:** Explicitly out of M22 scope (reason given)

### 2.2 Complete 82-File Audit Matrix

| # | File (relative) | Disposition | Reason / Issues |
|---|---|---|---|
| 1 | `app/(tabs)/_layout.tsx` | COMPLIANT | Navigation shell, no interactive elements |
| 2 | `app/(tabs)/add.tsx` | COMPLIANT | Delegates to TaskFormScreen; no direct a11y or RTL gaps |
| 3 | `app/(tabs)/calendar.tsx` | COMPLIANT | Delegates to sub-components; screen-level no direct gaps |
| 4 | `app/(tabs)/journal.tsx` | **CHANGE** | Physical `marginLeft` (L253, L312); error/lock Text lacks `accessibilityLiveRegion` |
| 5 | `app/(tabs)/settings/_layout.tsx` | COMPLIANT | Stack navigator shell; no direct UI |
| 6 | `app/(tabs)/settings/about.tsx` | COMPLIANT | Purely informational; no interactive elements with missing labels |
| 7 | `app/(tabs)/settings/appearance.tsx` | COMPLIANT | Uses `SettingsSelectOption`; no direct a11y/RTL gaps |
| 8 | `app/(tabs)/settings/hijri-calendar.tsx` | **CHANGE** | Modal: no `accessibilityViewIsModal`; title no `accessibilityRole="header"`; physical `marginRight`/`marginLeft` in modal actions (L392, L400) |
| 9 | `app/(tabs)/settings/index.tsx` | COMPLIANT | Hub; `SettingsRow` handles accessibility |
| 10 | `app/(tabs)/settings/journal-privacy.tsx` | COMPLIANT | Uses `SettingsToggle`, `SettingsRow`; no direct gaps |
| 11 | `app/(tabs)/settings/notifications.tsx` | **CHANGE** | Physical `marginRight`/`marginLeft` on icon spacing rows |
| 12 | `app/(tabs)/settings/planning-day.tsx` | **CHANGE** | Physical `marginRight`/`marginLeft` on icon spacing rows |
| 13 | `app/(tabs)/settings/prayer-calculation.tsx` | COMPLIANT | Uses `SettingsSelectOption`, `SettingsRow`; no direct gaps |
| 14 | `app/(tabs)/settings/prayer-location.tsx` | **CHANGE** | Physical `marginRight`/`marginLeft` on icon spacing rows |
| 15 | `app/(tabs)/today.tsx` | **CHANGE** | Error state `Text` lacks `accessibilityLiveRegion="assertive"` |
| 16 | `app/_layout.tsx` | COMPLIANT | Root layout; `themeReady` gate; no direct a11y/RTL |
| 17 | `app/demo.tsx` | OUT-OF-SCOPE | Not a user-facing route; demo gating deferred to M24 per ADR-029 |
| 18 | `app/onboarding/index.tsx` | **CHANGE** | Theme-select Pressables (A-13): no role/label/state; method-select Pressables (A-14): no role/label/state; city result Pressables (A-15): no label |
| 19 | `app/task/[id].tsx` | COMPLIANT | Delegates to TaskFormScreen; no direct a11y/RTL gaps |
| 20 | `app/task/add.tsx` | COMPLIANT | Delegates to TaskFormScreen; no direct a11y/RTL gaps |
| 21 | `src/components/calendar/CalendarDayCell.tsx` | **CHANGE** | `maxFontSizeMultiplier={2}` on day number and Hijri sub-number (justified per §10) |
| 22 | `src/components/calendar/CalendarHeader.tsx` | **CHANGE** | `chevron-left`/`chevron-right` navigation icons require `directional` prop (per §3); no accessibility gaps |
| 23 | `src/components/calendar/CalendarMonthGrid.tsx` | **CHANGE** | `accessibilityRole="text"` on weekday labels is redundant/unnecessary (remove); `maxFontSizeMultiplier={2}` on weekday labels (justified per §10) |
| 24 | `src/components/calendar/DayDetailTaskList.tsx` | **CHANGE** | Arabic name Text (L67–69) lacks `importantForAccessibility="no"`; physical `marginLeft` (L67) |
| 25 | `src/components/calendar/UpcomingSection.tsx` | **CHANGE** | Icon `marginRight` L26: physical → `marginEnd`; icon `marginRight` L107: physical → `marginEnd` |
| 26 | `src/components/common/BottomSheet.tsx` | PLACEHOLDER | Stub; no production UI |
| 27 | `src/components/common/Button.tsx` | **CHANGE** | Physical `marginLeft`/`marginRight` in icon-spacing (L167–168) |
| 28 | `src/components/common/Card.tsx` | COMPLIANT | Pressable variant labeled, role, disabled state; View variant non-interactive |
| 29 | `src/components/common/Icon.tsx` | **CHANGE** | Add `decorative?: boolean` prop; add `directional?: boolean` prop (see §3) |
| 30 | `src/components/common/Toggle.tsx` | **CHANGE** | Physical `marginRight: 16` on textContainer (L144) |
| 31 | `src/components/form/ExactTimePicker.tsx` | PLACEHOLDER | Stub |
| 32 | `src/components/form/PrayerRelativePicker.tsx` | PLACEHOLDER | Stub |
| 33 | `src/components/form/PrayerWindowPicker.tsx` | PLACEHOLDER | Stub |
| 34 | `src/components/form/RecurrencePicker.tsx` | PLACEHOLDER | Stub |
| 35 | `src/components/form/ReminderPicker.tsx` | PLACEHOLDER | Stub |
| 36 | `src/components/form/ScheduleModePicker.tsx` | PLACEHOLDER | Stub |
| 37 | `src/components/journal/index.ts` | BARREL | Re-export barrel |
| 38 | `src/components/journal/JournalDeleteDialog.tsx` | **CHANGE** | No `accessibilityViewIsModal`; title no `accessibilityRole="header"`; backdrop Pressable accessibility contract per §4 (L38 backdrop Pressable already exists); physical `marginRight` (L78) |
| 39 | `src/components/journal/JournalEditor.tsx` | COMPLIANT | `accessibilityLabel`, `accessibilityHint` already present |
| 40 | `src/components/journal/JournalHeader.tsx` | **CHANGE** | Physical `marginLeft` (L128, L154) |
| 41 | `src/components/journal/JournalHistory.tsx` | **CHANGE** | `chevron-left` back button icon → `directional` prop; physical `marginLeft` on Text at L52 |
| 42 | `src/components/journal/JournalHistoryRow.tsx` | **CHANGE** | `chevron-right` disclosure icon → `decorative` prop (NOT directional — disclosure/navigate) |
| 43 | `src/components/journal/JournalLockedState.tsx` | COMPLIANT | Unlock button labeled, disabled state |
| 44 | `src/components/journal/JournalPrivacySheet.tsx` | **CHANGE** | No `accessibilityViewIsModal`; title no `accessibilityRole="header"`; backdrop accessibility per §4; physical `marginLeft` (L63); physical `paddingRight: 12` (L202) |
| 45 | `src/components/journal/JournalSaveStatus.tsx` | COMPLIANT | `accessibilityLiveRegion="polite"`, label already present |
| 46 | `src/components/journal/ReflectionField.tsx` | COMPLIANT | `accessibilityLabel`, `accessibilityHint` present |
| 47 | `src/components/journal/ReflectionSection.tsx` | **CHANGE** | Physical `marginLeft` (L59) |
| 48 | `src/components/layout/BottomNavBar.tsx` | **CHANGE** | Tab icons and Add icon → `decorative` prop; RTL order per §17 |
| 49 | `src/components/layout/SafeArea.tsx` | COMPLIANT | Infrastructure wrapper |
| 50 | `src/components/prayer/PrayerHeader.tsx` | **CHANGE** | No accessible grouping (A-7); countdown traversal noise (A-8); decorative ornament not hidden; Arabic name not hidden; physical `marginLeft` (L64), `marginRight` (L97) |
| 51 | `src/components/prayer/PrayerTabBar.tsx` | **CHANGE** | Indicator dot not suppressed (A-16); tab Icons → `decorative` prop |
| 52 | `src/components/prayer/PrayerTransitionBanner.tsx` | **CHANGE** | Physical `marginRight: 12` (L101), physical `marginLeft: 8` (L109) |
| 53 | `src/components/premium/index.ts` | BARREL | Re-export barrel |
| 54 | `src/components/premium/PremiumBadge.tsx` | **CHANGE** | redundant/unnecessary `accessibilityRole="text"` removed; physical `marginRight: 3`; lock icon → `decorative` |
| 55 | `src/components/premium/PremiumLockedInfo.tsx` | **CHANGE** | `accessibilityViewIsModal={true}` on content View; remove `accessible` from content View (hides OK button); title `Text` → `accessibilityRole="header"`; backdrop accessibility per §4; physical `marginRight: spacing.sm` (L67) |
| 56 | `src/components/settings/index.ts` | BARREL | Re-export barrel |
| 57 | `src/components/settings/SettingsInfoCard.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` on icon (L37) |
| 58 | `src/components/settings/SettingsRow.tsx` | **CHANGE** | Physical `marginRight: spacing.md` (L55, L103); `chevron-right` disclosure Icon → `decorative` prop; physical `marginRight: spacing.xs` (L103) |
| 59 | `src/components/settings/SettingsScreenHeader.tsx` | **CHANGE** | `chevron-left` back Icon → `decorative` + `directional` props (back navigation) |
| 60 | `src/components/settings/SettingsSectionHeader.tsx` | **CHANGE** | Title `Text` missing `accessibilityRole="header"` |
| 61 | `src/components/settings/SettingsSelectOption.tsx` | **CHANGE** | Physical `paddingRight: 12` (L85) |
| 62 | `src/components/settings/SettingsStepper.tsx` | COMPLIANT | Touch targets sized, labeled |
| 63 | `src/components/settings/SettingsToggle.tsx` | **CHANGE** | Double announcement risk (A-1); physical `marginRight: spacing.md` (L57); physical `paddingRight: 12` (L117) |
| 64 | `src/components/task/AllDoneState.tsx` | COMPLIANT | Purely informational |
| 65 | `src/components/task/AnytimeTodaySection.tsx` | **CHANGE** | Physical `marginRight: 6` on icon (L46); `sun` icon → `decorative`; `chevron-right/down` expand icon → `decorative` (not directional) |
| 66 | `src/components/task/CompletedSection.tsx` | **CHANGE** | `chevron-right/down` expand Icon → `decorative` prop (not directional) |
| 67 | `src/components/task/EmptyPrayerState.tsx` | COMPLIANT | Purely informational |
| 68 | `src/components/task/MissedTaskRow.tsx` | COMPLIANT | Thin wrapper around `TaskCard` |
| 69 | `src/components/task/TaskCard.tsx` | **CHANGE** | Badge traversal noise (A-10); physical `marginLeft: 8` on contentContainer (L191); physical `marginRight: 4` on clock icon (L97) |
| 70 | `src/components/task/TaskCheckbox.tsx` | COMPLIANT | `accessibilityRole="checkbox"`, `accessibilityState={{ checked, disabled }}` — correct |
| 71 | `src/components/task/TaskList.tsx` | COMPLIANT | Orchestration wrapper |
| 72 | `src/components/task-form/CustomRecurrenceModal.tsx` | **CHANGE** | No `accessibilityViewIsModal`; title no `accessibilityRole="header"`; calendar-switcher Pressables use `accessibilityRole="radio"` but wrong state key `selected` → must use `checked` (A-24) |
| 73 | `src/components/task-form/DateTimePickerInput.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` (L83, L171) |
| 74 | `src/components/task-form/EditScopeSheet.tsx` | **CHANGE** | No `accessibilityViewIsModal`; title no `accessibilityRole="header"`; has Cancel + Close Pressable buttons |
| 75 | `src/components/task-form/index.ts` | BARREL | Re-export barrel |
| 76 | `src/components/task-form/MoreOptionsSection.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` (L80, L293); physical `marginLeft: 4` (L378) |
| 77 | `src/components/task-form/PartialSuccessView.tsx` | COMPLIANT | Retry and Done buttons labeled |
| 78 | `src/components/task-form/RecurrenceSection.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` (L188) |
| 79 | `src/components/task-form/ScheduleModeCards.tsx` | **CHANGE** | Physical `marginLeft: spacing.sm` (L113); `marginRight: spacing.sm` (L401); `marginRight: spacing.xs` (L425) |
| 80 | `src/components/task-form/SuccessScreen.tsx` | **CHANGE** | Physical `marginRight: 6` (L89, L97) |
| 81 | `src/components/task-form/TaskFormScreen.tsx` | **CHANGE** | Physical `marginLeft: spacing.xs` on validation error Text (L326) |
| 82 | `src/components/today/SetupRequiredState.tsx` | **CHANGE** | Physical `marginRight: spacing.xs` (L140), `marginLeft: spacing.xs` (L170); error banner Text lacks `accessibilityLiveRegion="assertive"` |

**Summary:**
- CHANGE required: **44 files** (`CalendarHeader` added for directional icon fix; `SettingsScreenHeader` added)
- COMPLIANT: **27 files**
- PLACEHOLDER / BARREL / OUT-OF-SCOPE: **11 files**
- **Total audited: 82 files ✓**

---

## 3. Directional Icon RTL Contract (NEW — M22 MANDATORY)

### 3.1 Background

Ionicons glyphs (`chevron-forward`, `chevron-back`, etc.) are **fixed bitmap/vector glyphs**. They do not automatically mirror when `I18nManager.isRTL` is `true`. The Yoga layout engine mirrors the *positions* of flex children in RTL, but individual glyph shapes remain unchanged. Therefore: in an RTL layout, a `chevron-forward` (pointing right) used as a "back" indicator will point in the wrong direction for RTL users.

**Solution:** Add `directional?: boolean` to `Icon.tsx`. When `directional === true` and `I18nManager.isRTL === true`, apply `style: transform: [{scaleX: -1}]` to the Ionicons component.

**This does NOT activate RTL for the app.** It only corrects the glyph orientation when the device system language causes `I18nManager.isRTL` to be `true`. No `forceRTL`, no `allowRTL`, no locale system.

### 3.2 Icon.tsx Implementation Contract

```tsx
import { I18nManager } from 'react-native';

export interface IconProps {
  name: IconName;
  size?: number | IconSizeKey;
  color?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
  /** When true: suppresses icon from accessibility traversal (use inside labeled Pressables) */
  decorative?: boolean;
  /** When true: applies horizontal flip in RTL layouts to correct directional glyph orientation */
  directional?: boolean;
}

export function Icon({ name, size = 'md', color, style, accessibilityLabel, testID, decorative, directional }: IconProps) {
  const theme = useTheme();
  const resolvedSize = typeof size === 'number' ? size : theme.iconSizes[size];
  const resolvedColor = color ?? theme.colors.textPrimary;
  const ioniconName = ICON_MAP[name] ?? 'help-circle-outline';

  const rtlStyle = directional && I18nManager.isRTL
    ? { transform: [{ scaleX: -1 }] }
    : undefined;

  return (
    <Ionicons
      testID={testID}
      name={ioniconName}
      size={resolvedSize}
      color={resolvedColor}
      style={[style, rtlStyle]}
      accessibilityLabel={decorative ? '' : (accessibilityLabel ?? name)}
      accessibilityRole={decorative ? 'none' : 'image'}
      importantForAccessibility={decorative ? 'no' : undefined}
    />
  );
}
```

**Note:** The `decorative` and `directional` props are independent and combinable. A back-navigation chevron inside a labeled Pressable should receive both: `decorative directional`. A chevron in an unlabeled non-interactive container should receive only `directional`.

### 3.3 Authoritative Directional Icon Consumer Matrix

Semantic taxonomy:
- **Navigation / Back:** Icon indicates the direction of travel for the user. Glyph mirrors in RTL. → `directional={true}`
- **Previous/Next temporal:** Prev month (left), Next month (right). Glyph mirrors in RTL. → `directional={true}`
- **Disclosure / Expand-collapse (horizontal chevron only):** Icon indicates a panel will open or navigate. In RTL layouts the horizontal direction reverses — a disclosure arrow that points right in LTR should point left in RTL to correctly indicate the direction of reveal/navigation. → `directional={true}` for horizontal chevrons only. `chevron-down` is direction-neutral and is NOT mirrored.
- **Decorative:** Icon supplements a labeled Pressable. → `decorative={true}` (and `directional` if applicable)

| Consumer File | Icon | Semantic | LTR glyph | RTL glyph | `directional` | `decorative` | Callback / action unchanged |
|---|---|---|---|---|---|---|---|
| `SettingsScreenHeader.tsx` L45 | `chevron-left` | Back navigation | ← | → (mirrored) | **YES** | YES (inside labeled Pressable) | YES — `handleBack` always calls `router.back()` |
| `CalendarHeader.tsx` L73 | `chevron-left` | Previous month | ← | → (mirrored) | **YES** | YES (inside labeled Pressable) | YES — `onPreviousMonth` callback semantics never change |
| `CalendarHeader.tsx` L91 | `chevron-right` | Next month | → | ← (mirrored) | **YES** | YES (inside labeled Pressable) | YES — `onNextMonth` callback semantics never change |
| `JournalHistory.tsx` L51 | `chevron-left` | Back to today navigation | ← | → (mirrored) | **YES** | YES (inside labeled Pressable) | YES — `onBackToToday` callback unchanged |
| `SettingsRow.tsx` L114 | `chevron-right` | Disclosure / navigate to sub-screen | → | ← (mirrored) | **YES** | YES (inside labeled Pressable) | YES — disclosure affordance; same destination |
| `JournalHistoryRow.tsx` L70-74 | `chevron-right` | Disclosure / navigate to entry | → | ← (mirrored) | **YES** | YES (inside labeled Pressable) | YES — same entry opened |
| `CompletedSection.tsx` L44-48 | `chevron-right` (collapsed only; `chevron-down` unchanged) | Collapsed disclosure | → | ← (mirrored) | **YES** (`chevron-right` only) | YES (inside labeled Pressable) | YES — same collapsed state toggled |
| `AnytimeTodaySection.tsx` L51-55 | `chevron-right` (collapsed only; `chevron-down` unchanged) | Collapsed disclosure | → | ← (mirrored) | **YES** (`chevron-right` only) | YES (inside labeled Pressable) | YES — same collapsed state toggled |

**`chevron-down` is NOT directional and is NOT mirrored** — vertical direction is invariant across LTR/RTL.

**Total directional horizontal-chevron icon instances: 8** (across 7 consumer files)

**Total directional-icon consumer files: 7**
(`SettingsScreenHeader`, `CalendarHeader`, `JournalHistory`, `SettingsRow`, `JournalHistoryRow`, `CompletedSection`, `AnytimeTodaySection`)
(Plus `Icon.tsx` as the implementation site.)

### 3.4 Directional Icon Test Group I (added tests)

Tests in `src/__tests__/m22/RTLIcons.test.tsx`:

| Test | Description |
|---|---|
| I-1 | Icon renders no `scaleX` transform when `directional={false}` and `isRTL=true` |
| I-2 | Icon renders `scaleX: -1` transform when `directional={true}` and `isRTL=true` |
| I-3 | Icon renders no transform when `directional={true}` and `isRTL=false` |
| I-4 | SettingsScreenHeader back icon has `directional` prop |
| I-5 | CalendarHeader prev-month icon has `directional` prop |
| I-6 | CalendarHeader next-month icon has `directional` prop |
| I-7 | JournalHistory back icon has `directional` prop |
| I-8 | SettingsRow disclosure chevron-right has `directional` prop (mirrors in RTL) |
| I-9 | JournalHistoryRow disclosure chevron-right has `directional` prop |
| I-10 | CompletedSection collapsed chevron-right has `directional` prop |
| I-11 | AnytimeTodaySection collapsed chevron-right has `directional` prop |
| I-12 | chevron-down is never given `directional` prop (vertical, not mirrored) |

**Native visual confirmation:** Carried to M23 (requires device with RTL system language).

---

## 4. Modal Accessibility Contract (REVISED)

### 4.1 Platform Behavior Clarification

**`accessibilityViewIsModal`:**
- **iOS:** The `<Modal>` component itself traps VoiceOver focus within the modal by default. `accessibilityViewIsModal={true}` on an inner View is additive — it further instructs iOS VoiceOver that elements outside the View are not accessible. On iOS it is applied for belt-and-suspenders correctness but the `<Modal>` already provides the primary trapping.
- **Android:** The `<Modal>` in React Native 0.86 does **not** automatically trap TalkBack focus. `accessibilityViewIsModal={true}` is a prop that maps to the Android `setImportantForAccessibility` API on the Window content view. It is the primary mechanism for TalkBack focus containment on Android.
- **This architecture doc does NOT claim that setting this prop alone guarantees TalkBack containment.** Native device verification is required in M23 QA.

### 4.2 Backdrop Accessibility Policy

**Problem with prior contract:** The previous architecture required the backdrop `Pressable` to carry `accessibilityRole="button"` and a screen-reader label in all dismissible modals. This creates a **duplicate screen-reader control** when the modal already has an explicit dismiss action (Cancel, Done, OK, Close). Duplicate controls cause confusion — users would encounter "Close dialog backdrop" and "Cancel" or "Done" as separate screen-reader targets for the same action.

**Frozen policy:**

For modals that have an **explicit in-dialog dismiss action** (Cancel, Done, OK, Close button):
1. The backdrop `Pressable` is pointer/touch dismissable (for sighted mouse/touch users).
2. The backdrop is excluded from accessibility traversal: `accessible={false}` (or `importantForAccessibility="no"` on Android — but `accessible={false}` is the cross-platform prop).
3. The explicit dismiss button inside the dialog remains the canonical screen-reader dismiss target.
4. `onRequestClose` on `<Modal>` handles hardware-back on Android.

For modals that have **no in-dialog dismiss action** (no Cancel/OK button, information-only, or user must choose a destructive action):
- No backdrop Pressable. `onRequestClose` handles hardware-back.

**Rationale:** A screen reader user navigating a modal should encounter exactly one dismiss mechanism per modal. Duplicating it via a backdrop accessible button adds noise and confusion.

### 4.3 PremiumLockedInfo Grouping Decision

**Critical correction:** `PremiumLockedInfo.tsx` currently uses:

```tsx
<View
  accessible
  accessibilityRole="alert"
  ...
>
  <View>...</View>           {/* headerRow with lock icon + title */}
  <Text>...</Text>            {/* description */}
  <Text>...</Text>            {/* notice */}
  <View>                      {/* actionsRow */}
    <Pressable                {/* OK button — inside accessible group */}
      accessibilityRole="button"
      accessibilityLabel="OK"
    >
      <Text>OK</Text>
    </Pressable>
  </View>
</View>
```

`accessible={true}` on the card View groups all its descendants into a single accessibility element. This **hides the nested OK button from individual screen-reader traversal**. VoiceOver/TalkBack reads the card as a single element with a concatenated label. The OK button cannot be individually focused or activated via screen reader.

**Required fix:** Remove `accessible` and `accessibilityRole="alert"` from the outer card View. Instead:
1. Apply `accessibilityViewIsModal={true}` to the card View (for modal isolation).
2. Add `accessibilityRole="header"` to the title Text.
3. The OK `Pressable` remains individually accessible with its own role/label.
4. The description Text is individually traversable as normal content.

The `accessibilityRole="alert"` idiom is for live-region-style alerts that announce themselves immediately. It is inappropriate here because this is a modal dialog requiring explicit user action, not a transient alert.

### 4.4 All 6 Modal Consumers — Exhaustive Policy Table

| # | File | Title | Explicit dismiss action | Backdrop exists? | M22 backdrop action | `accessibilityViewIsModal` target | Title `accessibilityRole="header"` | Other action |
|---|---|---|---|---|---|---|---|---|
| 1 | `JournalDeleteDialog.tsx` | "Delete this journal entry?" | YES — Cancel + Delete buttons | YES — bare `Pressable` at L38 with `onPress={onCancel}` | Add `accessible={false}` to backdrop Pressable | Card `View` (testID `journal-delete-dialog-content`) | Title Text at L52 | Replace `marginRight: spacing.sm` at L78 with `marginEnd: spacing.sm` |
| 2 | `JournalPrivacySheet.tsx` | "Journal Privacy" | YES — Done button + Switch | YES — bare `Pressable` at L44 with `onPress={onClose}` | Add `accessible={false}` to backdrop Pressable | `sheetCard` View (testID `journal-privacy-content`) | Title Text at L64 | Replace `marginLeft: spacing.md` at L63 with `marginStart: spacing.md`; `paddingRight: 12` at L202 → `paddingEnd: 12` |
| 3 | `CustomRecurrenceModal.tsx` | "Custom Repeat" | YES — Done / Apply button + Close button | NO backdrop Pressable (overlay View, no `onPress`) | No change to overlay | `modalContent` View (testID `custom-recurrence-modal`) | Title Text at L111 | Fix A-24: calendar-switcher `accessibilityState={{ selected }}` → `{ checked }` |
| 4 | `EditScopeSheet.tsx` | "Edit Recurring Task" | YES — Cancel button + three scope option buttons | NO backdrop Pressable (overlay positioned flex-end) | No change to overlay | `sheetContainer` View (testID `edit-scope-sheet`) | Title Text at L66 | No other changes needed |
| 5 | `PremiumLockedInfo.tsx` | "Premium Feature" | YES — OK button | YES — `Pressable` at L38-44 with `onPress={onClose}`, label "Close dialog backdrop" | Replace label approach: add `accessible={false}` to backdrop Pressable; remove `accessibilityRole="button"`, `accessibilityLabel` from backdrop | Card `View` (testID `{testID}-content`) | Title Text at L73 | Remove `accessible` and `accessibilityRole="alert"` from card View; replace `marginRight: spacing.sm` at L67 with `marginEnd: spacing.sm` |
| 6 | `hijri-calendar.tsx` | "Add Month Override" | YES — Cancel + Save Override buttons | NO backdrop Pressable (forced modal, overlay View, no `onPress`) | No change to overlay | `modalContent` View (testID `add-override-modal`) | Title Text at L355 | Replace physical margins at L392, L400 with logical |

### 4.5 Modal Accessibility Template

```tsx
<Modal visible={...} transparent animationType="..." onRequestClose={dismiss}>
  <View style={overlay}>
    {/* Touch-dismiss backdrop — EXCLUDED from accessibility traversal */}
    {hasDismissibleBackdrop && (
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={dismiss}
        accessible={false}              {/* excluded from screen reader */}
      />
    )}
    {/* Content container — modal isolation */}
    <View
      accessibilityViewIsModal={true}
      style={contentStyles}
    >
      <Text accessibilityRole="header">{dialogTitle}</Text>
      {/* body content — traversable individually */}
      {/* explicit dismiss/confirm buttons — traversable individually */}
    </View>
  </View>
</Modal>
```

**Platform note:** `accessible={false}` is the cross-platform prop to remove a view from the accessibility tree. `importantForAccessibility="no"` is Android-specific but is equivalent. Using `accessible={false}` covers both iOS and Android.

---

## 5. Authoritative Finding Inventory

### 5.1 Finding Classification Schema

Findings are divided into two categories:
- **Implementation findings (A-series, RTL-series):** Require production code changes in M22.
- **Non-actionable observations (OBS-series):** Confirmed compliant; no code change needed. Documented for completeness.

### 5.2 Accessibility Implementation Findings (A-1..A-23)

**23 implementation findings** (A-1..A-24, with A-19 reclassified as OBS-1). Each has exactly one ID, category, severity, file(s), action, and test group.

| ID | Category | Severity | Affected File(s) | Required Action | Test Group |
|---|---|---|---|---|---|
| A-1 | Announcement | HIGH | `SettingsToggle.tsx` | Add `importantForAccessibility="no"` to icon `View` and textContainer `View` siblings of `Switch` | A |
| A-2 | Traversal / Noise | MEDIUM | `Icon.tsx` + ~20 callsites in labeled Pressables | Add `decorative?: boolean` prop; when true: empty label, role=none, importantForAccessibility=no | A |
| A-3 | Modal Isolation | HIGH | `JournalDeleteDialog.tsx` | `accessibilityViewIsModal={true}` on card View; `accessibilityRole="header"` on title | E |
| A-4 | Modal Isolation | HIGH | `JournalPrivacySheet.tsx` | Same as A-3 | E |
| A-5 | Modal Isolation | HIGH | `CustomRecurrenceModal.tsx` | Same as A-3 | E |
| A-6 | Modal Isolation | MEDIUM | `EditScopeSheet.tsx` | Same as A-3 | E |
| A-7 | Traversal / Noise | MEDIUM | `PrayerHeader.tsx` | Group content View with composite `accessibilityLabel`; hide decorative ornament; hide Arabic name | A, B |
| A-8 | Traversal / Noise | MEDIUM | `PrayerHeader.tsx` | Suppress countdown Text from individual traversal; include in composite label (throttled to 1/minute) | A |
| A-9 | Traversal / Noise | LOW | `SettingsRow.tsx` | Pass `decorative` to chevron Icon (via A-2) | A |
| A-10 | Grouping | MEDIUM | `TaskCard.tsx` | Group informational `contentContainer View`; composite label; interactive checkbox stays outside group | A, B |
| A-11 | Traversal / Noise | LOW | `DayDetailTaskList.tsx` | `importantForAccessibility="no"` on Arabic name Text | A |
| A-12 | Role | LOW | `CalendarMonthGrid.tsx` | Remove redundant/unnecessary `accessibilityRole="text"` from weekday header labels | B |
| A-13 | Role / State | HIGH | `app/onboarding/index.tsx` | Theme-select Pressables: `accessibilityRole="radio"`, `accessibilityLabel`, `accessibilityState={{ checked: isSelected }}` | A, B, C |
| A-14 | Role / State | HIGH | `app/onboarding/index.tsx` | Method-select Pressables: same as A-13 | A, B, C |
| A-15 | Label | MEDIUM | `app/onboarding/index.tsx` | City result Pressables: `accessibilityRole="button"`, `accessibilityLabel` (city+country+timezone) | A |
| A-16 | Traversal / Noise | LOW | `PrayerTabBar.tsx` | `importantForAccessibility="no"` on indicator dot View | A |
| A-17 | Live Region | MEDIUM | `SetupRequiredState.tsx`, `today.tsx`, `journal.tsx` | `accessibilityLiveRegion="assertive"` on dynamically appearing error Text | C |
| A-18 | Role | MEDIUM | `SettingsSectionHeader.tsx` | `accessibilityRole="header"` on section title Text | B |
| A-20 | Text Scaling | MEDIUM | `CalendarMonthGrid.tsx`, `CalendarDayCell.tsx` | `maxFontSizeMultiplier={2}` on calendar weekday labels and day cell numbers (§10) | F |
| A-21 | Label | LOW | `JournalHistory.tsx` | Back button already has role/label ✅; `chevron-left` needs `directional` prop (per §3); physical margin fix only | A |
| A-22 | Modal Isolation | MEDIUM | `PremiumLockedInfo.tsx` | `accessibilityViewIsModal={true}`; remove `accessible`/`accessibilityRole="alert"` from card View (hides OK button); title → `accessibilityRole="header"` | E |
| A-23 | Role | LOW | `PremiumBadge.tsx` | Remove redundant/unnecessary `accessibilityRole="text"`; `accessible + accessibilityLabel` retained | B |
| A-24 | Role / State | MEDIUM | `CustomRecurrenceModal.tsx` | Calendar-switcher Pressables already have `accessibilityRole="radio"` but wrong state key: change `{ selected }` → `{ checked }` (L137 in modal) | B, C |

> **A-19 is reclassified as OBS-1 (non-actionable observation). See §5.4.**

> **Review Finding D-1 Resolution (TaskCard Descendant Suppression):** The independent reviewer flagged TaskCard descendant suppression and proposed adding `importantForAccessibility="no-hide-descendants"` to the composite parent `contentContainer` View. However, the Lead rejected that proposed implementation after checking React Native 0.86's actual accessibility API: RN 0.86 defines `importantForAccessibility="no-hide-descendants"` as making that View itself AND all descendants not important to accessibility. Putting it on the composite accessible `contentContainer` View (which has `accessible={true}` and `accessibilityLabel={compositeLabel}`) could suppress the entire composite element from TalkBack. Therefore, the reviewer's proposed single-line fix was rejected. TaskCard implementation retained pending native TalkBack verification in M23. (Note: Android duplicate announcement was not confirmed via physical testing; verification deferred to native QA).

**Accessibility implementation finding count: 23 (A-1..A-24 numbering, minus A-19=OBS-1 = 23 implementation findings)**

### 5.3 RTL Implementation Findings (RTL-1..RTL-5)

| ID | Category | Severity | Affected File(s) | Required Action | Test Group |
|---|---|---|---|---|---|
| RTL-1 | Logical Margin | MEDIUM | 24 files (see §14) | Replace `marginLeft`→`marginStart`, `marginRight`→`marginEnd` in icon-text row contexts | H |
| RTL-2 | Logical Padding | MEDIUM | 3 files | Replace `paddingRight: 12`→`paddingEnd: 12` in icon-text/scroll contexts | H |
| RTL-3 | Directional Glyph | HIGH | `Icon.tsx`, `SettingsScreenHeader.tsx`, `CalendarHeader.tsx`, `JournalHistory.tsx`, `SettingsRow.tsx`, `JournalHistoryRow.tsx`, `CompletedSection.tsx`, `AnytimeTodaySection.tsx` | Add `directional` prop to Icon; apply to all 8 horizontal directional icon instances (§3); `chevron-down` not mirrored | I |
| RTL-4 | Row Layout | LOW | See §16–18 | PrayerTabBar, BottomNavBar, CalendarMonthGrid: ordering decisions frozen in §16–18 | J, K, L |
| RTL-5 | Physical Absolute | OBSERVATION | `PrayerHeader.tsx` | `right: -30` on decorative ornament — classified KEEP physical (§14.1) | — |

> **RTL-5 is reclassified as OBS-2 (non-actionable observation). See §5.4.**

**RTL implementation finding count: 4 (RTL-1..RTL-4)**

### 5.4 Non-Actionable Observations

These are confirmed compliant items documented for completeness. They are **not** implementation findings and do **not** count toward severity totals.

| ID | Item | Finding | Reason |
|---|---|---|---|
| OBS-1 | `CalendarHeader.tsx` — `accessibilityRole="header"` on month title | Already correctly applied | COMPLIANT — no change needed |
| OBS-2 | `PrayerHeader.tsx` — `right: -30` on decorative ornament | Physical absolute property | Retained as physical (decorative geometry) |
| OBS-3 | `textAlign: 'center'` across all files | Physical text alignment | Direction-neutral — no change |

### 5.5 Reconciled Severity Summary

**Implementation findings only (23 A-series + 4 RTL-series = 27 total):**

| Severity | A-series (23 findings) | RTL-series (4 findings) | Combined |
|---|---|---|---|
| HIGH | A-1, A-3, A-4, A-5, A-13, A-14; RTL-3 | — | **7** |
| MEDIUM | A-2, A-6, A-7, A-8, A-10, A-15, A-17, A-18, A-20, A-22, A-24; RTL-1, RTL-2 | — | **13** |
| LOW | A-9, A-11, A-12, A-16, A-21, A-23; RTL-4 | — | **7** |
| **Total** | **23** | **4** | **27** |

**Non-actionable observations: 3 (OBS-1, OBS-2, OBS-3)**

**Grand total (findings + observations): 30** — which reconciles with the prior severity count of 30 (the discrepancy was that OBS items were mixed into the A/RTL numbering and RTL-5 was double-counted as both MEDIUM and LOW).

---

## 6. Accessibility Semantic Contract

### 6.1 Role Contract (frozen, RN 0.86 validated)

| Control Type | `accessibilityRole` |
|---|---|
| Pressable navigation/close/save/retry | `"button"` |
| Native `Switch` | `"switch"` (implicit) |
| Settings scope toggle Pressable | `"switch"` |
| Checkbox | `"checkbox"` |
| Tab item | `"tab"` |
| Tab container | `"tablist"` |
| Radio option (mutually exclusive, single-select) | `"radio"` |
| Dialog content View | `accessibilityViewIsModal={true}` (not a role) |
| Dialog title / section header / calendar month title | `"header"` on the `Text` node |
| Decorative icon | `"none"` + `importantForAccessibility="no"` via `decorative` prop |
| Informational grouped card | `accessible={true}` + composite label on View, role omitted |

### 6.2 Accessibility State Contract (frozen)

| Role | Correct state key | Incorrect state key (do not use) |
|---|---|---|
| `"radio"` | `{ checked: boolean }` | `{ selected }` — WRONG |
| `"checkbox"` | `{ checked: boolean \| "mixed" }` | |
| `"switch"` | `{ checked: boolean }` | |
| `"tab"` | `{ selected: boolean }` | |
| Any interactive in disabled state | `{ disabled: boolean }` | |
| Any interactive in loading/busy state | `{ busy: boolean }` | |
| Collapsible/expandable | `{ expanded: boolean }` | |

**Calendar-switcher in `CustomRecurrenceModal` uses `accessibilityRole="radio"` with `{ selected }` — this is the bug caught in A-24 that must be corrected to `{ checked }`.**

---

## 7. RTL Activation / Readiness Contract

### 7.1 Current RTL Status

- `app.json`: No `supportsRTL`, no `forcesRTL`.
- `I18nManager`: NOT imported anywhere in production source (after M22, `Icon.tsx` will import it for `directional` prop — this is a read-only use of `I18nManager.isRTL`, not `forceRTL`).
- No locale system.
- App is English-language only.

### 7.2 M22 RTL Scope

**M22 scope: RTL Layout Readiness + Directional Glyph Correction.**

M22 does NOT add:
- Runtime RTL activation
- Language selector
- Localization/i18n system
- UI translation

M22 DOES add:
- Logical-style properties (marginStart/End, paddingStart/End) for icon-text row spacing
- `directional` prop on `Icon.tsx` that reads `I18nManager.isRTL` to flip directional glyphs
- The `directional` import of `I18nManager` is a **read-only use** — it does not call `forceRTL` or `allowRTL`.

---

## 8. Logical vs Physical Direction Contract

### 8.1 Classification Rules

| Pattern | Classification | Rule |
|---|---|---|
| `marginLeft` / `marginRight` between icon and adjacent text in `flexDirection: 'row'` | **LOGICAL** | Replace with `marginStart` / `marginEnd` |
| `paddingLeft` / `paddingRight` creating internal content gap in a row container | **LOGICAL** | Replace with `paddingStart` / `paddingEnd` |
| `marginLeft: 'auto'` for badge push-to-end | **PHYSICAL — KEEP** | `auto` is direction-neutral in flexbox |
| `textAlign: 'center'` | **PHYSICAL — KEEP** | Direction-neutral |
| `left: 0, right: 0, top: 0, bottom: 0` on overlay backdrops | **PHYSICAL — KEEP** | Full-screen geometric, not directional |
| `right: -30` on decorative ornament (PrayerHeader) | **PHYSICAL — KEEP** | Purely decorative visual effect (OBS-2) |
| `borderBottomWidth`, `borderTopWidth`, `borderLeftWidth`, `borderRightWidth` | **PHYSICAL — KEEP** | Structural borders; not directional |

### 8.2 Complete Logical Replacement Table

| File | Location | Current | Replace with |
|---|---|---|---|
| `Button.tsx` | L167 | `marginLeft` | `marginStart` |
| `Button.tsx` | L168 | `marginRight` | `marginEnd` |
| `Toggle.tsx` | textContainer StyleSheet | `marginRight: 16` | `marginEnd: 16` |
| `SettingsRow.tsx` | iconWrapper StyleSheet L55 | `marginRight: spacing.md` | `marginEnd: spacing.md` |
| `SettingsRow.tsx` | value Text L103 | `marginRight: ...` | `marginEnd: ...` |
| `SettingsInfoCard.tsx` | icon StyleSheet L37 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `SettingsToggle.tsx` | icon StyleSheet L57 | `marginRight: spacing.md` | `marginEnd: spacing.md` |
| `SettingsToggle.tsx` | paddingRight L117 | `paddingRight: 12` | `paddingEnd: 12` |
| `SettingsSelectOption.tsx` | L85 | `paddingRight: 12` | `paddingEnd: 12` |
| `PremiumLockedInfo.tsx` | iconContainer inline L67 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `PremiumBadge.tsx` | icon inline | `marginRight: 3` | `marginEnd: 3` |
| `PrayerHeader.tsx` | L64 | `marginLeft: spacing.md` | `marginStart: spacing.md` |
| `PrayerHeader.tsx` | L97 | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `PrayerTransitionBanner.tsx` | L101 | `marginRight: 12` | `marginEnd: 12` |
| `PrayerTransitionBanner.tsx` | L109 | `marginLeft: 8` | `marginStart: 8` |
| `TaskCard.tsx` | contentContainer StyleSheet | `marginLeft: 8` | `marginStart: 8` |
| `TaskCard.tsx` | metaItem inline L97 | `marginRight: 4` | `marginEnd: 4` |
| `AnytimeTodaySection.tsx` | sun icon inline L46 | `marginRight: 6` | `marginEnd: 6` |
| `JournalHeader.tsx` | L128 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `JournalHeader.tsx` | L154 | `marginLeft: 4` | `marginStart: 4` |
| `JournalHistory.tsx` | L52 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `JournalDeleteDialog.tsx` | Cancel button L78 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `JournalPrivacySheet.tsx` | titleContainer L63 | `marginLeft: spacing.md` | `marginStart: spacing.md` |
| `JournalPrivacySheet.tsx` | toggleLabelContainer L202 | `paddingRight: 12` | `paddingEnd: 12` |
| `ReflectionSection.tsx` | L59 | `marginLeft: spacing.sm` | `marginStart: spacing.sm` |
| `DayDetailTaskList.tsx` | L67 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `UpcomingSection.tsx` | L26 | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `UpcomingSection.tsx` | L107 | `marginRight: 4` | `marginEnd: 4` |
| `DateTimePickerInput.tsx` | L83 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `DateTimePickerInput.tsx` | L171 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `MoreOptionsSection.tsx` | L80 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `MoreOptionsSection.tsx` | L293 | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `MoreOptionsSection.tsx` | L378 | `marginLeft: 4` | `marginStart: 4` |
| `RecurrenceSection.tsx` | L188 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `ScheduleModeCards.tsx` | L113 | `marginLeft: spacing.sm` | `marginStart: spacing.sm` |
| `ScheduleModeCards.tsx` | L401 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `ScheduleModeCards.tsx` | L425 | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `SuccessScreen.tsx` | L89 | `marginRight: 6` | `marginEnd: 6` |
| `SuccessScreen.tsx` | L97 | `marginRight: 6` | `marginEnd: 6` |
| `TaskFormScreen.tsx` | validation error L326 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `SetupRequiredState.tsx` | L140 | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `SetupRequiredState.tsx` | L170 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `app/journal.tsx` | L253 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `app/journal.tsx` | L312 | `marginLeft: 12` | `marginStart: 12` |
| `hijri-calendar.tsx` | modal actions L392 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `hijri-calendar.tsx` | modal actions L400 | `marginLeft: spacing.sm` | `marginStart: spacing.sm` |
| `notifications.tsx` | icon margin rows | `marginRight` / `marginLeft` | `marginEnd` / `marginStart` |
| `planning-day.tsx` | icon margin rows | `marginRight` / `marginLeft` | `marginEnd` / `marginStart` |
| `prayer-location.tsx` | icon margin rows | `marginRight` / `marginLeft` | `marginEnd` / `marginStart` |

**Physical properties confirmed to KEEP:**
- `marginLeft: 'auto'` on badge push-to-end in TaskCard
- All `left: 0, right: 0, ...` on overlay backdrops
- `right: -30` on PrayerHeader decorative ornament (OBS-2)

---

## 9. Accessibility Grouping Policy

### 9.1 TaskCard

**Structure after M22:**
```
<View> {/* card — neutral container */}
  <View style={mainRow}>
    <TaskCheckbox />          {/* interactive — accessible sibling, NOT inside grouped container */}
    <View                     {/* contentContainer — GROUP */}
      style={contentContainer}
      accessible={true}
      accessibilityLabel={compositeLabel}
      importantForAccessibility="no-hide-descendants"
    >
      <Text>{title}</Text>   {/* hidden from individual traversal */}
      <Text>IMPORTANT</Text> {/* hidden from individual traversal */}
      <Text>Overdue</Text>   {/* hidden from individual traversal */}
    </View>
  </View>
</View>
```

**Composite label formula:** `"{title}{. Important.?}{. {statusBadge}?}{. {overdueLabel}?}"`

**TaskCheckbox:** `accessibilityRole="checkbox"`, `accessibilityLabel="Complete task: {title}"`, `accessibilityState={{ checked: isCompleted, disabled: !isPending }}` — unchanged, fully accessible as separate sibling.

### 9.2 PrayerHeader

- Group name block + badge + countdown in one `View` with `accessible={true}` + composite label.
- `importantForAccessibility="no-hide-descendants"` on that wrapper.
- Decorative ornament `View` (absolute): `importantForAccessibility="no"` (Android) + `accessibilityElementsHidden={true}` (iOS).
- Composite label throttled to update at most 1/minute to prevent continuous VoiceOver re-announcement.

**Composite label formula:** `"Current prayer: {name}.{countdown ? ' Next: {nextName} in {countdown}' : ''}"`

### 9.3 Other Group Decisions

- `SettingsRow`: Pressable already groups all children — no additional grouping needed. Chevron Icon receives `decorative`.
- `PremiumLockedInfo`: Do NOT group the card — OK button must remain individually accessible. (See §4.3.)
- `CalendarDayCell`: Already has `accessible={true}` + composite `accessibilityLabel` from model — COMPLIANT.

---

## 10. Text Scaling Contract — Per-Node Justification

### 10.1 Policy

- `allowFontScaling={true}` is the default everywhere. **Never disable globally.**
- `maxFontSizeMultiplier` is a last-resort architectural accommodation, not a general tool.
- Each use requires this exact justification framework:

> (1) Which exact Text node. (2) Why unrestricted scaling breaks essential usability. (3) Flexible alternatives considered. (4) Why layout flexibility alone is insufficient. (5) Why 2.0 is the least-restrictive safe cap. (6) What content remains readable at 2×. (7) Automated test. (8) Native large-text QA in M23.

### 10.2 Node 1 — CalendarMonthGrid weekday header labels ("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

**Exact Text node:** `CalendarMonthGrid.tsx` weekday header Text, lines ~34–46. Typography: `typography.caption` (base ~11pt). StyleSheet uses `flex: 1` on the cell View and `weekdayHeaderRow` is `flexDirection: 'row'` with `justifyContent: 'space-between'`.

**Why unrestricted scaling breaks essential usability:** The weekday header row contains exactly 7 cells in `flexDirection: 'row'`, each with `flex: 1`. At font scale 3× (33pt for 11pt base), a 3-character abbreviation ("Sun") would require approximately 40+ pt of width. On a 375pt-wide phone screen (iPhone SE), each of 7 cells has ~53pt. At 3× scale, the text at 33pt requires ~50pt width with letter spacing, leaving 3pt margin — this causes text clipping or overflow against the constrained `flex: 1` width. The weekday headers are navigational context for the calendar grid; clipped or overflowed headers destroy the visual column-alignment that makes the grid readable.

**Flexible alternatives considered:**
- Shrink the text with `adjustsFontSizeToFit` — causes illegibility at scales where the user has specifically requested large text.
- Single-character abbreviations ("S", "M", "T") — ambiguous (Tue/Thu both "T", Sat/Sun both "S"), less accessible for screen readers that already read the label.
- Allow wrapping — a `flexWrap: 'wrap'` text in a fixed 1/7-width cell would wrap to 2 lines, breaking the header row height from the grid rows below and causing visual misalignment between header and data cells.

**Why layout flexibility alone is insufficient:** The grid is structurally constrained to 7 equal-width columns. Each column's width is determined by the screen width, not by content. There is no `minWidth` for content that would allow the row to expand — doing so would break the fixed-7-column layout contract that makes the month grid functional.

**Why 2.0 is the least-restrictive safe cap:** At 2× scale (22pt for 11pt base), a 3-character abbreviation in a ~53pt-wide cell renders with adequate spacing. At 2.5× (27.5pt), text begins competing for the cell's narrow width. At 3× (33pt), clipping occurs. `maxFontSizeMultiplier={2}` is the largest value that preserves layout integrity across standard screen sizes (375pt width, which is the smallest common current device).

**What remains readable at 2×:** The 3-character day abbreviation at 22pt is comfortably readable. The weekday headers serve as column labels — their abbreviations ("Sun", "Mon") remain unambiguous at this size.

**Automated test:** Group F test `F-1` — render `CalendarMonthGrid` with mocked `PixelRatio.getFontScale()` = 3; assert `Text` nodes with `maxFontSizeMultiplier={2}` cap rendering at 22pt (not 33pt).

**Native M23 QA:** Verify at iOS "Settings → Accessibility → Display & Text Size → Larger Text → maximum" and Android "Settings → Font size → Largest". Confirm no header text clips or overflows.

### 10.3 Node 2 — CalendarDayCell Gregorian day number ("1"–"31")

**Exact Text node:** `CalendarDayCell.tsx` Gregorian day number Text, lines ~53–67. Typography: `typography.bodyMedium` (base ~16pt). Cell container: `styles.cellContainer` has `flex: 1`, `minHeight: touchTargets.min` (44pt), `minWidth: touchTargets.min` (44pt), `paddingVertical: 4`.

**Why unrestricted scaling breaks essential usability:** The day cell has a fixed `minHeight: 44` and `minWidth: 44` (touch target minimum). At 3× font scale, the Gregorian number at 48pt would be taller than the cell's minimum height, causing vertical overflow. The cell also contains a Hijri sub-number below and a task-presence dot. At 3× scale, the Gregorian number alone at 48pt occupies the entire cell height, pushing the Hijri number and task dot out of bounds.

**Flexible alternatives considered:**
- Remove `minHeight`/`minWidth` touch target — violates accessibility minimum touch target requirement (44pt is the Apple HIG and Android minimum). Removing it would fail an accessibility audit.
- Use `adjustsFontSizeToFit` — shrinks the text below the scale the user requested, defeating the purpose of Large Text.
- Expand cell height with scale — each grid row's height would expand by up to 3× at maximum scale. A 6-row calendar month grid would be ~792pt tall (6 rows × 44pt × 3 scale), exceeding the screen height of any current device, making the month un-navigable without horizontal scrolling or a completely different calendar architecture.

**Why layout flexibility alone is insufficient:** The touch-target requirement (44pt min) is non-negotiable for accessibility. The grid row height cannot expand beyond approximately 88pt (2× scale) without exceeding visible screen height for a 6-row month. There is no flexible alternative that simultaneously respects touch targets, avoids clipping, and keeps the month grid navigable.

**Why 2.0 is the least-restrictive safe cap:** At 2× scale (32pt for 16pt base), the Gregorian number at 32pt fits within a cell of `~64pt height` (which is ~88pt with padding) without clipping the Hijri sub-number. At 2.5× (40pt), the Gregorian number starts crowding the Hijri sub-number into the task dot area. At 3× (48pt), overflow is certain. `maxFontSizeMultiplier={2}` is the maximum that preserves the three-element vertical stack (Gregorian / Hijri / dot) within the cell.

**What remains readable at 2×:** A 32pt day number is highly legible. The cell dimensions at 2× are approximately 88×88pt — spacious for a numeric label.

**Automated test:** `F-2` — render `CalendarDayCell` with `PixelRatio.getFontScale()` = 3; assert Gregorian number Text has `maxFontSizeMultiplier={2}` and effective font size caps at 32pt.

**Native M23 QA:** Same as Node 1.

### 10.4 Node 3 — CalendarDayCell Hijri sub-number ("1"–"30")

**Exact Text node:** `CalendarDayCell.tsx` Hijri day number Text, lines ~70–82. Typography: `typography.caption` with explicit `fontSize: 10, lineHeight: 12`.

**Why unrestricted scaling breaks essential usability:** The Hijri sub-number is visually subordinate to the Gregorian number and is constrained within the same 44pt-min-height cell. At 3× font scale, `fontSize: 10` becomes 30pt with `lineHeight: 36`. The Gregorian number (32pt at 2× cap, 48pt uncapped) occupies the top portion of the cell. The Hijri sub-number at 30pt would require an additional 36pt of vertical space, exceeding what remains after the Gregorian number. The `dotContainer` (task presence indicator) at 6pt height would be pushed off the bottom of the cell.

**Flexible alternatives considered:**
- Hide Hijri sub-number at large scales — loses meaningful dual-date context that is important for the Islamic planning use case. Unacceptable product regression.
- Move Hijri sub-number to a tooltip — requires interaction, defeating the purpose of at-a-glance dual-date display.
- Increase cell height for Hijri row — same argument as Node 2: the fixed-grid layout cannot expand row height without breaking the month view navigability.

**Why layout flexibility alone is insufficient:** The cell is geometrically constrained by the touch target minimum and the fixed-grid layout. Three vertical elements (Gregorian number, Hijri sub-number, task dot) must fit in ~44–88pt. The Hijri sub-number at 10pt base is the smallest element; scaling it to 30pt at 3× makes it larger than the Gregorian number was at 1× scale, inverting the intended visual hierarchy.

**Why 2.0 is the least-restrictive safe cap:** At 2× scale, `fontSize: 10` becomes 20pt with `lineHeight: 24`. Combined with the Gregorian number at 32pt, the three-element stack occupies approximately 32pt + 24pt + 6pt = 62pt, which fits within a cell of 88pt height (44pt min + 4pt paddingVertical × 2). At 2.5× (25pt Hijri, 40pt Gregorian), the stack exceeds 72pt, causing tighter fit. At 3× (30pt Hijri), overflow occurs.

**What remains readable at 2×:** A 20pt Hijri sub-number is highly legible. The visual hierarchy (Gregorian > Hijri) is preserved at 32pt vs. 20pt.

**Automated test:** `F-3` — same as F-2 but for the Hijri Text node.

**Native M23 QA:** Same as Node 1.

### 10.5 No Other maxFontSizeMultiplier Uses Authorized in M22

**All other Text nodes in the 82-file scope use unrestricted scaling.** This includes all settings rows, task cards, journal text, prayer headers (where text can expand freely), onboarding screens, and navigation headers. No additional caps are authorized.

---

## 11. Screen-Reader Live Region Contract

| Trigger | Element | `accessibilityLiveRegion` |
|---|---|---|
| Countdown updates every second (PrayerHeader) | countdown Text | **NONE** — suppress from traversal; include in composite label on demand |
| Autosave status (JournalSaveStatus) | status Text | `"polite"` ✅ already present |
| Prayer transition (PrayerTransitionBanner) | banner Text | `"polite"` ✅ already present |
| Error appearing (SetupRequiredState, today.tsx, journal.tsx) | error Text | `"assertive"` |

---

## 12. Prayer Tab RTL Order (FROZEN)

See ADR-030 §C.

**Canonical array:** `[FAJR, DHUHR, ASR, MAGHRIB, ISHA]` — never changes, never reversed.
**Container:** No `direction: 'ltr'` forced. Natural flex mirroring.
**LTR:** Fajr left → Isha right. **RTL:** Fajr right → Isha left. RTL users read Fajr → Isha (chronologically correct).
**Screen reader order:** Always Fajr → Isha (DOM order), both directions.

---

## 13. BottomNavBar RTL Order (FROZEN)

See ADR-030 §D.

**Canonical route indices:** `[today=0, calendar=1, add=2, journal=3, settings=4]` — never changes.
**Active state:** Index-based, not position-based — unaffected by visual direction.
**Add button (index 2):** Remains at visual center in both LTR and RTL (5 items, center is always index 2).

---

## 14. Calendar RTL (FROZEN)

See ADR-030 §E.

**Weekday array:** `['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']` — never changes.
**Previous/Next callbacks:** `onPreviousMonth` / `onNextMonth` — semantic meaning never swaps.
**CalendarHeader chevron glyphs:** Mirror via `directional` prop (§3) — the glyph flips, the callback does not.

---

## 15. Exact Planned Production File Change List

**Total: 44 production files**

1. `src/components/common/Icon.tsx` — decorative + directional props
2. `src/components/common/Button.tsx` — logical margins
3. `src/components/common/Toggle.tsx` — logical margin
4. `src/components/layout/BottomNavBar.tsx` — decorative icons
5. `src/components/prayer/PrayerTabBar.tsx` — indicator dot suppressed; tab icons decorative
6. `src/components/prayer/PrayerHeader.tsx` — grouping; composite label; decorative suppression; logical margins
7. `src/components/prayer/PrayerTransitionBanner.tsx` — logical margins
8. `src/components/task/TaskCard.tsx` — informational grouping; composite label; logical margins
9. `src/components/task/CompletedSection.tsx` — decorative expand chevron
10. `src/components/task/AnytimeTodaySection.tsx` — decorative icons; logical margin
11. `src/components/journal/JournalDeleteDialog.tsx` — modal isolation; header role; backdrop accessible={false}; logical margin
12. `src/components/journal/JournalPrivacySheet.tsx` — modal isolation; header role; backdrop accessible={false}; logical replacements
13. `src/components/journal/JournalHeader.tsx` — logical margins
14. `src/components/journal/JournalHistory.tsx` — directional back icon; logical margin
15. `src/components/journal/JournalHistoryRow.tsx` — decorative disclosure chevron
16. `src/components/journal/ReflectionSection.tsx` — logical margin
17. `src/components/calendar/CalendarHeader.tsx` — directional prev/next icons; decorative on both
18. `src/components/calendar/CalendarDayCell.tsx` — maxFontSizeMultiplier on day/Hijri numbers
19. `src/components/calendar/CalendarMonthGrid.tsx` — remove redundant text role; maxFontSizeMultiplier on weekday labels
20. `src/components/calendar/DayDetailTaskList.tsx` — Arabic name suppressed; logical margin
21. `src/components/calendar/UpcomingSection.tsx` — logical margins
22. `src/components/settings/SettingsSectionHeader.tsx` — header role
23. `src/components/settings/SettingsRow.tsx` — decorative disclosure chevron; logical margins
24. `src/components/settings/SettingsToggle.tsx` — double-announcement suppression; logical replacements
25. `src/components/settings/SettingsSelectOption.tsx` — logical padding
26. `src/components/settings/SettingsInfoCard.tsx` — logical margin
27. `src/components/settings/SettingsScreenHeader.tsx` — decorative + directional back icon
28. `src/components/premium/PremiumBadge.tsx` — remove redundant text role; decorative lock icon; logical margin
29. `src/components/premium/PremiumLockedInfo.tsx` — modal isolation; remove accessible group (expose OK button); header role; backdrop accessible={false}; logical margin
30. `src/components/task-form/CustomRecurrenceModal.tsx` — modal isolation; header role; fix radio state key (A-24)
31. `src/components/task-form/EditScopeSheet.tsx` — modal isolation; header role
32. `src/components/task-form/DateTimePickerInput.tsx` — logical margins
33. `src/components/task-form/MoreOptionsSection.tsx` — logical margins
34. `src/components/task-form/RecurrenceSection.tsx` — logical margin
35. `src/components/task-form/ScheduleModeCards.tsx` — logical margins
36. `src/components/task-form/SuccessScreen.tsx` — logical margins
37. `src/components/task-form/TaskFormScreen.tsx` — logical margin
38. `src/components/today/SetupRequiredState.tsx` — logical margins; live region
39. `app/(tabs)/today.tsx` — error live region
40. `app/(tabs)/journal.tsx` — logical margins; error live region
41. `app/(tabs)/settings/hijri-calendar.tsx` — modal isolation; header role; logical margins
42. `app/(tabs)/settings/notifications.tsx` — logical margins
43. `app/(tabs)/settings/planning-day.tsx` — logical margins
44. `app/(tabs)/settings/prayer-location.tsx` — logical margins

> `app/onboarding/index.tsx` is file #45 — included in count: **total = 45 production files.**

45. `app/onboarding/index.tsx` — radio roles; radio states (checked); city result labels

---

## 16. Test Matrix

| Group | Description | Test File | Est. Tests |
|---|---|---|---|
| A | Accessible Names & Traversal | `src/__tests__/m22/AccessibleNames.test.tsx` | 22 |
| B | Roles | `src/__tests__/m22/AccessibilityRoles.test.tsx` | 16 |
| C | States & Live Regions | `src/__tests__/m22/AccessibilityStates.test.tsx` | 14 |
| E | Modal Accessibility Isolation | `src/__tests__/m22/ModalAccessibility.test.tsx` | 18 |
| F | Text Scaling | `src/__tests__/m22/TextScaling.test.tsx` | 6 |
| H | RTL Logical Styles | `src/__tests__/m22/RTLLogicalStyles.test.tsx` | 26 |
| I | RTL Directional Icons | `src/__tests__/m22/RTLIcons.test.tsx` | **12** |
| J | Prayer Tab RTL Order | `src/__tests__/m22/PrayerTabRTL.test.tsx` | 8 |
| K | Calendar RTL | `src/__tests__/m22/CalendarRTL.test.tsx` | 8 |
| L | Arabic/Bidi Text Suppression | `src/__tests__/m22/ArabicBidi.test.tsx` | 6 |
| M | Static A11y Audit | `src/__tests__/m22/StaticA11yAudit.test.tsx` | 10 |
| **Total** | | | **146** |

**Baseline:** 1404 tests / 121 suites
**Estimated M22 additions:** **146** new tests / 11 new test suites
**Expected M22 total:** **~1550** tests / ~132 suites
**Minimum acceptable:** ≥ 1504 total tests (≥ 100 new)

---

## 17. Native QA Carry-Forward (M23)

| Item | Description |
|---|---|
| TaskCard TalkBack grouping / duplicate announcements | Verify TaskCard composite announcement and absence of duplicate descendant announcements with Android TalkBack on a physical/emulated native build |
| VoiceOver TaskCard grouping | Verify TaskCard composite announcement and checkbox navigation in VoiceOver on iOS device |
| Modal focus trapping | VoiceOver and TalkBack modal focus trapping across all 6 native modals (`JournalDeleteDialog`, `JournalPrivacySheet`, `CustomRecurrenceModal`, `EditScopeSheet`, `PremiumLockedInfo`, `hijri-calendar`) |
| TalkBack `accessibilityViewIsModal` | Verify `accessibilityViewIsModal` effectiveness on Android API levels 29–34 |
| Physical RTL rendering | Physical RTL layout rendering across all screens on device with Arabic/Hebrew system locale |
| RTL navigation and tab order | Prayer tab chronological order and BottomNavBar visual order on device with RTL locale |
| Calendar grid mirroring | Calendar grid natural flex mirroring on device with RTL locale |
| Directional icon glyph flip | Verify directional icon glyph flip on device with RTL locale (back chevrons, prev/next month chevrons) |
| Large accessibility text calendar behavior | Large Accessibility Text (iOS max / Android largest) layout and wrapping on calendar weekday labels and day cell numbers |
| Widget accessibility | Widget accessibility tree inspection (M23/M24) |

---

## 18. Verification Gates (Pre-Implementation-Review)

1. `npx tsc --noEmit` → 0 errors
2. `npx eslint . --ext ts,tsx --max-warnings=0` → 0 errors, 0 warnings
3. `npx jest --passWithNoTests` → 0 failures; all 1404 existing tests pass; all 146 M22 tests pass
4. New test count ≥ 100
5. Total test count ≥ 1504
6. `git diff --stat origin/main HEAD` → 0 changes to domain, schema, migrations, services, widgets, package files
7. `git diff --check` → no whitespace errors
8. `git rev-parse origin/main` → `a8c837c6ef6c27d3bc81a48b6e1d12e6489874f1`
9. M22 architecture commits local — NOT pushed until closure
10. Implementation commits NOT pushed until formal closure

---

## 19. Closure Criteria

1. All HIGH findings resolved (A-1, A-3, A-4, A-5, A-13, A-14, RTL-3)
2. All MEDIUM findings resolved or documented carry-forward
3. 0 TypeScript errors
4. 0 ESLint errors/warnings
5. All M22 tests passing; total ≥ 1504
6. 0 new dependencies
7. 0 new migrations
8. Independent review: APPROVED
9. Supporting docs updated
10. ONE authorized push to `origin/main`

---

## 20. Scope Exclusions

- Arabic app translation
- Runtime `I18nManager.forceRTL()` call
- Locale/language selector
- Widget accessibility
- Any domain, scheduling, database, or notification changes
- New dependencies
- New migrations

---

## ADR-030 — Accessibility Semantics and RTL Layout Contract

**Status:** AUTHORIZED AND FINALIZED in M22.
**Supersedes:** Draft in c79cdaf.

See `docs/DECISIONS.md` for the complete binding ADR-030 text. Summary of durable rules:

1. `radio` → `accessibilityState.checked`; `tab` → `accessibilityState.selected`
2. All `<Modal>` consumers: `accessibilityViewIsModal={true}` on innermost content View
3. Modal titles + section headers: `accessibilityRole="header"` on Text node
4. Backdrop Pressables in modals with explicit dismiss buttons: `accessible={false}`
5. `decorative` prop on `Icon` suppresses traversal
6. `directional` prop on `Icon` flips glyph in RTL (reads `I18nManager.isRTL`, never calls `forceRTL`)
7. Prayer tab order: canonical array unchanged; no forced LTR; natural flex mirroring
8. BottomNavBar: canonical route indices unchanged; natural flex mirroring
9. Calendar: `onPreviousMonth`/`onNextMonth` semantics never swap
10. Disclosure icons (chevron-right in SettingsRow, JournalHistoryRow, expand-collapse): NOT directional
11. Navigation icons (chevron-left back, chevron-left/right prev/next month): ARE directional
12. `maxFontSizeMultiplier` authorized only for 3 calendar cell Text nodes, cap={2}, with per-node justification
13. `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd` mandate for icon-text row spacing
14. `PremiumLockedInfo` card: do NOT use `accessible` on the card wrapper — OK button must be individually traversable
