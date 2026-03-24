// app/config/env.js
//
// Single source of truth for all environment configuration.
// Values come from the active .env file via react-native-dotenv.
//
// To switch environment:
//   cp .env.development .env   → local dev
//   cp .env.uat .env           → UAT / staging
//   cp .env.production .env    → production release
//
// Then restart Metro: npx expo start --clear

import {
  APP_ENV,
  API_URL,
  CDN_URL,
  REQUEST_TIMEOUT_MS,
  ENABLE_REQUEST_LOGGING,
  RETRY_COUNT,
} from "@env";

export const ENV                  = APP_ENV;
export const API_BASE_URL         = API_URL;
export const CDN_BASE_URL         = CDN_URL;
export const REQUEST_TIMEOUT_MS_N = parseInt(REQUEST_TIMEOUT_MS, 10);
export const ENABLE_LOGGING       = ENABLE_REQUEST_LOGGING === "true";
export const RETRY_COUNT_N        = parseInt(RETRY_COUNT, 10);

export const isDev  = ENV === "development";
export const isUat  = ENV === "uat";
export const isProd = ENV === "production";

// ── Legacy shim — keeps any remaining imports of API_CONFIG working ────────
// Gradually replace with direct imports from this file.
export const API_CONFIG = {
  BASE_URL:     CDN_BASE_URL,
  BASE_URL_API: API_BASE_URL,
};
