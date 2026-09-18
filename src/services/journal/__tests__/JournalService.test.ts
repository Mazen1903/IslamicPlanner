import { DateTime } from 'luxon';
import { JournalService } from '../JournalService';
import { JournalRepository } from '@/data/repositories/JournalRepository';
import { JournalCryptoService } from '../JournalCryptoService';
import { JournalKeyManager, type SecureStorage } from '../JournalKeyManager';
import {
  createTestDatabase,
  cleanupTestDatabase,
} from '@/data/__tests__/testDbHelper';
import {
  StaticTodayTemporalInputProvider,
} from '@/services/TodayTemporalInputProvider';
import type { TodayTemporalInputProvider, TodayTemporalInputResult, TodayTemporalInputs } from '@/services/types';
import type { JournalPayload } from '@/domain/journal/types';
import { StaleWriteError, JournalEncryptionError } from '@/domain/journal/errors';

class MemorySecureStorage implements SecureStorage {
  private store: Record<string, string> = {};

  async getItemAsync(key: string): Promise<string | null> {
    return this.store[key] ?? null;
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.store[key] = value;
  }
}

describe('JournalService', () => {
  let repository: JournalRepository;
  let cryptoService: JournalCryptoService;
  let keyManager: JournalKeyManager;
  let service: JournalService;

  const samplePayload: JournalPayload = {
    body: 'Reflections after Maghrib prayer.',
    reflections: {
      gratitude: 'Grateful for patience during a challenging day.',
      wentWell: 'Read Surah Al-Kahf with understanding.',
      improvement: 'Be more mindful during duhr prayer.',
      dua: 'Allahumma inni as-aluka al-afwa wal-afiyah.',
    },
  };

  const sampleInputsFajr: TodayTemporalInputs = {
    coordinates: { latitude: 41.8781, longitude: -87.6298 },
    params: {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/Chicago',
    },
    planningDayConfig: { mode: 'FAJR' },
  };

  beforeEach(() => {
    createTestDatabase();
    repository = new JournalRepository();
    cryptoService = new JournalCryptoService();
    keyManager = new JournalKeyManager(new MemorySecureStorage());
    service = new JournalService(
      repository,
      cryptoService,
      keyManager,
      new StaticTodayTemporalInputProvider(sampleInputsFajr)
    );
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('JS-01: Save new entry — encrypts and persists without plaintext in DB', async () => {
    const entry = await service.saveEntry({
      planningDayKey: '2026-09-15',
      payload: samplePayload,
    });

    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.planningDayKey).toBe('2026-09-15');
    expect(entry.revision).toBe(1);
    expect(entry.payload).toEqual(samplePayload);

    // Verify row in database is encrypted
    const row = await repository.findByPlanningDayKey('2026-09-15');
    expect(row).not.toBeNull();
    expect(row!.encryptedPayload).not.toContain('Reflections after Maghrib');
    expect(() => JSON.parse(row!.encryptedPayload)).toThrow();
  });

  it('JS-02: Load entry — decrypts and returns JournalPayload', async () => {
    await service.saveEntry({
      planningDayKey: '2026-09-15',
      payload: samplePayload,
    });

    const loaded = await service.loadEntry('2026-09-15');
    expect(loaded).not.toBeNull();
    expect(loaded!.planningDayKey).toBe('2026-09-15');
    expect(loaded!.payload).toEqual(samplePayload);
    expect(loaded!.revision).toBe(1);

    const nonexistent = await service.loadEntry('2099-01-01');
    expect(nonexistent).toBeNull();
  });

  it('JS-03: Update entry — revision incremented, content updated', async () => {
    const initial = await service.saveEntry({
      planningDayKey: '2026-09-16',
      payload: samplePayload,
    });
    expect(initial.revision).toBe(1);

    const updatedPayload: JournalPayload = {
      ...samplePayload,
      body: 'Updated journal prose later in the evening.',
    };

    const updated = await service.saveEntry({
      planningDayKey: '2026-09-16',
      payload: updatedPayload,
      revision: 1,
    });

    expect(updated.id).toBe(initial.id);
    expect(updated.revision).toBe(2);
    expect(updated.payload.body).toBe('Updated journal prose later in the evening.');

    const reloaded = await service.loadEntry('2026-09-16');
    expect(reloaded!.revision).toBe(2);
    expect(reloaded!.payload.body).toBe('Updated journal prose later in the evening.');
  });

  it('JS-04: Stale write rejected', async () => {
    await service.saveEntry({
      planningDayKey: '2026-09-17',
      payload: samplePayload,
    });

    // Provide stale revision
    await expect(
      service.saveEntry({
        planningDayKey: '2026-09-17',
        payload: { ...samplePayload, body: 'Stale overwrite attempt' },
        revision: 0,
      })
    ).rejects.toThrow(StaleWriteError);
  });

  it('JS-05: Delete entry — row removed', async () => {
    const entry = await service.saveEntry({
      planningDayKey: '2026-09-18',
      payload: samplePayload,
    });

    const deleted = await service.deleteEntry(entry.id);
    expect(deleted).toBe(true);

    const loaded = await service.loadEntry('2026-09-18');
    expect(loaded).toBeNull();
  });

  it('JS-06: List history — returns metadata without decrypted content', async () => {
    await service.saveEntry({
      planningDayKey: '2026-09-10',
      payload: samplePayload,
    });
    await service.saveEntry({
      planningDayKey: '2026-09-11',
      payload: samplePayload,
    });

    const history = await service.listHistory();
    expect(history.length).toBe(2);
    expect((history[0] as any).payload).toBeUndefined();
    expect((history[0] as any).encryptedPayload).toBeUndefined();
    expect(history[0].planningDayKey).toBeDefined();
    expect(history[0].revision).toBeDefined();
    expect(history[0].createdAt).toBeDefined();
    expect(history[0].updatedAt).toBeDefined();
  });

  it('JS-07: Pre-Fajr planning day ownership (FAJR mode)', async () => {
    // 2:00 AM on Tuesday Sep 16, 2026 in Chicago
    // Fajr is around 5:15 AM, so 2:00 AM belongs to Monday Sep 15's planning day
    const preFajrTime = DateTime.fromISO('2026-09-16T02:00:00', {
      zone: 'America/Chicago',
    });

    const key = await service.getCurrentPlanningDayKey(preFajrTime);
    expect(key).toBe('2026-09-15');
  });

  it('JS-08: MIDNIGHT planning day ownership', async () => {
    const midnightInputs: TodayTemporalInputs = {
      ...sampleInputsFajr,
      planningDayConfig: { mode: 'MIDNIGHT' },
    };
    const midnightService = new JournalService(
      repository,
      cryptoService,
      keyManager,
      new StaticTodayTemporalInputProvider(midnightInputs)
    );

    // 2:00 AM on Tuesday Sep 16 under MIDNIGHT mode belongs to Tuesday Sep 16
    const time = DateTime.fromISO('2026-09-16T02:00:00', {
      zone: 'America/Chicago',
    });

    const key = await midnightService.getCurrentPlanningDayKey(time);
    expect(key).toBe('2026-09-16');
  });

  it('JS-09: SETUP_REQUIRED — returns null, no GPS prompt', async () => {
    const setupRequiredProvider: TodayTemporalInputProvider = {
      async getInputs(): Promise<TodayTemporalInputResult> {
        return { status: 'SETUP_REQUIRED' };
      },
    };

    const unconfiguredService = new JournalService(
      repository,
      cryptoService,
      keyManager,
      setupRequiredProvider
    );

    const key = await unconfiguredService.getCurrentPlanningDayKey();
    expect(key).toBeNull();
  });

  it('JS-10: Failed encryption — no plaintext persisted', async () => {
    const failingCryptoService = new JournalCryptoService();
    jest.spyOn(failingCryptoService, 'encrypt').mockRejectedValueOnce(
      new JournalEncryptionError('Encryption failure simulation')
    );

    const failingService = new JournalService(
      repository,
      failingCryptoService,
      keyManager,
      new StaticTodayTemporalInputProvider(sampleInputsFajr)
    );

    await expect(
      failingService.saveEntry({
        planningDayKey: '2026-09-19',
        payload: samplePayload,
      })
    ).rejects.toThrow(JournalEncryptionError);

    // Verify nothing was saved in repository
    const row = await repository.findByPlanningDayKey('2026-09-19');
    expect(row).toBeNull();
  });

  it('JS-11: Failed DB write — error propagates without corrupted state', async () => {
    jest.spyOn(repository, 'save').mockRejectedValueOnce(
      new Error('Disk full')
    );

    await expect(
      service.saveEntry({
        planningDayKey: '2026-09-20',
        payload: samplePayload,
      })
    ).rejects.toThrow('Disk full');

    const row = await repository.findByPlanningDayKey('2026-09-20');
    expect(row).toBeNull();
  });
});
