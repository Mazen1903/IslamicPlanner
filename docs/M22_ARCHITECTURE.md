# M22 — Accessibility / RTL Architecture

**Status:** FROZEN — PENDING LEAD REVIEW
**Milestone:** M22 — Accessibility / RTL
**Architect:** Sonnet (independent reviewer role)
**Baseline commit:** `a8c837c6ef6c27d3bc81a48b6e1d12e6489874f1`
**Date frozen:** 2026-09-19

---

## 1. Milestone Overview

M22 makes the application materially accessible and RTL-safe. It addresses two related but distinct concerns:

- **Part A — Accessibility:** Expose correct accessible names, roles, states, touch targets, modal isolation, text scaling, error announcements, and non-color signals to screen readers (VoiceOver / TalkBack).
- **Part B — RTL Layout Readiness:** Audit and classify all directional styling; establish a logical-direction contract for the production codebase; define RTL product scope and activation strategy.

M22 must not change domain logic, scheduling behavior, database schema, or planner semantics.

---

## 2. Audited Current State

### What is already correct

The codebase already contains substantial accessibility scaffolding:

| Area | Current State |
|---|---|
| `Button.tsx` | `accessibilityRole="button"`, label, state (disabled/busy) — **COMPLIANT** |
| `Toggle.tsx` (with label) | `accessibilityRole="switch"`, label, state checked/disabled — **COMPLIANT** |
| `Toggle.tsx` (standalone) | Switch hidden from accessibility tree via `importantForAccessibility` — **COMPLIANT** |
| `TaskCheckbox.tsx` | `accessibilityRole="checkbox"`, checked/disabled state — **COMPLIANT** |
| `SettingsStepper.tsx` | Decrement/Increment buttons labeled `"Decrease {label}"` / `"Increase {label}"`, `touchTargets.min` size — **COMPLIANT** |
| `SettingsRow.tsx` | Role, label, accessibilityValue — **MOSTLY COMPLIANT** |
| `SettingsSelectOption.tsx` | `accessibilityRole="checkbox"`, checked state, checkmark visual cue — **COMPLIANT** |
| `PrayerTabBar.tsx` | `tablist` container, `tab` role, `selected` state, compound label with time — **COMPLIANT** |
| `BottomNavBar.tsx` | `tablist` container, `tab` role, `selected` state — **COMPLIANT** |
| `CalendarDayCell.tsx` | `button` role, `selected` state, `accessibleLabel` from model — **COMPLIANT** |
| `CalendarHeader.tsx` | Prev/Next month buttons labeled, Today button labeled, month title `accessibilityRole="header"` — **COMPLIANT** |
| `PrayerTransitionBanner.tsx` | `accessibilityLiveRegion="polite"`, `accessibilityRole="alert"`, label — **COMPLIANT** |
| `JournalEditor.tsx` | `accessibilityLabel`, `accessibilityHint` — **COMPLIANT** |
| `ReflectionField.tsx` | `accessibilityLabel` from field label — **COMPLIANT** |
| `JournalSaveStatus.tsx` | `accessibilityLiveRegion="polite"`, label — **COMPLIANT** |
| `JournalHeader.tsx` | Lock and history icon buttons labeled — **COMPLIANT** |
| `CompletedSection.tsx` | Header labeled with count and expand state — **COMPLIANT** |
| `AnytimeTodaySection.tsx` | Header labeled with count and expand state — **COMPLIANT** |
| `ReflectionSection.tsx` | `expanded` state in label and `accessibilityState` — **COMPLIANT** |
| `JournalLockedState.tsx` | Unlock button labeled, disabled state — **COMPLIANT** |
| `DatePickerInput.tsx` | Role, label with current value and hint — **COMPLIANT** |
| `TimePickerInput.tsx` | Role, label with current value and hint — **COMPLIANT** |
| `SettingsScreenHeader.tsx` | Back button labeled "Go back", touch target sized — **COMPLIANT** |
| `CustomRecurrenceModal.tsx` | Calendar system selector uses `accessibilityRole="radio"` — **COMPLIANT** |
| `EditScopeSheet.tsx` | Options labeled with label+desc — **COMPLIANT** |
| Touch targets | `touchTargets.min` token enforced across interactive elements — **BROADLY COMPLIANT** |
| Animations | No `Animated` API, no `react-native-reanimated`, no `LayoutAnimation` used anywhere in production — **REDUCED MOTION: N/A** |
| I18nManager | Not imported or used anywhere in the codebase — **RTL: CLEAN BASELINE** |

---

## 3. Accessibility Issue Inventory

### A-1 · `SettingsToggle.tsx` — Double announcement risk (HIGH)

`SettingsToggle` renders a `View` container with a visible `Text` label and a `Switch`. The `Switch` has `accessibilityRole="switch"` and `accessibilityLabel={label}`. The parent `View` has `testID` only. However, the component does **not** suppress the Switch's individual accessibility node when the label Text is present, meaning VoiceOver/TalkBack may announce both the label Text and the Switch label separately, creating redundant announcements.

Contrast with `Toggle.tsx` (the generic component) which correctly uses `importantForAccessibility="no-hide-descendants"` on the Switch when a wrapper Pressable handles accessibility. `SettingsToggle` does not have a wrapper Pressable — the Switch is the sole interactive element, so the pattern is different. But the icon `View` and label `Text` siblings of the Switch may still be announced.

**Required:** Add `importantForAccessibility="no"` to the icon wrapper `View` and the label/description `textContainer View` so only the `Switch` is announced. The `Switch` already has the correct label.

### A-2 · `Icon.tsx` — Default label `name` announced for every decorative icon (MEDIUM)

`Icon` always exposes `accessibilityLabel={accessibilityLabel ?? name}`. When icons are used purely decoratively (inside a labeled Pressable), the icon will be announced as a separate image element. For example, inside `SettingsRow`, the `chevron-right` icon gets announced as "chevron-right, image" after the row is announced.

**Required:** Add `importantForAccessibility="no"` (Android) / `accessibilityElementsHidden` (iOS) support to `Icon` when used decoratively. This is best achieved by adding a `decorative?: boolean` prop that when true, sets `accessibilityLabel=""` and `accessibilityRole` to `"none"` so the icon is not traversed by screen readers.

This is a pervasive improvement. All callsites where an Icon is inside a labeled Pressable should pass `decorative`.

### A-3 · `JournalDeleteDialog.tsx` — No modal screen-reader isolation (HIGH)

`JournalDeleteDialog` uses React Native `<Modal>` with `transparent`. React Native's `Modal` on iOS automatically isolates focus. On Android, background content may still be accessible. The card `View` inside the overlay lacks `accessibilityViewIsModal` on the content container (the pattern recommended by React Native for Android screen reader containment).

Additionally, the dialog has no announced title — the first `Text` ("Delete this journal entry?") acts as the title but is not given `accessibilityRole="header"`.

**Required:**
- Add `accessibilityViewIsModal={true}` to the card content `View`.
- Give the title `Text` `accessibilityRole="header"`.

### A-4 · `JournalPrivacySheet.tsx` — Same modal isolation gap (HIGH)

