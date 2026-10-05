const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

/**
 * Processes an AI-generated image (JPG or PNG) on a light/white background:
 * 1. Floods from edges to remove white/light gray background.
 * 2. Crops to bounding box with balanced padding.
 * 3. Resizes to targetSize (default 304x304) and writes PNG with transparent background.
 */
function processTaskIcon(inputPath, outputPath, targetSize = 304) {
  const fileBuf = fs.readFileSync(inputPath);
  let w, h, data;

  if (inputPath.endsWith('.jpg') || inputPath.endsWith('.jpeg')) {
    const decoded = jpeg.decode(fileBuf);
    w = decoded.width;
    h = decoded.height;
    data = decoded.data;
  } else {
    const png = PNG.sync.read(fileBuf);
    w = png.width;
    h = png.height;
    data = png.data;
  }

  const alpha = new Uint8Array(w * h).fill(255);
  const visited = new Uint8Array(w * h);
  const queue = [];

  // Seed boundary
  for (let x = 0; x < w; x++) {
    queue.push(x);
    queue.push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    queue.push(y * w);
    queue.push(y * w + (w - 1));
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pIdx = idx * 4;
    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];

    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    const isLight = minVal > 225 && (maxVal - minVal) < 30;
    const isShadow = minVal > 200 && (maxVal - minVal) < 20;

    if (isLight || isShadow) {
      alpha[idx] = 0;
      const cx = idx % w;
      const cy = Math.floor(idx / w);
      if (cx > 0) queue.push(idx - 1);
      if (cx < w - 1) queue.push(idx + 1);
      if (cy > 0) queue.push(idx - w);
      if (cy < h - 1) queue.push(idx + w);
    }
  }

  // Find bounding box
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    console.error('Failed to find foreground for:', inputPath);
    return;
  }

  const fgW = maxX - minX + 1;
  const fgH = maxY - minY + 1;
  const size = Math.max(fgW, fgH);
  const pad = Math.round(size * 0.08);
  const totalSize = size + pad * 2;
  const offsetX = minX - (totalSize - fgW) / 2;
  const offsetY = minY - (totalSize - fgH) / 2;

  const outPng = new PNG({ width: targetSize, height: targetSize });

  for (let ty = 0; ty < targetSize; ty++) {
    for (let tx = 0; tx < targetSize; tx++) {
      const srcX = Math.round(offsetX + (tx / targetSize) * totalSize);
      const srcY = Math.round(offsetY + (ty / targetSize) * totalSize);
      const outIdx = (ty * targetSize + tx) * 4;

      if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
        const srcIdx = (srcY * w + srcX) * 4;
        const srcA = alpha[srcY * w + srcX];
        outPng.data[outIdx] = data[srcIdx];
        outPng.data[outIdx + 1] = data[srcIdx + 1];
        outPng.data[outIdx + 2] = data[srcIdx + 2];
        outPng.data[outIdx + 3] = srcA;
      } else {
        outPng.data[outIdx + 3] = 0;
      }
    }
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, PNG.sync.write(outPng));
  console.log(`Processed: ${inputPath} -> ${outputPath}`);
}

module.exports = { processTaskIcon };

if (require.main === module) {
  const [,, input, output, size] = process.argv;
  if (!input || !output) {
    console.error('Usage: node process-single-icon.js <input.jpg|png> <output.png> [size]');
    process.exit(1);
  }
  processTaskIcon(input, output, size ? parseInt(size, 10) : 304);
}
