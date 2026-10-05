const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.tmp/**',
      'dist/**',
      'coverage/**',
      'src/data/migrations/**',
      'scripts/**',
      'scratch/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/theme/**', '**/__tests__/**', 'widgets/**', 'assets/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react-native/Libraries/*'],
              message:
                'Do not import from internal react-native/Libraries/*. Use top-level react-native named imports.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='fontFamily'][value.type='Literal']",
          message:
            "Do not specify hardcoded fontFamily literals. Use typography tokens from '@/theme' or rely on the global Comic Sans default.",
        },
        {
          selector: "ImportDeclaration[source.value='react-native'] > ImportNamespaceSpecifier",
          message:
            "Do not use namespace imports from 'react-native' (import * as RN). Under Metro/Babel this creates a copy that bypasses runtime patches. Use named imports (import { Text } from 'react-native').",
        },
      ],
    },
  },
];