Same pattern as A-3. The `sheetCard View` lacks `accessibilityViewIsModal`. Title Text inside lacks `accessibilityRole="header"`.

**Required:** Same fix as A-3.

### A-5 · `CustomRecurrenceModal.tsx` — Same modal isolation gap (HIGH)

Same pattern. The `modalContent View` lacks `accessibilityViewIsModal`. Title Text lacks `accessibilityRole="header"`.

**Required:** Same fix.

### A-6 · `EditScopeSheet.tsx` — Same modal isolation gap (MEDIUM)

Same pattern. The `sheetContainer` lacks `accessibilityViewIsModal`. Title lacks `accessibilityRole="header"`.

**Required:** Same fix.

### A-7 · `PrayerHeader.tsx` — No accessible grouping / no screen-reader label for the header block (MEDIUM)

`PrayerHeader` renders the current prayer name, Arabic name, icon, "CURRENT PRAYER" badge, and countdown row as separate ungrouped text elements. A screen reader will traverse each child individually: "CURRENT PRAYER, text", "Fajr, text", "الفجر, text", "compass-outline, image", then the countdown. This is noisy and fragmented.

Additionally, the Arabic name `Text` at line 61-68 has no `accessibilityElementsHidden` — Arabic content will be announced as a separate item. Arabic text announced in isolation may confuse TalkBack's language detection.

The decorative ornament `View` (the arch circle at absolute position) is not hidden from accessibility.

**Required:**
- Wrap the main content in a single `View` with `accessible={true}` and a composite `accessibilityLabel` (e.g., `"Current prayer: Fajr. Next: Dhuhr in 1 hour 23 minutes"`).
- Hide the decorative ornament from accessibility: `importantForAccessibility="no-hide-descendants"`.
- Hide the Arabic name from the accessibility tree (it is redundant for SR users since the English name is already announced): `importantForAccessibility="no"` on the Arabic Text.

### A-8 · `PrayerHeader.tsx` — Countdown row not grouped / no live region (MEDIUM)

The countdown text "Dhuhr in **1:23:45**" updates every second (driven by `countdownDisplay`). It currently has no `accessibilityLiveRegion`. For screen reader users, continuously announcing a countdown every second would be disruptive, so the live region should NOT be added. However the countdown container should be hidden from continuous traversal and only summarized in the grouped header accessible label.

**Required:** As part of A-7 grouping fix, include countdown in the composite label when present. Suppress individual countdown `Text` traversal.

### A-9 · `SettingsRow.tsx` — Chevron icon announced separately (LOW)

The `chevron-right` icon at line 114 is rendered inside the Pressable but is not hidden from the accessibility tree. Since the `Pressable` already has a label, the icon will be announced as a separate "chevron-right, image".

**Required:** Pass `decorative` prop to the `Icon` (see A-2 fix).

### A-10 · `TaskCard.tsx` — Status badge announced as separate noisy elements (MEDIUM)

`TaskCard` renders the card as a non-accessible `View`. The badge Text elements ("IMPORTANT", "Missed", "Overdue", "Completed") are announced as separate traversal nodes. A screen reader user hears: "Complete task: Buy groceries, checkbox, unchecked" then separately "IMPORTANT, text" as they navigate through children.

**Required:** Group the card content with `accessible={true}` on the outer card `View` with a composite `accessibilityLabel` that includes status (e.g., `"Buy groceries. Important. Overdue 5 min."`). Suppress children via `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"` on the `contentContainer`. The `TaskCheckbox` should remain separately accessible as the action target.

This requires a structural decision: the checkbox is the interactive element, the card body is informational. The recommended pattern:
- Card `View`: `accessible={true}`, informational composite label, `importantForAccessibility="no-hide-descendants"` on the non-interactive content sub-view.
- `TaskCheckbox`: remains as separate interactive element.

### A-11 · `DayDetailTaskList.tsx` — Arabic prayer names announced as separate noise (LOW)

`DayDetailTaskList` renders `section.arabicName` as a separate `Text` alongside the English name (line 67-69). Screen readers will announce "الظهر" as a separate traversal item, potentially triggering incorrect language detection.

**Required:** Add `importantForAccessibility="no"` to the Arabic name `Text` (same rationale as A-7).

### A-12 · `CalendarMonthGrid.tsx` — Weekday headers have `accessibilityRole="text"` (OBSERVATION)

Weekday headers have `accessibilityRole="text"` which is not a standard React Native role. On iOS/Android, unrecognized roles fall back to the default. The correct value is `"none"` since these labels are informational non-interactive elements, or simply omit the role. No functional impact but semantically incorrect.

**Required:** Remove `accessibilityRole="text"` (omit it entirely — the default text role is correct for non-interactive `Text` elements).

### A-13 · `Onboarding` — Theme selection Pressables have no accessible role/label/state (HIGH)

The three theme option `Pressable` elements in Step 4 (MAKE_IT_YOURS) at lines 646–716 have no `accessibilityRole`, `accessibilityLabel`, or `accessibilityState`. A screen reader user cannot determine what each button does or whether it is currently selected.

**Required:**
- Add `accessibilityRole="radio"` (these are mutually exclusive options).
- Add `accessibilityLabel` (`"System theme"`, `"Light theme"`, `"Dark theme"`).
- Add `accessibilityState={{ selected: activeThemeMode === mode }}`.

### A-14 · `Onboarding` — Calculation method options have no accessible role/label (HIGH)

The method option `Pressable` elements in Step 3 (lines 566–593) have no `accessibilityRole`, `accessibilityLabel`, or `accessibilityState`.

**Required:** Same as A-13.

### A-15 · `Onboarding` — City search results have no accessible role/label (MEDIUM)

City search result `Pressable` items (lines 484–503) have no `accessibilityRole` or `accessibilityLabel`. A screen reader user cannot determine what happens when they activate the item.

**Required:** Add `accessibilityRole="button"` and `accessibilityLabel` containing city name, country, and timezone.

### A-16 · `PrayerTabBar.tsx` — `currentIndicator` dot not hidden (LOW)

The current prayer indicator dot (`View` at lines 61-68, absolutely positioned within the tab) is not hidden from the accessibility tree. It contributes no accessible information beyond what the tab label already contains (`"current prayer"` is in the label). It may add a spurious traversal item.

**Required:** Add `importantForAccessibility="no"` to the indicator `View`.

### A-17 · Error state messages — No `accessibilityRole="alert"` for inline error text (MEDIUM)

In `today.tsx` (error state), `journal.tsx` (error and lock error states), `onboarding/index.tsx` (completion error), and `SetupRequiredState.tsx` (error banner text), error Text elements appear dynamically but have no `accessibilityLiveRegion` or `accessibilityRole="alert"`. Screen reader users will not be notified when these errors appear.

**Required:** Add `accessibilityLiveRegion="assertive"` (or `accessibilityRole="alert"` which implies assertive on iOS) to dynamically-appearing error `Text` elements. Do not add this to all text — only to error/status Text that appears asynchronously.

Specifically:
- `SetupRequiredState` error banner `Text`
- `today.tsx` error state `Text` — this is a screen replacement so less critical
- `journal.tsx` lock error `Text` in `JournalLockedState`
- `onboarding/index.tsx` completion error `Text`

