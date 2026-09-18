/**
 * Jest manual mock for react-native-android-widget.
 *
 * Provides no-op implementations of all widget APIs used by WidgetSyncCoordinator
 * and the Android widget task handler.
 */

export const registerWidgetTaskHandler = jest.fn().mockReturnValue(undefined);
export const requestWidgetUpdate = jest.fn().mockResolvedValue(undefined);
export const requestWidgetUpdateById = jest.fn().mockResolvedValue(undefined);

// WidgetPreview is a React component used for gallery previews. Stub it.
export const WidgetPreview = jest.fn().mockReturnValue(null);

// Widget size constants
export const WIDGET_SIZE_SMALL = 'small';
export const WIDGET_SIZE_MEDIUM = 'medium';
export const WIDGET_SIZE_LARGE = 'large';
