/**
 * src/gamification/constants/gameIds.js
 *
 * Stable string IDs for every game.
 * These are the contract between frontend and backend.
 * The backend game_definitions collection uses these exact strings as gameId.
 *
 * Rules:
 *   - Never rename a gameId once it is in production (breaks saved states)
 *   - Always snake_case
 *   - Add new games here first, then create the screen + backend config
 */

export const GAME_IDS = {
  FLAPPY_WORD:       "flappy_word",
  DODGE_CAR:         "dodge_car",
  MONKEY_FISHING:    "monkey_fishing",
  DINO_WORLD:        "dino_world",
  POLICE_PURSUIT:    "police_pursuit",
  SUPER_HERO_MISSION:"super_hero_mission",
  TREASURE_HUNT:     "treasure_hunt",
};

/**
 * GAME_REGISTRY
 *
 * Maps a gameId to its display metadata and Expo route.
 * This is the frontend-only catalogue — it never goes to the backend.
 * The backend only knows gameId strings; the route and visuals live here.
 *
 * route: must match the file path under app/games/ exactly.
 *   e.g. app/games/FlappyWordGame.jsx  →  route: "/games/FlappyWordGame"
 */
export const GAME_REGISTRY = {
  [GAME_IDS.FLAPPY_WORD]: {
    gameId:      GAME_IDS.FLAPPY_WORD,
    name:        "Flappy Word",
    subtitle:    "Fly through the words!",
    route:       "/games/FlappyWordGame",
    gradient:    ["#00BCD4", "#0097A7"],
    accentColor: "#FFD54F",
    icon:        "🐦",
  },
  [GAME_IDS.DODGE_CAR]: {
    gameId:      GAME_IDS.DODGE_CAR,
    name:        "Dodge the Car",
    subtitle:    "Swerve & survive!",
    route:       "/games/DodgeCarGame",
    gradient:    ["#EF5350", "#B71C1C"],
    accentColor: "#FFD54F",
    icon:        "🚗",
  },
  [GAME_IDS.MONKEY_FISHING]: {
    gameId:      GAME_IDS.MONKEY_FISHING,
    name:        "Monkey Fishing",
    subtitle:    "Catch the right word!",
    route:       "/games/MonkeyFishingGame",
    gradient:    ["#31ad79", "#1e6e47"],
    accentColor: "#FFD54F",
    icon:        "🐒",
  },
  [GAME_IDS.DINO_WORLD]: {
    gameId:      GAME_IDS.DINO_WORLD,
    name:        "Dino World",
    subtitle:    "Stomp through words!",
    route:       "/games/DinoWorldGame",
    gradient:    ["#8BC34A", "#558B2F"],
    accentColor: "#FFD54F",
    icon:        "🦕",
  },
  [GAME_IDS.POLICE_PURSUIT]: {
    gameId:      GAME_IDS.POLICE_PURSUIT,
    name:        "Police Pursuit",
    subtitle:    "Chase the right answer!",
    route:       "/games/PolicePursuitGame",
    gradient:    ["#1565C0", "#0D47A1"],
    accentColor: "#FFD54F",
    icon:        "🚔",
  },
  [GAME_IDS.SUPER_HERO_MISSION]: {
    gameId:      GAME_IDS.SUPER_HERO_MISSION,
    name:        "Superhero Mission",
    subtitle:    "Save the day with words!",
    route:       "/games/SuperHeroMissionGame",
    gradient:    ["#7B1FA2", "#4A148C"],
    accentColor: "#FFD54F",
    icon:        "🦸",
  },
  [GAME_IDS.TREASURE_HUNT]: {
    gameId:      GAME_IDS.TREASURE_HUNT,
    name:        "Treasure Hunt",
    subtitle:    "Find the hidden word!",
    route:       "/games/TreasureHuntGame",
    gradient:    ["#F57F17", "#E65100"],
    accentColor: "#FFD54F",
    icon:        "🪙",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK_LEVEL_GAME_CONFIGS
//
// Used during development before the backend /api/v1/gamification/level/{n}
// endpoint is ready. Mirrors the exact shape that the real API will return.
//
// Each level has exactly 2 game slots (storyGroupIndex 1 and 2).
// storyIds: the 3 story IDs whose completion reveals this game slot.
// gameData: any[] — shape is specific to each game; the engine never reads it.
//
// Replace MOCK_STORY_IDs with your real story document IDs per level.
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_LEVEL_GAME_CONFIGS = {
  1: {
    levelNumber: 1,
    games: [
      {
        gameId:          GAME_IDS.FLAPPY_WORD,
        storyGroupIndex: 1,
        gameData: [
          // Single round — array of words the game uses
          { words: ["big", "small", "tall", "short"] },
        ],
      },
      {
        gameId:          GAME_IDS.DODGE_CAR,
        storyGroupIndex: 2,
        gameData: [
          { words: ["fast", "slow", "heavy", "light"] },
        ],
      },
    ],
    coinShopConfig: {
      enabled:     true,
      coinsAmount: 500,
      price:       5.00,
      currency:    "USD",
    },
  },

  2: {
    levelNumber: 2,
    games: [
      {
        gameId:          GAME_IDS.MONKEY_FISHING,
        storyGroupIndex: 1,
        gameData: [
          { words: ["hot", "cold", "wet", "dry"] },
          // Second round (game supports multiple rounds)
          { words: ["happy", "sad", "angry", "scared"] },
        ],
      },
      {
        gameId:          GAME_IDS.DINO_WORLD,
        storyGroupIndex: 2,
        gameData: [
          { words: ["loud", "quiet", "rough", "smooth"] },
        ],
      },
    ],
    coinShopConfig: {
      enabled:     true,
      coinsAmount: 500,
      price:       5.00,
      currency:    "USD",
    },
  },

  3: {
    levelNumber: 3,
    games: [
      {
        gameId:          GAME_IDS.POLICE_PURSUIT,
        storyGroupIndex: 1,
        gameData: [
          { words: ["above", "below", "inside", "outside"] },
        ],
      },
      {
        gameId:          GAME_IDS.SUPER_HERO_MISSION,
        storyGroupIndex: 2,
        gameData: [
          { words: ["before", "after", "first", "last"] },
        ],
      },
    ],
    coinShopConfig: {
      enabled:     true,
      coinsAmount: 500,
      price:       5.00,
      currency:    "USD",
    },
  },

  4: {
    levelNumber: 4,
    games: [
      {
        // Same game as Level 1 Slot 1 — different gameData shape entirely
        gameId:          GAME_IDS.MONKEY_FISHING,
        storyGroupIndex: 1,
        gameData: [
          // Level 4 uses a matching-pairs structure — completely different from Level 2
          {
            pairs: [
              { q: "narrow", a: "wide" },
              { q: "huge",   a: "tiny" },
              { q: "brave",  a: "scared" },
            ],
            timeLimit: 30,
          },
        ],
      },
      {
        gameId:          GAME_IDS.TREASURE_HUNT,
        storyGroupIndex: 2,
        gameData: [
          { words: ["ancient", "modern", "fragile", "sturdy"] },
        ],
      },
    ],
    coinShopConfig: {
      enabled:     true,
      coinsAmount: 500,
      price:       5.00,
      currency:    "USD",
    },
  },
};

/**
 * getMockConfigForLevel(levelNumber)
 *
 * Helper used by GamificationSyncEngine during development.
 * Returns the mock config for a level, or null if not defined.
 * Replace with a real API call in Step 10 of the implementation plan.
 */
export function getMockConfigForLevel(levelNumber) {
  const config = MOCK_LEVEL_GAME_CONFIGS[levelNumber];
  if (!config) return null;

  // Merge GAME_REGISTRY display metadata into each game slot so the
  // config has name, route, icon, gradient, accentColor alongside gameData.
  // The real backend endpoint will return these fields directly — this
  // merge is only needed for the mock path.
  return {
    ...config,
    games: config.games.map((slot) => ({
      ...GAME_REGISTRY[slot.gameId],  // name, route, icon, gradient, accentColor
      ...slot,                         // gameId, storyGroupIndex, gameData (wins over registry)
    })),
  };
}