### A-18 · `SettingsSectionHeader.tsx` — Missing `accessibilityRole="header"` (MEDIUM)

`SettingsSectionHeader` renders a section label `Text` but does not expose `accessibilityRole="header"`. Screen reader users cannot skip to section headers.

**Required:** Add `accessibilityRole="header"` to the section title `Text`.

### A-19 · `CalendarHeader.tsx` — Gregorian month title `accessibilityRole="header"` is on the Text inside a flex container (OBSERVATION)

The `accessibilityRole="header"` is correctly applied (line 29). No change needed. Note for completeness.

### A-20 · Font scaling — No explicit `allowFontScaling` or `maxFontSizeMultiplier` anywhere (MEDIUM)

React Native's default is `allowFontScaling={true}` which is the correct behavior. The codebase does not disable font scaling anywhere — this is correct. However several components use fixed-size containers that may clip text at large font scales:

- `CalendarDayCell.tsx`: `minHeight: touchTargets.min` and `minWidth: touchTargets.min` — content is `alignItems: 'center'` with no fixed height on cells, calendar is in a grid. Gregorian day number and Hijri sub-number could wrap if font scale is very large. Grid cells use `flex: 1` so they expand horizontally but not vertically if the row is a fixed-height `alignItems: 'center'`.
- `BottomNavBar.tsx`: tab labels use `typography.caption` which may be very small at base scale. At very large scales, tabs could overflow. The container has `paddingBottom: 8` fixed — safe.
- `PrayerTabBar.tsx` tabs: tab label `typography.labelMedium` and time `typography.caption` — tabs use `flex: 1`, aligned center, no fixed height. Safe.

**Required:** No pervasive change. Document that default font scaling is preserved. Add `maxFontSizeMultiplier={2}` only to the calendar weekday labels and day cell text to prevent severe grid layout collapse at max accessibility text size. This is the only justified use of `maxFontSizeMultiplier` in M22.

### A-21 · `JournalHistory.tsx` back-to-today button chevron + text (LOW)

`JournalHistory` has a back button. Verify during implementation that it carries an `accessibilityRole="button"` and an `accessibilityLabel`.

---

## 4. RTL Issue Inventory

### RTL-1 · Physical margins used for icon-text spacing — LTR-only assumption (MEDIUM)

`marginRight` is used extensively to space icons from adjacent text (26 callsites in production). In RTL, an icon that visually precedes text on LTR should follow text on RTL. These should use `marginEnd` (logical) or `marginStart/marginEnd` pairs.

Examples:
- `PrayerHeader.tsx:97` — clock icon before countdown text: `marginRight: spacing.xs`
- `PrayerTransitionBanner.tsx:101` — icon container: `marginRight: 12`
- `SettingsRow.tsx:55` — icon wrapper: `marginRight: spacing.md`
- `SettingsInfoCard.tsx:37` — icon wrapper: `marginRight: spacing.sm`
- `JournalHeader.tsx:154` — icon button: `marginLeft: 4`
- `Toggle.tsx:144` — text container: `marginRight: 16`
- `SettingsToggle.tsx:57` — icon wrapper: `marginRight: spacing.md`
- `TaskCard.tsx:191` — content container: `marginLeft: 8`
- All task-form icon margins

**Classification:** Semantic/logical → should use `marginStart`/`marginEnd`.

**Required:** Replace `marginLeft` → `marginStart` and `marginRight` → `marginEnd` for icon-text spacing in LTR row layouts. **Exception:** `marginLeft: 'auto'` (push-right alignment for status badges in `TaskCard`) should remain as physical `auto` since `margin: 'auto'` is layout-engine driven and does not need logical conversion.

### RTL-2 · Physical `left`/`right` used in absolute positioning (MEDIUM)

Absolute-positioned elements:

| Component | Position | Classification |
|---|---|---|
| `PrayerHeader.tsx` ornamentRow | `right: -30, top: -30` | **Physical/non-mirrored** — decorative, fixed visual effect |
| `PrayerTabBar.tsx` currentIndicator | `position: 'absolute', top: 4` (no `left`/`right` — centered by `alignItems`) | **No issue** |
| `JournalDeleteDialog.tsx` backdrop | `top: 0, left: 0, right: 0, bottom: 0` (full-cover overlay) | **Physical/non-mirrored** — geometric, not directional |
| `JournalPrivacySheet.tsx` backdrop | Same full-cover | **Physical/non-mirrored** |

**Required:** The ornament `right: -30` in `PrayerHeader` is purely decorative. For RTL completeness it could use `end: -30`, but since it is decorative and the M22 RTL scope (see §13) is **layout readiness only**, this is LOW priority. Classify as deferred.

### RTL-3 · `textAlign: 'center'` — No issue (OBSERVATION)

`textAlign: 'center'` is direction-neutral. No change needed.

### RTL-4 · `paddingRight` / `paddingLeft` in internal padding (MEDIUM)

Several `textContainer` and `toggleLabelContainer` use `paddingRight: 12` to create spacing between label text and the trailing Switch/chevron. These should use `paddingEnd: 12` for logical equivalence.

Affected:
- `SettingsSelectOption.tsx:85` — `paddingRight: 12`
- `SettingsToggle.tsx:117` — `paddingRight: 12`
- `JournalPrivacySheet.tsx:202` — `paddingRight: 12`

**Required:** Replace with `paddingEnd`.

### RTL-5 · Row directional layouts — classification (LOW to MEDIUM)

All production `flexDirection: 'row'` layouts will automatically mirror in RTL since React Native respects `I18nManager.isRTL` for `flexDirection`. The classification per layout:

| Component | Row | RTL mirror? | Decision |
|---|---|---|---|
| `SettingsRow` | icon → label → value → chevron | YES — correct semantic order | Mirror |
| `SettingsToggle` | icon → label/desc → switch | YES | Mirror |
| `Toggle` | label → switch | YES | Mirror |
| `PrayerTabBar` | Fajr → Dhuhr → Asr → Maghrib → Isha | **NO** — chronological order | Do NOT mirror |
| `BottomNavBar` | Today → Calendar → Add → Journal → Settings | YES — navigation order mirrors | Mirror |
| `CalendarHeader` topRow | title → actions | YES | Mirror |
| `CalendarHeader` navButtons | prev → next | YES — natural flip (see §17) | Mirror |
| `TaskCard` mainRow | checkbox → content → badge | YES | Mirror |
| `JournalHeader` topRow | Journal title → action group | YES | Mirror |
| `JournalDeleteDialog` actionsRow | Cancel → Delete | YES | Mirror |
| `SettingsStepper` controls | minus → value → plus | YES | Mirror |
| `CompletedSection` header | label → chevron | YES | Mirror |
| `AnytimeTodaySection` header | icon+label → chevron | YES | Mirror |

### RTL-6 · `SettingsScreenHeader.tsx` — Chevron-left back button (MEDIUM)

`SettingsScreenHeader` uses `Icon name="chevron-left"` as a back button. In LTR, this correctly points left for "back". In RTL, the back direction is right (users read right-to-left, navigation hierarchy is right-to-left). The icon should mirror.

