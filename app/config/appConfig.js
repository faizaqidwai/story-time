export const APP_CONFIG = {
  MOCK_ENABLED: false,

  // ── RevenueCat ────────────────────────────────────────────────────────────
  // Public SDK keys — safe to commit, not secret.
  // Get from: RC Dashboard → Apps & providers → Test Store → Public API Key
  REVENUECAT_IOS_KEY: "appl_wpakRhJXxcCdJPkXqPiCKSSLPEu",
  REVENUECAT_ANDROID_KEY: "test_qZNLUDLdpYhSgVrDIpBBrTJJcfQ",

  // ── Mock IAP ──────────────────────────────────────────────────────────────
  // true  → uses revenueCatService.mock.js (safe for Expo Go, no native modules)
  // false → uses revenueCatService.js (requires dev build with native modules)
  MOCK_IAP: false,

  // ── Dev webhook secret ────────────────────────────────────────────────────
  // Used ONLY in mock mode to simulate the RC webhook call locally.
  // Must match revenuecat.webhook.secret in your backend application.yml.
  // This is a dev/test secret — not a production payment key.
  // It's acceptable to keep here since it only controls your own webhook endpoint.
  WEBHOOK_SECRET_DEV: "cd3003701bfd009f91e95ba46d6e58b3",
};
