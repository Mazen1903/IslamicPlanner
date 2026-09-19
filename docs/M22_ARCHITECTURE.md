# M22 — Accessibility / RTL Architecture

**Status:** HARDENED — PENDING LEAD REVIEW
**Milestone:** M22 — Accessibility / RTL
**Architect:** Sonnet (independent reviewer role)
**React Native version:** 0.86.3
**Baseline commit:** `a8c837c6ef6c27d3bc81a48b6e1d12e6489874f1`
**Initial freeze commit:** `20c68e2`
**Hardening commit:** *(this document revision)*
**Date hardened:** 2026-09-19

---

## 1. Milestone Overview

M22 makes the application materially accessible and RTL-ready. It addresses two related but distinct concerns:

- **Part A — Accessibility:** Expose correct accessible names, roles, states, touch targets, modal isolation, text scaling, error announcements, and non-color signals to screen readers (VoiceOver / TalkBack).
- **Part B — RTL Layout Readiness:** Audit and classify all directional styling; establish a logical-direction contract; resolve the prayer-tab RTL ordering question, the bottom-nav RTL question, and the calendar RTL question.

M22 must not change domain logic, scheduling behavior, database schema, or planner semantics.

---

## 2. Complete Production File Audit

**Authoritative scope:** `app/**/*.{ts,tsx}` and `src/components/**/*.{ts,tsx}`, excluding any file under `__tests__`.

**Independently verified count: 82 production files** (PowerShell enumeration, 2026-09-19).

### 2.1 Audit Disposition Legend

- **CHANGE:** M22 production changes required
- **COMPLIANT:** Inspected — already compliant, no change needed
- **PLACEHOLDER:** Inspected — stub/placeholder component, no production UI, no change
- **BARREL:** Index barrel file — no UI, no accessibility concerns, no change
- **LAYOUT:** Infrastructure/layout file with no accessibility issues
- **OUT-OF-SCOPE:** Explicitly out of M22 scope (reason given)

### 2.2 Complete 82-File Audit Matrix

| # | File (relative) | Disposition | Reason / Issues |
|---|---|---|---|
| 1 | `app/(tabs)/_layout.tsx` | COMPLIANT | Navigation shell, no interactive elements |
| 2 | `app/(tabs)/add.tsx` | COMPLIANT | Delegates to TaskFormScreen; no direct a11y or RTL gaps |
| 3 | `app/(tabs)/calendar.tsx` | COMPLIANT | Delegates to CalendarHeader, CalendarMonthGrid, DayDetailTaskList; screen-level no direct gaps |
| 4 | `app/(tabs)/journal.tsx` | **CHANGE** | Physical `marginLeft` (L253, L312); error/lock Text lacks `accessibilityLiveRegion` |
| 5 | `app/(tabs)/settings/_layout.tsx` | COMPLIANT | Stack navigator shell; no direct UI |
| 6 | `app/(tabs)/settings/about.tsx` | COMPLIANT | Purely informational Text; no interactive elements with missing labels |
| 7 | `app/(tabs)/settings/appearance.tsx` | COMPLIANT | Uses `SettingsSelectOption` (compliant); physical margins in spacing but no icon-text directional spacing |
| 8 | `app/(tabs)/settings/hijri-calendar.tsx` | **CHANGE** | Modal missing `accessibilityViewIsModal`; modal title missing `accessibilityRole="header"`; physical `marginRight`/`marginLeft` in modal actions (L392, L400) |
| 9 | `app/(tabs)/settings/index.tsx` | COMPLIANT | Hub using `SettingsRow`; no direct gaps |
| 10 | `app/(tabs)/settings/journal-privacy.tsx` | COMPLIANT | Uses `SettingsToggle`, `SettingsRow`; no direct gaps |
| 11 | `app/(tabs)/settings/notifications.tsx` | **CHANGE** | Physical `marginRight`/`marginLeft` on icon spacing rows |
| 12 | `app/(tabs)/settings/planning-day.tsx` | **CHANGE** | Physical `marginRight`/`marginLeft` on icon spacing rows |
| 13 | `app/(tabs)/settings/prayer-calculation.tsx` | COMPLIANT | Uses `SettingsSelectOption`, `SettingsRow`; no direct gaps |
| 14 | `app/(tabs)/settings/prayer-location.tsx` | **CHANGE** | Physical `marginRight`/`marginLeft` on icon spacing rows |
| 15 | `app/(tabs)/today.tsx` | **CHANGE** | Error state `Text` lacks `accessibilityLiveRegion="assertive"` |
| 16 | `app/_layout.tsx` | COMPLIANT | Root layout; `themeReady` gate; no direct a11y/RTL |
| 17 | `app/demo.tsx` | OUT-OF-SCOPE | Not a user-facing production route; demo gating deferred to M24 per ADR-029 |
| 18 | `app/onboarding/index.tsx` | **CHANGE** | Theme-select Pressables (A-13): no role/label/state; method-select Pressables (A-14): no role/label/state; city result Pressables (A-15): no role/label |
| 19 | `app/task/[id].tsx` | COMPLIANT | Delegates to TaskFormScreen; no direct a11y/RTL gaps |
| 20 | `app/task/add.tsx` | COMPLIANT | Delegates to TaskFormScreen; no direct a11y/RTL gaps |
| 21 | `src/components/calendar/CalendarDayCell.tsx` | **CHANGE** | `maxFontSizeMultiplier={2}` on day number and Hijri sub-number Text only (justified per §10) |
| 22 | `src/components/calendar/CalendarHeader.tsx` | COMPLIANT | Prev/Next labeled, month `accessibilityRole="header"`, Today labeled |
| 23 | `src/components/calendar/CalendarMonthGrid.tsx` | **CHANGE** | Weekday headers have incorrect `accessibilityRole="text"` (remove); `maxFontSizeMultiplier={2}` on weekday header labels (justified per §10) |
| 24 | `src/components/calendar/DayDetailTaskList.tsx` | **CHANGE** | Arabic name Text (L67–69) lacks `importantForAccessibility="no"`; physical `marginLeft` (L67) |
| 25 | `src/components/calendar/UpcomingSection.tsx` | **CHANGE** | Icon `marginRight` at L26: physical, replace with `marginEnd`; icon `marginRight` at L107: physical, replace with `marginEnd`; task cards are read-only informational, no checkbox — no grouping issue |
| 26 | `src/components/common/BottomSheet.tsx` | PLACEHOLDER | Stub component; exports `Placeholder` function; no production UI |
| 27 | `src/components/common/Button.tsx` | **CHANGE** | Physical `marginLeft`/`marginRight` in icon-spacing (L167–168) |
| 28 | `src/components/common/Card.tsx` | COMPLIANT | Pressable variant has `accessibilityRole="button"`, label, disabled state; View variant is non-interactive container |
| 29 | `src/components/common/Icon.tsx` | **CHANGE** | Add `decorative?: boolean` prop — when true: `accessibilityLabel=""`, `accessibilityRole="none"`, `importantForAccessibility="no"` on Android |
| 30 | `src/components/common/Toggle.tsx` | **CHANGE** | Physical `marginRight: 16` on textContainer (L144) |
| 31 | `src/components/form/ExactTimePicker.tsx` | PLACEHOLDER | Stub; no production UI |
| 32 | `src/components/form/PrayerRelativePicker.tsx` | PLACEHOLDER | Stub; no production UI |
| 33 | `src/components/form/PrayerWindowPicker.tsx` | PLACEHOLDER | Stub; no production UI |
| 34 | `src/components/form/RecurrencePicker.tsx` | PLACEHOLDER | Stub; no production UI |
| 35 | `src/components/form/ReminderPicker.tsx` | PLACEHOLDER | Stub; no production UI |
| 36 | `src/components/form/ScheduleModePicker.tsx` | PLACEHOLDER | Stub; no production UI |
| 37 | `src/components/journal/index.ts` | BARREL | Re-export barrel; no UI |
| 38 | `src/components/journal/JournalDeleteDialog.tsx` | **CHANGE** | No `accessibilityViewIsModal`; title Text not `accessibilityRole="header"`; physical `marginRight` (L78) |
| 39 | `src/components/journal/JournalEditor.tsx` | COMPLIANT | `accessibilityLabel`, `accessibilityHint` already present |
| 40 | `src/components/journal/JournalHeader.tsx` | **CHANGE** | Physical `marginLeft` (L128, L154) |
| 41 | `src/components/journal/JournalHistory.tsx` | **CHANGE** | Back button verified ✅ (has `accessibilityRole="button"`, label "Back to today's entry"); physical `marginLeft` on Text at L52 |
| 42 | `src/components/journal/JournalHistoryRow.tsx` | **CHANGE** | `chevron-right` Icon inside labeled Pressable — passes `decorative` (A-2 fix); no physical directional margin issues |
| 43 | `src/components/journal/JournalLockedState.tsx` | COMPLIANT | Unlock button labeled, disabled state |
| 44 | `src/components/journal/JournalPrivacySheet.tsx` | **CHANGE** | No `accessibilityViewIsModal`; title Text not `accessibilityRole="header"`; physical `marginLeft` (L63); physical `paddingRight: 12` (L202) |
| 45 | `src/components/journal/JournalSaveStatus.tsx` | COMPLIANT | `accessibilityLiveRegion="polite"`, label |
| 46 | `src/components/journal/ReflectionField.tsx` | COMPLIANT | `accessibilityLabel` from field label, `accessibilityHint` |
| 47 | `src/components/journal/ReflectionSection.tsx` | **CHANGE** | Physical `marginLeft` (L59) |
| 48 | `src/components/layout/BottomNavBar.tsx` | **CHANGE** | Icon in tab not `decorative` (A-2 fix); Icon in Add button not `decorative` (A-2 fix); LTR/RTL ordering contract per §17 |
| 49 | `src/components/layout/SafeArea.tsx` | COMPLIANT | Infrastructure wrapper; no a11y/RTL concerns |
| 50 | `src/components/prayer/PrayerHeader.tsx` | **CHANGE** | No accessible grouping (A-7); countdown traversal (A-8); decorative ornament not hidden (position: absolute, right: -30); Arabic name `Text` not hidden; physical `marginLeft` (L64), `marginRight` (L97) |
| 51 | `src/components/prayer/PrayerTabBar.tsx` | **CHANGE** | Indicator dot not `importantForAccessibility="no"` (A-16); RTL ordering contract per §16; tab Icons not `decorative` |
| 52 | `src/components/prayer/PrayerTransitionBanner.tsx` | **CHANGE** | Physical `marginRight: 12` (L101), physical `marginLeft: 8` (L109) |
| 53 | `src/components/premium/index.ts` | BARREL | Re-export barrel; no UI |
| 54 | `src/components/premium/PremiumBadge.tsx` | **CHANGE** | `accessibilityRole="text"` — not a valid RN role (should be omitted or `"none"`); physical `marginRight: 3` on icon; icon inside accessible group should be `decorative` |
| 55 | `src/components/premium/PremiumLockedInfo.tsx` | **CHANGE** | Missing `accessibilityViewIsModal={true}` on content `View` (currently uses `accessibilityRole="alert"` on the content View — this is acceptable, but `accessibilityViewIsModal` is still required for Android TalkBack containment); title `Text` (line 73) lacks `accessibilityRole="header"`; physical `marginRight: spacing.sm` on icon container (L67) |
| 56 | `src/components/settings/index.ts` | BARREL | Re-export barrel; no UI |
| 57 | `src/components/settings/SettingsInfoCard.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` on icon (L37) |
| 58 | `src/components/settings/SettingsRow.tsx` | **CHANGE** | Physical `marginRight: spacing.md` (L55, L103); `chevron-right` Icon at L114 not `decorative` |
| 59 | `src/components/settings/SettingsScreenHeader.tsx` | COMPLIANT | Back button labeled "Go back", touch target sized; `chevron-left` Icon in back button — no `decorative` needed since Pressable label covers it, but Icon inside labeled Pressable → add `decorative` |
| 60 | `src/components/settings/SettingsSectionHeader.tsx` | **CHANGE** | Section title `Text` missing `accessibilityRole="header"` (A-18) |
| 61 | `src/components/settings/SettingsSelectOption.tsx` | **CHANGE** | Physical `paddingRight: 12` (L85) |
| 62 | `src/components/settings/SettingsStepper.tsx` | COMPLIANT | Decrement/Increment `touchTargets.min`-sized, labeled "Decrease"/"Increase {label}" |
| 63 | `src/components/settings/SettingsToggle.tsx` | **CHANGE** | Double announcement risk (A-1): icon `View` and textContainer `View` not suppressed; physical `marginRight: spacing.md` (L57); physical `paddingRight: 12` (L117) |
| 64 | `src/components/task/AllDoneState.tsx` | COMPLIANT | Purely informational; icon in non-interactive container — no accessibility grouping concerns |
| 65 | `src/components/task/AnytimeTodaySection.tsx` | **CHANGE** | Physical `marginRight: 6` on icon (L46) |
| 66 | `src/components/task/CompletedSection.tsx` | **CHANGE** | `chevron-right`/`chevron-down` Icon in labeled Pressable → add `decorative` |
| 67 | `src/components/task/EmptyPrayerState.tsx` | COMPLIANT | Purely informational; icon in non-interactive container |
| 68 | `src/components/task/MissedTaskRow.tsx` | COMPLIANT | Thin wrapper around `TaskCard`; no direct a11y/RTL gaps |
| 69 | `src/components/task/TaskCard.tsx` | **CHANGE** | Badge traversal noise (A-10); `contentContainer` physical `marginLeft: 8` (StyleSheet L191); clock icon in metaItem physical `marginRight: 4` (inline, L97) |
| 70 | `src/components/task/TaskCheckbox.tsx` | COMPLIANT | `accessibilityRole="checkbox"`, `accessibilityState={{ checked, disabled }}` — compliant |
| 71 | `src/components/task/TaskList.tsx` | COMPLIANT | Orchestration wrapper; delegates to TaskCard, MissedTaskRow, etc. |
| 72 | `src/components/task-form/CustomRecurrenceModal.tsx` | **CHANGE** | No `accessibilityViewIsModal` on content `View`; title `Text` not `accessibilityRole="header"` |
| 73 | `src/components/task-form/DateTimePickerInput.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` (L83, L171) |
| 74 | `src/components/task-form/EditScopeSheet.tsx` | **CHANGE** | No `accessibilityViewIsModal` on content `View`; title `Text` not `accessibilityRole="header"` |
| 75 | `src/components/task-form/index.ts` | BARREL | Re-export barrel; no UI |
| 76 | `src/components/task-form/MoreOptionsSection.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` (L80, L293); physical `marginLeft: 4` (L378) |
| 77 | `src/components/task-form/PartialSuccessView.tsx` | COMPLIANT | Retry and Done buttons labeled; icon in non-interactive container; no directional margin issues on icon |
| 78 | `src/components/task-form/RecurrenceSection.tsx` | **CHANGE** | Physical `marginRight: spacing.sm` (L188) |
| 79 | `src/components/task-form/ScheduleModeCards.tsx` | **CHANGE** | Physical `marginLeft: spacing.sm` (L113); `marginRight: spacing.sm` (L401); `marginRight: spacing.xs` (L425) |
| 80 | `src/components/task-form/SuccessScreen.tsx` | **CHANGE** | Physical `marginRight: 6` (L89, L97) |
| 81 | `src/components/task-form/TaskFormScreen.tsx` | **CHANGE** | Physical `marginLeft: spacing.xs` on validation error Text (L326) |
| 82 | `src/components/today/SetupRequiredState.tsx` | **CHANGE** | Physical `marginRight: spacing.xs` (L140), `marginLeft: spacing.xs` (L170); error banner `Text` lacks `accessibilityLiveRegion="assertive"` (A-17) |

