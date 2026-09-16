#!/usr/bin/env node

/**
 * build-review-context.js
 *
 * Lightweight script to build a compact review context bundle for Claude Opus review.
 * Bundles the AI project constitution, current milestone contract, git diff stat,
 * changed files list, commit summaries, and verification commands without dumping
 * full code diffs into the context window.
 *
 * Usage:
 *   node scripts/ai/build-review-context.js <milestone> <baselineCommit> <candidateCommit>
 *
 * Example:
 *   node scripts/ai/build-review-context.js M8 dc46afc abc1234
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    const errorMsg = err.stderr ? err.stderr.toString().trim() : err.message;
    return `[Git Command Failed: ${cmd}]\n${errorMsg}`;
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node scripts/ai/build-review-context.js <milestone> <baselineCommit> <candidateCommit>');
    console.error('Example: node scripts/ai/build-review-context.js M8 dc46afc abc1234');
    process.exit(1);
  }

  const [milestone, baselineCommit, candidateCommit] = args;
  const projectRoot = process.cwd();

  const constitutionPath = path.join(projectRoot, 'docs', 'AI_PROJECT_CONSTITUTION.md');
  const currentMilestonePath = path.join(projectRoot, 'docs', 'CURRENT_MILESTONE.md');
  const outputDir = path.join(projectRoot, '.ai', 'context');
  const outputPath = path.join(outputDir, `${milestone}-review.md`);

  if (!fs.existsSync(constitutionPath)) {
    console.error(`Error: Missing constitution file at ${constitutionPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(currentMilestonePath)) {
    console.error(`Error: Missing current milestone file at ${currentMilestonePath}`);
    process.exit(1);
  }

  const constitutionContent = fs.readFileSync(constitutionPath, 'utf8').trim();
  const milestoneContent = fs.readFileSync(currentMilestonePath, 'utf8').trim();

  // Validate that requested milestone matches CURRENT_MILESTONE.md
  const milestoneMatch = milestoneContent.match(/^#\s*Current Milestone:\s*(M\d+)/im);
  const declaredMilestone = milestoneMatch ? milestoneMatch[1].toUpperCase() : null;

  if (declaredMilestone && milestone.toUpperCase() !== declaredMilestone) {
    console.error(`Requested milestone ${milestone} does not match CURRENT_MILESTONE.md (${declaredMilestone}).`);
    console.error(`Update CURRENT_MILESTONE.md or use the current milestone.`);
    process.exit(1);
  }

  // Execute git commands
  const diffStat = runGit(`git diff --stat ${baselineCommit}..${candidateCommit}`) || '(No changes in diff stat)';
  const changedFiles = runGit(`git diff --name-only ${baselineCommit}..${candidateCommit}`) || '(No files changed)';
  
  let commitSummary = runGit(`git log --oneline --reverse ${baselineCommit}..${candidateCommit}`);
  if (!commitSummary) {
    // If range returned nothing, show candidate commit info
    commitSummary = runGit(`git show --stat --oneline -s ${candidateCommit}`) || `Commit: ${candidateCommit}`;
  }

  const markdownContent = `# Review Context: ${milestone}

- **Milestone:** ${milestone}
- **Baseline Commit:** \`${baselineCommit}\`
- **Candidate Commit:** \`${candidateCommit}\`
- **Generated At:** ${new Date().toISOString()}

---

## Verification Commands

Run the standard repository verification suite prior to review:

\`\`\`bash
npm test
npm run typecheck
npm run lint
npx expo-doctor
npx expo install --check
\`\`\`

---

## Git Diff Stat (\`${baselineCommit}..${candidateCommit}\`)

\`\`\`text
${diffStat}
\`\`\`

---

## Changed Files

\`\`\`text
${changedFiles}
\`\`\`

---

## Commit Summary

\`\`\`text
${commitSummary}
\`\`\`

---

## Current Milestone Contract

${milestoneContent}

---

## Project Constitution

${constitutionContent}
`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdownContent, 'utf8');
  console.log(`Successfully generated review context packet:`);
  console.log(`  Path: ${outputPath}`);
  console.log(`  Size: ${markdownContent.length} characters / ~${Math.round(markdownContent.split(/\s+/).length)} words`);
}

main();
