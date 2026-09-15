# Islamic Prayer-Centered Planner — MASTER_PRODUCT_SPEC

**Status:** Source of truth  
**Audience:** Product owner, Claude Opus planning/review agents, Gemini implementation agents, human developers  
**Implementation target:** React Native + Expo + TypeScript  
**Document purpose:** Define exactly what the product is, how it should behave, what should and should not be built, and which decisions are already locked.

---

# 0. NON-NEGOTIABLE PRODUCT RULES

These rules override any later interpretation unless the product owner explicitly changes them.

1. The app is a **prayer-centered adaptive daily planner**, not a generic to-do list with prayer times attached.
2. The five daily prayers are the primary structure of the user's day:
   - Fajr
   - Dhuhr
   - Asr
   - Maghrib
   - Isha
3. The five prayer tabs must always stay in that order.
4. The currently active prayer period opens automatically when the user opens the app.
5. Future prayer periods remain accessible but are visually muted until their time arrives.
6. Exact-time tasks keep their exact clock time and automatically move between prayer sections as prayer times change.
7. Prayer-relative tasks derive their actual time from a prayer anchor and offset.
8. Prayer-window tasks can span multiple prayer periods and appear in every eligible prayer tab until completed.
9. Anytime Today tasks belong to the planning day, not to a sixth prayer tab.
10. Missed tasks do not automatically roll forward into later prayer periods or days.
11. Default planning day starts at Fajr.
12. Premium users may choose any custom planning-day start time.
13. Changing the planning-day boundary must never alter the prayer periods themselves.
14. Automatic location must be optional.
15. Manual location selection must always be available when automatic location is disabled.
16. Prayer calculation method should be recommended automatically based on location, with manual override available.
17. The app is primarily a productivity app with simple prayer alerts, not an adhan replacement.
18. Prayer completion tracking is not part of the default experience.
19. Optional prayer check-off may be a Premium feature, but it must remain optional and non-judgmental.
20. No XP, leagues, hearts, leaderboards, or competitive worship scoring.
21. The app may use Duolingo-like friendliness and clarity, but must not copy Duolingo branding or game mechanics.
22. Core prayer-centered planning functionality must remain free.
23. Worship itself must not feel paywalled.
24. The app must visually belong to the same Islamic ecosystem as the user's other apps.
25. Today is overwhelmingly the main experience.
26. Calendar is month-only. Do not build Day or Week calendar views.
27. There is no separate Inbox.
28. There is no separate generic Tasks tab.
29. There is no Progress tab in the bottom navigation.
30. There is no Library tab in this planner.
31. Business logic must not live inside React UI components.
32. Prayer placement must be derived from task schedule + date + prayer times + location/timezone. Do not store a prayer section as permanent authoritative truth for exact-time tasks.
33. Recurring task definitions and generated task occurrences must be separate concepts.
34. Automatically generated worship items must be clearly labeled as voluntary/recommended where relevant.
35. Religious dates that depend on moon sighting or regional practice must not be presented as guaranteed universal certainties.

---

# 1. PRODUCT VISION

## 1.1 One-sentence product definition

A daily planner that automatically organizes the user's life around the five daily prayers.

## 1.2 Core user problem

Most calendar and to-do applications organize life only by clock time or arbitrary categories such as morning, afternoon, and evening.

For many Muslims, Salah already divides the day into meaningful natural periods. Prayer times also shift throughout the year and when the user travels.

The product should make this useful rather than burdensome.

## 1.3 Signature product behavior

A user creates:

**Soccer — 6:00 PM**

The task remains at 6:00 PM.

If 6:00 PM falls between Asr and Maghrib today, it appears in the **Asr** list.

Months later, if Maghrib begins before 6:00 PM, the same unchanged task automatically appears in the **Maghrib** list.

The user does not manually move it.

This behavior is central to the product.

## 1.4 Product philosophy

The app should answer two questions immediately:

1. **Where am I in my day?**
2. **What do I need to do during this prayer period?**

The intended mental model is:

**Planning day → prayer period → tasks**

not:

**Inbox → project → priority → labels → filters**

---

# 2. TARGET USERS

The product serves both:

1. Muslims who already structure their life around Salah.
2. Muslims who want help learning to organize their life around Salah.

The onboarding and copy should support both groups.

The product should feel useful to:
- students
- workers
- parents
- night-shift workers
- travelers
- highly structured users
- users who only need a simple daily planner

The product must not assume a standard 9-to-5 schedule.

---

# 3. PLATFORM AND TECHNICAL DIRECTION

## 3.1 Primary stack

Use:
- React Native
- Expo
- TypeScript

The project should fit the user's broader React Native / Expo ecosystem.

## 3.2 Architecture principle

Prefer a layered architecture:

```text
UI / Presentation
Domain
Data
Platform / Infrastructure
```

Business logic must be testable without rendering React components.

## 3.3 Domain modules

At minimum, separate:

```text
Prayer Engine
Planning Day Engine
Task Engine
Scheduling Engine
Recurrence Engine
Worship Engine
Notification Engine
Location / Timezone Service
Calendar / Hijri Engine
Premium Entitlement Layer
```

Do not combine all scheduling logic inside TodayScreen.

---

# 4. FINAL BOTTOM NAVIGATION

The permanent bottom navigation is:

```text
Today | Calendar | + | Worship | Settings
```

## 4.1 Today
Primary screen. Prayer-centered daily task view.

## 4.2 Calendar
Month-only Gregorian/Hijri overview.

