import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { DeleteTaskSheet } from '../DeleteTaskSheet';

async function renderSheet(props: Partial<React.ComponentProps<typeof DeleteTaskSheet>> = {}) {
  const onClose = jest.fn();
  const onSelectScope = jest.fn();
  await render(
    <ThemeProvider>
      <DeleteTaskSheet
        visible
        onClose={onClose}
        onSelectScope={onSelectScope}
        taskTitle="Morning Adhkar"
        {...props}
      />
    </ThemeProvider>
  );
  return { onClose, onSelectScope };
}

describe('DeleteTaskSheet', () => {
  it('renders nothing when not visible', async () => {
    await renderSheet({ visible: false });
    expect(screen.queryByTestId('delete-sheet-content')).toBeNull();
  });

  it('shows the task title and an accessible header', async () => {
    await renderSheet();
    expect(screen.getByText('Delete Recurring Task')).toBeTruthy();
    expect(screen.getByText(/Morning Adhkar/)).toBeTruthy();
    expect(screen.getByRole('header')).toBeTruthy();
  });

  it.each([
    ['delete-scope-this-occurrence', 'THIS_OCCURRENCE'],
    ['delete-scope-this-and-future', 'THIS_AND_FUTURE'],
    ['delete-scope-all-occurrences', 'ALL_OCCURRENCES'],
  ])('%s reports the %s scope', async (testID, scope) => {
    const { onSelectScope } = await renderSheet();
    await fireEvent.press(screen.getByTestId(testID));
    expect(onSelectScope).toHaveBeenCalledWith(scope);
  });

  it('cancel and backdrop both close the sheet without selecting a scope', async () => {
    const { onClose, onSelectScope } = await renderSheet();
    await fireEvent.press(screen.getByTestId('delete-sheet-cancel'));
    await fireEvent.press(screen.getByTestId('delete-sheet-backdrop', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSelectScope).not.toHaveBeenCalled();
  });
});
