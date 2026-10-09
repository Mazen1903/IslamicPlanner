const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

/**
 * Chroma keying script for hero artwork.
 * Removes magenta (#FF00FF) or green (#00FF00) background,
 * applies feathered alpha, removes color spill, and auto-trims.
 */

/**
 * Alpha-aware box-filter downscale (premultiplied averaging). Returns the
 * original PNG when it is already <= targetWidth.
 */
function resizePng(src, targetWidth) {
  if (src.width <= targetWidth) return src;
  const scale = src.width / targetWidth;
  const dstW = targetWidth;
  const dstH = Math.max(1, Math.round(src.height / scale));
  const dst = new PNG({ width: dstW, height: dstH });
  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * scale);
    const y1 = Math.min(src.height, Math.max(y0 + 1, Math.ceil((y + 1) * scale)));
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * scale);
      const x1 = Math.min(src.width, Math.max(x0 + 1, Math.ceil((x + 1) * scale)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (src.width * sy + sx) * 4;
          const al = src.data[i + 3];
          r += src.data[i] * al;
          g += src.data[i + 1] * al;
          b += src.data[i + 2] * al;
          a += al;
          n++;
        }
      }
      const o = (dstW * y + x) * 4;
      if (a > 0) {
        dst.data[o] = Math.round(r / a);
        dst.data[o + 1] = Math.round(g / a);
        dst.data[o + 2] = Math.round(b / a);
      }
      dst.data[o + 3] = Math.round(a / n);
    }
  }
  return dst;
}
function keyImage({ inputPath, outputPath, keyColor = 'magenta', targetWidth = 660 }) {
  console.log(`Processing: ${inputPath} -> ${outputPath} (key: ${keyColor})`);
  const buf = fs.readFileSync(inputPath);
  let rawData;
  let width, height;

  if (inputPath.endsWith('.jpg') || inputPath.endsWith('.jpeg')) {
    const decoded = jpeg.decode(buf, { useTArray: true });
    width = decoded.width;
    height = decoded.height;
    rawData = Buffer.from(decoded.data);
  } else {
    const png = PNG.sync.read(buf);
    width = png.width;
    height = png.height;
    rawData = png.data;
  }

  // Auto-trim bounds
  let minX = width, minY = height, maxX = 0, maxY = 0;

  // Process pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      const r = rawData[idx];
      const g = rawData[idx + 1];
      const b = rawData[idx + 2];

      let alpha = 255;

      if (keyColor === 'magenta') {
        // Magenta has high R and B, low G
        const magentaSignal = (r + b) / 2 - g;
        const lowThresh = 45;
        const highThresh = 85;

        if (magentaSignal >= highThresh) {
          alpha = 0;
        } else if (magentaSignal > lowThresh) {
          const t = (magentaSignal - lowThresh) / (highThresh - lowThresh);
          alpha = Math.round(255 * (1 - t));
          // De-spill magenta: bring R and B closer to G
          rawData[idx] = Math.min(r, Math.max(g, b * 0.7));
          rawData[idx + 2] = Math.min(b, Math.max(g, r * 0.7));
        }
      } else if (keyColor === 'green') {
        // Green has high G compared to R and B
        const greenSignal = g - (r + b) / 2;
        const lowThresh = 35;
        const highThresh = 75;

        if (greenSignal >= highThresh) {
          alpha = 0;
        } else if (greenSignal > lowThresh) {
          const t = (greenSignal - lowThresh) / (highThresh - lowThresh);
          alpha = Math.round(255 * (1 - t));
          // De-spill green: clamp G to average of R and B
          rawData[idx + 1] = Math.min(g, Math.round((r + b) / 2));
        }
      }

      rawData[idx + 3] = alpha;

      if (alpha > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Safety check on trim bounds
  if (minX > maxX || minY > maxY) {
    minX = 0; minY = 0; maxX = width - 1; maxY = height - 1;
  }

  // Add 4px padding if possible
  minX = Math.max(0, minX - 4);
  minY = Math.max(0, minY - 4);
  maxX = Math.min(width - 1, maxX + 4);
  maxY = Math.min(height - 1, maxY + 4);

  const croppedW = maxX - minX + 1;
  const croppedH = maxY - minY + 1;

  console.log(`Trimmed size: ${croppedW}x${croppedH} from ${width}x${height}`);

  // Create trimmed PNG
  const outPng = new PNG({ width: croppedW, height: croppedH });
  for (let y = 0; y < croppedH; y++) {
    for (let x = 0; x < croppedW; x++) {
      const srcIdx = (width * (minY + y) + (minX + x)) * 4;
      const dstIdx = (croppedW * y + x) * 4;
      outPng.data[dstIdx] = rawData[srcIdx];
      outPng.data[dstIdx + 1] = rawData[srcIdx + 1];
      outPng.data[dstIdx + 2] = rawData[srcIdx + 2];
      outPng.data[dstIdx + 3] = rawData[srcIdx + 3];
    }
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const finalPng = resizePng(outPng, targetWidth);
  fs.writeFileSync(outputPath, PNG.sync.write(finalPng, { colorType: 6, deflateLevel: 9 }));
  console.log(`Successfully written to: ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
}

module.exports = { keyImage, resizePng };

if (require.main === module) {
  const [,, a, b, c] = process.argv;
  if (a === '--resize') {
    // node scripts/key-hero-art.js --resize <dir> [width]
    const dir = b;
    const width = parseInt(c || '660', 10);
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.png'))) {
      const p = path.join(dir, f);
      const before = fs.statSync(p).size;
      const out = resizePng(PNG.sync.read(fs.readFileSync(p)), width);
      fs.writeFileSync(p, PNG.sync.write(out, { colorType: 6, deflateLevel: 9 }));
      console.log(`${f}: ${before} -> ${fs.statSync(p).size} bytes (${out.width}x${out.height})`);
    }
  } else {
    const inputPath = a;
    const outputPath = b;
    if (!inputPath || !outputPath) {
      console.error('Usage: node scripts/key-hero-art.js <input> <output> [magenta|green]\n       node scripts/key-hero-art.js --resize <dir> [width]');
      process.exit(1);
    }
    keyImage({ inputPath, outputPath, keyColor: c || 'magenta' });
  }
}
