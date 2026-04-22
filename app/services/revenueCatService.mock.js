// app/services/revenueCatService.mock.js
//
// Mock RevenueCat service for development in Expo Go (Windows / no dev build).
// Has the exact same API as revenueCatService.js but simulates purchases locally.
//
// Key behaviour in mock mode:
//   purchasePackage() — waits 1.5s then calls your real backend webhook endpoint
//   with an INITIAL_PURCHASE event. This means the subscription IS actually
//   created in MongoDB, and refreshSubscription() will return the real updated
//   subscription after purchase — no Postman needed.
//
// Swap controlled by APP_CONFIG.MOCK_IAP in appConfig.js.

import { apiClient } from "./apiClient";
import { APP_CONFIG } from "../config/appConfig";

export const PREMIUM_ENTITLEMENT_ID = "premium";

export function configure() {
  console.log("[RC Mock] configure()");
}

export async function setUser(userAccountId) {
  console.log("[RC Mock] setUser:", userAccountId);
  return null;
}

export async function clearUser() {
  console.log("[RC Mock] clearUser()");
}

export async function fetchOfferings() {
  console.log("[RC Mock] fetchOfferings() — returning null, context uses backend packages directly");
  return null;
}

export async function getCustomerInfo() {
  return {
    entitlements: { active: {} },
  };
}

export function isEntitlementActive() {
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// simulateWebhookPurchase
//
// Calls your real backend webhook endpoint with a mock INITIAL_PURCHASE event.
// This is what RC would do automatically in production.
//
// Uses apiClient with:
//   auth: "none"    → no JWT header
//   extraHeaders    → Authorization: webhookSecret (raw, no Bearer prefix)
//
// userAccountId — the logged-in user's MongoDB _id
// rcProductId   — the package's rcProductId field (e.g. "storytime_reader_monthly")
// ─────────────────────────────────────────────────────────────────────────────
export async function simulateWebhookPurchase(userAccountId, rcProductId) {
  if (!userAccountId || !rcProductId) {
    console.warn("[RC Mock] simulateWebhookPurchase — missing userAccountId or rcProductId");
    return false;
  }

  console.log(`[RC Mock] Simulating INITIAL_PURCHASE webhook for user=${userAccountId} product=${rcProductId}`);

  const now     = Date.now();
  const oneMonthLater = now + 30 * 24 * 60 * 60 * 1000;

  const payload = {
    event: {
      type:                    "INITIAL_PURCHASE",
      app_user_id:             userAccountId,
      product_id:              rcProductId,
      transaction_id:          `MOCK_TXN_${now}`,
      original_transaction_id: `MOCK_ORIG_${userAccountId}`,
      purchased_at_ms:         now,
      expiration_at_ms:        oneMonthLater,
      price:                   null,   // backend resolves from Package document
      currency:                null,   // backend resolves from Package document
      store:                   "MOCK",
      period_type:             "NORMAL",
      is_trial_conversion:     false,
    },
  };

  try {
    await apiClient.post("/webhooks/revenuecat", payload, {
      auth: "none",   // skip JWT — webhook uses its own secret
      headers: {
        Authorization: APP_CONFIG.WEBHOOK_SECRET_DEV,
      },
    });
    console.log("[RC Mock] Webhook simulation succeeded");
    return true;
  } catch (err) {
    // Non-fatal — log the error but don't crash the purchase flow
    // The UI already navigated away, subscription will sync on next app open
    console.warn("[RC Mock] Webhook simulation failed:", err?.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// purchasePackage
//
// In mock mode this does NOT call simulateWebhookPurchase directly —
// that is called from PurchaseScreen so it has access to userAccountId
// and pkg.rcProductId which are not available here.
//
// PurchaseScreen detects MOCK_IAP and calls simulateWebhookPurchase
// after this resolves.
// ─────────────────────────────────────────────────────────────────────────────
export async function purchasePackage(rcPackage) {
  console.log("[RC Mock] purchasePackage:", rcPackage?.rcIdentifier ?? rcPackage?.identifier ?? "unknown");
  // Simulate native sheet delay
  await new Promise((res) => setTimeout(res, 1500));
  return {
    customerInfo: {
      entitlements: {
        active: {
          premium: { identifier: "premium" },
        },
      },
    },
    transaction: { transactionIdentifier: "MOCK_TXN_" + Date.now() },
  };
}

export async function restorePurchases() {
  console.log("[RC Mock] restorePurchases()");
  return { entitlements: { active: {} } };
}

export function addCustomerInfoUpdateListener(callback) {
  console.log("[RC Mock] addCustomerInfoUpdateListener registered");
  return () => {};
}