**Required:** The back icon should use `chevron-right` in RTL (or the icon should mirror). Since the product scope is layout readiness (not runtime RTL activation — see §13), this is a specification concern. The icon mirroring matrix (§15) defines the behavior.

---

## 5. Severity Classification

| ID | Description | Severity |
|---|---|---|
| A-3 | JournalDeleteDialog — no modal SR isolation | HIGH |
| A-4 | JournalPrivacySheet — no modal SR isolation | HIGH |
| A-5 | CustomRecurrenceModal — no modal SR isolation | HIGH |
| A-13 | Onboarding theme options — no role/label/state | HIGH |
| A-14 | Onboarding method options — no role/label/state | HIGH |
| A-1 | SettingsToggle — double announcement risk | HIGH |
| A-7 | PrayerHeader — uncontrolled traversal noise | MEDIUM |
| A-8 | PrayerHeader — countdown traversal | MEDIUM |
| A-10 | TaskCard — badge traversal noise | MEDIUM |
| A-17 | Error state Text — no live region / alert role | MEDIUM |
| A-18 | SettingsSectionHeader — no header role | MEDIUM |
| A-6 | EditScopeSheet — no modal SR isolation | MEDIUM |
| A-15 | Onboarding city results — no role/label | MEDIUM |
| A-20 | Font scaling — calendar cells max multiplier | MEDIUM |
| RTL-1 | Physical margins for icon spacing | MEDIUM |
| RTL-4 | Physical padding in text containers | MEDIUM |
| RTL-6 | Back button icon directionality | MEDIUM |
| A-2 | Icon — decorative icons announced | MEDIUM |
| A-11 | DayDetailTaskList — Arabic name traversal | LOW |
| A-9 | SettingsRow chevron announced | LOW |
| A-16 | PrayerTabBar dot not hidden | LOW |
| A-12 | CalendarMonthGrid — incorrect role on weekday labels | LOW |
| RTL-2 | Absolute ornament physical positioning | LOW |
| RTL-5 | Row layout classification | LOW |
| A-21 | JournalHistory back button — verify label | LOW |
| A-19 | CalendarHeader header role — already compliant | OBSERVATION |

---

## 6. Explicit M22 Scope

### In scope

1. `SettingsToggle.tsx` — suppress sibling element accessibility exposure (A-1)
2. `Icon.tsx` — add `decorative` prop; suppress decorative icons in labeled Pressables (A-2)
3. `JournalDeleteDialog.tsx` — `accessibilityViewIsModal`, title header role (A-3)
4. `JournalPrivacySheet.tsx` — same (A-4)
5. `CustomRecurrenceModal.tsx` — same (A-5)
6. `EditScopeSheet.tsx` — same (A-6)
7. `PrayerHeader.tsx` — grouping, composite label, hide ornament and Arabic text (A-7, A-8)
8. `TaskCard.tsx` — composite informational grouping (A-10)
9. `DayDetailTaskList.tsx` — hide Arabic name from accessibility tree (A-11)
10. `CalendarMonthGrid.tsx` — remove incorrect `accessibilityRole="text"` (A-12)
11. `app/onboarding/index.tsx` — role/label/state for theme options, method options, city results (A-13, A-14, A-15)
12. `PrayerTabBar.tsx` — hide indicator dot (A-16)
13. Error Text elements — `accessibilityLiveRegion="assertive"` / alert role where appropriate (A-17)
14. `SettingsSectionHeader.tsx` — add header role (A-18)
15. Logical margin/padding replacements across all production files (RTL-1, RTL-4)
16. `CalendarMonthGrid.tsx` — `maxFontSizeMultiplier={2}` on day cell and weekday labels (A-20)
17. Verify and fix `JournalHistory.tsx` back button label (A-21)

### Not in scope for M22

- Arabic full app translation
- Runtime RTL activation (`I18nManager.forceRTL`)
- New localization/i18n system
- Widget accessibility (deferred to M23/M24 native QA)
- Android navigation-bar theming (M23/M24 carry-forward from M21)
- Any domain scheduling, database, or notification changes

---

## 7. Non-Goals

M22 must NOT introduce:
- New database migrations
- New dependencies
- New navigation architecture
- New theme modes
- Gamification
- Premium paywall for accessibility features
- Localization/translation system
- Arabic language support

---

## 8. Accessibility Semantic Contract

### 8.1 Roles

| Control Type | Required Role |
|---|---|
| Navigation actions (back, close, save, retry) | `button` |
| Toggle / Switch (standalone) | `switch` (native `Switch`) |
| Settings toggle row | `switch` on `Pressable` wrapper |
| Checkbox (task, select option) | `checkbox` |
| Tab (prayer tab, bottom nav) | `tab` |
| Tab container | `tablist` |
| Single-select options (theme, method, radio group) | `radio` |
| Dialog/modal content | `accessibilityViewIsModal={true}` on content View |
| Dialog/modal title | `header` |
| Section headers | `header` |
| Calendar month title | `header` |
| Informational icon-only decorative elements | `none` (via decorative prop) |
| Informational card groupings | `accessible={true}` with composite label |

### 8.2 States

| State | When Required |
|---|---|
| `selected` | Tab, calendar day cell, SettingsSelectOption, radio options |
| `checked` | Checkbox, Switch |
| `disabled` | Any interactive element in disabled state |
| `busy` | Save button during submission |
| `expanded` | Collapsible sections (ReflectionSection, CompletedSection, AnytimeTodaySection) |

---

## 9. Touch-Target Contract

Enforced via `theme.touchTargets.min = 44` and `theme.touchTargets.comfortable = 48`.

| Element | Contract | Current State |
|---|---|---|
| All `Pressable` buttons | `minHeight: touchTargets.min` | Enforced via token across production |
| Icon-only buttons | `minWidth: touchTargets.min, minHeight: touchTargets.min` | Enforced (back, close, journal actions) |
| `SettingsStepper` buttons | `touchTargets.min` × `touchTargets.min` + `hitSlop` | Already compliant |
| `CalendarDayCell` | `minHeight: touchTargets.min, minWidth: touchTargets.min` | Compliant |
| Bottom nav Add button | `touchTargets.comfortable` | Compliant |
| `TaskCheckbox` | `minWidth/minHeight: touchTargets.min` | Compliant |

**Verified:** No material touch-target violations found. The existing `touchTargets` token system is correctly applied across all interactive elements audited.

---

## 10. Text Scaling Contract

- **Default scaling:** Preserved app-wide. `allowFontScaling` is not set (defaults to `true`). This is correct and must remain.
- **`maxFontSizeMultiplier` policy:** Only permitted when layout collapse would make content unusable.
- **Authorized uses in M22:**
  - `CalendarMonthGrid.tsx` weekday header labels: `maxFontSizeMultiplier={2}` (grid layout would break at scale > 2x)
  - `CalendarDayCell.tsx` day number and Hijri sub-number: `maxFontSizeMultiplier={2}` (same reason)
- **No other `maxFontSizeMultiplier` additions are authorized in M22.**
- **Fixed-height containers:** No fixed heights found that would clip scrollable or wrapping text. `minHeight` is used throughout which is safe.

---

