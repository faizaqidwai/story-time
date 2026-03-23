// services/SyncEngine.js
//
// Background sync engine for StoryActivity data.
//
// Responsibilities:
//  1. Scheduled polling — every SYNC_INTERVAL_MS while the app is foregrounded
//  2. Compile a SyncRequest from all local profile sessions
//  3. POST to /sync/activities
//  4. Resolve the SyncResponse against local state:
//       - Keep local session if its nextActivityIndex is AHEAD of backend's resolved value
//         (i.e. the user made progress between request send and response receive)
//       - Otherwise replace local with backend's resolved copy
//  5. Apply profile summaries — update playLevel / coins / diamonds only if backend >= local
//  6. Persist the last successful sync timestamp so we can skip no-op syncs
//
// Usage:
//   Import { SyncEngine } and call:
//     SyncEngine.start(authToken, profilesRef)    — on app foreground / login
//     SyncEngine.stop()                           — on app background / logout
//     SyncEngine.syncNow(authToken, profilesRef)  — force immediate sync

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { API_CONFIG } from "../config/apiConfig";

// ── Constants ──────────────────────────────────────────────────────────────
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const LAST_SYNC_KEY = "@last_sync_time";
const PROFILES_STORAGE_KEY = "@app_profiles";
const STORY_PREFIX = "@story_activity_";

// Replace with your actual API base URL (from env/config)
const API_BASE_URL = API_CONFIG.BASE_URL_API ?? "https://your-api.example.com";

// ── Internal state ─────────────────────────────────────────────────────────
let _intervalId = null;
let _initialDelayId = null; // cancellable handle for the startup delay
let _appStateSubscription = null;
let _isSyncing = false; // prevents overlapping sync calls

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Start the background sync scheduler.
 *
 * @param {() => string | null} getAuthToken  — function that returns the current JWT
 * @param {Function} onSyncComplete           — callback(resolvedData) after each successful sync
 */
function start(getAuthToken, onSyncComplete) {
  stop(); // clear any existing interval first

  // Delay the first sync by 10 seconds so it doesn't compete with the home
  // screen's initial AsyncStorage reads (getAllKeys, multiGet) and API calls
  // that happen on mount. Simultaneous AsyncStorage operations saturate the
  // JS bridge and freeze the UI for 1-2 minutes.
  const initialDelay = setTimeout(() => {
    _runSync(getAuthToken, onSyncComplete);
  }, 10000);

  // Then schedule repeating syncs
  _intervalId = setInterval(() => {
    _runSync(getAuthToken, onSyncComplete);
  }, SYNC_INTERVAL_MS);

  // Store the initial delay timer so stop() can cancel it if needed
  _initialDelayId = initialDelay;

  // Also sync when app comes back to foreground
  _appStateSubscription = AppState.addEventListener("change", (nextState) => {
    if (nextState === "active") {
      _runSync(getAuthToken, onSyncComplete);
    }
  });
}

function stop() {
  if (_initialDelayId) {
    clearTimeout(_initialDelayId);
    _initialDelayId = null;
  }
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_appStateSubscription) {
    _appStateSubscription.remove();
    _appStateSubscription = null;
  }
}

/**
 * Force an immediate sync outside of the schedule.
 * Returns the SyncResponse or null on failure.
 */
async function syncNow(getAuthToken, onSyncComplete) {
  return _runSync(getAuthToken, onSyncComplete);
}

// ── Internal: orchestrate one sync cycle ───────────────────────────────────

async function _runSync(getAuthToken, onSyncComplete) {
  if (_isSyncing) {
    console.log("[SyncEngine] skipped — already syncing");
    return null;
  }
  _isSyncing = true; // guard immediately — before any await

  try {
    const token = await getAuthToken?.();
    if (!token) {
      console.log("[SyncEngine] skipped — no auth token");
      return null;
    }

    // 1. Build the request payload from local storage
    const { request, snapshotTime } = await _buildSyncRequest();

    // Skip if there's nothing to sync
    if (!request.profiles || request.profiles.length === 0) {
      console.log("[SyncEngine] skipped — no profiles with activities to sync");
      return null;
    }

    console.log(
      "[SyncEngine] firing sync — profiles:",
      request.profiles.length,
      "activities:",
      request.profiles.reduce(
        (n, p) => n + (p.storyActivities?.length ?? 0),
        0,
      ),
    );

    // 2. Capture a snapshot of local state RIGHT BEFORE sending
    //    so we can detect writes that happened during the round-trip
    const localSnapshotBeforeSend = await _captureLocalSnapshot();

    // 3. Send to backend
    const response = await _postSync(token, request);
    if (!response) return null;

    // 4. Resolve backend response against local state
    await _resolveAndPersist(response, localSnapshotBeforeSend);

    // 5. Delete completed sessions that the backend has now confirmed.
    //    These were kept alive so SyncEngine could send them; now they're safe to remove.
    await _purgeConfirmedCompletedSessions(response, localSnapshotBeforeSend);

    // 6. Persist last sync timestamp
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    // 7. Notify caller (StoryActivityContext) so it can refresh in-memory state
    onSyncComplete?.(response);

    return response;
  } catch (err) {
    console.warn("[SyncEngine] sync failed:", err?.message ?? err);
    return null;
  } finally {
    _isSyncing = false;
  }
}

