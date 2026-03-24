// app/services/SyncEngine.js
//
// Background sync engine. Logic unchanged from original.
// Updated to use apiClient instead of raw fetch.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { apiClient } from "./apiClient";

const SYNC_INTERVAL_MS     = 5 * 60 * 1000;
const LAST_SYNC_KEY        = "@last_sync_time";
const PROFILES_STORAGE_KEY = "@app_profiles";
const STORY_PREFIX         = "@story_activity_";

let _intervalId           = null;
let _initialDelayId       = null;
let _appStateSubscription = null;
let _isSyncing            = false;

function start(getAuthToken, onSyncComplete) {
  stop();
  _initialDelayId = setTimeout(() => _runSync(getAuthToken, onSyncComplete), 10000);
  _intervalId = setInterval(() => _runSync(getAuthToken, onSyncComplete), SYNC_INTERVAL_MS);
  _appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") _runSync(getAuthToken, onSyncComplete);
  });
}

function stop() {
  if (_initialDelayId)       { clearTimeout(_initialDelayId);  _initialDelayId = null; }
  if (_intervalId)           { clearInterval(_intervalId);     _intervalId = null; }
  if (_appStateSubscription) { _appStateSubscription.remove(); _appStateSubscription = null; }
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

    const { request } = await _buildSyncRequest();
    if (!request.profiles?.length) return null;

    const localSnap  = await _captureLocalSnapshot();
    const response   = await apiClient.post("/sync/activities", request);
    if (!response) return null;

    await _resolveAndPersist(response, localSnap);
    await _purgeConfirmedCompletedSessions(response, localSnap);
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

async function _buildSyncRequest() {
  const snapshotTime = new Date().toISOString();
  const raw = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
  const profiles = raw ? JSON.parse(raw) : [];
  const profileSyncData = await Promise.all(
    profiles.map(async (p) => ({
      profileId: p.id,
      storyActivities: await _loadProfileStoryActivities(p.id),
    })),
  );
  return {
    request: {
      clientSnapshotTime: snapshotTime,
      profiles: profileSyncData.filter((p) => p.storyActivities.length > 0),
    },
  };
}

async function _loadProfileStoryActivities(profileId) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keys = allKeys.filter((k) => k.startsWith(`${STORY_PREFIX}${profileId}_`));
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs
      .map(([, raw]) => { try { return _toSyncData(JSON.parse(raw)); } catch (_) { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

function _toSyncData(s) {
  return {
    storyId:           s.storyId,
    storyTitle:        s.storyTitle,
    nextActivityIndex: s.nextActivityIndex,
    activities:        s.activities ?? {},
    totalRewards:      s.totalRewards ?? { coins: 0, diamonds: 0, words: [] },
    challengeWords:    s.challengeWords ?? [],
    startedAt:         s.startedAt,
    completedAt:       s.completedAt,
    lastModifiedAt:    s.lastModifiedAt ?? s.startedAt,
  };
}

async function _captureLocalSnapshot() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keys = allKeys.filter((k) => k.startsWith(STORY_PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    const snap = {};
    for (const [key, raw] of pairs) {
      if (!raw) continue;
      try {
        const s = JSON.parse(raw);
        snap[key] = { nextActivityIndex: s.nextActivityIndex, lastModifiedAt: s.lastModifiedAt ?? s.startedAt };
      } catch (_) {}
    }
    return snap;
  } catch { return {}; }
}

async function _resolveAndPersist(syncResponse, localSnap) {
  if (!syncResponse?.resolvedActivities) return;
  const writes = [];

  for (const { profileId, storyActivities } of syncResponse.resolvedActivities) {
    if (!storyActivities) continue;
    for (const ba of storyActivities) {
      const key = `${STORY_PREFIX}${profileId}_${ba.storyId}`;
      const snap = localSnap[key];
      const localAhead = snap && snap.nextActivityIndex > ba.nextActivityIndex;

      if (localAhead) {
        const cur = await AsyncStorage.getItem(key);
        if (cur) {
          try { writes.push([key, JSON.stringify(_mergeLocalAhead(JSON.parse(cur), ba))]); }
          catch { writes.push([key, JSON.stringify(_toSession(profileId, ba))]); }
        }
      } else {
        const sess = _toSession(profileId, ba);
        if (ba.nextActivityIndex >= 4) {
          const cur = await AsyncStorage.getItem(key);
          if (cur) { try { if (JSON.parse(cur).rewardsDisbursed) sess.rewardsDisbursed = true; } catch {} }
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
      coins:    Math.max(lr.coins ?? 0,    br.coins ?? 0),
      diamonds: Math.max(lr.diamonds ?? 0, br.diamonds ?? 0),
      words:    [...words],
    },
    challengeWords: local.challengeWords?.length > 0 ? local.challengeWords : (ba.challengeWords ?? []),
    activities:     _mergeActMaps(local.activities, ba.activities),
    lastSyncedAt:   ba.lastSyncedAt,
  };
}

function _mergeActMaps(local, backend) {
  const r = { ...(local ?? {}) };
  if (backend) { for (const [k, v] of Object.entries(backend)) { if (!r[k] && v) r[k] = v; } }
  return r;
}

function _toSession(profileId, ba) {
  return {
    profileId,
    storyId:           ba.storyId,
    storyTitle:        ba.storyTitle,
    nextActivityIndex: ba.nextActivityIndex,
    activities:        ba.activities ?? {},
    totalRewards:      ba.totalRewards ?? { coins: 0, diamonds: 0, words: [] },
    challengeWords:    ba.challengeWords ?? [],
    startedAt:         ba.startedAt,
    completedAt:       ba.completedAt,
    lastSyncedAt:      ba.lastSyncedAt,
    lastModifiedAt:    ba.lastSyncedAt,
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
      if (s.coins    > (p.coins ?? 0))      { u.coins     = s.coins;     changed = true; }
      if (s.diamonds > (p.diamonds ?? 0))   { u.diamonds  = s.diamonds;  changed = true; }
      return u;
    });
    if (changed) await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) { console.warn("[SyncEngine] applyProfileSummaries failed:", err); }
}

async function _purgeConfirmedCompletedSessions(syncResponse, localSnap) {
  if (!syncResponse?.resolvedActivities) return;
  const toDelete = [];
  for (const { profileId, storyActivities } of syncResponse.resolvedActivities) {
    if (!storyActivities) continue;
    for (const ba of storyActivities) {
      if (ba.nextActivityIndex < 4) continue;
      const key = `${STORY_PREFIX}${profileId}_${ba.storyId}`;
      const snap = localSnap[key];
      if (snap && snap.nextActivityIndex > ba.nextActivityIndex) continue;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw && JSON.parse(raw).rewardsDisbursed) toDelete.push(key);
      } catch {}
    }
  }
  if (toDelete.length) {
    await AsyncStorage.multiRemove(toDelete);
    console.log("[SyncEngine] purged sessions:", toDelete.length);
  }
}

async function _pullActivities(getAuthToken, onSyncComplete) {
  try {
    const token = await getAuthToken?.();
    if (!token) return null;
    const localSnap  = await _captureLocalSnapshot();
    const response   = await apiClient.get("/sync/activities");
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

export const SyncEngine = { start, stop, syncNow, pullActivities: _pullActivities };