## 4.3 +
Global Add Task action.

## 4.4 Worship
Worship Suggestions configuration and related voluntary worship automation.

## 4.5 Settings
Prayer, location, planner, notification, appearance, account, Premium, help.

---

# 5. TODAY SCREEN

## 5.1 Prayer tabs

Always display:

```text
Fajr | Dhuhr | Asr | Maghrib | Isha
```

They never reorder, including for Premium users with a custom planning-day start.

## 5.2 Initial tab behavior

When the app opens:
- determine the user's current planning day
- determine today's prayer times
- determine the current prayer period
- open the matching prayer tab

Examples:
- current time between Dhuhr and Asr → Dhuhr selected
- current time between Maghrib and Isha → Maghrib selected
- current time after Isha and before next Fajr → Isha selected for the previous planning day when using Fajr day start

## 5.3 Visual state

- current prayer tab = strongest selected state
- past prayer tabs = subdued
- future prayer tabs = accessible but muted
- current prayer details must be immediately visible
- do not clutter the screen with generic dashboard metrics

## 5.4 Current-prayer header

Show:
- prayer name
- prayer start time
- next prayer
- countdown to next prayer
- optional small prayer illustration or icon

Example:

```text
Dhuhr
1:27 PM
Asr in 3h 37m
```

## 5.5 Prayer transition while app is open

If the user is actively interacting with the app when the next prayer begins:
- do not forcibly switch tabs
- show a lightweight banner

Example:

```text
Asr has begun — View Asr
```

If the user backgrounds and later reopens/foregrounds the app:
- automatically select the current prayer tab

## 5.6 Task order within a prayer tab

Recommended order:
1. important tasks that are overdue or near their scheduled time
2. exact-time tasks sorted chronologically
3. prayer-relative tasks sorted by calculated time
4. prayer-window tasks
5. completed tasks
6. collapsible Anytime Today section

This is a recommended default; implementation may refine exact sorting as long as it remains intuitive and deterministic.

## 5.7 Add-to-prayer action

Each prayer tab includes:

```text
+ Add to Dhuhr
```

When used:
- create task flow opens
- Prayer Window is preselected
- start = Dhuhr
- end = next prayer, e.g. Asr
- user may change scheduling mode

## 5.8 Swipe behavior

Optional but recommended:
- swipe horizontally to previous/next prayer tab
- must not interfere with horizontal carousels if any exist

---

# 6. COMPLETION STATES

## 6.1 All tasks completed

Show:

```text
All done until Asr
```

The next prayer name must be dynamically generated.

A small friendly illustration or completion animation may be shown.

No XP.

## 6.2 No tasks scheduled

Show a different state:

```text
Nothing scheduled until Asr.
```

Do not treat an empty list as a completion achievement.

## 6.3 Completed task presentation

Default:
- remain visible in the original prayer section
- checked
- visually muted
- may use strikethrough if readable
- move below incomplete tasks

If many are completed:
- allow collapsing into `Completed (N)`

A user setting may later control auto-collapse.

---

# 7. TASK SCHEDULING MODES

There are four primary scheduling modes.

```text
Exact Time
Relative to Prayer
Prayer Window
Anytime Today
```

These are foundational and must not be renamed casually after implementation begins.

---

# 8. EXACT TIME TASKS

## 8.1 Definition

A task scheduled at a fixed local wall-clock time.

Example:

```text
Soccer
6:00 PM
Every Tuesday
```

## 8.2 Authoritative schedule data

Store the fixed local time as the source of truth.

Conceptually:

```ts
{
  scheduleType: "EXACT_TIME",
  localTime: "18:00"
}
```

Do not store `ASR` or `MAGHRIB` as the permanent authoritative placement.

## 8.3 Placement

For each occurrence:
1. resolve local date
2. resolve applicable location/timezone
3. calculate prayer times
4. compare task time against prayer period boundaries
5. derive prayer section

## 8.4 Seasonal changes

Prayer placement may automatically change as prayer times change seasonally.

Task clock time does not change.

## 8.5 Travel changes

If automatic location is enabled:
- prayer times change with location
- task clock time stays at its configured local wall-clock time
- prayer grouping recalculates

## 8.6 Daylight Saving Time

Exact-time recurring tasks use local wall-clock semantics.

A task configured as 6:00 PM remains 6:00 PM after DST changes.

---

# 9. PRAYER-RELATIVE TASKS

## 9.1 Definition

A task whose time is calculated relative to a prayer.

Example:

```text
Shower
Maghrib +30 minutes
```

## 9.2 Data

Conceptually:

```ts
{
  scheduleType: "PRAYER_RELATIVE",
  anchorPrayer: "MAGHRIB",
  direction: "AFTER",
  offsetMinutes: 30
}
```

Allow:
- BEFORE
- AFTER
- 0 minutes
- preset offsets
- custom offset

## 9.3 Calculated occurrence

If Maghrib = 7:37 PM:
- Maghrib +30 = 8:07 PM

The actual calculated time determines where the task appears.

## 9.4 Cross-prayer placement

If:
- Maghrib = 5:40 PM
- Isha = 6:52 PM
- task = Maghrib +90 minutes

then:
- calculated time = 7:10 PM
- task appears under Isha

Do not force it to remain visually under Maghrib just because Maghrib was the anchor.

## 9.5 Recurrence

Prayer-relative tasks may recur:
- daily
- weekdays
- selected weekdays
- weekly
- custom
- Gregorian-based
- Hijri-based where meaningful

Recalculate each occurrence independently.

---

