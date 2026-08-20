/**
 * In-App Purchases Service (react-native-iap v15)
 * 
 * Uses NitroModules for native bridge.
 * Module is dynamically required in _layout.tsx to avoid web bundler issues.
 */
import { Platform, Alert } from 'react-native';
import { ALL_PRODUCT_IDS } from './iapProducts';
export { PRODUCT_IDS, ALL_PRODUCT_IDS } from './iapProducts';

let RNIap: any = null;
let isConnected = false;
let purchaseListenerSub: { remove: () => void } | null = null;
let errorListenerSub: { remove: () => void } | null = null;
let pendingResolve: ((purchased: boolean) => void) | null = null;

/** Initialize IAP connection — call once at app start. */
export async function initIAP(nativeModule?: any): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (nativeModule) RNIap = nativeModule;
  if (!RNIap) return false;
  try {
    console.log('[IAP] Connecting...');
    await RNIap.initConnection();
    isConnected = true;
    console.log('[IAP] Connected');

    // Fetch products to validate they exist
    try {
      const products = await RNIap.fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'in-app' });
      console.log('[IAP] Products loaded:', products?.length);
    } catch (e) {
      console.log('[IAP] fetchProducts error:', e);
    }

    // Setup purchase listeners
    setupListeners();

    return true;
  } catch (e) {
    console.log('[IAP] Init error:', e);
    isConnected = false;
    return false;
  }
}

function setupListeners(): void {
  if (!RNIap) return;

  if (purchaseListenerSub) {
    purchaseListenerSub.remove();
    purchaseListenerSub = null;
  }
  if (errorListenerSub) {
    errorListenerSub.remove();
    errorListenerSub = null;
  }

  purchaseListenerSub = RNIap.purchaseUpdatedListener((purchase: any) => {
    console.log('[IAP] Purchase updated:', purchase?.productId, 'token:', purchase?.purchaseToken ? 'yes' : 'no');
    const receipt = purchase.transactionReceipt ?? purchase.transactionId ?? purchase.purchaseToken;
    if (receipt) {
      try {
        RNIap.finishTransaction({ purchase, isConsumable: isConsumableProduct(purchase.productId) });
        console.log('[IAP] Purchase finished:', purchase.productId);
      } catch (e) {
        console.log('[IAP] finishTransaction error:', e);
      }
      if (pendingResolve) {
        pendingResolve(true);
        pendingResolve = null;
      }
    }
  });

  errorListenerSub = RNIap.purchaseErrorListener((error: any) => {
    console.log('[IAP] Purchase error:', error?.code, error?.message);
    if (error?.code !== 'E_USER_CANCELLED') {
      Alert.alert('Purchase Error', error?.message || 'Something went wrong. Please try again.');
    }
    if (pendingResolve) {
      pendingResolve(false);
      pendingResolve = null;
    }
  });

  console.log('[IAP] Listeners setup complete');
}

function isConsumableProduct(productId: string): boolean {
  return (
    productId.startsWith('diamonds_') ||
    productId === 'offer_player_5' ||
    productId === 'offer_uniform_5'
  );
}

/**
 * Request a purchase. Returns true if successful, false if cancelled/error.
 */
export async function requestPurchase(productId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('[IAP] Web — skipping purchase');
    return false;
  }

  if (!isConnected || !RNIap) {
    console.log('[IAP] Store unavailable, isConnected:', isConnected, 'RNIap:', !!RNIap);
    Alert.alert('Store unavailable', 'Could not connect to the store. Please try again later.');
    return false;
  }

  console.log('[IAP] Requesting purchase:', productId);

  return new Promise<boolean>(async (resolve) => {
    pendingResolve = resolve;

    const timeout = setTimeout(() => {
      if (pendingResolve === resolve) {
        console.log('[IAP] Purchase timeout for:', productId);
        pendingResolve = null;
        resolve(false);
      }
    }, 120_000);

    try {
      await RNIap.requestPurchase({
        request: {
          google: { skus: [productId] },
          apple: { sku: productId },
        },
        type: 'in-app',
      });
    } catch (e: any) {
      clearTimeout(timeout);
      console.log('[IAP] requestPurchase error:', e?.code, e?.message, e);
      if (e?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Error', e?.message || 'Something went wrong.');
      }
      if (pendingResolve === resolve) {
        pendingResolve = null;
        resolve(false);
      }
    }
  });
}

/** Clean up on app unmount */
export function endIAP(): void {
  if (purchaseListenerSub) purchaseListenerSub.remove();
  if (errorListenerSub) errorListenerSub.remove();
  purchaseListenerSub = null;
  errorListenerSub = null;
  if (RNIap && isConnected) {
    RNIap.endConnection?.();
    isConnected = false;
    console.log('[IAP] Disconnected');
  }
}
