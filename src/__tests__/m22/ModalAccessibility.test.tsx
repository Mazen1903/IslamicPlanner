import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { JournalDeleteDialog } from '@/components/journal/JournalDeleteDialog';
import { JournalPrivacySheet } from '@/components/journal/JournalPrivacySheet';
import { CustomRecurrenceModal } from '@/components/task-form/CustomRecurrenceModal';
import { EditScopeSheet } from '@/components/task-form/EditScopeSheet';
import { PremiumLockedInfo } from '@/components/premium/PremiumLockedInfo';
import fs from 'fs';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('@/hooks/useJournal', () => ({
  useJournal: jest.fn(() => ({
    isBiometricLockEnabled: false,
    setBiometricLockEnabled: jest.fn(),
    isHardwareSupported: true,
  })),
}));

describe('Group E: Modal Accessibility Isolation Contract', () => {
  describe('1. JournalDeleteDialog', () => {
    it('sets accessibilityViewIsModal={true} on dialog content', async () => {
      await render(
        <ThemeProvider>
          <JournalDeleteDialog visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} />
        </ThemeProvider>
      );
      const content = screen.getByTestId('journal-delete-dialog-content');
      expect(content.props.accessibilityViewIsModal).toBe(true);
    });

    it('sets accessibilityRole="header" on dialog title', async () => {
      await render(
        <ThemeProvider>
          <JournalDeleteDialog visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} />
        </ThemeProvider>
      );
      const title = screen.getByText('Delete this journal entry?');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('backdrop Pressable has accessible={false} to exclude from a11y traversal', async () => {
      const { toJSON } = await render(
        <ThemeProvider>
          <JournalDeleteDialog visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} />
        </ThemeProvider>
      );
      const json = toJSON() as any;
      const overlay = json.children[0];
      const backdrop = overlay.children[0];
      expect(backdrop.props.accessible).toBe(false);
    });

    it('Cancel and Delete buttons remain accessible', async () => {
      await render(
        <ThemeProvider>
          <JournalDeleteDialog visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} />
        </ThemeProvider>
      );
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });

  describe('2. JournalPrivacySheet', () => {
    it('sets accessibilityViewIsModal={true} on sheet content', async () => {
      await render(
        <ThemeProvider>
          <JournalPrivacySheet
            visible={true}
            lockEnabled={false}
            onToggleLock={jest.fn()}
            onClose={jest.fn()}
          />
        </ThemeProvider>
      );
      const content = screen.getByTestId('journal-privacy-content');
      expect(content.props.accessibilityViewIsModal).toBe(true);
    });

    it('sets accessibilityRole="header" on sheet title', async () => {
      await render(
        <ThemeProvider>
          <JournalPrivacySheet
            visible={true}
            lockEnabled={false}
            onToggleLock={jest.fn()}
            onClose={jest.fn()}
          />
        </ThemeProvider>
      );
      const title = screen.getByText('Journal Privacy');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('backdrop Pressable has accessible={false}', async () => {
      const { toJSON } = await render(
        <ThemeProvider>
          <JournalPrivacySheet
            visible={true}
            lockEnabled={false}
            onToggleLock={jest.fn()}
            onClose={jest.fn()}
          />
        </ThemeProvider>
      );
      const json = toJSON() as any;
      const overlay = json.children[0];
      const backdrop = overlay.children[0];
      expect(backdrop.props.accessible).toBe(false);
    });

    it('Done button is accessible', async () => {
      await render(
        <ThemeProvider>
          <JournalPrivacySheet
            visible={true}
            lockEnabled={false}
            onToggleLock={jest.fn()}
            onClose={jest.fn()}
          />
        </ThemeProvider>
      );
      expect(screen.getByText('Done')).toBeTruthy();
    });
  });

  describe('3. CustomRecurrenceModal', () => {
    const dummyState: any = {
      calendarType: 'GREGORIAN',
      customGregorianDraft: {
        frequency: 'WEEKLY',
        interval: 1,
        weekdays: [1],
      },
      customHijriDraft: {
        frequency: 'MONTHLY_DAY',
        interval: 1,
        day: 1,
      },
    };

    it('sets accessibilityViewIsModal={true} on modal content', async () => {
      await render(
        <ThemeProvider>
          <CustomRecurrenceModal
            visible={true}
            onClose={jest.fn()}
            state={dummyState}
            dispatch={jest.fn()}
          />
        </ThemeProvider>
      );
      const content = screen.getByTestId('custom-recurrence-modal');
      expect(content.props.accessibilityViewIsModal).toBe(true);
    });

    it('sets accessibilityRole="header" on modal title', async () => {
      await render(
        <ThemeProvider>
          <CustomRecurrenceModal
            visible={true}
            onClose={jest.fn()}
            state={dummyState}
            dispatch={jest.fn()}
          />
        </ThemeProvider>
      );
      const title = screen.getByText('Custom Repeat');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('Done button is accessible', async () => {
      await render(
        <ThemeProvider>
          <CustomRecurrenceModal
            visible={true}
            onClose={jest.fn()}
            state={dummyState}
            dispatch={jest.fn()}
          />
        </ThemeProvider>
      );
      expect(screen.getByText('Done')).toBeTruthy();
    });
  });

  describe('4. EditScopeSheet', () => {
    it('sets accessibilityViewIsModal={true} on sheet container', async () => {
      await render(
        <ThemeProvider>
          <EditScopeSheet
            visible={true}
            onCancel={jest.fn()}
            onSelectScope={jest.fn()}
          />
        </ThemeProvider>
      );
      const content = screen.getByTestId('edit-scope-sheet');
      expect(content.props.accessibilityViewIsModal).toBe(true);
    });

    it('sets accessibilityRole="header" on sheet title', async () => {
      await render(
        <ThemeProvider>
          <EditScopeSheet
            visible={true}
            onCancel={jest.fn()}
            onSelectScope={jest.fn()}
          />
        </ThemeProvider>
      );
      const title = screen.getByText('Edit Recurring Task');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('Cancel button and scope option buttons are accessible', async () => {
      await render(
        <ThemeProvider>
          <EditScopeSheet
            visible={true}
            onCancel={jest.fn()}
            onSelectScope={jest.fn()}
          />
        </ThemeProvider>
      );
      expect(screen.getByLabelText('Cancel edit scope selection')).toBeTruthy();
      expect(screen.getByTestId('scope-option-this_occurrence')).toBeTruthy();
      expect(screen.getByTestId('scope-option-this_and_future')).toBeTruthy();
      expect(screen.getByTestId('scope-option-all_occurrences')).toBeTruthy();
    });
  });

  describe('5. PremiumLockedInfo (A-22 Critical)', () => {
    it('sets accessibilityViewIsModal={true} on card content', async () => {
      await render(
        <ThemeProvider>
          <PremiumLockedInfo visible={true} onClose={jest.fn()} />
        </ThemeProvider>
      );
      const content = screen.getByTestId('premium-locked-info-content');
      expect(content.props.accessibilityViewIsModal).toBe(true);
    });

    it('card wrapper removes accessible={true} and accessibilityRole="alert" to avoid hiding OK', async () => {
      await render(
        <ThemeProvider>
          <PremiumLockedInfo visible={true} onClose={jest.fn()} />
        </ThemeProvider>
      );
      const content = screen.getByTestId('premium-locked-info-content');
      expect(content.props.accessible).toBeUndefined();
      expect(content.props.accessibilityRole).toBeUndefined();
    });

    it('sets accessibilityRole="header" on title Text', async () => {
      await render(
        <ThemeProvider>
          <PremiumLockedInfo visible={true} onClose={jest.fn()} />
        </ThemeProvider>
      );
      const title = screen.getByTestId('premium-locked-info-title');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('backdrop Pressable has accessible={false}', async () => {
      await render(
        <ThemeProvider>
          <PremiumLockedInfo visible={true} onClose={jest.fn()} />
        </ThemeProvider>
      );
      const backdrop = screen.getByTestId('premium-locked-info-backdrop', {
        includeHiddenElements: true,
      });
      expect(backdrop.props.accessible).toBe(false);
    });

    it('OK button remains individually reachable in accessibility tree', async () => {
      await render(
        <ThemeProvider>
          <PremiumLockedInfo visible={true} onClose={jest.fn()} />
        </ThemeProvider>
      );
      const okButton = screen.getByTestId('premium-locked-info-ok');
      expect(okButton).toBeTruthy();
      expect(okButton.props.accessibilityRole).toBe('button');
      expect(okButton.props.accessibilityLabel).toBe('OK');
    });
  });

  describe('6. Hijri Calendar Override Modal', () => {
    it('verifies override modal specification in hijri-calendar.tsx source code', () => {
      const content = fs.readFileSync('app/(tabs)/settings/hijri-calendar.tsx', 'utf8');
      expect(content).toContain('accessibilityViewIsModal={true}');
      expect(content).toContain('accessibilityRole="header"');
      expect(content).toContain('testID="add-override-modal"');
    });
  });
});