**Summary:**
- CHANGE required: **42 files**
- COMPLIANT (no change): **28 files**
- PLACEHOLDER / BARREL / OUT-OF-SCOPE: **12 files**
- **Total audited: 82 files ✓**

---

## 3. Authoritative Finding Inventory

### 3.1 Accessibility Issues (A-series)

All 21 issues follow. Each maps to exactly one category, severity, file(s), action, and test group.

| ID | Category | Severity | Affected File(s) | Required Action | Test Group |
|---|---|---|---|---|---|
| A-1 | Announcement | HIGH | `SettingsToggle.tsx` | Add `importantForAccessibility="no"` to icon `View` and textContainer `View` siblings of `Switch` | A |
| A-2 | Traversal / Noise | MEDIUM | `Icon.tsx` + 20 callsites in labeled Pressables | Add `decorative?: boolean` prop; when true: `accessibilityLabel=""`, `accessibilityRole="none"`, `importantForAccessibility="no"` | A |
| A-3 | Modal Isolation | HIGH | `JournalDeleteDialog.tsx` | Add `accessibilityViewIsModal={true}` to card View; add `accessibilityRole="header"` to title Text | E |
| A-4 | Modal Isolation | HIGH | `JournalPrivacySheet.tsx` | Same as A-3 | E |
| A-5 | Modal Isolation | HIGH | `CustomRecurrenceModal.tsx` | Same as A-3 | E |
| A-6 | Modal Isolation | MEDIUM | `EditScopeSheet.tsx` | Same as A-3 | E |
| A-7 | Traversal / Noise | MEDIUM | `PrayerHeader.tsx` | Group content `View` with `accessible={true}`, composite `accessibilityLabel`; hide decorative ornament; hide Arabic name | A, B |
| A-8 | Traversal / Noise | MEDIUM | `PrayerHeader.tsx` | Suppress countdown `Text` individual traversal; include in composite label | A |
| A-9 | Traversal / Noise | LOW | `SettingsRow.tsx` | Pass `decorative` to chevron Icon (via A-2 fix) | A |
| A-10 | Grouping | MEDIUM | `TaskCard.tsx` | Group informational `contentContainer View` with `accessible={true}` + composite label; see §15 for grouping safety | A, B |
| A-11 | Traversal / Noise | LOW | `DayDetailTaskList.tsx` | Add `importantForAccessibility="no"` to Arabic name `Text` | A |
| A-12 | Role | LOW | `CalendarMonthGrid.tsx` | Remove `accessibilityRole="text"` from weekday header labels (not a valid RN role; default is correct) | B |
| A-13 | Role / State | HIGH | `app/onboarding/index.tsx` | Add `accessibilityRole="radio"`, `accessibilityLabel`, `accessibilityState={{ checked: isSelected }}` to theme option Pressables | A, B, C |
| A-14 | Role / State | HIGH | `app/onboarding/index.tsx` | Add `accessibilityRole="radio"`, `accessibilityLabel`, `accessibilityState={{ checked: isSelected }}` to method option Pressables | A, B, C |
| A-15 | Label | MEDIUM | `app/onboarding/index.tsx` | Add `accessibilityRole="button"` and `accessibilityLabel` (city+country+timezone) to city result Pressables | A |
| A-16 | Traversal / Noise | LOW | `PrayerTabBar.tsx` | Add `importantForAccessibility="no"` to indicator dot `View` | A |
| A-17 | Live Region | MEDIUM | `SetupRequiredState.tsx`, `today.tsx`, `journal.tsx`, `JournalLockedState.tsx` | Add `accessibilityLiveRegion="assertive"` to dynamically appearing error Text elements | C |
| A-18 | Role | MEDIUM | `SettingsSectionHeader.tsx` | Add `accessibilityRole="header"` to section title `Text` | B |
| A-19 | Role | OBSERVATION | `CalendarHeader.tsx` | `accessibilityRole="header"` already correctly applied. No change. | — |
| A-20 | Text Scaling | MEDIUM | `CalendarMonthGrid.tsx`, `CalendarDayCell.tsx` | `maxFontSizeMultiplier={2}` on calendar weekday labels and day cell numbers only (see §10 for full justification) | F |
| A-21 | Label | LOW | `JournalHistory.tsx` | Back button verified ✅: has `accessibilityRole="button"` + label "Back to today's entry". Only physical margin fix remains (see RTL). | A |

