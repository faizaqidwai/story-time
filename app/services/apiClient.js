// app/services/apiClient.js
//
// Central HTTP client. All API calls go through here.
//
// Features:
//  • Auth interceptor — attaches correct Authorization header automatically
//      auth: "none"     → no header  (login, register/token, refresh)
//      auth: "register" → Bearer <registerToken>  (account creation)
//      auth: "access"   → Bearer <accessToken>    (all post-login calls) ← DEFAULT
//  • Timeout via AbortController
//  • Exponential backoff retry for network / timeout / server errors
//  • Dev-only request + response logging (controlled by ENABLE_LOGGING from .env)
//  • Typed ApiError thrown on every failure
//
//  Auth error interception:
//  • TOKEN_EXPIRED (code 1002) → automatically calls POST /auth/token/refresh,
//    saves the new token pair, then retries the original request once.
//  • TOKEN_INVALID / REFRESH_TOKEN_EXPIRED / REFRESH_TOKEN_INVALID /
//    SESSION_EXPIRED / ACTIVE_SESSION_NOT_FOUND (codes 1003,1005,1006,1007,1008)
//    → calls logoutLocally() silently — no error sheet/toast shown for these.
//  • SESSIONS_LIMIT_REACHED (code 1009) → thrown normally so useApiCall
//    shows it to the user.
//
//  ACCOUNT_NOT_FOUND interception:
//  • Calls _clearAccountDataRef(userAccountId, profileIds) — targeted cleanup
//    for only the account that was not found. Other users on the device are safe.
//
//  logoutLocally() is exported so account.jsx logout button can call it
//  directly without duplicating the clear-storage + navigate logic.

import {
  API_BASE_URL,
  REQUEST_TIMEOUT_MS_N,
  ENABLE_LOGGING,
  RETRY_COUNT_N,
} from "../config/env";
import { ApiError, ERROR_TYPE, errorTypeFromStatus } from "./ApiError";
import {
  getAccessToken,
  getRefreshToken,
  getRegisterToken,
  saveAccessToken,
  saveRefreshToken,
  clearAuthTokens,
} from "./tokenStorage";
import { getPrimaryUserAccountId } from "./identityStorage";

// ── Error code constants ──────────────────────────────────────────────────
const AUTH_ERROR_CODES = {
  TOKEN_EXPIRED: 1002,
  TOKEN_INVALID: 1003,
  REFRESH_TOKEN_EXPIRED: 1005,
  REFRESH_TOKEN_INVALID: 1006,
  SESSION_EXPIRED: 1007,
  ACTIVE_SESSION_NOT_FOUND: 1008,
  SESSIONS_LIMIT_REACHED: 1009,
};

const ACCOUNT_ERROR_CODES = {
  ACCOUNT_NOT_FOUND: 2001,
};

const FATAL_AUTH_CODES = new Set([
  AUTH_ERROR_CODES.TOKEN_INVALID,
  AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED,
  AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID,
  AUTH_ERROR_CODES.SESSION_EXPIRED,
  AUTH_ERROR_CODES.ACTIVE_SESSION_NOT_FOUND,
]);

// ── Navigation + context references ──────────────────────────────────────
let _navigationRef = null;
let _clearUserData = null;
let _notifyRef = null;
let _clearIdentityRef = null; // kept for backward compat but no longer used in ACCOUNT_NOT_FOUND flow

/**
 * Registered by UserContext on mount.
 * Signature: (userAccountId: string, profileIds: string[]) => Promise<void>
 * Called with the exact userAccountId decoded from the JWT when
 * ACCOUNT_NOT_FOUND is received — so cleanup is always targeted to the
 * correct account, never to a different user on the same device.
 */
let _clearAccountDataRef = null;

// ── Refresh token mutex ───────────────────────────────────────────────────
let _refreshPromise = null;

export function setNavigationRef(router) {
  _navigationRef = router;
}
export function setClearUserData(fn) {
  _clearUserData = fn;
}
export function setNotifyRef(notify) {
  _notifyRef = notify;
}
export function setClearIdentityRef(fn) {
  _clearIdentityRef = fn;
} // kept, no longer used internally

