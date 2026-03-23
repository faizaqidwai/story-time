// app/data/billingData.js
//
// Static plan definitions and mock data for the billing module.
// Plan definitions are real — they define the product catalogue.
// Mock subscription/payment data is used until backend is integrated.

// ── Plan Catalogue ────────────────────────────────────────────────────────────
export const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "USD",
    color: "#546E7A",
    accentColor: "rgba(84,110,122,0.2)",
    borderColor: "rgba(84,110,122,0.4)",
    features: [
      { text: "1 child profile",         included: true  },
      { text: "3 stories per month",     included: true  },
      { text: "Basic word activities",   included: true  },
      { text: "Word bag",                included: true  },
      { text: "Unlimited stories",       included: false },
      { text: "Up to 5 profiles",        included: false },
      { text: "Progress reports",        included: false },
      { text: "Offline mode",            included: false },
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "For growing readers",
    monthlyPrice: 4.99,
    yearlyPrice: 3.99,
    currency: "USD",
    color: "#00BCD4",
    accentColor: "rgba(0,188,212,0.15)",
    borderColor: "rgba(0,188,212,0.5)",
    features: [
      { text: "Up to 2 child profiles",  included: true  },
      { text: "Unlimited stories",       included: true  },
      { text: "All word activities",     included: true  },
      { text: "Word bag",                included: true  },
      { text: "Progress reports",        included: false },
      { text: "Up to 5 profiles",        included: false },
      { text: "Offline mode",            included: false },
      { text: "Priority support",        included: false },
    ],
    cta: "Upgrade to Basic",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Best for families",
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    currency: "USD",
    color: "#9652D9",
    accentColor: "rgba(150,82,217,0.15)",
    borderColor: "rgba(150,82,217,0.5)",
    features: [
      { text: "Up to 5 child profiles",  included: true  },
      { text: "Unlimited stories",       included: true  },
      { text: "All word activities",     included: true  },
      { text: "Word bag",                included: true  },
      { text: "Detailed progress reports", included: true  },
      { text: "Offline mode",            included: true  },
      { text: "Priority support",        included: true  },
      { text: "Early access to new content", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
];

// ── Mock Subscription ─────────────────────────────────────────────────────────
// Shape mirrors what the backend will return from GET /billing/subscription
export const MOCK_SUBSCRIPTION = {
  planId: "free",
  billingCycle: "monthly",   // "monthly" | "yearly"
  status: "active",          // "active" | "cancelled" | "past_due" | "trialing"
  currentPeriodStart: "2026-03-01",
  currentPeriodEnd: "2026-04-01",
  cancelAtPeriodEnd: false,
  trialEndsAt: null,
};

// ── Mock Payment Methods ──────────────────────────────────────────────────────
// Shape mirrors GET /billing/payment-methods
export const MOCK_PAYMENT_METHODS = [
  {
    id: "pm_001",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2027,
    isDefault: true,
  },
];

// ── Mock Billing History ──────────────────────────────────────────────────────
// Shape mirrors GET /billing/invoices
export const MOCK_INVOICES = [
  {
    id: "inv_001",
    date: "2026-03-01",
    description: "Pro Plan — Monthly",
    amount: 9.99,
    currency: "USD",
    status: "paid",     // "paid" | "pending" | "failed"
    downloadUrl: null,
  },
  {
    id: "inv_002",
    date: "2026-02-01",
    description: "Pro Plan — Monthly",
    amount: 9.99,
    currency: "USD",
    status: "paid",
    downloadUrl: null,
  },
  {
    id: "inv_003",
    date: "2026-01-01",
    description: "Basic Plan — Monthly",
    amount: 4.99,
    currency: "USD",
    status: "paid",
    downloadUrl: null,
  },
];
