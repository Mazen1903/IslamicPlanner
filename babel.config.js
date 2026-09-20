module.exports = function (api) {
  api.cache(true);

  // Fallback resolver for babel-preset-expo if nested under expo package
  let expoPreset = 'babel-preset-expo';
  try {
    require.resolve(expoPreset);
  } catch {
    try {
      expoPreset = require.resolve('babel-preset-expo', {
        paths: [require.resolve('expo')],
      });
    } catch {
      // Keep default name
    }
  }

  return {
    presets: [expoPreset],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
