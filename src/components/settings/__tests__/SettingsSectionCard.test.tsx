import React from 'react';
import { View, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SettingsSectionCard } from '../SettingsSectionCard';

describe('SettingsSectionCard', () => {
  it('renders title, subtitle, and custom children', async () => {
    await render(
      <ThemeProvider>
        <SettingsSectionCard
          title="Location Settings"
          subtitle="Configure your prayer location"
          testID="settings-section"
        >
          <Text testID="section-child">Child Content</Text>
        </SettingsSectionCard>
      </ThemeProvider>
    );

    expect(screen.getByText('Location Settings')).toBeTruthy();
    expect(screen.getByText('Configure your prayer location')).toBeTruthy();
    expect(screen.getByTestId('section-child')).toBeTruthy();
  });

  it('applies custom bgColor when passed', async () => {
    await render(
      <ThemeProvider>
        <SettingsSectionCard
          title="Tints Test"
          bgColor="#E8F5EE"
          testID="custom-bg-section"
        />
      </ThemeProvider>
    );

    const card = screen.getByTestId('custom-bg-section');
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style.filter(Boolean))
      : card.props.style;

    expect(flatStyle.backgroundColor).toBe('#E8F5EE');
    expect(flatStyle.borderRadius).toBe(24);
  });

  it('renders rightElement and customBadge', async () => {
    await render(
      <ThemeProvider>
        <SettingsSectionCard
          title="Notification Test"
          customBadge={<View testID="custom-badge" />}
          rightElement={<View testID="custom-switch" />}
          testID="notif-section"
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('custom-badge')).toBeTruthy();
    expect(screen.getByTestId('custom-switch')).toBeTruthy();
  });
});
