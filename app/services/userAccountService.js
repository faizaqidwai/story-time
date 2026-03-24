// app/services/userAccountService.js

import { apiClient } from "./apiClient";

export async function setUserAccountCredentials(email, password) {
  return apiClient.post("/user/account/credentials", { email, password });
}

export async function fetchUserAccount() {
  return apiClient.get("/user/account");
}
