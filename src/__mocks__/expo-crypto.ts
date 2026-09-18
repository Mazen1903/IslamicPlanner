import * as crypto from 'node:crypto';

export enum AESKeySize {
  AES128 = 128,
  AES192 = 192,
  AES256 = 256,
}

export class AESEncryptionKey {
  size: number;
  private rawBytes: Uint8Array;

  constructor(bytes: Uint8Array, size: number = 256) {
    this.rawBytes = bytes;
    this.size = size;
  }

  static async generate(size: number = 256): Promise<AESEncryptionKey> {
    const byteLength = size / 8;
    const bytes = crypto.randomBytes(byteLength);
    return new AESEncryptionKey(new Uint8Array(bytes), size);
  }

  static async import(
    data: Uint8Array | string,
    encoding: 'hex' | 'base64' = 'hex'
  ): Promise<AESEncryptionKey> {
    if (typeof data === 'string') {
      const buf = Buffer.from(data, encoding);
      if (buf.length !== 16 && buf.length !== 24 && buf.length !== 32) {
        throw new Error(`Invalid key length: ${buf.length} bytes`);
      }
      return new AESEncryptionKey(new Uint8Array(buf), buf.length * 8);
    }
    return new AESEncryptionKey(data, data.length * 8);
  }

  async bytes(): Promise<Uint8Array> {
    return this.rawBytes;
  }

  async encoded(encoding: 'hex' | 'base64' = 'hex'): Promise<string> {
    return Buffer.from(this.rawBytes).toString(encoding);
  }
}

export class AESSealedData {
  private ivBytes: Uint8Array;
  private ciphertextBytes: Uint8Array;
  private tagBytes: Uint8Array;

  constructor(iv: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array) {
    this.ivBytes = iv;
    this.ciphertextBytes = ciphertext;
    this.tagBytes = tag;
  }

  static fromCombined(
    combined: string | Uint8Array,
    config?: { ivLength?: number; tagLength?: number }
  ): AESSealedData {
    const buf =
      typeof combined === 'string'
        ? Buffer.from(combined, 'base64')
        : Buffer.from(combined);
    const ivLength = config?.ivLength ?? 12;
    const tagLength = config?.tagLength ?? 16;
    if (buf.length < ivLength + tagLength) {
      throw new Error('Combined data is too short');
    }
    const iv = buf.subarray(0, ivLength);
    const ciphertext = buf.subarray(ivLength, buf.length - tagLength);
    const tag = buf.subarray(buf.length - tagLength);
    return new AESSealedData(
      new Uint8Array(iv),
      new Uint8Array(ciphertext),
      new Uint8Array(tag)
    );
  }

  static fromParts(
    iv: string | Uint8Array,
    ciphertext: string | Uint8Array,
    tag: string | Uint8Array
  ): AESSealedData {
    const ivBuf =
      typeof iv === 'string' ? Buffer.from(iv, 'base64') : Buffer.from(iv);
    const ctBuf =
      typeof ciphertext === 'string'
        ? Buffer.from(ciphertext, 'base64')
        : Buffer.from(ciphertext);
    const tagBuf =
      typeof tag === 'string' ? Buffer.from(tag, 'base64') : Buffer.from(tag);
    return new AESSealedData(
      new Uint8Array(ivBuf),
      new Uint8Array(ctBuf),
      new Uint8Array(tagBuf)
    );
  }

  async combined(
    encoding: 'base64' | 'bytes' = 'base64'
  ): Promise<string | Uint8Array> {
    const combinedBuf = Buffer.concat([
      Buffer.from(this.ivBytes),
      Buffer.from(this.ciphertextBytes),
      Buffer.from(this.tagBytes),
    ]);
    if (encoding === 'bytes') {
      return new Uint8Array(combinedBuf);
    }
    return combinedBuf.toString('base64');
  }

  async iv(
    encoding: 'base64' | 'bytes' = 'bytes'
  ): Promise<string | Uint8Array> {
    return encoding === 'base64'
      ? Buffer.from(this.ivBytes).toString('base64')
      : this.ivBytes;
  }

  async tag(
    encoding: 'base64' | 'bytes' = 'bytes'
  ): Promise<string | Uint8Array> {
    return encoding === 'base64'
      ? Buffer.from(this.tagBytes).toString('base64')
      : this.tagBytes;
  }

  async ciphertext(options?: {
    includeTag?: boolean;
    encoding?: 'base64' | 'bytes';
  }): Promise<string | Uint8Array> {
    const includeTag = options?.includeTag ?? false;
    const encoding = options?.encoding ?? 'bytes';
    const ct = includeTag
      ? Buffer.concat([
          Buffer.from(this.ciphertextBytes),
          Buffer.from(this.tagBytes),
        ])
      : Buffer.from(this.ciphertextBytes);
    return encoding === 'base64' ? ct.toString('base64') : new Uint8Array(ct);
  }
}

export async function aesEncryptAsync(
  plaintext: string | Uint8Array | ArrayBuffer,
  key: AESEncryptionKey,
  options?: { nonce?: { length?: number; bytes?: string | Uint8Array } }
): Promise<AESSealedData> {
  const plainBuf =
    typeof plaintext === 'string'
      ? Buffer.from(plaintext, 'base64')
      : Buffer.from(plaintext as any);

  const keyBytes = await key.bytes();
  const ivBuf = options?.nonce?.bytes
    ? typeof options.nonce.bytes === 'string'
      ? Buffer.from(options.nonce.bytes, 'base64')
      : Buffer.from(options.nonce.bytes)
    : crypto.randomBytes(options?.nonce?.length ?? 12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(keyBytes),
    ivBuf
  );
  const encrypted = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  return new AESSealedData(
    new Uint8Array(ivBuf),
    new Uint8Array(encrypted),
    new Uint8Array(tag)
  );
}

export async function aesDecryptAsync(
  sealedData: AESSealedData,
  key: AESEncryptionKey,
  options?: { output?: 'bytes' | 'base64' }
): Promise<Uint8Array | string> {
  const keyBytes = await key.bytes();
  const ivBytes = (await sealedData.iv('bytes')) as Uint8Array;
  const ctBytes = (await sealedData.ciphertext({
    includeTag: false,
    encoding: 'bytes',
  })) as Uint8Array;
  const tagBytes = (await sealedData.tag('bytes')) as Uint8Array;

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(keyBytes),
    Buffer.from(ivBytes)
  );
  decipher.setAuthTag(Buffer.from(tagBytes));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ctBytes)),
    decipher.final(),
  ]);

  if (options?.output === 'base64') {
    return decrypted.toString('base64');
  }
  return new Uint8Array(decrypted);
}

export function randomUUID(): string {
  return crypto.randomUUID();
}

export function getRandomBytes(byteCount: number): Uint8Array {
  return new Uint8Array(crypto.randomBytes(byteCount));
}

export async function getRandomBytesAsync(byteCount: number): Promise<Uint8Array> {
  return new Uint8Array(crypto.randomBytes(byteCount));
}

export async function digestStringAsync(
  algorithm: string,
  data: string
): Promise<string> {
  const hash = crypto.createHash(algorithm.toLowerCase().replace('-', ''));
  hash.update(data);
  return hash.digest('hex');
}