# 10. PRAYER WINDOW TASKS

## 10.1 Definition

A task that may be completed during a user-defined prayer-bounded window.

Example:

```text
Read Qur'an
Fajr → Asr
```

## 10.2 Semantics

The task is eligible during prayer sections from the start boundary up until the end boundary.

For:
- start = Fajr
- end = Asr

it appears during:
- Fajr
- Dhuhr

At Asr start, if incomplete:
- it becomes missed

## 10.3 Multi-tab visibility

The same occurrence appears in every eligible prayer tab while incomplete.

Important:
- there is one underlying occurrence
- do not create duplicates per prayer tab

Completing it from any tab completes the occurrence everywhere.

## 10.4 Data

Conceptually:

```ts
{
  scheduleType: "PRAYER_WINDOW",
  startPrayer: "FAJR",
  endPrayer: "ASR"
}
```

## 10.5 Wider windows

The user may define wider windows, not only adjacent prayers.

Examples:
- Fajr → Asr
- Dhuhr → Isha
- Asr → next Fajr if product logic later explicitly supports overnight windows

For v1, keep overnight prayer-window semantics conservative and well-tested.

---

# 11. ANYTIME TODAY

## 11.1 Definition

A task with no required prayer period or clock time.

Example:

```text
Buy toothpaste
```

## 11.2 UI

Do not create a sixth tab.

Display in a collapsible section at the bottom of each prayer tab:

```text
Anytime Today
2 tasks
```

## 11.3 Persistence through prayer periods

If incomplete:
- remains available throughout the planning day

## 11.4 Planning-day end

At planning-day end:
- if incomplete, mark missed
- do not automatically roll forward

The user may manually reschedule.

---

# 12. MISSED AND OVERDUE TASKS

## 12.1 Exact-time overdue

If the scheduled time has passed but the prayer period is still active:
- remain in the current prayer period
- show subtle overdue text

Example:

```text
30 min overdue
```

Do not use punitive visuals.

## 12.2 Missed prayer-period task

When the task's valid window ends:
- mark missed
- keep associated with the original prayer/day
- do not auto-move

## 12.3 Manual reschedule

User may:
- change time
- change prayer window
- move to another date
- duplicate if desired

---

# 13. DRAG AND DROP

Dragging between prayer tabs is allowed, but scheduling must not change silently.

Example:
- Gym = 5:30 PM
- currently Asr
- user drags to Maghrib

Show:

```text
Move Gym to Maghrib?

Its current time falls during Asr.

Choose new time
Change to Maghrib prayer window
Cancel
```

For prayer-relative tasks, offer an equivalent anchor change.

Example:
- Asr +30m
- user drags to Maghrib
- offer `Change to Maghrib +30m`

Never silently mutate task semantics.

---

# 14. PRIORITY

For v1:

```text
Normal
Important
```

Important may use:
- subtle `!`
- small badge
- slight ordering preference

Do not introduce Low / Medium / High / Critical unless later usage justifies it.

---

# 15. TASK DURATION

Optional.

Examples:
- Gym = 60 min
- Study = 90 min

Duration is not required for scheduling in v1, but should be stored for future:
- conflict detection
- smarter schedule suggestions
- timeline integrations

Keep duration behind More Options.

---

# 16. TASK CREATION FLOW

## 16.1 Main fields

Initial Add Task UI should be simple:

```text
Task name

When?
- Exact Time
- Relative to Prayer
- Prayer Window
- Anytime Today

Repeat
More Options

Save Task
```

## 16.2 More Options

Include:
- Reminder
- Priority
- Duration
- Notes
- Subtasks
- Attachment
- Tags

Do not expose every advanced field at first glance.

## 16.3 Review step

A review/summary step is allowed if it does not make simple task creation unnecessarily slow.

## 16.4 Confirmation

After save:
- show success state
- allow:
  - View Today
  - Go to Task
  - Add Another
  - Done

Keep confirmation short and optional to dismiss.

---

# 17. SUBTASKS

Subtasks belong to a parent task occurrence/definition according to implementation design.

Minimum behavior:
- add
- rename
- reorder
- complete
- delete

Parent task should not necessarily auto-complete unless all subtasks are complete, unless that behavior is explicitly chosen later.

Default recommendation:
- completion of parent remains manual

---

# 18. NOTES, ATTACHMENTS, TAGS

## 18.1 Notes
Plain text is sufficient for v1.

## 18.2 Attachments
Support architecture should allow attachments, but MVP may defer large file support if it complicates sync.

## 18.3 Tags
Lightweight organization only.
Do not create a full project-management taxonomy.

Examples:
- Work
- Home
- School

Tags should not become primary navigation.

---

# 19. RECURRENCE ENGINE

## 19.1 Supported recurrence categories

At minimum:
- does not repeat
- daily
- weekdays
- weekends
- selected weekdays
- weekly
- monthly
- custom Gregorian recurrence
- Hijri recurrence
- Islamic-season recurrence where appropriate

## 19.2 Examples

```text
Gym
Asr +45 min
Mon/Wed/Fri
```

```text
Call parents
Friday
Anytime Today
```

```text
Charity
1st day of each Hijri month
```

## 19.3 Recurrence architecture

A recurring task must be represented as a definition + generated/materialized occurrences or computed occurrences.

Do not duplicate full task definitions unnecessarily.

## 19.4 Editing recurring tasks

Plan for:
- this occurrence
- this and future occurrences
- entire series

This may be phased into later MVP milestones, but the data model must not prevent it.

---

