import { getShadow, hasTransparency, shadows } from '../tokens';
import { ISLAMIC_THEMES } from '../islamicThemes';
import { lightTheme } from '../lightTheme';
import { darkTheme } from '../darkTheme';

describe('getShadow & hasTransparency across themes', () => {
  it('detects transparency correctly', () => {
    expect(hasTransparency('rgba(30, 36, 75, 0.75)')).toBe(true);
    expect(hasTransparency('rgba(255, 255, 255, 1.0)')).toBe(false);
    expect(hasTransparency('#FFFFFF')).toBe(false);
    expect(hasTransparency('#1E244BCC')).toBe(true);
    expect(hasTransparency(undefined)).toBe(false);
  });

  it('keeps base elevation on opaque themes (light and dark)', () => {
    const lightShadow = getShadow('card', lightTheme.colors.surface);
    expect(lightShadow.elevation).toBe(shadows.card.elevation);

    const darkShadow = getShadow('card', darkTheme.colors.surface);
    expect(darkShadow.elevation).toBe(shadows.card.elevation);
  });

  it('clamps elevation to 0 across all 11 Islamic themes with translucent surfaces', () => {
    for (const theme of ISLAMIC_THEMES) {
      const cardShadow = getShadow('card', theme.colors.surface);
      expect(cardShadow.elevation).toBe(0);
      // Keeps iOS shadow properties intact
      expect(cardShadow.shadowRadius).toBe(shadows.card.shadowRadius);
      expect(cardShadow.shadowOffset).toEqual(shadows.card.shadowOffset);

      const elevatedShadow = getShadow('elevated', theme.colors.surface);
      expect(elevatedShadow.elevation).toBe(0);
    }
  });
});