// ── Build SyncRequest from AsyncStorage ────────────────────────────────────

async function _buildSyncRequest() {
  const snapshotTime = new Date().toISOString();

  // Load all profiles for logged-in user
  const profilesRaw = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
  const profiles = profilesRaw ? JSON.parse(profilesRaw) : [];
  console.log(
    "[SyncEngine] _buildSyncRequest — profiles in storage:",
    profiles.length,
  );

  const profileSyncData = await Promise.all(
    profiles.map(async (profile) => {
      const storyActivities = await _loadProfileStoryActivities(profile.id);
      console.log(
        `[SyncEngine] profile ${profile.id} — activities found: ${storyActivities.length}`,
      );
      return {
        profileId: profile.id,
        storyActivities,
      };
    }),
  );

  return {
    request: {
      clientSnapshotTime: snapshotTime,
      profiles: profileSyncData.filter((p) => p.storyActivities.length > 0),
    },
    snapshotTime,
  };
}

async function _loadProfileStoryActivities(profileId) {
  try {
    // Find all AsyncStorage keys that match this profile's story sessions
    const allKeys = await AsyncStorage.getAllKeys();
    const profilePrefix = `${STORY_PREFIX}${profileId}_`;
    const storyKeys = allKeys.filter((k) => k.startsWith(profilePrefix));

    const pairs = await AsyncStorage.multiGet(storyKeys);
    const activities = [];

    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        const session = JSON.parse(raw);
        activities.push(_sessionToSyncData(session));
      } catch (_) {}
    }

    return activities;
  } catch (err) {
    console.warn(
      "[SyncEngine] failed to load activities for profile",
      profileId,
      err,
    );
    return [];
  }
}

function _sessionToSyncData(session) {
  return {
    storyId: session.storyId,
    storyTitle: session.storyTitle,
    nextActivityIndex: session.nextActivityIndex,
    activities: session.activities ?? {},
    totalRewards: session.totalRewards ?? { coins: 0, diamonds: 0, words: [] },
    // challengeWords are the story's words snapshotted at session start.
    // The backend uses these to populate profile.wordBag on completion.
    challengeWords: session.challengeWords ?? [],
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    lastModifiedAt: session.lastModifiedAt ?? session.startedAt,
  };
}

// ── Capture local snapshot (used to detect writes during round-trip) ────────

async function _captureLocalSnapshot() {
  // Returns a map: "@story_activity_{profileId}_{storyId}" → { nextActivityIndex, lastModifiedAt }
  // We only need enough to detect if local moved ahead during the network round-trip.
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const storyKeys = allKeys.filter((k) => k.startsWith(STORY_PREFIX));
    const pairs = await AsyncStorage.multiGet(storyKeys);

    const snapshot = {};
    for (const [key, raw] of pairs) {
      if (!raw) continue;
      try {
        const session = JSON.parse(raw);
        snapshot[key] = {
          nextActivityIndex: session.nextActivityIndex,
          lastModifiedAt: session.lastModifiedAt ?? session.startedAt,
        };
      } catch (_) {}
    }
    return snapshot;
  } catch (_) {
    return {};
  }
}

// ── POST to backend ─────────────────────────────────────────────────────────

