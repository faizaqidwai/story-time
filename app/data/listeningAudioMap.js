// app/data/listeningAudioMap.js
//
// Static asset map for listening audio files.
// Metro bundler requires all require() calls to be static strings —
// dynamic paths are not supported at build time.
//
// Usage:
//   import { resolveListeningAudio } from "../data/listeningAudioMap";
//   const source = resolveListeningAudio("l1-s3");
//   // returns the asset if found, { uri } if CDN, null if plain text (use TTS)

const AUDIO_MAP = {
  // ── Level 1 ──────────────────────────────────────────────────────────────
  "l1-s1": require("../../assets/sounds/listening/l1-s1.mp3"),
  "l1-s2": require("../../assets/sounds/listening/l1-s2.mp3"),
  "l1-s3": require("../../assets/sounds/listening/l1-s3.mp3"),
  "l1-s4": require("../../assets/sounds/listening/l1-s4.mp3"),
  "l1-s5": require("../../assets/sounds/listening/l1-s5.mp3"),
  "l1-s6": require("../../assets/sounds/listening/l1-s6.mp3"),
  "l1-s7": require("../../assets/sounds/listening/l1-s7.mp3"),
  "l1-s8": require("../../assets/sounds/listening/l1-s8.mp3"),
  // ── Level 2 ──────────────────────────────────────────────────────────────
  "l2-s1": require("../../assets/sounds/listening/l2-s1.mp3"),
  "l2-s2": require("../../assets/sounds/listening/l2-s2.mp3"),
  "l2-s3": require("../../assets/sounds/listening/l2-s3.mp3"),
  "l2-s4": require("../../assets/sounds/listening/l2-s4.mp3"),
  "l2-s5": require("../../assets/sounds/listening/l2-s5.mp3"),
  "l2-s6": require("../../assets/sounds/listening/l2-s6.mp3"),
  "l2-s7": require("../../assets/sounds/listening/l2-s7.mp3"),
  "l2-s8": require("../../assets/sounds/listening/l2-s8.mp3"),
  // ── Level 3 ──────────────────────────────────────────────────────────────
  "l3-s1": require("../../assets/sounds/listening/l3-s1.mp3"),
  "l3-s2": require("../../assets/sounds/listening/l3-s2.mp3"),
  "l3-s3": require("../../assets/sounds/listening/l3-s3.mp3"),
  "l3-s4": require("../../assets/sounds/listening/l3-s4.mp3"),
  "l3-s5": require("../../assets/sounds/listening/l3-s5.mp3"),
  "l3-s6": require("../../assets/sounds/listening/l3-s6.mp3"),
  "l3-s7": require("../../assets/sounds/listening/l3-s7.mp3"),
  "l3-s8": require("../../assets/sounds/listening/l3-s8.mp3"),
  // ── Level 4 ──────────────────────────────────────────────────────────────
  "l4-s1": require("../../assets/sounds/listening/l4-s1.mp3"),
  "l4-s2": require("../../assets/sounds/listening/l4-s2.mp3"),
  "l4-s3": require("../../assets/sounds/listening/l4-s3.mp3"),
  "l4-s4": require("../../assets/sounds/listening/l4-s4.mp3"),
  "l4-s5": require("../../assets/sounds/listening/l4-s5.mp3"),
  "l4-s6": require("../../assets/sounds/listening/l4-s6.mp3"),
  "l4-s7": require("../../assets/sounds/listening/l4-s7.mp3"),
  "l4-s8": require("../../assets/sounds/listening/l4-s8.mp3"),
  // ── Level 5 ──────────────────────────────────────────────────────────────
  "l5-s1": require("../../assets/sounds/listening/l5-s1.mp3"),
  "l5-s2": require("../../assets/sounds/listening/l5-s2.mp3"),
  "l5-s3": require("../../assets/sounds/listening/l5-s3.mp3"),
  "l5-s4": require("../../assets/sounds/listening/l5-s4.mp3"),
  "l5-s5": require("../../assets/sounds/listening/l5-s5.mp3"),
  "l5-s6": require("../../assets/sounds/listening/l5-s6.mp3"),
  "l5-s7": require("../../assets/sounds/listening/l5-s7.mp3"),
  "l5-s8": require("../../assets/sounds/listening/l5-s8.mp3"),
  // ── Level 6 ──────────────────────────────────────────────────────────────
  "l6-s1": require("../../assets/sounds/listening/l6-s1.mp3"),
  "l6-s2": require("../../assets/sounds/listening/l6-s2.mp3"),
  "l6-s3": require("../../assets/sounds/listening/l6-s3.mp3"),
  "l6-s4": require("../../assets/sounds/listening/l6-s4.mp3"),
  "l6-s5": require("../../assets/sounds/listening/l6-s5.mp3"),
  "l6-s6": require("../../assets/sounds/listening/l6-s6.mp3"),
  "l6-s7": require("../../assets/sounds/listening/l6-s7.mp3"),
  "l6-s8": require("../../assets/sounds/listening/l6-s8.mp3"),
};

/**
 * Resolves a database audio_narration_script value to a playable source.
 *
 * @param {string} script - Value from audio_narration_script field
 * @returns
 *   - Asset (number) if local file found e.g. "l1-s3"
 *   - { uri: string } if CDN URL e.g. "https://..."
 *   - null if plain text narration → caller should use TTS
 */
export const resolveListeningAudio = (script) => {
  if (!script) return null;
  const key = script.trim();

  // CDN or remote URL
  if (/^https?:\/\//.test(key)) return { uri: key };

  // Local key pattern e.g. "l1-s1", "l2-s8"
  if (/^l\d+-s\d+$/.test(key)) return AUDIO_MAP[key] ?? null;

  // Plain narration text — caller uses TTS
  return null;
};
