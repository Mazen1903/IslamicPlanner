import {
  HijriMonthOverrideRepository,
  HijriMonthOverrideValidationError,
} from '../HijriMonthOverrideRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';

describe('HijriMonthOverrideRepository', () => {
  let repo: HijriMonthOverrideRepository;

  beforeEach(() => {
    createTestDatabase();
    repo = new HijriMonthOverrideRepository();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('returns empty array on empty table', async () => {
    const list = await repo.list();
    expect(list).toEqual([]);
  });

  it('upserts a new month override row with UUID and timestamps', async () => {
    const created = await repo.upsert(1448, 9, 1);

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.hijriYear).toBe(1448);
    expect(created.hijriMonth).toBe(9);
    expect(created.adjustmentDays).toBe(1);
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();
  });

  it('finds an override by year and month', async () => {
    await repo.upsert(1448, 9, -1);

    const found = await repo.find(1448, 9);
    expect(found).not.toBeNull();
    expect(found?.hijriYear).toBe(1448);
    expect(found?.hijriMonth).toBe(9);
    expect(found?.adjustmentDays).toBe(-1);

    const notFound = await repo.find(1448, 10);
    expect(notFound).toBeNull();
  });

  it('lists overrides sorted by year and month ascending', async () => {
    await repo.upsert(1448, 10, 1);
    await repo.upsert(1447, 12, -1);
    await repo.upsert(1448, 9, 0);

    const all = await repo.list();
    expect(all).toHaveLength(3);
    expect(all[0].hijriYear).toBe(1447);
    expect(all[0].hijriMonth).toBe(12);
    expect(all[1].hijriYear).toBe(1448);
    expect(all[1].hijriMonth).toBe(9);
    expect(all[2].hijriYear).toBe(1448);
    expect(all[2].hijriMonth).toBe(10);
  });

  it('updates existing override on duplicate year and month', async () => {
    const initial = await repo.upsert(1448, 9, -1);
    const updated = await repo.upsert(1448, 9, 2);

    expect(updated.id).toBe(initial.id);
    expect(updated.adjustmentDays).toBe(2);

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].adjustmentDays).toBe(2);
  });

  it('deletes an existing override and returns true', async () => {
    await repo.upsert(1448, 9, 1);

    const deleted = await repo.delete(1448, 9);
    expect(deleted).toBe(true);

    const found = await repo.find(1448, 9);
    expect(found).toBeNull();
  });

  it('returns false when deleting a non-existent override', async () => {
    const deleted = await repo.delete(1448, 1);
    expect(deleted).toBe(false);
  });

  describe('validation', () => {
    it('rejects year outside supported range', async () => {
      await expect(repo.upsert(1342, 1, 0)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
      await expect(repo.upsert(1501, 1, 0)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
    });

    it('rejects non-integer year or month', async () => {
      await expect(repo.upsert(1448.5, 1, 0)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
      await expect(repo.upsert(1448, 2.5, 0)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
    });

    it('rejects month outside 1..12', async () => {
      await expect(repo.upsert(1448, 0, 0)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
      await expect(repo.upsert(1448, 13, 0)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
    });

    it('rejects adjustment outside -2..+2', async () => {
      await expect(repo.upsert(1448, 9, -3)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
      await expect(repo.upsert(1448, 9, 3)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
      await expect(repo.upsert(1448, 9, 1.5)).rejects.toThrow(
        HijriMonthOverrideValidationError
      );
    });
  });
});
