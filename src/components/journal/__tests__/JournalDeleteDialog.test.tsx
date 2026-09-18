import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { JournalDeleteDialog } from '../JournalDeleteDialog';
import { ThemeProvider } from '@/theme';

describe('JournalDeleteDialog', () => {
  it('HIST-06 & HIST-07 & HIST-08: renders confirmation dialog, confirms and cancels delete', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    await render(
      <ThemeProvider>
        <JournalDeleteDialog
          visible={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Delete this journal entry?')).toBeTruthy();
    expect(screen.getByText('This entry cannot be recovered.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-delete-cancel-btn'));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-delete-confirm-btn'));
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
