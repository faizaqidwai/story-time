// app/services/subscriptionService.js
//
// All subscription and payment-method API calls.
// Uses apiClient — auth, retries, and logging all handled there.

import { apiClient } from "./apiClient";

/** GET /subscription/packages — fetch all active packages */
export async function fetchSubscriptionPackages() {
  return apiClient.get("/subscription/packages");
}

/**
 * GET /account/payments/methods
 * Returns: [{ id, brand, last4, expMonth, expYear, isDefault }]
 */
export async function fetchPaymentMethods() {
  return apiClient.get("/account/payments/methods");
}

/**
 * POST /account/payments/methods
 * Body: { brand, last4, expMonth, expYear, gatewayToken? }
 * Returns: the saved PaymentMethod with its real MongoDB id
 */
export async function addPaymentMethod(cardData) {
  return apiClient.post("/account/payments/methods", cardData);
}

/**
 * DELETE /account/payments/methods/{id}
 */
export async function deletePaymentMethod(id) {
  return apiClient.delete(`/account/payments/methods/${id}`);
}

/**
 * PATCH /account/payments/methods/{id}/default
 */
export async function setDefaultPaymentMethod(id) {
  return apiClient.patch(`/account/payments/methods/${id}/default`);
}

/**
 * POST /subscriptions/package/purchase
 * Body: { packageId, paymentMethodId }
 * Returns: the newly created Subscription document
 */
export async function purchasePackage(packageId, paymentMethodId) {
  return apiClient.post("/subscriptions/package/purchase", {
    packageId,
    paymentMethodId,
  });
}

/** GET /subscriptions/my — get caller's active subscription */
export async function fetchMySubscription() {
  return apiClient.get("/subscriptions/my");
}