## 11. Screen-Reader Contract (Modal / Dialog)

All `<Modal>` wrappers in production must follow this pattern:

```tsx
<Modal visible={...} transparent onRequestClose={...}>
  <View style={overlay}>
    <Pressable style={backdrop} onPress={dismiss} />     {/* tap-outside dismiss */}
    <View
      accessibilityViewIsModal={true}                    {/* screen-reader containment */}
      style={content}
    >
      <Text accessibilityRole="header">Dialog Title</Text>
      {/* dialog body */}
    </View>
  </View>
</Modal>
```

**Applies to:**
- `JournalDeleteDialog.tsx`
- `JournalPrivacySheet.tsx`
- `CustomRecurrenceModal.tsx`
- `EditScopeSheet.tsx`

**Not required on:** Native platform pickers opened by `@react-native-community/datetimepicker` — those are system-native and inherently isolated.

---

## 12. State / Non-Color Signal Contract

M21 established semantic contrast. The following table documents where state is currently color-only and what non-color supplemental cues must be added or verified:

| State | Current Color Signal | Existing Non-Color Cue | M22 Action |
|---|---|---|---|
| Selected prayer tab | Background tint + color change | `accessibilityState.selected`, bold font weight, time in label | **COMPLETE — no change** |
| Selected calendar day | Background tint | `accessibilityState.selected` | **COMPLETE — no change** |
| Completed task | `textDecorationLine: 'line-through'`, muted color, completed badge | Badge Text "Completed", strikethrough | **COMPLETE — no change** |
| Missed task | Warning color badge | Badge Text "Missed" | **COMPLETE — no change** |
| Overdue task | Warning color badge | Badge Text "X min overdue" | **COMPLETE — no change** |
| Important task | Danger tint badge | Badge Text "IMPORTANT" | **COMPLETE — no change** |
| Toggle on/off | Track color (primary vs unchecked) | `accessibilityState.checked`, native Switch thumb position | **COMPLETE — no change** |
| Task checkbox checked | Fill color | Check icon visible, `accessibilityState.checked` | **COMPLETE — no change** |
| SettingsSelectOption selected | Primary color text, bold | Checkmark icon, `accessibilityState.checked` | **COMPLETE — no change** |
| Journal locked | Lock icon fill color change | Lock icon present, button labeled "Journal Privacy. Biometric lock is enabled." | **COMPLETE — no change** |
| Error state | `colors.danger` or `colors.warning` text | M22 adds `accessibilityLiveRegion` / `accessibilityRole="alert"` | **NEW in M22 (A-17)** |

**Conclusion:** The existing codebase largely satisfies the non-color signal contract. The only gap is dynamic error text announcement (A-17).

---

## 13. RTL Activation / Readiness Contract

### 13.1 Current RTL Capability

- `app.json`: No `supportsRTL`, no `forcesRTL` key configured.
- No `I18nManager` import anywhere in the codebase.
- No locale/i18n system exists.
- The app does not read system language.
- Arabic content (prayer names) is rendered as static embedded strings.

**Current RTL status: zero RTL activation. The app is LTR only.**

### 13.2 M22 RTL Scope Decision

**M22 scope is RTL Layout Readiness Only (Option A).**

**Rationale:**
- No localization system exists. Adding runtime Arabic/RTL activation would require introducing a locale framework which is explicitly out of scope (no new dependencies).
- The app is English-language only at the product level. Prayer names in Arabic are embedded content, not UI language.
- RTL readiness means: use logical styles so that if the system is configured RTL (e.g., a device set to Arabic), the layout will respond correctly without re-engineering.
- `I18nManager.forceRTL` must NOT be called in M22.
- `I18nManager.allowRTL(true)` does not need to be called explicitly — the default React Native behavior follows the device system locale.

### 13.3 RTL Activation Decision

No runtime RTL activation is introduced in M22. The app will naturally follow system RTL if the device is set to an RTL locale, because:
1. Expo/React Native defaults `I18nManager.allowRTL(true)`.
2. `flexDirection: 'row'` automatically mirrors.
3. After M22 logical-style cleanup, margins/paddings will respond correctly.

A device restart is required for `I18nManager` changes to take effect (React Native platform constraint). Since M22 does not call `forceRTL`, there is no restart requirement.

---

## 14. Logical vs Physical Direction Contract

### 14.1 Replace (logical)

All `marginLeft` and `marginRight` used for **semantic spacing between icon and text in row layouts** must become `marginStart` / `marginEnd`. These respond correctly to RTL.

### 14.2 Keep as physical

| Pattern | Reason |
|---|---|
| `marginLeft: 'auto'` in status badges | Pushes content to the end regardless of direction; works correctly in both LTR/RTL with flexbox |
| `textAlign: 'center'` | Direction-neutral |
| `borderBottomWidth` / `borderTopWidth` | Physical; correct for both directions |
| `top: -30, right: -30` on decorative ornament | Purely decorative; physical position is acceptable |
| `top: 0, left: 0, right: 0, bottom: 0` on modal backdrop | Full-screen overlay; physical position required |
| `top: 4` on `PrayerTabBar` indicator | Vertical; not directional |

### 14.3 Summary of logical replacements (complete list)

All in production `app/**` and `src/components/**`:

