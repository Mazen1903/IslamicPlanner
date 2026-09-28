const fs = require('fs');

const iconsContent = fs.readFileSync('src/constants/taskIcons.ts', 'utf8');
const assetsContent = fs.readFileSync('src/constants/taskIconAssets.ts', 'utf8');

const idMatches = [...iconsContent.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const assetMatches = [...assetsContent.matchAll(/['"]?([a-zA-Z0-9_-]+)['"]?:\s*require/g)].map(m => m[1]);

console.log('Total icons in taskIcons.ts:', idMatches.length);
console.log('Total assets registered:', assetMatches.length);

const missing = idMatches.filter(id => !assetMatches.includes(id));
console.log('Missing assets:', missing);

// Check if all files exist on disk
const missingFiles = assetMatches.filter(id => {
  const p = `assets/icons/task_icons/${id}.png`;
  return !fs.existsSync(p);
});
console.log('Missing PNG files on disk:', missingFiles);