# 20. PLANNING DAY

## 20.1 Default

```text
Day begins at Fajr — Recommended
```

## 20.2 Before-Fajr rule

If planning day begins at Fajr:
- 2:00 AM before Fajr belongs to the previous planning day
- Isha remains the active prayer period until next Fajr

## 20.3 Premium custom start

Premium users may choose:
- Midnight
- any custom clock time

Example:
- 7:00 PM

## 20.4 Critical rule

Custom planning-day start changes:
- day grouping
- Today/Yesterday
- occurrence reset
- daily summaries
- recurrence boundary behavior where appropriate

It does not:
- rename prayers
- reorder prayer tabs
- alter prayer times

---

# 21. PRAYER PERIOD MODEL

For typical dates:

```text
Fajr period: Fajr → Dhuhr
Dhuhr period: Dhuhr → Asr
Asr period: Asr → Maghrib
Maghrib period: Maghrib → Isha
Isha period: Isha → next Fajr
```

This model must be timezone-aware.

Use actual calculated prayer timestamps, not static times.

---

# 22. PRAYER TIME ENGINE

## 22.1 Requirements

Must support:
- location
- timezone
- calculation method
- Asr method
- high-latitude handling
- manual per-prayer minute offsets
- date-specific prayer times

## 22.2 Automatic recommendation

Based on location, recommend an appropriate calculation method.

Do not require users to understand calculation-method details during onboarding.

## 22.3 Manual override

Advanced Settings should expose:
- calculation method
- Asr method
- high-latitude rule
- manual minute adjustment per prayer

## 22.4 Location vs timezone

Do not infer timezone only from device settings when a manual location is selected.

Prayer times should use the selected location's timezone semantics.

## 22.5 Offline behavior

Cache sufficient prayer data or be able to compute locally so the core planner does not become unusable without internet.

Exact approach may depend on prayer library chosen.

---

# 23. LOCATION SYSTEM

## 23.1 Modes

```text
Automatic Location
Manual Location
```

## 23.2 Automatic

If enabled:
- obtain location with user permission
- update prayer times when materially necessary
- avoid excessive GPS/background battery use
- when location/timezone changes enough to affect prayer schedule, recompute affected occurrences

## 23.3 Manual

If automatic is off:
- display manual location selector
- user chooses location/city
- fetch/compute prayer times for that location
- continue using it until changed

## 23.4 Privacy

Do not require location permission to use the app.

---

# 24. TRAVEL BEHAVIOR

When automatic location is enabled and the user travels:
1. detect new location/timezone according to implementation policy
2. calculate local prayer times
3. recompute task placements
4. exact-time tasks retain configured local wall-clock semantics unless product design later explicitly defines home-time behavior
5. prayer-relative tasks recalculate from local prayer times
6. prayer-window tasks recalculate their windows
7. notify user only if needed; do not create noisy travel alerts

---

# 25. CALENDAR

## 25.1 Scope

Calendar is **Month only**.

Do not build:
- Day view
- Week view

## 25.2 Month cell information

Display:
- Gregorian date
- Hijri date, compactly where readable
- task indicator
- fasting indicator
- Islamic-event indicator
- selected date state

Avoid overpacking cells.

## 25.3 Upcoming section

Below month grid:

```text
Upcoming This Month
```

Possible entries:
- voluntary fast
- Friday reminder
- White Days
- Islamic events
- user tasks/events

## 25.4 Date selection

Tapping a date opens that date using the same prayer-tab structure as Today.

Do not create a different day-planner layout.

---

# 26. WORSHIP SUGGESTIONS

## 26.1 Purpose

Automatically generate voluntary/recommended worship opportunities according to enabled settings.

## 26.2 Master toggle

```text
Enable Worship Suggestions
```

If off:
- do not generate worship suggestions
- preserve user's individual selections for future re-enable unless UX later decides otherwise

## 26.3 Categories

### Voluntary Prayers
Examples:
- Rawatib
- Duha
- Witr
- Qiyam

### Fasting
Examples:
- Monday and Thursday
- White Days
- six days of Shawwal
- Arafah
- Ashura

### Daily Worship
Examples:
- Morning adhkar
- Evening adhkar
- Qur'an
- Salawat

### Special Days & Seasons
Examples:
- Friday
- Ramadan
- first ten days of Dhul-Hijjah
- Laylat al-Qadr opportunity period
- other relevant Islamic dates

## 26.4 Individual toggles

Each worship item must have its own enable/disable control.

## 26.5 Generation model

Generated worship items should use the same task occurrence infrastructure when appropriate.

Set source metadata:

```text
source = WORSHIP
```

## 26.6 Visual distinction

Users should be able to distinguish:
- personal task
- routine-generated task
- worship-generated task

Use subtle icons/badges, not huge colored sections.

## 26.7 Religious clarity

Clearly distinguish:
- obligatory
- Sunnah/recommended
- voluntary

Do not imply every generated item is obligatory.

---

# 27. WORSHIP DATE SAFEGUARDS

## 27.1 Moon-sighting variation

Hijri dates may vary by region or methodology.

Allow Hijri adjustment where necessary.

## 27.2 Ramadan and Eid

Do not assume a single universal date without acknowledging calculation/local settings.

## 27.3 Laylat al-Qadr

Do not state a guaranteed exact date.

Represent relevant nights/opportunities.

## 27.4 Six days of Shawwal

Do not force six predetermined days.

Allow the user to:
- choose days
- receive suggestions/opportunities
- optionally track which six were selected/completed if later added

