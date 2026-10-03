const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const fs = require('fs');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// React Native Windows support (graceful — may not be installed on mobile-only dev)
let rnwPath;
try {
  rnwPath = fs.realpathSync(
    path.resolve(require.resolve('react-native-windows/package.json'), '..')
  );
} catch {
  rnwPath = null;
}

const blockList = [
  // Prevent Windows build artifacts from crashing Metro
  new RegExp(`${path.resolve(__dirname, 'windows').replace(/[/\\]/g, '/')}.*`),
  /.*\.ProjectImports\.zip/,
];
if (rnwPath) {
  blockList.push(new RegExp(`${rnwPath}/build/.*`));
  blockList.push(new RegExp(`${rnwPath}/target/.*`));
}

const config = {
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs'],
    resolverMainFields: ['react-native', 'browser', 'main'],
    blockList,
  },
};

module.exports = withNativeWind(mergeConfig(defaultConfig, config), {
  input: './global.css',
});