**Accessibility issue totals:** 21 issues (A-1..A-21)

### 3.2 RTL Issues (RTL-series)

| ID | Category | Severity | Affected File(s) | Required Action | Test Group |
|---|---|---|---|---|---|
| RTL-1 | Logical Margin | MEDIUM | 24 files (see §14 table) | Replace `marginLeft`→`marginStart`, `marginRight`→`marginEnd` in icon-text row contexts | H |
| RTL-2 | Physical Absolute | LOW | `PrayerHeader.tsx` | `right: -30` on decorative ornament — keep as physical (see §14.2) | — |
| RTL-3 | textAlign | OBSERVATION | All files | `textAlign: 'center'` is direction-neutral. No change. | — |
| RTL-4 | Logical Padding | MEDIUM | 3 files | Replace `paddingRight: 12`→`paddingEnd: 12` | H |
| RTL-5 | Row Layout | LOW | See §17, §18, §19 | PrayerTabBar, BottomNavBar, CalendarMonthGrid: ordering decisions frozen in §16–19 | J, K, L |
| RTL-6 | Icon Direction | MEDIUM | `SettingsScreenHeader.tsx` | Back chevron icon contract per §15 icon matrix; `decorative` prop per A-2; no runtime mirroring in M22 | I |

**RTL issue totals:** 6 issues (RTL-1..RTL-6)

### 3.3 Additional Finding: PremiumLockedInfo and PremiumBadge

| ID | Category | Severity | Affected File(s) | Required Action | Test Group |
|---|---|---|---|---|---|
| A-22 | Modal Isolation | MEDIUM | `PremiumLockedInfo.tsx` | Add `accessibilityViewIsModal={true}` to content card `View` (content already has `accessibilityRole="alert"` which is good, but Android TalkBack needs `accessibilityViewIsModal`); add `accessibilityRole="header"` to title Text | E |
| A-23 | Role | LOW | `PremiumBadge.tsx` | Remove `accessibilityRole="text"` (not a valid RN role); it exposes `accessible` + `accessibilityLabel="Premium feature"` which is correct — just remove the invalid role | B |

**Revised total accessibility issues: 23 (A-1..A-23)**

### 3.4 Severity Summary (authoritative)

| Severity | Count | Issue IDs |
|---|---|---|
| HIGH | 6 | A-1, A-3, A-4, A-5, A-13, A-14 |
| MEDIUM | 14 | A-2, A-6, A-7, A-8, A-10, A-15, A-17, A-18, A-20, A-22, RTL-1, RTL-4, RTL-5 (ordered by sub-decision), RTL-6 |
| LOW | 8 | A-9, A-11, A-12, A-16, A-21, A-23, RTL-2, RTL-5 (row classification) |
| OBSERVATION | 2 | A-19, RTL-3 |
| **Total (non-observation)** | **28** | |

---

## 4. Modal Accessibility Inventory (Exhaustive)

**Independent search confirmed exactly 6 native `<Modal>` consumers** in production `app/**` and `src/components/**`:

| # | File | Title | Has `accessibilityViewIsModal`? | Has header role on title? | Backdrop accessible? | Backdrop dismiss action | Current `animationType` | M22 Action |
|---|---|---|---|---|---|---|---|---|
| 1 | `JournalDeleteDialog.tsx` | "Delete this journal entry?" | ❌ No | ❌ No | ❌ backdrop is `StyleSheet.absoluteFill` View — not a Pressable | No dismiss-outside currently | `fade` | Add `accessibilityViewIsModal` to card View; add `accessibilityRole="header"` to title; no backdrop Pressable needed (dialog pattern; user must choose) |
| 2 | `JournalPrivacySheet.tsx` | "Journal Privacy" | ❌ No | ❌ No | Backdrop `Pressable` exists (line 49), `accessibilityRole="button"`, label "Close privacy settings" — ✅ | Tap-outside → dismiss | `slide` | Add `accessibilityViewIsModal` to `sheetCard` View; add `accessibilityRole="header"` to title Text |
| 3 | `CustomRecurrenceModal.tsx` | "Custom Repeat" | ❌ No | ❌ No | Backdrop `Pressable` exists | Tap-outside → dismiss | `slide` | Add `accessibilityViewIsModal` to `modalContent` View; add `accessibilityRole="header"` to title Text |
| 4 | `EditScopeSheet.tsx` | "Edit Recurring Task" | ❌ No | ❌ No | Overlay has `justifyContent: 'flex-end'`; no explicit backdrop Pressable | No tap-outside dismiss (by design — user must choose scope) | `fade` | Add `accessibilityViewIsModal` to `sheetContainer` View; add `accessibilityRole="header"` to title Text |
| 5 | `PremiumLockedInfo.tsx` | "Premium Feature" (default) | ❌ No | ❌ No | Backdrop `Pressable` exists (line 38–44), `accessibilityRole="button"`, label "Close dialog backdrop" — ✅ | Tap-outside → close | `fade` | Add `accessibilityViewIsModal` to card `View`; add `accessibilityRole="header"` to title Text |
| 6 | `app/(tabs)/settings/hijri-calendar.tsx` | "Add Month Override" | ❌ No | ❌ No | Overlay `View` with no backdrop Pressable — no tap-outside dismiss (forced modal) | No tap-outside (user must Cancel/Save) | `slide` | Add `accessibilityViewIsModal` to `modalContent` View; add `accessibilityRole="header"` to title Text |

**Total Modal consumers: 6. All 6 require `accessibilityViewIsModal` and header role.**

### 4.1 Modal Accessibility Contract

```tsx
<Modal visible={...} transparent animationType="..." onRequestClose={dismiss}>
  <View style={overlay}>
    {/* Only if tap-outside dismiss is desired: */}
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={dismiss}
      accessibilityRole="button"
      accessibilityLabel="Close [dialog name]"
    />
    {/* Content container — must have accessibilityViewIsModal */}
    <View
      accessibilityViewIsModal={true}
      style={contentStyles}
    >
      <Text accessibilityRole="header">{dialogTitle}</Text>
      {/* body */}
    </View>
  </View>
</Modal>
```

**Platform notes:**
- iOS: `<Modal>` itself provides focus containment on iOS. `accessibilityViewIsModal={true}` on the inner content View is additive and harmless.
- Android: Background content remains accessible without `accessibilityViewIsModal`. This property is essential on Android.
- Placement: Always on the innermost *content* `View`, not on the overlay wrapper.

**Backdrop accessibility decisions by modal type:**
- Informational/warning dialogs with required choice (JournalDeleteDialog, EditScopeSheet, hijri-calendar override): No backdrop Pressable. User must use the provided action buttons. `onRequestClose` handles hardware-back.
- Dismissible sheets (JournalPrivacySheet, CustomRecurrenceModal, PremiumLockedInfo): Backdrop Pressable with `accessibilityRole="button"` and descriptive label.

