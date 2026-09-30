const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inDir = path.join(__dirname, '..', 'assets', 'icons', 'task_icons_backup');
const outDir = path.join(__dirname, '..', 'assets', 'icons', 'task_icons');

function processIcon(filePath, outPath) {
  const buf = fs.readFileSync(filePath);
  const png = PNG.sync.read(buf);
  const w = png.width;
  const h = png.height;
  const p = 4.2;
  const r = w / 2;
  const outCx = r;
  const outCy = r;

  // 1. Clear outer boundary and anything with squircle dist >= 0.78
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x + 0.5 - outCx) / (r - 2);
      const dy = Math.abs(y + 0.5 - outCy) / (r - 2);
      const sDist = Math.pow(dx, p) + Math.pow(dy, p);
      if (sDist >= 0.78 || x <= 12 || x >= w - 13 || y <= 12 || y >= h - 13) {
        png.data[(y * w + x) * 4 + 3] = 0;
      }
    }
  }

  // 2. Sample background color at perimeter
  const samplePoints = [
    [40, 40],
    [w - 40, 40],
    [40, h - 40],
    [w - 40, h - 40],
    [w / 2, 28],
    [28, h / 2],
    [w - 28, h / 2],
    [w / 2, h - 28],
  ];

  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let count = 0;

  for (const [x, y] of samplePoints) {
    const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
    if (png.data[idx + 3] > 200) {
      bgR += png.data[idx];
      bgG += png.data[idx + 1];
      bgB += png.data[idx + 2];
      count++;
    }
  }

  if (count === 0) {
    fs.writeFileSync(outPath, PNG.sync.write(png));
    return;
  }

  bgR /= count;
  bgG /= count;
  bgB /= count;

  // 3. Flood fill inward from boundary
  const visited = new Uint8Array(w * h);
  const queue = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (png.data[(y * w + x) * 4 + 3] === 0) {
        visited[y * w + x] = 1;
        if (x > 0 && png.data[((y) * w + (x - 1)) * 4 + 3] > 0) queue.push((y) * w + (x - 1));
        if (x < w - 1 && png.data[((y) * w + (x + 1)) * 4 + 3] > 0) queue.push((y) * w + (x + 1));
        if (y > 0 && png.data[((y - 1) * w + x) * 4 + 3] > 0) queue.push((y - 1) * w + x);
        if (y < h - 1 && png.data[((y + 1) * w + x) * 4 + 3] > 0) queue.push((y + 1) * w + x);
      }
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift();
    const cx = curr % w;
    const cy = Math.floor(curr / w);
    const idx = curr * 4;

    const r_val = png.data[idx];
    const g_val = png.data[idx + 1];
    const b_val = png.data[idx + 2];
    const dist = Math.sqrt((r_val - bgR) ** 2 + (g_val - bgG) ** 2 + (b_val - bgB) ** 2);

    // Tolerance of 34 safely removes pastel background without eating white/light subjects
    if (dist < 34) {
      png.data[idx + 3] = 0;
      const neighbors = [curr - 1, curr + 1, curr - w, curr + w];
      for (const n of neighbors) {
        if (n >= 0 && n < w * h && !visited[n]) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // 4. Clean residual border slivers / islands near outer edges (< 150 px or touching outer frame)
  const islandVisited = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (png.data[start * 4 + 3] > 0 && !islandVisited[start]) {
        const comp = [start];
        islandVisited[start] = 1;
        let cHead = 0;
        let touchesOuter = false;

        while (cHead < comp.length) {
          const cCurr = comp[cHead++];
          const ccx = cCurr % w;
          const ccy = Math.floor(cCurr / w);
          if (ccx <= 20 || ccx >= w - 21 || ccy <= 20 || ccy >= h - 21) {
            touchesOuter = true;
          }

          for (const cn of [cCurr - 1, cCurr + 1, cCurr - w, cCurr + w]) {
            if (cn >= 0 && cn < w * h && png.data[cn * 4 + 3] > 0 && !islandVisited[cn]) {
              islandVisited[cn] = 1;
              comp.push(cn);
            }
          }
        }

        if (comp.length < 150 || (touchesOuter && comp.length < 500)) {
          for (const pIdx of comp) {
            png.data[pIdx * 4 + 3] = 0;
          }
        }
      }
    }
  }

  fs.writeFileSync(outPath, PNG.sync.write(png));
}

const files = fs.readdirSync(inDir).filter(f => f.endsWith('.png') && !f.startsWith('test_'));
console.log(`Starting squircle border removal on ${files.length} icons...`);

for (const file of files) {
  processIcon(path.join(inDir, file), path.join(outDir, file));
}

console.log('All 72 icons processed into transparent borderless PNGs!');
