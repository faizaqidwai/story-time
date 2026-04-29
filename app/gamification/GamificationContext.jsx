/**
 * GamificationContext.jsx
 * app/gamification/GamificationContext.jsx
 *
 * React bridge between GamificationEngine (pure local logic) and the UI.
 *
 * Responsibilities:
 *   - Holds in-memory levelGames (what the UI renders) and coinShopConfig
 *   - Calls the engine for every mutation — never enforces rules itself
 *   - Fires background sync after every mutation (fire-and-forget)
 *   - Reads diamonds/coins from UserContext — never owns them
 *   - Updates diamonds/coins in UserContext after engine mutations
 *   - Exposes a clean API to UI components via useGamification()
 *
 * Zero loaders after level load:
 *   loadingGames is true ONLY during the one-time config seed for a new
 *   level. After that, all reads are from in-memory state — no AsyncStorage
 *   reads, no network calls, no spinners.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useRouter } from "expo-router";

import {
  buildLevelGames,
  clearPendingSync,
  ENGINE_ERROR,
  GAME_STATUS,
  loadLevelConfig,
  loadLevelState,
  onStoryCompleted,
  playGame,
  seedLevelConfig,
  unlockGame,
} from "./GamificationEngine";
import { getMockConfigForLevel } from "./constants/gameIds";

// ─── Toggle this to false once the real backend endpoint is ready ─────────────
const USE_MOCK_CONFIG = true;

// ─── Context ──────────────────────────────────────────────────────────────────
const GamificationContext = createContext(null);

// ═════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GamificationProvider
 *
 * Place this inside home.jsx wrapping the section that renders games.
 * It must be inside UserContext so it can read profile data.
 *
 * Props:
 *   profileId   — current profile's ID (pass from UserContext)
 *   diamonds    — current diamond balance (pass from UserContext)
 *   coins       — current coin balance (pass from UserContext)
 *   onUpdateDiamonds(n) — callback to update diamonds in UserContext
 *   onUpdateCoins(n)    — callback to update coins in UserContext
 *   children
 */
