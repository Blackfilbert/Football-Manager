import { Platform } from 'react-native';
import { afLogEvent } from './appsflyer';

const APPMETRICA_API_KEY = 'dd0f681e-1159-42cc-9cf2-66c5ff08f154';

let AppMetrica: any = null;
let Settings: any = null;

/** Initialize analytics SDKs (call once at app start) */
export async function initAnalytics(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // AppMetrica
    const appmetricaModule = require('@appmetrica/react-native-analytics');
    AppMetrica = appmetricaModule?.default ?? appmetricaModule;
    if (AppMetrica?.activate) {
      AppMetrica.activate({
        apiKey: APPMETRICA_API_KEY,
        sessionTimeout: 120,
        logs: __DEV__,
      });
      if (__DEV__) console.log('[Analytics] AppMetrica activated');
    }
  } catch (e) {
    if (__DEV__) console.log('[Analytics] AppMetrica not available:', e);
  }

  try {
    // Facebook SDK (auto-initialized via config plugin, but ensure Settings are applied)
    const fbModule = require('react-native-fbsdk-next');
    Settings = fbModule?.Settings;
    if (Settings?.setAppID) {
      Settings.setAppID('964228739753787');
    }
    Settings?.setAutoLogAppEventsEnabled?.(true);
    Settings?.setAdvertiserIDCollectionEnabled?.(true);
    if (Settings?.initializeSDK) {
      Settings.initializeSDK();
    }
    console.log('[Analytics] Facebook SDK initialized');
  } catch (e) {
    console.error('[Analytics] Facebook SDK not available:', e);
  }
}

/** Report an in-app purchase revenue event to AppMetrica */
export function trackRevenue(price: number, currency: string, productId: string, quantity?: number): void {
  if (Platform.OS === 'web') return;
  try {
    if (AppMetrica?.reportRevenue) {
      AppMetrica.reportRevenue({
        price,
        currency,
        productID: productId,
        quantity: quantity ?? 1,
      });
      if (__DEV__) console.log('[Analytics] Revenue reported:', productId, price, currency);
    }
  } catch (e) {
    if (__DEV__) console.log('[Analytics] reportRevenue error:', e);
  }
}

/** Report ad revenue event to AppMetrica with impression-level revenue */
export function trackAdRevenue(
  adType: string,
  adNetwork: string = 'AppLovin',
  adUnitId?: string,
  revenue: number = 0,
  precision?: string,
  payload?: Record<string, string>,
): void {
  if (Platform.OS === 'web') return;
  try {
    if (AppMetrica?.reportAdRevenue) {
      AppMetrica.reportAdRevenue({
        price: revenue,
        currency: 'USD',
        adType: adType as any,
        adNetwork,
        adUnitID: adUnitId,
        precision,
        payload,
      });
      if (__DEV__) console.log('[Analytics] Ad revenue reported:', adType, revenue, adNetwork);
    } else {
      if (__DEV__) console.log('[Analytics] reportAdRevenue not available');
    }
  } catch (e) {
    if (__DEV__) console.log('[Analytics] reportAdRevenue error:', e);
  }
}

// Only these events are forwarded to AppsFlyer (purchases handled by Purchase Connector)
const AF_ALLOWED_EVENTS = new Set([
  'other.app_open',
  'match.league_promoted',
  'match.league_relegated',
  'match.season_complete',
  'progress.daily_reward',
  'purchases.offer_shown',
  'purchases.offer_dismissed',
]);

/** Report a custom event to AppMetrica */
export function trackEvent(name: string, params?: Record<string, string | number>): void {
  console.log(`[Event] ${name}`, params ?? '');
  if (Platform.OS === 'web') return;
  try {
    if (AppMetrica?.reportEvent) {
      AppMetrica.reportEvent(name, params ?? {});
    }
  } catch (e) {
    console.log('[Analytics] trackEvent error:', e);
  }
  trackFBEvent(name, params);
  // Forward only key events to AppsFlyer (revenue handled by Purchase Connector)
  if (AF_ALLOWED_EVENTS.has(name)) {
    try {
      const strParams: Record<string, string> = {};
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          strParams[k] = String(v);
        }
      }
      afLogEvent(name, strParams);
    } catch (_) {}
  }
}

/** Log an event to Facebook App Events */
export function trackFBEvent(name: string, params?: Record<string, string | number>): void {
  if (Platform.OS === 'web') return;
  try {
    const fbModule = require('react-native-fbsdk-next');
    const AppEventsLogger = fbModule?.AppEventsLogger;
    if (AppEventsLogger?.logEvent) {
      AppEventsLogger.logEvent(name, params);
    }
  } catch (e) {
    if (__DEV__) console.log('[Analytics] FB event error:', e);
  }
}
