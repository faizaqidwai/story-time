// app/services/userAccountService.js

import { apiClient } from "./apiClient";

export async function setUserAccountCredentials(email, password) {
  return apiClient.post("/user/account/credentials", { email, password });
}

export async function fetchUserAccount() {
  return apiClient.get("/user/account");
}

/**
 * Calls DELETE /user/account on the backend.
 * Deletes all account data server-side.
 * After this resolves, the caller is responsible for clearing local storage.
 */
export async function deleteUserAccount() {
  return apiClient.delete("/user/account");
}
