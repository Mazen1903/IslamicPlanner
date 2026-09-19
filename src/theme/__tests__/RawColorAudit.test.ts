import fs from 'fs';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  match: string;
  type: 'HEX' | 'RGB' | 'RGBA' | 'HSL' | 'HSLA' | 'NAMED';
}

function stripComments(code: string): string {
  // Replace multi-line comments with newlines to preserve line numbering
  let stripped = code.replace(/\/\*[\s\S]*?\*\//g, match => {
    return '\n'.repeat((match.match(/\n/g) || []).length);
  });
  // Replace single-line comments
  stripped = stripped.replace(/\/\/.*$/gm, '');
  return stripped;
}

const HEX_REGEX = /#([0-9A-Fa-f]{3,8})\b/g;
const RGB_REGEX = /\brgb\s*\([^)]+\)/gi;
const RGBA_REGEX = /\brgba\s*\([^)]+\)/gi;
const HSL_REGEX = /\bhsl\s*\([^)]+\)/gi;
const HSLA_REGEX = /\bhsla\s*\([^)]+\)/gi;
const NAMED_COLOR_REGEX = /(?:color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|shadowColor)\s*:\s*['"](white|black)['"]/gi;

const APPROVED_PRAYER_HEADER_RGBA = new Set([
  'rgba(255, 255, 255, 0.15)',
  'rgba(255, 255, 255, 0.75)',
  'rgba(0, 0, 0, 0.15)',
]);

function getFilesRecursively(dir: string): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === '__tests__' ||
        entry.name === 'node_modules' ||
        entry.name === 'widgets' ||
        entry.name.startsWith('.')
      ) {
        continue;
      }
      files = files.concat(getFilesRecursively(fullPath));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.spec.')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export function auditSourceCode(content: string, relativePath: string): Violation[] {
  const stripped = stripComments(content);
  const lines = stripped.split('\n');
  const violations: Violation[] = [];

  const isPrayerHeader = relativePath.replace(/\\/g, '/') === 'src/components/prayer/PrayerHeader.tsx';

  lines.forEach((lineText, lineIdx) => {
    const lineNumber = lineIdx + 1;

    // 1. Hex matches
    let hexMatch: RegExpExecArray | null;
    const hexRe = new RegExp(HEX_REGEX);
    while ((hexMatch = hexRe.exec(lineText)) !== null) {
      violations.push({
        file: relativePath,
        line: lineNumber,
        match: hexMatch[0],
        type: 'HEX',
      });
    }

    // 2. RGBA matches
    let rgbaMatch: RegExpExecArray | null;
    const rgbaRe = new RegExp(RGBA_REGEX);
    while ((rgbaMatch = rgbaRe.exec(lineText)) !== null) {
      const literal = rgbaMatch[0];
      if (isPrayerHeader && APPROVED_PRAYER_HEADER_RGBA.has(literal)) {
        continue; // Documented Category-B exception
      }
      violations.push({
        file: relativePath,
        line: lineNumber,
        match: literal,
        type: 'RGBA',
      });
    }

    // 3. RGB matches (excluding rgba matches)
    let rgbMatch: RegExpExecArray | null;
    const rgbRe = new RegExp(RGB_REGEX);
    while ((rgbMatch = rgbRe.exec(lineText)) !== null) {
      const literal = rgbMatch[0];
      if (!literal.startsWith('rgba')) {
        violations.push({
          file: relativePath,
          line: lineNumber,
          match: literal,
          type: 'RGB',
        });
      }
    }

    // 4. HSL matches
    let hslMatch: RegExpExecArray | null;
    const hslRe = new RegExp(HSL_REGEX);
    while ((hslMatch = hslRe.exec(lineText)) !== null) {
      violations.push({
        file: relativePath,
        line: lineNumber,
        match: hslMatch[0],
        type: 'HSL',
      });
    }

    // 5. HSLA matches
    let hslaMatch: RegExpExecArray | null;
    const hslaRe = new RegExp(HSLA_REGEX);
    while ((hslaMatch = hslaRe.exec(lineText)) !== null) {
      violations.push({
        file: relativePath,
        line: lineNumber,
        match: hslaMatch[0],
        type: 'HSLA',
      });
    }

    // 6. Named white/black
    let namedMatch: RegExpExecArray | null;
    const namedRe = new RegExp(NAMED_COLOR_REGEX);
    while ((namedMatch = namedRe.exec(lineText)) !== null) {
      violations.push({
        file: relativePath,
        line: lineNumber,
        match: namedMatch[0],
        type: 'NAMED',
      });
    }
  });

  return violations;
}

describe('Static Raw-Color Audit (M21 Token Enforcement)', () => {
  const projectRoot = path.resolve(__dirname, '../../../');
  const appDir = path.join(projectRoot, 'app');
  const componentsDir = path.join(projectRoot, 'src', 'components');

  it('scans all production app/** and src/components/** files with 0 unapproved color violations', () => {
    const appFiles = getFilesRecursively(appDir);
    const componentFiles = getFilesRecursively(componentsDir);
    const productionFiles = [...appFiles, ...componentFiles];

    expect(productionFiles.length).toBeGreaterThan(50);

    const allViolations: Violation[] = [];

    for (const filePath of productionFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
      const violations = auditSourceCode(content, relativePath);
      if (violations.length > 0) {
        allViolations.push(...violations);
      }
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map(v => `  ${v.file}:${v.line} -> [${v.type}] ${v.match}`)
        .join('\n');
      throw new Error(`Found ${allViolations.length} unapproved raw color violation(s):\n${report}`);
    }

    expect(allViolations).toHaveLength(0);
  });

  it('correctly catches all exact historical M21 violations', () => {
    const historicalSnippets = `
      const overlay = 'rgba(0,0,0,0.5)';
      const shadow = '#000';
      const divider = 'rgba(0,0,0,0.05)';
      const errorBg = '#FEE2E2';
      const pressedRed = '#962D22';
      const trackUnchecked = '#E2E8F0';
      const borderGray = '#E0E0E0';
      const surfaceAlpha = 'rgba(0,0,0,0.03)';
      const whiteText = '#FFF';
    `;

    const violations = auditSourceCode(historicalSnippets, 'test/mock-file.tsx');

    const matchedLiterals = violations.map(v => v.match);

    expect(matchedLiterals).toContain('rgba(0,0,0,0.5)');
    expect(matchedLiterals).toContain('#000');
    expect(matchedLiterals).toContain('rgba(0,0,0,0.05)');
    expect(matchedLiterals).toContain('#FEE2E2');
    expect(matchedLiterals).toContain('#962D22');
    expect(matchedLiterals).toContain('#E2E8F0');
    expect(matchedLiterals).toContain('#E0E0E0');
    expect(matchedLiterals).toContain('rgba(0,0,0,0.03)');
    expect(matchedLiterals).toContain('#FFF');
  });

  it('ignores comments containing color strings without false positives', () => {
    const commentedSnippet = `
      // #FFF was replaced by textOnPrimary
      /* backgroundColor: '#000' is old code */
      // rgba(0,0,0,0.5) is old overlay
      const validStyle = { color: colors.primary };
    `;

    const violations = auditSourceCode(commentedSnippet, 'src/components/Sample.tsx');
    expect(violations).toHaveLength(0);
  });
});
