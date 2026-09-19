import React from 'react';
import { I18nManager } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { SettingsScreenHeader } from '@/components/settings/SettingsScreenHeader';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { JournalHistory } from '@/components/journal/JournalHistory';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { JournalHistoryRow } from '@/components/journal/JournalHistoryRow';
import { CompletedSection } from '@/components/task/CompletedSection';
import { AnytimeTodaySection } from '@/components/task/AnytimeTodaySection';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

function flattenStyles(style: any): any {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyles));
  }
  return style;
}

function findIconTexts(tree: any): any[] {
  const results: any[] = [];
  function recurse(node: any) {
    if (!node) return;
    if (
      node.type === 'Text' &&
      node.props?.style &&
      (JSON.stringify(node.props.style).includes('ionicons') ||
       JSON.stringify(node.props.style).includes('MaterialCommunityIcons'))
    ) {
      results.push(node);
    }
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (typeof child === 'object') recurse(child);
      }
    }
  }
  recurse(tree);
  return results;
}

describe('Group I: Directional Icons RTL Contract', () => {
  const originalIsRTL = I18nManager.isRTL;

  afterEach(() => {
    Object.defineProperty(I18nManager, 'isRTL', {
      configurable: true,
      enumerable: true,
      value: originalIsRTL,
    });
  });

  function setRTL(isRTL: boolean) {
    Object.defineProperty(I18nManager, 'isRTL', {
      configurable: true,
      enumerable: true,
      value: isRTL,
    });
  }

  // I-1
  it('I-1: Icon renders no scaleX transform when directional={false} and isRTL=true', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <Icon name="chevron-right" size={20} color="#000" directional={false} />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(1);
    const style = flattenStyles(icons[0].props.style);
    expect(style.transform).toBeUndefined();
  });

  // I-2
  it('I-2: Icon renders scaleX: -1 transform when directional={true} and isRTL=true', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <Icon name="chevron-right" size={20} color="#000" directional={true} />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(1);
    const style = flattenStyles(icons[0].props.style);
    expect(style.transform).toEqual([{ scaleX: -1 }]);
  });

  // I-3
  it('I-3: Icon renders no transform when directional={true} and isRTL=false', async () => {
    setRTL(false);
    await render(
      <ThemeProvider>
        <Icon name="chevron-right" size={20} color="#000" directional={true} />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(1);
    const style = flattenStyles(icons[0].props.style);
    expect(style.transform).toBeUndefined();
  });

  // I-4
  it('I-4: SettingsScreenHeader back icon has directional prop', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <SettingsScreenHeader title="Test Settings" onBack={jest.fn()} />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(1);
    const style = flattenStyles(icons[0].props.style);
    expect(style.transform).toEqual([{ scaleX: -1 }]);
  });

  // I-5
  it('I-5: CalendarHeader prev-month icon has directional prop', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <CalendarHeader
          gregorianTitle="September 2026"
          hijriHeaderSpan="Rabi al-Awwal 1448 AH"
          onPreviousMonth={jest.fn()}
          onNextMonth={jest.fn()}
          onTodayPress={jest.fn()}
        />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(2);
    // Both chevron-left and chevron-right mirror
    const prevStyle = flattenStyles(icons[0].props.style);
    expect(prevStyle.transform).toEqual([{ scaleX: -1 }]);
  });

  // I-6
  it('I-6: CalendarHeader next-month icon has directional prop', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <CalendarHeader
          gregorianTitle="September 2026"
          hijriHeaderSpan="Rabi al-Awwal 1448 AH"
          onPreviousMonth={jest.fn()}
          onNextMonth={jest.fn()}
          onTodayPress={jest.fn()}
        />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(2);
    const nextStyle = flattenStyles(icons[1].props.style);
    expect(nextStyle.transform).toEqual([{ scaleX: -1 }]);
  });

  // I-7
  it('I-7: JournalHistory back icon has directional prop', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <JournalHistory
          entries={[]}
          onSelectEntry={jest.fn()}
          onBackToToday={jest.fn()}
        />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    // Back icon is the chevron-left
    const backIcon = icons.find((i) => {
      const style = flattenStyles(i.props.style);
      return style.transform && style.transform[0]?.scaleX === -1;
    });
    expect(backIcon).toBeTruthy();
  });

  // I-8
  it('I-8: SettingsRow disclosure chevron-right has directional prop', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <SettingsRow label="Test Row" onPress={jest.fn()} />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(1);
    const style = flattenStyles(icons[0].props.style);
    expect(style.transform).toEqual([{ scaleX: -1 }]);
  });

  // I-9
  it('I-9: JournalHistoryRow disclosure chevron-right has directional prop', async () => {
    setRTL(true);
    await render(
      <ThemeProvider>
        <JournalHistoryRow
          metadata={{
            id: 'entry-1',
            planningDayKey: '2026-09-18',
            revision: 1,
            createdAt: '2026-09-18T05:00:00Z',
            updatedAt: '2026-09-18T10:00:00Z',
          }}
          gregorianDisplay="Sep 18, 2026"
          hijriDisplay="3 Rabi al-Awwal 1448"
          onPress={jest.fn()}
        />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(1);
    const style = flattenStyles(icons[0].props.style);
    expect(style.transform).toEqual([{ scaleX: -1 }]);
  });

  // I-10
  it('I-10: CompletedSection collapsed chevron-right has directional prop', async () => {
    setRTL(true);
    const dummyTask: any = {
      occurrenceId: 'occ-1',
      taskId: 'task-1',
      title: 'Done Task',
      state: 'COMPLETED',
      priority: 'NORMAL',
    };
    await render(
      <ThemeProvider>
        <CompletedSection
          tasks={[dummyTask]}
          collapsed={true}
          onToggleCollapsed={jest.fn()}
        />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    expect(icons.length).toBe(1);
    const style = flattenStyles(icons[0].props.style);
    expect(style.transform).toEqual([{ scaleX: -1 }]);
  });

  // I-11
  it('I-11: AnytimeTodaySection collapsed chevron-right has directional prop', async () => {
    setRTL(true);
    const dummyTask: any = {
      occurrenceId: 'occ-2',
      taskId: 'task-2',
      title: 'Anytime Task',
      state: 'PENDING',
      priority: 'NORMAL',
    };
    await render(
      <ThemeProvider>
        <AnytimeTodaySection
          tasks={[dummyTask]}
          collapsed={true}
          onToggleCollapsed={jest.fn()}
          onComplete={jest.fn()}
        />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    // Icons: sun (not directional), chevron-right (directional)
    const directionalIcon = icons.find((i) => {
      const style = flattenStyles(i.props.style);
      return style.transform && style.transform[0]?.scaleX === -1;
    });
    expect(directionalIcon).toBeTruthy();
  });

  // I-12
  it('I-12: chevron-down is never given directional prop (vertical, not mirrored)', async () => {
    setRTL(true);
    const dummyTask: any = {
      occurrenceId: 'occ-3',
      taskId: 'task-3',
      title: 'Expanded Done Task',
      state: 'COMPLETED',
      priority: 'NORMAL',
    };
    await render(
      <ThemeProvider>
        <CompletedSection
          tasks={[dummyTask]}
          collapsed={false}
          onToggleCollapsed={jest.fn()}
        />
      </ThemeProvider>
    );
    const icons = findIconTexts(screen.toJSON());
    // Icons: header chevron-down (not directional), plus any icons inside TaskCard
    const headerChevron = icons[0];
    const style = flattenStyles(headerChevron.props.style);
    // chevron-down is NOT mirrored!
    expect(style.transform).toBeUndefined();
  });
});
