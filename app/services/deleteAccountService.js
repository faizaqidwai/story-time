// app/services/deleteAccountService.js
//
// Handles complete account deletion — backend + local data — when a user
// deliberately deletes their account from inside the app.
//
// Uses clearAccountData() from identityStorage which is the single source
// of truth for targeted local cleanup. The same function is also called by
// apiClient.js when ACCOUNT_NOT_FOUND is received automatically.
//
// Flow:
//  1. Collect profileIds from userAccount (needed for targeted AsyncStorage cleanup)
//  2. Call DELETE /user/account on backend (server deletes all data)
//  3. Call clearAccountData(userAccountId, profileIds) — clears only this account's
//     local data. Other users on the device are completely safe.
//  4. clearAllData() resets UserContext in-memory state
//  5. Navigate:
//     - Primary user deleted → "/" (SplashScreen → registration)
//     - Non-primary user deleted → "/features/login/login"

import { deleteUserAccount } from "./userAccountService";
import { clearAccountData, getPrimaryUserAccountId } from "./identityStorage";

/**
 * Fully deletes a user account — backend first, then local cleanup.
 *
 * @param {object}   params.userAccount   - Full userAccount object from UserContext
 * @param {string}   params.userAccountId - ID of the account to delete
 * @param {object}   params.router        - Expo router instance
 * @param {Function} params.clearAllData  - UserContext's clearAllData function
 *
 * @returns {{ success: boolean, error?: string }}
 */
export async function performAccountDeletion({
  userAccount,
  userAccountId,
  router,
  clearAllData,
}) {
  try {
    // ── Step 1: Collect profileIds before backend call ────────────────────
    // Collect now because after backend deletion the account is gone
    const profileIds = (userAccount?.profiles ?? [])
      .map((p) => p.id)
      .filter(Boolean);

    console.log(
      "[DeleteAccount] Starting deletion — userAccountId=",
      userAccountId,
      "profileIds=",
      profileIds,
    );

    // ── Step 2: Call backend DELETE /user/account ─────────────────────────
    // Backend deletes: user_account, login_sessions, story_activities,
    // game_states, reading_sessions. Subscriptions are anonymised.
    // Transactions are kept for financial audit.
    await deleteUserAccount();
    console.log("[DeleteAccount] Backend deletion successful");

    // ── Step 3: Clear all local data for this account only ────────────────
    // clearAccountData handles:
    //  - AsyncStorage keys matching userAccountId or any profileId
    //  - Auth tokens
    //  - Primary identity in SecureStore (ONLY if this is the primary user)
    // Other accounts on this device are completely untouched.
    await clearAccountData(userAccountId, profileIds);
    console.log("[DeleteAccount] Local data cleared");

    // ── Step 4: Reset UserContext in-memory state ─────────────────────────
    if (clearAllData) {
      await clearAllData();
    }

    // ── Step 5: Navigate based on whether this was the primary user ────────
    // getPrimaryUserAccountId() returns null if Step 3 cleared it
    // meaning this WAS the primary user and identity was wiped
    const remainingPrimaryId = await getPrimaryUserAccountId();
    const wasPrimaryUser = remainingPrimaryId === null;

    if (wasPrimaryUser) {
      console.log("[DeleteAccount] Primary user deleted → navigating to /");
      // SplashScreen sees no primaryUserAccountId → isFirstTime = true → registration
      router.replace("/");
    } else {
      console.log("[DeleteAccount] Non-primary user deleted → navigating to login");
      router.replace("/features/login/login");
    }

    return { success: true };

  } catch (err) {
    console.error("[DeleteAccount] Deletion failed:", err?.message);
    return { success: false, error: err?.message ?? "Something went wrong." };
  }
}
