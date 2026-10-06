import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OccasionBanner } from '../OccasionBanner';
import type { Occasion } from '@/domain/calendar/IslamicOccasions';
import { useAddTaskModalStore } from '@/stores/useAddTaskModalStore';

describe('OccasionBanner', () => {
  const sampleOccasions: Occasion[] = [
    {
      id: 'ashura',
      name: 'Day of Ashura',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'teal',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: 'Fast on the Day of Ashura',
      description: 'The day Allah saved Prophet Musa and his people.',
    },
    {
      id: 'eid-fitr',
      name: 'Eid al-Fitr',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'gold',
      fastingAllowed: false,
      isFastingDay: false,
      suggestedTaskTitle: 'Attend Eid al-Fitr prayer & Takbeerat',
      description: 'Festival of breaking the fast.',
    },
    {
      id: 'jumuah',
      name: "Jumu'ah",
      tier: 'RECURRING',
      group: 'SUNNAH',
      tint: 'teal',
      fastingAllowed: true,
      isFastingDay: false,
      suggestedTaskTitle: 'Read Surah Al-Kahf & attend Jumu\'ah prayer',
      description: 'Blessed Friday weekly congregation.',
    },
  ];

  it('renders occasions with their names, descriptions, and fasting status', async () => {
    const { getByText, getByTestId } = await render(
      <ThemeProvider>
        <OccasionBanner
          occasions={sampleOccasions}
          selectedDate="2026-09-18"
        />
      </ThemeProvider>
    );

    expect(getByText('Day of Ashura')).toBeTruthy();
    expect(getByText('Eid al-Fitr')).toBeTruthy();
    expect(getByText("Jumu'ah")).toBeTruthy();
    expect(getByText('Sunnah Fast')).toBeTruthy(); // for Ashura
    expect(getByText('Fasting Prohibited (Haram)')).toBeTruthy(); // for Eid
    expect(getByTestId('occasion-card-ashura')).toBeTruthy();
    expect(getByTestId('occasion-card-eid-fitr')).toBeTruthy();
    expect(getByTestId('occasion-card-jumuah')).toBeTruthy();
  });

  it('does NOT render Sunnah Fast badge for Friday Jumuah', async () => {
    const jumuahOccasion = sampleOccasions[2];
    const { queryByText, getByText } = await render(
      <ThemeProvider>
        <OccasionBanner
          occasions={[jumuahOccasion]}
          selectedDate="2026-09-18"
        />
      </ThemeProvider>
    );

    expect(getByText("Jumu'ah")).toBeTruthy();
    // Invariant: Friday Jumuah must NOT have a "Sunnah Fast" badge
    expect(queryByText('Sunnah Fast')).toBeNull();
    expect(queryByText('Fasting Prohibited (Haram)')).toBeNull();
  });

  it('triggers openModal when Add to my plan is pressed for a future date', async () => {
    const openModalSpy = jest.spyOn(useAddTaskModalStore.getState(), 'openModal');

    const { getByTestId } = await render(
      <ThemeProvider>
        <OccasionBanner
          occasions={[sampleOccasions[0]]}
          selectedDate="2099-01-01"
        />
      </ThemeProvider>
    );

    const button = getByTestId('add-occasion-task-ashura');
    fireEvent.press(button);

    expect(openModalSpy).toHaveBeenCalledWith(
      undefined,
      undefined,
      '2099-01-01',
      'Fast on the Day of Ashura'
    );
  });

  it('renders nothing when occasions array is empty', async () => {
    const { queryByTestId } = await render(
      <ThemeProvider>
        <OccasionBanner occasions={[]} selectedDate="2026-09-18" />
      </ThemeProvider>
    );

    expect(queryByTestId('occasion-banner-container')).toBeNull();
  });
});
