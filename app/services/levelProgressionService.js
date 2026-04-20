// app/services/levelProgressionService.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";
import { ApiError, ERROR_TYPE } from "./ApiError";

const STORY_PREFIX = "@story_activity_";
const PROFILES_KEY = "@app_profiles";
const CURRENT_PROFILE_KEY = "@app_current_profile";
const pendingKey = (profileId) => `@level_progress_pending_${profileId}`;

export async function progressLevel(
  profileId,
  completedLevel,
  lastActivity = null,
) {
  // ── Load all story activities for this profile from local storage ──
  // We send the full set so the backend can sync everything before
  // performing the level-completion check, eliminating the race condition
  // where the SyncEngine has not yet flushed all sessions to the backend.
  const allActivities = await _loadAllProfileActivities(profileId);

  const body = { profileId, completedLevel, allActivities };
  try {
    const result = await apiClient.post("/profile/level/progress", body, {
      timeout: 15000,
    });
    if (!result.noNextLevel) {
      await _clearLevelActivities(profileId);
      await _updateStoredProfileLevel(profileId, result.newLevel);
    }
    await clearPendingProgression(profileId);
    return result;
  } catch (err) {
    await _savePending(profileId, body);
    if (err instanceof ApiError) {
      if (err.errorType === ERROR_TYPE.TIMEOUT) {
        throw new ApiError({
          message:
            "Request timed out. Your progress is saved — tap 'New Level Awaits!' when ready.",
          errorType: ERROR_TYPE.TIMEOUT,
        });
      }
      if (err.errorType === ERROR_TYPE.NETWORK) {
        throw new ApiError({
          message:
            "No internet connection. Your progress is saved — tap 'New Level Awaits!' when back online.",
          errorType: ERROR_TYPE.NETWORK,
        });
      }
    }
    throw err;
  }
}

export async function getPendingProgression(profileId) {
  try {
    const raw = await AsyncStorage.getItem(pendingKey(profileId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export async function clearPendingProgression(profileId) {
  try {
    await AsyncStorage.removeItem(pendingKey(profileId));
  } catch (_) {}
}

export async function checkAndClearStalePending(profileId, backendPlayLevel) {
  try {
    const pending = await getPendingProgression(profileId);
    if (!pending) return;
    if (backendPlayLevel > pending.completedLevel) {
      await clearPendingProgression(profileId);
      await _updateStoredProfileLevel(profileId, backendPlayLevel);
    }
  } catch (_) {}
}

// ── CHANGED: Load all story activity sessions for this profile ────────────────
// Reads every @story_activity_{profileId}_ key and converts each raw session
// into the StoryActivityData shape that the backend sync layer expects.
// Returns an empty array if nothing is found or on any error.
async function _loadAllProfileActivities(profileId) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix = `${STORY_PREFIX}${profileId}_`;
    const storyKeys = allKeys.filter((k) => k.startsWith(prefix));
    if (!storyKeys.length) return [];

    const pairs = await AsyncStorage.multiGet(storyKeys);
    const activities = [];

    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        const s = JSON.parse(raw);
        if (!s.storyId) continue;
        activities.push({
          storyId: s.storyId,
          storyTitle: s.storyTitle ?? null,
          nextActivityIndex: s.nextActivityIndex ?? 0,
          activities: s.activities ?? {},
          totalRewards: s.totalRewards ?? { coins: 0, diamonds: 0, words: [] },
          challengeWords: s.challengeWords ?? [],
          startedAt: s.startedAt ?? null,
          completedAt: s.completedAt ?? null,
          lastModifiedAt: s.lastModifiedAt ?? s.startedAt ?? null,
        });
      } catch (_) {}
    }

    return activities;
  } catch (_) {
    return [];
  }
}

async function _savePending(profileId, requestBody) {
  try {
    await AsyncStorage.setItem(
      pendingKey(profileId),
      JSON.stringify(requestBody),
    );
  } catch (_) {}
}

async function _clearLevelActivities(profileId) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keys = allKeys.filter((k) =>
      k.startsWith(`${STORY_PREFIX}${profileId}_`),
    );
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch (err) {
    console.warn("[LevelProgression] clear activities failed:", err);
  }
}

async function _updateStoredProfileLevel(profileId, newLevel) {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    if (raw) {
      const profiles = JSON.parse(raw).map((p) =>
        p.id === profileId ? { ...p, playLevel: newLevel } : p,
      );
      await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }
    const cr = await AsyncStorage.getItem(CURRENT_PROFILE_KEY);
    if (cr) {
      const current = JSON.parse(cr);
      if (current.id === profileId) {
        await AsyncStorage.setItem(
          CURRENT_PROFILE_KEY,
          JSON.stringify({ ...current, playLevel: newLevel }),
        );
      }
    }
  } catch (err) {
    console.warn("[LevelProgression] update profile level failed:", err);
  }
}
