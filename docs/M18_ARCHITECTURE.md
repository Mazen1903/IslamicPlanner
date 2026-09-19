# M18 - Widgets Architecture

> **Status:** CLOSED / SONNET APPROVED
> **Authored:** 2026-09-18
> **Baseline commit:** 85902a5
> **Architecture commit:** 4128c93
> **Implementation commit:** 3cd5980
> **Android WorkManager fix:** bc3b37c
> **Closure commit:** See `docs: close M18 after independent review -- APPROVED`
> **Independent review:** SONNET APPROVED — all BLOCKERs cleared

---

## 0. Document Purpose

This document freezes the technical architecture for M18. Implementation agents **must not** begin coding until this document is committed locally with the freeze commit. No production code may deviate from this specification without a formal revision.

---

## 1. Goal Summary

Deliver useful, lightweight home-screen widgets. Widgets are **read-only presentation surfaces**.

1. **iOS:** Small, Medium widget families using expo-widgets + @expo/ui/swift-ui components.
2. **Android:** Small, Medium widget families using react-native-android-widget.
3. **Shared:** A platform-neutral WidgetSnapshotBuilder derived from existing canonical services.
4. **Sync:** A non-React WidgetSyncCoordinator that fires after authoritative app events.
5. **Privacy:** No Journal content, no task descriptions, no user coordinates exposed in widgets.
6. **SETUP_REQUIRED safety:** Widget shows a neutral setup prompt when location/prayer config is missing.
7. **ADR update:** ADR-009 superseded by ADR-026 (this document).

---

## 2. Scope

### 2.1 In Scope - M18

| Feature | Platforms | Notes |
|---|---|---|
| Small widget: current prayer + next prayer + time display | iOS + Android | No JS countdown |
| Medium widget: current prayer + next prayer + next 3 tasks | iOS + Android | Read-only task titles |
| WidgetSnapshotBuilder (TypeScript, pure) | Both | Testable without native runtime |
| WidgetSyncCoordinator (TypeScript, non-React) | Both | Invoked from existing coordinators |
| iOS native widget target via expo-widgets config plugin | iOS | systemSmall + systemMedium |
| Android native AppWidget via react-native-android-widget | Android | |
| Custom Expo Router entry for Android widget task handler | Android | |
| App Group identifier decision | iOS | |
| Deep-link tap: widget to Today screen | Both | |
| SETUP_REQUIRED state (calm, no fake data) | Both | |
| Stale snapshot handling | Both | |
| Theme: light/dark ambient | Both | From platform widget environment |
| ADR-026 documenting supersession of ADR-009 | - | |

### 2.2 Explicitly Out of Scope - M18

| Item | Rationale |
|---|---|
| Large widget family | Deferred - see section 2.3 |
| Interactive task completion from widget | Deferred - see section 11 |
| Countdown timers (JS setInterval) | Never - see section 13 |
| Prayer completion tracking | Not a planner feature |
| Journal content / privacy widget | Privacy boundary - never |
| Hijri date display | Deferred |
| Premium widget gating | M19 owns entitlement scaffolding |
| Background location from widget refresh | Forbidden - see section 10 |
| SQLite migrations | M18 migration count = ZERO |
| Notification scheduling from widget | Widget is read-only |

### 2.3 Large Widget - Deferment Rationale

The Large widget is deferred to M19 or later. Small + Medium cover the stated user need. Large widget complexity deferred for MVP. Large is not cancelled - the schema is designed to support it.

---

## 3. Repository Audit Findings

### 3.1 Source Code State

| Finding | Impact on M18 |
|---|---|
| No widget code exists anywhere in repository | Clean start |
| package.json main = expo-router/entry | Android entry strategy required (section 8) |
| app.json has no ios.bundleIdentifier | Must be added for App Group (section 7) |
| app.json has no expo-widgets plugin | Must be added (section 6) |
| app.json scheme: islamic-planner | Available for deep links (section 15) |
| /ios and /android are gitignored | CNG workflow preserved |
| LocationAwareTodayTemporalInputProvider reads committed location snapshots only | Safe for widget input source (section 10) |
| PlannerRefreshCoordinator.fullRefresh() is non-React, injectable | Primary integration point (section 17) |
| SettingsMutationCoordinator is non-React | Pattern for WidgetSyncCoordinator |
| projectTodayViewModel() is a pure function | Can be reused in snapshot builder |
| getCurrentPrayer() / getNextPrayer() are pure functions | Reused directly |
| 1171 tests, 102 suites - all passing | Regression baseline |
| Zero widget-related keywords in any .ts/.tsx source files | Confirmed clean baseline |

