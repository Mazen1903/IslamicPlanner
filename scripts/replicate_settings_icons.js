const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const p1Path = 'C:/Users/mazin/.gemini/antigravity-ide/brain/a92f1918-2492-4793-b09e-ef047f75fb20/pastel_settings.png';
const p2Path = 'C:/Users/mazin/.gemini/antigravity-ide/brain/a92f1918-2492-4793-b09e-ef047f75fb20/settings_flow.png';

const p1 = PNG.sync.read(fs.readFileSync(p1Path));
const p2 = PNG.sync.read(fs.readFileSync(p2Path));

const settingsDir = path.join(__dirname, '../assets/icons/settings');
const navDir = path.join(__dirname, '../assets/icons/nav');
if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
if (!fs.existsSync(navDir)) fs.mkdirSync(navDir, { recursive: true });

// 1. Re-extract badge_gold_lock.png (x: 364, y: 353, w: 106, h: 31 in p2)
{
  const x0 = 363;
  const y0 = 352;
  const w = 108;
  const h = 33;
  const out = new PNG({ width: w, height: h });

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sIdx = ((y0 + y) * p2.width + (x0 + x)) * 4;
      const dIdx = (y * w + x) * 4;

      const r = p2.data[sIdx];
      const g = p2.data[sIdx + 1];
      const b = p2.data[sIdx + 2];

      // Outside the pill is white/off-white (r > 248, g > 248, b > 248)
      // The pill background is warm cream: r ~ 254, g ~ 246, b ~ 222
      // The lock and text are dark brown: r ~ 105, g ~ 58, b ~ 12
      const isCardBg = r > 248 && g > 248 && b > 248;
      const isAntialias = r > 245 && g > 245 && b > 235;

      if (isCardBg) {
        out.data[dIdx + 3] = 0;
      } else if (isAntialias) {
        const alpha = Math.min(255, Math.max(0, Math.round((255 - b) * 12)));
        out.data[dIdx] = r;
        out.data[dIdx + 1] = g;
        out.data[dIdx + 2] = b;
        out.data[dIdx + 3] = alpha;
      } else {
        out.data[dIdx] = r;
        out.data[dIdx + 1] = g;
        out.data[dIdx + 2] = b;
        out.data[dIdx + 3] = 255;
      }
    }
  }

  fs.writeFileSync(path.join(settingsDir, 'badge_gold_lock.png'), PNG.sync.write(out));
  console.log('Fixed badge_gold_lock.png (108x33)');
}

// 2. Re-extract row_manual_pin.png (x: 567, y: 403, w: 23, h: 33 in p1)
{
  const targetW = 32;
  const targetH = 38;
  const out = new PNG({ width: targetW, height: targetH });

  // Pin in p1: x: 567 to 589, y: 403 to 435
  const pinX = 567;
  const pinY = 403;
  const pinW = 23;
  const pinH = 33;
  const offsetX = Math.round((targetW - pinW) / 2);
  const offsetY = Math.round((targetH - pinH) / 2);

  for (let dy = 0; dy < pinH; dy++) {
    for (let dx = 0; dx < pinW; dx++) {
      const sIdx = ((pinY + dy) * p1.width + (pinX + dx)) * 4;
      const dIdx = ((offsetY + dy) * targetW + (offsetX + dx)) * 4;

      const r = p1.data[sIdx];
      const g = p1.data[sIdx + 1];
      const b = p1.data[sIdx + 2];

      // Blue pin: blue is high (b > 160) and red is low (r < 140)
      // Or white center hole: r > 240, g > 240, b > 240 inside the pin
      // Check distance from pin center
      const cx = pinW / 2;
      const cy = pinH / 2;
      const dist = Math.hypot(dx - cx, dy - cy);

      const isBlue = b > 160 && r < 145;
      const isHole = r > 230 && g > 230 && b > 230 && dist < 8;

      if (isBlue || isHole) {
        out.data[dIdx] = r;
        out.data[dIdx + 1] = g;
        out.data[dIdx + 2] = b;
        out.data[dIdx + 3] = 255;
      } else if (b > 150 && dist < 16) {
        // Antialiased edge
        const alpha = Math.min(255, Math.max(0, Math.round((b - r) * 2.5)));
        out.data[dIdx] = r;
        out.data[dIdx + 1] = g;
        out.data[dIdx + 2] = b;
        out.data[dIdx + 3] = alpha;
      }
    }
  }

  fs.writeFileSync(path.join(settingsDir, 'row_manual_pin.png'), PNG.sync.write(out));
  console.log('Fixed row_manual_pin.png (32x38)');
}

