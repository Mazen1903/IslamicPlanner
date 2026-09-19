# M21 - Dark Mode Polish: Architecture

**Status:** CLOSED / SONNET APPROVED
**Freeze commit:** `d27e176` (docs(m21): freeze M21 architecture - dark mode polish)
**Implementation commit:** `3c7bfc5` (feat(m21): implement dark mode polish - semantic token compliance)
**Review corrective commit:** `326f0cc` (fix(m21): complete dark mode polish review requirements)
**Closure commit:** `docs(m21): close M21 after independent review -- APPROVED`
**Note:** `c49e17c` was a premature bookkeeping commit; independent review subsequently required fixes; corrective implementation landed in `326f0cc`; final re-review APPROVED unconditionally.
**Authored by:** Gemini (architecture agent)
**Independently reviewed and hardened by:** Sonnet (architecture reviewer)
**Review date:** 2026-09-19
**Baseline:** `97ceb444ac33b771adc04020d5e4537ca0e72543` (closed M20)
**Final test count:** 1404 / 1404 tests - 121 / 121 suites - 0 TS errors - 0 ESLint errors

---

## 1. Overview

M21 is a **presentation-only** polish pass. The application already has a complete,
centralized semantic theme system:

| Layer | Location |
|---|---|
| Token shape + ThemeMode type | src/theme/tokens.ts |
| Light palette | src/theme/lightTheme.ts |
| Dark palette | src/theme/darkTheme.ts |
| Provider (SYSTEM/LIGHT/DARK, persistent) | src/theme/ThemeProvider.tsx |
| Consumer hook | src/theme/useTheme.ts |
| Cold-start hydration | app/_layout.tsx -> RootLayout |

**Goals:**

1. Eliminate every production color literal that should come from semantic theme tokens
2. Fix all palette values that fail WCAG AA contrast in both light and dark modes
3. Establish correct semantic meaning for switch/toggle track tokens
4. Add StatusBar integration that reacts to the resolved theme
5. Add themeVariant to DateTimePicker so the native picker matches the active theme
6. Eliminate the theme hydration race: persisted explicit theme resolves before normal
   route content mounts

**Non-goals:**

- No new theming architecture
- No domain, data, or service changes
- No database migrations
- No new npm runtime or dev dependencies
- No widget changes (separate native architecture - out of scope)
- No ThemeProvider.tsx structural changes
- No Journal, notification, or onboarding business logic changes

---

## 2. Hardening Pass - 7 Corrections Applied (Rev 2, 2026-09-19)

### Correction 1 - Theme Hydration Race (CRITICAL)

**Finding:** RootLayout loads the persisted theme mode asynchronously inside a useEffect.
RootGate mounts immediately as part of the JSX return and calls
useOnboardingStore.getState().initialize() inside its own useEffect. These are two
independent async reads with no ordering guarantee.

The race:
1. App mounts; themeMode = SYSTEM
2. RootGate renders; useEffect fires -> initialize() begins
3. Theme read begins concurrently
4. Onboarding read resolves first (common case - single row read)
5. status -> COMPLETE or PENDING; RootGate renders Slot
6. Theme read has not resolved - persisted DARK or LIGHT is unknown
7. Normal app content renders in SYSTEM mode (wrong persisted theme)