## 27.5 White Days

Generate based on selected Hijri date system and clearly treat them as recommended fasting.

---

# 28. PRAYER COMPLETION

## 28.1 Default

No prayer tracking.

Prayer times divide the day.

## 28.2 Premium optional feature

May allow:

```text
□ Prayer completed
```

Must be:
- opt-in
- easy to disable
- no XP
- no streak pressure
- no public score
- no ranking
- no moral judgment

Do not let prayer tracking dominate Today.

---

# 29. NOTIFICATIONS

## 29.1 Product role

Notifications support productivity and prayer awareness.

The app is not primarily an adhan app.

## 29.2 Notification categories

- prayer begun
- task reminder
- prayer-relative task reminder
- worship suggestion
- Islamic date/event
- optional daily summary

## 29.3 Task reminders

Opt-in by default.

Quick choices:
- none
- at time
- 5 min before
- 10 min before
- 15 min before
- 30 min before
- custom

## 29.4 Prayer transition notification

Optional simple alert:

```text
Asr has begun
```

## 29.5 Context-aware reminder examples

Potential copy:

```text
Maghrib in 28 minutes
Soccer begins at 6:00 PM
```

or

```text
You have 3 tasks before Maghrib
```

Advanced reminder logic may be Premium.

## 29.6 Background scheduling

Notification scheduling must be resilient to:
- prayer time changes
- timezone changes
- location changes
- recurrence edits
- device reboot/app restart
- DST transitions

---

# 30. ROUTINES

Routines are allowed but should not dominate v1.

## 30.1 Definition

A named collection of recurring task definitions.

Examples:
- Workday
- Friday
- Weekend
- Gym Day
- Study Day
- Ramadan

## 30.2 Distinction

```text
Routine = user-created task collection
Worship Suggestion = app-generated Islamic recommendation
```

Do not merge them conceptually.

## 30.3 MVP status

Architecture should allow routines.

Full routine/template experience may be v1.1 or later if scope becomes too large.

---

# 31. WIDGETS

## 31.1 Small

Show:
- current prayer
- next prayer
- countdown

## 31.2 Medium

Show:
- current prayer
- next prayer
- next 3 tasks

## 31.3 Large

Show:
- all five prayer times
- current prayer
- current prayer-period tasks

## 31.4 Completion

Where platform APIs permit:
- allow task completion from widget

## 31.5 Monetization

Recommended:
- basic small widget = free
- advanced layouts/customization = Premium

Exact entitlement may be finalized later.

---

# 32. SETTINGS INFORMATION ARCHITECTURE

Main sections:

```text
Prayer & Location
Planner
Notifications
Appearance
Calendar
Worship Suggestions
Account & Sync
Premium
About & Help
```

---

# 33. PRAYER & LOCATION SETTINGS

Include:
- Automatic Location toggle
- manual location selector when automatic is off
- recommended calculation method
- calculation-method override
- Asr method
- high-latitude rule
- manual prayer adjustments
- prayer-time preview

Advanced options should be hidden behind progressive disclosure.

---

# 34. PLANNER SETTINGS

Include:
- planning-day start
- completed-task display behavior
- overdue display behavior
- default task reminder
- task sorting preferences if needed
- routine settings if implemented

Premium:
- custom planning-day start

Default free:
- Fajr start

---

# 35. APPEARANCE

Support:
- Light
- Dark
- System

Design architecture must use theme tokens.

Potential Premium:
- extra themes
- backgrounds
- accent customization

Core light/dark functionality should not be blocked behind Premium.

---

# 36. DESIGN SYSTEM

This section replaces the need to rely on generated mockup images.

## 36.1 Overall style

The app should feel:
- calm
- friendly
- modern
- soft
- Islamic without excessive ornamentation
- uncluttered
- approachable
- premium but not luxury-heavy
- productivity-focused without looking corporate

## 36.2 Visual language

Use:
- deep Islamic green as primary brand accent
- pale mint secondary surfaces
- white/light neutral background
- generous whitespace
- large rounded cards
- soft shadows
- rounded pill controls
- simple friendly icons
- restrained Islamic illustrations
- handwritten/display typography for personality
- clean sans-serif for task content and dense information

## 36.3 Typography rule

Decorative/handwritten font:
- screen titles
- selected prayer names
- friendly empty states
- short emphasis

Clean sans-serif:
- task names
- times
- recurrence
- notes
- settings
- longer text
- accessibility-sensitive content

Do not use decorative typography for dense task information.

## 36.4 Prayer identity

Optional subtle environmental identities:
- Fajr = dawn feeling
- Dhuhr = daylight
- Asr = afternoon
- Maghrib = sunset
- Isha = night

Do not radically recolor the whole app for every prayer.

## 36.5 Task card

Typical card:
- checkbox
- task title
- time/schedule label
- optional priority indicator
- optional source icon
- no unnecessary arrow if tapping the whole row opens details

## 36.6 Bottom navigation

Rounded/floating visual language is allowed if consistent with ecosystem.

## 36.7 Dark mode

Use:
- charcoal / deep green-black, not harsh pure black everywhere
- elevated dark surfaces
- preserved green accent
- high contrast text
- toned illustrations

Dark mode can be implemented after core light mode if needed, but architecture must support it from the start.

---

# 37. PREMIUM PHILOSOPHY

Core planner usefulness remains free.

Premium should improve:
- customization
- convenience
- advanced controls

Do not make the user pay to access the core concept.

## 37.1 Free core

