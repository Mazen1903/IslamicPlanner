# UI System

**Status:** Source of truth for UI patterns and design system  
**Updated:** 2026-09-14 (Rev 2 — architecture review)  
**Implements:** MASTER_PRODUCT_SPEC §36, §4, §5, §6, §25, §35, §47, §48, §49, §55

---

## 1. Design Principles

From MASTER_PRODUCT_SPEC §36.1:
- **Calm** — no visual urgency or pressure
- **Friendly** — approachable, warm
- **Modern** — current design language, not dated
- **Soft** — rounded corners, gentle shadows, muted transitions
- **Islamic without excess** — subtle identity, not heavy ornamentation
- **Uncluttered** — generous whitespace, focused content
- **Premium but not luxury** — quality feel without being ostentatious
- **Productivity-focused** — not corporate, not playful

---

## 2. Color Tokens

### 2.1 Light Theme

```typescript
export const lightTheme = {
  // Brand
  primary:          '#1B7A4D',   // Deep Islamic green
  primaryLight:     '#E8F5EE',   // Pale mint surface
  primaryDark:      '#145C3A',   // Darker green for pressed states
  
  // Backgrounds
  background:       '#FAFBFC',   // Warm white
  surface:          '#FFFFFF',   // Card/sheet surface
  surfaceElevated:  '#FFFFFF',   // Modal/elevated surface
  
  // Text
  textPrimary:      '#1A1D21',   // Near-black
  textSecondary:    '#5F6B7A',   // Muted gray
  textTertiary:     '#8E99A8',   // Hint text
  textOnPrimary:    '#FFFFFF',   // White on green
  
  // Status
  success:          '#2E8B57',   // Completion
  warning:          '#D4A017',   // Overdue (warm, not alarming)
  error:            '#C0392B',   // Missed (muted red)
  info:             '#2980B9',   // Informational
  
  // Prayer identity (subtle accent overlays)
  prayerFajr:       '#F0E6FF',   // Dawn lavender
  prayerDhuhr:      '#FFF8E1',   // Daylight warm
  prayerAsr:        '#FFF3E0',   // Afternoon amber
  prayerMaghrib:    '#FFE0E6',   // Sunset rose
  prayerIsha:       '#E8EAF6',   // Night indigo-gray
  
  // Borders & dividers
  border:           '#E8ECF0',
  divider:          '#F0F2F5',
  
  // Shadows
  shadowColor:      'rgba(0, 0, 0, 0.06)',
  shadowElevated:   'rgba(0, 0, 0, 0.12)',
  
  // Misc
  overlay:          'rgba(0, 0, 0, 0.4)',
  tabInactive:      '#A0AAB8',
  tabActive:        '#1B7A4D',
  checkboxUnchecked:'#CBD2DC',
  checkboxChecked:  '#1B7A4D',
};
```

### 2.2 Dark Theme

```typescript
export const darkTheme = {
  // Brand
  primary:          '#4CAF75',   // Brighter green for dark mode
  primaryLight:     '#1A2F23',   // Dark green tint surface
  primaryDark:      '#388E5E',
  
  // Backgrounds
  background:       '#0F1114',   // Deep charcoal, not pure black
  surface:          '#1A1D22',   // Card surface
  surfaceElevated:  '#242830',   // Modal/elevated
  
  // Text
  textPrimary:      '#E8ECF0',
  textSecondary:    '#8E99A8',
  textTertiary:     '#5F6B7A',
  textOnPrimary:    '#0F1114',
  
  // Status
  success:          '#4CAF75',
  warning:          '#F0C040',
  error:            '#E74C4C',
  info:             '#5DADE2',
  
  // Prayer identity (subtle, muted for dark)
  prayerFajr:       '#1A1530',
  prayerDhuhr:      '#1F1A10',
  prayerAsr:        '#1F1710',
  prayerMaghrib:    '#1F1015',
  prayerIsha:       '#10121F',
  
  // Borders & dividers
  border:           '#2A2E36',
  divider:          '#1F2328',
  
  // Shadows
  shadowColor:      'rgba(0, 0, 0, 0.3)',
  shadowElevated:   'rgba(0, 0, 0, 0.5)',
  
  // Misc
  overlay:          'rgba(0, 0, 0, 0.6)',
  tabInactive:      '#5F6B7A',
  tabActive:        '#4CAF75',
  checkboxUnchecked:'#3A3F48',
  checkboxChecked:  '#4CAF75',
};
```

---

## 3. Spacing Scale

```typescript
export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};
```

---

## 4. Typography

### 4.1 Font Families

```typescript
export const fonts = {
  display: 'Outfit',         // Friendly, modern display font (via expo-font / Google Fonts)
  body:    'Inter',           // Clean sans-serif for dense content
  mono:    'JetBrainsMono',   // Monospace for times (optional)
};
```

**Loading:** Use `expo-font` to load custom fonts. Fall back to system font until loaded.

### 4.2 Type Scale

