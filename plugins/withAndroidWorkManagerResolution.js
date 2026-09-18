/**
 * Expo Config Plugin: withAndroidWorkManagerResolution
 *
 * Why it exists:
 * In Android native builds, `react-native-android-widget` (0.22.1) requests
 * `androidx.work:work-runtime:2.8.1`, while `expo-widgets` (57.0.20) transitively pulls
 * `androidx.work:work-runtime-ktx:2.7.1` via `androidx.glance:glance-appwidget:1.2.0-rc01`.
 *
 * In WorkManager 2.8.0+, Google migrated Kotlin extension classes (`OneTimeWorkRequestKt`,
 * `PeriodicWorkRequestKt`) directly into `work-runtime` from `work-runtime-ktx`.
 * When `work-runtime:2.8.1` and `work-runtime-ktx:2.7.1` coexist on `debugRuntimeClasspath`,
 * Android's `checkDebugDuplicateClasses` task fails due to duplicate `.class` definitions.
 *
 * In `work-runtime-ktx:2.8.1`, the artifact is an empty backwards-compatibility stub.
 * Aligning all `androidx.work` artifacts to version `2.8.1` eliminates duplicate classes
 * while maintaining full binary and runtime compatibility for both libraries.
 *
 * Exact version aligned:
 * `2.8.1`
 *
 * Conflicting libraries:
 * - `react-native-android-widget` (requests `androidx.work:work-runtime:2.8.1`)
 * - `expo-widgets` / `androidx.glance` (requests `androidx.work:work-runtime-ktx:2.7.1`)
 *
 * How to remove:
 * When upstream `expo-widgets` / `androidx.glance` updates its transitive WorkManager
 * dependency to `>= 2.8.0` (or `expo-notifications` if applicable), remove this plugin
 * reference from `app.json` plugins and delete this file.
 */

const { withProjectBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');

const PKG_NAME = 'withAndroidWorkManagerResolution';
const PKG_VERSION = '1.0.0';
const WORKMANAGER_ALIGNED_VERSION = '2.8.1';

const RESOLUTION_STRATEGY_BLOCK = `  configurations.all {
    resolutionStrategy {
      eachDependency { details ->
        if (details.requested.group == 'androidx.work') {
          details.useVersion '${WORKMANAGER_ALIGNED_VERSION}'
        }
      }
    }
  }`;

function setWorkManagerResolutionStrategy(buildGradle) {
  if (buildGradle.includes("details.requested.group == 'androidx.work'")) {
    return buildGradle;
  }

  if (buildGradle.includes('allprojects {')) {
    return buildGradle.replace(
      'allprojects {',
      `allprojects {\n${RESOLUTION_STRATEGY_BLOCK}`
    );
  }

  return `${buildGradle}\n\nallprojects {\n${RESOLUTION_STRATEGY_BLOCK}\n}\n`;
}

const withAndroidWorkManagerResolution = (config) => {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      modConfig.modResults.contents = setWorkManagerResolutionStrategy(
        modConfig.modResults.contents
      );
    }
    return modConfig;
  });
};

const plugin = createRunOncePlugin(
  withAndroidWorkManagerResolution,
  PKG_NAME,
  PKG_VERSION
);

module.exports = plugin;
module.exports.WORKMANAGER_ALIGNED_VERSION = WORKMANAGER_ALIGNED_VERSION;
module.exports.setWorkManagerResolutionStrategy = setWorkManagerResolutionStrategy;
