module.exports = function omniqBabel(api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "babel-plugin-react-compiler",
      "react-native-reanimated/plugin",
    ],
  };
};