### 3.2 ADR-009 Disposition

ADR-009 was authored before current SDK 57 expo-widgets APIs existed. It specified hand-written SwiftUI, native Android RemoteViews, and manual App Group / SharedPreferences JSON management.

Current SDK 57 reality:
- expo-widgets ~57.0.20 provides config-plugin-based iOS widget targets with TypeScript/swift-ui rendering - no hand-written Swift required
- react-native-android-widget 0.22.1 provides React Native component-based Android widgets - no RemoteViews required
- Data delivery is substantially different from what ADR-009 described

**ADR-009 is SUPERSEDED by ADR-026** (this document). The product-level principle (platform-specific widget UI, derived local data, dev-build required) remains valid and is preserved as historical context.

---

## 4. iOS Library and API

### 4.1 Library Selection

expo-widgets ~57.0.20; @expo/ui ~57.0.19 (bundled peer dep)

Key SDK 57 APIs: createWidget, updateSnapshot, updateTimeline, reload, 'widget' directive, @expo/ui/swift-ui components.

Widget runtime constraints:
- No React hooks inside widget component
- No async work inside widget component (all data arrives via props)
- No access to app-side module state (Zustand, etc.)
- Only @expo/ui/swift-ui components

### 4.2 Dependency Peer Chain

expo-widgets@57.0.20 -> @expo/ui@57.0.19 -> react-native-worklets@0.12.2 (peer, range 0.83-0.87 -> RN 0.86.3 PASS)

@expo/ui requires react-native-worklets. NEW dependency pulled in transitively. worklets peer dep range (0.83-0.87) is satisfied by react-native: 0.86.3. No manual worklets pin needed.

### 4.3 iOS Development Build Requirement

iOS widgets cannot be tested in Expo Go. A development build is required. On Windows (user host OS), iOS builds must be performed via EAS Build. Native iOS verification is a device QA item.

---

## 5. Android Library and API

react-native-android-widget 0.22.1

peerDependencies: expo >= 54.0.0 (satisfied: 57.0.22), react-native: * (satisfied: 0.86.3). PASS.

Key APIs: registerWidgetTaskHandler, requestWidgetUpdate, requestWidgetUpdateById, WidgetPreview component, events: WIDGET_ADDED, WIDGET_UPDATE, WIDGET_RESIZED, WIDGET_CLICK, config plugin, updatePeriodMillis.

Periodic update policy:
- Android enforces minimum 30 minute update period for AppWidget updatePeriodMillis
- Do NOT rely on periodic updates for prayer boundary transitions
- All authoritative updates pushed from app via requestWidgetUpdate after canonical events
- Recommended value: 1800000

---

## 6. App Config Changes

Add to ios object in app.json:
  "bundleIdentifier": "com.mm1903.islamicplannerapp"

Add expo-widgets plugin entry with two widget definitions:
- IslamicPlannerSmall: bundle ./widgets/ios/SmallWidget, families [systemSmall], displayName "Prayer Times"
- IslamicPlannerMedium: bundle ./widgets/ios/MediumWidget, families [systemMedium], displayName "Prayer and Tasks"

Add react-native-android-widget plugin entry with two widget definitions:
- IslamicPlannerSmall: minWidth 110dp, minHeight 40dp, updatePeriodMillis 1800000, resizable both
- IslamicPlannerMedium: minWidth 110dp, minHeight 80dp, updatePeriodMillis 1800000, resizable both

Notes: ios.bundleIdentifier is LOCKED - bundle IDs cannot be changed after App Store submission. Widget bundle paths point to TypeScript widget files.

---

## 7. iOS Bundle Identifier and App Group Decision

### 7.1 Bundle Identifier

Decision: com.mm1903.islamicplannerapp. Consistent with Android package. Uses existing author prefix (mm1903). **This decision is locked.**

### 7.2 App Group

Decision: App Group is NOT required for M18.

expo-widgets SDK 57 API (updateSnapshot, updateTimeline) delivers widget data via the iOS timeline/snapshot push mechanism - not by writing to a shared App Group container.

An App Group identifier will be needed if background app refresh is required or the widget needs to read data when the app is completely terminated.

For M18 foreground push architecture, App Group is deferred. If M18 native testing reveals data delivery requires App Group, this becomes a BLOCKER.

If App Group is later required:
- Identifier: group.com.mm1903.islamicplannerapp.widgets
- Added to app.json expo-widgets plugin config

