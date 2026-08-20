const { withAndroidStyles } = require('expo/config-plugins');

module.exports = function withForceLightMode(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    // Find AppTheme style
    const appTheme = styles.resources?.style?.find(
      (s) => s.$.name === 'AppTheme'
    );
    if (appTheme) {
      // Remove existing forceDarkAllowed if present
      appTheme.item = (appTheme.item || []).filter(
        (i) => i.$.name !== 'android:forceDarkAllowed'
      );
      // Add forceDarkAllowed = false
      appTheme.item.push({
        $: { name: 'android:forceDarkAllowed' },
        _: 'false',
      });
    }
    return config;
  });
};
