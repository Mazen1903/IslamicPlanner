const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

const rootDir = path.resolve(__dirname, '..');
const srcArtworkPath = path.join(rootDir, 'docs', 'appearanceartwork.png');
const cardsOutputDir = path.join(rootDir, 'assets', 'themes', 'cards');

if (!fs.existsSync(cardsOutputDir)) {
  fs.mkdirSync(cardsOutputDir, { recursive: true });
}

console.log('Reading artwork from:', srcArtworkPath);
const data = fs.readFileSync(srcArtworkPath);
const png = PNG.sync.read(data);
console.log('Artwork size:', png.width, 'x', png.height);

const TARGET_WIDTH = 480;
const TARGET_HEIGHT = 290;

const CARDS_CONFIG = [
  {
    id: 'classic_default',
    name: 'Classic Default',
    left: 23,
    top: 27,
    naturalHeight: 298,
    badge: { cx: 456, cy: 65, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'fajr_awakening',
    name: 'Fajr Awakening',
    left: 521,
    top: 27,
    naturalHeight: 298,
    badge: { cx: 963, cy: 65, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'rawdah_emerald',
    name: 'Rawdah Emerald',
    left: 26,
    top: 336,
    naturalHeight: 293,
    badge: { cx: 462, cy: 372, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'tahajjud_noor',
    name: 'Tahajjud Noor',
    left: 519,
    top: 336,
    naturalHeight: 295,
    badge: { cx: 960, cy: 375, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'andalusian_oasis',
    name: 'Andalusian Oasis',
    left: 26,
    top: 642,
    naturalHeight: 292,
    badge: { cx: 462, cy: 676, rx: 38, ry: 38 },
    skySample: { dx: 15, dy: -32 }, // above badge in pure sky
  },
  {
    id: 'sacred_tawaf',
    name: 'Sacred Tawaf',
    left: 521,
    top: 642,
    naturalHeight: 292,
    badge: { cx: 964, cy: 677, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'blessed_olive',
    name: 'Blessed Olive Grove',
    left: 27,
    top: 947,
    naturalHeight: 282,
    badge: { cx: 462, cy: 980, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'samarkand_turquoise',
    name: 'Samarkand Turquoise',
    left: 520,
    top: 947,
    naturalHeight: 282,
    badge: { cx: 962, cy: 981, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'celestial_caravan',
    name: 'Celestial Caravan',
    left: 27,
    top: 1242,
    naturalHeight: 264,
    badge: { cx: 464, cy: 1275, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
  {
    id: 'maghrib_lantern',
    name: 'Maghrib Lantern',
    left: 520,
    top: 1242,
    naturalHeight: 265,
    badge: { cx: 964, cy: 1275, rx: 38, ry: 38 },
    skySample: { dx: -70, dy: 15 },
  },
];

// Helper: inpaint sky by smoothly filling the badge circular area
function inpaintBadgeSky(srcPng, card) {
  const cardRight = card.left + TARGET_WIDTH - 1;
  const cardBottom = card.top + card.naturalHeight;
  const { cx, cy, rx, ry } = card.badge;

  const sampleX = cx + card.skySample.dx;
  const sampleY = card.top + (card.skySample.dy > 0 ? card.skySample.dy : (cy - card.top + card.skySample.dy));
  const sampleIdx = (sampleY * srcPng.width + sampleX) * 4;
  const baseR = srcPng.data[sampleIdx];
  const baseG = srcPng.data[sampleIdx + 1];
  const baseB = srcPng.data[sampleIdx + 2];

  for (let y = cy - ry - 6; y <= cy + ry + 6; y++) {
    if (y < card.top + 5 || y > cardBottom - 5) continue;

    let rowR = baseR;
    let rowG = baseG;
    let rowB = baseB;

    const refX = cx - rx - 8;
    if (card.id !== 'andalusian_oasis' && card.id !== 'blessed_olive') {
      const refIdx = (y * srcPng.width + refX) * 4;
      rowR = srcPng.data[refIdx];
      rowG = srcPng.data[refIdx + 1];
      rowB = srcPng.data[refIdx + 2];
    }

    for (let x = cx - rx - 6; x <= cardRight - 4; x++) {
      // Preserve rounded corner border stroke
      const distFromTopRight = Math.hypot(cardRight - x, y - card.top);
      if (distFromTopRight < 10) continue;

      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.40) {
        const targetIdx = (y * srcPng.width + x) * 4;
        srcPng.data[targetIdx] = rowR;
        srcPng.data[targetIdx + 1] = rowG;
        srcPng.data[targetIdx + 2] = rowB;
      }
    }
  }
}

// Inpaint all badges on the source png
CARDS_CONFIG.forEach(card => {
  inpaintBadgeSky(png, card);
  console.log(`Inpainted badge cleanly for: ${card.name}`);
});

// Extract each card with unified TARGET_WIDTH x TARGET_HEIGHT
CARDS_CONFIG.forEach(card => {
  const cardBuffer = Buffer.alloc(TARGET_WIDTH * TARGET_HEIGHT * 4);

  for (let dy = 0; dy < TARGET_HEIGHT; dy++) {
    const syFraction = (dy / (TARGET_HEIGHT - 1)) * (card.naturalHeight - 1);
    const sy0 = Math.floor(syFraction);
    const sy1 = Math.min(sy0 + 1, card.naturalHeight - 1);
    const syWeight = syFraction - sy0;

    const actualY0 = card.top + sy0;
    const actualY1 = card.top + sy1;

    for (let dx = 0; dx < TARGET_WIDTH; dx++) {
      const actualX = card.left + dx;

      const idx0 = (actualY0 * png.width + actualX) * 4;
      const idx1 = (actualY1 * png.width + actualX) * 4;

      const r = Math.round(png.data[idx0] * (1 - syWeight) + png.data[idx1] * syWeight);
      const g = Math.round(png.data[idx0 + 1] * (1 - syWeight) + png.data[idx1 + 1] * syWeight);
      const b = Math.round(png.data[idx0 + 2] * (1 - syWeight) + png.data[idx1 + 2] * syWeight);

      const destIdx = (dy * TARGET_WIDTH + dx) * 4;
      cardBuffer[destIdx] = r;
      cardBuffer[destIdx + 1] = g;
      cardBuffer[destIdx + 2] = b;
      cardBuffer[destIdx + 3] = 255;
    }
  }

  const jpegImageData = {
    data: cardBuffer,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  };
  const jpegBuffer = jpeg.encode(jpegImageData, 95).data;

  const destFile = path.join(cardsOutputDir, `${card.id}.jpg`);
  fs.writeFileSync(destFile, jpegBuffer);
  console.log(`Saved unified card: ${destFile} (${TARGET_WIDTH}x${TARGET_HEIGHT})`);
});

const alAqsaCard = path.join(cardsOutputDir, 'al_aqsa_sunset.jpg');
if (fs.existsSync(alAqsaCard)) {
  fs.unlinkSync(alAqsaCard);
  console.log('Removed retired card: al_aqsa_sunset.jpg');
}

console.log('Card extraction and inpainting completed successfully!');
