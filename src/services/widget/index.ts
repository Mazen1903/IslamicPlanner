/**
 * Public widget service exports (M18).
 */

export type {
  WidgetPrayer,
  WidgetPrayerEntry,
  WidgetTaskEntry,
  WidgetSnapshot,
} from './types';

export { SETUP_REQUIRED_SNAPSHOT } from './types';
export { WidgetSnapshotBuilder, widgetSnapshotBuilder } from './WidgetSnapshotBuilder';
export { WidgetSyncCoordinator, widgetSyncCoordinator } from './WidgetSyncCoordinator';