---

## 8. Android Entrypoint Strategy

This is the highest-risk integration area.

### 8.1 Current State

package.json main = "expo-router/entry"

react-native-android-widget requires registerWidgetTaskHandler to be called before React root registration to intercept headless widget events.

### 8.2 Strategy: Custom Entry File

Create index.ts at root level. This file:
1. Imports registerWidgetTaskHandler from react-native-android-widget
2. Imports widgetTaskHandler from ./widgets/android/widgetTaskHandler
3. Calls registerWidgetTaskHandler('IslamicPlannerWidget', widgetTaskHandler) BEFORE expo-router/entry
4. Imports 'expo-router/entry' at the end

Update package.json: "main": "index.ts"

Invariants:
- Expo Router functionality: expo-router/entry is imported after handler registration
- Widget handler registered exactly once: module-level call executes once per JS runtime initialization
- Jest tests unaffected: Jest environment does not execute the widget handler (mocked)
- Metro bundling unaffected: Metro resolves index.ts as the new entry point; no config change needed
- TypeScript compilation: index.ts is in scope of tsconfig.json

Risk: registerWidgetTaskHandler must run before React Native bridge initialization. The pattern (import at top, then expo-router/entry last) satisfies this because JS module evaluation order is top-to-bottom.

### 8.3 Widget Task Handler

File: widgets/android/widgetTaskHandler.ts (NEW)

Handles all widget lifecycle events in headless (non-React) mode.

Task handler must NOT: trigger GPS permission requests, write to planner SQLite (task mutations), call JournalKeyManager or decrypt Journal, access Zustand stores.

Task handler MAY: read from user_settings SQLite via LocationAwareTodayTemporalInputProvider, call canonical prayer/planning-day computation, build and render a WidgetSnapshot.

Event handling:
- WIDGET_ADDED, WIDGET_UPDATE, WIDGET_RESIZED: build snapshot and render widget
- WIDGET_CLICK: Linking.openURL('islamic-planner://today') - no state mutation

---

## 9. WidgetSnapshot Schema

The WidgetSnapshot is an immutable, platform-neutral, serializable data contract. It is the single boundary between the canonical planner and widget rendering.

Location: src/services/widget/types.ts

Types:
- WidgetPrayer: 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA'
- WidgetPrayerEntry: prayer, name, arabicName, startsAt (ISO UTC), startsAtLocal (formatted local)
- WidgetTaskEntry: occurrenceId, title, scheduleLabel, priority ('NORMAL'|'IMPORTANT'), sortInstant (ISO UTC | null)
- WidgetSnapshot: schemaVersion=1, generatedAt (UTC), planningDayKey, timezone, currentPrayer, nextPrayer, allPrayers (exactly 5), tasks (0-3), isSetupRequired

Schema Invariants:
- allPrayers always has exactly 5 entries (even if isSetupRequired = true)
- tasks max length: 3 items. Small widget ignores tasks array.
- sortInstant null-safe: tasks without sortInstant sort after tasks with one
- schemaVersion: Always 1 in M18. Future schema changes increment this.
- No Journal data: no journalContent, no hasJournalEntry, no encrypted fields
- No coordinates: latitude/longitude are explicitly excluded
- No task descriptions: only title and scheduleLabel
- generatedAt is UTC: always stored as UTC ISO string
- isSetupRequired = true implies tasks = []

---

## 10. Snapshot Source - Location Safety

Widget snapshot generation uses LocationAwareTodayTemporalInputProvider.getInputs().

This provider reads committed location snapshots from user_settings:
- MANUAL mode: reads manualLatitude, manualLongitude, manualTimezone
- AUTO mode: reads lastAutoLatitude, lastAutoLongitude, lastKnownTimezone

It does NOT call locationService.getCurrentCoordinates(). It does NOT call locationService.requestForegroundPermission().

**This guarantees no GPS permission prompt from widget refresh.**

SETUP_REQUIRED Handling: If getInputs() returns SETUP_REQUIRED, return WidgetSnapshot with isSetupRequired: true, tasks: [], planningDayKey: '', timezone: 'UTC', no fake prayer times. Widget renders: "Open Islamic Planner to finish setup." No fake Mecca coordinates.

---

## 11. Interactive Task Completion - DEFERRED

**M18 widgets are READ-ONLY.**

Deferred because:
1. Task completion requires full canonical pipeline: TaskEngine.completeTask() -> SQLite write -> notification cancellation -> widget refresh.
2. iOS interactive widgets require iOS 17+ and isolated widget runtime semantics not yet verified.
3. Android WIDGET_CLICK in headless mode carries correctness risks with notification reconciliation.
4. Testing interactive completion requires physical device testing for both platforms.

