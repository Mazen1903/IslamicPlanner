import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Bundle & Build Configuration (SB-01, SB-02)', () => {
  const rootDir = path.resolve(__dirname, '..', '..', '..');

  it('SB-01: babel.config.js exists and includes inline-import for .sql files', () => {
    const babelConfigPath = path.join(rootDir, 'babel.config.js');
    expect(fs.existsSync(babelConfigPath)).toBe(true);

    // Dynamic require/evaluation of babel config
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const babelConfigFn = require(babelConfigPath);
    expect(typeof babelConfigFn).toBe('function');

    const apiMock = { cache: jest.fn() };
    const config = babelConfigFn(apiMock);

    expect(apiMock.cache).toHaveBeenCalledWith(true);
    expect(config).toBeDefined();
    expect(config.presets).toBeDefined();

    // Check inline-import plugin for .sql
    const inlineImportPlugin = config.plugins?.find(
      (p: any) => Array.isArray(p) && p[0] === 'inline-import'
    );
    expect(inlineImportPlugin).toBeDefined();
    expect(inlineImportPlugin[1]).toEqual({ extensions: ['.sql'] });
  });

  it('SB-02: metro.config.js includes sql in sourceExts while preserving dat in assetExts', () => {
    const metroConfigPath = path.join(rootDir, 'metro.config.js');
    expect(fs.existsSync(metroConfigPath)).toBe(true);

    const metroContent = fs.readFileSync(metroConfigPath, 'utf8');

    // Invariant: assetExts preserves dat
    expect(metroContent).toContain("assetExts.push('dat')");

    // Invariant: sourceExts adds sql
    expect(metroContent).toContain("sourceExts.push('sql')");
  });
});
