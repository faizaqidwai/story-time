/**
 * GamificationSyncEngine.js
 * app/gamification/GamificationSyncEngine.js
 *
 * Syncs local AsyncStorage gamification state with the backend.
 * Uses the same apiClient used everywhere else in the app.
 *
 * syncOnLevelLoad(profileId, levelNumber)
 *   GET /api/v1/gamification/level/{n}
 *   Returns the API response for GamificationContext to seed locally.
 *
 * syncAfterMutation(profileId, levelNumber)
 *   POST /api/v1/gamification/sync
 *   Sends pending diff. Fire-and-forget. Retries on next mutation if it fails.
 */

import { apiClient } from "../services/apiClient";
import { getPendingSyncPayload, clearPendingSync } from "./GamificationEngine";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────────────────────────────────────
// syncOnLevelLoad
// ─────────────────────────────────────────────────────────────────────────────
export async function syncOnLevelLoad(profileId, levelNumber) {
  try {
    await restoreProfileStateFromServer(profileId, levelNumber);
    const response = await apiClient.get(
      `/api/v1/gamification/level/${levelNumber}`,
    );
    return response ?? null;
  } catch (err) {
    console.warn(
      `[GamificationSyncEngine] syncOnLevelLoad failed (level ${levelNumber}):`,
      err?.message ?? err,
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// syncAfterMutation — fire-and-forget
// ─────────────────────────────────────────────────────────────────────────────
export async function syncAfterMutation(profileId, levelNumber) {
  try {
    console.log(
      `[GamificationSync] - SYNC ENG - syncAfterMutation called for profileId=${profileId} level=${levelNumber}`,
    );
    const payload = await getPendingSyncPayload(profileId, levelNumber);
    console.log(
      `[GamificationSync] - SYNC ENG - got pending payload for profileId=${profileId} level=${levelNumber}:`,
      JSON.stringify(payload),
    );

    if (!payload || !payload.games || payload.games.length === 0) {
      console.log(
        `[GamificationSync] nothing to sync profileId=${profileId} level=${levelNumber}`,
      );
      return;
    }

    console.log(
      `[GamificationSync] syncing profileId=${profileId} level=${levelNumber}`,
      JSON.stringify(payload),
    );
    await apiClient.post("/api/v1/gamification/sync", payload);
    console.log(
      `[GamificationSync] ✅ sync success profileId=${profileId} level=${levelNumber}`,
    );

    // Only clear after backend confirms receipt
    await clearPendingSync(profileId, levelNumber);
  } catch (err) {
    // Silent — payload stays in AsyncStorage and retries on next mutation
    console.warn(
      `[GamificationSyncEngine] syncAfterMutation failed (level ${levelNumber}):`,
      err?.message ?? err,
    );
  }
}

export async function restoreProfileStateFromServer(profileId, levelNumber) {
  try {
    const stateResponse = await apiClient.get(
      `/api/v1/gamification/state/${profileId}/${levelNumber}`,
    );
    if (!stateResponse?.games?.length) return;

    const stateKey = `@game_state_${profileId}_${levelNumber}`;
    const completedKey = `@game_completed_stories_${profileId}_${levelNumber}`;

    const existingRaw = await AsyncStorage.getItem(stateKey);
    const existing = existingRaw ? JSON.parse(existingRaw) : null;

    const STATUS_RANK = { LOCKED: 0, REVEALED: 1, UNLOCKED: 2 };

    const mergedGames = stateResponse.games.map((serverSlot) => {
      const localSlot = existing?.games?.find(
        (g) => g.gameId === serverSlot.gameId,
      );
      const serverRank = STATUS_RANK[serverSlot.status] ?? 0;
      const localRank = STATUS_RANK[localSlot?.status] ?? 0;
      const winnerStatus =
        serverRank >= localRank ? serverSlot.status : localSlot.status;
      return {
        gameId: serverSlot.gameId,
        status: winnerStatus,
        storiesCompletedInGroup: Math.max(
          serverSlot.storiesCompletedInGroup ?? 0,
          localSlot?.storiesCompletedInGroup ?? 0,
        ),
      };
    });

    const restoredState = {
      profileId,
      levelNumber,
      games: mergedGames,
      events: existing?.events ?? [],
      pendingSync: false,
      lastModifiedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(stateKey, JSON.stringify(restoredState));

    const serverCompletedIds = stateResponse.games.flatMap(
      (g) => g.completedStoryIds ?? [],
    );
    const uniqueIds = [...new Set(serverCompletedIds)];
    console.log(
      `[GamificationSync] completedStoryIds restored profileId=${profileId} level=${levelNumber}:`,
      uniqueIds,
    );
    // Always overwrite with server data — server is source of truth.
    // Merging risks inflating the count from stale local entries
    // which causes premature slot reveals.
    await AsyncStorage.setItem(completedKey, JSON.stringify(uniqueIds));

    console.log(
      `[GamificationSync] ✅ restored state from server profileId=${profileId} level=${levelNumber}`,
    );
  } catch (err) {
    console.warn(
      `[GamificationSync] restoreProfileStateFromServer failed:`,
      err?.message ?? err,
    );
  }
}