Widget tap navigates to the app (Today screen) via deep link. Task completion happens in the app. M19 or later may add interactive completion.

---

## 12. Task Selection for Medium Widget

Eligible set: All PENDING occurrences in the current planningDayKey.
Ordering: Reuses compareScheduledTasks comparator from TodayViewModelProjection.ts (same Today ordering semantics):
- sortInstant ASC (tasks with a sort instant before tasks without)
- IMPORTANT before NORMAL at equal sortInstant
- createdAt ASC as tiebreaker
- occurrenceId ASC as final tiebreaker
ANYTIME_TODAY tasks: Included - they sort after timed tasks (sortInstant is null).
Terminal states excluded: COMPLETED, MISSED, CANCELLED.
Count: First 3 tasks from ordered set.

Widget Task Entry Fields - Included: occurrenceId (debug), title, scheduleLabel, priority, sortInstant (ordering only, not displayed).
Excluded: notes, estimatedMinutes, taskDefinitionId, seriesId, recurrenceRule, scheduleData, completedAt, missedAt, createdAt.

Zero-Task State: Widget renders "No pending tasks". No achievement badge, no streak counter, no "All Done!" celebratory state.

---

## 13. Countdown Semantics Per Platform

iOS: Use SwiftUI native date display via @expo/ui/swift-ui Text with date presentation style (dateStyle="timer"). Pass nextPrayer.startsAt as a Date. The OS clock drives the countdown - no JavaScript timer required, and the display updates continuously without widget refresh.

Android: Do NOT use a JavaScript setInterval countdown. M18 Android display strategy: Display the next prayer local time string generated at snapshot time, e.g. "Asr at 4:32 PM". This is honest, readable, and does not become incorrect. If react-native-android-widget exposes a native Chronometer equivalent, it may be used only after verifying it works correctly in the native build.

---

## 14. iOS Timeline Strategy

The iOS widget timeline is built with one entry per prayer boundary in the current planning day:
- Entry[0]: now - shows currentPrayer, tasks, nextPrayer
- Entry[1]: nextPrayer time - currentPrayer changes; rebuild tasks
- etc.
- Entry[last]: Fajr of next day (planning day rollover boundary)

Each entry is an immutable WidgetSnapshot props object computed at update time.

Bounded horizon: Timeline does not extend beyond the next Fajr. Building a 24+ hour speculative timeline risks showing incorrect task states.

After task mutation: updateTimeline is called with a fresh set of entries replacing the previous timeline entirely.

iOS WidgetKit reload policy: atEnd.

---

## 15. Deep Links

All widget taps navigate to Today screen via: islamic-planner://today

No task-specific routes from widget taps in M18. Task-detail deep links deferred.

islamic-planner scheme is declared in app.json. Expo Router handles deep link resolution. The today route maps to app/(tabs)/index.tsx. If the scheme-based URL does not resolve correctly, implementation falls back to opening the app root.

---

## 16. Widget Snapshot Persistence (Storage Decision)

iOS: No explicit shared storage required for M18. expo-widgets updateSnapshot / updateTimeline delivers props to WidgetKit directly. No App Group JSON file is written. If native testing reveals WidgetKit requires App Group for background data access, this becomes a BLOCKER.

Android: No persistent widget snapshot cache in M18. The task handler rebuilds snapshot on every WIDGET_ADDED, WIDGET_UPDATE, and WIDGET_RESIZED event from SQLite. This is acceptable because LocationAwareTodayTemporalInputProvider is a synchronous SQLite read, prayer computation is pure JS, and task query is bounded. If native build testing reveals this fails in headless mode, add expo-file-system-based JSON cache.

---

## 17. Update Triggers - WidgetSyncCoordinator

WidgetSyncCoordinator is a singleton non-React TypeScript class, mirroring SettingsMutationCoordinator (M17).

API: sync(): Promise<void>, private buildSnapshot(): Promise<WidgetSnapshot>, private pushIOS(snapshot): Promise<void>, private pushAndroid(snapshot): Promise<void>

Singleton export: widgetSyncCoordinator = new WidgetSyncCoordinator()

