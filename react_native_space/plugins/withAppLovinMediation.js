/**
 * Expo config plugin: AppLovin MAX SDK + Mediation Adapters + AdMob App ID
 * Handles Android (gradle + manifest) and iOS (Podfile)
 */
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ─── Android mediation adapter dependencies ───
// IMPORTANT: google-adapter and google-ad-manager-adapter are pinned to 24.3.0.0
// because play-services-ads:25.3.0+ requires Kotlin metadata 2.3.0
// while Expo SDK 54 uses Kotlin 2.1.20 — this causes incompatible metadata errors.
const ANDROID_ADAPTERS = [
  'com.applovin:applovin-sdk:+',
  'com.applovin.mediation:google-adapter:24.3.0.0',
  'com.applovin.mediation:google-ad-manager-adapter:24.3.0.0',
  'com.applovin.mediation:facebook-adapter:+',
  'com.applovin.mediation:unityads-adapter:+',
  'com.applovin.mediation:ironsource-adapter:+',
  'com.applovin.mediation:fyber-adapter:+',
  'com.applovin.mediation:vungle-adapter:+',
  'com.applovin.mediation:bytedance-adapter:+',
  'com.applovin.mediation:inmobi-adapter:+',
  'com.applovin.mediation:mintegral-adapter:+',
  'com.applovin.mediation:yandex-adapter:+',
  'com.applovin.mediation:mytarget-adapter:+',
  'com.applovin.mediation:bidmachine-adapter:+',
  'com.applovin.mediation:yso-network-adapter:+',
  'com.applovin.mediation:moloco-adapter:+',
];

// Force play-services-ads to a Kotlin 2.1-compatible version
const FORCE_RESOLUTION = [
  "com.google.android.gms:play-services-ads:24.3.0",
  "com.google.android.gms:play-services-ads-lite:24.3.0",
];

// Extra maven repos needed for some adapters
const EXTRA_MAVEN_REPOS = [
  'https://artifacts.applovin.com/android',
  'https://dl-maven-android.mintegral.com/repository/mbridge_android_sdk_oversea',
  'https://artifact.bytedance.com/repository/pangle',
  'https://artifactory.bidmachine.io/bidmachine',
  'https://ysonetwork.s3.eu-west-3.amazonaws.com/sdk/android',
];

// ─── iOS mediation adapter pods ───
const IOS_ADAPTER_PODS = [
  'AppLovinSDK',
  'AppLovinMediationGoogleAdapter',
  'AppLovinMediationGoogleAdManagerAdapter',
  'AppLovinMediationFacebookAdapter',
  'AppLovinMediationUnityAdsAdapter',
  'AppLovinMediationIronSourceAdapter',
  'AppLovinMediationFyberAdapter',
  'AppLovinMediationVungleAdapter',
  'AppLovinMediationByteDanceAdapter',
  'AppLovinMediationInMobiAdapter',
  'AppLovinMediationMintegralAdapter',
  'AppLovinMediationYandexAdapter',
  'AppLovinMediationMyTargetAdapter',
  'AppLovinMediationBidMachineAdapter',
  'AppLovinMediationYSONetworkAdapter',
  'AppLovinMediationMolocoAdapter',
];

// ─── 1. Project-level build.gradle: maven repos + AppLovin Quality Service classpath ───
function withProjectGradle(config, sdkKey) {
  return withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Add maven repos to ALL repositories blocks
    for (const repo of EXTRA_MAVEN_REPOS) {
      const mavenLine = `maven { url '${repo}' }`;
      if (!contents.includes(repo)) {
        // Replace all occurrences of repositories {
        contents = contents.replace(
          /repositories\s*{/g,
          `repositories {\n        ${mavenLine}`
        );
      }
    }

    // AppLovin Quality Service classpath removed — SafeDK instrumentation
    // fails with 401 on EAS build servers, and is optional for ad serving.

    cfg.modResults.contents = contents;
    return cfg;
  });
}