| File | Property | Replace with |
|---|---|---|
| `src/components/common/Button.tsx:167` | `marginLeft` | `marginStart` |
| `src/components/common/Button.tsx:168` | `marginRight` | `marginEnd` |
| `src/components/common/Toggle.tsx:144` | `marginRight: 16` | `marginEnd: 16` |
| `src/components/settings/SettingsRow.tsx:55` | `marginRight: spacing.md` | `marginEnd: spacing.md` |
| `src/components/settings/SettingsRow.tsx:103` | `marginRight: ...` | `marginEnd: ...` |
| `src/components/settings/SettingsToggle.tsx:57` | `marginRight: spacing.md` | `marginEnd: spacing.md` |
| `src/components/settings/SettingsToggle.tsx:117` | `paddingRight: 12` | `paddingEnd: 12` |
| `src/components/settings/SettingsSelectOption.tsx:85` | `paddingRight: 12` | `paddingEnd: 12` |
| `src/components/settings/SettingsInfoCard.tsx:37` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `src/components/prayer/PrayerHeader.tsx:64` | `marginLeft: spacing.md` | `marginStart: spacing.md` |
| `src/components/prayer/PrayerHeader.tsx:97` | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `src/components/prayer/PrayerTransitionBanner.tsx:101` | `marginRight: 12` | `marginEnd: 12` |
| `src/components/prayer/PrayerTransitionBanner.tsx:109` | `marginLeft: 8` | `marginStart: 8` |
| `src/components/task/TaskCard.tsx:191` | `marginLeft: 8` | `marginStart: 8` |
| `src/components/task/AnytimeTodaySection.tsx` (icon margin) | `marginRight: 6` | `marginEnd: 6` |
| `src/components/journal/JournalHeader.tsx:128` | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `src/components/journal/JournalHeader.tsx:154` | `marginLeft: 4` | `marginStart: 4` |
| `src/components/journal/JournalPrivacySheet.tsx:63` | `marginLeft: spacing.md` | `marginStart: spacing.md` |
| `src/components/journal/JournalPrivacySheet.tsx:202` | `paddingRight: 12` | `paddingEnd: 12` |
| `src/components/journal/JournalDeleteDialog.tsx:78` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `src/components/journal/ReflectionSection.tsx:59` | `marginLeft: spacing.sm` | `marginStart: spacing.sm` |
| `src/components/journal/JournalHistory.tsx:52` | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `src/components/calendar/DayDetailTaskList.tsx:67` | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `src/components/task-form/DateTimePickerInput.tsx:83` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `src/components/task-form/DateTimePickerInput.tsx:171` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `src/components/task-form/MoreOptionsSection.tsx:80` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `src/components/task-form/MoreOptionsSection.tsx:293` | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `src/components/task-form/MoreOptionsSection.tsx:378` | `marginLeft: 4` | `marginStart: 4` |
| `src/components/task-form/RecurrenceSection.tsx:188` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `src/components/task-form/ScheduleModeCards.tsx:113` | `marginLeft: spacing.sm` | `marginStart: spacing.sm` |
| `src/components/task-form/ScheduleModeCards.tsx:401` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `src/components/task-form/ScheduleModeCards.tsx:425` | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `src/components/task-form/SuccessScreen.tsx:89` | `marginRight: 6` | `marginEnd: 6` |
| `src/components/task-form/SuccessScreen.tsx:97` | `marginRight: 6` | `marginEnd: 6` |
| `src/components/task-form/TaskFormScreen.tsx:326` | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `src/components/today/SetupRequiredState.tsx:140` | `marginRight: spacing.xs` | `marginEnd: spacing.xs` |
| `src/components/today/SetupRequiredState.tsx:170` | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `app/(tabs)/settings/hijri-calendar.tsx:392` | `marginRight: spacing.sm` | `marginEnd: spacing.sm` |
| `app/(tabs)/settings/hijri-calendar.tsx:400` | `marginLeft: spacing.sm` | `marginStart: spacing.sm` |
| `app/(tabs)/settings/notifications.tsx` (icon margins) | `marginRight` | `marginEnd` |
| `app/(tabs)/settings/planning-day.tsx` (icon margins) | `marginRight` | `marginEnd` |
| `app/(tabs)/settings/prayer-location.tsx` (icon margins) | `marginRight`/`marginLeft` | `marginEnd`/`marginStart` |
| `app/(tabs)/journal.tsx:253` | `marginLeft: spacing.xs` | `marginStart: spacing.xs` |
| `app/(tabs)/journal.tsx:312` | `marginLeft: 12` | `marginStart: 12` |

**Keep as-is (physical or direction-neutral):**
- `marginLeft: 'auto'` badge positions in `TaskCard` — correct, keep.
- `textAlign: 'center'` everywhere — correct, keep.

---

## 15. Icon Mirroring Matrix

| Icon | LTR Meaning | RTL Mirror? | Reason |
|---|---|---|---|
| `chevron-right` (navigation/disclosure) | Navigate forward / expand | **YES** — shows `chevron-left` in RTL | Directional navigation |
| `chevron-left` (back button) | Navigate back | **YES** — shows `chevron-right` in RTL | Directional navigation |
| `chevron-down` (expand) | Expand downward | **NO** | Vertical; direction-neutral |
| `chevron-right` as expand indicator (CompletedSection, AnytimeTodaySection) | Collapsed state | **NO** | Semantic: collapsed = right-pointing, expanded = down-pointing. Same in RTL. |
| Prayer icons (`compass-outline`) | Prayer | **NO** | Non-directional |
| `plus` / `close` | Add / Close | **NO** | Symmetric |
| `check` | Checkmark | **NO** | Symmetric |
| `bell` | Notification | **NO** | Non-directional |
| `lock-closed-outline` | Lock | **NO** | Non-directional |
| `calendar-outline` | Calendar | **NO** | Non-directional |
| `moon-outline`, `sunny-outline` | Theme | **NO** | Non-directional |
| `book-outline` (Journal) | Journal | **NO** | Non-directional |
| `settings-outline` | Settings | **NO** | Non-directional |
| `location-outline` | Location | **NO** | Non-directional |
| `trash-outline` | Delete | **NO** | Non-directional |
| `time-outline` | Time | **NO** | Non-directional |
| `star` | Star | **NO** | Symmetric |
| `information-circle-outline` | Info | **NO** | Symmetric |
| `alert-circle-outline` | Alert | **NO** | Symmetric |
| `search-outline` | Search | **NO** | Non-directional |
| `person-outline` | User | **NO** | Non-directional |

**Implementation note:** Since M22 RTL scope is layout readiness only (no runtime RTL activation), icon mirroring does not need a runtime `isRTL` guard in M22. When/if RTL activation is added in a future milestone, the `Icon.tsx` component should accept a `mirror?: boolean` prop that conditionally applies a horizontal `scaleX(-1)` style transform for the navigational chevrons.

---

## 16. Prayer Tab Ordering Decision

**Prayer tab order in RTL: DO NOT REVERSE.**

**Rationale:**
- Prayer times are chronologically ordered: Fajr → Dhuhr → Asr → Maghrib → Isha.
- This ordering represents time-of-day sequence, not reading direction.
- Reversing the tab order in RTL would show Isha first and Fajr last, which would be semantically incorrect and confusing for Muslim users regardless of language direction.
- The tabs are rendered as `flex: 1` items inside `flexDirection: 'row'`. If RTL is activated at the device level, React Native's flexbox will automatically reverse the rendered order. This must be prevented.
- **Frozen decision:** `PrayerTabBar` must use a `View` with explicit LTR direction enforcement (`direction: 'ltr'` style or equivalent technique) so that the prayer tab order is always Fajr–Isha left-to-right.
- This is a **blocker** for any future RTL activation milestone that would need to implement this.

---

## 17. Calendar RTL Decision

**Calendar date grid mirroring: MIRROR (Sunday through Saturday remains the same; visual layout flips).**

**Rationale:**
- The `WEEKDAYS` array in `CalendarMonthGrid` (`['Sun', 'Mon', ..., 'Sat']`) is rendered in a `flexDirection: 'row'`. In RTL, flexbox will render this right-to-left (Sat first, Sun last visually). This is **correct** for RTL calendar conventions.
- Gregorian and Hijri calendars both start their weeks on Sunday or Monday depending on locale. The Hijri calendar used in this app follows the same Sun–Sat week grid as the Gregorian.
- **Month navigation:** Previous/Next month chevrons. In RTL:
  - "Previous month" (go backward in time) visually moves to the **right** chevron.
  - "Next month" (go forward in time) visually moves to the **left** chevron.
  - Since M22 is layout readiness only, the chevron icons will automatically appear on the mirrored side via flexbox row reversal. The button labels ("Previous month" / "Next month") remain semantically correct regardless.
- **Date progression:** Calendar dates always progress left-to-right in time (1st on the left). In RTL, the grid reverses and dates go right-to-left in time (1st on the right). This is correct for RTL reading conventions.
- **No special action required** for calendar RTL — natural flexbox mirroring is appropriate.

---

