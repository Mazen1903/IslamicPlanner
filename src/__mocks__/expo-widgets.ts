/**
 * Jest manual mock for expo-widgets.
 *
 * Provides jest.fn() spies for all widget APIs used by WidgetSyncCoordinator.
 * The createWidget mock returns a Widget-like object with an updateTimeline spy.
 *
 * Tests can assert on mockWidgetInstance.updateTimeline to verify iOS push calls.
 */

// Widget instance mock - returned by createWidget
export const mockWidgetInstance = {
  updateTimeline: jest.fn().mockResolvedValue(undefined),
  updateSnapshot: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn(),
  getTimeline: jest.fn().mockResolvedValue([]),
};

// createWidget returns the same mock instance for all widgets
// so we can spy on updateTimeline calls regardless of widget name
export const createWidget = jest.fn().mockReturnValue(mockWidgetInstance);

// Re-export the updateTimeline spy for convenient test access
export const updateTimeline = mockWidgetInstance.updateTimeline;

// Other exports used by some tests or code paths
export const createLiveActivity = jest.fn().mockReturnValue({});
export const addUserInteractionListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const after = jest.fn((date: Date) => ({ after: date }));
export const widgetsDirectory = '/mock/widgets';
