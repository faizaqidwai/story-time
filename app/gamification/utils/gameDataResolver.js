// app/gamification/utils/gameDataResolver.js
//
// Central utility for extracting level-specific game data from levelGames.
//
// Problem it solves:
//   Each game's DB document stores gameData keyed by level:
//     gameData: { "level_7": { ...data }, "level_11": { ...data } }
//
//   Games need the data for the CURRENTLY LOADED level, not all levels.
//   This resolver handles the key lookup and falls back gracefully.
//
// Usage:
//   const data = resolveGameData(levelGames, "flappy_word", loadedLevel);
//   // returns gameData["level_7"] when loadedLevel = 7, or null if not found

/**
 * resolveGameData
 *
 * @param {Array}  levelGames   — from useGamification().levelGames
 * @param {string} gameId       — e.g. "flappy_word", "dodge_car"
 * @param {number} levelNumber  — from useLevelAccess().loadedLevel
 * @returns {any|null}          — the game's data for this level, or null
 *
 * Example returned value for flappy_word at level 7:
 *   {
 *     garden: { label: "🌸 Garden", collect: [...], avoid: [...] },
 *     ocean:  { label: "🌊 Ocean",  collect: [...], avoid: [...] },
 *     space:  { label: "🚀 Space",  collect: [...], avoid: [...] },
 *   }
 */
export function resolveGameData(levelGames, gameId, levelNumber) {
  if (!Array.isArray(levelGames) || !gameId || levelNumber == null) {
    return null;
  }

  const slot = levelGames.find((g) => g.gameId === gameId);
  if (!slot) {
    console.log(
      `[gameDataResolver] gameId "${gameId}" not found in levelGames`,
    );
    return null;
  }

  const gameData = slot.gameData;
  if (!gameData || typeof gameData !== "object") {
    console.log(
      `[gameDataResolver] "${gameId}" has no gameData field`,
    );
    return null;
  }

  // Primary lookup: "level_7" for levelNumber = 7
  const levelKey = `level_${levelNumber}`;
  if (gameData[levelKey] !== undefined) {
    console.log(
      `[gameDataResolver] "${gameId}" resolved data for ${levelKey}`,
    );
    return gameData[levelKey];
  }

  // Fallback: if the exact level key is absent, try to find the closest
  // lower level that has data (useful when a game spans multiple levels
  // but isn't redefined for every one — e.g. level 8 falls back to level 7).
  const availableKeys = Object.keys(gameData)
    .filter((k) => k.startsWith("level_"))
    .map((k) => ({ key: k, num: parseInt(k.replace("level_", ""), 10) }))
    .filter((entry) => !isNaN(entry.num) && entry.num <= levelNumber)
    .sort((a, b) => b.num - a.num); // descending — closest lower level first

  if (availableKeys.length > 0) {
    const fallbackKey = availableKeys[0].key;
    console.log(
      `[gameDataResolver] "${gameId}" no data for ${levelKey}, falling back to ${fallbackKey}`,
    );
    return gameData[fallbackKey];
  }

  console.log(
    `[gameDataResolver] "${gameId}" has no data for level ${levelNumber} or below`,
  );
  return null;
}

/**
 * resolveGameDataAsArray
 *
 * Convenience wrapper for games (like FlappyWord) whose level data is an
 * object of named themes { garden: {...}, ocean: {...} } — converts it to
 * a plain array so the game can iterate or pick randomly.
 *
 * @param {Array}  levelGames
 * @param {string} gameId
 * @param {number} levelNumber
 * @returns {Array|null} — array of theme objects, or null
 */
export function resolveGameDataAsArray(levelGames, gameId, levelNumber) {
  const data = resolveGameData(levelGames, gameId, levelNumber);
  if (!data) return null;

  // Already an array — return as-is
  if (Array.isArray(data)) return data;

  // Object of named themes → convert values to array
  if (typeof data === "object") {
    const arr = Object.values(data);
    return arr.length > 0 ? arr : null;
  }

  return null;
}
