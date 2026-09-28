const fs = require('fs');
const path = require('path');
const { processIcon } = require('./process-task-icons');

/**
 * Given the artifact image path and the icon id, processes it and updates taskIconAssets.ts
 */
function registerGeneratedIcon(artifactPath, iconId) {
  const outputPath = path.join(__dirname, '..', 'assets', 'icons', 'task_icons', `${iconId}.png`);
  processIcon(artifactPath, outputPath, 304);

  // Update taskIconAssets.ts
  const assetsFile = path.join(__dirname, '..', 'src', 'constants', 'taskIconAssets.ts');
  let content = fs.readFileSync(assetsFile, 'utf8');

  // Check if iconId is already in TASK_ICON_ASSETS
  if (!content.includes(`'${iconId}':`) && !content.includes(`${iconId}:`)) {
    const importEntry = `  '${iconId}': require('../../assets/icons/task_icons/${iconId}.png'),\n};`;
    content = content.replace(/\n\};/, `,\n${importEntry}`);
    fs.writeFileSync(assetsFile, content, 'utf8');
    console.log(`Updated taskIconAssets.ts with icon: ${iconId}`);
  }
}

module.exports = { registerGeneratedIcon };

if (require.main === module) {
  const [,, artifactPath, iconId] = process.argv;
  if (!artifactPath || !iconId) {
    console.error('Usage: node batch-helper.js <artifactPath> <iconId>');
    process.exit(1);
  }
  registerGeneratedIcon(artifactPath, iconId);
}
