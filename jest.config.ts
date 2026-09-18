import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|expo-widgets|react-native-android-widget)',
  ],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo-crypto$': '<rootDir>/src/__mocks__/expo-crypto.ts',
    '^expo-local-authentication$': '<rootDir>/src/__mocks__/expo-local-authentication.ts',
    '^expo-widgets$': '<rootDir>/src/__mocks__/expo-widgets.ts',
    '^react-native-android-widget$': '<rootDir>/src/__mocks__/react-native-android-widget.ts',
    '^@expo/ui/swift-ui$': '<rootDir>/src/__mocks__/expo-ui-swift-ui.ts',
    '^@expo/ui/swift-ui/modifiers$': '<rootDir>/src/__mocks__/expo-ui-swift-ui-modifiers.ts',
    '\\.dat$': '<rootDir>/src/__mocks__/assetMock.js',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};

export default config;
