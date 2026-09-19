import fs from 'fs';
import path from 'path';

describe('Entitlement Isolation & Static Guards', () => {
  const rootDir = path.resolve(__dirname, '../../../../');

  function getFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== '__tests__') {
          getFiles(fullPath, fileList);
        }
      } else if (/\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  // Guard 1: No entitlement imports in widget, journal, or temporal engines
  it('strictly forbids entitlement imports in widgets, journal, and temporal engines', () => {
    const forbiddenPaths = [
      path.join(rootDir, 'widgets'),
      path.join(rootDir, 'src', 'services', 'widget'),
      path.join(rootDir, 'src', 'services', 'journal'),
      path.join(rootDir, 'src', 'domain', 'planning-day'),
      path.join(rootDir, 'src', 'domain', 'scheduling'),
      path.join(rootDir, 'src', 'domain', 'materialization'),
      path.join(rootDir, 'src', 'domain', 'prayer'),
    ];

    const specificFiles = [
      path.join(rootDir, 'src', 'services', 'TodayTemporalInputProvider.ts'),
      path.join(rootDir, 'src', 'services', 'temporalSettingsHelper.ts'),
    ];

    const allFilesToCheck: string[] = [];
    for (const p of forbiddenPaths) {
      getFiles(p, allFilesToCheck);
    }
    for (const f of specificFiles) {
      if (fs.existsSync(f)) {
        allFilesToCheck.push(f);
      }
    }

    const entitlementImportPattern = /(from ['"].*entitlement.*['"]|from ['"].*Entitlement.*['"])/i;

    for (const file of allFilesToCheck) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          return;
        }
        if (entitlementImportPattern.test(line)) {
          throw new Error(
            `Forbidden entitlement import found in ${path.relative(rootDir, file)}:${index + 1}: ${line}`
          );
        }
      });
    }
  });

  // Guard 2: No direct .isPremium reads in feature screens or UI components
  it('forbids direct .isPremium reads in presentation/screen code', () => {
    const screenPaths = [
      path.join(rootDir, 'app'),
      path.join(rootDir, 'src', 'features'),
      path.join(rootDir, 'src', 'components'),
    ];

    const files: string[] = [];
    for (const p of screenPaths) {
      getFiles(p, files);
    }

    const directReadPattern = /\b(settings|userSettings|row)\.isPremium\b/;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          return;
        }
        if (directReadPattern.test(line)) {
          throw new Error(
            `Forbidden direct .isPremium read in ${path.relative(rootDir, file)}:${index + 1}: ${line}`
          );
        }
      });
    }
  });

  // Guard 3: useSettingsMutation does NOT expose planningDayStart mutation
  it('useSettingsMutation remains untouched and does not mutate planningDayStart', () => {
    const useSettingsMutationPath = path.join(rootDir, 'src', 'hooks', 'useSettingsMutation.ts');
    const content = fs.readFileSync(useSettingsMutationPath, 'utf-8');
    expect(content).not.toContain('planningDayStart');
  });
});
