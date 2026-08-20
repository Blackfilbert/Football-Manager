const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withBillingClient(config) {
  return withAppBuildGradle(config, (mod) => {
    const dep = 'implementation("com.android.billingclient:billing:9.0.0")';
    if (!mod.modResults.contents.includes('com.android.billingclient:billing')) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${dep}`
      );
    }
    return mod;
  });
};
