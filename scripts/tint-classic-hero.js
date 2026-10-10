const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

// HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

const THEME_SPECS = {
  rawdah_emerald: { primary: '#0F8A52', accent: '#D97706', isDark: false },
  fajr_awakening: { primary: '#F59E0B', accent: '#8B5CF6', isDark: true },
  tahajjud_noor: { primary: '#38BDF8', accent: '#FBBF24', isDark: true },
  andalusian_oasis: { primary: '#D97706', accent: '#059669', isDark: false },
  sacred_tawaf: { primary: '#D97706', accent: '#E11D48', isDark: false },
  blessed_olive: { primary: '#4D7C0F', accent: '#B45309', isDark: false },
  samarkand_turquoise: { primary: '#0891B2', accent: '#0D9488', isDark: false },
  celestial_caravan: { primary: '#6366F1', accent: '#38BDF8', isDark: true },
  maghrib_lantern: { primary: '#FB7185', accent: '#FBBF24', isDark: true },
  default_light: { primary: '#0F8A52', accent: '#D97706', isDark: false },
  default_dark: { primary: '#34D399', accent: '#FBBF24', isDark: true },
};

function tintClassicHero() {
  const templatePath = path.join(__dirname, '../assets/hero/default_light.png');
  const templateBuf = fs.readFileSync(templatePath);
  const src = PNG.sync.read(templateBuf);

  for (const [themeId, spec] of Object.entries(THEME_SPECS)) {
    if (themeId === 'default_light') {
      // Keep canonical classic as-is
      continue;
    }

    const [pr, pg, pb] = hexToRgb(spec.primary);
    const [targetH, targetS] = rgbToHsl(pr, pg, pb);

    const [ar, ag, ab] = hexToRgb(spec.accent);
    const [accentH, accentS] = rgbToHsl(ar, ag, ab);

    const out = new PNG({ width: src.width, height: src.height });

    for (let i = 0; i < src.data.length; i += 4) {
      const a = src.data[i + 3];
      if (a === 0) {
        out.data[i] = 0;
        out.data[i + 1] = 0;
        out.data[i + 2] = 0;
        out.data[i + 3] = 0;
        continue;
      }

      const r = src.data[i];
      const g = src.data[i + 1];
      const b = src.data[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);

      let newH = targetH;
      let newS = Math.min(1, Math.max(s, targetS * 0.7));
      let newL = l;

      // Detect warm golden/sun accents (original hue around 35-65 deg / 0.1-0.18)
      const isWarmAccent = h >= 0.08 && h <= 0.22 && s > 0.2;
      if (isWarmAccent) {
        newH = accentH;
        newS = Math.min(1, Math.max(s, accentS * 0.8));
      }

      // If dark theme, slightly boost brightness of darker details for clear contrast
      if (spec.isDark) {
        newL = Math.min(0.92, l * 1.15 + 0.08);
      }

      const [nr, ng, nb] = hslToRgb(newH, newS, newL);
      out.data[i] = nr;
      out.data[i + 1] = ng;
      out.data[i + 2] = nb;
      out.data[i + 3] = a;
    }

    const destPath = path.join(__dirname, `../assets/hero/${themeId}.png`);
    fs.writeFileSync(destPath, PNG.sync.write(out));
    console.log(`Generated tinted classic hero for ${themeId} -> ${destPath}`);
  }
}

tintClassicHero();
console.log('All 11 theme hero illustrations updated with universal classic artwork!');
