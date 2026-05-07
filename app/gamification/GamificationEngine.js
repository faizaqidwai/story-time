/**
 * GamificationEngine.js
 * app/gamification/GamificationEngine.js
 *
 * Pure local mutation layer for the gamification module.
 * ─────────────────────────────────────────────────────
 * Rules:
 *   - NO React imports. No hooks. No context.
 *   - NO network calls. Ever.
 *   - All reads and writes go through AsyncStorage.
 *   - All rule enforcement lives here — no rule logic anywhere else.
 *   - Every function is independently testable.
 *
 * AsyncStorage keys managed here:
 *   @game_config_{levelNumber}            — seeded from backend, read-only after seed
 *   @game_state_{profileId}_{levelNumber} — mutable per-profile state
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { GAME_REGISTRY } from "./constants/gameIds";

// ─── Key builders ─────────────────────────────────────────────────────────────
const CONFIG_KEY = (profileId, levelNumber) =>
  `@game_config_${profileId}_${levelNumber}`;
const STATE_KEY = (profileId, levelNumber) =>
  `@game_state_${profileId}_${levelNumber}`;
const COMPLETED_KEY = (profileId, levelNumber) =>
  `@game_completed_stories_${profileId}_${levelNumber}`;

// ─── Game status constants ────────────────────────────────────────────────────
export const GAME_STATUS = {
  LOCKED: "LOCKED",
  REVEALED: "REVEALED",
  UNLOCKED: "UNLOCKED",
};

// ─── Error codes returned by mutations ───────────────────────────────────────
export const ENGINE_ERROR = {
  INSUFFICIENT_DIAMONDS: "INSUFFICIENT_DIAMONDS",
  INSUFFICIENT_COINS: "INSUFFICIENT_COINS",
  WRONG_STATUS: "WRONG_STATUS",
  CONFIG_NOT_FOUND: "CONFIG_NOT_FOUND",
  STATE_NOT_FOUND: "STATE_NOT_FOUND",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const STORIES_REQUIRED_TO_REVEAL = 3;
const DIAMONDS_TO_UNLOCK = 9;
const COINS_TO_PLAY = 100;

// ═════════════════════════════════════════════════════════════════════════════
// READ FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * loadLevelConfig(levelNumber)
 *
 * Reads the seeded game config for a level from AsyncStorage.
 * Returns null if the level has never been seeded (first visit, backend needed).
 */
export async function loadLevelConfig(profileId, levelNumber) {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY(profileId, levelNumber));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[GamificationEngine] loadLevelConfig failed:", err?.message);
    return null;
  }
}

/**
 * loadLevelState(profileId, levelNumber)
 *
 * Reads the mutable game state for a profile+level from AsyncStorage.
 * Returns null if no state exists yet (will be created on first seedLevelConfig).
 */
export async function loadLevelState(profileId, levelNumber) {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY(profileId, levelNumber));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[GamificationEngine] loadLevelState failed:", err?.message);
    return null;
  }
}

/**
 * buildLevelGames(config, state)
 *
 * Merges a LevelConfig and a GameState into the GameSlot[] array that the
 * UI consumes. Called by GamificationContext after any read or mutation.
 *
 * Returns an array of enriched game slots ready for rendering:
 * [
 *   {
 *     gameId, name, route, gradient, accentColor, icon,  // from config
 *     storyGroupIndex, storyIds, gameData,                // from config
 *     status, storiesCompletedInGroup,                    // from state
 *   }
 * ]
 */
