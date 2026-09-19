import { LocalEntitlementService } from '../EntitlementService';
import type { EntitlementRepositoryAPI } from '@/data/repositories/EntitlementRepository';

describe('LocalEntitlementService', () => {
  let mockRepo: jest.Mocked<EntitlementRepositoryAPI>;
  let service: LocalEntitlementService;

  beforeEach(() => {
    mockRepo = {
      readIsPremium: jest.fn(),
    };
    service = new LocalEntitlementService(mockRepo);
  });

  // E-01: No row (null) → READY / FREE (fresh-install default)
  it('E-01: returns READY / FREE when repository returns null (fresh install)', async () => {
    mockRepo.readIsPremium.mockResolvedValue(null);

    const snapshot = await service.getSnapshot();

    expect(snapshot).toEqual({
      status: 'READY',
      tier: 'FREE',
      isPremium: false,
      source: 'LOCAL_DB',
    });
  });

  // E-02: false → READY / FREE
  it('E-02: returns READY / FREE when repository returns false', async () => {
    mockRepo.readIsPremium.mockResolvedValue(false);

    const snapshot = await service.getSnapshot();

    expect(snapshot).toEqual({
      status: 'READY',
      tier: 'FREE',
      isPremium: false,
      source: 'LOCAL_DB',
    });
  });

  // E-03: true → READY / PREMIUM
  it('E-03: returns READY / PREMIUM when repository returns true', async () => {
    mockRepo.readIsPremium.mockResolvedValue(true);

    const snapshot = await service.getSnapshot();

    expect(snapshot).toEqual({
      status: 'READY',
      tier: 'PREMIUM',
      isPremium: true,
      source: 'LOCAL_DB',
    });
  });

  // E-04: DB failure (throw) → UNAVAILABLE
  it('E-04: returns UNAVAILABLE when repository throws', async () => {
    mockRepo.readIsPremium.mockRejectedValue(new Error('SQLite disk I/O error'));

    const snapshot = await service.getSnapshot();

    expect(snapshot.status).toBe('UNAVAILABLE');
    if (snapshot.status === 'UNAVAILABLE') {
      expect(snapshot.reason).toBe('SQLite disk I/O error');
    }
  });

  // E-05: FREE MIDNIGHT false
  it('E-05: hasFeature(PLANNING_DAY_MIDNIGHT) returns false for FREE', async () => {
    mockRepo.readIsPremium.mockResolvedValue(false);

    const hasMidnight = await service.hasFeature('PLANNING_DAY_MIDNIGHT');

    expect(hasMidnight).toBe(false);
  });

  // E-06: PREMIUM MIDNIGHT true
  it('E-06: hasFeature(PLANNING_DAY_MIDNIGHT) returns true for PREMIUM', async () => {
    mockRepo.readIsPremium.mockResolvedValue(true);

    const hasMidnight = await service.hasFeature('PLANNING_DAY_MIDNIGHT');

    expect(hasMidnight).toBe(true);
  });

  // E-07: FREE CUSTOM false
  it('E-07: hasFeature(PLANNING_DAY_CUSTOM) returns false for FREE', async () => {
    mockRepo.readIsPremium.mockResolvedValue(false);

    const hasCustom = await service.hasFeature('PLANNING_DAY_CUSTOM');

    expect(hasCustom).toBe(false);
  });

  // E-08: PREMIUM CUSTOM true
  it('E-08: hasFeature(PLANNING_DAY_CUSTOM) returns true for PREMIUM', async () => {
    mockRepo.readIsPremium.mockResolvedValue(true);

    const hasCustom = await service.hasFeature('PLANNING_DAY_CUSTOM');

    expect(hasCustom).toBe(true);
  });

  // E-09: UNAVAILABLE hasFeature false (fail-closed)
  it('E-09: hasFeature returns false (fail-closed) when repository throws', async () => {
    mockRepo.readIsPremium.mockRejectedValue(new Error('Database corrupted'));

    const hasMidnight = await service.hasFeature('PLANNING_DAY_MIDNIGHT');
    const hasCustom = await service.hasFeature('PLANNING_DAY_CUSTOM');

    expect(hasMidnight).toBe(false);
    expect(hasCustom).toBe(false);
  });

  // E-10: getSnapshot never leaks repository throw
  it('E-10: getSnapshot never throws and handles non-Error rejections gracefully', async () => {
    mockRepo.readIsPremium.mockRejectedValue('string rejection');

    const snapshot = await service.getSnapshot();

    expect(snapshot.status).toBe('UNAVAILABLE');
    if (snapshot.status === 'UNAVAILABLE') {
      expect(snapshot.reason).toBe('Entitlement source unavailable');
    }
  });
});
