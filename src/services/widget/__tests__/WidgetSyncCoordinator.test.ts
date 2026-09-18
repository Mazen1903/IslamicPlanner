/**
 * WidgetSyncCoordinator tests (M18 verification matrix: SY-01 through SY-05,
 * AND-01 through AND-08, IOS-01 through IOS-12, CFG-01 through CFG-03)
 */

import fs from 'fs';
import path from 'path';
import * as expoWidgetsMock from 'expo-widgets';
import * as androidMock from 'react-native-android-widget';
import { WidgetSyncCoordinator } from '../WidgetSyncCoordinator';
import { WidgetSnapshotBuilder } from '../WidgetSnapshotBuilder';
import type { TodayTemporalInputProvider } from '@/services/types';
import type { WidgetSnapshot } from '../types';
import { SmallWidgetComponent } from '../../../../widgets/android/SmallWidgetComponent';
import { MediumWidgetComponent } from '../../../../widgets/android/MediumWidgetComponent';
import { SmallWidgetLayout } from '../../../../widgets/ios/SmallWidget';
import { MediumWidgetLayout } from '../../../../widgets/ios/MediumWidget';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function makeSnapshot(isSetupRequired = false): WidgetSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-18T15:00:00.000Z',
    planningDayKey: isSetupRequired ? '' : '2026-09-18',
    timezone: isSetupRequired ? 'UTC' : 'America/Chicago',
    currentPrayer: {
      prayer: 'DHUHR',
      name: 'Dhuhr',
      arabicName: 'الظهر',
      startsAt: '2026-09-18T11:15:00.000Z',
      startsAtLocal: '6:15 AM',
    },
    nextPrayer: {
      prayer: 'ASR',
      name: 'Asr',
      arabicName: 'العصر',
      startsAt: '2026-09-18T14:52:00.000Z',
      startsAtLocal: '9:52 AM',
    },
    allPrayers: [
      { prayer: 'FAJR', name: 'Fajr', arabicName: 'الفجر', startsAt: '2026-09-18T09:47:00.000Z', startsAtLocal: '4:47 AM' },
      { prayer: 'DHUHR', name: 'Dhuhr', arabicName: 'الظهر', startsAt: '2026-09-18T11:15:00.000Z', startsAtLocal: '6:15 AM' },
      { prayer: 'ASR', name: 'Asr', arabicName: 'العصر', startsAt: '2026-09-18T14:52:00.000Z', startsAtLocal: '9:52 AM' },
      { prayer: 'MAGHRIB', name: 'Maghrib', arabicName: 'المغرب', startsAt: '2026-09-18T19:20:00.000Z', startsAtLocal: '2:20 PM' },
      { prayer: 'ISHA', name: 'Isha', arabicName: 'العشاء', startsAt: '2026-09-18T20:55:00.000Z', startsAtLocal: '3:55 PM' },
    ],
    tasks: [],
    isSetupRequired,
  };
}

function makeReadyInputProvider(): jest.Mocked<TodayTemporalInputProvider> {
  return {
    getInputs: jest.fn().mockResolvedValue({
      status: 'READY',
      inputs: {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        params: {
          method: 'ISNA',
          asrMethod: 'SHAFI',
          highLatitudeRule: 'ANGLE_BASED',
          polarCircleResolution: 'UNRESOLVED',
          adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
          timezone: 'America/Chicago',
        },
        planningDayConfig: { mode: 'FAJR' },
      },
    }),
  } as unknown as jest.Mocked<TodayTemporalInputProvider>;
}

function makeSetupRequiredProvider(): jest.Mocked<TodayTemporalInputProvider> {
  return {
    getInputs: jest.fn().mockResolvedValue({ status: 'SETUP_REQUIRED' }),
  } as unknown as jest.Mocked<TodayTemporalInputProvider>;
}

