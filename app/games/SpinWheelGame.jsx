/**
 * SpinWheelGame.jsx — Captain Flipo's Flip Wheel
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   ✅ gameDataJson read from route params via useLocalSearchParams
 *   ✅ ROUNDS renamed to FALLBACK_ROUNDS
 *   ✅ rounds resolved inside component via useMemo (falls back to FALLBACK_ROUNDS)
 *   ✅ totalRounds derived from rounds.length
 *   ✅ All ROUNDS[x] references → rounds[x]
 *   ✅ All ROUNDS.length references → totalRounds
 *   ✅ round / pair derived from resolved rounds
 *   ✅ FinalCard receives rounds prop for breakdown labels
 *   ✅ handleNextRound uses totalRounds
 *   ✅ playing screen header uses totalRounds
 *   ✅ round_result isLast uses totalRounds
 *   ✅ All game logic, wheel physics, animations, and UI unchanged
 *
 * Backend shape for gameData["level_N"]:
 *   [
 *     { difficulty: 1, label: "Sailor",    pairs: [{ word, opposite, distractors[] }] },
 *     { difficulty: 2, label: "Deckhand",  pairs: [...] },
 *     ...
 *   ]
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Image,
  StatusBar,
  SafeAreaView,
  ImageBackground,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { font, pad } from "../theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");
const WHEEL_SIZE = Math.min(SW * 0.8, 310);

const C = {
  bg: "#0a1628",
  woodDark: "#78350f",
  woodLight: "#b45309",
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  goldDim: "rgba(245,158,11,0.2)",
  goldBorder: "rgba(245,158,11,0.5)",
  coral: "#EF4444",
  coralDim: "rgba(239,68,68,0.2)",
  coralBorder: "rgba(239,68,68,0.5)",
  green: "#10B981",
  greenDim: "rgba(16,185,129,0.2)",
  greenBorder: "rgba(16,185,129,0.5)",
  teal: "#06B6D4",
  rim: "#D97706",
  spoke: "#B45309",
  text: "#FEF3C7",
  textSec: "#D97706",
  textMuted: "#92400e",
  cardBg: "rgba(10,22,40,0.92)",
  border: "rgba(245,158,11,0.2)",
};

// ─── FALLBACK ROUNDS ──────────────────────────────────────────────────────────
// Used when no gameDataJson is passed or backend has no data for this level.
// The component reads from `rounds` (resolved at runtime) — never from this
// constant directly — so wiring backend data requires zero other changes.
//
// Backend shape for gameData["level_N"]:
//   [
//     { difficulty: 1, label: "Sailor",   pairs: [{word, opposite, distractors:[]}] },
//     { difficulty: 2, label: "Deckhand", pairs: [...] },
//   ]
const FALLBACK_ROUNDS = [
  {
    difficulty: 1, label: "Sailor",
    pairs: [
      { word: "HOT",  opposite: "COLD",  distractors: ["WARM", "WET", "DARK"] },
      { word: "BIG",  opposite: "SMALL", distractors: ["TALL", "HEAVY", "ROUND"] },
      { word: "FAST", opposite: "SLOW",  distractors: ["LONG", "LOUD", "SOFT"] },
    ],
  },
  {
    difficulty: 2, label: "Deckhand",
    pairs: [
      { word: "HAPPY", opposite: "SAD",   distractors: ["MAD", "TIRED", "BORED"] },
      { word: "CLEAN", opposite: "DIRTY", distractors: ["SHINY", "DUSTY", "MESSY"] },
      { word: "BRAVE", opposite: "SCARED",distractors: ["STRONG", "PROUD", "SILLY"] },
    ],
  },
  {
    difficulty: 3, label: "First Mate",
    pairs: [
      { word: "ANCIENT",   opposite: "MODERN",  distractors: ["BROKEN", "RUSTY", "HEAVY"] },
      { word: "EXPAND",    opposite: "SHRINK",  distractors: ["STRETCH", "FLATTEN", "TWIST"] },
      { word: "GENEROUS",  opposite: "GREEDY",  distractors: ["NERVOUS", "CAREFUL", "HONEST"] },
    ],
  },
  {
    difficulty: 4, label: "Captain",
    pairs: [
      { word: "OPTIMISTIC",  opposite: "PESSIMISTIC", distractors: ["REALISTIC", "ENERGETIC", "CREATIVE"] },
      { word: "ACCELERATE",  opposite: "DECELERATE",  distractors: ["NAVIGATE", "EVAPORATE", "CELEBRATE"] },
      { word: "CONSTRUCT",   opposite: "DEMOLISH",    distractors: ["ACCOMPLISH", "DISTINGUISH", "ESTABLISH"] },
    ],
  },
];

// Decorative word pool for wheel segments
const WHEEL_POOL = [
  "HOT","BIG","FAST","HAPPY","LOUD","CLEAN","BRAVE","OLD","SOFT","COLD",
  "SMALL","SLOW","SAD","QUIET","DIRTY","NEW","HARD","DARK","LIGHT","FULL",
  "EMPTY","ROUGH","SHARP","WIDE","THIN","NEAR","FAR","RICH","POOR","WILD",
  "WEAK","SWEET",
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeSegments(questionWord) {
  const fillers = shuffle(WHEEL_POOL.filter((w) => w !== questionWord)).slice(0, 7);
  return [questionWord, ...fillers];
}

// ─── SOUND HELPERS ────────────────────────────────────────────────────────────
const SFX = {
  spin: require("../../assets/sounds/game/spinwheel/spin.mp3"),
  tick: require("../../assets/sounds/game/spinwheel/tick.mp3"),
  correct: require("../../assets/sounds/game/spinwheel/correct.mp3"),
  wrong: require("../../assets/sounds/game/spinwheel/wrong.mp3"),
  win: require("../../assets/sounds/game/spinwheel/win.mp3"),
  start: require("../../assets/sounds/game/spinwheel/start.mp3"),
  pirateStart: require("../../assets/sounds/game/spinwheel/pirate-start.mp3"),
  button: require("../../assets/sounds/button.mp3"),
  reveal: require("../../assets/sounds/game/spinwheel/reveal.mp3"),
  lose: require("../../assets/sounds/game/spinwheel/lose.mp3"),
};

async function playSound(file, volume = 1.0) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    await sound.setVolumeAsync(volume);
    sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) sound.unloadAsync(); });
    await sound.playAsync();
  } catch (_) {}
}

async function playSoundTracked(file, volume = 1.0) {
  let snd = null;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    snd = sound;
    await sound.setVolumeAsync(volume);
    sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) sound.unloadAsync(); });
    await sound.playAsync();
  } catch (_) {}
  return async () => {
    if (snd) {
      try { await snd.stopAsync(); await snd.unloadAsync(); } catch (_) {}
      snd = null;
    }
  };
}

// ─── FLOATING STAR ────────────────────────────────────────────────────────────
function FloatingStar({ startX, startY, endX, endY, delay, onDone }) {
  const ax = useRef(new Animated.Value(startX)).current;
  const ay = useRef(new Animated.Value(startY)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1.2, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(ax, { toValue: endX, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ay, { toValue: endY, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(() => Animated.timing(op, { toValue: 0, duration: 120, useNativeDriver: true }).start(onDone));
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width: 28, height: 28, alignItems: "center", justifyContent: "center", zIndex: 999, opacity: op, transform: [{ translateX: ax }, { translateY: ay }, { scale: sc }] }}>
      <Text style={{ fontSize: 22 }}>⭐</Text>
    </Animated.View>
  );
}

// ─── SPIN WHEEL ───────────────────────────────────────────────────────────────
function SpinWheel({ rotateAnim, segments, revealed }) {
  const S = WHEEL_SIZE;
  const r = S / 2;
  const sw = 9;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (revealed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [revealed]);

  return (
    <View style={{ width: S + 24, height: S + 24, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: S + 24, height: S + 24, borderRadius: (S + 24) / 2, borderWidth: 3, borderColor: "rgba(245,158,11,0.35)", shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 22, elevation: 10 }} />
      <Animated.View style={{ width: S, height: S, borderRadius: r, backgroundColor: C.woodDark, borderWidth: 8, borderColor: C.rim, alignItems: "center", justifyContent: "center", overflow: "hidden", transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"], extrapolate: "extend" }) }], shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 12, elevation: 14 }}>
        <View style={{ position: "absolute", width: S - 30, height: S - 30, borderRadius: (S - 30) / 2, borderWidth: 2, borderColor: C.woodLight }} />
        {[0, 45, 90, 135].map((angle) => (
          <View key={`sp${angle}`} style={{ position: "absolute", width: sw, height: S - 36, backgroundColor: C.spoke, borderRadius: sw / 2, transform: [{ rotate: `${angle}deg` }], shadowColor: "#000", shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.5, shadowRadius: 2, elevation: 4 }} />
        ))}
        {segments.map((word, i) => {
          const midDeg = i * 45 + 22.5 - 90;
          const midRad = (midDeg * Math.PI) / 180;
          const dist = r * 0.64;
          const cx = r + dist * Math.cos(midRad);
          const cy = r + dist * Math.sin(midRad);
          const textRot = midDeg + 90;
          const isQ = i === 0 && revealed;
          const wordColor = isQ ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: ["#FFFFFF", "#FFD700"] }) : C.goldLight;
          return (
            <View key={`w${i}`} style={{ position: "absolute", width: 80, height: 24, left: cx - 40, top: cy - 12, alignItems: "center", justifyContent: "center", transform: [{ rotate: `${textRot}deg` }] }}>
              {isQ ? (
                <Animated.Text numberOfLines={1} style={{ color: wordColor, fontSize: font.md, fontWeight: "900", letterSpacing: 0.8, textShadowColor: "rgba(255,215,0,0.9)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}>{word}</Animated.Text>
              ) : (
                <Text numberOfLines={1} style={{ color: C.goldLight, fontSize: font.sm, fontWeight: "900", letterSpacing: 0.8, textShadowColor: "rgba(0,0,0,0.95)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>{word}</Text>
              )}
            </View>
          );
        })}
        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.gold, borderWidth: 4, borderColor: C.woodDark, alignItems: "center", justifyContent: "center", shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 16, zIndex: 10 }}>
          <Image source={require("../../assets/games/spinwheel/wheel_center.png")} style={{ width: 34, height: 34 }} resizeMode="contain" onError={() => {}} />
        </View>
      </Animated.View>
      <View style={{ position: "absolute", top: 0, alignSelf: "center", zIndex: 20 }}>
        <View style={{ width: 0, height: 0, borderLeftWidth: 13, borderRightWidth: 13, borderTopWidth: 26, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: C.coral, shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10 }} />
      </View>
    </View>
  );
}

// ─── PARROT ───────────────────────────────────────────────────────────────────
const PARROT_IMGS = {
  idle: require("../../assets/games/spinwheel/parrot_idle.png"),
  spin: require("../../assets/games/spinwheel/parrot_spin.png"),
  correct: require("../../assets/games/spinwheel/parrot_correct.png"),
  wrong: require("../../assets/games/spinwheel/parrot_wrong.png"),
};

function Parrot({ expression = "idle", size = 90 }) {
  const bob = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const loop = useRef(null);
  useEffect(() => {
    loop.current?.stop();
    if (expression === "idle") {
      loop.current = Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: -5, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loop.current.start();
    } else if (expression === "spin") {
      loop.current = Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: -9, duration: 200, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 3, duration: 200, useNativeDriver: true }),
      ]));
      loop.current.start();
    } else if (expression === "correct") {
      bob.setValue(0);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.22, friction: 3, tension: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    } else if (expression === "wrong") {
      Animated.sequence([
        Animated.timing(bob, { toValue: 8, duration: 70, useNativeDriver: true }),
        Animated.timing(bob, { toValue: -8, duration: 70, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 5, duration: 70, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]).start();
    }
    return () => loop.current?.stop();
  }, [expression]);
  return (
    <Animated.View style={{ transform: [{ translateY: bob }, { scale }] }}>
      <Image source={PARROT_IMGS[expression]} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
}

// ─── ANSWER CHIP ─────────────────────────────────────────────────────────────
function AnswerChip({ word, state, onPress, disabled }) {
  const scaleA = useRef(new Animated.Value(1)).current;
  const shakeA = useRef(new Animated.Value(0)).current;
  const handlePress = () => {
    if (disabled || state !== "idle") return;
    Animated.sequence([
      Animated.timing(scaleA, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleA, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress(word);
  };
  useEffect(() => {
    if (state === "wrong") {
      Animated.sequence([
        Animated.timing(shakeA, { toValue: 10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeA, { toValue: -10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeA, { toValue: 6, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeA, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);
  let bg = "rgba(255,255,255,0.07)", border = "rgba(245,158,11,0.35)", color = C.text;
  if (state === "correct") { bg = C.greenDim; border = C.greenBorder; color = "#34D399"; }
  if (state === "wrong")   { bg = C.coralDim; border = C.coralBorder; color = "#FCA5A5"; }
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: scaleA }, { translateX: shakeA }] }}>
      <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={0.8} style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
        <Text style={[styles.chipText, { color }]}>{word}</Text>
        {state === "correct" && <Text style={{ fontSize: 14 }}>✓</Text>}
        {state === "wrong"   && <Text style={{ fontSize: 14 }}>✗</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── DIFFICULTY ANCHORS ───────────────────────────────────────────────────────
function DiffStars({ level }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Text key={i} style={{ fontSize: 12, opacity: i <= level ? 1 : 0.2 }}>⚓</Text>
      ))}
    </View>
  );
}

// ─── MAIN GAME ────────────────────────────────────────────────────────────────
export default function SpinWheelGame() {
  const router = useRouter();

  // ── Resolve rounds from route params ──────────────────────────────────────
  // gameDataJson is passed by GamificationContext.startPlay via router.push params.
  // Backend shape: array of round objects matching FALLBACK_ROUNDS structure.
  // Validator: parsed[0].pairs[0].opposite must be a non-empty string.
  // Falls back to FALLBACK_ROUNDS when absent or invalid.
  const { gameDataJson } = useLocalSearchParams();

  const rounds = useMemo(() => {
    try {
      if (!gameDataJson) return FALLBACK_ROUNDS;
      const parsed = JSON.parse(gameDataJson);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        Array.isArray(parsed[0]?.pairs) &&
        parsed[0].pairs.length > 0 &&
        typeof parsed[0].pairs[0]?.opposite === "string" &&
        parsed[0].pairs[0].opposite.length > 0
      ) {
        console.log("[SpinWheelGame] using backend rounds, count:", parsed.length);
        return parsed;
      }
      console.log("[SpinWheelGame] invalid shape — using fallback");
      return FALLBACK_ROUNDS;
    } catch (_) {
      return FALLBACK_ROUNDS;
    }
  }, [gameDataJson]);

  // Derived constant — replaces all ROUNDS.length references
  const totalRounds = rounds.length;

  // ── State ─────────────────────────────────────────────────
  const [screen, setScreen] = useState("start");
  const [roundIndex, setRoundIndex] = useState(0);
  const [pairIndex, setPairIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [answerStates, setAnswerStates] = useState({});
  const [answered, setAnswered] = useState(false);
  const [parrot, setParrot] = useState("idle");
  const [score, setScore] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [pairResults, setPairResults] = useState([]);
  const [choices, setChoices] = useState([]);
  const [segments, setSegments] = useState([]);

  // Floating stars
  const [floatingStars, setFloatingStars] = useState([]);
  const starIdRef = useRef(0);
  const scoreBadgePos = useRef({ x: SW - 80, y: 60 });
  const badgeScale = useRef(new Animated.Value(1)).current;

  // Wheel
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const totalRot = useRef(0);
  const spinTimer = useRef(null);

  // Intro sound cancel
  const introStop = useRef(null);

  // round / pair read from resolved `rounds` — not FALLBACK_ROUNDS
  const round = rounds[roundIndex];
  const pair = round?.pairs[pairIndex];

  // ── Reset choices + segments when pair changes ────────────────────────────
  useEffect(() => {
    if (!pair) return;
    setChoices(shuffle([pair.opposite, ...pair.distractors]));
    setSegments(makeSegments(pair.word));
    setRevealed(false);
  }, [roundIndex, pairIndex]);

  // ── Intro sound sequence ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      const stop = await playSoundTracked(SFX.pirateStart);
      introStop.current = stop;
      await new Promise((r) => setTimeout(r, 5000));
      if (cancelled) return;
      introStop.current = null;
      playSound(SFX.start);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
      introStop.current?.();
      introStop.current = null;
    };
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    if (spinTimer.current) clearTimeout(spinTimer.current);
    introStop.current?.();
    Speech.stop();
  }, []);

  // ── Badge pulse ───────────────────────────────────────────────────────────
  const pulseBadge = () => {
    Animated.sequence([
      Animated.spring(badgeScale, { toValue: 1.4, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const spawnStars = (fromX, fromY) => {
    const stars = Array.from({ length: 5 }, (_, i) => ({
      id: starIdRef.current++,
      startX: fromX - 14 + (Math.random() - 0.5) * 30,
      startY: fromY - 14 + (Math.random() - 0.5) * 30,
      endX: scoreBadgePos.current.x,
      endY: scoreBadgePos.current.y,
      delay: i * 65,
    }));
    setFloatingStars((p) => [...p, ...stars]);
    setTimeout(pulseBadge, 380);
  };

  const removeStar = (id) => setFloatingStars((p) => p.filter((s) => s.id !== id));

  // ── SPIN ──────────────────────────────────────────────────────────────────
  const handleSpin = () => {
    if (spinning || answered) return;
    if (spinTimer.current) clearTimeout(spinTimer.current);
    playSound(SFX.button);
    playSound(SFX.spin);
    setSpinning(true);
    setHasSpun(false);
    setRevealed(false);
    setParrot("spin");
    const turns = 4 + Math.floor(Math.random() * 4);
    const currentFrac = totalRot.current % 1;
    const targetFrac = (360 - 22.5) / 360;
    let extraFrac = targetFrac - currentFrac;
    if (extraFrac <= 0) extraFrac += 1;
    const target = totalRot.current + turns + extraFrac;
    totalRot.current = target;
    const duration = 2800 + turns * 150;
    Animated.timing(rotateAnim, { toValue: target, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    spinTimer.current = setTimeout(async () => {
      spinTimer.current = null;
      setSpinning(false);
      setHasSpun(true);
      setParrot("idle");
      playSound(SFX.tick);
      await new Promise((r) => setTimeout(r, 300));
      setRevealed(true);
      playSound(SFX.reveal);
      await new Promise((r) => setTimeout(r, 1500));
      const wordToSpeak = pair?.word;
      if (wordToSpeak) Speech.speak(wordToSpeak, { language: "en-US", pitch: 1.0, rate: 0.85 });
    }, duration + 60);
  };

  // ── ANSWER ────────────────────────────────────────────────────────────────
  const handleAnswer = (word) => {
    if (!hasSpun || answered || spinning) return;
    const correct = word === pair.opposite;
    setAnswerStates({ [word]: correct ? "correct" : "wrong" });
    setAnswered(true);
    setParrot(correct ? "correct" : "wrong");
    if (correct) {
      playSound(SFX.correct);
      const pts = 10 + round.difficulty * 5;
      setScore((s) => s + pts);
      spawnStars(SW / 2, SH * 0.72);
    } else {
      playSound(SFX.wrong);
      setTimeout(() => { setAnswerStates({ [word]: "wrong", [pair.opposite]: "correct" }); }, 600);
    }
    const newResults = [...pairResults, correct];
    setPairResults(newResults);
    setTimeout(() => {
      const nextPair = pairIndex + 1;
      if (nextPair < round.pairs.length) {
        setPairIndex(nextPair);
        setAnswered(false);
        setHasSpun(false);
        setAnswerStates({});
        setParrot("idle");
      } else {
        const correctCount = newResults.filter(Boolean).length;
        const stars = correctCount === 3 ? 3 : correctCount === 2 ? 2 : 1;
        setRoundScores((rs) => [...rs, stars]);
        playSound(stars >= 2 ? SFX.win : SFX.lose);
        setScreen("round_result");
      }
    }, correct ? 1400 : 2000);
  };

  // ── NEXT ROUND — uses totalRounds (derived from resolved rounds) ──────────
  const handleNextRound = () => {
    playSound(SFX.start);
    const next = roundIndex + 1;
    if (next < totalRounds) {
      setRoundIndex(next);
      setPairIndex(0);
      setPairResults([]);
      setAnswered(false);
      setHasSpun(false);
      setAnswerStates({});
      setParrot("idle");
      setScreen("playing");
    } else {
      setScreen("final");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SCREENS
  // ─────────────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <ImageBackground source={require("../../assets/games/spinwheel/ship_bg.jpg")} style={styles.root} resizeMode="cover">
        <View style={styles.overlay} />
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.startWrap}>
          <Parrot expression="idle" size={180} />
          <Text style={styles.title}>Captain Flipo's{"\n"}Flip Wheel</Text>
          <Text style={styles.subtitle}>Spin the wheel — find the OPPOSITE!</Text>
          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>⚓ How to Play</Text>
            <Text style={styles.rulesRow}>🎡 Press SPIN to spin the wheel</Text>
            <Text style={styles.rulesRow}>👁️ Look at the word at the top</Text>
            <Text style={styles.rulesRow}>🔁 Tap its OPPOSITE below</Text>
            <Text style={styles.rulesRow}>📈 Gets harder each round!</Text>
          </View>
          <TouchableOpacity style={styles.goldBtn} activeOpacity={0.85} onPress={() => {
            introStop.current?.();
            introStop.current = null;
            playSound(SFX.button);
            setScreen("playing");
          }}>
            <Text style={styles.goldBtnText}>⚓ Set Sail!</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeRow} onPress={() => router.back()}>
            <Text style={styles.closeTxt}>✕ Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
        {floatingStars.map((s) => <FloatingStar key={s.id} {...s} onDone={() => removeStar(s.id)} />)}
      </ImageBackground>
    );
  }

  if (screen === "playing") {
    return (
      <ImageBackground source={require("../../assets/games/spinwheel/ship_bg.jpg")} style={styles.root} resizeMode="cover">
        <View style={styles.overlay} />
        <StatusBar barStyle="light-content" />

        {/* HEADER */}
        <SafeAreaView style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
              <Text style={styles.exitTxt}>✕</Text>
            </TouchableOpacity>
            <View style={{ alignItems: "center", gap: 3 }}>
              {/* totalRounds replaces hardcoded ROUNDS.length */}
              <Text style={styles.roundTxt}>Round {roundIndex + 1} / {totalRounds}</Text>
              <DiffStars level={round.difficulty} />
            </View>
            <Animated.View style={[styles.scoreBadge, { transform: [{ scale: badgeScale }] }]}
              onLayout={(e) => e.target.measureInWindow((x, y, w, h) => {
                scoreBadgePos.current = { x: x + w / 2 - 14, y: y + h / 2 - 14 };
              })}>
              <Text style={styles.scoreTxt}>⭐ {score}</Text>
            </Animated.View>
          </View>
          <View style={styles.dots}>
            {round.pairs.map((_, i) => (
              <View key={i} style={[styles.dot, i < pairIndex && styles.dotDone, i === pairIndex && styles.dotActive]} />
            ))}
          </View>
        </SafeAreaView>

        {/* BODY */}
        <View style={{ flex: 1 }}>
          <View style={styles.parrotRow}>
            <Parrot expression={parrot} size={120} />
            <View style={styles.bubble}>
              {hasSpun && !answered && (
                <>
                  <Text style={styles.bubbleLabel}>Find the opposite of:</Text>
                  <Text style={styles.bubbleWord}>{pair?.word}</Text>
                </>
              )}
              {!hasSpun && !spinning && <Text style={styles.bubbleLabel}>🎡 {pairIndex === 0 ? "Spin to begin!" : "Spin again!"}</Text>}
              {spinning && <Text style={styles.bubbleLabel}>Spinning… 🌀</Text>}
            </View>
          </View>

          <View style={styles.wheelWrap}>
            <SpinWheel
              rotateAnim={rotateAnim}
              segments={segments.length === 8 ? segments : makeSegments(pair?.word ?? "?")}
              revealed={revealed}
            />
          </View>

          <View style={styles.bottom}>
            {!hasSpun ? (
              <TouchableOpacity style={[styles.goldBtn, spinning && styles.goldBtnDisabled]} onPress={handleSpin} disabled={spinning} activeOpacity={0.85}>
                <Text style={styles.goldBtnText}>{spinning ? "Spinning…" : "🎡 SPIN!"}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.answersWrap}>
                <Text style={styles.answersLabel}>Opposite of: <Text style={{ color: C.gold, fontWeight: "900" }}>{pair?.word}</Text></Text>
                <View style={styles.chipsRow}>
                  {choices.map((word) => (
                    <AnswerChip key={word} word={word} state={answerStates[word] || "idle"} onPress={handleAnswer} disabled={answered} />
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {floatingStars.map((s) => <FloatingStar key={s.id} {...s} onDone={() => removeStar(s.id)} />)}
      </ImageBackground>
    );
  }

  if (screen === "round_result") {
    const stars = roundScores[roundScores.length - 1] ?? 0;
    const isWin = stars >= 2;
    const correct = pairResults.filter(Boolean).length;
    return (
      <ImageBackground source={require("../../assets/games/spinwheel/ship_bg.jpg")} style={styles.root} resizeMode="cover">
        <View style={styles.overlay} />
        <StatusBar barStyle="light-content" />
        <View style={styles.overlayBg}>
          <RoundResultCard
            roundIndex={roundIndex}
            label={round.label}
            stars={stars}
            isWin={isWin}
            correct={correct}
            total={round.pairs.length}
            score={score}
            // isLast computed from totalRounds — not hardcoded FALLBACK_ROUNDS.length
            isLast={roundIndex + 1 >= totalRounds}
            onNext={handleNextRound}
          />
        </View>
        {floatingStars.map((s) => <FloatingStar key={s.id} {...s} onDone={() => removeStar(s.id)} />)}
      </ImageBackground>
    );
  }

  if (screen === "final") {
    const totalStars = roundScores.reduce((a, b) => a + b, 0);
    const maxStars = totalRounds * 3; // uses totalRounds — not FALLBACK_ROUNDS.length
    const isMaster = totalStars >= maxStars * 0.85;
    const grade = isMaster ? "Master Captain!" : totalStars >= maxStars * 0.6 ? "First Mate!" : totalStars >= maxStars * 0.4 ? "Deckhand!" : "Sailor Trainee";
    const gradeEmoji = isMaster ? "🏴‍☠️" : totalStars >= maxStars * 0.6 ? "🏆" : totalStars >= maxStars * 0.4 ? "⚓" : "🦜";
    return (
      <ImageBackground source={require("../../assets/games/spinwheel/ship_bg.jpg")} style={styles.root} resizeMode="cover">
        <View style={styles.overlay} />
        <StatusBar barStyle="light-content" />
        <View style={styles.overlayBg}>
          <FinalCard
            grade={grade}
            gradeEmoji={gradeEmoji}
            score={score}
            totalStars={totalStars}
            maxStars={maxStars}
            roundScores={roundScores}
            // Pass resolved rounds so FinalCard can render breakdown labels correctly
            rounds={rounds}
            onReplay={() => {
              setRoundIndex(0); setPairIndex(0); setPairResults([]);
              setRoundScores([]); setScore(0); setAnswered(false);
              setHasSpun(false); setAnswerStates({}); setParrot("idle");
              totalRot.current = 0; rotateAnim.setValue(0);
              setScreen("start");
            }}
            onExit={() => router.back()}
          />
        </View>
      </ImageBackground>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// ROUND RESULT CARD — unchanged from original
// ─────────────────────────────────────────────────────────────
function RoundResultCard({ roundIndex, label, stars, isWin, correct, total, score, isLast, onNext }) {
  const sc = useRef(new Animated.Value(0.65)).current;
  const op = useRef(new Animated.Value(0)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-200)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    [[s1, 280], [s2, 450], [s3, 620]].forEach(([v, d]) =>
      Animated.sequence([Animated.delay(d), Animated.spring(v, { toValue: 1, friction: 3, tension: 130, useNativeDriver: true })]).start(),
    );
    if (isWin) {
      Animated.loop(Animated.sequence([
        Animated.delay(700),
        Animated.timing(shimX, { toValue: 320, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimX, { toValue: -200, duration: 0, useNativeDriver: true }),
      ])).start();
    }
  }, []);
  const ac = isWin ? C.gold : C.coral;
  const adim = isWin ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.1)";
  const aborder = isWin ? "rgba(245,158,11,0.45)" : "rgba(239,68,68,0.35)";
  return (
    <Animated.View style={[styles.card, { borderColor: aborder, opacity: op, transform: [{ scale: sc }] }]}>
      <View style={[styles.banner, { backgroundColor: adim, borderColor: aborder }]}>
        {isWin && <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: shimX }] }]} />}
        <Text style={[styles.bannerTxt, { color: ac }]}>{isWin ? `🦜 Round ${roundIndex + 1} Complete!` : "💪 Keep Sailing!"}</Text>
        <Text style={[styles.bannerSub, { color: ac }]}>{label} Rank</Text>
      </View>
      <View style={styles.starsRow}>
        {[s1, s2, s3].map((s, i) => (
          <Animated.Text key={i} style={[styles.starEmoji, { transform: [{ scale: s }], opacity: i < stars ? s : 0.18 }]}>⭐</Animated.Text>
        ))}
      </View>
      <View style={styles.pillRow}>
        <View style={[styles.pill, { borderColor: "rgba(16,185,129,0.5)", backgroundColor: "rgba(16,185,129,0.1)" }]}>
          <Text style={styles.pillLabel}>CORRECT</Text>
          <Text style={[styles.pillVal, { color: C.green }]}>{correct}/{total}</Text>
        </View>
        <View style={[styles.pill, { borderColor: "rgba(245,158,11,0.45)", backgroundColor: "rgba(245,158,11,0.08)" }]}>
          <Text style={styles.pillLabel}>SCORE</Text>
          <Text style={[styles.pillVal, { color: C.gold }]}>{score}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.goldBtn, { marginTop: 4 }]} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.goldBtnText}>{isLast ? "See Final Score 🏆" : "Next Round →"}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// FINAL CARD
