// app/data/ageLevelMap.js
//
// Maps a child's age to a suggested starting play level.
// Update this file before launch to adjust level suggestions
// without touching any screen code.
//
// Schema:
//   key   — child's age in years (integer)
//   value — suggested starting play level (1–10)
//
// Ages below 5 default to level 1.
// Ages above 13 default to level 8.

export const AGE_LEVEL_MAP = {
  5:  1,   // KG
  6:  2,   // Grade 1
  7:  3,   // Grade 2
  8:  4,   // Grade 3
  9:  6,   // Grade 4
  10: 7,   // Grade 5
  11: 8,   // Grade 6
  12: 8,   // Grade 7
  13: 8,   // Grade 8
};

// Default level for ages below the map range (< 5)
export const DEFAULT_LEVEL_BELOW_RANGE = 1;

// Default level for ages above the map range (> 13)
export const DEFAULT_LEVEL_ABOVE_RANGE = 8;

/**
 * getSuggestedLevel(age)
 * Returns the suggested play level for a given age.
 * Falls back to range defaults if age is outside the map.
 */
export function getSuggestedLevel(age) {
  if (!age || age < 5) return DEFAULT_LEVEL_BELOW_RANGE;
  if (age > 13)        return DEFAULT_LEVEL_ABOVE_RANGE;
  return AGE_LEVEL_MAP[age] ?? DEFAULT_LEVEL_BELOW_RANGE;
}
