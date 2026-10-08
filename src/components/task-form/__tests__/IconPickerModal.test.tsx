import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { ThemeProvider } from '@/theme';
import { IconPickerModal } from '../IconPickerModal';
import { searchTaskIcons, detectTaskIcon, getIconIdFromTags, setIconInTags, ALL_TASK_ICONS } from '@/constants/taskIcons';

let mockIsPremium = false;
jest.mock('@/hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    isLoading: false,
    isPremium: mockIsPremium,
    tier: mockIsPremium ? 'PREMIUM' : 'FREE',
    hasFeature: () => mockIsPremium,
    error: null,
    reload: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('IconPickerModal & taskIcons catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, 'timing').mockImplementation((value: any, config: any) => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        value.setValue(config.toValue);
        callback?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
    expect(detectTaskIcon('')).toBe('pencil');
    expect(detectTaskIcon(null)).toBe('pencil');
    expect(detectTaskIcon('BlahBlahBlah123')).toBe('pencil');
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

  it('renders expanding IconPickerModal with placeholder Search icons and selects an icon (premium)', async () => {
    mockIsPremium = true;
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByTestId, getByText, getByPlaceholderText, queryByTestId } = await render(
      <ThemeProvider>
        <IconPickerModal
          visible={true}
          selectedIconId="quran"
          origin={{ x: 24, y: 120, width: 50, height: 50 }}
          onSelectIcon={onSelect}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    expect(getByTestId('icon-picker-container')).toBeTruthy();
    expect(getByTestId('icon-picker-safe-area')).toBeTruthy();
    expect(getByPlaceholderText('Search icons')).toBeTruthy();
    expect(getByText('Choose Task Icon')).toBeTruthy();

    // Type in search query
    await fireEvent.changeText(getByTestId('icon-search-input'), 'water');
    expect(getByTestId('icon-item-water-hydration')).toBeTruthy();

    // Press icon item
    await fireEvent.press(getByTestId('icon-item-water-hydration'));
    expect(onSelect).toHaveBeenCalledWith('water-hydration');
    expect(queryByTestId('paywall-sheet')).toBeNull();
  });

  it('blocks icon selection and opens the paywall for free users', async () => {
    mockIsPremium = false;
    const onSelect = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <IconPickerModal
          visible={true}
          selectedIconId={null}
          onSelectIcon={onSelect}
          onClose={jest.fn()}
        />
      </ThemeProvider>
    );

    await fireEvent.changeText(getByTestId('icon-search-input'), 'quran');
    await fireEvent.press(getByTestId('icon-item-quran'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(getByTestId('paywall-sheet')).toBeTruthy();
  });

  it('invokes onClose when close button is pressed', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <IconPickerModal
          visible={true}
          selectedIconId="quran"
          onSelectIcon={onSelect}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    const closeBtn = getByTestId('close-icon-picker');
    await fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('searches and finds newly added curated icons', () => {
    const tahajjudResults = searchTaskIcons('tahajjud');
    expect(tahajjudResults.some(i => i.id === 'tahajjud')).toBe(true);

    const sunnahSportResults = searchTaskIcons('archery');
    expect(sunnahSportResults.some(i => i.id === 'archery')).toBe(true);

    const zakatResults = searchTaskIcons('zakat');
    expect(zakatResults.some(i => i.id === 'zakat')).toBe(true);

    const miswakResults = searchTaskIcons('siwak');
    expect(miswakResults.some(i => i.id === 'miswak')).toBe(true);

    // Verify 24 new lifestyle icons
    expect(searchTaskIcons('barber').some(i => i.id === 'haircut')).toBe(true);
    expect(searchTaskIcons('wardrobe').some(i => i.id === 'clothing')).toBe(true);
    expect(searchTaskIcons('stroller').some(i => i.id === 'stroller')).toBe(true);
    expect(searchTaskIcons('wash car').some(i => i.id === 'car-wash')).toBe(true);
    expect(searchTaskIcons('restaurant').some(i => i.id === 'restaurant')).toBe(true);
    expect(searchTaskIcons('burger').some(i => i.id === 'fast-food')).toBe(true);
    expect(searchTaskIcons('football').some(i => i.id === 'soccer')).toBe(true);
    expect(searchTaskIcons('basketball').some(i => i.id === 'basketball')).toBe(true);
    expect(searchTaskIcons('tennis').some(i => i.id === 'tennis')).toBe(true);
    expect(searchTaskIcons('beach').some(i => i.id === 'beach')).toBe(true);
    expect(searchTaskIcons('camping').some(i => i.id === 'camping')).toBe(true);
    expect(searchTaskIcons('hotel').some(i => i.id === 'hotel')).toBe(true);
    expect(searchTaskIcons('shifa').some(i => i.id === 'shifa-honey')).toBe(true);
    expect(searchTaskIcons('exam').some(i => i.id === 'exam')).toBe(true);
    expect(searchTaskIcons('backpack').some(i => i.id === 'backpack')).toBe(true);
    expect(searchTaskIcons('arabic').some(i => i.id === 'language')).toBe(true);
    expect(searchTaskIcons('reminder').some(i => i.id === 'bell')).toBe(true);
    expect(searchTaskIcons('sparkles').some(i => i.id === 'sparkles')).toBe(true);
    expect(searchTaskIcons('lightning').some(i => i.id === 'lightning')).toBe(true);
    expect(searchTaskIcons('battery').some(i => i.id === 'battery')).toBe(true);
    expect(searchTaskIcons('bookmark').some(i => i.id === 'bookmark')).toBe(true);
    expect(searchTaskIcons('hourglass').some(i => i.id === 'hourglass')).toBe(true);
    expect(searchTaskIcons('finish line').some(i => i.id === 'flag-checkered')).toBe(true);
  });

  it('detects new icons from task titles correctly', () => {
    expect(detectTaskIcon('Pray Tahajjud before Fajr')).toBe('tahajjud');
    expect(detectTaskIcon('Calculate annual Zakat')).toBe('zakat');
    expect(detectTaskIcon('Going swimming this afternoon')).toBe('swimming');
    expect(detectTaskIcon('Use miswak after meal')).toBe('miswak');

    // New lifestyle detection
    expect(detectTaskIcon('Get a haircut at barber')).toBe('haircut');
    expect(detectTaskIcon('Wash car detailing')).toBe('car-wash');
    expect(detectTaskIcon('Soccer practice tonight')).toBe('soccer');
    expect(detectTaskIcon('Prepare for finals exam')).toBe('exam');
    expect(detectTaskIcon('Book a hotel room')).toBe('hotel');
  });

  it('guarantees 100% of icons have custom 3D image assets (zero monochrome vector fallbacks)', () => {
    expect(ALL_TASK_ICONS.length).toBe(149);
    for (const icon of ALL_TASK_ICONS) {
      expect(icon.imageAsset).toBeDefined();
      expect(icon.imageAsset).not.toBeNull();
    }
  });
});