Trigger Matrix:
- PlannerRefreshCoordinator.fullRefresh() success -> widgetSyncCoordinator.sync() at end of fullRefresh
- Task created/edited/deleted -> handled by fullRefresh above (M10 flow calls fullRefresh)
- Task completed -> handled by fullRefresh above
- Prayer calculation settings changed -> handled by fullRefresh above
- Planning-day boundary changed -> handled by fullRefresh above
- Hijri adjustment changed -> handled by fullRefresh above
- Location committed -> handled by fullRefresh above
- App foreground -> handled by fullRefresh above
- Prayer transition (planning-day rollover) -> handled by fullRefresh above
- Prayer period transition (intra-day) -> additional hook: widgetSyncCoordinator.sync() after queryAndProject
- Widget added/resized (Android) -> widgetTaskHandler rebuilds snapshot directly
- iOS timeline expiry -> iOS updateTimeline re-invoked from next app foreground

Integration Point: PlannerRefreshCoordinator.fullRefresh() gains a best-effort post-refresh hook using try/catch. Same pattern as notificationService.reconcile(). Widget sync failure **never** fails the planner refresh.

---

## 18. Failure Semantics

widgetSyncCoordinator.sync() throws -> Caught, logged as warning. fullRefresh returns READY with no widget update.
updateSnapshot / updateTimeline throws -> Widget shows previous (stale) state. Next trigger repairs it.
Android task handler throws -> Widget shows stale state. Next OS or app-triggered update attempts repair.
buildSnapshot() throws -> Sync aborts. Widget not updated. No planner rollback.
getInputs() returns SETUP_REQUIRED -> isSetupRequired = true snapshot pushed.
Prayer computation throws -> Caught in buildSnapshot. Falls back to isSetupRequired = true snapshot.

---

## 19. Stale Snapshot Handling

Stale: generatedAt is before the previous Fajr time (crossed a planning-day boundary without an update).
Fresh: generatedAt is within the current planning day.

Widget Rendering Behavior:
- Fresh -> Normal content
- Stale (crossed planning-day boundary) -> Show last-known prayer times + "Open app to refresh"
- Very stale (generatedAt > 24 hours ago) -> Same as stale - calm, no alarming language

No aggressive "STALE DATA" banners. The widget should be calm.

---

## 20. Setup-Required State

When isSetupRequired = true, the widget renders:
- Primary text: "Islamic Planner"
- Secondary text: "Open app to finish setup."
- Tap: Opens app (Today screen)
No prayer times displayed. No countdown. No fake coordinates.

---

## 21. Theme Handling

iOS: Widget component reads colorScheme from props/environment and selects appropriate brand palette. No ThemeProvider, no Zustand.
Colors: Light background #FFFFFF/brand cream, Dark background #1A1A2E/deep blue-black, Prayer indicator brand green #2ECC71/muted for inactive. Design tokens duplicated as constants in widget files - no import from main app bundle.

Android: Widget component uses fixed light theme for M18. Dark variant added post-M21.

Design Tokens: Widget files cannot import from @/theme. Required color constants are duplicated as plain literals in widgets/tokens.ts.

---

## 22. Accessibility

M22 handles full accessibility/RTL. M18 implements:
- Readable font sizes (minimum 12sp Android / 11pt iOS)
- Accessible widget name and description strings in config
- Prayer name readable in both English and Arabic (both provided in snapshot)
- No state communicated by color alone
- Widget accessibilityLabel set to meaningful description

---

## 23. Privacy Boundary

| Data | Widget visibility | Rationale |
|---|---|---|
| Prayer names (Fajr, Dhuhr...) | Shown | Core widget purpose |
| Prayer start times | Shown | Core widget purpose |
| Task titles | Shown | Product intent; home screen |
| Task schedule label | Shown | Context for task |
| Journal content | Never | Encrypted private data |
| Task notes / descriptions | Never | Privacy; not needed |
| User coordinates | Never | Not needed; irrelevant |
| Hijri date | Not in M18 | Deferred |
| Encrypted metadata | Never | Never decrypted for widget |

Task title privacy note: Task titles are displayed on the home screen and may be visible on a locked/unattended device. This is the product intended behavior. A future "Private tasks" feature or "Hide widget on lock screen" option may be introduced post-M18 if users request it.

---

## 24. ADR-009 Disposition and ADR-026

### ADR-026: M18 Widget Runtime Architecture (supersedes ADR-009 implementation details)

Status: Accepted - M18

ADR-009 historical principle preserved:
- Platform-specific widget UI: still true (separate iOS + Android implementations)
- Derived local data: still true (snapshot from canonical planner, no second engine)
- Development build required: still true