// Now receives `rounds` prop so it reads labels from resolved data
// instead of the module-level FALLBACK_ROUNDS constant.
// ─────────────────────────────────────────────────────────────
function FinalCard({ grade, gradeEmoji, score, totalStars, maxStars, roundScores, rounds, onReplay, onExit }) {
  const sc = useRef(new Animated.Value(0.6)).current;
  const op = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-200)).current;
  const stars = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    stars.forEach((s, i) =>
      Animated.sequence([Animated.delay(300 + i * 150), Animated.spring(s, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true })]).start(),
    );
    Animated.loop(Animated.sequence([
      Animated.delay(900),
      Animated.timing(shimX, { toValue: 320, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(shimX, { toValue: -200, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);
  const filled = Math.round((totalStars / maxStars) * 3);
  return (
    <Animated.View style={[styles.card, styles.finalCard, { opacity: op, transform: [{ scale: sc }] }]}>
      <View style={styles.finalBanner}>
        <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: shimX }] }]} />
        <Text style={styles.finalEmoji}>{gradeEmoji}</Text>
        <Text style={styles.finalGrade}>{grade.toUpperCase()}</Text>
      </View>
      <View style={styles.starsRow}>
        {stars.map((s, i) => (
          <Animated.Text key={i} style={[styles.starEmoji, { transform: [{ scale: s }], opacity: i < filled ? s : 0.18 }]}>⭐</Animated.Text>
        ))}
      </View>
      <View style={styles.pillRow}>
        <View style={[styles.pill, { borderColor: "rgba(245,158,11,0.5)", backgroundColor: "rgba(245,158,11,0.08)" }]}>
          <Text style={styles.pillLabel}>SCORE</Text>
          <Text style={[styles.pillVal, { color: C.gold }]}>{score}</Text>
        </View>
        <View style={[styles.pill, { borderColor: "rgba(6,182,212,0.45)", backgroundColor: "rgba(6,182,212,0.08)" }]}>
          <Text style={styles.pillLabel}>STARS</Text>
          <Text style={[styles.pillVal, { color: C.teal }]}>⭐ {totalStars}/{maxStars}</Text>
        </View>
      </View>
      <View style={styles.breakdown}>
        {roundScores.map((s, i) => (
          <View key={i} style={styles.breakdownRow}>
            {/* rounds[i] reads from the resolved array — not FALLBACK_ROUNDS[i] */}
            <Text style={styles.breakdownLabel}>⚓ Round {i + 1} — {rounds[i]?.label ?? `Round ${i + 1}`}</Text>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1, 2, 3].map((n) => <Text key={n} style={{ fontSize: 13, opacity: n <= s ? 1 : 0.18 }}>⭐</Text>)}
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[styles.goldBtn, { marginTop: 4 }]} onPress={onReplay} activeOpacity={0.85}>
        <Text style={styles.goldBtnText}>🎡 Play Again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secBtn} onPress={onExit} activeOpacity={0.75}>
        <Text style={styles.secBtnTxt}>✕ Exit</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES — unchanged from original
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,22,40,0.72)" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,8,26,0.84)", alignItems: "center", justifyContent: "center", zIndex: 300 },
  startWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: pad.md },
  title: { fontSize: font.h1, fontWeight: "900", color: C.gold, textAlign: "center", marginTop: 10, lineHeight: 42, textShadowColor: "rgba(245,158,11,0.4)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  subtitle: { color: C.textSec, fontSize: font.xl, textAlign: "center", marginTop: 8, marginBottom: 18, lineHeight: 24 },
  rulesBox: { backgroundColor: "rgba(10,22,40,0.9)", borderRadius: 18, borderWidth: 1.5, borderColor: C.goldBorder, padding: 16, width: "90%", gap: 8, marginBottom: 22, marginLeft: 20, marginRight: 20 },
  rulesTitle: { color: C.gold, fontWeight: "900", fontSize: font.xl, marginBottom: 2 },
  rulesRow: { color: C.textSec, fontSize: font.lg, lineHeight: 22 },
  closeRow: { padding: 12 },
  closeTxt: { color: "#b1bbc9", fontSize: font.md, fontWeight: "600", textAlign: "center" },
  header: { backgroundColor: "rgba(10,22,40,0.88)", borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, paddingBottom: 6 },
  exitBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center" },
  exitTxt: { fontSize: 13, color: "#bbc5d2", fontWeight: "700" },
  roundTxt: { color: C.text, fontWeight: "800", fontSize: font.xl },
  scoreBadge: { backgroundColor: C.goldDim, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5, borderColor: C.goldBorder },
  scoreTxt: { color: C.goldLight, fontSize: font.lg, fontWeight: "900" },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { width: 28, backgroundColor: C.gold },
  dotDone: { backgroundColor: C.green },
  parrotRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 10 },
  bubble: { flex: 1, backgroundColor: "rgba(10,22,40,0.9)", borderRadius: 16, borderWidth: 1.5, borderColor: C.goldBorder, padding: 12, gap: 3 },
  bubbleLabel: { color: C.textSec, fontSize: font.md, fontWeight: "600" },
  bubbleWord: { color: C.gold, fontSize: font.h2, fontWeight: "900", letterSpacing: 1 },
  wheelWrap: { alignItems: "center", justifyContent: "center" },
  bottom: { flex: 1, paddingHorizontal: 16, paddingTop: pad.xxxxl },
  answersWrap: { width: "100%" },
  answersLabel: { color: C.text, fontSize: font.md, fontWeight: "700", textAlign: "center", marginBottom: 10, opacity: 0.85 },
  chipsRow: { flexDirection: "row", gap: 8 },
  chip: { paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  chipText: { color: C.text, fontSize: font.xl, fontWeight: "500", textAlign: "center" },
  goldBtn: { paddingVertical: 16, borderRadius: 50, backgroundColor: C.gold, alignItems: "center", shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10, marginBottom: 4 },
  goldBtnDisabled: { backgroundColor: "rgba(245,158,11,0.4)" },
  goldBtnText: { color: C.woodDark, fontSize: font.h3, fontWeight: "900", letterSpacing: 0.5, paddingHorizontal: pad.xl },
  secBtn: { width: "100%", borderRadius: 28, paddingVertical: 13, alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginTop: 4 },
  secBtnTxt: { fontSize: 14, fontWeight: "700", color: "#94A3B8" },
  card: { width: SW * 0.9, maxWidth: 420, backgroundColor: "rgba(10,22,40,0.97)", borderRadius: 28, borderWidth: 1.5, borderColor: C.goldBorder, padding: 24, alignItems: "center", shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 28, elevation: 14 },
  finalCard: { borderColor: "rgba(245,158,11,0.55)" },
  banner: { width: "100%", borderRadius: 14, overflow: "hidden", paddingVertical: 14, alignItems: "center", marginBottom: 16, borderWidth: 1.5, gap: 3 },
  bannerTxt: { fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  bannerSub: { fontSize: 11, fontWeight: "700", opacity: 0.8, letterSpacing: 1 },
  shimmer: { position: "absolute", top: 0, bottom: 0, width: 80, backgroundColor: "rgba(255,255,255,0.15)", transform: [{ skewX: "-18deg" }] },
  finalBanner: { width: "100%", borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1.5, borderColor: "rgba(245,158,11,0.45)", paddingVertical: 16, alignItems: "center", marginBottom: 14, gap: 4 },
  finalEmoji: { fontSize: 40 },
  finalGrade: { fontSize: 22, fontWeight: "900", color: C.gold, letterSpacing: 2, textShadowColor: "rgba(245,158,11,0.6)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  starsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  starEmoji: { fontSize: 36 },
  pillRow: { flexDirection: "row", gap: 10, marginBottom: 16, width: "100%" },
  pill: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 12, alignItems: "center", gap: 4 },
  pillLabel: { fontSize: 9, fontWeight: "900", color: "#475569", letterSpacing: 1.5 },
  pillVal: { fontSize: 22, fontWeight: "900" },
  breakdown: { width: "100%", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, gap: 8 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownLabel: { color: "#94A3B8", fontSize: 13, flex: 1 },
});
