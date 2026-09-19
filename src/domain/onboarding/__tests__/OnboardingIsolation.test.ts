import fs from 'fs';
import path from 'path';

describe('Onboarding Isolation (ISO-series tests)', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const coordinatorFile = path.resolve(rootDir, 'src/services/onboarding/OnboardingCoordinator.ts');
  const storeFile = path.resolve(rootDir, 'src/stores/useOnboardingStore.ts');
  const screenFile = path.resolve(rootDir, 'app/onboarding/index.tsx');
  const packageJsonFile = path.resolve(rootDir, 'package.json');
  const migrationsDir = path.resolve(rootDir, 'src/data/migrations');

  const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf8');

  it('ISO-01: OnboardingCoordinator source contains no import from src/domain/entitlement/', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toMatch(/from\s+['"].*domain\/entitlement.*['"]/);
  });

  it('ISO-02: OnboardingCoordinator source contains no import from src/services/journal/', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toMatch(/from\s+['"].*services\/journal.*['"]/);
  });

  it('ISO-03: OnboardingCoordinator source contains no import from src/domain/worship/', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toMatch(/from\s+['"].*domain\/worship.*['"]/);
  });

  it('ISO-04: OnboardingCoordinator source contains no import of SettingsMutationCoordinator', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toMatch(/SettingsMutationCoordinator/);
  });

  it('ISO-05: OnboardingCoordinator source contains no import of PlanningDayMutationCoordinator', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toMatch(/PlanningDayMutationCoordinator/);
  });

  it('ISO-06: useOnboardingStore source contains no import from src/domain/entitlement/', () => {
    const content = readSource(storeFile);
    expect(content).not.toMatch(/from\s+['"].*domain\/entitlement.*['"]/);
  });

  it('ISO-07: useOnboardingStore source contains no import from src/services/journal/', () => {
    const content = readSource(storeFile);
    expect(content).not.toMatch(/from\s+['"].*services\/journal.*['"]/);
  });

  it('ISO-08: OnboardingCoordinator source does NOT reference isPremium in persistence', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toContain('isPremium');
  });

  it('ISO-09: OnboardingCoordinator source does NOT reference worshipSuggestionsEnabled in persistence', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toContain('worshipSuggestionsEnabled');
  });

  it('ISO-10: OnboardingCoordinator source does NOT reference prayerAlertsEnabled in persistence', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toContain('prayerAlertsEnabled');
  });

  it('ISO-11: OnboardingCoordinator source does NOT write location fields', () => {
    const content = readSource(coordinatorFile);
    // Coordinator must not write locationMode, manualLatitude, etc.
    expect(content).not.toMatch(/upsert\(\s*\{[^}]*locationMode/);
    expect(content).not.toMatch(/upsert\(\s*\{[^}]*manualLatitude/);
    expect(content).not.toMatch(/upsert\(\s*\{[^}]*lastAutoLatitude/);
  });

  it('ISO-12: Onboarding screen does NOT import from src/domain/entitlement/', () => {
    const content = readSource(screenFile);
    expect(content).not.toMatch(/from\s+['"].*domain\/entitlement.*['"]/);
    expect(content).not.toContain('isPremium');
    expect(content).not.toContain('PremiumBadge');
  });

  it('ISO-17: OnboardingCoordinator source does NOT write themeMode', () => {
    const content = readSource(coordinatorFile);
    expect(content).not.toMatch(/upsert\(\s*\{[^}]*themeMode/);
  });

  it('ISO-13: No new migration files created (migrations directory only contains 0000-0003)', () => {
    const files = fs.readdirSync(migrationsDir);
    const sqlOrMetaFiles = files.filter(f => f.endsWith('.sql') || f.startsWith('000'));
    // Migrations 0000, 0001, 0002, 0003
    const migrationNumbers = sqlOrMetaFiles
      .map(f => f.split('_')[0])
      .filter(n => /^\d{4}$/.test(n));
    const uniqueNumbers = Array.from(new Set(migrationNumbers));
    expect(uniqueNumbers.sort()).toEqual(['0000', '0001', '0002', '0003']);
  });

  it('ISO-14: package.json dependencies unchanged from M19 baseline', () => {
    const pkg = JSON.parse(readSource(packageJsonFile));
    // Verify dependencies key list
    const deps = Object.keys(pkg.dependencies || {}).sort();
    expect(deps).toEqual([
      '@expo/ui',
      '@expo/vector-icons',
      '@react-native-community/datetimepicker',
      '@tabby_ai/hijri-converter',
      'adhan',
      'drizzle-orm',
      'expo',
      'expo-asset',
      'expo-constants',
      'expo-crypto',
      'expo-font',
      'expo-linking',
      'expo-local-authentication',
      'expo-location',
      'expo-notifications',
      'expo-router',
      'expo-secure-store',
      'expo-sqlite',
      'expo-status-bar',
      'expo-widgets',
      'luxon',
      'react',
      'react-dom',
      'react-native',
      'react-native-android-widget',
      'react-native-safe-area-context',
      'rrule',
      'uuid',
      'zustand',
    ]);
  });

  it('ISO-15: SchedulingEngine is not imported or called in onboarding screen or coordinator', () => {
    const screenContent = readSource(screenFile);
    const coordinatorContent = readSource(coordinatorFile);
    expect(screenContent).not.toContain('SchedulingEngine');
    expect(coordinatorContent).not.toContain('SchedulingEngine');
  });

  it('ISO-16: MaterializationEngine is not imported or called in onboarding screen or coordinator', () => {
    const screenContent = readSource(screenFile);
    const coordinatorContent = readSource(coordinatorFile);
    expect(screenContent).not.toContain('MaterializationEngine');
    expect(coordinatorContent).not.toContain('MaterializationEngine');
  });
});