Recommended free:
- five prayer tabs
- exact-time tasks
- prayer-relative tasks
- prayer-window tasks
- Anytime Today
- recurrence
- automatic prayer grouping
- manual/automatic location
- basic prayer alerts
- basic task reminders
- basic Worship Suggestions
- month calendar
- Gregorian/Hijri display
- light/dark/system
- notes/subtasks where feasible
- basic widget

## 37.2 Premium candidates

- custom planning-day start
- optional prayer completion check-off
- advanced reminder sequences
- extra reminder/ringtone packs
- advanced themes/backgrounds
- advanced widgets
- extra home-screen customization
- deeper statistics
- advanced routines
- advanced recurrence conveniences
- cloud sync enhancements
- multi-device convenience features

## 37.3 Paywall principle

Do not use religious guilt or fear in Premium copy.

Avoid:
- "Become a better Muslim by upgrading"
- "Don't miss rewards—pay now"
- manipulative spiritual framing

Premium messaging should focus on productivity/customization.

---

# 38. ACCOUNT AND SYNC

Architecture should anticipate shared ecosystem accounts.

Potential shared services:
- auth
- user profile
- Premium entitlement
- preferences
- cloud backup/sync
- location preferences
- calculation settings
- theme settings

## 38.1 Offline-first principle

The planner should remain useful offline.

Cloud sync should enhance the app, not be required for basic task management.

## 38.2 Conflict handling

If multi-device sync is implemented:
- use deterministic conflict resolution
- preserve user data
- never silently discard conflicting task edits
- design occurrence IDs and series IDs carefully

---

# 39. DATA MODEL

Final schema should be designed by the planning model, but it must satisfy these domain requirements.

## 39.1 TaskDefinition

Conceptual fields:

```ts
TaskDefinition {
  id
  title
  description?
  source // USER | ROUTINE | WORSHIP
  scheduleType
  scheduleData
  recurrenceRule?
  reminderRule?
  durationMinutes?
  priority // NORMAL | IMPORTANT
  notes?
  tags?
  attachmentRefs?
  createdAt
  updatedAt
  archivedAt?
  seriesVersion?
}
```

## 39.2 TaskOccurrence

Conceptual:

```ts
TaskOccurrence {
  id
  taskDefinitionId
  localDate
  planningDayKey
  timezone
  calculatedStartTime?
  calculatedWindowStart?
  calculatedWindowEnd?
  calculatedPrayerSection?
  status
  completedAt?
  missedAt?
  overrideData?
  sourceSnapshot?
}
```

## 39.3 Status

Potential enum:

```text
PENDING
COMPLETED
MISSED
CANCELLED
```

"OVERDUE" is preferably derived from current time + schedule, not necessarily stored permanently.

## 39.4 Schedule types

```text
EXACT_TIME
PRAYER_RELATIVE
PRAYER_WINDOW
ANYTIME_TODAY
```

## 39.5 Prayer enum

```text
FAJR
DHUHR
ASR
MAGHRIB
ISHA
```

## 39.6 Source enum

```text
USER
ROUTINE
WORSHIP
```

---

# 40. SCHEDULING PIPELINE

For a given occurrence:

```text
Resolve planning date
→ resolve effective location
→ resolve timezone
→ calculate prayer times
→ calculate task schedule for occurrence
→ derive actual time/window
→ derive prayer section(s)
→ derive current status
→ expose render model
```

Recompute when relevant inputs change.

---

# 41. RECALCULATION TRIGGERS

Potential triggers:
- app foreground
- date change
- next prayer boundary
- location change
- timezone change
- DST transition
- prayer calculation method change
- manual prayer adjustment
- Hijri adjustment
- task edit
- recurrence edit
- worship toggle change
- planning-day start change
- system clock change where detectable

Do not recalculate blindly every frame.

---

# 42. IMPORTANT DERIVED VS STORED DATA RULE

Avoid storing values that should be derived unless caching is explicitly safe.

For Exact Time:
- authoritative = local clock time + recurrence
- derived = prayer section

For Prayer Relative:
- authoritative = anchor prayer + direction + offset
- derived = actual clock time and prayer section

For Prayer Window:
- authoritative = startPrayer + endPrayer
- derived = concrete timestamps and visible prayer tabs

This is essential to the product.

---

# 43. HIJRI RECURRENCE

Support architecture for:
- every Hijri month on date X
- 13/14/15
- Ramadan days
- Shawwal
- Dhul-Hijjah
- Muharram/Ashura

Must be sensitive to selected Hijri calendar method/adjustment.

Do not hardcode religious date logic only into UI.

Use a calendar service/domain layer.

---

# 44. TIMEZONE AND DST EDGE CASES

The implementation must explicitly test:

1. DST spring forward
2. DST fall back
3. timezone crossing during travel
4. manual location in another timezone
5. device timezone different from manual prayer location
6. prayer-relative task moving across a prayer boundary
7. exact-time task near midnight
8. custom planning-day start near midnight
9. before-Fajr task grouping
10. travel between locations with materially different prayer times
11. time changes while app is backgrounded
12. missed notifications after OS restrictions

The planning model must decide precise semantics for ambiguous duplicated/nonexistent local times.

---

# 45. HIGH-LATITUDE EDGE CASES

The prayer library/engine must account for high-latitude regions.

Requirements:
- support selected high-latitude rule
- avoid crashing when conventional twilight-based times are problematic
- clearly surface settings if automatic recommendation is insufficient

This is a major correctness area.

---

# 46. ERROR AND EMPTY STATES

