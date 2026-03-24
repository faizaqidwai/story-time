// app/services/apiClient.js
//
// Central HTTP client. All API calls go through here.
//
// Features:
//  • Auth interceptor — attaches correct Authorization header automatically
//      auth: "none"     → no header  (login, register/token)
//      auth: "register" → Bearer <registerToken>  (account creation)
//      auth: "access"   → Bearer <accessToken>    (all post-login calls) ← DEFAULT
//  • Timeout via AbortController
//  • Exponential backoff retry for network / timeout / server errors
//  • Dev-only request + response logging (controlled by ENABLE_LOGGING from .env)
//  • Typed ApiError thrown on every failure
//
// Usage:
//   import { apiClient } from "./apiClient";
//
//   apiClient.get("/books/profile/123")                          // access token (default)
//   apiClient.post("/auth/user/login", body, { auth: "none" })   // no auth
//   apiClient.post("/register/account", body, { auth: "register" }) // register token

import { API_BASE_URL, REQUEST_TIMEOUT_MS_N, ENABLE_LOGGING, RETRY_COUNT_N } from "../config/env";
import { ApiError, ERROR_TYPE, errorTypeFromStatus } from "./ApiError";
import { getAccessToken, getRegisterToken } from "./tokenStorage";

const RETRYABLE_TYPES = new Set([ERROR_TYPE.NETWORK, ERROR_TYPE.TIMEOUT, ERROR_TYPE.SERVER]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Dev logging ────────────────────────────────────────────────────────────
function logRequest(method, url, options) {
  if (!ENABLE_LOGGING) return;
  console.log(`\n▶ [API] ${method.toUpperCase()} ${url}`);
  if (options.body) {
    try { console.log("  Body:", JSON.parse(options.body)); } catch (_) {}
  }
}

function logResponse(method, url, status, data, ms) {
  if (!ENABLE_LOGGING) return;
  const icon = status >= 200 && status < 300 ? "✅" : "❌";
  console.log(`${icon} [API] ${method.toUpperCase()} ${url} → ${status} (${ms}ms)`);
  if (data) console.log("  Response:", data);
}

// ── Resolve Authorization header by token type ─────────────────────────────
async function resolveAuthHeader(auth) {
  if (auth === "none") return {};

  if (auth === "register") {
    const token = await getRegisterToken();
    if (!token) throw new ApiError({
      message: "No register token found. Please restart onboarding.",
      errorType: ERROR_TYPE.AUTH,
    });
    return { Authorization: `Bearer ${token}` };
  }

  // Default: "access"
  const token = await getAccessToken();
  if (!token) throw new ApiError({
    message: "Not authenticated. Please log in.",
    errorType: ERROR_TYPE.AUTH,
  });
  return { Authorization: `Bearer ${token}` };
}

// ── Core request ───────────────────────────────────────────────────────────
async function request(endpoint, {
  method  = "GET",
  body    = undefined,
  auth    = "access",
  timeout = REQUEST_TIMEOUT_MS_N,
  retries = RETRY_COUNT_N,
  headers: extraHeaders = {},
} = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), timeout);
    const startMs    = Date.now();

    try {
      // ── REQUEST INTERCEPTOR ──────────────────────────────────────────
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

      // ── FETCH ────────────────────────────────────────────────────────
      const response  = await fetch(url, fetchOptions);
      const durationMs = Date.now() - startMs;

      // ── RESPONSE INTERCEPTOR ─────────────────────────────────────────
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
        const errorType = errorTypeFromStatus(response.status);
        const message   = (typeof data === "object" && data?.message)
          ? data.message
          : (typeof data === "string" && data)
          ? data
          : undefined;
        throw new ApiError({ message, errorType, statusCode: response.status, endpoint });
      }

      return data;

    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        if (RETRYABLE_TYPES.has(err.errorType) && attempt <= retries) {
          const delay = Math.pow(2, attempt - 1) * 500;
          console.warn(`[API] Retry ${attempt}/${retries} for ${method} ${url} in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw err;
      }

      if (err.name === "AbortError") {
        const e = new ApiError({ message: `Request timed out after ${timeout / 1000}s`, errorType: ERROR_TYPE.TIMEOUT, endpoint, originalError: err });
        if (attempt <= retries) { await sleep(Math.pow(2, attempt - 1) * 500); continue; }
        throw e;
      }

      const e = new ApiError({ message: "No internet connection. Please check your network.", errorType: ERROR_TYPE.NETWORK, endpoint, originalError: err });
      if (attempt <= retries) { await sleep(Math.pow(2, attempt - 1) * 500); continue; }
      throw e;

    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
export const apiClient = {
  get:    (endpoint, options = {})       => request(endpoint, { ...options, method: "GET" }),
  post:   (endpoint, body, options = {}) => request(endpoint, { ...options, method: "POST",   body }),
  put:    (endpoint, body, options = {}) => request(endpoint, { ...options, method: "PUT",    body }),
  patch:  (endpoint, body, options = {}) => request(endpoint, { ...options, method: "PATCH",  body }),
  delete: (endpoint, options = {})       => request(endpoint, { ...options, method: "DELETE" }),
};

// ── Legacy shims — keeps old api.js imports working during migration ────────
export async function apiFetch(endpoint, options = {}) {
  const method = options.method ?? "GET";
  const body   = options.body ? JSON.parse(options.body) : undefined;
  return request(endpoint, { method, body, auth: "access" });
}

export async function apiPost(endpoint, options = {}) {
  const body = options.body ? JSON.parse(options.body) : undefined;
  return request(endpoint, { method: "POST", body, auth: "access" });
}
