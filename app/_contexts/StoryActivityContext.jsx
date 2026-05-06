// _contexts/StoryActivityContext.jsx
//
// Manages the sequential activity flow for a single story session.
//
// Changes from previous version:
//  • SyncEngine.start() no longer fires an initial 10s sync — login and
//    home screen handle their own intentional syncs.
//  • AppState listener removed from SyncEngine (done in SyncEngine.js).
//  • `syncNow` exposed via context so home.jsx can call it after
//    activity completion and on first home screen visit.
//  • `hasInitialSyncedRef` exposed via context so home.jsx can fire a
//    one-time pull on first visit without re-triggering on re-renders.
//  • `bookmarkPage(pageIndex)` — NEW. Saves/clears a bookmarked page in the
//    active session. Backward compatible: old sessions without bookmarkedPage
//    field default to null (no bookmark, open from page 0).
//  • Everything else (session logic, persistSession, completeActivity,
//    clearStorySession, resetSessionForProfileSwitch) is UNTOUCHED.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
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
function buildSession(story, profileId, isReadOnly) {
  return {
    storyId: story.id,
    storyTitle: story.title,
    storyCover: story.cover,
    profileId,
    startedAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    nextActivityIndex: 0,
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
    isReadOnly: isReadOnly,
    // bookmarkedPage: null  ← intentionally omitted from build so old
    //   sessions without this field are naturally backward compatible.
    //   Consumers should use: session.bookmarkedPage ?? null
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export const StoryActivityProvider = ({ children }) => {
  const [storySession, setStorySession] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);

  // Keep a ref to the active session's key so SyncEngine can refresh it
  const activeSessionKeyRef = useRef(null);

  // Tracks whether the first-visit pull has already been fired this session.
  // home.jsx reads this ref to fire a one-time sync on first home screen visit.
  const hasInitialSyncedRef = useRef(false);

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
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed;
      }
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

  // ── Auth token getter (reused across sync calls) ─────────────────────────
  const getAuthToken = useCallback(() => getAccessToken(), []);

  // ── handleSyncComplete — reload active session if SyncEngine updated it ──
  const handleSyncComplete = useCallback(async (syncResponse) => {
    if (!activeSessionKeyRef.current) return;
    try {
      const raw = await AsyncStorage.getItem(activeSessionKeyRef.current);
      if (!raw) return;
      const refreshed = JSON.parse(raw);
      setStorySession((prev) => {
        if (!prev) return prev;
        if (refreshed.nextActivityIndex > prev.nextActivityIndex) {
          return {
            ...refreshed,
            challengeWords:
              prev.challengeWords || refreshed.challengeWords || [],
          };
        }
        return prev;
      });
    } catch (_) {}
  }, []);

  // ── SyncEngine wiring ────────────────────────────────────────────────────
  useEffect(() => {
    SyncEngine.start(getAuthToken, handleSyncComplete);

    (async () => {
      const token = await getAccessToken();
      if (!token) return;

      const allKeys = await AsyncStorage.getAllKeys();
      const hasLocalActivities = allKeys.some((k) =>
        k.startsWith(STORAGE_KEY_PREFIX),
      );

      if (!hasLocalActivities) {
        console.log(
          "[StoryActivityContext] new device detected — pulling activity state",
        );
        await SyncEngine.pullActivities(getAuthToken, handleSyncComplete);
        hasInitialSyncedRef.current = true;
      }
    })();

    return () => SyncEngine.stop();
  }, []);

  // ── syncNow ──────────────────────────────────────────────────────────────
  const syncNow = useCallback(() => {
    return SyncEngine.syncNow(getAuthToken, handleSyncComplete);
  }, [getAuthToken, handleSyncComplete]);

  // ── startStorySession ────────────────────────────────────────────────────
  const startStorySession = useCallback(
    async (story, profileId, isReadOnly) => {
      let session = await loadSession(story.id, profileId);

      if (!session || session.nextActivityIndex >= 4) {
        // Read bookmarkedPage from AsyncStorage record first, then fall back
        // to nothing. The clearStorySession fix above ensures this is written.
        const previousBookmark = session?.bookmarkedPage ?? null;
        session = buildSession(story, profileId, isReadOnly);
        if (previousBookmark !== null && previousBookmark !== undefined) {
          session = { ...session, bookmarkedPage: previousBookmark };
        }
      } else {
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
      if (!isReadOnly) {
        await persistSession(session);
      }
      return session;
    },
    [loadSession, persistSession],
  );

  // ── completeActivity — UNTOUCHED ─────────────────────────────────────────
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
          lastModifiedAt: new Date().toISOString(),
        };

        persistSession(next);
        return next;
      });
    },
    [persistSession],
  );

  // ── bookmarkPage — NEW ───────────────────────────────────────────────────
  // Saves the current page index as a bookmark in the active session.
  // Calling with the same index that is already bookmarked clears the bookmark.
  // Calling with null explicitly clears any existing bookmark.
  // Backward compatible: old sessions without bookmarkedPage default to null.
  // isReadOnly sessions are intentionally still bookmarkable (read-only only
  // restricts activity completion, not navigation preferences).
  const bookmarkPage = useCallback(
    (pageIndex) => {
      setStorySession((prev) => {
        if (!prev) return prev;
        const currentBookmark = prev.bookmarkedPage ?? null;
        const nextBookmark = currentBookmark === pageIndex ? null : pageIndex;
        const next = { ...prev, bookmarkedPage: nextBookmark };
        // Write to AsyncStorage directly AND via persistSession.
        // Direct write ensures bookmarkedPage is in AsyncStorage immediately,
        // even if a concurrent completeActivity persistSession call runs first.
        const key = `${STORAGE_KEY_PREFIX}${prev.profileId}_${prev.storyId}`;
        AsyncStorage.getItem(key).then((raw) => {
          const existing = raw ? JSON.parse(raw) : next;
          return AsyncStorage.setItem(key, JSON.stringify({
            ...existing,
            bookmarkedPage: nextBookmark,
            lastModifiedAt: new Date().toISOString(),
          }));
        }).catch(() => {
          // Fallback to full session persist
          persistSession(next);
        });
        return next;
      });
    },
    [persistSession],
  );

  // ── clearStorySession — UNTOUCHED ────────────────────────────────────────
  const clearStorySession = useCallback(async () => {
    if (!storySession) return;
    try {
      const key = `${STORAGE_KEY_PREFIX}${storySession.profileId}_${storySession.storyId}`;
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const existing = JSON.parse(raw);
        // Explicitly carry bookmarkedPage from React state (source of truth)
        // because AsyncStorage may have been written by an earlier persistSession
        // call that ran before the bookmark setStorySession updater completed.
        const bookmarkedPage = storySession.bookmarkedPage ?? existing.bookmarkedPage ?? undefined;
        const toWrite = { ...existing, rewardsDisbursed: true };
        if (bookmarkedPage !== undefined) toWrite.bookmarkedPage = bookmarkedPage;
        await AsyncStorage.setItem(key, JSON.stringify(toWrite));
      }
    } catch (_) {}
    activeSessionKeyRef.current = null;
    setStorySession(null);
  }, [storySession]);

  // ── resetSessionForProfileSwitch — UNTOUCHED ────────────────────────────
  const resetSessionForProfileSwitch = useCallback(() => {
    activeSessionKeyRef.current = null;
    setStorySession(null);
    setCurrentStory(null);
  }, []);

  const value = useMemo(
    () => ({
      storySession,
      currentStory,
      startStorySession,
      completeActivity,
      clearStorySession,
      resetSessionForProfileSwitch,
      resumeActivityIndex: storySession?.nextActivityIndex ?? 0,
      syncNow,
      hasInitialSyncedRef,
      bookmarkPage, // ← NEW
    }),
    [
      storySession,
      currentStory,
      startStorySession,
      completeActivity,
      clearStorySession,
      resetSessionForProfileSwitch,
      syncNow,
      bookmarkPage,
    ],
  );

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
