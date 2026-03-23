// app/services/levelProgressionService.js
//
// Handles level progression — called when the user has completed all
// stories in their current playLevel.
//
// POST /profile/level/progress
//   Body:  { profileId, completedLevel }
//   Returns:
//     { newLevel, stories: [...] }          — successfully progressed
//     { noNextLevel: true }                  — no higher level exists

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/apiConfig";
import { getAccessToken } from "./tokenStorage";

const BASE_URL = API_CONFIG.BASE_URL_API ?? "https://your-api.example.com";
const TOKEN_KEY = "@access_token";

const STORY_PREFIX = "@story_activity_";
const PROFILES_KEY = "@app_profiles";
const CURRENT_PROFILE_KEY = "@app_current_profile";

// Key pattern for the pending-progression flag
const pendingKey = (profileId) => `@level_progress_pending_${profileId}`;

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// progressLevel
//
// 1. Calls POST /profile/level/progress on the backend.
// 2. On success:
//    a. Clears completed level's local story activity records.
//    b. Updates stored profile playLevel in AsyncStorage.
//    c. Clears any pending-progression flag for this profile.
// 3. On network / server failure:
//    a. Persists the full request body as a pending-progression flag.
//    b. Re-throws so the caller (LevelProgressionOverlay) can show the error.
// ─────────────────────────────────────────────────────────────────────────────
export async function progressLevel(
  profileId,
  completedLevel,
  lastActivity = null,
) {
  //const headers = await getAuthHeaders();
  const accessToken = await getAccessToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  // lastActivity is the completed session piggybacked onto this request.
  // The backend upserts it before checking level completion so the
  // sync/progression race condition is closed — even if SyncEngine hasn't
  // fired yet, the last story is guaranteed to be on the backend.
  let resp;
  try {
    resp = await fetch(`${BASE_URL}/profile/level/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ profileId, completedLevel, lastActivity }),
      signal: controller.signal,
    });
  } catch (networkErr) {
    // Network unavailable — persist the pending flag so the home banner appears
    await _savePending(profileId, body);
    const isTimeout = networkErr.name === "AbortError";
    throw new Error(
      isTimeout
        ? "Request timed out. Your progress is saved — tap 'New Level Awaits!' when ready."
        : "No internet connection. Your progress is saved — tap 'New Level Awaits!' when back online.",
    );
  } finally {
    clearTimeout(timeoutId); // always clear the timeout
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    // Server error — also persist so user can retry later
    await _savePending(profileId, body);
    throw new Error(`Level progression failed: ${resp.status} ${text}`);
  }

  const result = await resp.json();
  // result shape: { noNextLevel: true } OR { newLevel: number, stories: [...] }

  if (!result.noNextLevel) {
    // ── Clear completed level's local story activity records ──────────────
    // We only sync current level data going forward. Completed level
    // records are purged locally (backend already has them confirmed).
    await _clearLevelActivities(profileId, completedLevel);

    // ── Update stored profile playLevel in AsyncStorage ───────────────────
    await _updateStoredProfileLevel(profileId, result.newLevel);
  }

  // ── Always clear the pending flag on any successful response ─────────────
  // Covers both normal progression and noNextLevel (user completed everything).
  await clearPendingProgression(profileId);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// getPendingProgression
//
// Returns the stored pending request body for this profile, or null if none.
// Called by the home screen to decide whether to show the banner.
// ─────────────────────────────────────────────────────────────────────────────
export async function getPendingProgression(profileId) {
  try {
    const raw = await AsyncStorage.getItem(pendingKey(profileId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// clearPendingProgression
//
// Removes the pending-progression flag. Called:
//   • After a successful progressLevel() call (above)
//   • On login / profile switch when backend playLevel > completedLevel stored
//     in the pending flag — another device already progressed the level
// ─────────────────────────────────────────────────────────────────────────────
export async function clearPendingProgression(profileId) {
  try {
    await AsyncStorage.removeItem(pendingKey(profileId));
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// checkAndClearStalePending
//
// Called after login (setUserAccount) and on profile switch (selectProfile).
// Compares the backend-authoritative playLevel with the pending completedLevel.
// If backend has already moved past the pending level → another device progressed
// → clear the flag silently so the banner never shows on this device.
// ─────────────────────────────────────────────────────────────────────────────
export async function checkAndClearStalePending(profileId, backendPlayLevel) {
  try {
    const pending = await getPendingProgression(profileId);
    if (!pending) return; // nothing pending — nothing to check

    if (backendPlayLevel > pending.completedLevel) {
      // Backend is already past the level we were trying to progress to.
      // Another device (or a previous session) already completed the progression.
      console.log(
        `[LevelProgression] clearing stale pending for profile ${profileId}: ` +
          `backend playLevel ${backendPlayLevel} > pending completedLevel ${pending.completedLevel}`,
      );
      await clearPendingProgression(profileId);

      // Also update local AsyncStorage profile level to match backend
      await _updateStoredProfileLevel(profileId, backendPlayLevel);
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function _savePending(profileId, requestBody) {
  try {
    await AsyncStorage.setItem(
      pendingKey(profileId),
      JSON.stringify(requestBody),
    );
    console.log(
      `[LevelProgression] pending progression saved for profile ${profileId}`,
    );
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// _clearLevelActivities
//
// Removes all @story_activity_{profileId}_{storyId} keys for stories that
// belonged to the completed level. Since we don't store which storyId belongs
// to which level locally, we delete ALL activity records for this profile —
// the backend is the source of truth and has them all confirmed.
// ─────────────────────────────────────────────────────────────────────────────
async function _clearLevelActivities(profileId, completedLevel) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix = `${STORY_PREFIX}${profileId}_`;
    const keysToDelete = allKeys.filter((k) => k.startsWith(prefix));
    if (keysToDelete.length > 0) {
      await AsyncStorage.multiRemove(keysToDelete);
      console.log(
        `[LevelProgression] cleared ${keysToDelete.length} activity records for profile ${profileId} level ${completedLevel}`,
      );
    }
  } catch (err) {
    console.warn("[LevelProgression] failed to clear activity records:", err);
    // Non-fatal — the overlay can still proceed
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _updateStoredProfileLevel
//
// Updates playLevel in both @app_profiles list and @app_current_profile.
// ─────────────────────────────────────────────────────────────────────────────
async function _updateStoredProfileLevel(profileId, newLevel) {
  try {
    // Update profiles list
    const profilesRaw = await AsyncStorage.getItem(PROFILES_KEY);
    if (profilesRaw) {
      const profiles = JSON.parse(profilesRaw);
      const updated = profiles.map((p) =>
        p.id === profileId ? { ...p, playLevel: newLevel } : p,
      );
      await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
    }

    // Update current profile if it matches
    const currentRaw = await AsyncStorage.getItem(CURRENT_PROFILE_KEY);
    if (currentRaw) {
      const current = JSON.parse(currentRaw);
      if (current.id === profileId) {
        await AsyncStorage.setItem(
          CURRENT_PROFILE_KEY,
          JSON.stringify({ ...current, playLevel: newLevel }),
        );
      }
    }
  } catch (err) {
    console.warn(
      "[LevelProgression] failed to update stored profile level:",
      err,
    );
  }
}
