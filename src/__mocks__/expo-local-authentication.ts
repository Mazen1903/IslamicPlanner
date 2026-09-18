export enum AuthenticationType {
  FINGERPRINT = 1,
  FACIAL_RECOGNITION = 2,
  IRIS = 3,
}

export enum SecurityLevel {
  NONE = 0,
  SECRET = 1,
  BIOMETRIC = 2,
  BIOMETRIC_WEAK = 2,
  BIOMETRIC_STRONG = 3,
}

export const hasHardwareAsync = jest.fn(async () => true);
export const isEnrolledAsync = jest.fn(async () => true);
export const getEnrolledLevelAsync = jest.fn(async () => SecurityLevel.BIOMETRIC_STRONG);
export const supportedAuthenticationTypesAsync = jest.fn(async () => [
  AuthenticationType.FINGERPRINT,
  AuthenticationType.FACIAL_RECOGNITION,
]);
export const authenticateAsync = jest.fn(async (_options?: any) => ({
  success: true,
}));
export const cancelAuthenticate = jest.fn(async () => undefined);
