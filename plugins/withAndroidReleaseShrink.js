/**
 * Expo Config Plugin: withAndroidReleaseShrink
 *
 * Why it exists:
 * Default Expo prebuild output compiles native libraries for four CPU ABIs
 * (armeabi-v7a, arm64-v8a, x86, x86_64) and leaves R8 code shrinking and
 * resource shrinking disabled. That produced a ~187 MiB release APK, of which
 * ~128 MB was duplicated native libraries (Skia, React Native, Hermes, ...).
 *
 * What it does (Android only, written to `android/gradle.properties`):
 * - `reactNativeArchitectures=arm64-v8a`
 *     Ships only the 64-bit ARM libraries used by virtually all modern phones.
 *     NOTE: x86/x86_64 emulators cannot run the resulting APK. `expo run:android`
 *     overrides this per connected device, and it can be overridden manually with
 *     `./gradlew assembleRelease -PreactNativeArchitectures=x86_64`.
 * - `android.enableMinifyInReleaseBuilds=true`
 *     Enables R8 minification/optimization for release builds.
 * - `android.enableShrinkResourcesInReleaseBuilds=true`
 *     Strips unused resources (requires minify).
 *
 * How to remove:
 * Remove this plugin reference from `app.json` plugins and delete this file, or
 * edit `RELEASE_SHRINK_PROPERTIES` below.
 */

const { withGradleProperties, createRunOncePlugin } = require('@expo/config-plugins');

const PKG_NAME = 'withAndroidReleaseShrink';
const PKG_VERSION = '1.0.0';

const RELEASE_SHRINK_PROPERTIES = {
  reactNativeArchitectures: 'arm64-v8a',
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

function setGradleProperties(properties, desired = RELEASE_SHRINK_PROPERTIES) {
  const result = properties.filter(
    (item) => !(item.type === 'property' && Object.prototype.hasOwnProperty.call(desired, item.key))
  );
  for (const [key, value] of Object.entries(desired)) {
    result.push({ type: 'property', key, value });
  }
  return result;
}

const withAndroidReleaseShrink = (config) => {
  return withGradleProperties(config, (modConfig) => {
    modConfig.modResults = setGradleProperties(modConfig.modResults);
    return modConfig;
  });
};

const plugin = createRunOncePlugin(withAndroidReleaseShrink, PKG_NAME, PKG_VERSION);

module.exports = plugin;
module.exports.RELEASE_SHRINK_PROPERTIES = RELEASE_SHRINK_PROPERTIES;
module.exports.setGradleProperties = setGradleProperties;