---

## 5. Explicit M22 Scope

### In scope (42 production files)

1. `Icon.tsx` — `decorative` prop (prerequisite for all other icon fixes)
2. `Button.tsx` — logical margin replacement
3. `Toggle.tsx` — logical margin replacement
4. `SettingsToggle.tsx` — double-announcement suppression; logical replacements
5. `SettingsRow.tsx` — decorative chevron; logical replacements
6. `SettingsSelectOption.tsx` — logical padding replacement
7. `SettingsSectionHeader.tsx` — `accessibilityRole="header"` on section title
8. `SettingsInfoCard.tsx` — logical margin replacement
9. `SettingsScreenHeader.tsx` — decorative chevron Icon
10. `PremiumBadge.tsx` — remove invalid `accessibilityRole="text"`; logical margin; decorative lock icon
11. `PremiumLockedInfo.tsx` — `accessibilityViewIsModal`; header role; logical margin
12. `PrayerTabBar.tsx` — indicator dot hidden; tab Icons decorative; LTR order enforcement (§16)
13. `PrayerHeader.tsx` — grouping + composite label; decorative ornament hidden; Arabic name hidden; logical margins
14. `PrayerTransitionBanner.tsx` — logical margins
15. `TaskCard.tsx` — informational grouping (§15); logical margins
16. `TaskCheckbox.tsx` — already COMPLIANT *(no change)*
17. `AnytimeTodaySection.tsx` — logical margin
18. `CompletedSection.tsx` — decorative chevron Icon
19. `DayDetailTaskList.tsx` — Arabic name hidden; logical margin
20. `UpcomingSection.tsx` — logical margins
21. `CalendarDayCell.tsx` — `maxFontSizeMultiplier={2}` on day/Hijri text only
22. `CalendarMonthGrid.tsx` — remove invalid `accessibilityRole="text"`; `maxFontSizeMultiplier={2}` on weekday labels
23. `JournalDeleteDialog.tsx` — `accessibilityViewIsModal`; header role; logical margin
24. `JournalPrivacySheet.tsx` — `accessibilityViewIsModal`; header role; logical replacements
25. `JournalHeader.tsx` — logical margins
26. `JournalHistory.tsx` — logical margin
27. `JournalHistoryRow.tsx` — decorative chevron Icon
28. `ReflectionSection.tsx` — logical margin
29. `CustomRecurrenceModal.tsx` — `accessibilityViewIsModal`; header role
30. `EditScopeSheet.tsx` — `accessibilityViewIsModal`; header role
31. `DateTimePickerInput.tsx` — logical margins
32. `MoreOptionsSection.tsx` — logical margins
33. `RecurrenceSection.tsx` — logical margin
34. `ScheduleModeCards.tsx` — logical margins
35. `SuccessScreen.tsx` — logical margins
36. `TaskFormScreen.tsx` — logical margin
37. `SetupRequiredState.tsx` — logical margins; `accessibilityLiveRegion="assertive"` on error Text
38. `app/(tabs)/today.tsx` — `accessibilityLiveRegion="assertive"` on error Text
39. `app/(tabs)/journal.tsx` — logical margins; `accessibilityLiveRegion="assertive"` on error Text
40. `app/(tabs)/settings/hijri-calendar.tsx` — `accessibilityViewIsModal`; header role; logical margins in modal actions
41. `app/(tabs)/settings/notifications.tsx` — logical margins
42. `app/(tabs)/settings/planning-day.tsx` — logical margins
43. `app/(tabs)/settings/prayer-location.tsx` — logical margins
44. `app/onboarding/index.tsx` — `accessibilityRole="radio"`, `accessibilityState={{ checked }}`, labels for theme/method options; labels for city results

**Exact production change file count: 43** (SettingsScreenHeader added per A-2 decorative icon fix; 1 more than initial report)

### Not in scope

- Arabic full app translation
- Runtime RTL activation (`I18nManager.forceRTL`)
- New localization/i18n system
- Widget accessibility (M23/M24 native QA carry-forward)
- Android navigation-bar theming (M23/M24)
- Any domain, scheduling, database, or notification changes

---

## 6. Unresolved Questions — Resolved

The prior freeze contained 3 unresolved questions (UQ-1, UQ-2, UQ-3). All three are resolved here. The architecture is fully deterministic.

### UQ-1 (RESOLVED) — Prayer tab LTR enforcement mechanism

**Question:** `direction: 'ltr'` on `PrayerTabBar` — is it supported in RN 0.86?

**Resolution:** The `direction` CSS property is accepted in React Native `ViewStyle` as of RN 0.57+ and remains supported in RN 0.86. It controls the layout direction for that subtree. The value `'ltr'` forces left-to-right layout regardless of `I18nManager.isRTL`.

**Frozen decision (binding):** See §16 for the complete prayer tab RTL contract. `direction: 'ltr'` style is NOT used. See §16 for the correct design.

### UQ-2 (RESOLVED) — `accessibilityViewIsModal` iOS vs Android placement

**Question:** Does `accessibilityViewIsModal` on the content View cause double-isolation on iOS?

**Resolution:** On iOS, `<Modal>` automatically isolates VoiceOver focus. `accessibilityViewIsModal={true}` on the inner content `View` is redundant on iOS but harmless — iOS simply ignores it if the parent Modal already isolates. On Android, it is required. The correct placement is on the innermost content `View`, not on the overlay wrapper. This is documented and frozen in §4.1.

**Frozen decision (binding):** Apply `accessibilityViewIsModal={true}` to the content `View` for all 6 Modal consumers (per §4 table). No double-isolation risk.

### UQ-3 (RESOLVED) — TaskCard grouping vs. TaskCheckbox interactivity

**Question:** Can the informational `contentContainer View` be grouped without making the `TaskCheckbox` Pressable inaccessible?

**Resolution:** React Native's accessibility tree allows an `accessible={true}` View (composite label group) to coexist with an accessible sibling Pressable in the same parent `View`, as long as the group does not use `accessibilityElementsHidden` or `importantForAccessibility="no-hide-descendants"` on a View that wraps the Pressable. The solution is:

1. Apply `accessible={true}` + composite `accessibilityLabel` on `contentContainer View` only (the View containing title, metaRow, and badges).
2. `importantForAccessibility="no-hide-descendants"` on `contentContainer View` only — this prevents VoiceOver/TalkBack from traversing individual children of that container.
3. The `TaskCheckbox` Pressable remains in the `mainRow` as a separate sibling — it is NOT inside `contentContainer`. It remains fully accessible.
4. The overall card `View` has no accessibility props — it is a neutral container.

**Frozen decision (binding):** See §15 for complete grouping policy. No interactive element becomes inaccessible.

**Result: 0 unresolved blocking architecture questions.**

---

## 7. Accessibility Semantic Contract

### 7.1 Role Contract (frozen, RN 0.86 validated)

| Control Type | `accessibilityRole` | Notes |
|---|---|---|
| Pressable navigation/close/save/retry | `"button"` | |
| Native `Switch` standalone | `"switch"` (implicit from Switch component) | |
| Settings toggle row Pressable | `"switch"` | If wrapping Pressable handles the interaction |
| Checkbox | `"checkbox"` | |
| Tab item | `"tab"` | |
| Tab container | `"tablist"` | |
| Radio option (mutually exclusive, single-select) | `"radio"` | |
| Dialog/sheet content View | `accessibilityViewIsModal={true}` | Not a role — it is a separate prop |
| Dialog/sheet title Text | `"header"` | |
| Section header Text | `"header"` | |
| Calendar month title | `"header"` | |
| Decorative icon | `"none"` + `importantForAccessibility="no"` | Via `decorative` prop |
| Informational grouped card | `accessible={true}` + composite label on View | Role omitted (defaults to none) |
| PremiumBadge | No role (remove invalid `"text"`) | `accessible + accessibilityLabel` retained |

### 7.2 Accessibility State Contract (frozen, RN 0.86 validated)

**CRITICAL CORRECTION from prior draft:** `accessibilityRole="radio"` requires `accessibilityState={{ checked }}`, not `selected`. `selected` is for tabs and list items.

| Role | Correct state key | Notes |
|---|---|---|
| `"radio"` | `{ checked: boolean }` | Required — VoiceOver/TalkBack announce "checked"/"unchecked" |
| `"checkbox"` | `{ checked: boolean \| "mixed" }` | Boolean for simple, "mixed" for indeterminate |
| `"switch"` | `{ checked: boolean }` | |
| `"tab"` | `{ selected: boolean }` | |
| Any `"button"` in disabled state | `{ disabled: boolean }` | |
| Any `"button"` in loading/busy state | `{ busy: boolean }` | |
| Collapsible header | `{ expanded: boolean }` | |

**Onboarding theme/method options must use `{ checked: isSelected }` not `{ selected: isSelected }`.** The prior architecture doc was incorrect.

---

## 8. Touch-Target Contract

Enforced via `theme.touchTargets.min = 44` and `theme.touchTargets.comfortable = 48`.

