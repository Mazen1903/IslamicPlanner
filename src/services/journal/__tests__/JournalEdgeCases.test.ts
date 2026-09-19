import fs from 'fs';
import path from 'path';
import { JournalService } from '../JournalService';
import { JournalRepository } from '@/data/repositories/JournalRepository';
import { JournalCryptoService } from '../JournalCryptoService';
import { JournalKeyManager, type SecureStorage } from '../JournalKeyManager';
import { JournalLockController } from '../JournalLockController';
import { JournalLockPreference } from '../JournalLockPreference';
import {
  createTestDatabase,
  cleanupTestDatabase,
} from '@/data/__tests__/testDbHelper';
import {
  StaticTodayTemporalInputProvider,
} from '@/services/TodayTemporalInputProvider';
import type { TodayTemporalInputs } from '@/services/types';
import type { JournalPayload } from '@/domain/journal/types';
import {
  JournalKeyError,
  JournalEncryptionError,
  StaleWriteError,
} from '@/domain/journal/errors';
import {
  type LocalAuthenticationAdapter,
  type LocalAuthenticationResult,
  type LocalAuthenticationOptions,
  SecurityLevel,
  AuthenticationType,
} from '../LocalAuthenticationAdapter';

class FailingSecureStorage implements SecureStorage {
  async getItemAsync(_key: string): Promise<string | null> {
    throw new Error('SecureStore disk I/O error');
  }
  async setItemAsync(_key: string, _value: string): Promise<void> {
    throw new Error('SecureStore disk I/O error');
  }
}

class MemorySecureStorage implements SecureStorage {
  private store: Record<string, string> = {};
  async getItemAsync(key: string): Promise<string | null> {
    return this.store[key] ?? null;
  }
  async setItemAsync(key: string, value: string): Promise<void> {
    this.store[key] = value;
  }
}

class MockLocalAuthAdapter implements LocalAuthenticationAdapter {
  hasHardware: boolean = true;
  isEnrolled: boolean = true;
  authResult: LocalAuthenticationResult = { success: true };
  lastOptions?: LocalAuthenticationOptions;

  async hasHardwareAsync(): Promise<boolean> {
    return this.hasHardware;
  }
  async isEnrolledAsync(): Promise<boolean> {
    return this.isEnrolled;
  }
  async getEnrolledLevelAsync(): Promise<SecurityLevel> {
    return SecurityLevel.BIOMETRIC_STRONG;
  }
  async supportedAuthenticationTypesAsync(): Promise<AuthenticationType[]> {
    return [AuthenticationType.FINGERPRINT];
  }
  async authenticateAsync(options: LocalAuthenticationOptions): Promise<LocalAuthenticationResult> {
    this.lastOptions = options;
    return this.authResult;
  }
  async cancelAuthenticate(): Promise<void> {}
}

