// app/services/tokenStorage.js
//
// All auth token persistence goes through here.
// Uses expo-secure-store so tokens are stored in the device keychain / keystore,
// never in plain AsyncStorage.

import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY  = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const REGISTER_TOKEN_KEY = "register_token";

// ── Access token ───────────────────────────────────────────────────────────

export async function saveAccessToken(token) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

// ── Refresh token ──────────────────────────────────────────────────────────

export async function saveRefreshToken(token) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

// ── Register token (temporary — cleared after account creation) ────────────

export async function saveRegisterToken(token) {
  await SecureStore.setItemAsync(REGISTER_TOKEN_KEY, token);
}

export async function getRegisterToken() {
  return SecureStore.getItemAsync(REGISTER_TOKEN_KEY);
}

export async function clearRegisterToken() {
  await SecureStore.deleteItemAsync(REGISTER_TOKEN_KEY);
}

// ── Clear all auth tokens ──────────────────────────────────────────────────
// Called by logoutLocally() in apiClient.js and by the login screen on mount.

export async function clearAuthTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