## 18. Arabic / Mixed-Bidi Content Decision

### Arabic content in the app

The app contains Arabic content in two forms:
1. **Arabic prayer names** (`الفجر`, `الظهر`, `العصر`, `المغرب`, `العشاء`) — displayed in `PrayerHeader` alongside the English name, and in `DayDetailTaskList` section headers.
2. **Hijri month names** — currently displayed in English (via `HIJRI_MONTH_NAMES` constants which are English strings).

### Current rendering

Arabic prayer names are rendered with no explicit `writingDirection` or Unicode bidi marks. React Native's text engine performs Unicode Bidi algorithm automatically — Arabic characters will be displayed right-to-left within their text run, which is correct.

The Arabic `Text` in `PrayerHeader` is displayed after the English prayer name (e.g., "Fajr الفجر"). In LTR layout, this renders as: `Fajr` on the left, `الفجر` on the right. This is natural mixed-bidi text.

### M22 Decision

- **No explicit `writingDirection` needed** for the Arabic prayer name display. The Unicode Bidi algorithm handles this correctly.
- **No Unicode direction marks (LRE/RLE/etc.)** needed. Adding them would be premature and potentially harmful.
- **The Arabic names should be hidden from the accessibility tree** (A-7, A-11) to avoid confusing screen readers. The English names are sufficient for SR users.
- If RTL activation is added in a future milestone, prayer Arabic names may need to move to leading (start) position rather than trailing, but this is out of M22 scope.

---

## 19. Production File Inventory

Every production file requiring changes in M22, with reason and test coverage:

| File | Problem | Change | Test Group |
|---|---|---|---|
| `src/components/common/Icon.tsx` | Decorative icons announced | Add `decorative?: boolean` prop | A |
| `src/components/common/Button.tsx` | Physical marginLeft/marginRight for icon spacing | Replace with marginStart/marginEnd | H |
| `src/components/common/Toggle.tsx` | Physical marginRight on textContainer | Replace with marginEnd | H |
| `src/components/settings/SettingsToggle.tsx` | Double announcement risk; physical marginRight/paddingRight | Suppress sibling elements; logical replacements | A, H |
| `src/components/settings/SettingsRow.tsx` | Physical marginRight; decorative chevron | Logical replacements; decorative Icon | A, H |
| `src/components/settings/SettingsSelectOption.tsx` | Physical paddingRight | Logical replacement | H |
| `src/components/settings/SettingsSectionHeader.tsx` | No header role | Add `accessibilityRole="header"` | B |
| `src/components/settings/SettingsInfoCard.tsx` | Physical marginRight on icon | Logical replacement | H |
| `src/components/prayer/PrayerTabBar.tsx` | Indicator dot not hidden; LTR enforcement spec | `importantForAccessibility="no"` on dot; enforce LTR | A, J |
| `src/components/prayer/PrayerHeader.tsx` | Uncontrolled traversal, decorative ornament, physical margins, Arabic noise | Group content, composite label, hide ornament, hide Arabic; logical margins | A, B, C, H |
| `src/components/prayer/PrayerTransitionBanner.tsx` | Physical margins | Logical replacements | H |
| `src/components/task/TaskCard.tsx` | Badge traversal noise; physical margins | Group card content with composite label; logical margins | A, B, C |
| `src/components/task/AnytimeTodaySection.tsx` | Physical icon margin | Logical replacement | H |
| `src/components/task/CompletedSection.tsx` | Chevron icon — decorative | Pass `decorative` to chevron Icon | A |
| `src/components/calendar/CalendarMonthGrid.tsx` | Incorrect `accessibilityRole="text"`; font scaling | Remove incorrect role; add `maxFontSizeMultiplier` | B, F |
| `src/components/calendar/CalendarDayCell.tsx` | Font scaling | Add `maxFontSizeMultiplier={2}` on day number and Hijri sub-number Text | F |
| `src/components/calendar/DayDetailTaskList.tsx` | Arabic name traversal; physical margin | `importantForAccessibility="no"` on Arabic Text; logical margin | A, H |
| `src/components/journal/JournalDeleteDialog.tsx` | No modal isolation; no dialog title header role; physical margin | `accessibilityViewIsModal`, header role, logical margin | E |
| `src/components/journal/JournalPrivacySheet.tsx` | No modal isolation; no title header role; physical margins/padding | Same fixes; logical replacements | E, H |
| `src/components/journal/JournalHeader.tsx` | Physical margins | Logical replacements | H |
| `src/components/journal/ReflectionSection.tsx` | Physical marginLeft | Logical replacement | H |
| `src/components/journal/JournalHistory.tsx` | Physical marginLeft; verify back button label | Logical replacement; label verification | A, H |
| `src/components/task-form/CustomRecurrenceModal.tsx` | No modal isolation; no title header role | `accessibilityViewIsModal`, header role | E |
| `src/components/task-form/EditScopeSheet.tsx` | No modal isolation; no title header role | `accessibilityViewIsModal`, header role | E |
| `src/components/task-form/DateTimePickerInput.tsx` | Physical margins | Logical replacements | H |
| `src/components/task-form/MoreOptionsSection.tsx` | Physical margins | Logical replacements | H |
| `src/components/task-form/RecurrenceSection.tsx` | Physical margins | Logical replacements | H |
| `src/components/task-form/ScheduleModeCards.tsx` | Physical margins | Logical replacements | H |
| `src/components/task-form/SuccessScreen.tsx` | Physical margins | Logical replacements | H |
| `src/components/task-form/TaskFormScreen.tsx` | Physical margin on validation error | Logical replacement | H |
| `src/components/today/SetupRequiredState.tsx` | Physical margins; error Text no live region | Logical replacements; `accessibilityLiveRegion="assertive"` | A, H |
| `app/(tabs)/today.tsx` | Error Text no live region | `accessibilityLiveRegion="assertive"` on error Text | C |
| `app/(tabs)/journal.tsx` | Physical margins; error/lock text no live region | Logical replacements; live region on error Text | C, H |
| `app/(tabs)/settings/hijri-calendar.tsx` | Physical margins | Logical replacements | H |
| `app/(tabs)/settings/notifications.tsx` | Physical margins | Logical replacements | H |
| `app/(tabs)/settings/planning-day.tsx` | Physical margins | Logical replacements | H |
| `app/(tabs)/settings/prayer-location.tsx` | Physical margins | Logical replacements | H |
| `app/onboarding/index.tsx` | Theme options no role/label/state; method options no role/label/state; city results no role/label | Add role/label/state throughout | A, B, C |

**Total production files requiring changes: 38**

---

## 20. Test Matrix

### Test groups and estimated new count

