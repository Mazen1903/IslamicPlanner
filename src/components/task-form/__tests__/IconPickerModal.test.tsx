import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { IconPickerModal } from '../IconPickerModal';
import { searchTaskIcons, detectTaskIcon, getIconIdFromTags, setIconInTags } from '@/constants/taskIcons';

describe('IconPickerModal & taskIcons catalog', () => {
  it('searches icons by keyword matching', () => {
    const results = searchTaskIcons('quran');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(i => i.id === 'quran')).toBe(true);

    const prayerResults = searchTaskIcons('prayer');
    expect(prayerResults.some(i => i.id === 'duaa' || i.id === 'mosque')).toBe(true);
  });

  it('detects icon from task title', () => {
    expect(detectTaskIcon('Read Quran')).toBe('quran');
    expect(detectTaskIcon('Drink 8 glasses of water')).toBe('water-hydration');
    expect(detectTaskIcon('Go for a walk')).toBe('walk');
    expect(detectTaskIcon('Grocery shopping for family')).toBe('groceries');
  });

  it('extracts and sets icon in tags', () => {
    const tags = ['urgent', 'icon:mosque', 'deen'];
    expect(getIconIdFromTags(tags)).toBe('mosque');

    const updated = setIconInTags(tags, 'quran');
    expect(updated).toContain('icon:quran');
    expect(updated).not.toContain('icon:mosque');
    expect(updated).toContain('urgent');

    const cleared = setIconInTags(tags, null);
    expect(cleared).not.toContain('icon:mosque');
    expect(cleared).toEqual(['urgent', 'deen']);
  });

  it('renders IconPickerModal and selects an icon', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <IconPickerModal
          visible={true}
          selectedIconId="quran"
          onSelectIcon={onSelect}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    expect(getByTestId('icon-picker-safe-area')).toBeTruthy();
    expect(getByTestId('icon-search-input')).toBeTruthy();
    expect(getByText('Choose Task Icon')).toBeTruthy();

    // Type in search query
    await fireEvent.changeText(getByTestId('icon-search-input'), 'water');
    expect(getByTestId('icon-item-water-hydration')).toBeTruthy();

    // Press icon item
    await fireEvent.press(getByTestId('icon-item-water-hydration'));
    expect(onSelect).toHaveBeenCalledWith('water-hydration');
  });
});
