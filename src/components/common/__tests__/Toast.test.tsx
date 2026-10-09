import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Toast } from '../Toast';
import { useToastStore } from '@/stores/useToastStore';

async function renderToast() {
  return await render(
    <ThemeProvider>
      <Toast />
    </ThemeProvider>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useToastStore.setState({ currentToast: null });
  });

  afterEach(async () => {
    await act(async () => {
      useToastStore.getState().hideToast();
    });
    jest.useRealTimers();
  });

  it('renders nothing without a current toast', async () => {
    await renderToast();
    expect(screen.queryByTestId('app-toast')).toBeNull();
  });

  it('shows the message and auto-dismisses after the duration, committing once', async () => {
    const onCommit = jest.fn();
    await renderToast();

    await act(async () => {
      useToastStore.getState().showToast({ message: 'Task deleted', durationMs: 2000, onCommit });
    });
    expect(screen.getByTestId('app-toast-message').props.children).toBe('Task deleted');

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId('app-toast')).toBeNull();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('runs the action and dismisses without committing', async () => {
    const onPress = jest.fn();
    const onCommit = jest.fn();
    await renderToast();

    await act(async () => {
      useToastStore.getState().showToast({
        message: 'Task deleted',
        action: { label: 'Undo', onPress },
        onCommit,
      });
    });
    await fireEvent.press(screen.getByTestId('app-toast-action-btn'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('app-toast')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits the previous toast when a new one replaces it', async () => {
    const firstCommit = jest.fn();
    await renderToast();

    await act(async () => {
      useToastStore.getState().showToast({ message: 'First', onCommit: firstCommit });
      useToastStore.getState().showToast({ message: 'Second' });
    });

    expect(firstCommit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('app-toast-message').props.children).toBe('Second');
  });
});