| Group | Description | File | Est. Tests |
|---|---|---|---|
| A | Accessible Names | `src/__tests__/m22/AccessibleNames.test.tsx` | ~20 |
| B | Roles | `src/__tests__/m22/AccessibilityRoles.test.tsx` | ~12 |
| C | States / Live Regions | `src/__tests__/m22/AccessibilityStates.test.tsx` | ~10 |
| D | Touch Targets | (documented verified; no new tests) | 0 |
| E | Modal Accessibility Isolation | `src/__tests__/m22/ModalAccessibility.test.tsx` | ~16 |
| F | Text Scaling | `src/__tests__/m22/TextScaling.test.tsx` | ~6 |
| G | Non-Color State Cues | (verified by existing suite) | 0 |
| H | RTL Logical Styles | `src/__tests__/m22/RTLLogicalStyles.test.tsx` | ~25 |
| I | RTL Icon Direction | `src/__tests__/m22/RTLIcons.test.tsx` | ~8 |
| J | Prayer Tab RTL / Order | `src/__tests__/m22/PrayerTabRTL.test.tsx` | ~6 |
| K | Calendar RTL Navigation | `src/__tests__/m22/CalendarRTL.test.tsx` | ~8 |
| L | Arabic / Mixed-Bidi Text | `src/__tests__/m22/ArabicBidi.test.tsx` | ~6 |
| M | Static Accessibility Audit | `src/__tests__/m22/StaticA11yAudit.test.tsx` | ~10 |
| **Total** | | | **~127** |

M21 baseline: 1404. M22 target: **≥ 1504** (target ~1531).

---

## 21. Native QA Carry-Forward (M23/M24)

The following accessibility concerns require physical device testing:

| Item | Target |
|---|---|
| VoiceOver (iOS) focus order through Today screen | M23 |
| TalkBack (Android) focus order through Today screen | M23 |
| VoiceOver — modal focus trapping validation (`accessibilityViewIsModal` behavior differs by iOS version) | M23 |
| TalkBack — modal focus trapping validation (Android SR with transparent Modal) | M23 |
| Large Accessibility Text (≥ 300% font scale) — calendar layout | M23 |
| Calendar RTL visual layout in system RTL locale | M23 |
| Widget accessibility (iOS, Android) | M23/M24 |
| VoiceOver reading of Arabic text in PrayerHeader | M23 |

---

## 22. Dependencies

**0 new dependencies.**

All changes use existing React Native accessibility APIs (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `accessibilityViewIsModal`, `importantForAccessibility`, `accessibilityElementsHidden`, `accessibilityLiveRegion`, `maxFontSizeMultiplier`, `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd`).

---

## 23. Migrations

**0 migrations.** No database changes.

---

## 24. Subsystem Isolation

M22 changes must not touch:
- `src/domain/**`
- `src/data/schema.ts`
- `src/data/migrations/**`
- `src/services/**`
- `widgets/**`
- `package.json` / `package-lock.json`
- `app.json`

---

## 25. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `accessibilityViewIsModal` effectiveness varies by Android version | MEDIUM | Mark as native QA carry-forward; add Jest assertion at minimum |
| `importantForAccessibility="no-hide-descendants"` affects child touch targets on Android | MEDIUM | Verify `TaskCheckbox` remains tappable inside grouped TaskCard |
| Icon `decorative` prop — callsites may be missed | LOW | Static audit test (Group M) detects un-decorated icons |
| Prayer tab LTR enforcement implementation complexity | MEDIUM | Use CSS `direction: 'ltr'` style on `PrayerTabBar` container |
| Logical margin/padding adoption — test coverage gap | LOW | Group H static audit tests catch regressions |

---

## 26. Unresolved Architecture Questions

**UQ-1 — Prayer tab LTR enforcement mechanism**

`direction: 'ltr'` is a CSS property. React Native StyleSheet accepts it. Confirm it is accepted by the installed React Native version without a type error, or use alternative: render tab items as absolute-positioned elements in chronological order regardless of flex direction.

**UQ-2 — `accessibilityViewIsModal` iOS vs Android placement**

On iOS, `accessibilityViewIsModal` on the content View inside a `<Modal>` may be redundant since Modal itself isolates focus on iOS. On Android it is required. Confirm the correct placement does not cause double-isolation on iOS. Apply `accessibilityViewIsModal` on the innermost card/content View, not the overlay wrapper.

**UQ-3 — TaskCard grouping vs. TaskCheckbox interactivity**

When the card body `View` has `accessibilityElementsHidden` on its content, the `TaskCheckbox` child Pressable must remain individually accessible. Apply `accessible={true}` and composite label on the informational `contentContainer View` only (not the entire card `View`), while leaving the `TaskCheckbox` as a separately accessible sibling in the mainRow.

---

## 27. Implementation Order

1. **Icon.tsx** — `decorative` prop (prerequisite for all other icon fixes)
2. **Modal isolation** — `JournalDeleteDialog`, `JournalPrivacySheet`, `CustomRecurrenceModal`, `EditScopeSheet`
3. **SettingsSectionHeader** — header role
4. **SettingsToggle** — double-announcement suppression
5. **PrayerHeader** — grouping and composite label (most complex)
6. **TaskCard** — composite grouping
7. **Onboarding** — theme options, method options, city results
8. **Error live regions** — SetupRequiredState, today.tsx, journal.tsx
9. **Logical margin/padding replacements** — all 38 files (mechanical; do in one pass)
10. **CalendarMonthGrid / CalendarDayCell** — role fix and font scaling
11. **PrayerTabBar** — indicator dot; LTR enforcement
12. **DayDetailTaskList / PrayerHeader** — Arabic name suppression
13. **Remaining LOW items** — Icon decorative callsites, CompletedSection chevron
14. **Tests** — all 13 test groups

---

## 28. Verification Gates

Before M22 can be submitted for independent review:

1. `npx tsc --noEmit` — 0 errors
2. `npx eslint . --ext ts,tsx` — 0 errors, 0 warnings
3. `npx jest --passWithNoTests` — 0 failures; all existing 1404 tests pass; all new M22 tests pass
4. New test count ≥ 100 (target ~127)
5. `git diff --stat origin/main HEAD` — 0 changes to domain, schema, migrations, services, widgets, package files
6. `git diff --check` — no whitespace errors
7. `git rev-parse origin/main` — must remain `a8c837c6ef6c27d3bc81a48b6e1d12e6489874f1`
8. Architecture commit exists locally and is NOT pushed
9. Implementation commit is NOT pushed (until formal closure)

---

## 29. Closure Criteria

M22 is closed when:

1. All BLOCKER and HIGH findings resolved
2. All MEDIUM findings resolved or explicitly documented as carry-forward with justification
3. 0 TypeScript errors
4. 0 ESLint errors/warnings
5. All M22 tests passing
6. Total test count ≥ 1504 (baseline 1404 + ≥ 100 new)
7. 0 new dependencies
8. 0 new migrations
9. Independent review: APPROVED (unconditional or with documented carry-forward)
10. Final documentation committed
11. ONE authorized push to `origin/main`

---

## ADR-030 Reference

ADR-030 is authorized. The accessibility and RTL decisions established in M22 constitute durable cross-project architectural rules:

- Accessibility semantic contract (roles, states, modal isolation pattern)
- RTL product scope (layout readiness only; no runtime activation without locale system)
- Prayer tab LTR chronological ordering (must not reverse in RTL)
- Icon mirroring matrix
- Logical-style convention (`marginStart`/`marginEnd` mandate)
- `maxFontSizeMultiplier` policy (calendar cells only; no global override)
- `decorative` Icon prop pattern

These will be recorded in `docs/DECISIONS.md` as ADR-030.
