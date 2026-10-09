import { shouldResetPremiumFont, FREE_FALLBACK_FONT_ID } from '../FontEntitlementGuard';

describe('shouldResetPremiumFont', () => {
  it('resets a premium font only when entitlement is positively FREE', () => {
    for (const font of ['mali', 'kalam', 'caveat']) {
      expect(shouldResetPremiumFont(font, 'FREE', false, false)).toBe(true);
    }
  });

  it('never resets free fonts', () => {
    expect(shouldResetPremiumFont('comic', 'FREE', false, false)).toBe(false);
    expect(shouldResetPremiumFont('system', 'FREE', false, false)).toBe(false);
  });

  it('keeps premium fonts for PREMIUM users', () => {
    expect(shouldResetPremiumFont('kalam', 'PREMIUM', false, false)).toBe(false);
  });

  it('does not downgrade while loading or when entitlement is unavailable', () => {
    expect(shouldResetPremiumFont('kalam', 'FREE', true, false)).toBe(false);
    expect(shouldResetPremiumFont('kalam', null, false, false)).toBe(false);
  });

  it('respects the paywall bypass flag', () => {
    expect(shouldResetPremiumFont('kalam', 'FREE', false, true)).toBe(false);
  });

  it('falls back to the Comic Sans free default', () => {
    expect(FREE_FALLBACK_FONT_ID).toBe('comic');
  });
});
