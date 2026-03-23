import { apiFetch, apiPost } from "./api";
import { getDeviceId } from "./deviceService";
import {
  saveRegisterToken,
  getRegisterToken,
  saveAccessToken,
  getAccessToken,
  clearRegisterToken,
} from "./tokenStorage";
import {
  savePrimaryUserAccountId,
  getPrimaryUserAccountId,
} from "./identityStorage";

/*
STEP 1
Get Register Token API
*/
export async function fetchRegisterToken() {
  const deviceId = await getDeviceId();
  // todo use correct request body and response
  const response = await apiPost("/auth/register/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceToken: deviceId,
    }),
  });
  await saveRegisterToken(response.token);
  return response;
}

/*
STEP 2
Register user
*/

export async function registerUser(defaultProfile) {
  const registerToken = await getRegisterToken();

  const deviceId = await getDeviceId();
  const response = await apiPost("/register/account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${registerToken}`,
    },
    body: JSON.stringify({
      ...defaultProfile,
      deviceId,
    }),
  });

  // save permanent token
  await saveAccessToken(response.tokenDetails.token);

  // save permanent primary id
  await savePrimaryUserAccountId(response.userAccount.id);

  // register token no longer needed
  await clearRegisterToken();

  return response;
}

/*
LOGOUT
*/
export async function logoutUser() {
  const accessToken = await getAccessToken();

  await apiFetch("/user/account/logout", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return true;
}

/*
LOGIN WITH PRIMARY ACCOUNT
*/
export async function loginWithPrimaryAccount() {
  const deviceId = await getDeviceId();
  const primaryUserAccountId = await getPrimaryUserAccountId();

  const response = await apiPost("/auth/device/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userAccountIdToken: primaryUserAccountId,
      deviceToken: deviceId,
    }),
  });

  return response;
}

/*
LOGIN WITH EMAIL
*/
export async function loginWithEmail(email, password) {
  const deviceId = await getDeviceId();

  const response = await apiPost("/auth/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      password: password,
      deviceToken: deviceId,
    }),
  });

  return response;
}

/*
FETCH USER ACCOUNT
*/
export async function fetchUserAccount() {
  const accessToken = await getAccessToken();

  const response = await apiFetch("/user/account", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response;
}