ADR-009 implementation details superseded:
- Hand-written SwiftUI code -> expo-widgets + @expo/ui/swift-ui TypeScript components
- Native Android RemoteViews -> react-native-android-widget React Native components
- Manual App Group / SharedPreferences JSON -> iOS: updateSnapshot/updateTimeline API push; Android: task-handler rebuild from SQLite
- WidgetData shared memory -> WidgetSnapshot TypeScript interface pushed via library APIs

Decision: Use expo-widgets ~57.0.20 for iOS and react-native-android-widget 0.22.1 for Android with a shared WidgetSnapshotBuilder service.

---

## 25. Premium / Deferment Decision

M18 implements no Premium gating. Small + Medium widgets are available to all users. M19 owns Premium entitlement scaffolding. No isPremium checks in M18 production code.

---

## 26. Files to Create

index.ts (root) - NEW - custom entry for Android widget handler
widgets/tokens.ts - NEW - color/style constants for widget files (no @/theme import)
widgets/ios/SmallWidget.tsx - NEW - iOS small widget component (widget directive)
widgets/ios/MediumWidget.tsx - NEW - iOS medium widget component (widget directive)
widgets/android/SmallWidgetComponent.tsx - NEW - Android small widget RN component
widgets/android/MediumWidgetComponent.tsx - NEW - Android medium widget RN component
widgets/android/widgetTaskHandler.ts - NEW - Android headless widget task handler
src/services/widget/types.ts - NEW - WidgetSnapshot, WidgetTaskEntry, WidgetPrayerEntry
src/services/widget/WidgetSnapshotBuilder.ts - NEW - pure snapshot builder service
src/services/widget/WidgetSnapshotService.ts - NEW - orchestrates inputs to snapshot; wraps builder
src/services/widget/WidgetSyncCoordinator.ts - NEW - non-React sync coordinator (iOS + Android push)
src/services/widget/index.ts - NEW - public widget service exports
src/services/widget/__tests__/WidgetSnapshotBuilder.test.ts - NEW
src/services/widget/__tests__/WidgetSyncCoordinator.test.ts - NEW
src/__mocks__/expo-widgets.ts - NEW - Jest mock for expo-widgets
src/__mocks__/react-native-android-widget.ts - NEW - Jest mock for android widget library

---

## 27. Files to Modify

app.json - ADD ios.bundleIdentifier, expo-widgets plugin, android widget plugin
package.json - CHANGE main to "index.ts"; ADD expo-widgets, react-native-android-widget
src/services/PlannerRefreshCoordinator.ts - ADD widgetSyncCoordinator.sync() call (best-effort, post-return)
src/hooks/useToday.ts - ADD widgetSyncCoordinator.sync() after prayer-transition queryAndProject
docs/DECISIONS.md - ADD ADR-026 superseding ADR-009
docs/ARCHITECTURE_INDEX.md - UPDATE M18 entry with actual sources
docs/CURRENT_MILESTONE.md - ADVANCE to M19 post-closure
docs/IMPLEMENTATION_STATUS.md - UPDATE M18 row post-closure

---

## 28. Files That Must Not Change

src/domain/prayer/PrayerEngine.ts - No widget logic in domain engine
src/domain/prayer/PrayerTimeline.ts - No widget logic
src/domain/planning-day/PlanningDayEngine.ts - No widget logic
src/domain/scheduling/SchedulingEngine.ts - No widget logic
src/domain/recurrence/RecurrenceEngine.ts - No widget logic
src/domain/materialization/MaterializationEngine.ts - No widget logic
src/domain/task/TaskEngine.ts - No widget logic
src/services/journal/ - Journal boundary preserved absolutely
src/data/migrations/ - ZERO new migrations
src/data/schema.ts - No schema changes
Any existing test file - Regression: all 1171 tests must remain green

---

## 29. Migration Count

**M18 migration count = ZERO.**

Widget snapshot data is derived from existing user_settings and task_occurrences tables. No new columns, no new tables, no migration files. If during implementation a schema change appears necessary, it must be raised as a BLOCKER and the architecture amended with explicit justification.

---

## 30. Native Generated-File Policy

The /ios and /android directories remain gitignored. CNG (Continuous Native Generation) workflow is preserved.

Native projects are generated locally via: npx expo prebuild
For Android native testing: npx expo run:android
For iOS (on Windows, must use EAS): eas build --platform ios --profile development

Generated native files are not committed to the repository.

---

## 31. Dependency Installation Plan

Do not run these during architecture freeze. Run at M18 implementation start.

