const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

/**
 * Automatically crops and applies an antialiased squircle mask
 * to a generated AI icon on white background.
 *
 * @param {string} inputPath - Path to the generated JPG or PNG file.
 * @param {string} outputPath - Output PNG path.
 * @param {number} [targetSize=304] - Output dimensions (width & height).
 */
function processIcon(inputPath, outputPath, targetSize = 304) {
  const fileBuf = fs.readFileSync(inputPath);
  let rawWidth, rawHeight, rawData;

  if (inputPath.endsWith('.jpg') || inputPath.endsWith('.jpeg')) {
    const decoded = jpeg.decode(fileBuf);
    rawWidth = decoded.width;
    rawHeight = decoded.height;
    rawData = decoded.data;
  } else {
    const png = PNG.sync.read(fileBuf);
    rawWidth = png.width;
    rawHeight = png.height;
    rawData = png.data;
  }

  // Detect squircle edges via ray-casting from center
  const cx = Math.floor(rawWidth / 2);
  const cy = Math.floor(rawHeight / 2);

  // Background sample at corner (0,0)
  const bgR = rawData[0];
  const bgG = rawData[1];
  const bgB = rawData[2];

  // Raycast to top edge
  let topY = Math.floor(rawHeight * 0.15);
  for (let y = topY; y < cy; y++) {
    const idx = (y * rawWidth + cx) * 4;
    const diff = Math.abs(rawData[idx] - bgR) + Math.abs(rawData[idx + 1] - bgG) + Math.abs(rawData[idx + 2] - bgB);
    if (diff > 25) {
      topY = y;
      break;
    }
  }

  // Raycast to left edge
  let leftX = Math.floor(rawWidth * 0.15);
  for (let x = leftX; x < cx; x++) {
    const idx = (cy * rawWidth + x) * 4;
    const diff = Math.abs(rawData[idx] - bgR) + Math.abs(rawData[idx + 1] - bgG) + Math.abs(rawData[idx + 2] - bgB);
    if (diff > 25) {
      leftX = x;
      break;
    }
  }

  // Squircle size
  const squircleW = (cx - leftX) * 2;
  const squircleH = (cy - topY) * 2;
  const cropSize = Math.max(squircleW, squircleH);
  const cropX = cx - cropSize / 2;
  const cropY = cy - cropSize / 2;

  const outPng = new PNG({ width: targetSize, height: targetSize });

  // Superellipse squircle formula: (|x/r|^p + |y/r|^p <= 1)
  const p = 4.2;
  const r = targetSize / 2;
  const outCx = r;
  const outCy = r;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcX = Math.min(rawWidth - 1, Math.max(0, Math.round(cropX + (x / targetSize) * cropSize)));
      const srcY = Math.min(rawHeight - 1, Math.max(0, Math.round(cropY + (y / targetSize) * cropSize)));
      const srcIdx = (srcY * rawWidth + srcX) * 4;

      const outIdx = (y * targetSize + x) * 4;
      outPng.data[outIdx] = rawData[srcIdx];
      outPng.data[outIdx + 1] = rawData[srcIdx + 1];
      outPng.data[outIdx + 2] = rawData[srcIdx + 2];

      const dx = Math.abs(x + 0.5 - outCx) / (r - 2);
      const dy = Math.abs(y + 0.5 - outCy) / (r - 2);
      const dist = Math.pow(dx, p) + Math.pow(dy, p);

      if (dist <= 0.96) {
        outPng.data[outIdx + 3] = 255;
      } else if (dist <= 1.04) {
        // antialiased edge
        const alpha = Math.round(255 * (1 - (dist - 0.96) / 0.08));
        outPng.data[outIdx + 3] = Math.max(0, Math.min(255, alpha));
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
  console.log(`Processed: ${inputPath} -> ${outputPath} (${targetSize}x${targetSize})`);
}

module.exports = { processIcon };

if (require.main === module) {
  const [,, input, output] = process.argv;
  if (!input || !output) {
    console.error('Usage: node process-task-icons.js <input.jpg|png> <output.png>');
    process.exit(1);
  }
  processIcon(input, output);
}
