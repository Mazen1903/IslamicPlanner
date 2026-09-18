/**
 * Android Widget Task Handler (M18)
 *
 * Registered in index.ts via registerWidgetTaskHandler().
 * Handles all Android AppWidget lifecycle events in headless (non-React) mode.
 *
 * Safety invariants:
 *   - MUST NOT trigger GPS permission requests.
 *   - MUST NOT write to the planner SQLite database (task mutations).
 *   - MUST NOT call JournalKeyManager or decrypt Journal data.
 *   - MUST NOT access Zustand stores.
 *
 * Data flow:
 *   All data comes from WidgetSnapshotBuilder which reads from
 *   LocationAwareTodayTemporalInputProvider (committed location snapshots,
 *   no GPS calls) and TodayQueryService (read-only SQLite queries).
 *
 * Deep-link tap:
 *   WIDGET_CLICK opens islamic-planner://today — no state mutation.
 *
 * Actual widget JSX rendering:
 *   SmallWidgetComponent / MediumWidgetComponent are rendered inline
 *   inside renderWidget() callback, which the react-native-android-widget
 *   infrastructure serialises to native views.
 */

import React from 'react';
import { Linking } from 'react-native';
import type {
  WidgetTaskHandler,
  WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import { LocationAwareTodayTemporalInputProvider } from '@/services/TodayTemporalInputProvider';
import { WidgetSnapshotBuilder } from '@/services/widget/WidgetSnapshotBuilder';
import { SmallWidgetComponent } from './SmallWidgetComponent';
import { MediumWidgetComponent } from './MediumWidgetComponent';
import { DateTime } from 'luxon';

const WIDGET_NAME_SMALL = 'IslamicPlannerSmall';
const WIDGET_NAME_MEDIUM = 'IslamicPlannerMedium';
const DEEP_LINK_TODAY = 'islamic-planner://today';

const inputProvider = new LocationAwareTodayTemporalInputProvider();
const snapshotBuilder = new WidgetSnapshotBuilder();

/**
 * Build a WidgetSnapshot using the canonical input provider.
 * Uses committed location snapshots — never calls GPS location service.
 */
async function buildSnapshot() {
  const now = DateTime.now();
  const inputResult = await inputProvider.getInputs();

  if (inputResult.status === 'SETUP_REQUIRED') {
    return snapshotBuilder.buildSetupRequired(now);
  }

  try {
    return await snapshotBuilder.build(inputResult.inputs, now);
  } catch (err) {
    console.warn('[widgetTaskHandler] snapshot build failed, using SETUP_REQUIRED:', err);
    return snapshotBuilder.buildSetupRequired(now);
  }
}

/**
 * Android widget task handler.
 * Must be registered in index.ts before expo-router/entry.
 *
 * WidgetTaskHandlerProps:
 *   - widgetInfo: { widgetName, widgetId, height, width, screenInfo }
 *   - widgetAction: 'WIDGET_ADDED' | 'WIDGET_UPDATE' | 'WIDGET_RESIZED' | 'WIDGET_DELETED' | 'WIDGET_CLICK'
 *   - renderWidget: (component: WidgetRepresentation) => void  (callback provided by library)
 */
export const widgetTaskHandler: WidgetTaskHandler = async (
  props: WidgetTaskHandlerProps
): Promise<void> => {
  const { widgetInfo, widgetAction, renderWidget } = props;
  const { widgetName } = widgetInfo;

  // WIDGET_CLICK: open app via deep link, no state mutation
  if (widgetAction === 'WIDGET_CLICK') {
    try {
      await Linking.openURL(DEEP_LINK_TODAY);
    } catch (err) {
      console.warn('[widgetTaskHandler] Deep link failed:', err);
    }
    return;
  }

  // WIDGET_DELETED: no rendering needed
  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  // WIDGET_ADDED, WIDGET_UPDATE, WIDGET_RESIZED: rebuild snapshot and render
  try {
    const snapshot = await buildSnapshot();

    if (widgetName === WIDGET_NAME_SMALL) {
      renderWidget(React.createElement(SmallWidgetComponent, snapshot));
    } else if (widgetName === WIDGET_NAME_MEDIUM) {
      renderWidget(React.createElement(MediumWidgetComponent, snapshot));
    }
  } catch (err) {
    console.warn('[widgetTaskHandler] Widget render failed:', err);
  }
};
