/**
 * Custom app entry point (M18).
 *
 * This file MUST remain the root entry point to ensure the Android
 * widget task handler is registered BEFORE expo-router/entry initializes
 * the React runtime.
 *
 * CRITICAL ORDER:
 *   1. registerWidgetTaskHandler — headless registration for Android AppWidgets
 *   2. expo-router/entry       — app bundle initialization
 *
 * Reversing this order causes Android widget updates to fail silently.
 *
 * iOS note:
 *   expo-widgets (iOS) does NOT require a custom entry point. The
 *   registerWidgetTaskHandler call is a no-op on iOS.
 *
 * Safety invariants:
 *   - This file must NOT import Zustand, React hooks, or any module
 *     with side effects other than registerWidgetTaskHandler.
 *   - No synchronous database access.
 *   - No GPS permission requests.
 *
 * M18 reference: docs/M18_ARCHITECTURE.md §3 (Android Entry Strategy)
 */

import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgets/android/widgetTaskHandler';

// Register handler BEFORE any React runtime initializes
registerWidgetTaskHandler(widgetTaskHandler);

// Initialize app bundle (must be last)
// eslint-disable-next-line import/first
import 'expo-router/entry';