export function buildLevelGames(config, state) {
  if (!config) return [];

  return config.games.map((configSlot) => {
    const stateSlot = state?.games?.find((g) => g.gameId === configSlot.gameId);
    // Merge GAME_REGISTRY so name/route/icon/gradient are always present
    // even if the config came from a backend that omits display fields.
    const registrySlot = GAME_REGISTRY[configSlot.gameId] ?? {};
    return {
      ...registrySlot, // name, route, icon, gradient, accentColor from registry
      ...configSlot, // gameId, storyGroupIndex, gameData from config (wins)
      status: stateSlot?.status ?? GAME_STATUS.LOCKED,
      storiesCompletedInGroup: stateSlot?.storiesCompletedInGroup ?? 0,
    };
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * seedLevelConfig(levelNumber, apiResponse)
 *
 * Writes the backend API response into AsyncStorage as the level config.
 * Also creates the initial game state (all LOCKED) if none exists yet for
 * this profileId + levelNumber.
 *
 * Called by GamificationSyncEngine after a successful GET /level/{n}.
 * Safe to call multiple times — existing state is never overwritten.
 */
export async function seedLevelConfig(profileId, levelNumber, apiResponse) {
  try {
    // 1. Write config (always overwrite — backend is canonical for config)
    await AsyncStorage.setItem(
      CONFIG_KEY(profileId, levelNumber),
      JSON.stringify({ ...apiResponse, seededAt: new Date().toISOString() }),
    );

    // 2. Create initial state only if none exists
    const existingState = await AsyncStorage.getItem(
      STATE_KEY(profileId, levelNumber),
    );
    if (!existingState) {
      const initialState = _buildInitialState(
        profileId,
        levelNumber,
        apiResponse.games,
      );
      await AsyncStorage.setItem(
        STATE_KEY(profileId, levelNumber),
        JSON.stringify(initialState),
      );
    }

    return true;
  } catch (err) {
    console.warn("[GamificationEngine] seedLevelConfig failed:", err?.message);
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * onStoryCompleted(profileId, levelNumber, storyId)
 *
 * Called after every story completion in a level.
 *
 * Reveal logic — count-based, not story-ID-based:
 *   Any 3 unique story completions in the level  → reveal game slot 1
 *   Any 3 more unique story completions (6 total) → reveal game slot 2
 *
 * Each storyId is tracked to prevent the same story being counted twice.
 *
 * Returns:
 *   { success: true, updatedState, revealed: bool, revealedGameId: string|null }
 *   { success: false, error: ENGINE_ERROR.* }
 */
export async function onStoryCompleted(profileId, levelNumber, storyId) {
  try {
    const [config, state] = await Promise.all([
      _readConfig(profileId, levelNumber),
      _readState(profileId, levelNumber),
    ]);
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - called for profileId=${profileId} levelNumber=${levelNumber} storyId=${storyId}`,
    );
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - current state =`,
      state,
    );

    if (!config)
      return { success: false, error: ENGINE_ERROR.CONFIG_NOT_FOUND };
    if (!state) return { success: false, error: ENGINE_ERROR.STATE_NOT_FOUND };

    // Read the set of unique story IDs already counted for this level
    const completedStoriesRaw = await AsyncStorage.getItem(
      COMPLETED_KEY(profileId, levelNumber),
    );
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - completed stories raw =`,
      completedStoriesRaw,
    );

    const completedStoryIds = completedStoriesRaw
      ? JSON.parse(completedStoriesRaw)
      : [];
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - completed story IDs =`,
      completedStoryIds,
    );

    // Guard: story already counted — nothing to do
    if (completedStoryIds.includes(storyId)) {
      return {
        success: true,
        updatedState: state,
        revealed: false,
        revealedGameId: null,
      };
    }

    // Add this story to the completed set and persist it
    const updatedCompletedIds = [...completedStoryIds, storyId];
    await AsyncStorage.setItem(
      COMPLETED_KEY(profileId, levelNumber),
      JSON.stringify(updatedCompletedIds),
    );
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - updated completed story IDs =`,
      updatedCompletedIds,
    );

    const totalCompleted = updatedCompletedIds.length;
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - total unique stories completed for this level =`,
      totalCompleted,
    );

    // Derive which slots should now be revealed purely from total count.
    // Slot 0 (storyGroupIndex 1): revealed when totalCompleted >= 3
    // Slot 1 (storyGroupIndex 2): revealed when totalCompleted >= 6
    console.log(`[GamificationEngine] ENG - onStoryCompleted - Updating games`);

    // Sort games by storyGroupIndex from config to ensure correct threshold calculation.
    // State games order may differ from config order (e.g. after server restore),
    // which would cause wrong threshold assignment if we use array index.
    const configGameOrder = config.games
      .slice()
      .sort((a, b) => a.storyGroupIndex - b.storyGroupIndex)
      .map((g) => g.gameId);

    const updatedGames = state.games.map((slot) => {
      const slotIndex = configGameOrder.indexOf(slot.gameId);
      const index = slotIndex === -1 ? 0 : slotIndex;
      const threshold = (index + 1) * STORIES_REQUIRED_TO_REVEAL;
      const countForSlot = Math.min(
        Math.max(totalCompleted - index * STORIES_REQUIRED_TO_REVEAL, 0),
        STORIES_REQUIRED_TO_REVEAL,
      );

      // Never go backwards — if already revealed/unlocked keep it
      if (slot.status !== GAME_STATUS.LOCKED) {
        return { ...slot, storiesCompletedInGroup: STORIES_REQUIRED_TO_REVEAL };
      }

      return {
        ...slot,
        storiesCompletedInGroup: countForSlot,
        status:
          totalCompleted >= threshold
            ? GAME_STATUS.REVEALED
            : GAME_STATUS.LOCKED,
      };
    });

    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - updated game slots =`,
      updatedGames,
    );

    // Detect which slot just flipped to REVEALED this call
    const newlyRevealedSlot = updatedGames.find(
      (updated, i) =>
        updated.status === GAME_STATUS.REVEALED &&
        state.games[i].status === GAME_STATUS.LOCKED,
    );
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - newly revealed slot =`,
      newlyRevealedSlot,
    );

    const updatedState = _stampState(state, updatedGames);
    await _writeState(profileId, levelNumber, updatedState);
    console.log(
      `[GamificationEngine] ENG - onStoryCompleted - updated state written =`,
      updatedState,
    );

    return {
      success: true,
      updatedState,
      revealed: !!newlyRevealedSlot,
      revealedGameId: newlyRevealedSlot?.gameId ?? null,
    };
  } catch (err) {
    console.warn("[GamificationEngine] onStoryCompleted failed:", err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * unlockGame(profileId, levelNumber, gameId, currentDiamonds)
 *
 * Validates status === REVEALED and diamonds >= 9.
 * Deducts 9 diamonds and flips REVEALED → UNLOCKED.
 *
 * Returns:
 *   { success: true, updatedState, newDiamonds }      — on success
 *   { success: false, error: ENGINE_ERROR.* }          — on failure
 */
export async function unlockGame(
  profileId,
  levelNumber,
  gameId,
  currentDiamonds,
) {
  try {
    const state = await _readState(profileId, levelNumber);
    if (!state) return { success: false, error: ENGINE_ERROR.STATE_NOT_FOUND };

    const slotIndex = state.games.findIndex((g) => g.gameId === gameId);
    if (slotIndex === -1)
      return { success: false, error: ENGINE_ERROR.STATE_NOT_FOUND };

    const slot = state.games[slotIndex];

    // Rule: must be REVEALED
    if (slot.status !== GAME_STATUS.REVEALED) {
      return { success: false, error: ENGINE_ERROR.WRONG_STATUS };
    }

    // Rule: must have enough diamonds
    if (currentDiamonds < DIAMONDS_TO_UNLOCK) {
      return { success: false, error: ENGINE_ERROR.INSUFFICIENT_DIAMONDS };
    }

    const newDiamonds = currentDiamonds - DIAMONDS_TO_UNLOCK;

    const updatedGames = [...state.games];
    updatedGames[slotIndex] = {
      ...slot,
      status: GAME_STATUS.UNLOCKED,
    };

    const updatedState = _stampState(state, updatedGames, {
      events: [
        ...(state.events ?? []),
        {
          type: "UNLOCK",
          gameId,
          diamondsDeducted: DIAMONDS_TO_UNLOCK,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await _writeState(profileId, levelNumber, updatedState);

    return { success: true, updatedState, newDiamonds };
  } catch (err) {
    console.warn("[GamificationEngine] unlockGame failed:", err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * playGame(profileId, levelNumber, gameId, currentCoins)
 *
 * Validates status === UNLOCKED and coins >= 100.
 * Deducts 100 coins and returns the gameData for the game screen.
 *
 * Returns:
 *   { success: true, gameData, newCoins }              — on success
 *   { success: false, error: ENGINE_ERROR.* }           — on failure
 */
export async function playGame(profileId, levelNumber, gameId, currentCoins) {
  try {
    const [config, state] = await Promise.all([
      _readConfig(profileId, levelNumber),
      _readState(profileId, levelNumber),
    ]);

    if (!config)
      return { success: false, error: ENGINE_ERROR.CONFIG_NOT_FOUND };
    if (!state) return { success: false, error: ENGINE_ERROR.STATE_NOT_FOUND };

    const stateSlot = state.games.find((g) => g.gameId === gameId);
    const configSlot = config.games.find((g) => g.gameId === gameId);

    if (!stateSlot || !configSlot) {
      return { success: false, error: ENGINE_ERROR.STATE_NOT_FOUND };
    }

    // Rule: must be UNLOCKED
    if (stateSlot.status !== GAME_STATUS.UNLOCKED) {
      return { success: false, error: ENGINE_ERROR.WRONG_STATUS };
    }

    // Rule: must have enough coins
    if (currentCoins < COINS_TO_PLAY) {
      return { success: false, error: ENGINE_ERROR.INSUFFICIENT_COINS };
    }

    const newCoins = currentCoins - COINS_TO_PLAY;

    // Record the play event in state for sync
    const updatedState = _stampState(state, state.games, {
      events: [
        ...(state.events ?? []),
        {
          type: "PLAY",
          gameId,
          coinsDeducted: COINS_TO_PLAY,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await _writeState(profileId, levelNumber, updatedState);

    // Return the gameData — the game screen owns parsing
    return { success: true, gameData: configSlot.gameData, newCoins };
  } catch (err) {
    console.warn("[GamificationEngine] playGame failed:", err?.message);
    return { success: false, error: err?.message };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SYNC SUPPORT FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * getPendingSyncPayload(profileId, levelNumber)
 *
 * Reads the current state and formats it as a sync payload.
 * Used by GamificationSyncEngine to know what to POST to the backend.
 * Returns null if nothing is pending or state doesn't exist.
 */
export async function getPendingSyncPayload(profileId, levelNumber) {
  try {
    const state = await _readState(profileId, levelNumber);
    if (!state || !state.pendingSync) return null;

    // Read completed story IDs from their separate key
    const completedStoriesRaw = await AsyncStorage.getItem(
      COMPLETED_KEY(profileId, levelNumber),
    );
    const completedStoryIds = completedStoriesRaw
      ? JSON.parse(completedStoriesRaw)
      : [];
    console.log(
      `[GamificationEngine] completedStoryIds for profileId=${profileId} level=${levelNumber}:`,
      completedStoryIds,
    );

    return {
      profileId,
      levelNumber,
      games: state.games.map((g) => ({
        gameId: g.gameId,
        status: g.status,
        storiesCompletedInGroup: g.storiesCompletedInGroup,
        completedStoryIds, // same list applies to all slots for this level
      })),
      events: state.events ?? [],
    };
  } catch (err) {
    console.warn(
      "[GamificationEngine] getPendingSyncPayload failed:",
      err?.message,
    );
    return null;
  }
}

/**
 * clearPendingSync(profileId, levelNumber)
 *
 * Marks the state as synced. Called by GamificationSyncEngine after the
 * backend confirms receipt. Clears the events array too — they've been sent.
 */
export async function clearPendingSync(profileId, levelNumber) {
  try {
    const state = await _readState(profileId, levelNumber);
    if (!state) return;

    const clearedState = {
      ...state,
      pendingSync: false,
      events: [],
      lastSyncedAt: new Date().toISOString(),
    };

    await _writeState(profileId, levelNumber, clearedState);
  } catch (err) {
    console.warn("[GamificationEngine] clearPendingSync failed:", err?.message);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═════════════════════════════════════════════════════════════════════════════

async function _readConfig(profileId, levelNumber) {
  const raw = await AsyncStorage.getItem(CONFIG_KEY(profileId, levelNumber));
  return raw ? JSON.parse(raw) : null;
}

async function _readState(profileId, levelNumber) {
  console.log(
    `[GamificationEngine] _readState for profileId=${profileId} levelNumber=${levelNumber}`,
  );
  const raw = await AsyncStorage.getItem(STATE_KEY(profileId, levelNumber));
  return raw ? JSON.parse(raw) : null;
}

async function _writeState(profileId, levelNumber, state) {
  await AsyncStorage.setItem(
    STATE_KEY(profileId, levelNumber),
    JSON.stringify(state),
  );
}

/**
 * _stampState(existingState, updatedGames, extraFields)
 *
 * Returns a new state object with:
 *   - updatedGames replacing the games array
 *   - pendingSync set to true
 *   - lastModifiedAt updated
 *   - any extraFields merged in (used for events array)
 */
function _stampState(existingState, updatedGames, extraFields = {}) {
  return {
    ...existingState,
    ...extraFields,
    games: updatedGames,
    pendingSync: true,
    lastModifiedAt: new Date().toISOString(),
  };
}

/**
 * _buildInitialState(profileId, levelNumber, configGames)
 *
 * Creates the starting state for a level — all games LOCKED, 0 stories completed.
 */
function _buildInitialState(profileId, levelNumber, configGames) {
  return {
    profileId,
    levelNumber,
    games: configGames.map((g) => ({
      gameId: g.gameId,
      status: GAME_STATUS.LOCKED,
      storiesCompletedInGroup: 0,
    })),
    events: [],
    pendingSync: false,
    lastModifiedAt: new Date().toISOString(),
    lastSyncedAt: null,
  };
}
