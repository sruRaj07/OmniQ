module.exports = function omniqBabel(api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [

      "react-native-reanimated/plugin",
    ],
  };
};