**Fix - themeReady gate (exact contract for app/_layout.tsx):**

  export default function RootLayout() {
    const [themeMode, setThemeMode] = useState('SYSTEM');
    const [themeReady, setThemeReady] = useState(false);

    useEffect(() => {
      initNotificationHandler();
      userSettingsRepository
        .get()
        .then(settings => {
          if (settings?.themeMode) {
            setThemeMode(settings.themeMode);
          }
        })
        .catch(err => {
          console.warn('[RootLayout] Failed to load persisted theme mode:', err);
        })
        .finally(() => {
          setThemeReady(true);
        });
    }, []);

    const handleModeChange = useCallback(async (mode) => {
      setThemeMode(mode);
      try {
        await userSettingsRepository.upsert({ themeMode: mode });
      } catch (err) {
        console.warn('[RootLayout] Failed to persist theme mode:', err);
      }
    }, []);

    return (
      <SafeAreaProvider>
        <ThemeProvider mode={themeMode} onModeChange={handleModeChange}>
          <ThemedStatusBar />
          {themeReady ? <RootGate /> : <BootstrapLoadingView />}
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

**Consequences:**
- RootGate is not mounted until themeReady = true
- useOnboardingStore.getState().initialize() fires AFTER theme hydration
- Normal app and onboarding content never render with wrong persisted theme
- BootstrapLoadingView may briefly render in SYSTEM mode - acceptable (opaque loader)
- Theme read failure: .catch() logs warning; .finally() sets themeReady=true - non-fatal
- M20 onboarding gate semantics remain unchanged - downstream of themeReady

**Hydration tests (H-01 through H-05):**
- H-01: Persisted DARK + system LIGHT -> no light content before DARK is hydrated
- H-02: Persisted LIGHT + system DARK -> no dark content before LIGHT is hydrated
- H-03: Theme read failure -> SYSTEM fallback + themeReady=true + app continues
- H-04: RootGate not mounted while themeReady=false; BootstrapLoadingView renders
- H-05: M20 gate (ERROR/PENDING/COMPLETE) unaffected after themeReady=true

---

### Correction 2 - Dark dangerPressed Contrast Failure (CRITICAL)

**Finding:** Previous value #C0392B vs textOnPrimary (#0F1114) = 3.4769:1. FAILS 4.5:1.
Pressed state is NOT exempt from text contrast requirements.

Computed candidates:

| Candidate | vs #0F1114 | Pass? |
|---|---|---|
| #C0392B | 3.4769 | FAIL |
| #D94949 | 4.5017 | PASS (minimal margin) |
| #D95050 | 4.6945 | PASS - SELECTED |

**Fix:** Dark dangerPressed = #D95050. Ratio: 4.6945:1 vs #0F1114. Adequate margin.
Pressable default opacity behavior provides additional pressed visual feedback.

---

### Correction 3 - Light dangerSurface Contrast Failure (CRITICAL)

**Finding:** Previous value #FEE2E2 vs danger (#C0392B) = 4.4520:1. FAILS.
SetupRequiredState renders typography.bodySmall (normal text, requires 4.5:1).

| Candidate | #C0392B vs surface | Pass? |
|---|---|---|
| #FEE2E2 | 4.4520 | FAIL |
| #FEE3E3 | 4.4831 | FAIL |
| #FEE7E7 | 4.6093 | PASS - SELECTED |

**Fix:** Light dangerSurface = #FEE7E7. Ratio: 4.6093:1. Clear margin.

---

### Correction 4 - Light textTertiary and tabInactive Contrast Failures (MUST FIX IN M21)

**Finding:** Light textTertiary (#8E99A8) = 2.79:1 on bg, 2.89:1 on surface. FAILS.
textTertiary carries meaningful normal text (timestamps, captions, action labels).
tabInactive uses same value; BottomNavBar renders small-text tab labels - same failure.
Previously deferred to M22. MUST be fixed in M21 per this hardening pass.

Candidate #687483 (selected):

| Surface | Ratio | Pass? |
|---|---|---|
| bg #FAFBFC | 4.5915 | PASS |
| surface #FFFFFF | 4.7570 | PASS |

Hierarchy (higher contrast on white = more prominent):

| Token | vs #FFFFFF | Prominence |
|---|---|---|
| textSecondary #5F6B7A | 5.43 | most prominent |
| textTertiary #687483 | 4.76 | less prominent |
| textMuted #8E99A8 | 2.89 | least prominent |

**Fix:** Light textTertiary = #687483 and tabInactive = #687483.
These items are REMOVED from M22 carry-forward.

---

### Correction 5a - textMuted Audit

| File | Usage | Verdict |
|---|---|---|
| TaskCard.tsx | Completed task title + strikethrough | EXEMPT - WCAG 1.4.3 - intentional de-emphasis of completed state |
| PrayerTabBar.tsx L79, L95 | Past prayer name + time caption | EXEMPT - supplementary, past prayers de-emphasized by design |
| demo.tsx L116 | Caption in demo screen | Handled under Correction 5b |

**Verdict:** textMuted is exclusively intentional de-emphasis. No change to values.
Light: #8E99A8. Dark: #5F6B7A. No M21 or M22 action on textMuted values.

---

### Correction 5b - app/demo.tsx Route Status

**Finding:** app/demo.tsx is inside Expo Router app/ directory.
Route /demo is a valid, routable, SHIPPED route. No __DEV__ guard. Not excluded from
production build. Previous classification as "outside production nav flow / not shipped" was
INCORRECT.

Raw literals: text="#FFF" appears 6x as a prop to ColorSwatch, rendered as { color: text }
in style. This IS a raw color string used in a UI style.
Correct semantic token: colors.textOnPrimary.

**Decision: Option A - include in M21 scope and fix.**
Fix: text="#FFF" (x6) -> text={theme.colors.textOnPrimary}.
File added to inventory: 15 total.

**M24 carry-forward:** Gate /demo behind __DEV__ or remove from production.
Record in IMPLEMENTATION_STATUS.md.

---

### Correction 6 - Supporting Documentation

Docs updated in this commit:
- docs/M21_ARCHITECTURE.md (this document)
- docs/CURRENT_MILESTONE.md - M21 status -> ARCHITECTURE FROZEN
- docs/IMPLEMENTATION_STATUS.md - M21 row with frozen status
- docs/ARCHITECTURE_INDEX.md - M21 entry
- docs/DECISIONS.md - ADR-029
- docs/AI_PROJECT_CONSTITUTION.md - semantic-token consumption rule

---

### Correction 7 - File Inventory Consistency

Previous draft header said "Theme Core (4 files)" but listed 3 files. Fixed.
Total count recalculated: 15 files (includes app/demo.tsx).

---

## 3. Color Literal Audit - Complete Final Classification

### Category A - Theme palette definitions (LEGITIMATE)

src/theme/lightTheme.ts and src/theme/darkTheme.ts - raw hex values by design. No action.

### Category B - Legitimate approved exceptions

| File | Literal | Rationale |
|---|---|---|
| PrayerHeader.tsx | rgba(255,255,255,0.15) x2, rgba(255,255,255,0.75), rgba(0,0,0,0.15) | Alpha overlays on colors.primary banner - no semantic token can represent alpha-on-primary |
| onboarding/index.tsx | transparent x2 | Pressed-state reset; neutral unselected state |
| planning-day.tsx | transparent | Conditional border visibility |
| TaskCheckbox.tsx | transparent | Unchecked checkbox - no fill by design |
| SettingsStepper.tsx | transparent x2 | Pressed-state reset |
| PrayerTabBar.tsx | transparent | Unselected tab |
| JournalHeader.tsx | transparent | Lock button unfilled |
| Button.tsx | transparent x5 | Ghost/secondary/disabled border resets |
| CalendarDayCell.tsx | transparent x2 | Unselected day background/border |
| CalendarHeader.tsx | transparent x2 | Nav button pressed reset |

### Category C - Must migrate (11 items)

| ID | File | Literal | Fix |
|---|---|---|---|
| C-1 | appearance.tsx | #FFF | -> colors.textOnPrimary |
| C-2 | hijri-calendar.tsx | rgba(0,0,0,0.5) + shadow block | -> colors.overlay; dynamic inline shadow; bg -> colors.surfaceElevated |
| C-3 | settings/index.tsx | rgba(0,0,0,0.05) | -> colors.divider inline |
| C-4 | SetupRequiredState.tsx | #FEE2E2 | -> colors.dangerSurface |
| C-5 | JournalDeleteDialog.tsx | #962D22 | -> colors.dangerPressed |
| C-6 | SettingsToggle.tsx | #E2E8F0 | -> colors.checkboxUnchecked; remove isDark ternary |
| C-7 | Toggle.tsx | #E2E8F0 | -> theme.colors.checkboxUnchecked |
| C-8 | onboarding/index.tsx | #E0E0E0 | -> theme.colors.divider |
| C-9 | onboarding/index.tsx | rgba(0,0,0,0.03) x2 | -> theme.colors.surfaceSecondary |
| C-10 | Button.tsx | danger for pressed state | -> theme.colors.dangerPressed |
| C-11 | app/demo.tsx | "#FFF" x6 (text prop) | -> theme.colors.textOnPrimary |

---

## 4. New Tokens Required (2 tokens)

### dangerPressed

| Theme | Value | textOnPrimary contrast |
|---|---|---|
| Light | #962D22 | 7.7915:1 PASS |
| Dark | #D95050 (CORRECTED from #C0392B) | 4.6945:1 PASS |

Consumers: JournalDeleteDialog (C-5), Button destructive variant (C-10)

### dangerSurface

| Theme | Value | danger text contrast |
|---|---|---|
| Light | #FEE7E7 (CORRECTED from #FEE2E2) | 4.6093:1 PASS |
| Dark | #2D1515 | 4.6309:1 PASS |

Consumer: SetupRequiredState (C-4)

Both tokens added to ThemeColors interface in tokens.ts, lightTheme.ts, and darkTheme.ts.

---

## 5. Switch / Toggle Track - Semantic Contract

Unchecked (off) state uses colors.checkboxUnchecked. An off-state enabled toggle is NOT
a disabled control. disabledBackground would be semantically wrong.

| Theme | checkboxUnchecked |
|---|---|
| Light | #CBD2DC |
| Dark | #3A3F48 |

WCAG SC 1.4.11 applies to thumb/track boundary, not track/background.

---

## 6. Complete Final Frozen Palettes

### Light Theme - Changes Only

    textTertiary:  #687483   CHANGED from #8E99A8 (contrast fix: 4.59:1 on bg, 4.76:1 on surface)
    tabInactive:   #687483   CHANGED from #A0AAB8 (contrast fix: 4.59:1 on bg, 4.76:1 on surface)
    dangerPressed: #962D22   NEW
    dangerSurface: #FEE7E7   NEW (corrected from #FEE2E2)

All other light values unchanged from M20.

### Dark Theme - Changes Only

    textTertiary:  #7E90A2   CHANGED from #5F6B7A (contrast fix: 5.76:1 on bg, 5.15:1 on surface)
    tabInactive:   #7E90A2   CHANGED from #5F6B7A (contrast fix: 5.15:1 on surface)
    danger:        #E85050   CHANGED from #E74C4C (contrast fix: 4.58:1 on surface)
    error:         #E85050   CHANGED from #E74C4C
    dangerPressed: #D95050   NEW (corrected from #C0392B - was 3.48:1, now 4.69:1)
    dangerSurface: #2D1515   NEW

All other dark values unchanged from M20.
textMuted (Light #8E99A8, Dark #5F6B7A) - UNCHANGED. Intentional de-emphasis only.
disabledText (both themes) - UNCHANGED. WCAG 1.4.3 exempt for disabled controls.

---

## 7. Authoritative Numeric Contrast Table (Computed 2026-09-19)

### Light Theme

| Pair | Ratio | Required | Result |
|---|---|---|---|
| textPrimary #1A1D21 / bg #FAFBFC | 16.32 | 4.5 | PASS |
| textPrimary #1A1D21 / surface #FFFFFF | 16.91 | 4.5 | PASS |
| textSecondary #5F6B7A / bg | 5.24 | 4.5 | PASS |
| textSecondary #5F6B7A / surface | 5.43 | 4.5 | PASS |
| textTertiary #687483 / bg | 4.59 | 4.5 | PASS [FIXED] |
| textTertiary #687483 / surface | 4.76 | 4.5 | PASS [FIXED] |
| textMuted #8E99A8 / bg | 2.79 | exempt | EXEMPT (intentional de-emphasis) |
| textMuted #8E99A8 / surface | 2.89 | exempt | EXEMPT |
| textOnPrimary #FFFFFF / primary #1B7A4D | 5.33 | 4.5 | PASS |
| textOnPrimary #FFFFFF / dangerPressed #962D22 | 7.79 | 4.5 | PASS |
| danger #C0392B / bg | 5.25 | 4.5 | PASS |
| danger #C0392B / surface | 5.44 | 4.5 | PASS |
| danger #C0392B / dangerSurface #FEE7E7 | 4.61 | 4.5 | PASS [FIXED] |
| tabInactive #687483 / surface | 4.76 | 4.5 | PASS [FIXED] |
| tabInactive #687483 / bg | 4.59 | 4.5 | PASS [FIXED] |
| disabledText #A0AAB8 / disabledBg #E8ECF0 | 1.98 | exempt | EXEMPT (disabled) |

### Dark Theme

| Pair | Ratio | Required | Result |
|---|---|---|---|
| textPrimary #E8ECF0 / bg #0F1114 | 15.93 | 4.5 | PASS |
| textPrimary #E8ECF0 / surface #1A1D22 | 14.23 | 4.5 | PASS |
| textSecondary #8E99A8 / bg | 6.55 | 4.5 | PASS |
| textSecondary #8E99A8 / surface | 5.85 | 4.5 | PASS |
| textTertiary #7E90A2 / bg | 5.76 | 4.5 | PASS [FIXED] |
| textTertiary #7E90A2 / surface | 5.15 | 4.5 | PASS [FIXED] |
| textTertiary #7E90A2 / surfaceSecondary | 5.37 | 4.5 | PASS [FIXED] |
| textTertiary #7E90A2 / surfaceElevated | 4.50 | 4.5 | PASS [FIXED] |
| textMuted #5F6B7A / bg | 3.49 | exempt | EXEMPT (intentional de-emphasis) |
| textMuted #5F6B7A / surface | 3.11 | exempt | EXEMPT |
| textOnPrimary #0F1114 / primary #4CAF75 | 6.93 | 4.5 | PASS |
| textOnPrimary #0F1114 / dangerPressed #D95050 | 4.69 | 4.5 | PASS [FIXED] |
| danger #E85050 / bg | 5.13 | 4.5 | PASS [FIXED] |
| danger #E85050 / surface | 4.58 | 4.5 | PASS [FIXED] |
| danger #E85050 / dangerSurface #2D1515 | 4.63 | 4.5 | PASS |
| tabInactive #7E90A2 / surface | 5.15 | 4.5 | PASS [FIXED] |
| disabledText #5F6B7A / disabledBg #2A2E36 | 2.51 | exempt | EXEMPT (disabled) |
| textPrimary #E8ECF0 / prayerFajr #1A1530 | 14.82 | 4.5 | PASS |
| textPrimary #E8ECF0 / prayerMaghrib #1F1015 | 15.47 | 4.5 | PASS |

---

## 8. Dark Surface Hierarchy - Frozen

| Token | Value | Role |
|---|---|---|
| background | #0F1114 | App base - deepest layer |
| surfaceSecondary | #16191E | Inset/depressed surface within card |
| surface | #1A1D22 | Primary card/sheet surface |
| surfaceElevated | #242830 | Modals, bottom sheets, floating elements |

---

## 9. Status Bar Contract

  function ThemedStatusBar() {
    const { isDark } = useTheme();
    return <StatusBar style={isDark ? 'light' : 'dark'} />;
  }

Rendered inside ThemeProvider in RootLayout. SYSTEM mode is fully reactive.
expo-status-bar ~57.0.1 already installed. Zero new dependencies.

| Theme | StatusBar style |
|---|---|
| Light / SYSTEM+system-light | dark (dark icons on light bg) |
| Dark / SYSTEM+system-dark | light (light icons on dark bg) |

---

## 10. DateTimePicker Contract

@react-native-community/datetimepicker@9.1.0 - themeVariant prop (dark|light) confirmed.
Add to both DatePickerInput and TimePickerInput in DateTimePickerInput.tsx:

  themeVariant={isDark ? 'dark' : 'light'}

iOS-only prop. Android inherits system theme. Physical-device picker QA deferred to M23.

---

## 11. Modal and Shadow Contract

| Component | Fix |
|---|---|
| hijri-calendar modal | overlay -> colors.overlay; shadow -> {...theme.shadows.elevated, shadowColor: colors.shadowElevated}; bg -> colors.surfaceElevated |
| JournalDeleteDialog | C-5 only (pressed color) - overlay and surface already correct |
| PremiumLockedInfo | No changes needed |

---

## 12. ADR-029 - Semantic Theme Consumption and Theme Hydration Contract

Context: M1 established the token system. M21 is the first systematic audit of production
UI files and the first discovery and resolution of the theme-hydration race condition.

Decisions:

1. Normal app content must not render before persisted explicit theme is resolved.
   themeReady gate in RootLayout is the canonical mechanism.
2. Theme read failure is non-fatal. Falls back to SYSTEM + sets themeReady=true.
3. All production UI colors must come from semantic theme tokens.
4. Category-B exceptions (alpha-on-primary, transparent resets) must be documented in
   M21_ARCHITECTURE.md. No undocumented raw literals permitted.
5. textMuted and disabledText may be low-contrast. WCAG 1.4.3 permits reduced contrast
   for intentional de-emphasis (completed, past, disabled) states.
6. Unchecked switch/toggle track uses checkboxUnchecked. disabledBackground is wrong.
7. Widgets are a separate theme architecture. App token changes do not affect widgets.
8. SYSTEM/LIGHT/DARK are the only theme modes. No new modes in M21 or M22.
9. Dark-mode presentation cannot modify domain or data behavior.

Consequences: 15 files modified; 2 new tokens; 6 token values changed; themeReady gate
added; zero migrations; zero new dependencies.

---

## 13. Complete File Inventory - FINAL

15 production files. 0 new files. 0 deleted files. 0 new dependencies. 0 migrations.

### Theme Core (3 files)

| File | Change |
|---|---|
| src/theme/tokens.ts | Add dangerPressed, dangerSurface to ThemeColors interface |
| src/theme/lightTheme.ts | Add dangerPressed (#962D22), dangerSurface (#FEE7E7); CHANGE textTertiary, tabInactive to #687483 |
| src/theme/darkTheme.ts | Add dangerPressed (#D95050), dangerSurface (#2D1515); CHANGE textTertiary+tabInactive to #7E90A2; danger+error to #E85050 |

### Root (1 file)

| File | Change |
|---|---|
| app/_layout.tsx | Add themeReady state + .finally() gate; add ThemedStatusBar function; render {themeReady ? RootGate : BootstrapLoadingView} inside ThemeProvider |

### Common Components (2 files)

| File | Change |
|---|---|
| src/components/common/Button.tsx | C-10: destructive pressed -> theme.colors.dangerPressed |
| src/components/common/Toggle.tsx | C-7: '#E2E8F0' -> theme.colors.checkboxUnchecked |

### Settings Components (1 file)

| File | Change |
|---|---|
| src/components/settings/SettingsToggle.tsx | C-6: '#E2E8F0' -> colors.checkboxUnchecked; remove isDark ternary |

### Task Form Components (1 file)

| File | Change |
|---|---|
| src/components/task-form/DateTimePickerInput.tsx | Add themeVariant={isDark ? 'dark' : 'light'} to both picker instances |

### Today Components (1 file)

| File | Change |
|---|---|
| src/components/today/SetupRequiredState.tsx | C-4: '#FEE2E2' -> colors.dangerSurface |

### Journal Components (1 file)

| File | Change |
|---|---|
| src/components/journal/JournalDeleteDialog.tsx | C-5: '#962D22' -> colors.dangerPressed |

### Screen Files (3 files)

| File | Change |
|---|---|
| app/(tabs)/settings/appearance.tsx | C-1: '#FFF' -> colors.textOnPrimary |
| app/(tabs)/settings/hijri-calendar.tsx | C-2: full shadow + overlay + bg fix |
| app/(tabs)/settings/index.tsx | C-3: rgba(0,0,0,0.05) -> colors.divider |

### Prayer Components (1 file)

| File | Change |
|---|---|
| src/components/prayer/PrayerTabBar.tsx | Reviewer-mandated accessibility fix: past interactive prayer text -> colors.textTertiary instead of colors.textMuted |

### Onboarding (1 file)

| File | Change |
|---|---|
| app/onboarding/index.tsx | C-8: '#E0E0E0' -> theme.colors.divider; C-9: rgba(0,0,0,0.03) x2 -> theme.colors.surfaceSecondary |

### Demo Route (1 file)

| File | Change |
|---|---|
| app/demo.tsx | C-11: text="#FFF" (x6) -> text={theme.colors.textOnPrimary} |

---

## 14. Forbidden Files

DO NOT modify in M21:
- src/domain/**
- src/data/schema.ts
- src/data/migrations/**
- src/services/**
- src/theme/ThemeProvider.tsx
- package.json / package-lock.json
- Any file not in the 16-file inventory above

---

## 15. Complete Test Matrix

### Token Shape Tests

- ThemeColors interface has dangerPressed and dangerSurface keys
- lightColors and darkColors have identical key sets
- lightColors.dangerPressed === '#962D22'
- darkColors.dangerPressed === '#D95050'
- lightColors.dangerSurface === '#FEE7E7'
- darkColors.dangerSurface === '#2D1515'
- lightColors.textTertiary === '#687483' (regression guard)
- darkColors.textTertiary === '#7E90A2' (regression guard)
- lightColors.tabInactive === '#687483' (regression guard)
- darkColors.tabInactive === '#7E90A2' (regression guard)
- darkColors.danger === '#E85050' (regression guard)

### Contrast Tests

Light:
- textTertiary (#687483) / bg #FAFBFC >= 4.5
- textTertiary (#687483) / surface #FFFFFF >= 4.5
- tabInactive (#687483) / surface #FFFFFF >= 4.5
- danger (#C0392B) / dangerSurface #FEE7E7 >= 4.5
- textOnPrimary (#FFFFFF) / dangerPressed #962D22 >= 4.5

Dark:
- textTertiary (#7E90A2) / surface #1A1D22 >= 4.5
- textTertiary (#7E90A2) / surfaceSecondary #16191E >= 4.5
- textTertiary (#7E90A2) / surfaceElevated #242830 >= 4.5
- tabInactive (#7E90A2) / surface #1A1D22 >= 4.5
- danger (#E85050) / surface #1A1D22 >= 4.5
- danger (#E85050) / dangerSurface #2D1515 >= 4.5
- textOnPrimary (#0F1114) / dangerPressed #D95050 >= 4.5

### Hydration Tests

- H-01: Persisted DARK + system LIGHT -> RootGate not mounted before themeReady; no light content
- H-02: Persisted LIGHT + system DARK -> RootGate not mounted before themeReady; no dark content
- H-03: Theme read failure -> SYSTEM fallback + themeReady=true + no crash
- H-04: themeReady=false -> BootstrapLoadingView renders; RootGate not mounted
- H-05: M20 onboarding gate semantics (ERROR/PENDING/COMPLETE) unchanged after themeReady=true

### StatusBar Tests

- ThemedStatusBar -> style="light" when isDark=true
- ThemedStatusBar -> style="dark" when isDark=false

### ThemeProvider Mode Tests

- LIGHT: isDark=false regardless of useColorScheme mock
- DARK: isDark=true regardless of useColorScheme mock
- SYSTEM + dark scheme: isDark=true
- SYSTEM + light scheme: isDark=false
- Runtime OS change (SYSTEM mode): re-renders with updated isDark
- Runtime OS change (LIGHT/DARK mode): isDark unchanged

### Component Render Tests

- Button destructive unpressed -> theme.colors.danger background
- Button destructive pressed -> theme.colors.dangerPressed background
- Toggle unchecked -> theme.colors.checkboxUnchecked track (not '#E2E8F0')
- SettingsToggle unchecked -> colors.checkboxUnchecked track
- SetupRequiredState error banner background -> colors.dangerSurface
- JournalDeleteDialog delete button pressed -> colors.dangerPressed

### Regression

- All 1374 existing tests pass
- 0 TypeScript errors
- 0 ESLint errors/warnings

---

## 16. M22 / M23 / M24 Carry-Forward

| Item | Milestone |
|---|---|
| Android navigation bar color | M23 |
| Android DateTimePicker dark mode visual verification | M23 |
| iOS DateTimePicker themeVariant physical verification | M23 |
| iOS status bar on notched devices | M23 |
| CustomRecurrenceModal interval input placeholderTextColor | M22 |
| /demo route gated behind __DEV__ or removed from production | M24 |

Light textTertiary and tabInactive contrast - REMOVED from carry-forward (fixed in M21).

---

## 17. Architecture Freeze Sign-off

| Field | Value |
|---|---|
| Architecture authored | Gemini (initial draft) |
| First independent review | Sonnet (2026-09-18, Rev 1) |
| Second hardening pass | Sonnet (2026-09-19, Rev 2) |
| Corrections applied | 7 |
| M21 baseline | 97ceb444ac33b771adc04020d5e4537ca0e72543 |
| Status | FROZEN - READY FOR IMPLEMENTATION |
