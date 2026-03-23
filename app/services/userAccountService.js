// app/services/userAccountService.js
//
// Service layer for UserAccount API calls.
// POST /user/account/credentials — link email + password
// GET  /user/account             — fetch account details

import { apiFetch, apiPost } from "./api";
import { getAccessToken } from "./tokenStorage";

export async function setUserAccountCredentials(email, password) {
  const accessToken = await getAccessToken();
  return apiPost("/user/account/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchUserAccount() {
  const accessToken = await getAccessToken();
  return apiFetch("/user/account", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
