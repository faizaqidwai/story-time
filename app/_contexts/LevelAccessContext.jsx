// app/_contexts/LevelAccessContext.jsx
//
// ─── Level Access Layer ────────────────────────────────────────────────────────
//
// Sits on top of the existing system without touching:
//   ✅ SyncEngine
//   ✅ StoryActivityContext
//   ✅ LevelProgressionService
//   ✅ Login / Register
//
// Responsibilities:
//   1. Fetch GET /user/levels once per profile load → build levelMap
//   2. Expose `loadedLevel` (the level currently DISPLAYED on home screen)
//   3. Expose `loadedLevelContext` — { levelNumber, mode, accessScope }
//   4. Provide `switchLevel(n)` to move between levels
//   5. Provide access guards: canPlay(), canRead()
//   6. Cache levelMap in AsyncStorage for offline use
//
// Access modes (single source of truth):
//   PLAY       — full access: read + all activities + progress + sync
//   READ_ONLY  — read stories only, no activities
//   VIEW_ONLY  — cannot open stories at all
//
// Access scope:
//   FULL       — all stories in the level are accessible
//   PARTIAL    — only the first story is accessible (free tier preview)
//   NONE       — no stories accessible

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../services/apiClient";

// ── Storage ───────────────────────────────────────────────────────────────────
const LEVEL_MAP_KEY = (profileId) => `@level_map_${profileId}`;

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_CONTEXT = {
  levelNumber: 1,
  mode: "PLAY",
  accessScope: "FULL",
};

const LevelAccessContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
export const LevelAccessProvider = ({ children }) => {
  // The level number shown on the home screen (may differ from profile.playLevel)
  const [loadedLevel, setLoadedLevel] = useState(1);

  // Access rules for the currently LOADED level
  const [loadedLevelContext, setLoadedLevelContext] = useState(DEFAULT_CONTEXT);

  // Full map: levelNumber → { mode, accessScope }  (keyed by level number)
  const [levelMap, setLevelMap] = useState({});

  // True while the /user/levels API is being fetched
  const [levelMapLoading, setLevelMapLoading] = useState(false);

  // The profile whose levelMap is currently loaded (to avoid stale cross-profile data)
  const currentProfileIdRef = useRef(null);

  // ── Build context object for any given level number ─────────────────────
  const buildContext = useCallback(
    (levelNumber, map) => {
      const entry = map[levelNumber];
      if (entry) {
        return { levelNumber, mode: entry.mode, accessScope: entry.accessScope };
      }
      // Level not in map → view only (locked)
      return { levelNumber, mode: "VIEW_ONLY", accessScope: "NONE" };
    },
    [],
  );

  // ── Fetch level map from backend ─────────────────────────────────────────
  const fetchLevelMap = useCallback(async (profileId, currentPlayLevel) => {
    try {
      setLevelMapLoading(true);
      const response = await apiClient.get(`/user/levels?profileId=${profileId}`);

      // response shape: { currentLevel, subscription, levels: [{level, mode, accessScope}] }
      const map = {};
      (response.levels || []).forEach((entry) => {
        map[entry.level] = { mode: entry.mode, accessScope: entry.accessScope };
      });

      setLevelMap(map);

      // Persist for offline use
      await AsyncStorage.setItem(
        LEVEL_MAP_KEY(profileId),
        JSON.stringify(map),
      );

      return map;
    } catch (err) {
      console.warn("[LevelAccessContext] fetchLevelMap failed:", err?.message);
      // Try loading from cache
      try {
        const raw = await AsyncStorage.getItem(LEVEL_MAP_KEY(profileId));
        if (raw) {
          const cached = JSON.parse(raw);
          setLevelMap(cached);
          return cached;
        }
      } catch (_) {}

      // Final fallback: treat current level as PLAY/FULL, everything else VIEW_ONLY
      const fallback = {
        [currentPlayLevel]: { mode: "PLAY", accessScope: "FULL" },
      };
      setLevelMap(fallback);
      return fallback;
    } finally {
      setLevelMapLoading(false);
    }
  }, []);

  // ── Initialise / reinitialise for a profile ──────────────────────────────
  // Call this whenever currentProfile changes (from UserContext)
  const initForProfile = useCallback(
    async (profile) => {
      if (!profile) return;

      const profileId = profile.id;
      const playLevel = profile.playLevel ?? 1;

      currentProfileIdRef.current = profileId;

      // Always start loaded level at the profile's actual current level
      setLoadedLevel(playLevel);

      // Attempt to load cached map immediately so UI is not blocked
      try {
        const raw = await AsyncStorage.getItem(LEVEL_MAP_KEY(profileId));
        if (raw) {
          const cached = JSON.parse(raw);
          setLevelMap(cached);
          setLoadedLevelContext(buildContext(playLevel, cached));
        } else {
          // No cache yet — set a sensible default so home screen can render
          const fallback = {
            [playLevel]: { mode: "PLAY", accessScope: "FULL" },
          };
          setLevelMap(fallback);
          setLoadedLevelContext(buildContext(playLevel, fallback));
        }
      } catch (_) {}

      // Then fetch fresh data from backend
      const freshMap = await fetchLevelMap(profileId, playLevel);

      // Guard: profile may have changed while we were waiting
      if (currentProfileIdRef.current !== profileId) return;

      setLoadedLevelContext(buildContext(playLevel, freshMap));
    },
    [buildContext, fetchLevelMap],
  );

  // ── Switch to a different level ──────────────────────────────────────────
  // Only switches if the level exists in the map (not VIEW_ONLY levels
  // are still switchable — the UI simply shows a locked state)
  const switchLevel = useCallback(
    (levelNumber) => {
      setLoadedLevel(levelNumber);
      setLoadedLevelContext(buildContext(levelNumber, levelMap));
    },
    [levelMap, buildContext],
  );

  // ── After level progression completes, refresh the map ──────────────────
  const refreshAfterProgression = useCallback(
    async (profileId, newPlayLevel) => {
      const freshMap = await fetchLevelMap(profileId, newPlayLevel);
      setLoadedLevel(newPlayLevel);
      setLoadedLevelContext(buildContext(newPlayLevel, freshMap));
    },
    [fetchLevelMap, buildContext],
  );

  // ── Access guard helpers ─────────────────────────────────────────────────
  const canPlay = useCallback(
    (ctx = loadedLevelContext) => ctx.mode === "PLAY",
    [loadedLevelContext],
  );

  const canRead = useCallback(
    (ctx = loadedLevelContext) =>
      ctx.mode === "PLAY" || ctx.mode === "READ_ONLY",
    [loadedLevelContext],
  );

  const canView = useCallback(
    (ctx = loadedLevelContext) => ctx.mode !== "VIEW_ONLY",
    [loadedLevelContext],
  );

  // Is a specific story accessible?  PARTIAL scope → only first story (index 0)
  const isStoryAccessible = useCallback(
    (storyIndex, ctx = loadedLevelContext) => {
      if (ctx.mode === "VIEW_ONLY") return false;
      if (ctx.accessScope === "PARTIAL") return storyIndex === 0;
      return true; // FULL
    },
    [loadedLevelContext],
  );

  const value = {
    // State
    loadedLevel,
    loadedLevelContext,
    levelMap,
    levelMapLoading,

    // Actions
    initForProfile,
    switchLevel,
    refreshAfterProgression,

    // Guards
    canPlay,
    canRead,
    canView,
    isStoryAccessible,
  };

  return (
    <LevelAccessContext.Provider value={value}>
      {children}
    </LevelAccessContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export const useLevelAccess = () => {
  const ctx = useContext(LevelAccessContext);
  if (!ctx) {
    throw new Error(
      "useLevelAccess must be used within LevelAccessProvider",
    );
  }
  return ctx;
};

export default LevelAccessContext;