/**
 * Register the targeted account-data cleanup function from UserContext.
 * Must be called at app startup (inside UserContext useEffect).
 *
 * @param {(userAccountId: string, profileIds: string[]) => Promise<void>} fn
 */
export function setClearAccountDataRef(fn) {
  _clearAccountDataRef = fn;
}

/**
 * Clears all local auth state and navigates to login.
 * Called on fatal auth errors and by the logout button in account.jsx.
 * Safe to call even when there is no internet — it never touches the backend.
 */
export async function logoutLocally(reason) {
  try {
    if (reason && _notifyRef) {
      _notifyRef.toast.error(reason);
      await new Promise((r) => setTimeout(r, 1200));
    }
    await clearAuthTokens();
    if (_clearUserData) await _clearUserData();
  } catch (_) {}
  if (_navigationRef) _navigationRef.replace("/features/login/login");
}

/**
 * Targeted cleanup when ACCOUNT_NOT_FOUND is received from the backend.
 *
 * Decodes the userAccountId from the current access token so we know
 * EXACTLY which account was not found — even if it is not the primary user.
 * Passes that ID to _clearAccountDataRef which handles:
 *  - Deleting only that account's AsyncStorage keys
 *  - Clearing auth tokens
 *  - Clearing primary identity ONLY if the deleted account == primary user
 *
 * Other accounts on the device are completely safe.
 */
async function logoutAndClearIdentity(reason, requestBody = null) {
  console.log("[logoutAndClearIdentity] CALLED");
  try {
    console.log("[logoutAndClearIdentity] inside try");
    if (reason && _notifyRef) {
      _notifyRef.toast.error(reason);
      await new Promise((r) => setTimeout(r, 1200));
    }

    let userAccountId = null;
    console.log("[logoutAndClearIdentity] getting access token");
    try {
      const accessToken = await getAccessToken();
      console.log("[logoutAndClearIdentity] accessToken=", accessToken);
      if (accessToken) {
        const payload = _decodeJwtPayload(accessToken);
        userAccountId = payload?.userId ?? null;
      }
    } catch (e) {
      console.log("[logoutAndClearIdentity] token decode error=", e?.message);
    }

    console.log(
      "[logoutAndClearIdentity] userAccountId from token=",
      userAccountId,
    );

    if (!userAccountId && requestBody) {
      const parsed =
        typeof requestBody === "string" ? JSON.parse(requestBody) : requestBody;
      userAccountId = parsed?.userAccountIdToken ?? null;
      console.log(
        "[logoutAndClearIdentity] userAccountId from body=",
        userAccountId,
      );
    }

    console.log(
      "[logoutAndClearIdentity] _clearAccountDataRef=",
      !!_clearAccountDataRef,
    );

    if (_clearAccountDataRef && userAccountId) {
      console.log("[logoutAndClearIdentity] calling _clearAccountDataRef");
      await _clearAccountDataRef(userAccountId);
    } else {
      console.log(
        "[logoutAndClearIdentity] SKIPPED — clearAccountDataRef=",
        !!_clearAccountDataRef,
        "userAccountId=",
        userAccountId,
      );
      await clearAuthTokens();
    }

    if (_clearUserData) await _clearUserData();
  } catch (e) {
    console.log("[logoutAndClearIdentity] CAUGHT ERROR=", e?.message, e);
  }

  if (_navigationRef) _navigationRef.replace("/");
}