Design and implement at least:

- no tasks this prayer period
- all done until next prayer
- no tasks Anytime Today
- no worship suggestions enabled
- location permission denied
- automatic location unavailable
- manual location missing
- prayer calculation failed
- calendar data unavailable
- offline
- sync failed
- notification permission denied

Tone:
- clear
- calm
- helpful
- never alarming unless data loss is at risk

---

# 47. ACCESSIBILITY

Must support:
- dynamic text where feasible
- screen reader labels
- high enough color contrast
- large tap targets
- non-color-only status indication
- reduced motion preference
- RTL architecture readiness
- Arabic text rendering readiness

Do not depend solely on icons.

---

# 48. RTL AND ARABIC READINESS

Even if v1 launches in English:
- avoid hardcoded left/right assumptions
- use start/end where possible
- ensure tab system can adapt
- test Arabic strings
- prayer names may later localize
- Hijri calendar should be locale-ready

---

# 49. ONBOARDING

Keep onboarding short.

Recommended 4-step flow.

## Screen 1: Your day, centered around Salah
Explain that the five prayers organize the day.

## Screen 2: Your schedule adapts automatically
Show conceptually:

```text
Soccer — 6:00 PM

Summer → Asr
Winter → Maghrib
```

The task time stays unchanged.

## Screen 3: Set your prayer times
Offer:
- Use my location — Recommended
- Choose location manually

Automatically recommend calculation method.

## Screen 4: Make it yours
Optional:
- prayer alerts
- Worship Suggestions
- theme

Then enter Today.

Do not create a long educational tutorial.

---

# 50. COPY PRINCIPLES

Use:
- concise language
- calm language
- respectful Islamic terminology
- clear distinction between obligation and voluntary worship

Avoid:
- guilt
- spiritual manipulation
- excessive exclamation
- childish game language
- overcomplicated fiqh explanations in the planner UI

---

# 51. ANALYTICS

If analytics are used:
- minimize collected data
- do not log private task content unnecessarily
- do not log sensitive religious completion data without strong justification
- use events such as feature usage, screen flow, crashes, performance

Potential events:
- task_created
- schedule_type_selected
- worship_suggestion_enabled
- reminder_enabled
- widget_added
- premium_viewed
- premium_purchased

Do not send task titles by default.

---

# 52. SECURITY AND PRIVACY

Tasks may contain private information.

Requirements:
- secure local storage where appropriate
- minimize permissions
- transparent location use
- no mandatory GPS
- avoid unnecessary server transmission
- encryption-in-transit for sync
- proper auth token storage
- secure attachment handling if implemented

---

# 53. PERFORMANCE

Today must load quickly.

Do not block initial render on unnecessary network requests.

Prefer:
- cached prayer times
- local task DB
- background refresh
- precomputed near-term occurrences where helpful

Avoid generating thousands of recurrence instances at app launch.

---

# 54. TEST STRATEGY

The core scheduler requires extensive automated tests.

## 54.1 Unit tests

Must cover:
- exact-time placement
- prayer-relative calculations
- cross-prayer relative placement
- prayer-window eligibility
- multi-tab single-occurrence behavior
- Anytime Today
- planning-day boundaries
- before-Fajr handling
- missed status
- overdue derived status
- recurrence
- Hijri recurrence
- manual location
- travel/location change
- DST
- timezone change
- manual prayer adjustments

## 54.2 Integration tests

Cover:
- creating each task type
- editing schedule
- rescheduling via drag
- notification rescheduling
- location toggle
- worship generation
- calendar date selection

## 54.3 UI tests

Critical flows:
- onboarding
- Today auto-selects current prayer
- add exact task
- add prayer-relative task
- add prayer-window task
- add Anytime task
- complete task
- missed task behavior
- calendar navigation
- Worship toggles
- Settings changes

---

# 55. MAJOR SCREEN INVENTORY

The app should eventually contain:

## Core
- Onboarding
- Today
- Prayer tab states
- Add Task
- Exact Time picker
- Relative to Prayer picker
- Prayer Window picker
- Anytime Today configuration
- Repeat configuration
- More Options
- Task detail/edit
- Calendar Month
- Calendar selected-date prayer view
- Worship Suggestions
- Worship category detail
- Settings
- Prayer & Location
- Planner Settings
- Notifications
- Appearance
- Calendar Settings
- Account & Sync
- Premium
- About & Help

## Supporting
- Location selector
- Calculation method selector
- manual prayer adjustment
- reminder picker
- recurrence picker
- Hijri recurrence picker
- tag picker
- attachment picker
- confirmation dialogs
- permission screens
- error/empty states

## Platform surfaces
- small widget
- medium widget
- large widget
- notification actions

---

# 56. MVP SCOPE

Prioritize a working prayer-centered planner over breadth.

## MVP must include

1. project foundation
2. design system
3. prayer-time engine
4. planning-day engine
5. local task storage
6. exact-time tasks
7. prayer-relative tasks
8. prayer-window tasks
9. Anytime Today
10. recurring tasks
11. Today screen
12. current prayer auto-selection
13. completed/missed logic
14. manual and automatic location
15. basic prayer alerts
16. task reminders
17. month calendar
18. basic Hijri display
19. basic Worship Suggestions
20. Settings
21. light mode
22. basic dark-mode architecture
23. at least one useful widget
24. onboarding
25. automated scheduler tests

## May defer to post-MVP

- advanced routines
- rich statistics
- advanced Premium themes
- attachment sync
- complex household/family features
- sophisticated cross-device conflict UI
- advanced interactive widgets
- broad ecosystem cross-app automation

