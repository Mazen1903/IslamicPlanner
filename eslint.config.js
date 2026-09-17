const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', '.tmp/**', 'dist/**', 'coverage/**', 'src/data/migrations/**'],
  },
];