// ─── 2. App-level build.gradle: repos + adapters + apply plugin + applovin { apiKey } ───
function withAppGradle(config, sdkKey) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Add maven repos to app-level repositories too
    for (const repo of EXTRA_MAVEN_REPOS) {
      const mavenLine = `maven { url '${repo}' }`;
      if (!contents.includes(repo)) {
        contents = contents.replace(
          /repositories\s*{/g,
          `repositories {\n        ${mavenLine}`
        );
      }
    }

    // Add missingDimensionStrategy for react-native-iap (Google Play store flavor)
    if (!contents.includes('missingDimensionStrategy')) {
      contents = contents.replace(
        /defaultConfig\s*{/,
        `defaultConfig {\n        missingDimensionStrategy "store", "play"`
      );
    }

    // Add Google UMP for GDPR consent (required by MAX Terms & Privacy Policy flow)
    const umpDep = "com.google.android.ump:user-messaging-platform:3.1.0";
    if (!contents.includes('user-messaging-platform')) {
      contents = contents.replace(
        /(dependencies\s*{)/,
        `$1\n    implementation '${umpDep}'`
      );
    }

    // Add Google Play Services for GAID (required by AppsFlyer for attribution)
    const gpsIdentifier = "com.google.android.gms:play-services-ads-identifier:18.2.0";
    if (!contents.includes('play-services-ads-identifier')) {
      contents = contents.replace(
        /(dependencies\s*{)/,
        `$1\n    implementation '${gpsIdentifier}'`
      );
    }

    // Add Android Install Referrer (required by AppsFlyer for non-organic attribution)
    const installReferrer = "com.android.installreferrer:installreferrer:2.2";
    if (!contents.includes('installreferrer')) {
      contents = contents.replace(
        /(dependencies\s*{)/,
        `$1\n    implementation '${installReferrer}'`
      );
    }

    // Add adapter implementations
    for (const dep of ANDROID_ADAPTERS) {
      if (!contents.includes(dep)) {
        contents = contents.replace(
          /(dependencies\s*{)/,
          `$1\n    implementation '${dep}'`
        );
      }
    }

    // Force resolution strategy to prevent transitive deps pulling incompatible versions
    const resBlock = `configurations.all {\n    resolutionStrategy {\n${FORCE_RESOLUTION.map(d => `        force '${d}'`).join('\n')}\n    }\n}`;
    if (!contents.includes('resolutionStrategy')) {
      contents += `\n\n${resBlock}\n`;
    }

    // Quality Service plugin removed — causes safedkInstrumentationRelease FAILED on EAS builds.

    cfg.modResults.contents = contents;
    return cfg;
  });
}

// ─── 3. AndroidManifest: AdMob App ID + AD_ID permission ───
function withManifest(config, admobAppId) {
  return withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return cfg;

    // AD_ID permission
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const hasAdId = manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === 'com.google.android.gms.permission.AD_ID'
    );
    if (!hasAdId) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'com.google.android.gms.permission.AD_ID' },
      });
    }

    // AdMob App ID
    if (admobAppId) {
      if (!app['meta-data']) app['meta-data'] = [];
      const hasAdmob = app['meta-data'].some(
        (m) => m.$?.['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID'
      );
      if (!hasAdmob) {
        app['meta-data'].push({
          $: {
            'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
            'android:value': admobAppId,
          },
        });
      }
    }

    return cfg;
  });
}

// ─── 4. iOS Podfile: adapter pods ───
function withPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      const podsToAdd = IOS_ADAPTER_PODS.filter((p) => !contents.includes(p));
      if (podsToAdd.length > 0) {
        const podLines = podsToAdd.map((p) => `  pod '${p}'`).join('\n');
        const lastEndIdx = contents.lastIndexOf('end');
        if (lastEndIdx > -1) {
          contents =
            contents.slice(0, lastEndIdx) + podLines + '\n' + contents.slice(lastEndIdx);
        }
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

// ─── Main export ───
module.exports = function withAppLovinMediation(config, props) {
  const sdkKey = props?.sdkKey || '';
  const admobAppId = props?.admobAppId || '';

  config = withProjectGradle(config, sdkKey);
  config = withAppGradle(config, sdkKey);
  config = withManifest(config, admobAppId);
  config = withPodfile(config);
  return config;
};
