import {
  JournalCryptoService,
  CURRENT_ENCRYPTION_VERSION,
} from '../JournalCryptoService';
import { AESEncryptionKey, AESSealedData } from 'expo-crypto';
import type { JournalPayload } from '@/domain/journal/types';
import { JournalEncryptionError } from '@/domain/journal/errors';

describe('JournalCryptoService', () => {
  let service: JournalCryptoService;
  let key: AESEncryptionKey;

  beforeEach(async () => {
    service = new JournalCryptoService();
    key = await AESEncryptionKey.generate(256);
  });

  const samplePayload: JournalPayload = {
    body: 'Today was a peaceful day of reflection and prayer.',
    reflections: {
      gratitude: 'Grateful for family, health, and barakah in time.',
      wentWell: 'Completed all 5 prayers on time with congregation.',
      improvement: 'Wake up 15 minutes earlier for Tahajjud.',
      dua: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar.',
    },
  };

  it('JC-01: Encrypt/decrypt round trip — plaintext matches after decrypt', async () => {
    const encrypted = await service.encrypt(samplePayload, key);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = await service.decrypt(encrypted, key);
    expect(decrypted).toEqual(samplePayload);
  });

  it('JC-02: Random IV — encrypting same plaintext twice produces different ciphertext', async () => {
    const enc1 = await service.encrypt(samplePayload, key);
    const enc2 = await service.encrypt(samplePayload, key);

    expect(enc1).not.toEqual(enc2);

    // Both should still decrypt to the exact same payload
    const dec1 = await service.decrypt(enc1, key);
    const dec2 = await service.decrypt(enc2, key);
    expect(dec1).toEqual(samplePayload);
    expect(dec2).toEqual(samplePayload);
  });

  it('JC-03: Tampered ciphertext — decryption throws JournalEncryptionError (fails closed)', async () => {
    const encrypted = await service.encrypt(samplePayload, key);
    const sealed = AESSealedData.fromCombined(encrypted);
    const iv = (await sealed.iv('bytes')) as Uint8Array;
    const ct = (await sealed.ciphertext({
      includeTag: false,
      encoding: 'bytes',
    })) as Uint8Array;
    const tag = (await sealed.tag('bytes')) as Uint8Array;

    // Tamper with one byte in the ciphertext
    const tamperedCt = new Uint8Array(ct);
    tamperedCt[0] ^= 0xff;

    const tamperedSealed = AESSealedData.fromParts(iv, tamperedCt, tag);
    const tamperedCombined = (await tamperedSealed.combined(
      'base64'
    )) as string;

    await expect(service.decrypt(tamperedCombined, key)).rejects.toThrow(
      JournalEncryptionError
    );
  });

  it('JC-04: Tampered tag — decryption throws JournalEncryptionError', async () => {
    const encrypted = await service.encrypt(samplePayload, key);
    const sealed = AESSealedData.fromCombined(encrypted);
    const iv = (await sealed.iv('bytes')) as Uint8Array;
    const ct = (await sealed.ciphertext({
      includeTag: false,
      encoding: 'bytes',
    })) as Uint8Array;
    const tag = (await sealed.tag('bytes')) as Uint8Array;

    // Tamper with the authentication tag
    const tamperedTag = new Uint8Array(tag);
    tamperedTag[0] ^= 0xff;

    const tamperedSealed = AESSealedData.fromParts(iv, ct, tamperedTag);
    const tamperedCombined = (await tamperedSealed.combined(
      'base64'
    )) as string;

    await expect(service.decrypt(tamperedCombined, key)).rejects.toThrow(
      JournalEncryptionError
    );
  });

  it('JC-05: Wrong key — decryption throws JournalEncryptionError', async () => {
    const encrypted = await service.encrypt(samplePayload, key);
    const otherKey = await AESEncryptionKey.generate(256);

    await expect(service.decrypt(encrypted, otherKey)).rejects.toThrow(
      JournalEncryptionError
    );
  });

  it('JC-06: Empty payload — encrypts and decrypts correctly', async () => {
    const emptyPayload: JournalPayload = {
      body: '',
      reflections: {
        gratitude: '',
        wentWell: '',
        improvement: '',
        dua: '',
      },
    };

    const encrypted = await service.encrypt(emptyPayload, key);
    const decrypted = await service.decrypt(encrypted, key);
    expect(decrypted).toEqual(emptyPayload);
  });

  it('JC-07: Unicode payload — Arabic and emoji text round-trips correctly', async () => {
    const unicodePayload: JournalPayload = {
      body: 'الحمد لله رب العالمين 🤲🕌 بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      reflections: {
        gratitude: 'نعم الله لا تُحصى ✨',
        wentWell: 'صلاة الفجر في المسجد 🌅',
        improvement: 'قراءة صفحتين من القرآن الكريم 📖',
        dua: 'اللهم إني أسألك الهدى والتقى والعفاف والغنى 🤲',
      },
    };

    const encrypted = await service.encrypt(unicodePayload, key);
    const decrypted = await service.decrypt(encrypted, key);
    expect(decrypted).toEqual(unicodePayload);
  });

  it('JC-08: Encryption version dispatching — unsupported version throws JournalEncryptionError', async () => {
    const encrypted = await service.encrypt(samplePayload, key);

    // Version 999 should be rejected
    await expect(
      service.decrypt(encrypted, key, 999)
    ).rejects.toThrow('Unsupported encryption version: 999');

    // Default version 1 succeeds
    const decrypted = await service.decrypt(
      encrypted,
      key,
      CURRENT_ENCRYPTION_VERSION
    );
    expect(decrypted).toEqual(samplePayload);
  });

  it('JC-09: No plaintext in persisted string — encrypted field is not JSON-parseable and contains no plaintext fragments', async () => {
    const encrypted = await service.encrypt(samplePayload, key);

    // Must not be valid JSON
    expect(() => JSON.parse(encrypted)).toThrow();

    // Must not contain any plaintext fragments from the payload
    expect(encrypted).not.toContain('peaceful day');
    expect(encrypted).not.toContain('gratitude');
    expect(encrypted).not.toContain('Tahajjud');
    expect(encrypted).not.toContain('Rabbana');
  });
});