// ── Retry config ──────────────────────────────────────────────────────────
const RETRYABLE_TYPES = new Set([
  ERROR_TYPE.NETWORK,
  ERROR_TYPE.TIMEOUT,
  ERROR_TYPE.SERVER,
]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Dev logging ───────────────────────────────────────────────────────────
function logRequest(method, url, options) {
  if (!ENABLE_LOGGING) return;
  console.log(`\n▶ [API] ${method.toUpperCase()} ${url}`);
  if (options.body) {
    try {
      console.log("  Body:", JSON.parse(options.body));
    } catch (_) {}
  }
}

function logResponse(method, url, status, data, ms) {
  if (!ENABLE_LOGGING) return;
  const icon = status >= 200 && status < 300 ? "✅" : "❌";
  console.log(
    `${icon} [API] ${method.toUpperCase()} ${url} → ${status} (${ms}ms)`,
  );
  if (data) console.log("  Response:", data);
}

// ── Resolve Authorization header ──────────────────────────────────────────
async function resolveAuthHeader(auth) {
  if (auth === "none") return {};

  if (auth === "register") {
    const token = await getRegisterToken();
    if (!token)
      throw new ApiError({
        message: "No register token found. Please restart onboarding.",
        errorType: ERROR_TYPE.AUTH,
      });
    return { Authorization: `Bearer ${token}` };
  }

  // Default: "access"
  const token = await getAccessToken();
  if (!token)
    throw new ApiError({
      message: "Not authenticated. Please log in.",
      errorType: ERROR_TYPE.AUTH,
    });
  return { Authorization: `Bearer ${token}` };
}

// ── JWT payload decoder ───────────────────────────────────────────────────
function _decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = "";
    let i = 0;
    const cleaned = padded.replace(/[^A-Za-z0-9+/]/g, "");
    while (i < cleaned.length) {
      const b0 = chars.indexOf(cleaned[i++]);
      const b1 = chars.indexOf(cleaned[i++]);
      const b2 = chars.indexOf(cleaned[i++]);
      const b3 = chars.indexOf(cleaned[i++]);
      bytes += String.fromCharCode((b0 << 2) | (b1 >> 4));
      if (b2 !== -1) bytes += String.fromCharCode(((b1 & 15) << 4) | (b2 >> 2));
      if (b3 !== -1) bytes += String.fromCharCode(((b2 & 3) << 6) | b3);
    }
    return JSON.parse(
      decodeURIComponent(
        bytes
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      ),
    );
  } catch (_) {
    return null;
  }
}

/**
 * Returns true if the currently logged-in user (from the access token)
 * is the same as the device's primary user (from identityStorage).
 */
async function _isLoggedInUserPrimaryUser(requestBody) {
  try {
    const primaryUserAccountId = await getPrimaryUserAccountId();
    if (!primaryUserAccountId) return false;

    const accessToken = await getAccessToken();
    if (!accessToken) {
      const requestingUserId = requestBody?.userAccountIdToken;
      if (!requestingUserId) return false;
      return requestingUserId === primaryUserAccountId;
    }

    const payload = _decodeJwtPayload(accessToken);
    return payload?.userId === primaryUserAccountId;
  } catch (_) {
    return false;
  }
}

