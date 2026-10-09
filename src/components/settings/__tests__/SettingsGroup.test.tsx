import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SettingsGroup, SettingsGroupRow, SettingsGroupDivider } from '../SettingsGroup';

async function renderUi(ui: React.ReactElement) {
  return await render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SettingsGroup / SettingsGroupRow', () => {
  it('renders the group title, optional subtitle and its rows', async () => {
    await renderUi(
      <SettingsGroup title="Planner Sections" subtitle="Show or hide sections" testID="grp">
        <SettingsGroupRow title="Previous" testID="row-a" />
        <SettingsGroupDivider />
        <SettingsGroupRow title="Today" testID="row-b" />
      </SettingsGroup>
    );

    expect(screen.getByTestId('grp')).toBeTruthy();
    expect(screen.getByText('Planner Sections')).toBeTruthy();
    expect(screen.getByText('Show or hide sections')).toBeTruthy();
    expect(screen.getByText('Previous')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('pressable rows expose the testID on the pressable and call onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<SettingsGroupRow title="Open" showChevron onPress={onPress} testID="row-open" />);

    const row = screen.getByTestId('row-open');
    expect(row.props.accessibilityRole).toBe('button');
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('radio rows report checked state through accessibilityState', async () => {
    await renderUi(
      <>
        <SettingsGroupRow title="Fajr" isRadio radioSelected onPress={() => {}} testID="radio-on" />
        <SettingsGroupRow title="Midnight" isRadio onPress={() => {}} testID="radio-off" />
      </>
    );

    expect(screen.getByTestId('radio-on').props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId('radio-on').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('radio-off').props.accessibilityState.checked).toBe(false);
  });

  it('switch rows expose a labelled switch and forward changes', async () => {
    const onSwitchChange = jest.fn();
    await renderUi(
      <SettingsGroupRow
        title="Completed"
        isSwitch
        switchValue
        onSwitchChange={onSwitchChange}
        testID="row-switch"
      />
    );

    const sw = screen.getByTestId('row-switch-switch');
    await fireEvent(sw, 'valueChange', false);
    expect(onSwitchChange).toHaveBeenCalledWith(false);
  });

  it('shows the premium lantern badge with its testID when locked', async () => {
    await renderUi(<SettingsGroupRow title="Custom" isLocked lockBadgeTestID="premium-badge-custom" />);
    expect(screen.getByTestId('premium-badge-custom')).toBeTruthy();
  });

  it('does not show the lantern badge when unlocked', async () => {
    await renderUi(<SettingsGroupRow title="Custom" lockBadgeTestID="premium-badge-custom" />);
    expect(screen.queryByTestId('premium-badge-custom')).toBeNull();
  });

  it('disabled rows render as plain content, not a button', async () => {
    await renderUi(<SettingsGroupRow title="Disabled" onPress={() => {}} disabled testID="row-disabled" />);

    const row = screen.getByTestId('row-disabled');
    expect(row.props.accessibilityRole).toBeUndefined();
  });
});