export function GamificationProvider({
  profileId,
  diamonds,
  coins,
  onUpdateDiamonds,
  onUpdateCoins,
  children,
}) {
  const router = useRouter();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [levelGames, setLevelGames]       = useState([]);
  const [coinShopConfig, setCoinShopConfig] = useState(null);
  const [loadingGames, setLoadingGames]   = useState(false);
  const [seedError, setSeedError]         = useState(false);

  // Modal state — managed here so any child can trigger them
  const [unlockModal, setUnlockModal]     = useState(null);  // { gameId } | null
  const [lockedModal, setLockedModal]     = useState(null);  // { gameId, storiesCompleted } | null
  const [coinPrompt, setCoinPrompt]       = useState(false);

  // Track which level is currently loaded so we can guard stale calls
  const loadedLevelRef = useRef(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * _refreshFromStorage(profileId, levelNumber)
   * Reads engine state from AsyncStorage and updates in-memory levelGames.
   * Called after every mutation to keep UI in sync.
   */
  const _refreshFromStorage = useCallback(async (pId, levelNumber) => {
    const [config, state] = await Promise.all([
      loadLevelConfig(levelNumber),
      loadLevelState(pId, levelNumber),
    ]);
    const games = buildLevelGames(config, state);
    setLevelGames(games);
    if (config?.coinShopConfig) setCoinShopConfig(config.coinShopConfig);
  }, []);

  /**
   * _fireBackgroundSync(profileId, levelNumber)
   * Posts pending state to backend. Fire-and-forget — never awaited by UI.
   * Imported lazily to avoid circular dependency during early dev.
   */
  const _fireBackgroundSync = useCallback((pId, levelNumber) => {
    // Dynamically import to keep sync engine out of the initial bundle parse
    import("./GamificationSyncEngine")
      .then(({ syncAfterMutation }) => syncAfterMutation(pId, levelNumber))
      .catch(() => {
        // Sync engine not yet implemented — safe to ignore during Step 3/4
      });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * loadGamesForLevel(levelNumber)
   *
   * Called by Home on mount and on every level switch.
   * If the config is already seeded → reads from AsyncStorage instantly.
   * If not seeded (first visit) → seeds from mock/backend, shows loadingGames.
   */
  const loadGamesForLevel = useCallback(async (levelNumber) => {
    if (!profileId) return;

    loadedLevelRef.current = levelNumber;
    setSeedError(false);

    // Fast path: config already seeded — no loader needed
    // NOTE: temporarily clearing stale cache so registry merge fix takes effect.
    // Remove these two lines once you have confirmed the cards show correctly.
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.removeItem(`@game_config_${levelNumber}`);
    // END TEMP

    const existingConfig = await loadLevelConfig(levelNumber);
    if (existingConfig) {
      await _refreshFromStorage(profileId, levelNumber);
      return;
    }

    // Slow path: first visit to this level — seed config
    setLoadingGames(true);
    setLevelGames([]);

    try {
      let apiResponse;

      if (USE_MOCK_CONFIG) {
        // ── Mock mode (Steps 3–9) ────────────────────────────────────────────
        apiResponse = getMockConfigForLevel(levelNumber);
        if (!apiResponse) {
          // Level not in mock data yet — show empty games section gracefully
          setLoadingGames(false);
          return;
        }
      } else {
        // ── Real backend (Step 10+) ──────────────────────────────────────────
        const { syncOnLevelLoad } = await import("./GamificationSyncEngine");
        apiResponse = await syncOnLevelLoad(profileId, levelNumber);
        if (!apiResponse) throw new Error("Backend seed failed");
      }

      await seedLevelConfig(profileId, levelNumber, apiResponse);
      await _refreshFromStorage(profileId, levelNumber);
    } catch {
      setSeedError(true);
    } finally {
      setLoadingGames(false);
    }
  }, [profileId, _refreshFromStorage]);

  /**
   * onStoryComplete(storyId, levelNumber)
   *
   * Called from handleFinishDone in home.jsx after every story completion.
   * Updates game reveal state locally, fires background sync.
   */
  const onStoryComplete = useCallback(async (storyId, levelNumber) => {
    if (!profileId) return;

    const result = await onStoryCompleted(profileId, levelNumber, storyId);
    if (!result.success) {
      console.warn("[Gamification] onStoryComplete failed:", result.error);
      return;
    }

    // Refresh in-memory state so GameCards re-render with updated scratch progress
    await _refreshFromStorage(profileId, levelNumber);

    // Background sync — does not block
    _fireBackgroundSync(profileId, levelNumber);
  }, [profileId, _refreshFromStorage, _fireBackgroundSync]);

  /**
   * openLockedModal(gameId, storiesCompleted)
   * Called by GameCard when user taps a LOCKED card.
   */
  const openLockedModal = useCallback((gameId, storiesCompleted) => {
    setLockedModal({ gameId, storiesCompleted });
  }, []);

  /**
   * openUnlockModal(gameId)
   * Called by GameCard when user taps the Unlock button.
   */
  const openUnlockModal = useCallback((gameId) => {
    setUnlockModal({ gameId });
  }, []);

  /**
   * confirmUnlock(gameId)
   *
   * Called by UnlockModal when user confirms.
   * Deducts 9 diamonds locally, flips slot to UNLOCKED, updates UserContext.
   */
  const confirmUnlock = useCallback(async (gameId) => {
    if (!profileId || loadedLevelRef.current === null) return;

    const levelNumber = loadedLevelRef.current;
    const result = await unlockGame(profileId, levelNumber, gameId, diamonds);

    if (!result.success) {
      if (result.error === ENGINE_ERROR.INSUFFICIENT_DIAMONDS) {
        // Should not normally happen — button is hidden when balance is too low
        console.warn("[Gamification] Unlock attempted with insufficient diamonds");
      }
      setUnlockModal(null);
      return;
    }

    // Update diamond balance in UserContext immediately
    onUpdateDiamonds(result.newDiamonds);

    // Refresh UI
    await _refreshFromStorage(profileId, levelNumber);
    setUnlockModal(null);

    _fireBackgroundSync(profileId, levelNumber);
  }, [profileId, diamonds, onUpdateDiamonds, _refreshFromStorage, _fireBackgroundSync]);

  /**
   * startPlay(gameId)
   *
   * Called by GameCard Play button.
   * Deducts 100 coins locally, retrieves gameData, navigates to game screen.
   * Shows CoinPromptModal if balance is insufficient.
   */
  const startPlay = useCallback(async (gameId) => {
    if (!profileId || loadedLevelRef.current === null) return;

    const levelNumber = loadedLevelRef.current;

    // Find the route for this game from in-memory levelGames
    const slot = levelGames.find((g) => g.gameId === gameId);
    if (!slot) return;

    const result = await playGame(profileId, levelNumber, gameId, coins);

    if (!result.success) {
      if (result.error === ENGINE_ERROR.INSUFFICIENT_COINS) {
        setCoinPrompt(true);
      } else {
        console.warn("[Gamification] startPlay failed:", result.error);
      }
      return;
    }

    // Update coin balance in UserContext immediately
    onUpdateCoins(result.newCoins);

    _fireBackgroundSync(profileId, levelNumber);

    // Navigate to the game screen.
    // gameData will be wired as a param in Step 10 when backend is ready.
    // For now navigate directly so existing game screens open without crash.
    router.push(slot.route);
  }, [profileId, coins, levelGames, onUpdateCoins, router, _fireBackgroundSync]);

  // ── Derived values for UI ───────────────────────────────────────────────────
  const canAffordPlay   = coins >= 100;
  const canAffordUnlock = diamonds >= 9;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  const value = {
    // State
    levelGames,
    loadingGames,
    seedError,
    coinShopConfig,
    canAffordPlay,
    canAffordUnlock,

    // Modal state
    unlockModal,
    setUnlockModal,
    lockedModal,
    setLockedModal,
    coinPrompt,
    setCoinPrompt,

    // Actions
    loadGamesForLevel,
    onStoryComplete,
    openLockedModal,
    openUnlockModal,
    confirmUnlock,
    startPlay,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HOOK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * useGamification()
 *
 * Use this hook in any component inside GamificationProvider.
 * Throws a clear error if used outside the provider.
 */
export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error("useGamification must be used inside GamificationProvider");
  }
  return ctx;
}