```typescript
export const typography = {
  // Display — decorative font
  displayLarge:  { fontFamily: fonts.display, fontSize: 32, fontWeight: '700', lineHeight: 40 },
  displayMedium: { fontFamily: fonts.display, fontSize: 24, fontWeight: '600', lineHeight: 32 },
  displaySmall:  { fontFamily: fonts.display, fontSize: 20, fontWeight: '600', lineHeight: 28 },
  
  // Headlines — display font, smaller
  headlineLarge: { fontFamily: fonts.display, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  headlineMedium:{ fontFamily: fonts.display, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  
  // Body — sans-serif
  bodyLarge:     { fontFamily: fonts.body, fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium:    { fontFamily: fonts.body, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmall:     { fontFamily: fonts.body, fontSize: 12, fontWeight: '400', lineHeight: 16 },
  
  // Labels — sans-serif, medium weight
  labelLarge:    { fontFamily: fonts.body, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  labelMedium:   { fontFamily: fonts.body, fontSize: 12, fontWeight: '500', lineHeight: 16 },
  labelSmall:    { fontFamily: fonts.body, fontSize: 10, fontWeight: '500', lineHeight: 14 },
  
  // Caption
  caption:       { fontFamily: fonts.body, fontSize: 11, fontWeight: '400', lineHeight: 14 },
};
```

### 4.3 Font Usage Rules (§36.3)

| Context | Font |
|---|---|
| Screen titles | Display (Outfit) |
| Selected prayer name in header | Display |
| Friendly empty states | Display |
| Short emphasis text | Display |
| Task names | Body (Inter) |
| Times and durations | Body |
| Recurrence labels | Body |
| Notes content | Body |
| Settings labels | Body |
| Long descriptive text | Body |

**Rule:** Never use the display font for dense task information or long text.

---

## 5. Radius & Shadows

```typescript
export const radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 999,    // Fully rounded
  card: 16,
};

export const shadows = {
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,    // Color handles opacity
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  bottomBar: {
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
};
```

---

## 6. Component Specifications

### 6.1 Prayer Tab Bar

```text
┌──────────────────────────────────────────────┐
│  Fajr  │  Dhuhr  │  Asr  │ Maghrib │  Isha  │
└──────────────────────────────────────────────┘
```

- Horizontal scrollable if needed on small devices
- Always 5 tabs in fixed order: Fajr, Dhuhr, Asr, Maghrib, Isha
- Current prayer: strong selected state (primary color, bold text, indicator bar)
- Past prayers: subdued (lighter text, no indicator)
- Future prayers: accessible but muted (medium text, no indicator)
- Optional: subtle prayer identity tint on the selected tab

### 6.2 Prayer Header

```text
┌──────────────────────────────────────┐
│         🕌                           │
│       Dhuhr                          │  ← Display font, large
│      1:27 PM                         │  ← Body font, time
│   Asr in 3h 37m                      │  ← Body font, countdown
└──────────────────────────────────────┘
```

- Prayer name in display font
- Start time below
- "Next prayer in X" countdown
- Optional subtle illustration/icon
- Prayer identity background tint (very subtle)

### 6.3 Task Card

```text
┌──────────────────────────────────────┐
│ ○  Soccer                    ! 6:00 PM│
│    Every Tuesday · 60 min            │
└──────────────────────────────────────┘
```

- Rounded card (radius.card)
- Soft shadow
- Left: checkbox (circle for incomplete, filled for complete)
- Center: task title (body font, medium weight)
- Right: time/priority indicator
- Below title: recurrence label, duration, tags (body small, secondary color)
- Source badge: subtle icon for worship-generated tasks
- Completed: muted text, strikethrough, checked circle
- Tap entire card → task detail

### 6.4 Empty States

**No tasks scheduled:**
```text
┌──────────────────────────────────────┐
│                                      │
│         📋                           │
│   Nothing scheduled until Asr.       │  ← Display font
│                                      │
│        [+ Add to Dhuhr]              │
│                                      │
└──────────────────────────────────────┘
```

**All done:**
```text
┌──────────────────────────────────────┐
│                                      │
│         ✨                           │
│   All done until Asr                 │  ← Display font
│                                      │
└──────────────────────────────────────┘
```

### 6.5 Anytime Today Section

```text
┌──────────────────────────────────────┐
│  ▼ Anytime Today                   2 │
│                                      │
│  ○  Buy toothpaste                   │
│  ○  Call dentist                     │
│                                      │
└──────────────────────────────────────┘
```

- Collapsible section at bottom of each prayer tab
- Shows count when collapsed
- Same task card style inside

### 6.6 Bottom Navigation

```text
┌────────────────────────────────────────┐
│  🕌      📅      ⊕      🤲     ⚙️   │
│ Today  Calendar  Add   Worship  Settings│
└────────────────────────────────────────┘
```

- Floating/rounded style if consistent with ecosystem
- Center "+" button may be elevated/accented
- Active tab: primary color icon + label
- Inactive: gray icon + label

---

## 7. Screen Inventory

### 7.1 Core Screens

| Screen | Route | Description |
|---|---|---|
| Today | `/(tabs)/today` | Prayer-centered daily task view |
| Calendar | `/(tabs)/calendar` | Month grid with Hijri dates |
| Worship | `/(tabs)/worship` | Worship suggestion settings |
| Settings | `/(tabs)/settings` | Settings hub |
| Add Task | `/task/add` | Task creation modal/screen |
| Task Detail | `/task/[id]` | Task edit/detail view |
| Onboarding | `/onboarding` | 4-step onboarding flow |