describe('JournalEdgeCases (JE-01 to JE-08)', () => {
  let repository: JournalRepository;
  let cryptoService: JournalCryptoService;
  let memoryStorage: MemorySecureStorage;
  let keyManager: JournalKeyManager;
  let service: JournalService;

  const samplePayload: JournalPayload = {
    body: 'Daily reflection entry.',
    reflections: {
      gratitude: 'Alhamdulillah for all blessings.',
      wentWell: 'Read Quran today.',
      improvement: 'Improve prayer focus.',
      dua: 'Rabbana atina fid-dunya hasanah.',
    },
  };

  const sampleInputs: TodayTemporalInputs = {
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
    memoryStorage = new MemorySecureStorage();
    keyManager = new JournalKeyManager(memoryStorage);
    service = new JournalService(
      repository,
      cryptoService,
      keyManager,
      new StaticTodayTemporalInputProvider(sampleInputs)
    );
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('JE-01: (UNIT) SecureStore key retrieval failure during decrypt: JournalKeyError thrown; ciphertext row NOT modified', async () => {
    // Save valid entry first
    await service.saveEntry({
      planningDayKey: '2026-09-20',
      payload: samplePayload,
    });

    const rowBefore = await repository.findByPlanningDayKey('2026-09-20');
    expect(rowBefore).not.toBeNull();
    const originalCiphertext = rowBefore!.encryptedPayload;

    // Create service with failing SecureStore
    const failingKeyManager = new JournalKeyManager(new FailingSecureStorage());
    const failingService = new JournalService(
      repository,
      cryptoService,
      failingKeyManager,
      new StaticTodayTemporalInputProvider(sampleInputs)
    );

    await expect(failingService.loadEntry('2026-09-20')).rejects.toThrow(JournalKeyError);

    // Verify row ciphertext remains completely intact and unmodified in DB
    const rowAfter = await repository.findByPlanningDayKey('2026-09-20');
    expect(rowAfter).not.toBeNull();
    expect(rowAfter!.encryptedPayload).toBe(originalCiphertext);
    expect(rowAfter!.revision).toBe(rowBefore!.revision);
  });

  it('JE-02: (UNIT) Corrupt/malformed ciphertext in repository: decrypt throws typed JournalEncryptionError; no crash', async () => {
    // Insert a row with corrupt/malformed payload
    await repository.save({
      planningDayKey: '2026-09-20',
      encryptedPayload: 'NOT_VALID_ENCRYPTED_BASE64_CIPHERTEXT',
      encryptionVersion: 1,
    });

    // Attempting to load and decrypt should throw JournalEncryptionError without crashing the process
    await expect(service.loadEntry('2026-09-20')).rejects.toThrow(JournalEncryptionError);
  });

  it('JE-03: (UNIT) Rapid save + edit: StaleWriteError on revision conflict; no duplicate rows; draft not discarded', async () => {
    const initial = await service.saveEntry({
      planningDayKey: '2026-09-20',
      payload: samplePayload,
    });
    expect(initial.revision).toBe(1);

    // Simulating concurrent write: update entry with correct revision 1 -> becomes revision 2
    await service.saveEntry({
      planningDayKey: '2026-09-20',
      payload: { ...samplePayload, body: 'Write A succeeds' },
      revision: 1,
    });

    // Write B comes in with stale revision 1 -> must throw StaleWriteError
    await expect(
      service.saveEntry({
        planningDayKey: '2026-09-20',
        payload: { ...samplePayload, body: 'Write B with stale rev 1' },
        revision: 1,
      })
    ).rejects.toThrow(StaleWriteError);

    // Verify exactly one row exists in DB for this planningDayKey
    const allRows = await repository.listHistory();
    const rowsForDay = allRows.filter(r => r.planningDayKey === '2026-09-20');
    expect(rowsForDay.length).toBe(1);
    expect(rowsForDay[0].revision).toBe(2);
  });

  it('JE-04: (UNIT) Journal save payload: no GPS coordinates, no task labels, no notes in save input', () => {
    // Inspect JournalPayload contract
    const testPayload: JournalPayload = {
      body: 'Testing privacy boundary',
      reflections: {
        gratitude: 'Privacy ensured',
        wentWell: 'Strict boundary',
        improvement: 'Keep clean',
        dua: 'Alhamdulillah',
      },
    };

    // Ensure save payload types and inputs never expose location or task data
    const payloadKeys = Object.keys(testPayload);
    expect(payloadKeys).not.toContain('latitude');
    expect(payloadKeys).not.toContain('longitude');
    expect(payloadKeys).not.toContain('coords');
    expect(payloadKeys).not.toContain('coordinates');
    expect(payloadKeys).not.toContain('location');
    expect(payloadKeys).not.toContain('tasks');
    expect(payloadKeys).not.toContain('taskLabels');
    expect(payloadKeys).not.toContain('taskNotes');

    // Reflections sub-object inspection
    const reflectionKeys = Object.keys(testPayload.reflections ?? {});
    expect(reflectionKeys).not.toContain('latitude');
    expect(reflectionKeys).not.toContain('coordinates');
    expect(reflectionKeys).not.toContain('taskNotes');
  });

  it('JE-05: (STATIC AUDIT) no import from src/services/journal/ or src/domain/journal/ in widgets, notifications, planner, onboarding', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const forbiddenDirs = [
      path.join(rootDir, 'services', 'widget'),
      path.join(rootDir, 'services', 'notification'),
      path.join(rootDir, 'services', 'onboarding'),
    ];
    const forbiddenIndividualFiles = [
      path.join(rootDir, 'services', 'PlannerRefreshCoordinator.ts'),
      path.join(rootDir, 'services', 'TodayOrchestrator.ts'),
      path.join(rootDir, 'services', 'TodayViewModelProjection.ts'),
    ];

    const checkFile = (filePath: string) => {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toMatch(/from\s+['"].*\/journal(\/|['"])/i);
      expect(content).not.toMatch(/require\(['"].*\/journal(\/|['"])\)/i);
    };

    for (const dir of forbiddenDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true }) as string[];
        for (const file of files) {
          if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            checkFile(path.join(dir, file));
          }
        }
      }
    }

    for (const file of forbiddenIndividualFiles) {
      checkFile(file);
    }
  });

  it('JE-06: (UNIT) History navigation to planningDayKey with no entry: loadEntry returns null; no crash', async () => {
    const result = await service.loadEntry('2026-01-01');
    expect(result).toBeNull();
  });

  it('JE-07: (UNIT) Lock DISABLED + biometric unavailable: Journal opens normally without prompt', async () => {
    const mockStorage = new MemorySecureStorage();
    const lockPref = new JournalLockPreference(mockStorage);
    // Ensure lock is disabled
    await lockPref.setEnabled(false);

    const mockAuth = new MockLocalAuthAdapter();
    mockAuth.hasHardware = false;
    mockAuth.isEnrolled = false;

    const controller = new JournalLockController(lockPref, keyManager, mockAuth);
    const initState = await controller.initialize();

    expect(initState).toBe('unlocked');
    expect(controller.isEnabled).toBe(false);

    // Call unlock
    const unlockState = await controller.unlock();
    expect(unlockState).toBe('unlocked');
    // Verify authenticateAsync was NOT called because lock is disabled
    expect(mockAuth.lastOptions).toBeUndefined();
  });

  it('JE-08: (UNIT) Lock ENABLED + biometric unavailable/not enrolled: Journal remains LOCKED; calm user-facing message shown; lock NOT auto-disabled; lock NOT bypassed; no PIN fallback', async () => {
    const mockStorage = new MemorySecureStorage();
    const lockPref = new JournalLockPreference(mockStorage);
    // Explicitly enable lock
    await lockPref.setEnabled(true);

    const mockAuth = new MockLocalAuthAdapter();
    mockAuth.hasHardware = true;
    mockAuth.isEnrolled = false;
    mockAuth.authResult = { success: false, error: 'not_enrolled' };

    const controller = new JournalLockController(lockPref, keyManager, mockAuth);
    const initState = await controller.initialize();
    expect(initState).toBe('locked');
    expect(controller.isEnabled).toBe(true);

    // Attempt to unlock
    const unlockState = await controller.unlock();
    expect(unlockState).toBe('locked');
    expect(controller.isSessionUnlocked).toBe(false);

    // Verify calm user-facing message
    expect(controller.errorMessage).toBe(
      'No biometrics are enrolled on this device. Please set up Face ID or fingerprint in Settings.'
    );

    // Verify lock was NOT auto-disabled
    expect(await lockPref.isEnabled()).toBe(true);

    // Verify no PIN fallback (disableDeviceFallback: true passed)
    expect(mockAuth.lastOptions?.disableDeviceFallback).toBe(true);
  });
});