**Verified across 82 files:** No material touch-target violations found in M22 audit scope. The `touchTargets` token system is consistently applied across all interactive elements.

---

## 9. Screen-Reader Live Region Contract

Live regions announce content changes to screen readers without requiring focus.

| Trigger | Element | `accessibilityLiveRegion` | Rationale |
|---|---|---|---|
| Countdown (PrayerHeader) | countdown `Text` | **NONE** — suppress from traversal | 1-second updates would cause constant disruption; included in composite label on demand |
| Autosave status (JournalSaveStatus) | status `Text` | `"polite"` ✅ already present | Low-urgency save notification |
| Prayer transition (PrayerTransitionBanner) | banner `Text` | `"polite"` ✅ already present | Prayer time change; non-urgent |
| Error appearing (SetupRequiredState, today.tsx, journal.tsx, JournalLockedState) | error `Text` | `"assertive"` | User action required; errors are urgent |

---

## 10. Text Scaling Contract

### 10.1 Policy

- Default font scaling (`allowFontScaling={true}`) is preserved everywhere. This is the RN default and must not be disabled.
- `maxFontSizeMultiplier` is a last resort, only justified when unrestricted scaling collapses a fixed-dimension structural layout that cannot be made flexible.

### 10.2 Calendar Cell Justification

**Why calendar cells are the only justified case:**

`CalendarMonthGrid` renders a 7-column grid where each column is `flex: 1` horizontally but where rows have a fixed minimum height. Each cell (`CalendarDayCell`) must fit:
- A Gregorian day number (e.g., "31")
- An optional Hijri sub-number (e.g., "14")

At font scale ≥ 300% (iOS Larger Dynamic Type at maximum), a two-digit number with `typography.bodyMedium` (16pt base) becomes 48pt. The grid row minimum height (set by `touchTargets.min = 44`) cannot expand vertically without breaking the month grid layout — doing so would require a fundamentally different calendar rendering architecture. The visual integrity of the calendar month view is essential for usability.

**Why `maxFontSizeMultiplier={2}` is the least-restrictive safe cap:**
- At 2× scale (32pt for 16pt base text), grid cells remain readable and the layout does not collapse.
- At 2.5× scale, 40pt text exceeds the touch-target minimum row height and cells start clipping.
- `maxFontSizeMultiplier={1.5}` would be overly restrictive.
- `maxFontSizeMultiplier={2.5}` would still cause collapse.
- `maxFontSizeMultiplier={2}` is the maximum that preserves layout integrity.

**Alternative layouts considered:**
- Scrollable calendar rows: Would break the fixed month-grid visual contract. Rejected.
- Hiding Hijri sub-number at large scales: Possible but requires logic; better to cap the multiplier for just the calendar cells.
- Wrapping text: Calendar cells cannot wrap because the grid is width-constrained.

**Exact authorized uses:**
1. `CalendarMonthGrid.tsx` — weekday header `Text` (Sun/Mon/Tue...): `maxFontSizeMultiplier={2}`
2. `CalendarDayCell.tsx` — Gregorian day number `Text`: `maxFontSizeMultiplier={2}`
3. `CalendarDayCell.tsx` — Hijri sub-number `Text`: `maxFontSizeMultiplier={2}`

**Native QA required:** Verify at iOS "Accessibility > Display & Text Size > Larger Text > Maximum" and Android "Settings > Font size > Largest".

**No other `maxFontSizeMultiplier` uses are authorized in M22.**

---

## 11. Modal / Screen-Reader Contract

See §4 (complete exhaustive modal audit) and §4.1 (contract template). The contract is fully frozen.

---

## 12. State / Non-Color Signal Contract

M21 established semantic contrast. All states have non-color supplemental cues:

| State | Color Signal | Non-Color Cue | M22 Action |
|---|---|---|---|
| Selected prayer tab | Background tint | `accessibilityState.selected`, bold weight | COMPLIANT |
| Selected calendar day | Background tint | `accessibilityState.selected` | COMPLIANT |
| Completed task | Muted color, strikethrough | Badge Text "Completed", `textDecorationLine: 'line-through'` | COMPLIANT |
| Missed task | Warning color | Badge Text "Missed" | COMPLIANT |
| Overdue task | Warning color | Badge Text "X min overdue" | COMPLIANT |
| Important task | Danger tint | Badge Text "IMPORTANT" | COMPLIANT |
| Toggle on/off | Track color | `accessibilityState.checked`, thumb position | COMPLIANT |
| Task checkbox checked | Fill color | Check icon, `accessibilityState.checked` | COMPLIANT |
| SettingsSelectOption selected | Primary color, bold | Checkmark icon, `accessibilityState.checked` | COMPLIANT |
| Journal locked | Lock icon fill | Lock button labeled | COMPLIANT |
| Error state | Danger/warning text color | `accessibilityLiveRegion="assertive"` | **NEW — A-17** |
| Onboarding radio selected | Background tint | `accessibilityState.checked` | **NEW — A-13, A-14** |

---

## 13. RTL Activation / Readiness Contract

### 13.1 Current RTL Status

- `app.json`: No `supportsRTL`, no `forcesRTL` key.
- `I18nManager`: Not imported anywhere in production source.
- No locale system exists.
- App is English-language only.
- Arabic prayer names are embedded decorative content, not UI language.

**Current RTL status: zero RTL activation. App is LTR only.**

### 13.2 M22 RTL Scope Decision (FINAL)

**M22 scope: RTL Layout Readiness Only.**

M22 does not add runtime RTL activation. The app will naturally respond to device-level RTL if the system is configured for an RTL locale, because:
1. Expo/RN 0.86 defaults `I18nManager.allowRTL(true)`.
2. `flexDirection: 'row'` automatically mirrors via the yoga layout engine when `I18nManager.isRTL` is true.
3. After M22 logical-style cleanup, `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd` respond correctly without any additional code.

`I18nManager.forceRTL` must NOT be called in M22. No language selector introduced.

### 13.3 RTL Direction Source / Read API (frozen)

**How components read RTL direction in M22:**

Components do NOT import or call `I18nManager.isRTL` directly in M22. Direction-awareness is achieved purely through:
1. **Logical style properties** (`marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`) which the Yoga engine applies correctly based on `I18nManager.isRTL`.
2. **`flexDirection: 'row'`** which Yoga automatically mirrors.
3. **Explicit `direction: 'ltr'`** on PrayerTabBar container to prevent row reversal (see §16).

**What can be unit/render tested:**
- Jest tests can mock `I18nManager.isRTL = true` and render components to verify:
  - `flexDirection: 'row'` containers render items in RTL order
  - `marginStart`/`marginEnd` are used (not `marginLeft`/`marginRight`) — static style audit
  - PrayerTabBar renders tabs in Fajr-first canonical order regardless of `isRTL`
  - BottomNavBar renders routes in canonical order regardless of `isRTL`

**What requires native QA:**
- Visual confirmation that `marginStart`/`marginEnd` physically display correctly on device set to RTL locale (requires app reload).
- VoiceOver/TalkBack focus order in RTL.
- Calendar cell layout in RTL.
- Prayer tab visual LTR enforcement on device.

---

## 14. Logical vs Physical Direction Contract

### 14.1 Classification Rules

| Pattern | Classification | Rule |
|---|---|---|
| `marginLeft` / `marginRight` between icon and adjacent text in `flexDirection: 'row'` | **LOGICAL** | Replace with `marginStart` / `marginEnd` |
| `paddingLeft` / `paddingRight` creating internal content gap within a row container | **LOGICAL** | Replace with `paddingStart` / `paddingEnd` |
| `marginLeft: 'auto'` for badge push-to-end | **PHYSICAL — KEEP** | `auto` is direction-neutral in flexbox; moves to flex end regardless of direction |
| `textAlign: 'center'` | **PHYSICAL — KEEP** | Direction-neutral |
| `left: 0, right: 0, top: 0, bottom: 0` on overlay backdrops | **PHYSICAL — KEEP** | Full-screen geometric; not directional |
| `right: -30` on decorative ornament (PrayerHeader) | **PHYSICAL — KEEP** | Purely decorative visual effect; not directional semantic |
| `top: 4` on indicator dot | **PHYSICAL — KEEP** | Vertical; not directional |
| `borderBottomWidth`, `borderTopWidth`, `borderLeftWidth`, `borderRightWidth` | **PHYSICAL — KEEP** | Structural borders; not directional in app context |
| `marginLeft: spacing.xs` in `contentContainer` (TaskCard) | **LOGICAL** | Spacing between checkbox and content — replaces with `marginStart` |
| Inline style `marginRight: 4` on icon in metaItem (TaskCard L97) | **LOGICAL** | Icon before text — replace with `marginEnd` |

### 14.2 RN 0.86 Logical Style Confirmation

`marginStart`, `marginEnd`, `paddingStart`, `paddingEnd` are confirmed supported in `ViewStyle` TypeScript types for React Native 0.86. No type assertion (`as ViewStyle`) needed.

### 14.3 Complete Logical Replacement Table

