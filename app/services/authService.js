// app/services/authService.js

import { apiClient } from "./apiClient";
import { getDeviceId } from "./deviceService";
import {
  saveRegisterToken,
  saveAccessToken,
  getAccessToken,
  clearRegisterToken,
} from "./tokenStorage";
import { savePrimaryUserAccountId, getPrimaryUserAccountId } from "./identityStorage";

/** STEP 1 — Get register token. No auth header. */
export async function fetchRegisterToken() {
  const deviceId = await getDeviceId();
  const response = await apiClient.post(
    "/auth/register/token",
    { deviceToken: deviceId },
    { auth: "none" },
  );
  await saveRegisterToken(response.token);
  return response;
}

/** STEP 2 — Create account. Uses register token. */
export async function registerUser(defaultProfile) {
  const deviceId = await getDeviceId();
  const response = await apiClient.post(
    "/register/account",
    { ...defaultProfile, deviceId },
    { auth: "register" },
  );
  await saveAccessToken(response.tokenDetails.token);
  await savePrimaryUserAccountId(response.userAccount.id);
  await clearRegisterToken();
  return response;
}

/** Logout — invalidates session on backend. */
export async function logoutUser() {
  await apiClient.get("/user/account/logout");
  return true;
}

/** Login with device ID (no email required). No auth header. */
export async function loginWithPrimaryAccount() {
  const deviceId = await getDeviceId();
  const primaryUserAccountId = await getPrimaryUserAccountId();
  return apiClient.post(
    "/auth/device/login",
    { userAccountIdToken: primaryUserAccountId, deviceToken: deviceId },
    { auth: "none" },
  );
}

/** Login with email + password. No auth header. */
export async function loginWithEmail(email, password) {
  const deviceId = await getDeviceId();
  return apiClient.post(
    "/auth/user/login",
    { email, password, deviceToken: deviceId },
    { auth: "none" },
  );
}

/** Fetch full user account details. Access token. */
export async function fetchUserAccount() {
  return apiClient.get("/user/account");
}
