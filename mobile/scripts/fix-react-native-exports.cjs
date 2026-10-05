const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'package.json',
);

if (!fs.existsSync(packageJsonPath)) {
  console.log('React Native package not installed yet; skipping export patch.');
  process.exit(0);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const exports = packageJson.exports || {};
const requiredExports = {
  './src/private/featureflags/ReactNativeFeatureFlags':
    './src/private/featureflags/ReactNativeFeatureFlags.js',
  './src/private/featureflags/*': './src/private/featureflags/*.js',
};

let changed = false;
for (const [key, value] of Object.entries(requiredExports)) {
  if (!exports[key]) {
    exports[key] = value;
    changed = true;
  }
}

if (!changed) {
  console.log(
    'React Native exports already contain the required deep-import mappings.',
  );
  process.exit(0);
}

packageJson.exports = exports;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log('Patched React Native package exports for legacy deep imports.');
