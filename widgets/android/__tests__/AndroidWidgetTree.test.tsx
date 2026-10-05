import React from 'react';
import { SmallWidgetComponent } from '../SmallWidgetComponent';
import { MediumWidgetComponent } from '../MediumWidgetComponent';
import { toWidgetRepresentation } from '../renderWidget';
import type { WidgetSnapshot } from '@/services/widget/types';
import {
  DEFAULT_LIGHT_PALETTE,
  DEFAULT_DARK_PALETTE,
  DEFAULT_WIDGET_THEME,
} from '@/services/widget/types';

// Import internal buildWidgetTree from the library to test actual RemoteViews tree generation
const { buildWidgetTree } = require('react-native-android-widget/lib/commonjs/api/build-widget-tree');

const mockReadySnapshot: WidgetSnapshot = {
  schemaVersion: 2,
  generatedAt: '2026-09-18T15:00:00.000Z',
  planningDayKey: '2026-09-18',
  timezone: 'America/Chicago',
  currentPrayer: {
    prayer: 'DHUHR',
    name: 'Dhuhr',
    startsAt: '2026-09-18T12:45:00.000Z',
    startsAtLocal: '12:45 PM',
  },
  nextPrayer: {
    prayer: 'ASR',
    name: 'Asr',
    startsAt: '2026-09-18T16:15:00.000Z',
    startsAtLocal: '4:15 PM',
  },
  allPrayers: [
    { prayer: 'FAJR', name: 'Fajr', startsAt: '2026-09-18T05:00:00.000Z', startsAtLocal: '5:00 AM' },
    { prayer: 'DHUHR', name: 'Dhuhr', startsAt: '2026-09-18T12:45:00.000Z', startsAtLocal: '12:45 PM' },
    { prayer: 'ASR', name: 'Asr', startsAt: '2026-09-18T16:15:00.000Z', startsAtLocal: '4:15 PM' },
    { prayer: 'MAGHRIB', name: 'Maghrib', startsAt: '2026-09-18T18:50:00.000Z', startsAtLocal: '6:50 PM' },
    { prayer: 'ISHA', name: 'Isha', startsAt: '2026-09-18T20:10:00.000Z', startsAtLocal: '8:10 PM' },
  ],
  tasks: [
    {
      occurrenceId: 'occ-1',
      title: 'Read Quran Surah Al-Kahf',
      scheduleLabel: 'After Dhuhr',
      priority: 'IMPORTANT',
      sortInstant: '2026-09-18T13:00:00.000Z',
    },
    {
      occurrenceId: 'occ-2',
      title: 'Family Visit',
      scheduleLabel: '5:00 PM',
      priority: 'NORMAL',
      sortInstant: '2026-09-18T17:00:00.000Z',
    },
  ],
  isSetupRequired: false,
  theme: DEFAULT_WIDGET_THEME,
};

const mockSetupRequiredSnapshot: WidgetSnapshot = {
  schemaVersion: 2,
  generatedAt: '2026-09-18T15:00:00.000Z',
  planningDayKey: '2026-09-18',
  timezone: 'UTC',
  currentPrayer: {
    prayer: 'FAJR',
    name: 'Fajr',
    startsAt: '2026-09-18T05:00:00.000Z',
    startsAtLocal: '5:00 AM',
  },
  nextPrayer: null,
  allPrayers: [],
  tasks: [],
  isSetupRequired: true,
  theme: DEFAULT_WIDGET_THEME,
};

describe('AndroidWidgetTree (RemoteViews tree generation)', () => {
  describe('SmallWidgetComponent', () => {
    it('successfully builds widget tree for ready snapshot without crashing', () => {
      const element = (
        <SmallWidgetComponent
          snapshot={mockReadySnapshot}
          palette={DEFAULT_LIGHT_PALETTE}
        />
      );

      const tree = buildWidgetTree(element);
      expect(tree).toBeDefined();
      expect(tree.type).toBe('LinearLayoutWidget');
      expect(tree.props.clickAction).toBe('OPEN_URI');
      expect(tree.props.clickActionData).toEqual({ uri: 'islamic-planner://planner' });
    });

    it('successfully builds widget tree for setup required snapshot', () => {
      const element = (
        <SmallWidgetComponent
          snapshot={mockSetupRequiredSnapshot}
          palette={DEFAULT_LIGHT_PALETTE}
        />
      );

      const tree = buildWidgetTree(element);
      expect(tree).toBeDefined();
      expect(tree.type).toBe('LinearLayoutWidget');
      expect(tree.props.clickAction).toBe('OPEN_URI');
      expect(tree.props.clickActionData).toEqual({ uri: 'islamic-planner://planner' });
    });
  });

  describe('MediumWidgetComponent', () => {
    it('successfully builds widget tree with task click actions', () => {
      const element = (
        <MediumWidgetComponent
          snapshot={mockReadySnapshot}
          palette={DEFAULT_LIGHT_PALETTE}
        />
      );

      const tree = buildWidgetTree(element);
      expect(tree).toBeDefined();
      expect(tree.type).toBe('LinearLayoutWidget');
      expect(tree.props.clickAction).toBe('OPEN_URI');
      expect(tree.props.clickActionData).toEqual({ uri: 'islamic-planner://planner' });

      // Find children with task clickAction
      const taskNodes: any[] = [];
      function findTaskActions(node: any) {
        if (!node) return;
        if (node.props?.clickAction === 'OPEN_URI' && node.props?.clickActionData?.uri?.startsWith('islamic-planner://task/')) {
          taskNodes.push(node);
        }
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(findTaskActions);
        }
      }
      findTaskActions(tree);

      expect(taskNodes.length).toBe(2);
      expect(taskNodes[0].props.clickActionData.uri).toBe('islamic-planner://task/occ-1');
      expect(taskNodes[1].props.clickActionData.uri).toBe('islamic-planner://task/occ-2');
    });

    it('successfully builds widget tree when tasks list is empty', () => {
      const noTasksSnapshot = { ...mockReadySnapshot, tasks: [] };
      const element = (
        <MediumWidgetComponent
          snapshot={noTasksSnapshot}
          palette={DEFAULT_LIGHT_PALETTE}
        />
      );

      const tree = buildWidgetTree(element);
      expect(tree).toBeDefined();
      expect(tree.type).toBe('LinearLayoutWidget');
    });
  });

  describe('toWidgetRepresentation', () => {
    it('returns dual representation in SYSTEM mode and both compile to valid trees', () => {
      const rep = toWidgetRepresentation(mockReadySnapshot, SmallWidgetComponent);
      expect(rep).toHaveProperty('light');
      expect(rep).toHaveProperty('dark');

      const dual = rep as { light: React.JSX.Element; dark: React.JSX.Element };
      const lightTree = buildWidgetTree(dual.light);
      const darkTree = buildWidgetTree(dual.dark);

      expect(lightTree.type).toBe('LinearLayoutWidget');
      expect(darkTree.type).toBe('LinearLayoutWidget');
    });

    it('returns single representation in FIXED mode', () => {
      const fixedSnapshot: WidgetSnapshot = {
        ...mockReadySnapshot,
        theme: {
          mode: 'FIXED',
          light: DEFAULT_DARK_PALETTE,
          dark: DEFAULT_DARK_PALETTE,
        },
      };

      const rep = toWidgetRepresentation(fixedSnapshot, MediumWidgetComponent);
      expect(rep).not.toHaveProperty('light');
      const tree = buildWidgetTree(rep as React.JSX.Element);
      expect(tree.type).toBe('LinearLayoutWidget');
    });
  });
});