// ── Refresh token call ────────────────────────────────────────────────────
async function attemptTokenRefresh() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        console.warn("[API] No refresh token found — cannot refresh.");
        return false;
      }

      const url = `${API_BASE_URL}/auth/token/refresh`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.warn("[API] Refresh failed with status:", response.status);
        return false;
      }

      const data = await response.json();
      if (!data?.token || !data?.refreshToken) {
        console.warn("[API] Refresh response missing tokens:", data);
        return false;
      }

      await saveAccessToken(data.token);
      await saveRefreshToken(data.refreshToken);
      console.log("[API] Token refreshed successfully.");
      return true;
    } catch (err) {
      console.warn("[API] Refresh token call threw:", err);
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ── Core request ──────────────────────────────────────────────────────────
async function request(
  endpoint,
  {
    method = "GET",
    body = undefined,
    auth = "access",
    timeout = REQUEST_TIMEOUT_MS_N,
    retries = RETRY_COUNT_N,
    headers: extraHeaders = {},
    _isRetryAfterRefresh = false,
  } = {},
) {
  const url = `${API_BASE_URL}${endpoint}`;
  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startMs = Date.now();

    try {
      const authHeader = await resolveAuthHeader(auth);

      const fetchOptions = {
        method: method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
          ...extraHeaders,
        },
        signal: controller.signal,
        ...(body !== undefined
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      };

      logRequest(method, url, fetchOptions);

      const response = await fetch(url, fetchOptions);
      const durationMs = Date.now() - startMs;

      let data = null;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text().catch(() => "");
        data = text || null;
      }

      logResponse(method, url, response.status, data, durationMs);

      if (!response.ok) {
        let parsedData = data;
        if (typeof data === "string") {
          try {
            parsedData = JSON.parse(data);
          } catch (_) {
            parsedData = null;
          }
        }
        const errorCode =
          parsedData && typeof parsedData === "object" ? parsedData.code : null;
        const errorType = errorTypeFromStatus(response.status);
        const message =
          parsedData && typeof parsedData === "object" && parsedData.message
            ? parsedData.message
            : typeof data === "string" && data
              ? data
              : undefined;

        if (ENABLE_LOGGING) {
          console.log(
            `[API] Error code: ${errorCode}, type: ${errorType}, message: ${message}`,
          );
        }

        // ── TOKEN_EXPIRED → refresh and retry ────────────────────────────
        if (
          errorCode === AUTH_ERROR_CODES.TOKEN_EXPIRED &&
          !_isRetryAfterRefresh
        ) {
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            return request(endpoint, {
              method,
              body,
              auth,
              timeout,
              retries,
              headers: extraHeaders,
              _isRetryAfterRefresh: true,
            });
          } else {
            await logoutLocally(
              "Your session has expired. Please log in again.",
            );
            return null;
          }
        }

        // ── Fatal auth codes → logout, no data wipe ──────────────────────
        if (FATAL_AUTH_CODES.has(errorCode)) {
          const reason =
            errorCode === AUTH_ERROR_CODES.SESSION_EXPIRED
              ? "Your session has expired. Please log in again."
              : errorCode === AUTH_ERROR_CODES.ACTIVE_SESSION_NOT_FOUND
                ? "Your session was ended. Please log in again."
                : "You have been logged out. Please log in again.";
          await logoutLocally(reason);
          return null;
        }

        // ── ACCOUNT_NOT_FOUND → targeted cleanup for that specific account ─
        if (errorCode === ACCOUNT_ERROR_CODES.ACCOUNT_NOT_FOUND) {
          console.log(
            "[apiClient] ACCOUNT_NOT_FOUND block reached, body=",
            body,
          );
          await logoutAndClearIdentity(
            "Your account no longer exists. Please register again.",
            body,
          );
          return null;
        }

        throw new ApiError({
          message,
          errorType,
          statusCode: response.status,
          endpoint,
        });
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        if (RETRYABLE_TYPES.has(err.errorType) && attempt <= retries) {
          const delay = Math.pow(2, attempt - 1) * 500;
          console.warn(
            `[API] Retry ${attempt}/${retries} for ${method} ${url} in ${delay}ms`,
          );
          await sleep(delay);
          continue;
        }
        throw err;
      }

      if (err.name === "AbortError") {
        const e = new ApiError({
          message: `Request timed out after ${timeout / 1000}s`,
          errorType: ERROR_TYPE.TIMEOUT,
          endpoint,
          originalError: err,
        });
        if (attempt <= retries) {
          await sleep(Math.pow(2, attempt - 1) * 500);
          continue;
        }
        throw e;
      }

      const e = new ApiError({
        message: "No internet connection. Please check your network.",
        errorType: ERROR_TYPE.NETWORK,
        endpoint,
        originalError: err,
      });
      if (attempt <= retries) {
        await sleep(Math.pow(2, attempt - 1) * 500);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────
export const apiClient = {
  get: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: "PATCH", body }),
  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: "DELETE" }),
};

// ── Legacy shims ──────────────────────────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
  const method = options.method ?? "GET";
  const body = options.body ? JSON.parse(options.body) : undefined;
  return request(endpoint, { method, body, auth: "access" });
}

export async function apiPost(endpoint, options = {}) {
  const body = options.body ? JSON.parse(options.body) : undefined;
  return request(endpoint, { method: "POST", body, auth: "access" });
}
