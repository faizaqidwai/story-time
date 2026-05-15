import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAuthTokens } from "./tokenStorage";

const PRIMARY_USER_KEY = "primary_user_account_id";
const DEVICE_ID_KEY    = "device_id";

export async function savePrimaryUserAccountId(id) {
  await SecureStore.setItemAsync(PRIMARY_USER_KEY, id);
}

export async function getPrimaryUserAccountId() {
  return SecureStore.getItemAsync(PRIMARY_USER_KEY);
}

/**
 * DEVELOPMENT ONLY — nukes ALL app data including all user accounts.
 * Do NOT call this from any production flow.
 * Still useful locally when you want a completely clean slate.
 */
export async function clearPrimaryUser() {
  try {
    await SecureStore.deleteItemAsync(PRIMARY_USER_KEY);
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    await AsyncStorage.clear();
  } catch (error) {
    console.error("Error clearing data:", error);
  }
}

/**
 * PRODUCTION — Targeted cleanup for a single user account.
 *
 * Deletes only the data belonging to the specified userAccountId:
 *  - AsyncStorage keys that contain the userAccountId or any of its profileIds
 *  - Auth tokens (always belong to the currently authenticated session)
 *  - Primary identity from SecureStore ONLY IF the deleted account is the primary user
 *    (checked by comparing userAccountId against PRIMARY_USER_KEY in SecureStore)
 *
 * Other user accounts on the same device are completely untouched.
 * DEVICE_ID_KEY is never deleted — the device still exists after account deletion.
 *
 * Called from two places:
 *  1. deleteAccountService.js  — deliberate in-app deletion
 *  2. apiClient.js             — automatic ACCOUNT_NOT_FOUND cleanup
 *
 * @param {string}   userAccountId - The account being cleared
 * @param {string[]} profileIds    - Profile IDs belonging to this account
 */
export async function clearAccountData(userAccountId, profileIds = []) {
  if (!userAccountId) {
    console.warn("[clearAccountData] No userAccountId provided — skipping");
    return;
  }

  console.log(
    "[clearAccountData] Clearing data for userAccountId=",
    userAccountId,
    "profileIds=",
    profileIds,
  );

  // ── Step 1: Clear targeted AsyncStorage keys ────────────────────────────
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    if (allKeys && allKeys.length > 0) {
      const identifiers = new Set([userAccountId, ...profileIds]);
      const keysToDelete = allKeys.filter((key) =>
        [...identifiers].some((id) => id && key.includes(id)),
      );
      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
        console.log(
          "[clearAccountData] Removed",
          keysToDelete.length,
          "AsyncStorage keys:",
          keysToDelete,
        );
      }
    }
  } catch (err) {
    console.warn("[clearAccountData] AsyncStorage cleanup error:", err?.message);
  }

  // ── Step 2: Clear auth tokens ───────────────────────────────────────────
  try {
    await clearAuthTokens();
    console.log("[clearAccountData] Auth tokens cleared");
  } catch (err) {
    console.warn("[clearAccountData] Failed to clear auth tokens:", err?.message);
  }

  // ── Step 3: Clear primary identity ONLY if this account is the primary user
  try {
    const primaryUserAccountId = await getPrimaryUserAccountId();
    const isDeletingPrimaryUser = primaryUserAccountId === userAccountId;

    if (isDeletingPrimaryUser) {
      await SecureStore.deleteItemAsync(PRIMARY_USER_KEY);
      // DEVICE_ID_KEY intentionally kept — device still exists
      console.log("[clearAccountData] Primary identity cleared (primary user deleted)");
    } else {
      console.log(
        "[clearAccountData] Non-primary user — primary identity untouched",
      );
    }
  } catch (err) {
    console.warn("[clearAccountData] SecureStore cleanup error:", err?.message);
  }
}
