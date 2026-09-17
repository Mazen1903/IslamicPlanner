/* global __dirname */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function preprocessCities() {
  const sourcePath = path.join(__dirname, '..', 'cities_temp', 'cities1000.txt');
  const targetDir = path.join(__dirname, '..', 'src', 'assets');
  const targetFile = path.join(targetDir, 'cities.json');

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found at ${sourcePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(sourcePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const records = [];
  const tzCache = new Map();
  let rawInputCount = 0;
  let rejectedCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    rawInputCount++;
    const parts = line.split('\t');

    // GeoNames cities1000 format:
    // 0: geonameid
    // 1: name (utf8)
    // 4: latitude
    // 5: longitude
    // 8: country code (ISO-3166 2-letter)
    // 10: admin1 code
    // 17: timezone (IANA)

    const id = String(parts[0]);
    const name = parts[1];
    const lat = Math.round(parseFloat(parts[4]) * 10000) / 10000;
    const lng = Math.round(parseFloat(parts[5]) * 10000) / 10000;
    const countryCode = parts[8];
    const adminCode = parts[10] ? parts[10].trim() : undefined;
    const timezone = parts[17] ? parts[17].trim() : '';

    if (!timezone || isNaN(lat) || isNaN(lng) || !name) {
      rejectedCount++;
      continue;
    }

    if (!tzCache.has(timezone)) {
      try {
        new Intl.DateTimeFormat(undefined, { timeZone: timezone });
        tzCache.set(timezone, true);
      } catch {
        tzCache.set(timezone, false);
        rejectedCount++;
        continue;
      }
    } else if (!tzCache.get(timezone)) {
      rejectedCount++;
      continue;
    }

    const record = {
      id,
      name,
      countryCode,
      latitude: lat,
      longitude: lng,
      timezone,
    };

    if (adminCode) {
      record.adminCode = adminCode;
    }

    records.push(record);
  }

  const jsonStr = JSON.stringify(records);
  fs.writeFileSync(targetFile, jsonStr, 'utf8');

  const validTimezones = new Set(records.map(r => r.timezone));
  const stats = fs.statSync(targetFile);
  console.log('--- Preprocessing Summary ---');
  console.log('Raw input record count:', rawInputCount);
  console.log('Accepted output record count:', records.length);
  console.log('Rejected record count:', rejectedCount);
  console.log('Unique valid timezone count:', validTimezones.size);
  console.log('Target file:', targetFile);
  console.log('Minified output size (bytes):', stats.size);
  console.log('Minified output size (MB):', (stats.size / (1024 * 1024)).toFixed(2));
}

preprocessCities().catch(err => {
  console.error('Error preprocessing cities:', err);
  process.exit(1);
});