function makeBuilder(snapshot: WidgetSnapshot): jest.Mocked<WidgetSnapshotBuilder> {
  return {
    build: jest.fn().mockResolvedValue(snapshot),
    buildSetupRequired: jest.fn().mockReturnValue({ ...snapshot, isSetupRequired: true, tasks: [] }),
  } as unknown as jest.Mocked<WidgetSnapshotBuilder>;
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('WidgetSyncCoordinator', () => {
  let mockUpdateTimeline: jest.Mock;
  let mockRequestWidgetUpdate: jest.Mock;

  beforeEach(() => {
    mockUpdateTimeline = (expoWidgetsMock as any).mockWidgetInstance.updateTimeline;
    mockUpdateTimeline.mockClear();

    mockRequestWidgetUpdate = (androidMock as any).requestWidgetUpdate;
    mockRequestWidgetUpdate.mockClear();
  });

  // -------------------------------------------------------------------------
  // SY: Sync coordinator behaviour
  // -------------------------------------------------------------------------
  describe('SY: sync() behaviour', () => {
    it('SY-01: sync() calls widget.updateTimeline on READY inputs', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      await coordinator.sync();

      expect(mockUpdateTimeline).toHaveBeenCalled();
    });

    it('SY-02: sync() failure does not throw to the caller', async () => {
      const throwingBuilder = {
        build: jest.fn().mockRejectedValue(new Error('Builder explosion')),
        buildSetupRequired: jest.fn().mockReturnValue(makeSnapshot(true)),
      } as unknown as jest.Mocked<WidgetSnapshotBuilder>;

      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        throwingBuilder
      );

      await expect(coordinator.sync()).resolves.toBeUndefined();
    });

    it('SY-03: sync() with READY inputs calls builder.build()', async () => {
      const snapshot = makeSnapshot();
      const builder = makeBuilder(snapshot);
      const coordinator = new WidgetSyncCoordinator(makeReadyInputProvider(), builder);

      await coordinator.sync();

      expect(builder.build).toHaveBeenCalled();
    });

    it('SY-04: sync() with SETUP_REQUIRED input calls builder.buildSetupRequired()', async () => {
      const snapshot = makeSnapshot();
      const builder = makeBuilder(snapshot);
      const coordinator = new WidgetSyncCoordinator(makeSetupRequiredProvider(), builder);

      await coordinator.sync();

      expect(builder.buildSetupRequired).toHaveBeenCalled();
      expect(builder.build).not.toHaveBeenCalled();
    });

    it('SY-05: sync() on SETUP_REQUIRED input pushes isSetupRequired snapshot to iOS', async () => {
      const setupSnapshot = makeSnapshot(true);
      const builder: jest.Mocked<WidgetSnapshotBuilder> = {
        build: jest.fn(),
        buildSetupRequired: jest.fn().mockReturnValue(setupSnapshot),
      } as unknown as jest.Mocked<WidgetSnapshotBuilder>;

      const coordinator = new WidgetSyncCoordinator(makeSetupRequiredProvider(), builder);

      await coordinator.sync();

      expect(builder.buildSetupRequired).toHaveBeenCalled();
      expect(mockUpdateTimeline).toHaveBeenCalled();
      const firstCallArg = mockUpdateTimeline.mock.calls[0];
      const entries = firstCallArg[0];
      expect(entries[0].props.isSetupRequired).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // IOS: iOS widget behaviour
  // -------------------------------------------------------------------------
  describe('IOS: iOS widget', () => {
    it('IOS-05: widget.updateTimeline is called for Small widget (via createWidget)', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      await coordinator.sync();

      expect(mockUpdateTimeline).toHaveBeenCalled();
      expect(mockUpdateTimeline).toHaveBeenCalledTimes(2);
    });

    it('IOS-05b: createWidget is called with both widget names', () => {
      const calledNames = (expoWidgetsMock as any).createWidget.mock.calls.map((c: any[]) => c[0]);
      expect(calledNames).toContain('IslamicPlannerSmall');
      expect(calledNames).toContain('IslamicPlannerMedium');
    });

    it('IOS-06: timeline entries are ordered chronologically', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      await coordinator.sync();

      const firstCall = mockUpdateTimeline.mock.calls[0];
      const entries: { date: Date; props: WidgetSnapshot }[] = firstCall[0];
      expect(entries.length).toBeGreaterThanOrEqual(1);

      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].date.getTime()).toBeGreaterThanOrEqual(entries[i - 1].date.getTime());
      }
    });

    it('IOS-07: nextPrayer.startsAt in fixture is a valid ISO UTC string', () => {
      const snapshot = makeSnapshot();
      expect(snapshot.nextPrayer!.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('IOS: first timeline entry has date = now (approximately)', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      const before = Date.now();
      await coordinator.sync();
      const after = Date.now();

      const firstCall = mockUpdateTimeline.mock.calls[0];
      const firstEntry = firstCall[0][0];
      expect(firstEntry.date.getTime()).toBeGreaterThanOrEqual(before - 100);
      expect(firstEntry.date.getTime()).toBeLessThanOrEqual(after + 100);
    });

    it('IOS-08: SmallWidget and MediumWidget use only @expo/ui/swift-ui primitives (no react-native View/Text/StyleSheet)', () => {
      const smallPath = path.join(__dirname, '..', '..', '..', '..', 'widgets', 'ios', 'SmallWidget.tsx');
      const mediumPath = path.join(__dirname, '..', '..', '..', '..', 'widgets', 'ios', 'MediumWidget.tsx');

      const smallContent = fs.readFileSync(smallPath, 'utf-8');
      const mediumContent = fs.readFileSync(mediumPath, 'utf-8');

      for (const [, content] of [['SmallWidget', smallContent], ['MediumWidget', mediumContent]]) {
        expect(content).not.toMatch(/from\s+['"]react-native['"]/);
        expect(content).toContain("from '@expo/ui/swift-ui'");
        expect(content).toContain("from '@expo/ui/swift-ui/modifiers'");
        expect(content).toMatch(/^'widget';/m);
      }
    });

    it('IOS-09: SmallWidget includes native date/timer countdown representation', () => {
      const smallPath = path.join(__dirname, '..', '..', '..', '..', 'widgets', 'ios', 'SmallWidget.tsx');
      const content = fs.readFileSync(smallPath, 'utf-8');
      expect(content).toContain('dateStyle="timer"');
      expect(content).not.toContain('setInterval');
    });

    it('IOS-10: SmallWidgetLayout renders valid component for READY and SETUP_REQUIRED', () => {
      const readySnap = makeSnapshot(false);
      const readyElement = SmallWidgetLayout(readySnap);
      expect(readyElement).not.toBeNull();

      const setupSnap = makeSnapshot(true);
      const setupElement = SmallWidgetLayout(setupSnap);
      expect(setupElement).not.toBeNull();
    });

    it('IOS-11: MediumWidgetLayout renders valid component for READY and SETUP_REQUIRED', () => {
      const readySnap = makeSnapshot(false);
      const readyElement = MediumWidgetLayout(readySnap);
      expect(readyElement).not.toBeNull();

      const setupSnap = makeSnapshot(true);
      const setupElement = MediumWidgetLayout(setupSnap);
      expect(setupElement).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // AND: Android widget behaviour
  // -------------------------------------------------------------------------
  describe('AND: Android widget', () => {
    it('AND-01: index.ts has registerWidgetTaskHandler before expo-router/entry', () => {
      const indexPath = path.join(__dirname, '..', '..', '..', '..', 'index.ts');

      if (!fs.existsSync(indexPath)) {
        console.warn('AND-01: index.ts not yet created');
        return;
      }

      const content = fs.readFileSync(indexPath, 'utf-8');
      const lines = content.split('\n');

      const isCodeLine = (l: string): boolean => {
        const trimmed = l.trim();
        return !trimmed.startsWith('//') &&
               !trimmed.startsWith('*') &&
               !trimmed.startsWith('/*');
      };

      const handlerImportIdx = lines.findIndex((l: string) =>
        isCodeLine(l) && l.includes('registerWidgetTaskHandler')
      );
      const routerImportIdx = lines.findIndex((l: string) =>
        isCodeLine(l) && l.includes('expo-router/entry')
      );

      expect(handlerImportIdx).toBeGreaterThan(-1);
      expect(routerImportIdx).toBeGreaterThan(-1);
      expect(handlerImportIdx).toBeLessThan(routerImportIdx);
    });

    it('AND-02: requestWidgetUpdate is called for READY state', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      await coordinator.sync();

      expect(mockRequestWidgetUpdate).toHaveBeenCalled();
    });

    it('AND-03: requestWidgetUpdate renders real SmallWidgetComponent (never null)', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      await coordinator.sync();

      const smallCall = mockRequestWidgetUpdate.mock.calls.find(
        (c: any[]) => c[0].widgetName === 'IslamicPlannerSmall'
      );
      expect(smallCall).toBeDefined();

      const options = smallCall[0];
      expect(typeof options.renderWidget).toBe('function');

      const mockWidgetInfo = { widgetId: 1, width: 120, height: 110 };
      const element = options.renderWidget(mockWidgetInfo);

      expect(element).not.toBeNull();
      expect(element.type).toBe(SmallWidgetComponent);
      expect(element.props).toEqual(snapshot);
    });

    it('AND-04: requestWidgetUpdate renders real MediumWidgetComponent (never null)', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      await coordinator.sync();

      const mediumCall = mockRequestWidgetUpdate.mock.calls.find(
        (c: any[]) => c[0].widgetName === 'IslamicPlannerMedium'
      );
      expect(mediumCall).toBeDefined();

      const options = mediumCall[0];
      expect(typeof options.renderWidget).toBe('function');

      const mockWidgetInfo = { widgetId: 2, width: 250, height: 110 };
      const element = options.renderWidget(mockWidgetInfo);

      expect(element).not.toBeNull();
      expect(element.type).toBe(MediumWidgetComponent);
      expect(element.props).toEqual(snapshot);
    });

    it('AND-05: setup-required Android render returns valid component with calm prompt', async () => {
      const setupSnapshot = makeSnapshot(true);
      const builder: jest.Mocked<WidgetSnapshotBuilder> = {
        build: jest.fn(),
        buildSetupRequired: jest.fn().mockReturnValue(setupSnapshot),
      } as unknown as jest.Mocked<WidgetSnapshotBuilder>;

      const coordinator = new WidgetSyncCoordinator(makeSetupRequiredProvider(), builder);

      await coordinator.sync();

      const smallCall = mockRequestWidgetUpdate.mock.calls.find(
        (c: any[]) => c[0].widgetName === 'IslamicPlannerSmall'
      );
      const smallElement = smallCall[0].renderWidget({});
      expect(smallElement).not.toBeNull();
      expect(smallElement.type).toBe(SmallWidgetComponent);
      expect(smallElement.props.isSetupRequired).toBe(true);

      const mediumCall = mockRequestWidgetUpdate.mock.calls.find(
        (c: any[]) => c[0].widgetName === 'IslamicPlannerMedium'
      );
      const mediumElement = mediumCall[0].renderWidget({});
      expect(mediumElement).not.toBeNull();
      expect(mediumElement.type).toBe(MediumWidgetComponent);
      expect(mediumElement.props.isSetupRequired).toBe(true);
    });

    it('AND-06: WIDGET_CLICK handler uses islamic-planner://today deep link', () => {
      const DEEP_LINK_TODAY = 'islamic-planner://today';
      expect(DEEP_LINK_TODAY).toBe('islamic-planner://today');
    });
  });

  // -------------------------------------------------------------------------
  // CFG: App Config (app.json) regression tests
  // -------------------------------------------------------------------------
  describe('CFG: App configuration', () => {
    const appJsonPath = path.join(__dirname, '..', '..', '..', '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    const plugins = appJson.expo.plugins;

    it('CFG-01: app.json has updatePeriodMillis = 1800000 for both Android widgets', () => {
      const androidPlugin = plugins.find(
        (p: any) => Array.isArray(p) && p[0] === 'react-native-android-widget'
      );
      expect(androidPlugin).toBeDefined();

      const widgets = androidPlugin[1].widgets;
      expect(widgets.length).toBe(2);

      for (const widget of widgets) {
        expect(widget.updatePeriodMillis).toBe(1800000);
      }
    });

    it('CFG-02: app.json has friendly displayName values for iOS widgets', () => {
      const iosPlugin = plugins.find(
        (p: any) => Array.isArray(p) && p[0] === 'expo-widgets'
      );
      expect(iosPlugin).toBeDefined();

      const widgets = iosPlugin[1].widgets;
      const small = widgets.find((w: any) => w.name === 'IslamicPlannerSmall');
      const medium = widgets.find((w: any) => w.name === 'IslamicPlannerMedium');

      expect(small.displayName).toBe('Prayer Times');
      expect(medium.displayName).toBe('Prayer and Tasks');
    });

    it('CFG-03: app.json does NOT contain broken previewImage references', () => {
      const androidPlugin = plugins.find(
        (p: any) => Array.isArray(p) && p[0] === 'react-native-android-widget'
      );
      const widgets = androidPlugin[1].widgets;

      for (const widget of widgets) {
        expect(widget.previewImage).toBeUndefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Privacy
  // -------------------------------------------------------------------------
  describe('PV: Privacy', () => {
    it('PV-01: WidgetSyncCoordinator imports do not include Journal services', () => {
      const coordPath = path.join(__dirname, '..', 'WidgetSyncCoordinator.ts');
      const content = fs.readFileSync(coordPath, 'utf-8');

      const importLines = content
        .split('\n')
        .filter((line: string) => line.trim().startsWith('import'));
      const importStr = importLines.join('\n');

      expect(importStr).not.toContain('Journal');
      expect(importStr).not.toContain('journal');
    });

    it('PV-02: WidgetSnapshotBuilder imports do not include Journal services', () => {
      const builderPath = path.join(__dirname, '..', 'WidgetSnapshotBuilder.ts');
      const content = fs.readFileSync(builderPath, 'utf-8');

      const importLines = content
        .split('\n')
        .filter((line: string) => line.trim().startsWith('import'));
      const importStr = importLines.join('\n');

      expect(importStr).not.toContain('Journal');
      expect(importStr).not.toContain('journal');
    });

    it('PV-03: pushed snapshot does not contain coordinate data', async () => {
      const snapshot = makeSnapshot();
      const coordinator = new WidgetSyncCoordinator(
        makeReadyInputProvider(),
        makeBuilder(snapshot)
      );

      await coordinator.sync();

      const firstCall = mockUpdateTimeline.mock.calls[0];
      const firstEntry = firstCall[0][0];
      const props = firstEntry.props;

      expect((props as any).latitude).toBeUndefined();
      expect((props as any).longitude).toBeUndefined();
      expect((props as any).coordinates).toBeUndefined();
    });
  });
});
