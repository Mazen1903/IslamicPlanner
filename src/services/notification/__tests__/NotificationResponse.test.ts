import { router } from 'expo-router';
import {
  handleNotificationResponse,
  initNotificationHandler,
  _resetNotificationHandlerForTesting,
} from '../NotificationBootstrap';
import {
  NOTIFICATION_ACTION_SNOOZE,
  NOTIFICATION_ACTION_DONE,
} from '@/domain/notification/types';
import { notificationSchedulerAdapter } from '../NotificationSchedulerAdapter';
import { TaskEngine } from '@/domain/task/TaskEngine';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@/domain/task/TaskEngine');
jest.mock('../NotificationSchedulerAdapter');

describe('Notification Response Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetNotificationHandlerForTesting();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigates to task detail screen on default notification tap', async () => {
    const response = {
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      notification: {
        request: {
          content: {
            data: {
              kind: 'task-reminder',
              occurrenceId: 'occ-123',
            },
          },
        },
      },
    };

    await handleNotificationResponse(response);
    jest.advanceTimersByTime(150);

    expect(router.push).toHaveBeenCalledWith('/task/occ-123');
  });

  it('schedules a 10-minute snooze notification when Snooze action is pressed', async () => {
    const response = {
      actionIdentifier: NOTIFICATION_ACTION_SNOOZE,
      notification: {
        request: {
          content: {
            title: 'Read Surah Al-Kahf',
            data: {
              kind: 'task-reminder',
              occurrenceId: 'occ-456',
              taskDefinitionId: 'def-456',
            },
          },
        },
      },
    };

    await handleNotificationResponse(response);

    expect(notificationSchedulerAdapter.scheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'task-reminder:occ-456:snooze',
        occurrenceId: 'occ-456',
        title: 'Read Surah Al-Kahf (Snoozed)',
      })
    );
  });

  it('completes the task occurrence when Mark Done action is pressed', async () => {
    const mockComplete = jest.fn().mockResolvedValue({} as any);
    (TaskEngine as unknown as jest.Mock).mockImplementation(() => ({
      completeTask: mockComplete,
    }));

    const response = {
      actionIdentifier: NOTIFICATION_ACTION_DONE,
      notification: {
        request: {
          content: {
            data: {
              kind: 'task-reminder',
              occurrenceId: 'occ-789',
            },
          },
        },
      },
    };

    await handleNotificationResponse(response);

    expect(mockComplete).toHaveBeenCalledWith('occ-789');
  });
});