Step 1: npx expo install expo-widgets
Step 2: npx expo install @expo/ui (if not pulled in transitively)
Step 3: npm install react-native-android-widget@0.22.1
Step 4: npx expo install --check
Step 5: npx expo-doctor

Expected final additions to package.json dependencies:
- "expo-widgets": "~57.0.20"
- "react-native-android-widget": "0.22.1"

@expo/ui may be added as a direct dep or remain as transitive peer dep.
react-native-worklets is pulled in transitively by @expo/ui.

---

## 32. Development Build Workflow

### 32.1 Android (Primary - Achievable on Windows)

1. Install M18 dependencies (section 31)
2. npx expo prebuild --platform android
3. npx expo run:android
4. Add widget from Android launcher
5. Verify Small + Medium rendering
6. Test tap/deep-link behavior
7. Trigger planner refresh and verify widget updates

### 32.2 iOS (EAS - Required on Windows)

1. Install M18 dependencies (section 31)
2. Configure eas.json development profile (if not already present)
3. eas build --platform ios --profile development
4. Install IPA on physical iOS device
5. Add widget from iOS widget gallery
6. Verify Small + Medium rendering
7. Test timeline entries (prayer boundary transitions)
8. Verify countdown display using native SwiftUI date timer
9. Test tap/deep-link behavior

If EAS credentials are not configured, iOS native verification is deferred to M23 QA milestone.

---

## 33. Jest / Native Verification Matrix

### 33.1 Automated (Jest) - Must Pass Before Implementation Commit

SNAPSHOT BUILDER: SB-01 through SB-11 (correct prayer structure, no Journal data, no coordinates, no task descriptions, correct planningDayKey, correct timezone, correct generatedAt, correct currentPrayer, correct nextPrayer, Sunrise excluded, correct allPrayers count)
SETUP REQUIRED: SR-01 through SR-04 (isSetupRequired = true, tasks = [], no fake prayer times, no GPS call)
TASK SELECTION: TS-01 through TS-09 (next 3 PENDING tasks, compareScheduledTasks reused, COMPLETED/MISSED/CANCELLED excluded, ANYTIME_TODAY included, fewer than 3 tasks allowed, zero tasks allowed, no task notes)
FRESHNESS: FR-01 through FR-03 (generatedAt within planning day = not stale, generatedAt before Fajr = stale, planningDayKey correct)
IOS WIDGET: IOS-01 through IOS-07 (createWidget export, WidgetSnapshot as props, no hooks, no async, updateSnapshot/updateTimeline with correct name, timeline entries ordered, nextPrayer.startsAt is valid ISO UTC)
ANDROID WIDGET: AND-01 through AND-08 (widgetTaskHandler registered before expo-router/entry, WIDGET_ADDED/UPDATE/RESIZED trigger snapshot, WIDGET_CLICK fires correct URL, no GPS, no task mutation, expo-router/entry imported after handler registration)
SYNC COORDINATOR: SY-01 through SY-05 (sync calls update APIs, sync failure swallowed, fullRefresh invokes sync, fullRefresh does not fail if sync throws, SETUP_REQUIRED pushes isSetupRequired snapshot)
PRIVACY: PV-01 through PV-03 (no Journal data, no JournalKeyManager import, no coordinates)
REGRESSION: All 1171 pre-M18 tests remain green

### 33.2 Android Native Build Verification

Prebuild generates widget target, widget appears in launcher gallery, Small + Medium render correctly, widget updates on app refresh, tap navigates to app, SETUP_REQUIRED state shows setup prompt, resize behavior works, device restart recovery works.

### 33.3 iOS Native Build Verification

Prebuild generates widget extension, widget appears in gallery, Small + Medium render correctly, timeline entry transitions work, prayer timer display works, tap navigates to app, dark mode adapts, SETUP_REQUIRED state shows setup prompt, device restart works.

---

## 34. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| @expo/ui requires react-native-worklets peer - may conflict | HIGH | Verify with npx expo install --check. worklets peer range 0.83-0.87 covers 0.86.3 PASS |
| Android entry custom index.ts breaks Expo Router or Metro | HIGH | Write AND-08 test; verify immediately on first build attempt |
| iOS App Group required but not configured | HIGH | If native testing reveals data not delivered without App Group, amend architecture |
| iOS native build not achievable on Windows without EAS | MEDIUM | Use EAS build |
| Android headless task handler cannot access SQLite | MEDIUM | Verify in native build. If blocked, add JSON cache file (section 16). |
| expo-widgets 57.0.20 bug or regression | MEDIUM | Use exact pinned version. Do not upgrade during M18. |
| Widget task titles visible on locked screen | LOW | Documented privacy decision. No action required. |
| iOS timeline stale after many days without app open | LOW | Stale handling (section 19) covers this; calm fallback displayed. |
| Android updatePeriodMillis minimum 30 min | LOW | App-side requestWidgetUpdate on every fullRefresh covers prayer transitions. |

