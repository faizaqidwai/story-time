// app/services/SyncEngine.js
//
// Background sync engine.
//
// CHANGE FROM ORIGINAL:
//   ✅ _purgeConfirmedCompletedSessions no longer DELETES completed session keys.
//      Instead it stamps lastSyncedAt on them to record that the backend has
//      this data. The keys stay in AsyncStorage permanently as the local source
//      of truth for story completion state.
//
//      Previously, sessions with rewardsDisbursed=true were removed after a
//      successful sync. This caused the bug where completed stories lost their
//      "Completed" badge after logout + login — loadAllStoryProgress found 0
//      keys and had nothing to merge into localCompletedIds.
//
//   All other sync logic unchanged.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const LAST_SYNC_KEY = "@last_sync_time";
const PROFILES_STORAGE_KEY = "@app_profiles";
const STORY_PREFIX = "@story_activity_";

let _intervalId = null;
let _isSyncing = false;

function start(getAuthToken, onSyncComplete) {
  stop();
  _intervalId = setInterval(
    () => _runSync(getAuthToken, onSyncComplete),
    SYNC_INTERVAL_MS,
  );
}

function stop() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

async function syncNow(getAuthToken, onSyncComplete) {
  return _runSync(getAuthToken, onSyncComplete);
}

async function _runSync(getAuthToken, onSyncComplete) {
  if (_isSyncing) return null;
  _isSyncing = true;
  try {
    const token = await getAuthToken?.();
    if (!token) return null;

    const allKeys = await AsyncStorage.getAllKeys();

    const { request } = await _buildSyncRequest(allKeys);
    if (!request.profiles?.length) return null;

    const localSnap = await _captureLocalSnapshot(allKeys);
    const response = await apiClient.post("/sync/activities", request);
    if (!response) return null;

    await _resolveAndPersist(response, localSnap);
    await _markSyncedCompletedSessions(response, localSnap); // ← CHANGED (was _purgeConfirmedCompletedSessions)
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    onSyncComplete?.(response);
    return response;
  } catch (err) {
    console.warn("[SyncEngine] sync failed:", err?.message ?? err);
    return null;
  } finally {
    _isSyncing = false;
  }
}

async function _buildSyncRequest(allKeys) {
  const snapshotTime = new Date().toISOString();
  const raw = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
  const profiles = raw ? JSON.parse(raw) : [];
  const profileSyncData = await Promise.all(
    profiles.map(async (p) => ({
      profileId: p.id,
      storyActivities: await _loadProfileStoryActivities(p.id, allKeys),
    })),
  );
  return {
    request: {
      clientSnapshotTime: snapshotTime,
      profiles: profileSyncData.filter((p) => p.storyActivities.length > 0),
    },
  };
}

