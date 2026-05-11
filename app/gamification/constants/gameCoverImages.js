/**
 * gameCoverImages.js
 * app/gamification/constants/gameCoverImages.js
 *
 * Centralises all game cover image require() calls.
 *
 * WHY a separate file?
 *   Metro bundler resolves require() at compile time. A dynamic require like
 *   require(`../../assets/games/${dir}/cover.jpg`) would crash the bundler.
 *   All requires must be static literals in the source that Metro can trace.
 *
 * ABSENT covers (no image exists yet):
 *   spin_wheel    — assets/games/spinwheel/       (no cover.jpg)
 *   tressure_hunt — assets/games/treasure-hunt/   (no cover.jpg)
 *
 *   For those gameIds this map returns null, and the components fall back
 *   to the animated-emoji / MiniAnimation design.
 *
 * GameId → directory mapping (for reference):
 *   dino_world          → dino-world
 *   dodge_car           → dodge-car
 *   flappy_word         → flappy-word
 *   monkey_fishing      → monkey-fishing
 *   police_pursuit      → police-patrol-chase
 *   scene_detective     → scene-detective
 *   spin_wheel          → spinwheel          (NO COVER — null)
 *   super_hero_mission  → super-hero-mission  (uses intro.jpg, not cover.jpg)
 *   tressure_hunt       → treasure-hunt       (NO COVER — null)
 */

const GAME_COVERS = {
  dino_world: require("../../../assets/games/dino-world/cover.jpg"),
  dodge_car: require("../../../assets/games/dodge-car/cover.jpg"),
  flappy_word: require("../../../assets/games/flappy-word/cover.jpg"),
  monkey_fishing: require("../../../assets/games/monkey-fishing/cover.jpg"),
  police_pursuit: require("../../../assets/games/police-patrol-chase/cover.jpg"),
  scene_detective: require("../../../assets/games/scene-detective/cover.jpg"),

  // super_hero_mission uses intro.jpg (no cover.jpg exists)
  super_hero_mission: require("../../../assets/games/super-hero-mission/intro.jpg"),

  // ── NO COVER IMAGE — fallback to animated icon design ────────────────────
  spin_wheel: null,
  tressure_hunt: null,
};

export default GAME_COVERS;
