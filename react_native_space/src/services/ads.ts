/**
 * AppLovin MAX Ads Service (v9 API)
 * SDK Key, Ad Unit IDs: TO BE CONFIGURED
 */
import { Platform } from 'react-native';

const SDK_KEY = 'sXK51_hTX1ce0ptcag_5fW3rThP28uRBkXv7iQsIDUH12xNyOtgztuyWpHpzTDTxK7EJIDZtxiVV1oSBExdZqb';

export const AD_UNITS = {
  REWARDED: 'cf3aa11ff73d3879',
  INTERSTITIAL: 'f369fb96121c1a09',
  BANNER: '300b936528508944',
} as const;

// Module references (set via initAds)
let ALM: any = null;       // AppLovinMAX (main SDK object)
let Rewarded: any = null;  // RewardedAd
let Interstitial: any = null; // InterstitialAd
let Banner: any = null;    // BannerAd / AdView

let isInitialized = false;
let rewardedReady = false;
let interstitialReady = false;
let initPromise: Promise<boolean> | null = null;
let pendingRewardCallback: (() => void) | null = null;
let currentRewardedPlacement = 'unknown';

function normalizePlacement(placement?: string): string {
  return placement && placement.trim().length > 0 ? placement : 'unknown';
}

function getAdInfoPayload(adInfo: any): any {
  return adInfo?.nativeEvent ?? adInfo ?? {};
}

function numberFrom(value: any): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function extractRevenue(adInfo: any): number {
  const info = getAdInfoPayload(adInfo);
  const revenue = numberFrom(info.revenue ?? info.adRevenue ?? info.value);
  if (revenue > 0) return revenue;

  const micros = numberFrom(info.revenueMicros ?? info.revenue_micro ?? info.valueMicros);
  return micros > 0 ? micros / 1000000 : 0;
}

function trackAdPaid(adType: 'rewarded' | 'interstitial', adInfo: any, fallbackAdUnitId: string, placement?: string): void {
  const info = getAdInfoPayload(adInfo);
  const revenue = extractRevenue(info);
  const network = info.networkName ?? info.network ?? 'AppLovin';
  const adUnitId = info.adUnitId ?? info.adUnitID ?? fallbackAdUnitId;
  const precision = info.revenuePrecision ?? info.precision ?? '';
  const resolvedPlacement = normalizePlacement(placement);

  console.log(`[Ads] ${adType} revenue payload:`, JSON.stringify(info));
  console.log(`[Ads] ${adType} revenue:`, revenue, network, precision || 'no_precision');

  try {
    const { trackEvent } = require('./analytics');
    trackEvent(`ad.${adType}_revenue_raw`, {
      revenue,
      network: String(network),
      ad_unit_id: String(adUnitId),
      precision: String(precision),
      placement: resolvedPlacement,
    });
  } catch (_) {}

  if (revenue <= 0) return;

  try {
    const { afLogAdRevenue } = require('./appsflyer');
    afLogAdRevenue(revenue, network, adUnitId, adType);
  } catch (_) {}
  try {
    const { trackAdRevenue } = require('./analytics');
    trackAdRevenue(adType, network, adUnitId, revenue, String(precision), {
      source: 'applovin_max',
      precision: String(precision),
      placement: resolvedPlacement,
    });
  } catch (_) {}
}

/**
 * Initialize ads. Pass the full `require('react-native-applovin-max')` module.
 * v9 API: module exports { AppLovinMAX, RewardedAd, InterstitialAd, BannerAd, ... }
 */
export async function initAds(nativeModule?: any): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (nativeModule) {
    // v9: named exports
    ALM = nativeModule.AppLovinMAX ?? nativeModule.default ?? nativeModule;
    Rewarded = nativeModule.RewardedAd ?? null;
    Interstitial = nativeModule.InterstitialAd ?? null;
    Banner = nativeModule.BannerAd ?? null;
  }
  if (!ALM) {
    console.log('[Ads] AppLovin MAX not available');
    return false;
  }
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      console.log('[Ads] Initializing AppLovin MAX...');

      // Enable MAX Terms & Privacy Policy flow (includes Google UMP for GDPR)
      ALM.setTermsAndPrivacyPolicyFlowEnabled?.(true);
      ALM.setPrivacyPolicyUrl?.('https://payge.games/privacypolicy');
      ALM.setTermsOfServiceUrl?.('https://payge.games/tos');

      const config = await ALM.initialize(SDK_KEY);
      console.log('[Ads] AppLovin MAX initialized', JSON.stringify(config));
      isInitialized = true;

      setupRewardedListeners();
      setupInterstitialListeners();
      loadRewarded();
      loadInterstitial();

      return true;
    } catch (e) {
      console.log('[Ads] Init error:', e);
      return false;
    }
  })();
  return initPromise;
}

// ─── Rewarded Video (v9 API: RewardedAd) ───

