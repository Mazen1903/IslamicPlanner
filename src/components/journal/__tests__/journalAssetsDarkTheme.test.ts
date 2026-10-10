import fs from 'fs';
import path from 'path';
// @ts-expect-error pngjs does not provide bundled types
import { PNG } from 'pngjs';

describe('Journal Tab Assets - Dark Theme Transparency & Halos', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const transparentPngDir = path.join(rootDir, 'assets/icons/journal/transparent_png');
  const illustrationsDir = path.join(rootDir, 'assets/icons/journal/illustrations');

  describe('1. Transparent PNG Icons Corner Transparency', () => {
    const files = fs.readdirSync(transparentPngDir).filter((f) => f.endsWith('.png'));

    test.each(files)('asset %s should have 100% transparent corners (alpha === 0)', (file) => {
      const filePath = path.join(transparentPngDir, file);
      const data = fs.readFileSync(filePath);
      const png = PNG.sync.read(data);
      const { width, height } = png;

      const sampleAlpha = (x: number, y: number) => {
        const idx = (width * y + x) << 2;
        return png.data[idx + 3];
      };

      const cTL = sampleAlpha(0, 0);
      const cTR = sampleAlpha(width - 1, 0);
      const cBL = sampleAlpha(0, height - 1);
      const cBR = sampleAlpha(width - 1, height - 1);

      expect(cTL).toBe(0);
      expect(cTR).toBe(0);
      expect(cBL).toBe(0);
      expect(cBR).toBe(0);
    });
  });

  describe('2. Reflection Prompt Lantern Illustration Transparency', () => {
    test('reflection_lantern_artwork_raw.png should have transparent corners and no outer white box', () => {
      const filePath = path.join(illustrationsDir, 'reflection_lantern_artwork_raw.png');
      const data = fs.readFileSync(filePath);
      const png = PNG.sync.read(data);
      const { width, height } = png;

      const sample = (x: number, y: number) => {
        const idx = (width * y + x) << 2;
        return {
          r: png.data[idx],
          g: png.data[idx + 1],
          b: png.data[idx + 2],
          a: png.data[idx + 3],
        };
      };

      // Top-left and top-right corners must be fully transparent
      expect(sample(0, 0).a).toBe(0);
      expect(sample(width - 1, 0).a).toBe(0);
      expect(sample(0, height - 1).a).toBe(0);
      expect(sample(width - 1, height - 1).a).toBe(0);

      // Verify that the majority of the outer background was cleaned
      let transparentPixels = 0;
      for (let i = 0; i < png.data.length; i += 4) {
        if (png.data[i + 3] === 0) transparentPixels++;
      }
      const totalPixels = width * height;
      const transparencyRatio = transparentPixels / totalPixels;

      // At least 60% of the image should be transparent background
      expect(transparencyRatio).toBeGreaterThan(0.6);
    });
  });

  describe('3. Daily Muhasaba Reflection Icons Border De-fringing', () => {
    const reflectionIcons = [
      'gratitude_hands.png',
      'what_went_well_check.png',
      'for_tomorrow_chart.png',
      'heartfelt_dua_moon.png',
    ];

    test.each(reflectionIcons)('%s should have zero opaque/semi-opaque border haze', (file) => {
      const filePath = path.join(transparentPngDir, file);
      const data = fs.readFileSync(filePath);
      const png = PNG.sync.read(data);
      const { width, height } = png;

      const sample = (x: number, y: number) => {
        const idx = (width * y + x) << 2;
        return {
          r: png.data[idx],
          g: png.data[idx + 1],
          b: png.data[idx + 2],
          a: png.data[idx + 3],
        };
      };

      let borderHazePixels = 0;

      // Check top and bottom perimeter
      for (let x = 0; x < width; x++) {
        for (const y of [0, height - 1]) {
          const p = sample(x, y);
          // Residual haze: significant alpha with bright light background colors
          if (p.a > 20 && p.r > 200 && p.g > 200 && p.b > 200) {
            borderHazePixels++;
          }
        }
      }

      // Check left and right perimeter
      for (let y = 1; y < height - 1; y++) {
        for (const x of [0, width - 1]) {
          const p = sample(x, y);
          if (p.a > 20 && p.r > 200 && p.g > 200 && p.b > 200) {
            borderHazePixels++;
          }
        }
      }

      expect(borderHazePixels).toBe(0);
    });
  });
});
