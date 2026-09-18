import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import AboutScreen from '../about';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('AboutScreen', () => {
  it('renders app name and version from configuration', async () => {
    await render(
      <ThemeProvider>
        <AboutScreen />
      </ThemeProvider>
    );

    expect(screen.getByTestId('app-name')).toBeTruthy();
    expect(screen.getByText('Islamic Daily Planner')).toBeTruthy();

    expect(screen.getByTestId('app-version')).toBeTruthy();
    expect(screen.getByText(/Version/)).toBeTruthy();
  });

  it('renders factual open-source acknowledgements and licenses', async () => {
    await render(
      <ThemeProvider>
        <AboutScreen />
      </ThemeProvider>
    );

    expect(screen.getByTestId('credits-section')).toBeTruthy();

    // Actual repo dependencies credited
    expect(screen.getByText('GeoNames')).toBeTruthy();
    expect(screen.getByText('Adhan')).toBeTruthy();
    expect(screen.getByText('Drizzle ORM & SQLite')).toBeTruthy();
    expect(screen.getByText('Luxon')).toBeTruthy();
  });

  it('does not render fake external URLs or unverified contact links', async () => {
    await render(
      <ThemeProvider>
        <AboutScreen />
      </ThemeProvider>
    );

    expect(screen.queryByText(/http/)).toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.queryByText(/Support/)).toBeNull();
  });
});