async function _postSync(token, request) {
  const resp = await fetch(`${API_BASE_URL}/sync/activities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!resp.ok) {
    console.warn("[SyncEngine] backend returned", resp.status);
    return null;
  }

  return resp.json();
}

// ── Resolve backend response against local storage ─────────────────────────

async function _resolveAndPersist(syncResponse, localSnapshotBeforeSend) {
  if (!syncResponse?.resolvedActivities) return;

  const writes = []; // batched AsyncStorage writes

  for (const profileResult of syncResponse.resolvedActivities) {
    const { profileId, storyActivities } = profileResult;
    if (!storyActivities) continue;

    for (const backendActivity of storyActivities) {
      const key = `${STORY_PREFIX}${profileId}_${backendActivity.storyId}`;

      // Check if the user made local progress AFTER we sent the request
      const localSnap = localSnapshotBeforeSend[key];
      const localAheadOfBackend =
        localSnap &&
        localSnap.nextActivityIndex > backendActivity.nextActivityIndex;

      if (localAheadOfBackend) {
        // Local is ahead — the user completed a sub-activity during the round-trip.
        // Load the current local state, merge rewards from backend (take the max),
        // but keep local's nextActivityIndex and activity completions.
        const currentRaw = await AsyncStorage.getItem(key);
        if (currentRaw) {
          try {
            const local = JSON.parse(currentRaw);
            const merged = _mergeLocalAhead(local, backendActivity);
            writes.push([key, JSON.stringify(merged)]);
          } catch (_) {
            // If parse fails, fall through and write backend version
            writes.push([
              key,
              JSON.stringify(
                _backendActivityToSession(profileId, backendActivity),
              ),
            ]);
          }
        }
      } else {
        // Backend is canonical — replace local entirely, but preserve
        // rewardsDisbursed flag so _purgeConfirmedCompletedSessions can
        // clean it up correctly after this sync round.
        const backendSession = _backendActivityToSession(
          profileId,
          backendActivity,
        );
        if (backendActivity.nextActivityIndex >= 4) {
          const currentRaw = await AsyncStorage.getItem(key);
          if (currentRaw) {
            try {
              const local = JSON.parse(currentRaw);
              if (local.rewardsDisbursed === true) {
                backendSession.rewardsDisbursed = true;
              }
            } catch (_) {}
          }
        }
        writes.push([key, JSON.stringify(backendSession)]);
      }
    }
  }

  if (writes.length > 0) {
    await AsyncStorage.multiSet(writes);
  }

  // Apply profile summaries — update playLevel/coins/diamonds if backend is ahead
  await _applyProfileSummaries(syncResponse.profileSummaries);
}

/**
 * Local is ahead on nextActivityIndex — keep local progress but
 * merge in any superior reward values from the backend.
 */
function _mergeLocalAhead(local, backendActivity) {
  const backendRewards = backendActivity.totalRewards ?? {};
  const localRewards = local.totalRewards ?? {};

  // Union word lists in totalRewards (kept for backwards compat, not used for wordBag)
  const wordSet = new Set([
    ...(localRewards.words ?? []),
    ...(backendRewards.words ?? []),
  ]);

  return {
    ...local,
    totalRewards: {
      coins: Math.max(localRewards.coins ?? 0, backendRewards.coins ?? 0),
      diamonds: Math.max(
        localRewards.diamonds ?? 0,
        backendRewards.diamonds ?? 0,
      ),
      words: [...wordSet],
    },
    // challengeWords — local wins (it already has them from startStorySession);
    // fall back to backend's copy if local is somehow missing them.
    challengeWords:
      local.challengeWords?.length > 0
        ? local.challengeWords
        : (backendActivity.challengeWords ?? []),
    // Merge activities maps — backend may have entries local doesn't (from other device)
    activities: _mergeActivityMaps(
      local.activities,
      backendActivity.activities,
    ),
    lastSyncedAt: backendActivity.lastSyncedAt,
  };
}

function _mergeActivityMaps(local, backend) {
  const result = { ...(local ?? {}) };
  if (backend) {
    for (const [key, val] of Object.entries(backend)) {
      if (!result[key] && val) {
        result[key] = val; // add completions from other device
      }
    }
  }
  return result;
}

function _backendActivityToSession(profileId, backendActivity) {
  return {
    profileId,
    storyId: backendActivity.storyId,
    storyTitle: backendActivity.storyTitle,
    nextActivityIndex: backendActivity.nextActivityIndex,
    activities: backendActivity.activities ?? {},
    totalRewards: backendActivity.totalRewards ?? {
      coins: 0,
      diamonds: 0,
      words: [],
    },
    // Backend echoes challengeWords back — restores them into the local session
    // so they're available even if the original session was saved without them.
    challengeWords: backendActivity.challengeWords ?? [],
    startedAt: backendActivity.startedAt,
    completedAt: backendActivity.completedAt,
    lastSyncedAt: backendActivity.lastSyncedAt,
    lastModifiedAt: backendActivity.lastSyncedAt,
  };
}

async function _applyProfileSummaries(profileSummaries) {
  if (!profileSummaries?.length) return;

  try {
    const profilesRaw = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
    if (!profilesRaw) return;

    const localProfiles = JSON.parse(profilesRaw);
    const summaryMap = Object.fromEntries(
      profileSummaries.map((s) => [s.profileId, s]),
    );

    let changed = false;
    const updatedProfiles = localProfiles.map((profile) => {
      const summary = summaryMap[profile.id];
      if (!summary) return profile;

      const updated = { ...profile };

      // playLevel — never downgrade, always take the higher
      if (summary.playLevel > (profile.playLevel ?? 1)) {
        updated.playLevel = summary.playLevel;
        changed = true;
      }

      // coins/diamonds — take the max (most generous wins)
      if (summary.coins > (profile.coins ?? 0)) {
        updated.coins = summary.coins;
        changed = true;
      }
      if (summary.diamonds > (profile.diamonds ?? 0)) {
        updated.diamonds = summary.diamonds;
        changed = true;
      }

      // NOTE: wordBag.words are NOT synced via ProfileSummary.
      // Words are full LearningWord objects and travel via the resolved
      // storyActivity's challengeWords field, which _backendActivityToSession
      // restores into the local session. The home screen's handleFinishDone
      // then writes them to profile.wordBag when the overlay is dismissed.

      return updated;
    });

    if (changed) {
      await AsyncStorage.setItem(
        PROFILES_STORAGE_KEY,
        JSON.stringify(updatedProfiles),
      );
    }
  } catch (err) {
    console.warn("[SyncEngine] failed to apply profile summaries:", err);
  }
}

// ── Purge completed sessions that the backend has confirmed ────────────────
//
// clearStorySession (in StoryActivityContext) stamps rewardsDisbursed=true
// instead of deleting the record, so SyncEngine can still send it.
// Once the backend returns the session in resolvedActivities with
// nextActivityIndex >= 4, it's safe to delete the local record.

async function _purgeConfirmedCompletedSessions(
  syncResponse,
  localSnapshotBeforeSend,
) {
  if (!syncResponse?.resolvedActivities) return;

  const keysToDelete = [];

  for (const profileResult of syncResponse.resolvedActivities) {
    const { profileId, storyActivities } = profileResult;
    if (!storyActivities) continue;

    for (const backendActivity of storyActivities) {
      if (backendActivity.nextActivityIndex < 4) continue; // not fully complete on backend

      const key = `${STORY_PREFIX}${profileId}_${backendActivity.storyId}`;

      // Only delete if the local copy was NOT ahead of what we sent
      // (i.e. no new progress happened during the round-trip)
      const localSnap = localSnapshotBeforeSend[key];
      const localAhead =
        localSnap &&
        localSnap.nextActivityIndex > backendActivity.nextActivityIndex;
      if (localAhead) continue;

      // Verify the local record is disbursed before deleting
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const session = JSON.parse(raw);
        if (session.rewardsDisbursed === true) {
          keysToDelete.push(key);
        }
      } catch (_) {}
    }
  }

  if (keysToDelete.length > 0) {
    await AsyncStorage.multiRemove(keysToDelete);
    console.log(
      "[SyncEngine] purged confirmed completed sessions:",
      keysToDelete,
    );
  }
}

// ── Pull activities from backend (no local data required) ──────────────────
//
// Called once on login when local storage has no activity records, OR when
// the regular sync is about to skip because local is empty.
//
// Unlike the regular sync which pushes local data first, this is a pure GET.
// However it still uses the same _resolveAndPersist merge logic — it captures
// a local snapshot BEFORE writing, so any local data that is ahead of the
// backend is preserved rather than overwritten.
//
// This handles the edge case: user had unsynced progress, cleared app cache,
// re-logged in. Local is empty so pull fires. Backend returns older state.
// Without snapshot protection, backend would win. With it, we take the max —
// same as the regular sync resolution rules.

async function _pullActivities(getAuthToken, onSyncComplete) {
  try {
    const token = await getAuthToken?.();
    if (!token) {
      console.log("[SyncEngine] pull skipped — no auth token");
      return null;
    }

    console.log("[SyncEngine] pulling all activity state from backend...");

    // Capture local snapshot BEFORE fetching — protects any unsynced local progress
    // that may exist even if the pull was triggered (e.g. partial local data).
    const localSnapshotBeforePull = await _captureLocalSnapshot();

    const resp = await fetch(`${API_BASE_URL}/sync/activities`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      console.warn("[SyncEngine] pull failed — backend returned", resp.status);
      return null;
    }

    const response = await resp.json();

    // Use the same _resolveAndPersist with the local snapshot — this ensures:
    //   - If local has no record for a story → backend version is written (normal pull)
    //   - If local IS ahead of backend on a story → local is preserved (merge protection)
    // The snapshot being empty {} is also fine — it just means backend wins everywhere,
    // which is correct for a truly fresh device with no local data at all.
    await _resolveAndPersist(response, localSnapshotBeforePull);
    await _applyProfileSummaries(response.profileSummaries);
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    const totalActivities =
      response.resolvedActivities?.reduce(
        (n, p) => n + (p.storyActivities?.length ?? 0),
        0,
      ) ?? 0;
    console.log(
      `[SyncEngine] pull complete — restored ${totalActivities} activity records`,
    );

    onSyncComplete?.(response);
    return response;
  } catch (err) {
    console.warn("[SyncEngine] pull failed:", err?.message ?? err);
    return null;
  }
}

// ── Exported singleton ─────────────────────────────────────────────────────

export const SyncEngine = {
  start,
  stop,
  syncNow,
  pullActivities: _pullActivities,
};