// 3. Re-extract opt_theme_sun.png, opt_theme_moon.png, opt_theme_monitor.png from p2
// Screen 3 of p2: x: 1050 to 1500, y: 240 to 360
// Sun center: x: 1050 + 78.5 = 1128.5, y: 240 + 62 = 302
// Moon center: x: 1050 + 228.5 = 1278.5, y: 302
// Monitor center: x: 1050 + 376 = 1426, y: 301
{
  const themes = [
    { name: 'opt_theme_sun.png', cx: 1128, cy: 302, isSun: true },
    { name: 'opt_theme_moon.png', cx: 1278, cy: 302, isDark: true },
    { name: 'opt_theme_monitor.png', cx: 1426, cy: 301, isDark: true },
  ];

  themes.forEach(({ name, cx, cy, isSun, isDark }) => {
    const size = 44;
    const startX = Math.round(cx - size / 2);
    const startY = Math.round(cy - size / 2);
    const out = new PNG({ width: size, height: size });

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const sIdx = ((startY + y) * p2.width + (startX + x)) * 4;
        const dIdx = (y * size + x) * 4;

        const r = p2.data[sIdx];
        const g = p2.data[sIdx + 1];
        const b = p2.data[sIdx + 2];

        if (isSun) {
          // Sun is green: g > 90 and r < 80 and b < 100
          // Card background is light mint: r ~ 242, g ~ 252, b ~ 246
          const brightness = (r + g + b) / 3;
          if (brightness < 200 && g > r) {
            const alpha = Math.min(255, Math.max(0, Math.round((240 - brightness) * 2.8)));
            out.data[dIdx] = r;
            out.data[dIdx + 1] = g;
            out.data[dIdx + 2] = b;
            out.data[dIdx + 3] = alpha;
          }
        } else if (isDark) {
          // Moon & Monitor are dark navy: r < 100, g < 100, b < 130
          // Card background is white: r > 245, g > 245, b > 245
          const brightness = (r + g + b) / 3;
          if (brightness < 200) {
            const alpha = Math.min(255, Math.max(0, Math.round((240 - brightness) * 2.5)));
            out.data[dIdx] = r;
            out.data[dIdx + 1] = g;
            out.data[dIdx + 2] = b;
            out.data[dIdx + 3] = alpha;
          }
        }
      }
    }

    fs.writeFileSync(path.join(settingsDir, name), PNG.sync.write(out));
    console.log('Fixed', name);
  });
}

// 4. Re-extract row_asr_check.png (Green circle with white checkmark)
// In p1: x: 789, y: 731, size: 26 in p1
{
  const size = 30;
  const startX = 787;
  const startY = 729;
  const out = new PNG({ width: size, height: size });
  const radius = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sIdx = ((startY + y) * p1.width + (startX + x)) * 4;
      const dIdx = (y * size + x) * 4;

      const r = p1.data[sIdx];
      const g = p1.data[sIdx + 1];
      const b = p1.data[sIdx + 2];

      const dist = Math.hypot(x - radius + 0.5, y - radius + 0.5);

      if (dist <= radius - 0.5) {
        out.data[dIdx] = r;
        out.data[dIdx + 1] = g;
        out.data[dIdx + 2] = b;
        out.data[dIdx + 3] = 255;
      } else if (dist <= radius + 0.5) {
        const alpha = Math.round((radius + 0.5 - dist) * 255);
        out.data[dIdx] = r;
        out.data[dIdx + 1] = g;
        out.data[dIdx + 2] = b;
        out.data[dIdx + 3] = alpha;
      }
    }
  }

  fs.writeFileSync(path.join(settingsDir, 'row_asr_check.png'), PNG.sync.write(out));
  fs.writeFileSync(path.join(settingsDir, 'opt_checked_green.png'), PNG.sync.write(out));
  console.log('Fixed row_asr_check.png & opt_checked_green.png (30x30)');
}

console.log('All settings icons updated successfully!');
