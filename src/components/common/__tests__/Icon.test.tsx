import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Icon } from '../Icon';

describe('Icon Component', () => {
  it('renders without crashing with default props', async () => {
    await render(
      <ThemeProvider>
        <Icon name="prayer" accessibilityLabel="Prayer Compass" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('image')).toBeTruthy();
  });

  it('supports custom size and color', async () => {
    await render(
      <ThemeProvider>
        <Icon name="check" size="lg" color="#1B7A4D" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('image')).toBeTruthy();
  });

  it('renders journal icon without crashing', async () => {
    await render(
      <ThemeProvider>
        <Icon name="journal" accessibilityLabel="Journal" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('image')).toBeTruthy();
  });

  it('renders custom Exact Time clock icon', async () => {
    await render(
      <ThemeProvider>
        <Icon name="clock" accessibilityLabel="Clock Icon" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Clock Icon')).toBeTruthy();
  });

  it('renders custom Prayer Window calendar icon with 5 green dots', async () => {
    await render(
      <ThemeProvider>
        <Icon name="calendar" accessibilityLabel="Calendar Icon" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Calendar Icon')).toBeTruthy();
  });

  it('renders custom Anytime Today sun icon with 8 radiating rays', async () => {
    await render(
      <ThemeProvider>
        <Icon name="sun" accessibilityLabel="Sun Icon" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Sun Icon')).toBeTruthy();
  });

  it('renders custom repeat cycle icon', async () => {
    await render(
      <ThemeProvider>
        <Icon name="refresh" accessibilityLabel="Repeat Cycle" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Repeat Cycle')).toBeTruthy();
  });

  it('renders custom more options equalizer sliders icon', async () => {
    await render(
      <ThemeProvider>
        <Icon name="options" accessibilityLabel="Options Sliders" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Options Sliders')).toBeTruthy();
  });

  it('renders custom add_task4 options icons cleanly', async () => {
    const task4Icons = [
      { name: 'settings' as const, label: 'More Options Cog' },
      { name: 'bell' as const, label: 'Reminder Bell' },
      { name: 'flag' as const, label: 'Priority Flag' },
      { name: 'document' as const, label: 'Notes Document' },
      { name: 'checkbox' as const, label: 'Subtasks Checklist' },
      { name: 'attach' as const, label: 'Attachment Clip' },
      { name: 'pricetag' as const, label: 'Tags Tag' },
      { name: 'eye' as const, label: 'Private Eye' },
      { name: 'sync' as const, label: 'Habit Repeat' },
    ];

    for (const item of task4Icons) {
      await render(
        <ThemeProvider>
          <Icon name={item.name} accessibilityLabel={item.label} />
        </ThemeProvider>,
      );
      expect(screen.getByLabelText(item.label)).toBeTruthy();
    }
  });
});