### 7.2 Settings Screens

| Screen | Route |
|---|---|
| Prayer & Location | `/(tabs)/settings/prayer-location` |
| Planner | `/(tabs)/settings/planner` |
| Notifications | `/(tabs)/settings/notifications` |
| Appearance | `/(tabs)/settings/appearance` |
| Calendar Settings | `/(tabs)/settings/calendar-settings` |
| Account & Sync | `/(tabs)/settings/account` |
| Premium | `/(tabs)/settings/premium` |
| About & Help | `/(tabs)/settings/about` |

### 7.3 Supporting Screens/Modals

| Screen | Type |
|---|---|
| Location Selector | Modal |
| Calculation Method Picker | Bottom Sheet |
| Manual Prayer Adjustment | Bottom Sheet |
| Reminder Picker | Bottom Sheet |
| Recurrence Picker | Bottom Sheet |
| Hijri Recurrence Picker | Bottom Sheet |
| Tag Picker | Bottom Sheet |
| Drag Confirmation | Dialog |
| Permission Prompts | Dialog |

---

## 8. Animation & Transitions

### 8.1 Micro-animations
- Task completion: checkbox fills with brief scale-up (150ms)
- Task card entry: fade-in + slight slide-up (200ms)
- Prayer tab switch: content cross-fade (150ms)
- Countdown: smooth number transition (no jarring jumps)
- Section collapse/expand: height animation (200ms, ease-out)

### 8.2 Transitions
- Screen push: slide-from-right (native stack default)
- Modal: slide-from-bottom
- Bottom sheet: spring animation

### 8.3 Reduced Motion
- Respect `AccessibilityInfo.isReduceMotionEnabled()`
- Disable all non-essential animations when enabled
- Keep functional state changes (complete → muted) but remove spring/slide effects

---

## 9. Accessibility (§47)

| Requirement | Implementation |
|---|---|
| Dynamic text | Support `fontScale` via `PixelRatio.getFontScale()` |
| Screen reader | `accessibilityLabel` on all interactive elements |
| Color contrast | WCAG AA minimum (4.5:1 for text, 3:1 for large text) |
| Tap targets | Minimum 44×44 dp |
| Non-color status | Icons/text accompany color indicators |
| Reduced motion | Detect and respect system setting |
| RTL readiness | Use `start`/`end` instead of `left`/`right` |
| Arabic text | `I18nManager` support; text direction flips |

### 9.1 Prayer Tab Accessibility

```typescript
<Tab
  accessibilityLabel={`${prayerName} prayer tab. ${isActive ? 'Currently active.' : ''} ${taskCount} tasks.`}
  accessibilityRole="tab"
  accessibilityState={{ selected: isActive }}
/>
```

### 9.2 Task Card Accessibility

```typescript
<TaskCard
  accessibilityLabel={`${title}. ${scheduleLabel}. ${isOverdue ? `${overdueMinutes} minutes overdue.` : ''} ${status}.`}
  accessibilityRole="button"
  accessibilityActions={[{ name: 'activate', label: 'Open task details' }]}
/>
```

---

## 10. RTL and Arabic Readiness (§48)

- All layout uses `flexDirection: 'row'` with `I18nManager.isRTL` awareness
- Use `marginStart`/`marginEnd` instead of `marginLeft`/`marginRight`
- Prayer tabs remain in Fajr→Isha order regardless of RTL (temporal order, not reading order)
- Tab bar may scroll direction may need RTL consideration
- Arabic prayer names available in localization file
- Hijri month/day names available in Arabic
- Test with Arabic system language enabled

---

## 11. Onboarding Flow (§49)

### Screen 1: "Your day, centered around Salah"
- Illustration: five prayer icons flowing through the day
- Brief text explaining the concept
- [Continue]

### Screen 2: "Your schedule adapts automatically"
- Animated example: Soccer 6:00 PM moving from Asr (summer) to Maghrib (winter)
- Task time stays the same — visual emphasis
- [Continue]

### Screen 3: "Set your prayer times"
- [Use my location — Recommended]
- [Choose location manually]
- Auto-recommend calculation method
- [Continue]

### Screen 4: "Make it yours"
- Prayer alerts toggle
- Worship Suggestions toggle
- Theme selection (light/dark/system)
- [Start Planning]

Total: 4 steps. No long tutorial.

---

## 12. Theme Provider Architecture

```typescript
// ThemeProvider.tsx
const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useSettingsStore(s => s.themeMode);
  const systemColorScheme = useColorScheme(); // 'light' | 'dark'
  
  const resolvedTheme = useMemo(() => {
    if (themeMode === 'SYSTEM') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'DARK' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);
  
  return (
    <ThemeContext.Provider value={resolvedTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

Components consume theme tokens, never hardcoded values:

```typescript
function TaskCard() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadowColor }]}>
      <Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>{title}</Text>
    </View>
  );
}
```