| File | Location | Current | Replace with |
|---|---|---|---|
| `Button.tsx` | L167 | `marginLeft` | `marginStart` |
| `Button.tsx` | L168 | `marginRight` | `marginEnd` |
| `Toggle.tsx` | StyleSheet | `marginRight: 16` | `marginEnd: 16` |
| `SettingsRow.tsx` | StyleSheet L55 | `marginRight: spacing.md` | `marginEnd: spacing.md` |
| `SettingsRow.tsx` | StyleSheet L103 | `marginRight: ...` | `marginEnd: ...` |
| `SettingsInfoCard.tsx` | StyleSheet L37 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `SettingsToggle.tsx` | StyleSheet L57 | `marginRight: spacing.md` | `marginEnd: spacing.md` |
| `SettingsToggle.tsx` | StyleSheet L117 | `paddingRight: 12` | `paddingEnd: 12` |
| `SettingsSelectOption.tsx` | StyleSheet L85 | `paddingRight: 12` | `paddingEnd: 12` |
| `PremiumLockedInfo.tsx` | Inline L67 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `PremiumBadge.tsx` | Inline | `marginRight: 3` | `marginEnd: 3` |
| `PrayerHeader.tsx` | L64 | `marginLeft: spacing.md` | `marginStart: spacing.md` |
| `PrayerHeader.tsx` | L97 | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `PrayerTransitionBanner.tsx` | L101 | `marginRight: 12` | `marginEnd: 12` |
| `PrayerTransitionBanner.tsx` | L109 | `marginLeft: 8` | `marginStart: 8` |
| `TaskCard.tsx` | StyleSheet contentContainer | `marginLeft: 8` | `marginStart: 8` |
| `TaskCard.tsx` | Inline metaItem L97 | `marginRight: 4` | `marginEnd: 4` |
| `TaskCard.tsx` | Inline metaItem L105 | `marginLeft: spacing.md` | `marginStart: spacing.md` |
| `AnytimeTodaySection.tsx` | Inline L46 | `marginRight: 6` | `marginEnd: 6` |
| `JournalHeader.tsx` | L128 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `JournalHeader.tsx` | L154 | `marginLeft: 4` | `marginStart: 4` |
| `JournalHistory.tsx` | L52 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `JournalDeleteDialog.tsx` | L78 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `JournalPrivacySheet.tsx` | L63 | `marginLeft: spacing.md` | `marginStart: spacing.md` |
| `JournalPrivacySheet.tsx` | StyleSheet L202 | `paddingRight: 12` | `paddingEnd: 12` |
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
| `TaskFormScreen.tsx` | L326 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `SetupRequiredState.tsx` | L140 | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `SetupRequiredState.tsx` | L170 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `app/journal.tsx` | L253 | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `app/journal.tsx` | L312 | `marginLeft: 12` | `marginStart: 12` |
| `hijri-calendar.tsx` | Modal actions L392 | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `hijri-calendar.tsx` | Modal actions L400 | `marginLeft: spacing.sm` | `marginStart: spacing.sm` |
| `notifications.tsx` | Icon margins | `marginRight` | `marginEnd` |
| `planning-day.tsx` | Icon margins | `marginRight` | `marginEnd` |
| `prayer-location.tsx` | Icon margins | `marginRight`/`marginLeft` | `marginEnd`/`marginStart` |

**Physical properties to KEEP:**
- `marginLeft: 'auto'` on badge push-to-end in TaskCard — keep
- All `left: 0, right: 0` on overlay backdrops — keep
- `right: -30` on PrayerHeader decorative ornament — keep

---

## 15. Accessibility Grouping Policy

**Core principle:** Setting `accessible={true}` on a container groups all non-interactive children into a single accessibility element. However, it does NOT hide separately accessible Pressable/interactive descendants in the same sibling tree — only descendants inside that specific container.

### 15.1 TaskCard

