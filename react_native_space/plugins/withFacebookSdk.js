const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

function withFacebookSdk(config, { appId, clientToken, displayName }) {
  // Android: add meta-data to AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    if (!app['meta-data']) app['meta-data'] = [];
    const metaData = app['meta-data'];

    const setMeta = (name, value) => {
      const existing = metaData.find((m) => m.$?.['android:name'] === name);
      if (existing) {
        existing.$['android:value'] = value;
      } else {
        metaData.push({ $: { 'android:name': name, 'android:value': value } });
      }
    };

    setMeta('com.facebook.sdk.ApplicationId', `fb${appId}`);
    setMeta('com.facebook.sdk.ClientToken', clientToken);
    setMeta('com.facebook.sdk.ApplicationName', displayName);

    return cfg;
  });

  // iOS: add to Info.plist
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.FacebookAppID = appId;
    cfg.modResults.FacebookClientToken = clientToken;
    cfg.modResults.FacebookDisplayName = displayName;

    // Add fb URL scheme
    const fbScheme = `fb${appId}`;
    if (!cfg.modResults.CFBundleURLTypes) cfg.modResults.CFBundleURLTypes = [];
    const hasScheme = cfg.modResults.CFBundleURLTypes.some(
      (t) => t.CFBundleURLSchemes?.includes(fbScheme)
    );
    if (!hasScheme) {
      cfg.modResults.CFBundleURLTypes.push({
        CFBundleURLSchemes: [fbScheme],
      });
    }

    return cfg;
  });

  return config;
}

module.exports = withFacebookSdk;
