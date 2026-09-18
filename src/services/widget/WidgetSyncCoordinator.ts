/**
 * WidgetSyncCoordinator
 *
 * Singleton, non-React coordinator that builds WidgetSnapshots and pushes
 * them to both iOS (expo-widgets) and Android (react-native-android-widget).
 *
 * Design mirrors SettingsMutationCoordinator (M17):
 *   - Non-React, injectable, singleton
 *   - sync() is best-effort: failure is caught and logged, never propagated
 *   - Invoked from PlannerRefreshCoordinator.fullRefresh() post-return
 *   - Invoked from useToday.ts after prayer-transition queryAndProject
 *
 * Platform push strategy:
 *   - iOS: expo-widgets Widget.updateTimeline() with prayer-boundary entries
 *   - Android: react-native-android-widget requestWidgetUpdate()
 *
 * M18 invariants:
 *   - sync() never throws to its caller.
 *   - SETUP_REQUIRED -> pushes isSetupRequired snapshot with calm prompt.
 *   - No GPS calls.
 *   - No Journal reads.
 *   - No SQLite writes.
 */

import React from 'react';
import { DateTime } from 'luxon';
import { createWidget } from 'expo-widgets';
import { requestWidgetUpdate } from 'react-native-android-widget';
import {
  LocationAwareTodayTemporalInputProvider,
} from '@/services/TodayTemporalInputProvider';
import type { TodayTemporalInputProvider } from '@/services/types';
import { WidgetSnapshotBuilder, widgetSnapshotBuilder } from './WidgetSnapshotBuilder';
import type { WidgetSnapshot } from './types';
import { SmallWidgetComponent } from '../../../widgets/android/SmallWidgetComponent';
import { MediumWidgetComponent } from '../../../widgets/android/MediumWidgetComponent';

/** Widget names must match app.json plugin config. */
const WIDGET_NAME_SMALL = 'IslamicPlannerSmall';
const WIDGET_NAME_MEDIUM = 'IslamicPlannerMedium';

/**
 * Lazily-created Widget instances for iOS.
 * We pass an identity layout function; the real layout is defined in
 * widgets/ios/SmallWidget.tsx and widgets/ios/MediumWidget.tsx via
 * createWidget() called at module load time.
 * These instances exist solely to call .updateTimeline().
 */
const iosSmallWidget = createWidget<WidgetSnapshot>(WIDGET_NAME_SMALL, (props) => props as any);
const iosMediumWidget = createWidget<WidgetSnapshot>(WIDGET_NAME_MEDIUM, (props) => props as any);

export class WidgetSyncCoordinator {
  constructor(
    private readonly inputProvider: TodayTemporalInputProvider = new LocationAwareTodayTemporalInputProvider(),
    private readonly builder: WidgetSnapshotBuilder = widgetSnapshotBuilder
  ) {}

  /**
   * Build a WidgetSnapshot and push it to both platforms.
   * Best-effort: all errors are caught and logged.
   */
  async sync(): Promise<void> {
    try {
      const snapshot = await this._buildSnapshot();
      await Promise.all([
        this._pushIOS(snapshot),
        this._pushAndroid(snapshot),
      ]);
    } catch (err) {
      console.warn('[WidgetSyncCoordinator] sync failed (recovered):', err);
    }
  }

  private async _buildSnapshot(): Promise<WidgetSnapshot> {
    const now = DateTime.now();
    const inputResult = await this.inputProvider.getInputs();

    if (inputResult.status === 'SETUP_REQUIRED') {
      return this.builder.buildSetupRequired(now);
    }

    try {
      return await this.builder.build(inputResult.inputs, now);
    } catch (err) {
      console.warn('[WidgetSyncCoordinator] snapshot build failed, sending SETUP_REQUIRED:', err);
      return this.builder.buildSetupRequired(now);
    }
  }

  /**
   * Push snapshot to iOS via expo-widgets Widget.updateTimeline().
   * Builds prayer-boundary entries so the OS advances them natively.
   */
  private async _pushIOS(snapshot: WidgetSnapshot): Promise<void> {
    try {
      const entries = snapshot.isSetupRequired
        ? [{ date: new Date(), props: snapshot }]
        : this._buildTimelineEntries(snapshot);

      iosSmallWidget.updateTimeline(entries);
      iosMediumWidget.updateTimeline(entries);
    } catch (err) {
      console.warn('[WidgetSyncCoordinator] iOS push failed:', err);
    }
  }

  /**
   * Build iOS timeline entries - one per prayer boundary.
   * Entry 0: current snapshot (fires immediately).
   * Entries 1-N: future prayer start times, each with updated currentPrayer/nextPrayer.
   */
  private _buildTimelineEntries(
    snapshot: WidgetSnapshot
  ): { date: Date; props: WidgetSnapshot }[] {
    const entries: { date: Date; props: WidgetSnapshot }[] = [
      { date: new Date(), props: snapshot },
    ];

    const now = Date.now();

    for (const prayer of snapshot.allPrayers) {
      if (!prayer.startsAt) continue;
      const prayerDate = new Date(prayer.startsAt);
      if (prayerDate.getTime() > now) {
        const futureSnapshot: WidgetSnapshot = {
          ...snapshot,
          currentPrayer: prayer,
          nextPrayer: this._findNextPrayer(snapshot, prayer.prayer),
        };
        entries.push({ date: prayerDate, props: futureSnapshot });
      }
    }

    return entries;
  }

  private _findNextPrayer(
    snapshot: WidgetSnapshot,
    currentPrayer: string
  ): typeof snapshot.nextPrayer {
    const order = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];
    const idx = order.indexOf(currentPrayer);
    if (idx === -1 || idx === order.length - 1) return null;
    const next = order[idx + 1];
    return snapshot.allPrayers.find(p => p.prayer === next) ?? null;
  }

  /**
   * Push snapshot to Android via react-native-android-widget requestWidgetUpdate.
   * renderWidget returns the actual WidgetComponent with current WidgetSnapshot props.
   */
  private async _pushAndroid(snapshot: WidgetSnapshot): Promise<void> {
    try {
      await requestWidgetUpdate({
        widgetName: WIDGET_NAME_SMALL,
        renderWidget: () => React.createElement(SmallWidgetComponent, snapshot),
      });

      await requestWidgetUpdate({
        widgetName: WIDGET_NAME_MEDIUM,
        renderWidget: () => React.createElement(MediumWidgetComponent, snapshot),
      });
    } catch (err) {
      console.warn('[WidgetSyncCoordinator] Android push failed:', err);
    }
  }
}

export const widgetSyncCoordinator = new WidgetSyncCoordinator();