**Structure:**
```
<View> {/* card — neutral container */}
  <View style={mainRow}>
    <TaskCheckbox />          {/* interactive — accessible sibling */}
    <View                     {/* contentContainer — GROUP THIS */}
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

**Composite label formula:**
```
"{title}. {priority === 'IMPORTANT' ? 'Important. ' : ''}{status badge text if not PENDING}. {overdueLabel if overdue}"
```

**Examples:**
- Pending: `"Buy groceries"`
- Important + pending: `"Buy groceries. Important."`
- Overdue: `"Buy groceries. 5 minutes overdue."`
- Completed: `"Buy groceries. Completed."`
- Missed: `"Buy groceries. Missed."`

**TaskCheckbox** remains a separate sibling accessible element: `accessibilityRole="checkbox"`, `accessibilityLabel="Complete task: Buy groceries"`, `accessibilityState={{ checked: isCompleted, disabled: !isPending }}`.

### 15.2 PrayerHeader

**Approach:**
- Wrap the name block, badge, and countdown in a single `View` with `accessible={true}` and composite label.
- Apply `importantForAccessibility="no-hide-descendants"` on that wrapper.
- The ornament `View` (absolute positioned decorative arch): add `importantForAccessibility="no"` (Android) and `accessibilityElementsHidden={true}` (iOS) — both needed for cross-platform.
- The Arabic name `Text`: add `importantForAccessibility="no"` — it is already inside the grouped view so will be hidden by `no-hide-descendants`, but explicit suppression is belt-and-suspenders.

**Composite label formula:**
```
"Current prayer: {name}. {countdown ? `Next: ${nextPrayerName} in ${countdown}` : 'Last prayer of the day'}"
```

**Note:** Countdown is updated every second. The composite `accessibilityLabel` must only be updated when the minute changes (not every second) to avoid continuous VoiceOver re-announcement when a user has the header focused. Implementation must throttle label updates to ≤1/minute.

### 15.3 SettingsRow

`SettingsRow` is a `Pressable` with `accessibilityRole`, `accessibilityLabel`, and `accessibilityValue`. All its children (icon, text, chevron) are inside the Pressable. The Pressable is itself `accessible={true}` by default for a Pressable, so all children are already grouped. The `chevron-right` Icon child should receive the `decorative` prop — it will be suppressed within the accessible Pressable group.

### 15.4 CalendarDayCell

`CalendarDayCell` already has `accessible={true}` and a composite `accessibilityLabel` from the model. It is compliant. No change needed for grouping.

### 15.5 JournalHeader / JournalDeleteDialog

Already labeled — only modal isolation (A-3, A-4) and logical margin fixes needed.

---

## 16. Prayer Tab RTL Order — REVISED AND FROZEN

### 16.1 The Lead's Position

The prior freeze mandated `direction: 'ltr'` on the `PrayerTabBar` container to prevent RTL reversal of tabs. The Lead has directed a re-evaluation, requesting that the canonical prayer sequence never changes but that physical RTL behavior be considered.

### 16.2 Analysis

**Canonical data order:** `FAJR → DHUHR → ASR → MAGHRIB → ISHA` (chronological by time-of-day). This array must never change.

**The question is physical rendering position in RTL:**

| Option | LTR visual | RTL visual | Reading order in RTL |
|---|---|---|---|
| A: Force LTR container | Fajr-left to Isha-right | Same as LTR (forced) | RTL reader encounters Isha first (rightmost), Fajr last |
| B: Allow natural RTL flip | Fajr-left to Isha-right | Isha-left to Fajr-right | RTL reader encounters Fajr first (rightmost in their reading direction), Isha last |

**Analysis of Option A (forced LTR):**
- A user reading RTL scans right-to-left. Forced LTR tabs put Fajr at the left edge, which the RTL user reaches *last*. This is anti-chronological from the RTL reading perspective.
- This would be considered an accessibility regression for RTL users.
- Only argument for Option A: physical position stays consistent regardless of device locale.

**Analysis of Option B (natural RTL flip):**
- In RTL, the first logical item (`FAJR`) maps to the rightmost visual position. An RTL reader scans from right to left and encounters `FAJR` → `DHUHR` → `ASR` → `MAGHRIB` → `ISHA`. The chronological reading experience is preserved.
- The canonical data array remains `[FAJR, DHUHR, ASR, MAGHRIB, ISHA]`. No array reversal needed.
- React Native `flexDirection: 'row'` with `I18nManager.isRTL = true` naturally places logical index 0 (FAJR) at the rightmost visual position.
- Screen readers traverse elements in logical DOM order (FAJR → ISHA), not visual order.

### 16.3 FROZEN DECISION

**Option B is adopted: canonical array never changes; container follows logical UI direction; prayer tab RTL behavior is natural flex mirroring.**

- **`direction: 'ltr'` style is NOT added to `PrayerTabBar`.**
- The underlying `tabs` array always arrives in `[FAJR, DHUHR, ASR, MAGHRIB, ISHA]` order. This contract is unchanged.
- In LTR: Fajr visually left → Isha visually right.
- In RTL: Fajr visually right → Isha visually left. Reading order: Fajr first → Isha last. Chronologically correct for RTL users.
- Screen reader traversal: always Fajr → Isha (DOM order), regardless of visual layout direction.
- `accessibilityLabel` per tab includes prayer name and time — semantically correct in both directions.

**The only change to `PrayerTabBar.tsx` in M22:** indicator dot `importantForAccessibility="no"`, and tab icon `decorative` prop.

---

## 17. BottomNavBar RTL Contract — FROZEN

### 17.1 Canonical Route Order (unchanging)

```
Index 0: today
Index 1: calendar
Index 2: add (special center button)
Index 3: journal
Index 4: settings
```

This order is the navigation route array from Expo Router's tab state. It must not be reversed.

### 17.2 LTR Visual Order

Today | Calendar | + | Journal | Settings (left to right)

### 17.3 RTL Visual Order

In RTL, `flexDirection: 'row'` naturally reverses:

Settings | Journal | + | Calendar | Today (left to right in RTL device)

Reading direction in RTL: Today (rightmost) → Calendar → + → Journal → Settings (leftmost). The navigation hierarchy reads from primary (Today) to secondary (Settings) in reading direction — this is semantically correct.

### 17.4 Add Button (Center Button)

The Add button (`index 2`) is at the center of 5 items. In LTR: items 0,1,[2],3,4 → Add is center. In RTL: items reversed visually → [4,3,2,1,0] visually → Add (`index 2`) remains at visual center. ✅

**The center position is direction-agnostic.** The `isAdd` logic in `BottomNavBar.tsx` (checking `route.name === 'add'`) is unchanged.

### 17.5 Active State Semantics

`activeIndex` from `props.state?.index` maps to the route by index, not by visual position. `accessibilityState={{ selected: isFocused }}` (where `isFocused = activeIndex === index`) remains correct in both LTR and RTL — it is index-based, not position-based.

### 17.6 Frozen Decision

**Allow natural RTL flip for BottomNavBar** — same rationale as PrayerTabBar §16. Canonical route indices never change. `flexDirection: 'row'` mirrors naturally. Active state semantics are index-based and unaffected. No code changes needed specifically for RTL ordering.

**M22 change to BottomNavBar.tsx:** Tab icons and Add button icon should receive `decorative` prop (A-2 fix). Tab icons are inside labeled Pressables. Add button icon is inside labeled Pressable.

---

## 18. Calendar RTL Contract — FROZEN

### 18.1 Underlying Data Order (unchanging)

**Weekday array:** `['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']` — always in this logical order.

**Calendar day cells:** Populated left-to-right by date number in LTR. First day of the month at visual-start.

### 18.2 LTR Physical Rendering

Sunday at leftmost column, Saturday at rightmost.
Date 1 at start (leftmost) of its row.

### 18.3 RTL Physical Rendering

In RTL, `flexDirection: 'row'` reverses the visual presentation:
- Saturday at leftmost column, Sunday at rightmost.
- Date 1 at rightmost of its row (logical start = physical right in RTL).

This is the correct Gregorian/Hijri calendar rendering for RTL locales (Arabic-language Islamic calendars conventionally show Sunday at the right).

**Screen reader reading order:** Always Sunday → ... → Saturday (DOM order), regardless of visual direction.

### 18.4 Previous/Next Month Button Semantics

**Critical invariant:** The button callbacks MUST remain semantic:
- Previous month button → always calls `onPreviousMonth()`
- Next month button → always calls `onNextMonth()`
- The callback meaning does NOT swap when layout mirrors.

In LTR: Previous button (chevron-left) visually on the left, Next (chevron-right) visually on the right.
In RTL: With natural flip, Previous button visually on the right, Next visually on the left. The chevron icons mirror too (left chevron becomes right-pointing in RTL visual). But the semantic — "this button goes to the previous month" — is unchanged.

**Icon direction in RTL:**
- Previous month: `chevron-left` icon in LTR, `chevron-right` icon in RTL (or mirrored via `scaleX(-1)`). Since M22 is layout-readiness only, the icon will appear in the correct mirrored side due to `flexDirection: 'row'` reversal, but the glyph itself won't flip. This is acceptable in M22 (no runtime RTL activation means the exact glyph mismatch is a future RTL activation milestone concern).

### 18.5 Frozen Decision

**Calendar follows natural RTL mirroring.** No forced direction on calendar container. Callbacks always semantic. Grid data array unchanged.

---

## 19. Icon Mirroring Matrix (Validated Against Actual Icon Names)

All icon names verified against `Icon.tsx` and callsites.

| Icon name | Semantic Meaning | LTR Glyph | RTL glyph (future milestone) | Mirror in RTL? | Decorative in labeled Pressable? | Consumer files |
|---|---|---|---|---|---|---|
| `chevron-left` | Navigate back / calendar previous | ← | → | YES | YES (inside labeled Pressable) | `SettingsScreenHeader`, `CalendarHeader`, `JournalHistory` |
| `chevron-right` | Navigate forward / disclosure / expand | → | ← | YES (navigation) / NO (collapse indicator) | YES | `SettingsRow`, `JournalHistoryRow`, `CompletedSection` (expand), `AnytimeTodaySection` (expand) |
| `chevron-down` | Expand downward | ↓ | ↓ | NO | YES | `CompletedSection`, `AnytimeTodaySection`, `ReflectionSection` |
| `sun` | Today tab / anytime section | — | — | NO | YES | `BottomNavBar`, `AnytimeTodaySection` |
| `calendar` | Calendar tab / date | — | — | NO | YES | `BottomNavBar`, `CalendarHeader`, `UpcomingSection`, `JournalHistory` empty, `EmptyPrayerState` |
| `plus` | Add task | — | — | NO | YES | `BottomNavBar` Add button |
| `journal` | Journal tab | — | — | NO | YES | `BottomNavBar` |
| `settings` | Settings tab | — | — | NO | YES | `BottomNavBar` |
| `close` | Dismiss/close | — | — | NO (symmetric) | NO (close buttons have their own Pressable label) | `CustomRecurrenceModal`, `EditScopeSheet`, various |
| `check` | Checkbox checked / all done | — | — | NO (symmetric) | YES | `TaskCheckbox`, `AllDoneState` |
| `bell` | Notifications | — | — | NO | YES | Settings |
| `lock` | Lock / privacy | — | — | NO | YES | `JournalLockedState`, `PremiumBadge`, `PremiumLockedInfo` |
| `lock-closed-outline` | Lock (outline variant) | — | — | NO | YES | Journal screens |
| `moon-outline` | Dark theme | — | — | NO | YES | Appearance settings |
| `sunny-outline` | Light theme | — | — | NO | YES | Appearance settings |
| `clock` | Time / schedule | — | — | NO | YES | `TaskCard`, `UpcomingSection` |
| `time-outline` | Time (outline) | — | — | NO | YES | Various |
| `location-outline` | Location | — | — | NO | YES | `SetupRequiredState` |
| `alert` | Warning | — | — | NO | NO (standalone in non-interactive container) | `PartialSuccessView` |
| `alert-circle-outline` | Alert circle | — | — | NO | YES | Various |
| `information-circle-outline` | Info | — | — | NO | YES | `SettingsInfoCard` |
| `star` | Important / star | — | — | NO | YES | `SettingsRow` (notifications) |
| `trash-outline` | Delete | — | — | NO | NO (has own Pressable label) | `JournalDeleteDialog` |
| `search-outline` | Search | — | — | NO | YES | Onboarding city search |
| `person-outline` | User/avatar | — | — | NO | YES | Settings |
| `compass-outline` | Prayer direction | — | — | NO | YES | `PrayerHeader` |

**Directional icons requiring future RTL mirroring:** `chevron-left` and `chevron-right` (navigation usage only). Both should receive a `mirror?: boolean` prop in the future RTL milestone that applies `transform: [{ scaleX: -1 }]`.

**M22 action for icons:** Add `decorative` prop to Icon (per A-2). Decorative callsites pass `decorative`. No runtime RTL mirroring in M22.

---

## 20. Accessibility Grouping — Remaining Components

### SettingsRow
`Pressable` with label — already groups all children. Add `decorative` to chevron Icon.

### Journal cards/headers
`JournalHeader` has labeled Pressable buttons. Logical margin fixes only.

### Premium dialogs
`PremiumLockedInfo` is a Modal — fixes in §4.

### CalendarDayCell
Already grouped with composite `accessibilityLabel`. COMPLIANT.

---

## 21. Static Audit Design

Static tests must be narrow and behavioral, not brittle grep-style lint.

### Allowed static tests

**Group H (RTL Logical Styles):**
- Render each component from the 43-file change list using RNTL.
- Assert that `StyleSheet.flatten(component.props.style)` does NOT contain `marginLeft`/`marginRight`/`paddingLeft`/`paddingRight` in icon-text spacing contexts.
- Allowlist: `marginLeft: 'auto'` in TaskCard badge containers — explicitly excluded from assertion.
- Expected: ~44 instances across 43 files to catch.
- False-positive prevention: Only assert on named style references that correspond to icon-text spacing (e.g., `contentContainer`, `iconWrapper`, `textContainer` in StyleSheet) — not on all styles.

**Group M (Static A11y Audit):**
- Assert `PremiumBadge` rendered View does NOT have `accessibilityRole="text"`.
- Assert all 6 Modal content views have `accessibilityViewIsModal={true}` prop set.
- Assert `SettingsSectionHeader` renders a Text with `accessibilityRole="header"`.
- Assert `CalendarMonthGrid` weekday labels do NOT have `accessibilityRole="text"`.
- Scope: targeted to known violations found in audit. No broad-spectrum scanning.

### Disallowed static tests

- "Every Pressable must have `accessibilityLabel`" — too broad; a Pressable with a visible Text child may have an implicit accessible name.
- Grep-based file scanning without component rendering.

---

## 22. Test Matrix

### Test groups, files, and estimates

| Group | Description | Test File (new) | Est. Tests |
|---|---|---|---|
| A | Accessible Names & Traversal | `src/__tests__/m22/AccessibleNames.test.tsx` | 22 |
| B | Roles | `src/__tests__/m22/AccessibilityRoles.test.tsx` | 14 |
| C | States & Live Regions | `src/__tests__/m22/AccessibilityStates.test.tsx` | 12 |
| D | Touch Targets | (documented verified; no new tests) | 0 |
| E | Modal Accessibility Isolation | `src/__tests__/m22/ModalAccessibility.test.tsx` | 18 |
| F | Text Scaling | `src/__tests__/m22/TextScaling.test.tsx` | 6 |
| G | Non-Color Cues | (existing suite covers) | 0 |
| H | RTL Logical Styles | `src/__tests__/m22/RTLLogicalStyles.test.tsx` | 26 |
| I | RTL Icon Direction | `src/__tests__/m22/RTLIcons.test.tsx` | 8 |
| J | Prayer Tab RTL Order | `src/__tests__/m22/PrayerTabRTL.test.tsx` | 8 |
| K | Calendar RTL | `src/__tests__/m22/CalendarRTL.test.tsx` | 8 |
| L | Arabic/Bidi Text | `src/__tests__/m22/ArabicBidi.test.tsx` | 6 |
| M | Static A11y Audit | `src/__tests__/m22/StaticA11yAudit.test.tsx` | 10 |
| **Total** | | | **138** |

**Baseline:** 1404 tests (121 suites)
**Estimated M22 additions:** 138 new tests across 11 new test files
**Expected M22 total:** ~1542 tests (~132 suites)
**Minimum acceptable:** ≥ 1504 (i.e., ≥ 100 new tests)

> [!NOTE]
> The minimum ≥ 1504 and the estimated ~1542 are now consistent. The prior draft had an inconsistency (it said "~127 new" but claimed target ≥ 1504 meaning ≥ 100). This document fixes both: the floor is ≥ 100 new tests; the estimate is 138 new tests based on the hardened scope.

---

## 23. Native QA Carry-Forward

| Item | Target |
|---|---|
| VoiceOver (iOS) focus order through Today, PrayerHeader, TaskCard | M23 |
| TalkBack (Android) focus order through Today, PrayerHeader, TaskCard | M23 |
| VoiceOver — modal focus trapping for all 6 modal consumers | M23 |
| TalkBack — modal focus trapping for all 6 modal consumers | M23 |
| Prayer tab visual order on device set to Arabic/Hebrew locale | M23 |
| BottomNavBar visual order in device RTL locale | M23 |
| Calendar grid mirroring in device RTL locale | M23 |
| Large Accessibility Text (≥ 300% iOS / Android) — calendar layout | M23 |
| `maxFontSizeMultiplier` cap behavior at iOS max text size | M23 |
| Widget accessibility (iOS, Android) | M23/M24 |
| VoiceOver reading of Arabic prayer names in PrayerHeader | M23 |
| Hardware keyboard navigation | Deferred (not primary mobile target) |

---

## 24. Dependencies

**0 new dependencies.** All changes use existing React Native APIs.

---

## 25. Migrations

**0 migrations.** No database changes.

---

## 26. Subsystem Isolation

M22 must not modify:
- `src/domain/**`
- `src/data/schema.ts`
- `src/data/migrations/**`
- `src/services/**` (except read-only reference to `PRAYER_ARABIC_NAMES`)
- `widgets/**`
- `package.json` / `package-lock.json`
- `app.json`

---

## 27. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `accessibilityViewIsModal` effectiveness varies by Android version | MEDIUM | Native QA carry-forward; Jest assertion at minimum |
| `importantForAccessibility="no-hide-descendants"` on TaskCard contentContainer hides children from SR while keeping TaskCheckbox accessible | LOW | Verified: Pressable sibling not inside grouped container |
| PrayerHeader composite label update frequency — 1-second countdown | MEDIUM | Throttle label to ≤1/minute change |
| Icon `decorative` prop coverage — 20+ callsites | LOW | Group M static audit catches omissions |
| Prayer tab RTL visual flip may confuse LTR developers | LOW | Documented in §16; test in Group J |

---

## 28. Implementation Order

1. **`Icon.tsx`** — `decorative` prop (prerequisite for all icon fixes)
2. **6 Modal consumers** — `accessibilityViewIsModal` + header role
3. **`SettingsSectionHeader.tsx`** — header role (one-liner)
4. **`PremiumBadge.tsx`** — remove invalid role
5. **`SettingsToggle.tsx`** — double-announcement suppression
6. **`PrayerHeader.tsx`** — grouping + composite label (most complex; must throttle label updates)
7. **`TaskCard.tsx`** — composite grouping + composite label
8. **`app/onboarding/index.tsx`** — theme options, method options, city results
9. **Error live regions** — SetupRequiredState, today.tsx, journal.tsx
10. **All logical margin/padding replacements** — all 43 files (mechanical pass)
11. **`CalendarMonthGrid.tsx` / `CalendarDayCell.tsx`** — remove invalid role; add `maxFontSizeMultiplier`
12. **`PrayerTabBar.tsx`** — indicator dot hidden; tab Icons decorative
13. **`DayDetailTaskList.tsx` / `PrayerHeader.tsx`** — Arabic name suppression
14. **LOW items** — decorative Icon callsites (CompletedSection, JournalHistoryRow, BottomNavBar, etc.)
15. **All 11 test files** — test groups A–M

---

## 29. Verification Gates

Before M22 can be submitted for independent review:

1. `npx tsc --noEmit` — 0 errors
2. `npx eslint . --ext ts,tsx --max-warnings=0` — 0 errors, 0 warnings
3. `npx jest --passWithNoTests` — 0 failures; all existing 1404 tests pass; all new M22 tests pass
4. New test count ≥ 100 (estimate: 138)
5. Total test count ≥ 1504 (estimate: ~1542)
6. `git diff --stat origin/main HEAD` — 0 changes to domain, schema, migrations, services, widgets, package files
7. `git diff --check` — no whitespace errors
8. `git rev-parse origin/main` → `a8c837c6ef6c27d3bc81a48b6e1d12e6489874f1`
9. Architecture commits local, NOT pushed
10. Implementation commits NOT pushed until formal closure

---

## 30. Closure Criteria

M22 is closed when:

1. All HIGH findings resolved (A-1, A-3, A-4, A-5, A-13, A-14)
2. All MEDIUM findings resolved or explicitly documented carry-forward
3. 0 TypeScript errors
4. 0 ESLint errors/warnings
5. All M22 tests passing
6. Total test count ≥ 1504
7. 0 new dependencies
8. 0 new migrations
9. Independent review: APPROVED
10. Supporting docs updated (CURRENT_MILESTONE, IMPLEMENTATION_STATUS, ARCHITECTURE_INDEX, DECISIONS, AI_PROJECT_CONSTITUTION)
11. ONE authorized push to `origin/main`

---

## ADR-030 — Accessibility Semantics and RTL Layout Contract

**Status:** AUTHORIZED AND FROZEN in M22.

**Decisions recorded as durable project-wide architectural rules:**

1. **Accessibility semantic contract** — roles, states, modal isolation pattern (§7, §4)
2. **RTL product scope** — layout readiness only; no runtime activation without locale system (§13)
3. **Prayer tab order** — canonical array never changes; natural RTL flex mirroring is correct; DO NOT force LTR (§16)
4. **BottomNavBar order** — canonical route indices never change; natural RTL mirroring correct (§17)
5. **Calendar RTL** — natural mirroring; callback semantics never swap (§18)
6. **Icon mirroring matrix** — chevron-left/right are directional; all others non-directional (§19)
7. **Logical-style convention** — `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd` mandate for icon-text spacing (§14)
8. **`maxFontSizeMultiplier` policy** — calendar cells only; 2× cap with full justification required (§10)
9. **`decorative` Icon prop pattern** — suppresses icon traversal when inside labeled Pressable (§7.1)
10. **Radio state key** — `accessibilityRole="radio"` requires `accessibilityState={{ checked }}` not `selected` (§7.2)
11. **Grouping policy** — informational container grouping must never hide interactive sibling descendants (§15)

ADR-030 will be recorded in `docs/DECISIONS.md`.
