/**
 * Generates a RFC4122 version 4 UUID.
 * Uses globalThis.crypto.randomUUID when available (Node 19+, modern browsers, React Native Hermes),
 * with a fallback implementation for environments without crypto.randomUUID.
 */
export function generateUuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