async function _loadProfileStoryActivities(profileId, allKeys) {
  try {
    const keys = allKeys.filter((k) =>
      k.startsWith(`${STORY_PREFIX}${profileId}_`),
    );
    if (!keys.length) return [];
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs
      .map(([, raw]) => {
        try {
          return _toSyncData(JSON.parse(raw));
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function _toSyncData(s) {
  return {
    storyId: s.storyId,
    storyTitle: s.storyTitle,
    nextActivityIndex: s.nextActivityIndex,
    activities: s.activities ?? {},
    totalRewards: s.totalRewards ?? { coins: 0, diamonds: 0, words: [] },
    challengeWords: s.challengeWords ?? [],
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    lastModifiedAt: s.lastModifiedAt ?? s.startedAt,
  };
}

async function _captureLocalSnapshot(allKeys) {
  try {
    const keys = allKeys.filter((k) => k.startsWith(STORY_PREFIX));
    if (!keys.length) return {};
    const pairs = await AsyncStorage.multiGet(keys);
    const snap = {};
    for (const [key, raw] of pairs) {
      if (!raw) continue;
      try {
        const s = JSON.parse(raw);
        snap[key] = {
          nextActivityIndex: s.nextActivityIndex,
          lastModifiedAt: s.lastModifiedAt ?? s.startedAt,
        };
      } catch (_) {}
    }
    return snap;
  } catch {
    return {};
  }
}

async function _resolveAndPersist(syncResponse, localSnap) {
  if (!syncResponse?.resolvedActivities) return;
  const writes = [];

  const keysToFetch = [];
  for (const { profileId, storyActivities } of syncResponse.resolvedActivities) {
    if (!storyActivities) continue;
    for (const ba of storyActivities) {
      const key = `${STORY_PREFIX}${profileId}_${ba.storyId}`;
      const snap = localSnap[key];
      const localAhead = snap && snap.nextActivityIndex > ba.nextActivityIndex;
      const needsRewardCheck = !localAhead && ba.nextActivityIndex >= 4;
      if (localAhead || needsRewardCheck) keysToFetch.push(key);
    }
  }

  const fetched = keysToFetch.length
    ? Object.fromEntries(await AsyncStorage.multiGet(keysToFetch))
    : {};

  for (const { profileId, storyActivities } of syncResponse.resolvedActivities) {
    if (!storyActivities) continue;
    for (const ba of storyActivities) {
      const key = `${STORY_PREFIX}${profileId}_${ba.storyId}`;
      const snap = localSnap[key];
      const localAhead = snap && snap.nextActivityIndex > ba.nextActivityIndex;

      if (localAhead) {
        const cur = fetched[key];
        if (cur) {
          try {
            writes.push([key, JSON.stringify(_mergeLocalAhead(JSON.parse(cur), ba))]);
          } catch {
            writes.push([key, JSON.stringify(_toSession(profileId, ba))]);
          }
        }
      } else {
        const sess = _toSession(profileId, ba);
        if (ba.nextActivityIndex >= 4) {
          const cur = fetched[key];
          if (cur) {
            try {
              if (JSON.parse(cur).rewardsDisbursed) sess.rewardsDisbursed = true;
            } catch {}
          }
        }
        writes.push([key, JSON.stringify(sess)]);
      }
    }
  }

  if (writes.length) await AsyncStorage.multiSet(writes);
  await _applyProfileSummaries(syncResponse.profileSummaries);
}

function _mergeLocalAhead(local, ba) {
  const lr = local.totalRewards ?? {};
  const br = ba.totalRewards ?? {};
  const words = new Set([...(lr.words ?? []), ...(br.words ?? [])]);
  return {
    ...local,
    totalRewards: {
      coins: Math.max(lr.coins ?? 0, br.coins ?? 0),
      diamonds: Math.max(lr.diamonds ?? 0, br.diamonds ?? 0),
      words: [...words],
    },
    challengeWords:
      local.challengeWords?.length > 0
        ? local.challengeWords
        : (ba.challengeWords ?? []),
    activities: _mergeActMaps(local.activities, ba.activities),
    lastSyncedAt: ba.lastSyncedAt,
  };
}

function _mergeActMaps(local, backend) {
  const r = { ...(local ?? {}) };
  if (backend) {
    for (const [k, v] of Object.entries(backend)) {
      if (!r[k] && v) r[k] = v;
    }
  }
  return r;
}

function _toSession(profileId, ba) {
  return {
    profileId,
    storyId: ba.storyId,
    storyTitle: ba.storyTitle,
    nextActivityIndex: ba.nextActivityIndex,
    activities: ba.activities ?? {},
    totalRewards: ba.totalRewards ?? { coins: 0, diamonds: 0, words: [] },
    challengeWords: ba.challengeWords ?? [],
    startedAt: ba.startedAt,
    completedAt: ba.completedAt,
    lastSyncedAt: ba.lastSyncedAt,
    lastModifiedAt: ba.lastSyncedAt,
  };
}

async function _applyProfileSummaries(summaries) {
  if (!summaries?.length) return;
  try {
    const raw = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return;
    const profiles = JSON.parse(raw);
    const map = Object.fromEntries(summaries.map((s) => [s.profileId, s]));
    let changed = false;
    const updated = profiles.map((p) => {
      const s = map[p.id];
      if (!s) return p;
      const u = { ...p };
      if (s.playLevel > (p.playLevel ?? 1)) { u.playLevel = s.playLevel; changed = true; }
      if (s.coins > (p.coins ?? 0)) { u.coins = s.coins; changed = true; }
      if (s.diamonds > (p.diamonds ?? 0)) { u.diamonds = s.diamonds; changed = true; }
      return u;
    });
    if (changed)
      await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("[SyncEngine] applyProfileSummaries failed:", err);
  }
}

// ── CHANGED: was _purgeConfirmedCompletedSessions ─────────────────────────
//
// Previously deleted AsyncStorage keys for completed+synced sessions.
// This broke story completion state after logout+login since loadAllStoryProgress
// relies on these keys to rebuild localCompletedIds.
//
// Now: only stamps lastSyncedAt on sessions that have been confirmed by the
// backend. Keys are NEVER deleted — they are the permanent local source of
// truth for whether a story has been completed.
async function _markSyncedCompletedSessions(syncResponse, localSnap) {
  if (!syncResponse?.resolvedActivities) return;
  const toMark = [];

  for (const { profileId, storyActivities } of syncResponse.resolvedActivities) {
    if (!storyActivities) continue;
    for (const ba of storyActivities) {
      if (ba.nextActivityIndex < 4) continue;
      const key = `${STORY_PREFIX}${profileId}_${ba.storyId}`;
      const snap = localSnap[key];
      // Skip if local is ahead of backend — don't stamp yet
      if (snap && snap.nextActivityIndex > ba.nextActivityIndex) continue;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        // Only stamp if rewardsDisbursed=true and not yet stamped
        if (parsed.rewardsDisbursed && !parsed.lastSyncedAt) {
          toMark.push([key, JSON.stringify({
            ...parsed,
            lastSyncedAt: new Date().toISOString(),
          })]);
        }
      } catch {}
    }
  }

  if (toMark.length) {
    await AsyncStorage.multiSet(toMark);
    console.log("[SyncEngine] marked synced sessions:", toMark.length);
  }
}

async function _pullActivities(getAuthToken, onSyncComplete) {
  try {
    const token = await getAuthToken?.();
    if (!token) return null;
    const allKeys = await AsyncStorage.getAllKeys();
    const localSnap = await _captureLocalSnapshot(allKeys);
    const response = await apiClient.get("/sync/activities");
    await _resolveAndPersist(response, localSnap);
    await _applyProfileSummaries(response.profileSummaries);
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    onSyncComplete?.(response);
    return response;
  } catch (err) {
    console.warn("[SyncEngine] pull failed:", err?.message ?? err);
    return null;
  }
}

export const SyncEngine = {
  start,
  stop,
  syncNow,
  pullActivities: _pullActivities,
};