---

## 35. Unresolved HIGH Items

BLOCKER: None at Architecture Freeze.

HIGH-1: react-native-worklets installation behavior. @expo/ui@57.0.19 requires react-native-worklets as a peer dependency (not currently installed). Resolution: Run npx expo install expo-widgets and verify react-native-worklets appears in package.json and passes npx expo-doctor. Impact if unresolved: expo-widgets cannot be used.

HIGH-2: Android headless SQLite access. The widgetTaskHandler must access SQLite in headless mode. Resolution: Verify in first Android build by adding a diagnostic log in the task handler. Impact if unresolved: Fallback: implement JSON file cache using expo-file-system (documented in section 16).

HIGH-3: iOS App Group requirement. Verify whether expo-widgets updateTimeline reliably delivers data to the widget when the app is not in the foreground. Resolution: Test with the app fully terminated. Impact if unresolved: Amend App Group config before M18 closure.

### 35.1 Android WorkManager Dependency Resolution (ADR-026-H)

- **Conflict:** `react-native-android-widget` (0.22.1) requests `androidx.work:work-runtime:2.8.1`, while `expo-widgets` (57.0.20) transitively pulls `androidx.work:work-runtime-ktx:2.7.1` via `androidx.glance:glance-appwidget:1.2.0-rc01`. In WorkManager 2.8.0+, Google migrated Kotlin extension classes (`OneTimeWorkRequestKt`, `PeriodicWorkRequestKt`) into `work-runtime`. When `work-runtime:2.8.1` and `work-runtime-ktx:2.7.1` coexist, Android `checkDebugDuplicateClasses` fails.
- **Resolution:** Tracked Expo config plugin `plugins/withAndroidWorkManagerResolution.js` registered in `app.json` injects a Gradle `resolutionStrategy` into `allprojects` aligning all `androidx.work` artifacts to version `2.8.1`. In `2.8.1`, `work-runtime-ktx` is an empty stub, eliminating duplicate classes while preserving full API and runtime compatibility.
- **CNG Policy:** `/android` remains generated and untracked. No manual edits to `android/` are committed. Clean prebuild and `assembleDebug` verified with exit code 0.
- **Runtime Verification:** Physical widget launcher appearance remains pending until tested on hardware.

---

## 36. Amendment History

| Date | Amendment | Reason |
|---|---|---|
| 2026-09-18 | Initial freeze | Architecture authored |
| 2026-09-18 | WorkManager Dependency Alignment (ADR-026-H) | Added `plugins/withAndroidWorkManagerResolution.js` to resolve AndroidX WorkManager 2.8.1 duplicate class conflict under CNG |

---

## 37. Pre-Freeze Verification Checklist

- [x] Repository audit complete
- [x] ADR-009 disposition decided: SUPERSEDED by ADR-026
- [x] expo-widgets version verified: ~57.0.20
- [x] react-native-android-widget version verified: 0.22.1
- [x] RN 0.86.3 compatibility confirmed for both libraries
- [x] react-native-worklets peer dep range 0.83-0.87 covers RN 0.86.3
- [x] iOS bundle identifier decided: com.mm1903.islamicplannerapp
- [x] App Group deferred pending native verification
- [x] Android entry strategy designed
- [x] WidgetSnapshot schema defined
- [x] No GPS from widget confirmed via LocationAwareTodayTemporalInputProvider
- [x] No Journal boundary violations confirmed
- [x] Interactive completion explicitly deferred
- [x] Large widget deferred
- [x] Migration count = ZERO confirmed
- [x] /ios, /android remain gitignored
- [x] WidgetSyncCoordinator integration point identified in PlannerRefreshCoordinator
- [x] iOS timeline strategy defined
- [x] Android update strategy defined
- [x] Deep link behavior defined
- [x] Theme handling defined
- [x] Stale behavior defined
- [x] SETUP_REQUIRED behavior defined
- [x] Test matrix frozen (37 Jest checks + 9 Android native + 10 iOS native)
- [x] Files to create / modify / preserve listed
- [x] ADR-026 decision text written (section 24)
- [x] BLOCKER: 0
- [x] HIGH: 3 (resolution paths documented)
