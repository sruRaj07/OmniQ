/**
 * OmniQ mobile app - Babel configuration.
 * Author: OmniQ Team
 */
module.exports = function omniqBabel(api) {
  // ⚡ PERFORMANCE: cache keyed on NODE_ENV, not `true`. The config below branches
  // on the environment, so a static cache would reuse the dev config (consoles
  // intact) for a production build.
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "babel-plugin-react-compiler",
      // react-native-reanimated/plugin must stay LAST in this array.
      "react-native-reanimated/plugin",
    ],
    env: {
      production: {
        // Strips console.* from release bundles. Keeps `console.error` so crash
        // reporting still receives real failures.
        plugins: [
          ["transform-remove-console", { exclude: ["error"] }],
        ],
      },
    },
  };
};
