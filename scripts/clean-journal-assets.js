const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT_DIR = path.resolve(__dirname, '..');
const RAW_CROPS_DIR = path.join(ROOT_DIR, 'assets', 'icons', 'journal', 'raw_crops');
const OUT_TRANSPARENT_DIR = path.join(ROOT_DIR, 'assets', 'icons', 'journal', 'transparent_png');
const ILLUSTRATIONS_DIR = path.join(ROOT_DIR, 'assets', 'icons', 'journal', 'illustrations');
const ILLUSTRATIONS_BACKUP_DIR = path.join(ROOT_DIR, 'assets', 'icons', 'journal', 'illustrations_raw_backup');

// Ensure backup directory exists
if (!fs.existsSync(ILLUSTRATIONS_BACKUP_DIR)) {
  fs.mkdirSync(ILLUSTRATIONS_BACKUP_DIR, { recursive: true });
}

/**
 * Clean an image using boundary BFS flood-fill with bilinear background interpolation
 * and edge anti-aliasing / de-fringing.
 */
function cleanImage(inputBuffer, options = {}) {
  const png = PNG.sync.read(inputBuffer);
  const { width, height } = png;

  // Sample 4 true corners
  const sampleCorner = (x, y) => {
    const idx = (width * y + x) << 2;
    return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
  };

  const TL = sampleCorner(0, 0);
  const TR = sampleCorner(width - 1, 0);
  const BL = sampleCorner(0, height - 1);
  const BR = sampleCorner(width - 1, height - 1);

  const getExpectedBg = (x, y) => {
    const tx = x / (width - 1 || 1);
    const ty = y / (height - 1 || 1);
    return [
      (1 - tx) * (1 - ty) * TL[0] + tx * (1 - ty) * TR[0] + (1 - tx) * ty * BL[0] + tx * ty * BR[0],
      (1 - tx) * (1 - ty) * TL[1] + tx * (1 - ty) * TR[1] + (1 - tx) * ty * BL[1] + tx * ty * BR[1],
      (1 - tx) * (1 - ty) * TL[2] + tx * (1 - ty) * TR[2] + (1 - tx) * ty * BL[2] + tx * ty * BR[2],
    ];
  };

  const bgThreshold = options.bgThreshold || 30;
  const featherThreshold = options.featherThreshold || 55;
  const skipBottomSeed = Boolean(options.skipBottomSeed);

  function colorDist(x, y) {
    const idx = (width * y + x) << 2;
    const exp = getExpectedBg(x, y);
    return Math.sqrt(
      (png.data[idx] - exp[0]) ** 2 +
      (png.data[idx + 1] - exp[1]) ** 2 +
      (png.data[idx + 2] - exp[2]) ** 2
    );
  }

  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed top boundary
  for (let x = 0; x < width; x++) {
    const pos = width * 0 + x;
    if (colorDist(x, 0) <= bgThreshold) {
      queue.push([x, 0]);
      visited[pos] = 1;
    }
  }

  // Seed bottom boundary if not skipped
  if (!skipBottomSeed) {
    for (let x = 0; x < width; x++) {
      const y = height - 1;
      const pos = width * y + x;
      if (colorDist(x, y) <= bgThreshold) {
        queue.push([x, y]);
        visited[pos] = 1;
      }
    }
  }

  // Seed left & right boundaries
  for (let y = 1; y < height - 1; y++) {
    for (const x of [0, width - 1]) {
      const pos = width * y + x;
      if (colorDist(x, y) <= bgThreshold) {
        queue.push([x, y]);
        visited[pos] = 1;
      }
    }
  }

  // BFS flood fill
  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const pos = width * ny + nx;
        if (!visited[pos]) {
          if (colorDist(nx, ny) <= bgThreshold) {
            visited[pos] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  // Determine which pixels neighbor the background for feathering
  const isAdjacentToBg = (x, y) => {
    for (const [dx, dy] of [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, -1], [1, -1], [-1, 1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (visited[width * ny + nx]) return true;
      }
    }
    return false;
  };

  // Apply transparency and anti-aliasing
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = width * y + x;
      const idx = pos << 2;

      if (visited[pos]) {
        // True background -> full transparent
        png.data[idx + 3] = 0;
      } else if (isAdjacentToBg(x, y)) {
        // Edge pixel near background -> feather and de-fringe
        const d = colorDist(x, y);
        if (d < featherThreshold) {
          const factor = Math.max(0, (d - bgThreshold) / (featherThreshold - bgThreshold));
          const targetAlpha = Math.round(factor * 255);
          png.data[idx + 3] = Math.min(png.data[idx + 3], targetAlpha);

          // Color decontamination: if pixel has background color blended in, remove background tint
          if (targetAlpha > 5 && targetAlpha < 255) {
            const exp = getExpectedBg(x, y);
            const aNorm = targetAlpha / 255;
            png.data[idx] = Math.min(255, Math.max(0, Math.round((png.data[idx] - exp[0] * (1 - aNorm)) / aNorm)));
            png.data[idx + 1] = Math.min(255, Math.max(0, Math.round((png.data[idx + 1] - exp[1] * (1 - aNorm)) / aNorm)));
            png.data[idx + 2] = Math.min(255, Math.max(0, Math.round((png.data[idx + 2] - exp[2] * (1 - aNorm)) / aNorm)));
          }
        }
      }
    }
  }

  return PNG.sync.write(png);
}

function processAllAssets() {
  console.log('--- Cleaning Journal Icons from raw_crops ---');
  const cropFiles = fs.readdirSync(RAW_CROPS_DIR).filter((f) => f.endsWith('.png'));

  for (const file of cropFiles) {
    const rawPath = path.join(RAW_CROPS_DIR, file);
    const outPath = path.join(OUT_TRANSPARENT_DIR, file);
    const inputBuf = fs.readFileSync(rawPath);

    const options = {};
    if (file === 'write_arrow_white.png' || file === 'write_pencil_white.png') {
      options.bgThreshold = 55;
      options.featherThreshold = 80;
    } else if (file === 'gratitude_hands.png' || file === 'entry_clipboard.png' || file === 'what_went_well_check.png') {
      options.bgThreshold = 42;
      options.featherThreshold = 65;
    } else if (file === 'for_tomorrow_chart.png') {
      options.bgThreshold = 35;
      options.featherThreshold = 60;
    }

    const cleanedBuf = cleanImage(inputBuf, options);
    fs.writeFileSync(outPath, cleanedBuf);
    console.log(`✓ Cleaned transparent icon: ${file}`);
  }

  console.log('\n--- Cleaning Journal Illustrations ---');
  const illustrations = [
    { file: 'reflection_lantern_artwork_raw.png', options: { bgThreshold: 30, featherThreshold: 55 } },
    { file: 'header_mosque_artwork_raw.png', options: { bgThreshold: 30, featherThreshold: 55, skipBottomSeed: true } },
  ];

  for (const { file, options } of illustrations) {
    const filePath = path.join(ILLUSTRATIONS_DIR, file);
    const backupPath = path.join(ILLUSTRATIONS_BACKUP_DIR, file);

    if (fs.existsSync(filePath)) {
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`Backed up original illustration to: ${path.relative(ROOT_DIR, backupPath)}`);
      }

      // Read from backup to always start from pristine original
      const sourceBuf = fs.readFileSync(backupPath);
      const cleanedBuf = cleanImage(sourceBuf, options);

      fs.writeFileSync(filePath, cleanedBuf);
      console.log(`✓ Cleaned transparent illustration: ${file}`);
    }
  }

  console.log('\nAsset cleaning completed successfully.');
}

processAllAssets();
