import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import HelpScreen from '../help';
import PrivacyPolicyScreen from '../privacy-policy';
import TermsOfServiceScreen from '../terms';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('In-App Information Screens', () => {
  describe('HelpScreen', () => {
    it('renders Help Center header and FAQ categories', async () => {
      await render(
        <ThemeProvider>
          <HelpScreen />
        </ThemeProvider>
      );

      expect(screen.getByTestId('section-header-help')).toBeTruthy();
      expect(screen.getByText('Help Center')).toBeTruthy();
      expect(screen.getByText(/Prayer Times & Location/i)).toBeTruthy();
      expect(screen.getByText(/Islamic Calendar/i)).toBeTruthy();
      expect(screen.getByText(/Notifications & Reminders/i)).toBeTruthy();
      expect(screen.getByText(/Data & Privacy/i)).toBeTruthy();
    });
  });

  describe('PrivacyPolicyScreen', () => {
    it('renders Privacy Policy header and local-first data policy sections', async () => {
      await render(
        <ThemeProvider>
          <PrivacyPolicyScreen />
        </ThemeProvider>
      );

      expect(screen.getByTestId('section-header-privacy-policy')).toBeTruthy();
      expect(screen.getByText('Privacy Policy')).toBeTruthy();
      expect(screen.getByText(/1\.\s*Data Storage & Ownership/i)).toBeTruthy();
      expect(screen.getByText(/2\.\s*Journal Encryption/i)).toBeTruthy();
      expect(screen.getByText(/3\.\s*Location Information/i)).toBeTruthy();
      expect(screen.getByText(/4\.\s*Backups and Export/i)).toBeTruthy();
      expect(screen.getByText(/5\.\s*Data Deletion/i)).toBeTruthy();
    });
  });

  describe('TermsOfServiceScreen', () => {
    it('renders Terms of Service header and conditions', async () => {
      await render(
        <ThemeProvider>
          <TermsOfServiceScreen />
        </ThemeProvider>
      );

      expect(screen.getByTestId('section-header-terms')).toBeTruthy();
      expect(screen.getByText('Terms of Service')).toBeTruthy();
      expect(screen.getByText(/1\.\s*Permitted Use/i)).toBeTruthy();
      expect(screen.getByText(/2\.\s*Astronomical Calculations/i)).toBeTruthy();
      expect(screen.getByText(/3\.\s*Local Data Responsibility/i)).toBeTruthy();
      expect(screen.getByText(/4\.\s*Disclaimer of Warranties/i)).toBeTruthy();
    });
  });
});
