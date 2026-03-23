// app/services/billingRestClient.js
//
// REST client for billing endpoints.
// All methods are stubbed — they throw "NOT_IMPLEMENTED" until the backend
// is ready. The billingService.js layer catches this and returns mock data
// instead, so the UI works end-to-end today.
//
// BACKEND INTEGRATION: replace each stub body with the real fetch call shown
// in the comment above it. The function signatures and return shapes must not
// change — only the implementation inside each function body.

import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
const TOKEN_KEY = "@access_token";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getAuthHeaders() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(method, path, body) {
  const headers = await getAuthHeaders();
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/subscription
// Returns: { planId, billingCycle, status, currentPeriodStart,
//            currentPeriodEnd, cancelAtPeriodEnd, trialEndsAt }
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchSubscriptionApi() {
  // BACKEND INTEGRATION: uncomment and remove the throw below
  // return apiFetch("GET", "/billing/subscription");
  throw new Error("NOT_IMPLEMENTED");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /billing/subscription
// Body:    { planId: string, billingCycle: "monthly"|"yearly" }
// Returns: updated Subscription object
// ─────────────────────────────────────────────────────────────────────────────
export async function updateSubscriptionApi(planId, billingCycle) {
  // BACKEND INTEGRATION:
  // return apiFetch("POST", "/billing/subscription", { planId, billingCycle });
  throw new Error("NOT_IMPLEMENTED");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /billing/subscription/cancel
// Body:    { cancelAtPeriodEnd: boolean }
// Returns: updated Subscription object
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelSubscriptionApi(cancelAtPeriodEnd = true) {
  // BACKEND INTEGRATION:
  // return apiFetch("POST", "/billing/subscription/cancel", { cancelAtPeriodEnd });
  throw new Error("NOT_IMPLEMENTED");
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/payment-methods
// Returns: Array<{ id, brand, last4, expMonth, expYear, isDefault }>
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPaymentMethodsApi() {
  // BACKEND INTEGRATION:
  // return apiFetch("GET", "/billing/payment-methods");
  throw new Error("NOT_IMPLEMENTED");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /billing/payment-methods
// Body:    { paymentMethodToken: string }   (token from Stripe/payment gateway)
// Returns: newly added PaymentMethod object
// ─────────────────────────────────────────────────────────────────────────────
export async function addPaymentMethodApi(paymentMethodToken) {
  // BACKEND INTEGRATION:
  // return apiFetch("POST", "/billing/payment-methods", { paymentMethodToken });
  throw new Error("NOT_IMPLEMENTED");
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /billing/payment-methods/:id
// Returns: { success: true }
// ─────────────────────────────────────────────────────────────────────────────
export async function deletePaymentMethodApi(paymentMethodId) {
  // BACKEND INTEGRATION:
  // return apiFetch("DELETE", `/billing/payment-methods/${paymentMethodId}`);
  throw new Error("NOT_IMPLEMENTED");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /billing/payment-methods/:id/default
// Returns: { success: true }
// ─────────────────────────────────────────────────────────────────────────────
export async function setDefaultPaymentMethodApi(paymentMethodId) {
  // BACKEND INTEGRATION:
  // return apiFetch("POST", `/billing/payment-methods/${paymentMethodId}/default`);
  throw new Error("NOT_IMPLEMENTED");
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/invoices
// Returns: Array<{ id, date, description, amount, currency, status, downloadUrl }>
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchInvoicesApi() {
  // BACKEND INTEGRATION:
  // return apiFetch("GET", "/billing/invoices");
  throw new Error("NOT_IMPLEMENTED");
}
