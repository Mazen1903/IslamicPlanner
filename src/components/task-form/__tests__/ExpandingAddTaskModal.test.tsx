import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Animated, BackHandler } from 'react-native';
import { ThemeProvider } from '@/theme';
import { ExpandingAddTaskModal, type FabOrigin } from '../ExpandingAddTaskModal';

// Mock datetimepicker to avoid native dependency in test environment
jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return function MockDateTimePicker(props: any) {
    return (
      <View testID={props.testID || 'mock-datetimepicker'}>
        <Text>MockDateTimePicker</Text>
      </View>
    );
  };
});

describe('ExpandingAddTaskModal', () => {
  const origin: FabOrigin = {
    x: 180,
    y: 750,
    width: 48,
    height: 48,
  };

  const defaultProps = {
    visible: true,
    origin,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, 'timing').mockImplementation((value: any, config: any) => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        value.setValue(config.toValue);
        callback?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing when visible is false', async () => {
    await render(
      <ThemeProvider>
        <ExpandingAddTaskModal {...defaultProps} visible={false} />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('expanding-add-task-modal')).toBeNull();
  });

  it('renders modal and content when visible is true with slide-from-bottom configuration', async () => {
    await render(
      <ThemeProvider>
        <ExpandingAddTaskModal {...defaultProps} visible={true} />
      </ThemeProvider>
    );

    const modal = screen.getByTestId('expanding-add-task-modal');
    expect(modal).toBeTruthy();
    expect(modal.props.animationType).toBe('slide');
    expect(modal.props.presentationStyle).toBe('fullScreen');
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(screen.getByTestId('expanding-add-task-container')).toBeTruthy();
    expect(screen.getByTestId('expanding-add-task-content')).toBeTruthy();
  });

  it('invokes onClose when cancel is pressed inside TaskFormScreen', async () => {
    await render(
      <ThemeProvider>
        <ExpandingAddTaskModal {...defaultProps} visible={true} />
      </ThemeProvider>
    );

    const backButton = screen.getByTestId('task-form-back-button');
    expect(backButton).toBeTruthy();

    fireEvent.press(backButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles hardware back press on Android', async () => {
    let backPressHandler: (() => boolean) | undefined;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'hardwareBackPress') {
        backPressHandler = handler;
      }
      return { remove: jest.fn() };
    });

    await render(
      <ThemeProvider>
        <ExpandingAddTaskModal {...defaultProps} visible={true} />
      </ThemeProvider>
    );

    expect(backPressHandler).toBeDefined();

    act(() => {
      backPressHandler?.();
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
