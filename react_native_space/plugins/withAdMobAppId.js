/**
 * Expo config plugin: ensures AdMob APPLICATION_ID is in AndroidManifest
 * and iOS Info.plist (GADApplicationIdentifier).
 */
const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

module.exports = function withAdMobAppId(config, props) {
  const appId = typeof props === 'string' ? props : props?.appId || '';
  if (!appId) return config;

  // Android: meta-data in AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return cfg;
    if (!app['meta-data']) app['meta-data'] = [];

    // Remove any existing entry (may have empty value from previous build)
    app['meta-data'] = app['meta-data'].filter(
      (m) => m.$?.['android:name'] !== 'com.google.android.gms.ads.APPLICATION_ID'
    );
    // Add with correct value
    app['meta-data'].push({
      $: {
        'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
        'android:value': appId,
      },
    });

    return cfg;
  });

  // iOS: GADApplicationIdentifier in Info.plist
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.GADApplicationIdentifier = appId;
    return cfg;
  });

  return config;
};
