import {
  aesEncryptAsync,
  aesDecryptAsync,
  AESSealedData,
  AESEncryptionKey,
} from 'expo-crypto';
import type { JournalPayload } from '@/domain/journal/types';
import { JournalEncryptionError } from '@/domain/journal/errors';

export const CURRENT_ENCRYPTION_VERSION = 1;

/**
 * Service responsible for encrypting and decrypting Journal payloads using AES-256-GCM.
 *
 * Invariants:
 * - Journal prose and private reflections are never persisted in plaintext.
 * - Random IV per encryption produces unique ciphertext for identical plaintext.
 * - Tampered ciphertext or wrong key throws JournalEncryptionError (fails closed).
 * - Plaintext content and raw keys are NEVER included in error messages, logs, or crash reports.
 */
export class JournalCryptoService {
  /**
   * Encrypts a JournalPayload into a base64-encoded combined AES-256-GCM payload.
   */
  async encrypt(payload: JournalPayload, key: AESEncryptionKey): Promise<string> {
    try {
      const jsonStr = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(jsonStr);
      const sealedData = await aesEncryptAsync(bytes, key);
      return await sealedData.combined('base64');
    } catch (err) {
      if (err instanceof JournalEncryptionError) {
        throw err;
      }
      // Never include payload content or key in error message
      throw new JournalEncryptionError('Failed to encrypt journal payload', {
        cause: err,
      });
    }
  }

  /**
   * Decrypts a base64-encoded combined ciphertext into a verified JournalPayload.
   * Dispatches on encryptionVersion to select the appropriate decryption scheme.
   */
  async decrypt(
    encryptedPayload: string,
    key: AESEncryptionKey,
    version: number = CURRENT_ENCRYPTION_VERSION
  ): Promise<JournalPayload> {
    if (version !== 1) {
      throw new JournalEncryptionError(`Unsupported encryption version: ${version}`);
    }

    try {
      const sealedData = AESSealedData.fromCombined(encryptedPayload);
      const decryptedBytes = await aesDecryptAsync(sealedData, key, {
        output: 'bytes',
      });
      const jsonStr = new TextDecoder().decode(decryptedBytes);
      const parsed = JSON.parse(jsonStr) as JournalPayload;

      // Invariant: Verify structure of decrypted payload
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.body !== 'string' ||
        !parsed.reflections ||
        typeof parsed.reflections !== 'object'
      ) {
        throw new Error('Decrypted payload structure is invalid');
      }

      return {
        body: parsed.body,
        reflections: {
          gratitude: parsed.reflections.gratitude ?? '',
          wentWell: parsed.reflections.wentWell ?? '',
          improvement: parsed.reflections.improvement ?? '',
          dua: parsed.reflections.dua ?? '',
        },
      };
    } catch (err) {
      if (err instanceof JournalEncryptionError) {
        throw err;
      }
      // Never leak decrypted fragment or key in error message
      throw new JournalEncryptionError('Failed to decrypt journal payload', {
        cause: err,
      });
    }
  }
}

export const journalCryptoService = new JournalCryptoService();