function setupRewardedListeners(): void {
  if (!Rewarded) {
    console.log('[Ads] RewardedAd not available');
    return;
  }
  Rewarded.addAdLoadedEventListener((adInfo: any) => {
    rewardedReady = true;
    console.log('[Ads] Rewarded loaded', adInfo?.adUnitId);
  });
  Rewarded.addAdLoadFailedEventListener((errorInfo: any) => {
    rewardedReady = false;
    console.log('[Ads] Rewarded load failed:', errorInfo?.code, errorInfo?.message);
    setTimeout(loadRewarded, 5000);
  });
  Rewarded.addAdHiddenEventListener(() => {
    console.log('[Ads] Rewarded hidden');
    rewardedReady = false;
    currentRewardedPlacement = 'unknown';
    loadRewarded();
  });
  // Reward callback — fires when user earns the reward
  Rewarded.addAdReceivedRewardEventListener((rewardInfo: any) => {
    console.log('[Ads] Reward received:', JSON.stringify(rewardInfo));
    try {
      const { trackEvent } = require('./analytics');
      trackEvent('ad.rewarded_watched', { placement: normalizePlacement(currentRewardedPlacement) });
    } catch (_) {}
    if (pendingRewardCallback) {
      const cb = pendingRewardCallback;
      pendingRewardCallback = null;
      cb();
    }
  });
  // Impression-level ad revenue → AppsFlyer ROI360 + AppMetrica
  Rewarded.addAdRevenuePaidListener?.((adInfo: any) => {
    trackAdPaid('rewarded', adInfo, AD_UNITS.REWARDED, currentRewardedPlacement);
  });
  console.log('[Ads] Rewarded listeners setup complete');
}

function loadRewarded(): void {
  if (!Rewarded || !isInitialized) return;
  console.log('[Ads] Loading rewarded ad...');
  Rewarded.loadAd(AD_UNITS.REWARDED);
}

export function isRewardedReady(): boolean {
  return rewardedReady;
}

export async function showRewarded(onReward: () => void, placement: string = 'unknown'): Promise<void> {
  if (Platform.OS === 'web') {
    // Web: grant reward directly for testing
    onReward();
    return;
  }

  const { Alert } = require('react-native');

  // Ensure SDK is initialized — wait for pending init
  if (!isInitialized && initPromise) {
    await initPromise;
  }

  if (!Rewarded || !isInitialized) {
    console.log('[Ads] SDK not available, isInit:', isInitialized, 'Rewarded:', !!Rewarded);
    Alert.alert('Ad unavailable', 'Could not load the ad. Please try again later.');
    return;
  }

  // If ad not loaded yet, try loading and wait up to 10 seconds
  if (!rewardedReady) {
    console.log('[Ads] Rewarded not ready, loading...');
    loadRewarded();
    const waited = await new Promise<boolean>((resolve) => {
      let elapsed = 0;
      const check = setInterval(() => {
        elapsed += 500;
        if (rewardedReady) { clearInterval(check); resolve(true); }
        else if (elapsed >= 10000) { clearInterval(check); resolve(false); }
      }, 500);
    });
    if (!waited) {
      console.log('[Ads] Rewarded failed to load in time');
      Alert.alert('Ad unavailable', 'Could not load the ad. Please try again later.');
      return;
    }
  }

  // Store callback — will be invoked by the persistent reward listener
  pendingRewardCallback = onReward;
  currentRewardedPlacement = normalizePlacement(placement);
  console.log('[Ads] Showing rewarded ad...', currentRewardedPlacement);
  Rewarded.showAd(AD_UNITS.REWARDED);
}

// ─── Interstitial (v9 API: InterstitialAd) ───

function setupInterstitialListeners(): void {
  if (!Interstitial) return;
  Interstitial.addAdLoadedEventListener(() => {
    interstitialReady = true;
    console.log('[Ads] Interstitial loaded');
  });
  Interstitial.addAdLoadFailedEventListener(() => {
    interstitialReady = false;
    setTimeout(loadInterstitial, 5000);
  });
  Interstitial.addAdHiddenEventListener(() => {
    interstitialReady = false;
    loadInterstitial();
  });
  // Impression-level ad revenue → AppsFlyer ROI360 + AppMetrica
  Interstitial.addAdRevenuePaidListener?.((adInfo: any) => {
    trackAdPaid('interstitial', adInfo, AD_UNITS.INTERSTITIAL);
  });
}

function loadInterstitial(): void {
  if (!Interstitial || !isInitialized) return;
  Interstitial.loadAd(AD_UNITS.INTERSTITIAL);
}

export function isInterstitialReady(): boolean {
  return interstitialReady;
}

export function showInterstitial(): void {
  if (!Interstitial || !isInitialized || !interstitialReady) return;
  Interstitial.showAd(AD_UNITS.INTERSTITIAL);
}

// ─── Banner ───

export function showBanner(): void {
  // Banner in v9 is typically done via <AdView> component
  // For imperative API, use BannerAd if available
  if (!Banner || !isInitialized) return;
  try {
    Banner.loadAd?.(AD_UNITS.BANNER);
  } catch (e) {
    console.log('[Ads] Banner error:', e);
  }
}

export function hideBanner(): void {
  // No-op for component-based banner
}

/** Show CMP (consent management) for existing users to update privacy settings */
export function showPrivacySettings(): void {
  if (!ALM || !isInitialized) return;
  ALM.showCmpForExistingUser?.();
}