---

# 57. RECOMMENDED IMPLEMENTATION MILESTONES

```text
M0  Repository and project foundation
M1  Design system and theme tokens
M2  Prayer-time engine
M3  Planning-day engine
M4  Task domain model
M5  Scheduling engine
M6  Local persistence
M7  Today screen
M8  Add Task flows
M9  Recurrence engine
M10 Missed/completed/overdue behavior
M11 Location and travel
M12 Notifications
M13 Calendar month
M14 Hijri calendar integration
M15 Worship Suggestions engine
M16 Worship UI
M17 Settings
M18 Widgets
M19 Premium entitlement scaffolding
M20 Onboarding
M21 Dark mode polish
M22 Accessibility/RTL
M23 QA + edge cases
M24 Release preparation
```

Do not implement later milestones before foundational engines are proven.

---

# 58. DEFINITION OF DONE FOR CORE SCHEDULER

The scheduler is not complete until automated tests prove:

1. a 6 PM exact-time task changes prayer section when prayer times change
2. the task itself remains at 6 PM
3. a Maghrib+30 task recalculates correctly every day
4. a prayer-relative task may land in the next prayer section
5. a Fajr→Asr window appears in all eligible tabs but is a single occurrence
6. completion in one tab completes it everywhere
7. missed tasks remain in original period
8. 2 AM belongs to previous day when day begins at Fajr
9. custom day start changes planning-day grouping without reordering prayer tabs
10. location changes cause prayer grouping recalculation
11. manual location works with location permission disabled
12. DST preserves exact-time wall clock behavior
13. recurrence does not create duplicate occurrences
14. Hijri recurrence respects selected Hijri-date handling
15. app restart does not corrupt placement/status

---

# 59. DO NOT BUILD / DO NOT CHANGE WITHOUT APPROVAL

Antigravity agents must not:

- add XP
- add leagues
- add hearts/lives
- add a generic Inbox
- add Day calendar
- add Week calendar
- add a sixth Anytime prayer tab
- reorder Fajr/Dhuhr/Asr/Maghrib/Isha
- automatically roll missed tasks forward
- automatically change exact task times
- require GPS
- make prayer completion default
- add prayer streak pressure
- paywall core prayer-centered scheduling
- merge Worship Suggestions with personal tasks without source metadata
- duplicate prayer-window occurrences for each visible tab
- permanently store derived prayer placement as authoritative truth
- introduce a new bottom navigation structure
- add a Library tab
- add a Progress tab
- add a generic Tasks tab
- heavily redesign the product into a generic productivity manager
- put core scheduling logic directly into React components
- install major dependencies without documenting why they are needed
- silently change product semantics to simplify implementation

If implementation reveals a genuine conflict, stop and escalate it as a product/architecture question.

---

# 60. AGENT BEHAVIOR RULES

When an AI coding agent works on this project:

1. Read this file first.
2. Read the architecture and implementation-plan docs if they exist.
3. Do not infer new product behavior if this document already answers the question.
4. Implement only the requested milestone.
5. Do not refactor unrelated areas unless required.
6. Preserve tests.
7. Add tests for new domain logic.
8. Run:
   - lint
   - TypeScript checks
   - unit tests
   - relevant integration tests
9. Report:
   - files changed
   - tests run
   - known limitations
   - architectural questions
10. If a major product rule must change, stop and request approval.

---

# 61. OPEN ARCHITECTURE QUESTIONS FOR OPUS

The planning model should resolve these before major implementation:

1. Which prayer calculation library should be used and why?
2. Which local database should be used for Expo/React Native and why?
3. How should recurrence be represented?
4. Should occurrences be materialized ahead of time or computed lazily?
5. What date/time library should be used?
6. How should timezone-aware local wall-clock scheduling be represented?
7. How should DST duplicated/nonexistent times be handled?
8. How should high-latitude prayer calculations be handled?
9. How should notifications be rescheduled after timezone/location changes?
10. How should widget data be exposed efficiently?
11. How should eventual cloud sync IDs/versioning be designed?
12. How should recurring-series exceptions be represented?
13. What should be stored vs derived vs cached?
14. What parts should be shared with the broader Islamic ecosystem?
15. What test strategy is needed for date/time correctness?

Opus should not change the product rules while answering these.

---

# 62. SUCCESS CRITERIA

The product succeeds if a user can:

1. open the app and immediately see the correct current prayer period
2. create a task in seconds
3. trust that the app places tasks in the correct prayer section
4. travel without manually reorganizing their day
5. use prayer-relative routines naturally
6. see voluntary worship when desired without clutter when disabled
7. understand exactly why a task appears where it does
8. keep using the app offline
9. avoid notification overload
10. feel that the app organizes life around Salah rather than forcing Salah into a generic calendar

The core product experience should feel effortless, calm, and predictable.

---

# 63. FINAL PRODUCT SUMMARY

The product is a prayer-centered adaptive planner.

Its core innovation is not prayer times alone.

Its core innovation is the scheduling relationship between:

```text
Clock Time
Prayer Time
Planning Day
Location
Timezone
Recurrence
Islamic Calendar
Task Occurrence
```

The UI must make that complexity feel simple.

The user should only need to say things such as:

```text
Soccer — 6 PM
Shower — 30 min after Maghrib
Read Qur'an — Fajr to Asr
Buy toothpaste — Anytime Today
```

The system handles the rest.

---

END OF MASTER PRODUCT SPEC
