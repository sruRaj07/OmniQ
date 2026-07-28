// Learn more https://docs.expo.io/guides/customizing-metro
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

// ⚡ PRODUCTION OPTIMIZATIONS: Configure aggressive minification & dead-code elimination
config.transformer = {
  ...config.transformer,
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
