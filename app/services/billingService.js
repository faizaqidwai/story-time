// app/services/billingService.js
//
// Service layer for billing operations.
// Mocking happens HERE — at the last step before the REST client call.
// Each function tries the real API first; if it throws "NOT_IMPLEMENTED"
// (meaning the backend stub is not yet wired), it falls back to mock data.
//
// BACKEND INTEGRATION: set BILLING_MOCK_ENABLED = false (or remove the
// mock fallback blocks entirely) once the backend endpoints are live.

import {
  fetchSubscriptionApi,
  updateSubscriptionApi,
  cancelSubscriptionApi,
  fetchPaymentMethodsApi,
  addPaymentMethodApi,
  deletePaymentMethodApi,
  setDefaultPaymentMethodApi,
  fetchInvoicesApi,
} from "./billingRestClient";

import {
  MOCK_SUBSCRIPTION,
  MOCK_PAYMENT_METHODS,
  MOCK_INVOICES,
  PLANS,
} from "../data/billingData";

// ── Mock switch ───────────────────────────────────────────────────────────────
// Set to false when backend is ready. See BACKEND_INTEGRATION.md for details.
const BILLING_MOCK_ENABLED = true;

// Simulates realistic network delay in mock mode
const mockDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// In-memory mock state (persists for the session, resets on app restart)
let _mockSubscription = { ...MOCK_SUBSCRIPTION };
let _mockPaymentMethods = [...MOCK_PAYMENT_METHODS];
let _mockInvoices = [...MOCK_INVOICES];

// ─────────────────────────────────────────────────────────────────────────────
// getSubscription
// Returns current subscription details for the logged-in user.
// ─────────────────────────────────────────────────────────────────────────────
export async function getSubscription() {
  if (!BILLING_MOCK_ENABLED) {
    return fetchSubscriptionApi();
  }
  // ── MOCK ──
  await mockDelay();
  return { ..._mockSubscription };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateSubscription
// Changes the user's plan and/or billing cycle.
// ─────────────────────────────────────────────────────────────────────────────
export async function updateSubscription(planId, billingCycle) {
  if (!BILLING_MOCK_ENABLED) {
    return updateSubscriptionApi(planId, billingCycle);
  }
  // ── MOCK ──
  await mockDelay(600);
  _mockSubscription = {
    ..._mockSubscription,
    planId,
    billingCycle,
    status: "active",
    cancelAtPeriodEnd: false,
  };

  // Add a mock invoice for the new plan
  const plan = PLANS.find((p) => p.id === planId);
  if (plan && plan.monthlyPrice > 0) {
    const price =
      billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    _mockInvoices = [
      {
        id: `inv_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        description: `${plan.name} Plan — ${billingCycle === "yearly" ? "Yearly" : "Monthly"}`,
        amount: price,
        currency: "USD",
        status: "paid",
        downloadUrl: null,
      },
      ..._mockInvoices,
    ];
  }

  return { ..._mockSubscription };
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelSubscription
// Schedules cancellation at period end (or immediately if cancelAtPeriodEnd=false).
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelSubscription(cancelAtPeriodEnd = true) {
  if (!BILLING_MOCK_ENABLED) {
    return cancelSubscriptionApi(cancelAtPeriodEnd);
  }
  // ── MOCK ──
  await mockDelay(500);
  _mockSubscription = {
    ..._mockSubscription,
    cancelAtPeriodEnd,
    status: cancelAtPeriodEnd ? "active" : "cancelled",
  };
  return { ..._mockSubscription };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPaymentMethods
// Returns all saved payment methods for the user.
// ─────────────────────────────────────────────────────────────────────────────
export async function getPaymentMethods() {
  if (!BILLING_MOCK_ENABLED) {
    return fetchPaymentMethodsApi();
  }
  // ── MOCK ──
  await mockDelay();
  return [..._mockPaymentMethods];
}

// ─────────────────────────────────────────────────────────────────────────────
// addPaymentMethod
// Adds a new card via payment gateway token.
// In mock mode, simulates adding a card with provided last4/brand.
// ─────────────────────────────────────────────────────────────────────────────
export async function addPaymentMethod({ brand, last4, expMonth, expYear }) {
  if (!BILLING_MOCK_ENABLED) {
    // In real implementation, you'd get a token from Stripe SDK first
    // then pass it here: addPaymentMethodApi(stripeToken)
    throw new Error("addPaymentMethod: real gateway token required");
  }
  // ── MOCK ──
  await mockDelay(700);
  const newMethod = {
    id: `pm_${Date.now()}`,
    brand: brand ?? "visa",
    last4: last4 ?? "0000",
    expMonth: expMonth ?? 12,
    expYear: expYear ?? 2028,
    isDefault: _mockPaymentMethods.length === 0,
  };
  _mockPaymentMethods = [..._mockPaymentMethods, newMethod];
  return newMethod;
}

// ─────────────────────────────────────────────────────────────────────────────
// deletePaymentMethod
// Removes a saved payment method by id.
// ─────────────────────────────────────────────────────────────────────────────
export async function deletePaymentMethod(paymentMethodId) {
  if (!BILLING_MOCK_ENABLED) {
    return deletePaymentMethodApi(paymentMethodId);
  }
  // ── MOCK ──
  await mockDelay(400);
  _mockPaymentMethods = _mockPaymentMethods.filter((m) => m.id !== paymentMethodId);
  // If deleted card was default, make first remaining card default
  if (_mockPaymentMethods.length > 0 && !_mockPaymentMethods.some((m) => m.isDefault)) {
    _mockPaymentMethods[0].isDefault = true;
  }
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// setDefaultPaymentMethod
// Marks a payment method as the default for future charges.
// ─────────────────────────────────────────────────────────────────────────────
export async function setDefaultPaymentMethod(paymentMethodId) {
  if (!BILLING_MOCK_ENABLED) {
    return setDefaultPaymentMethodApi(paymentMethodId);
  }
  // ── MOCK ──
  await mockDelay(300);
  _mockPaymentMethods = _mockPaymentMethods.map((m) => ({
    ...m,
    isDefault: m.id === paymentMethodId,
  }));
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// getInvoices
// Returns billing history / invoice list.
// ─────────────────────────────────────────────────────────────────────────────
export async function getInvoices() {
  if (!BILLING_MOCK_ENABLED) {
    return fetchInvoicesApi();
  }
  // ── MOCK ──
  await mockDelay();
  return [..._mockInvoices];
}

// ─────────────────────────────────────────────────────────────────────────────
// getPlanById — local helper, no network call
// ─────────────────────────────────────────────────────────────────────────────
export function getPlanById(planId) {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0];
}
