/**
 * OmniQ mobile app - Metro bundler configuration.
 * Learn more https://docs.expo.io/guides/customizing-metro
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// Let Metro know where to resolve packages from (both frontend and root node_modules)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Asset formats. `webp` (plus heic/avif) is already in Expo's default assetExts —
// listed explicitly so a future assetExts override can't silently drop WebP support.
config.resolver.assetExts = Array.from(
  new Set([...config.resolver.assetExts, "webp"])
);

// ⚡ PRODUCTION OPTIMIZATIONS: Configure aggressive minification & dead-code elimination
config.transformer = {
  ...config.transformer,
  // Shrinks the PNG/JPEG/WebP copies Metro emits into the bundle.
  // Does not affect ./assets/images/icon.png or splash.png — those are consumed
  // by the native build, not by Metro.
  assetPlugins: [...(config.transformer.assetPlugins || [])],
  minifierConfig: {
    compress: {
      // Automatically remove all verbose console logs and debug statements in production builds
      drop_console: process.env.NODE_ENV === "production",
      drop_debugger: true,
      reduce_funcs: true,
      passes: 2,
    },
    output: {
      comments: false, // Strip out all documentation and license comments from bundles
      ascii_only: true,
    },
  },
};

module.exports = config;
