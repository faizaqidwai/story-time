// _contexts/StoryActivityContext.jsx
//
// Manages the sequential activity flow for a single story session.
//
// Changes from original:
//  • Every session write now stamps `lastModifiedAt` — used by SyncEngine
//    to detect local writes that happen during a sync round-trip.
//  • SyncEngine is started/stopped here. Token is read directly from
//    SecureStore using the same key that authService writes on login.
//    No prop changes needed — _layout.jsx stays exactly as-is.
//  • `refreshFromStorage` — called by SyncEngine after a sync resolves
//    to reload the active in-memory session if it changed on another device.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken } from "../services/tokenStorage";
import { SyncEngine } from "../services/SyncEngine";

// ── Activity indices (single source of truth) ─────────────────────────────
export const ACTIVITY = {
  STORY_READING: 0,
  WORD_STORY_CHALLENGE: 1,
  WORD_LISTENING_CHALLENGE: 2,
  WORD_UNDERSTANDING_CHALLENGE: 3,
};

export const ACTIVITY_ROUTES = [
  null, // 0 — handled inside BookReader
  "WordGuessGame", // 1
  "Article", // 2
  "DescribeObjectGame", // 3
];

const STORAGE_KEY_PREFIX = "@story_activity_";

// ─────────────────────────────────────────────────────────────────────────────
const StoryActivityContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
function buildSession(story, profileId) {
  return {
    storyId: story.id,
    storyTitle: story.title,
    profileId,
    startedAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    nextActivityIndex: 0,
    // Snapshot challengeWords at session start so they're always available
    // at completion time without needing to look up the books list again.
    challengeWords: story.challengeWords || [],
    activities: {
      [ACTIVITY.STORY_READING]: null,
      [ACTIVITY.WORD_STORY_CHALLENGE]: null,
      [ACTIVITY.WORD_LISTENING_CHALLENGE]: null,
      [ACTIVITY.WORD_UNDERSTANDING_CHALLENGE]: null,
    },
    totalRewards: {
      coins: 0,
      diamonds: 0,
      words: [],
    },
    completedAt: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// No prop changes — _layout.jsx stays exactly as-is:
//   <StoryActivityProvider>  ← still works, no getAuthToken prop needed
// ─────────────────────────────────────────────────────────────────────────────
export const StoryActivityProvider = ({ children }) => {
  const [storySession, setStorySession] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);

  // Keep a ref to the active session's key so SyncEngine can refresh it
  const activeSessionKeyRef = useRef(null);

  // ── Persist to AsyncStorage (stamps lastModifiedAt) ─────────────────────
  const persistSession = useCallback(async (session) => {
    if (!session) return;
    try {
      const key = `${STORAGE_KEY_PREFIX}${session.profileId}_${session.storyId}`;
      const withTimestamp = {
        ...session,
        lastModifiedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(withTimestamp));
      activeSessionKeyRef.current = key;
    } catch (e) {
      console.warn("StoryActivityContext: failed to persist session", e);
    }
  }, []);

  // ── Load saved session ───────────────────────────────────────────────────
  const loadSession = useCallback(async (storyId, profileId) => {
    try {
      const key = `${STORAGE_KEY_PREFIX}${profileId}_${storyId}`;
      const raw = await AsyncStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }, []);

  // ── Remove a completed / abandoned session ───────────────────────────────
  const removeSession = useCallback(async (storyId, profileId) => {
    try {
      const key = `${STORAGE_KEY_PREFIX}${profileId}_${storyId}`;
      await AsyncStorage.removeItem(key);
    } catch (_) {}
  }, []);

  // ── SyncEngine wiring ────────────────────────────────────────────────────
  // Token is read from SecureStore on each sync cycle — this means the
  // engine automatically stops syncing after logout (token deleted) and
  // resumes after login (token written) without any restart needed.
  useEffect(() => {
    // getAuthToken reads the JWT from SecureStore each time it is called.
    // Returns null when the user is logged out — SyncEngine skips that cycle.
    const getAuthToken = () => getAccessToken();

    const handleSyncComplete = async (syncResponse) => {
      // Reload the active in-memory session if SyncEngine updated it
      // (e.g. progress arrived from another logged-in device)
      if (!activeSessionKeyRef.current) return;
      try {
        const raw = await AsyncStorage.getItem(activeSessionKeyRef.current);
        if (!raw) return;
        const refreshed = JSON.parse(raw);
        setStorySession((prev) => {
          if (!prev) return prev;
          // Only replace in-memory state if storage moved ahead
          if (refreshed.nextActivityIndex > prev.nextActivityIndex) {
            // challengeWords is never written by the SyncEngine — always
            // carry it forward from the current in-memory session so the
            // finish overlay never sees an empty words array.
            return {
              ...refreshed,
              challengeWords:
                prev.challengeWords || refreshed.challengeWords || [],
            };
          }
          return prev;
        });
      } catch (_) {}
    };

    SyncEngine.start(getAuthToken, handleSyncComplete);

    // ── Pull-on-login ──────────────────────────────────────────────────────
    // If the user just logged in on a fresh device, local AsyncStorage has no
    // activity records — the regular sync engine would skip every cycle.
    // We detect this by checking whether any @story_activity_ keys exist.
    // If none do but a token exists, we fire a one-time GET pull to restore
    // all backend activity state before the scheduler's first tick.
    (async () => {
      const token = await getAccessToken();
      if (!token) return; // not logged in — nothing to pull

      const allKeys = await AsyncStorage.getAllKeys();
      const hasLocalActivities = allKeys.some((k) =>
        k.startsWith(STORAGE_KEY_PREFIX),
      );

      if (!hasLocalActivities) {
        console.log(
          "[StoryActivityContext] new device detected — pulling activity state",
        );
        await SyncEngine.pullActivities(getAuthToken, handleSyncComplete);
      }
    })();

    return () => SyncEngine.stop();
  }, []); // runs once on mount — SyncEngine handles its own scheduling

  // ── startStorySession ────────────────────────────────────────────────────
  const startStorySession = useCallback(
    async (story, profileId) => {
      let session = await loadSession(story.id, profileId);

      if (!session || session.nextActivityIndex >= 4) {
        session = buildSession(story, profileId);
      } else {
        // Always refresh challengeWords from the live story object.
        // The stored session may be stale (saved before challengeWords was
        // added, or saved when the API hadn't returned words yet).
        // story.challengeWords is always the authoritative source.
        session = {
          ...session,
          challengeWords: story.challengeWords || [],
        };
      }

      if (story.activityData) {
        session = { ...session, activityDataSnapshot: story.activityData };
      }

      setStorySession(session);
      setCurrentStory(story);
      await persistSession(session);
      return session;
    },
    [loadSession, persistSession],
  );

  // ── completeActivity ─────────────────────────────────────────────────────
  const completeActivity = useCallback(
    async (activityIndex, result = {}, rewards = {}) => {
      setStorySession((prev) => {
        if (!prev) return prev;

        const next = {
          ...prev,
          activities: {
            ...prev.activities,
            [activityIndex]: {
              completedAt: new Date().toISOString(),
              result,
            },
          },
          totalRewards: {
            coins: (prev.totalRewards.coins || 0) + (rewards.coins || 0),
            diamonds:
              (prev.totalRewards.diamonds || 0) + (rewards.diamonds || 0),
            words: [
              ...(prev.totalRewards.words || []),
              ...(rewards.words || []),
            ],
          },
          nextActivityIndex: activityIndex + 1,
          completedAt:
            activityIndex === ACTIVITY.WORD_UNDERSTANDING_CHALLENGE
              ? new Date().toISOString()
              : null,
          lastModifiedAt: new Date().toISOString(), // ← stamp every write
        };

        persistSession(next);
        return next;
      });
    },
    [persistSession],
  );

  // ── clearStorySession ────────────────────────────────────────────────────
  // Clears the in-memory session and marks the AsyncStorage record as
  // "rewards disbursed" so the home screen doesn't re-trigger the overlay,
  // but does NOT delete it — SyncEngine needs it to remain in AsyncStorage
  // until the backend confirms receipt, after which SyncEngine deletes it.
  const clearStorySession = useCallback(async () => {
    if (!storySession) return;
    try {
      const key = `${STORAGE_KEY_PREFIX}${storySession.profileId}_${storySession.storyId}`;
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const existing = JSON.parse(raw);
        // Stamp rewardsDisbursed so home.jsx won't re-show the overlay on
        // next render, but keep the record alive for SyncEngine to pick up.
        await AsyncStorage.setItem(
          key,
          JSON.stringify({ ...existing, rewardsDisbursed: true }),
        );
      }
    } catch (_) {}
    activeSessionKeyRef.current = null;
    setStorySession(null);
  }, [storySession]);

  // ── resetSessionForProfileSwitch ─────────────────────────────────────────
  // Clears the in-memory session ONLY — does NOT delete from AsyncStorage.
  // Call this when switching profiles so the previous profile's session
  // doesn't bleed into the new profile's story cards.
  const resetSessionForProfileSwitch = useCallback(() => {
    activeSessionKeyRef.current = null;
    setStorySession(null);
    setCurrentStory(null);
  }, []);

  const value = {
    storySession,
    currentStory,
    startStorySession,
    completeActivity,
    clearStorySession,
    resetSessionForProfileSwitch,
    resumeActivityIndex: storySession?.nextActivityIndex ?? 0,
  };

  return (
    <StoryActivityContext.Provider value={value}>
      {children}
    </StoryActivityContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export const useStoryActivity = () => {
  const ctx = useContext(StoryActivityContext);
  if (!ctx) {
    throw new Error(
      "useStoryActivity must be used within StoryActivityProvider",
    );
  }
  return ctx;
};

export default StoryActivityContext;
