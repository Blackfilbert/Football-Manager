/**
 * Custom Expo config plugin: Full-screen splash on Android.
 *
 * The default expo-splash-screen uses Android 12+ SplashScreen API which
 * restricts the image to a small centered icon. This plugin overrides that
 * by using the legacy `android:windowBackground` approach with a layer-list
 * drawable that fills the entire screen.
 *
 * For iOS — the standard expo-splash-screen plugin handles fullscreen fine,
 * so we only touch Android here.
 */
const { withDangerousMod, withAndroidStyles } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFullScreenSplash(config) {
  // Step 1: Copy splash.png to drawable-nodpi (no density scaling → pixel-perfect)
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const resDir = path.join(platformRoot, 'app', 'src', 'main', 'res');

      // Copy full-res splash image to drawable-nodpi
      const nodpiDir = path.join(resDir, 'drawable-nodpi');
      fs.mkdirSync(nodpiDir, { recursive: true });
      const srcImage = path.join(projectRoot, 'assets', 'splash.png');
      if (fs.existsSync(srcImage)) {
        fs.copyFileSync(srcImage, path.join(nodpiDir, 'splash_fullscreen.png'));
      }

      // Create layer-list drawable with gravity="fill" (not "center"!)
      const drawableDir = path.join(resDir, 'drawable');
      fs.mkdirSync(drawableDir, { recursive: true });

      const layerListXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splashscreen_background"/>
    <item>
        <bitmap
            android:gravity="fill"
            android:src="@drawable/splash_fullscreen"/>
    </item>
</layer-list>`;

      fs.writeFileSync(
        path.join(drawableDir, 'splash_fullscreen_bg.xml'),
        layerListXml
      );

      return cfg;
    },
  ]);

  // Step 2: Override Theme.App.SplashScreen to use legacy windowBackground
  config = withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults;
    if (!styles.resources.style) styles.resources.style = [];

    // Remove any existing Theme.App.SplashScreen
    styles.resources.style = styles.resources.style.filter(
      ({ $ }) => $.name !== 'Theme.App.SplashScreen'
    );

    // Add our override: legacy windowBackground pointing to fullscreen drawable
    styles.resources.style.push({
      $: {
        name: 'Theme.App.SplashScreen',
        parent: 'AppTheme',
      },
      item: [
        {
          $: { name: 'android:windowBackground' },
          _: '@drawable/splash_fullscreen_bg',
        },
      ],
    });

    return cfg;
  });

  return config;
}

module.exports = withFullScreenSplash;
