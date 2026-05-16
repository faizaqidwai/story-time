/**
 * SceneDetectiveGame.jsx
 * ─────────────────────────────────────────────────────────────
 * "Scene Detective" — A description-practice game for StoryTime
 *
 * CHANGES:
 *  • bg.mp3 plays in a loop at volume 0.6 throughout the entire game
 *  • Option chips appear one-by-one: chip appears → TTS reads it → next chip appears
 *  • 4 wrong taps → round ends immediately
 *  • ⭐ floats from tapped chip up to score badge on correct tap
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  Image,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { font, pad, radius, size } from "../theme/tokens";
import { ImageBackground } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const MAX_WRONG = 4;

// ─────────────────────────────────────────────────────────────
// SOUND ASSETS
// ─────────────────────────────────────────────────────────────
const SOUNDS = {
  detectiveStart: require("../../assets/sounds/game/detective/bg.mp3"),
  sparkle: require("../../assets/sounds/fairy-sparkle.mp3"),
  clockTick: require("../../assets/sounds/game/clock-tick.mp3"),
  correctHit: require("../../assets/sounds/game/correct-hit.mp3"),
  wrongHit: require("../../assets/sounds/game/wrong-hit.mp3"),
  r1: require("../../assets/sounds/game/detective/r1.mp3"),
  r2: require("../../assets/sounds/game/detective/r2.mp3"),
  r3: require("../../assets/sounds/game/detective/r3.mp3"),
  r4: require("../../assets/sounds/game/detective/r4.mp3"),
  r5: require("../../assets/sounds/game/detective/r5.mp3"),
  win: require("../../assets/sounds/game/detective/win.mp3"),
  loose: require("../../assets/sounds/game/detective/loose.mp3"),
};

const ROUND_SOUNDS = [SOUNDS.r1, SOUNDS.r2, SOUNDS.r3, SOUNDS.r4, SOUNDS.r5];

async function playSoundTracked(file, { volume = 1.0 } = {}) {
  let soundObj = null;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    soundObj = sound;
    await sound.setVolumeAsync(volume);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (_) {}
  return async () => {
    if (soundObj) {
      try {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
      } catch (_) {}
    }
  };
}

async function playSound(file, { volume = 1.0 } = {}) {
  await playSoundTracked(file, { volume });
}

async function startLoopingSound(file, { volume = 0.4 } = {}) {
  let soundObj = null;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file, { isLooping: true });
    soundObj = sound;
    await sound.setVolumeAsync(volume);
    await sound.playAsync();
  } catch (_) {}
  return async () => {
    if (soundObj) {
      try {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
      } catch (_) {}
    }
  };
}

// ─────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0d1a",
  surface: "#1a1a2e",
  card: "#1e1e35",
  purple: "#b085f5",
  purpleLight: "#A855F7",
  purpleDim: "rgba(124,58,237,0.2)",
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  goldDim: "rgba(245,158,11,0.15)",
  green: "#10B981",
  greenLight: "#34D399",
  red: "#EF4444",
  redLight: "#FCA5A5",
  text: "#F1F5F9",
  textSec: "#94A3B8",
  textMuted: "#475569",
  neutral: "rgba(255,255,255,0.1)",
  border: "rgba(255,255,255,0.07)",
};

// ─────────────────────────────────────────────────────────────
// SCENES
// ─────────────────────────────────────────────────────────────
const SCENES = [
  {
    id: "s1",
    round: 1,
    title: "A Day in the Park",
    prompt:
      "Look carefully at the picture. Tap ALL the words that describe what you see!",
    category: "People & Feelings",
    categoryIcon: "👤",
    image: require("../../assets/games/scene-detective/scene_person_park.jpg"),
    imageFallbackEmoji: "🌳",
    imageFallbackBg: ["#1a472a", "#2d6a4f"],
    answers: [
      { id: "a1", word: "curly hair", correct: true },
      { id: "a2", word: "red dress", correct: true },
      { id: "a3", word: "happy", correct: true },
      { id: "a4", word: "yellow balloon", correct: true },
      { id: "a5", word: "sleeping dog", correct: true },
      { id: "a6", word: "sunny day", correct: true },
      { id: "a7", word: "blue hat", correct: false },
      { id: "a8", word: "crying", correct: false },
      { id: "a9", word: "rainy", correct: false },
      { id: "a10", word: "long coat", correct: false },
      { id: "a11", word: "straight hair", correct: false },
      { id: "a12", word: "green balloon", correct: false },
    ],
  },
  {
    id: "s2",
    round: 2,
    title: "The Messy Bedroom",
    prompt:
      "Something happened in this room! Tap every word that describes what you see.",
    category: "Places & Objects",
    categoryIcon: "🏠",
    image: require("../../assets/games/scene-detective/scene_bedroom_messy.jpg"),
    imageFallbackEmoji: "🛏️",
    imageFallbackBg: ["#3d2c8d", "#1a0533"],
    answers: [
      { id: "b1", word: "messy", correct: true },
      { id: "b2", word: "clothes on floor", correct: true },
      { id: "b3", word: "open window", correct: true },
      { id: "b4", word: "blue blanket", correct: true },
      { id: "b5", word: "broken toy", correct: true },
      { id: "b6", word: "drawings on wall", correct: true },
      { id: "b7", word: "tidy", correct: false },
      { id: "b8", word: "red blanket", correct: false },
      { id: "b9", word: "closed window", correct: false },
      { id: "b10", word: "empty toy box", correct: false },
      { id: "b11", word: "clean floor", correct: false },
      { id: "b12", word: "no drawings", correct: false },
    ],
  },
  {
    id: "s3",
    round: 3,
    title: "Birthday Party!",
    prompt: "What a fun party! Describe everything you can see.",
    category: "Events & Feelings",
    categoryIcon: "🎉",
    image: require("../../assets/games/scene-detective/scene_birthday_party.jpg"),
    imageFallbackEmoji: "🎂",
    imageFallbackBg: ["#7c1d6f", "#c2185b"],
    answers: [
      { id: "c1", word: "pink cake", correct: true },
      { id: "c2", word: "7 candles", correct: true },
      { id: "c3", word: "colorful balloons", correct: true },
      { id: "c4", word: "laughing", correct: true },
      { id: "c5", word: "wrapped gifts", correct: true },
      { id: "c6", word: "clown", correct: true },
      { id: "c7", word: "blue cake", correct: false },
      { id: "c8", word: "sad children", correct: false },
      { id: "c9", word: "10 candles", correct: false },
      { id: "c10", word: "no balloons", correct: false },
      { id: "c11", word: "open gifts", correct: false },
      { id: "c12", word: "robot", correct: false },
    ],
  },
  {
    id: "s4",
    round: 4,
    title: "A Rainy Day",
    prompt: "How does this place look and feel? Find all the describing words!",
    category: "Weather & Feelings",
    categoryIcon: "🌧️",
    image: require("../../assets/games/scene-detective/scene_rainy_day.jpg"),
    imageFallbackEmoji: "🌧️",
    imageFallbackBg: ["#1e3a5f", "#0a2340"],
    answers: [
      { id: "d1", word: "rainy", correct: true },
      { id: "d2", word: "red umbrella", correct: true },
      { id: "d3", word: "puddles", correct: true },
      { id: "d4", word: "cloudy sky", correct: true },
      { id: "d5", word: "wet leaves", correct: true },
      { id: "d6", word: "cat in window", correct: true },
      { id: "d7", word: "sunny", correct: false },
      { id: "d8", word: "blue umbrella", correct: false },
      { id: "d9", word: "dry ground", correct: false },
      { id: "d10", word: "clear sky", correct: false },
      { id: "d11", word: "dog in window", correct: false },
      { id: "d12", word: "snow", correct: false },
    ],
  },
  {
    id: "s5",
    round: 5,
    title: "The Cookie Mystery! 🕵️",
    prompt:
      "Something suspicious happened! Find the clues — tap what you see in the scene.",
    category: "Crime Scene (Fun!)",
    categoryIcon: "🔍",
    image: require("../../assets/games/scene-detective/scene_cookie_mystery.jpg"),
    imageFallbackEmoji: "🍪",
    imageFallbackBg: ["#78350f", "#451a03"],
    answers: [
      { id: "e1", word: "empty cookie jar", correct: true },
      { id: "e2", word: "muddy paw prints", correct: true },
      { id: "e3", word: "crumbs on counter", correct: true },
      { id: "e4", word: "dog hiding", correct: true },
      { id: "e5", word: "open window", correct: true },
      { id: "e6", word: "chair moved", correct: true },
      { id: "e7", word: "full cookie jar", correct: false },
      { id: "e8", word: "cat did it", correct: false },
      { id: "e9", word: "clean floor", correct: false },
      { id: "e10", word: "closed window", correct: false },
      { id: "e11", word: "no crumbs", correct: false },
      { id: "e12", word: "cookies on plate", correct: false },
    ],
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────
// FLOATING STAR
// ─────────────────────────────────────────────────────────────
function FloatingStar({ startX, startY, endX, endY, delay, onDone }) {
  const ax = useRef(new Animated.Value(startX)).current;
  const ay = useRef(new Animated.Value(startY)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(sc, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(ax, {
          toValue: endX,
          duration: 500 + Math.random() * 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ay, {
          toValue: endY,
          duration: 500 + Math.random() * 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() =>
      Animated.timing(op, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(onDone),
    );
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 26,
        height: 26,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        opacity: op,
        transform: [{ translateX: ax }, { translateY: ay }, { scale: sc }],
      }}
    >
      <Text style={{ fontSize: 20 }}>⭐</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// WRONG STRIKE INDICATORS
// ─────────────────────────────────────────────────────────────
function WrongStrikes({ wrongTaps, max = MAX_WRONG }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
      {Array.from({ length: max }, (_, i) => (
        <Text
          key={i}
          style={{ fontSize: 15, opacity: i < wrongTaps ? 1 : 0.22 }}
        >
          {i < wrongTaps ? "❌" : "🔍"}
        </Text>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCENE IMAGE with fallback
// ─────────────────────────────────────────────────────────────
function SceneImage({ scene }) {
  const [imgError, setImgError] = useState(false);
  if (imgError) {
    return (
      <View
        style={[
          styles.sceneFallback,
          { backgroundColor: scene.imageFallbackBg?.[0] || "#1a1a2e" },
        ]}
      >
        <Text style={{ fontSize: 64 }}>{scene.imageFallbackEmoji}</Text>
        <Text
          style={{
            color: C.textSec,
            fontSize: 13,
            marginTop: 8,
            textAlign: "center",
            paddingHorizontal: 20,
          }}
        >
          Place image at:{"\n"}
          <Text style={{ color: C.gold }}>
            assets/games/scene-detective/{scene.id}.jpg
          </Text>
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={scene.image}
      style={styles.sceneImage}
      resizeMode="stretch"
      onError={() => setImgError(true)}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// CHIP — animates in when mounted, shake on wrong tap
// ─────────────────────────────────────────────────────────────
function ChipWithLayout({ answer, state, onPress, disabled }) {
  const viewRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  // Reveal: chip pops in when it first mounts
  const revealOp = useRef(new Animated.Value(0)).current;
  const revealSc = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(revealOp, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(revealSc, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = useCallback(() => {
    if (disabled || state !== "idle") return;
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    if (!answer.correct) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 6,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -6,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 4,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }
    viewRef.current?.measureInWindow((x, y, w, h) => {
      onPress(answer, x + w / 2, y + h / 2);
    });
  }, [disabled, state, answer, onPress]);

  let bg = C.neutral,
    border = C.border,
    textColor = C.text;
  if (state === "correct") {
    bg = "rgba(16,185,129,0.25)";
    border = C.green;
    textColor = C.greenLight;
  }
  if (state === "wrong") {
    bg = "rgba(239,68,68,0.2)";
    border = C.red;
    textColor = C.redLight;
  }
  if (state === "missed") {
    bg = "rgba(245,158,11,0.2)";
    border = C.gold;
    textColor = C.goldLight;
  }

  return (
    <Animated.View
      ref={viewRef}
      style={{ opacity: revealOp, transform: [{ scale: revealSc }] }}
    >
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] }}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          disabled={disabled}
          style={[styles.chip, { backgroundColor: bg, borderColor: border }]}
        >
          <Text style={[styles.chipText, { color: textColor }]}>
            {answer.word}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN GAME
// ─────────────────────────────────────────────────────────────
export default function SceneDetectiveGame() {
  const router = useRouter();

  const [screen, setScreen] = useState("start");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [chipStates, setChipStates] = useState({});
  const [score, setScore] = useState(0);
  const [totalCorrectFound, setTotalCorrectFound] = useState(0);
  const [totalCorrectPossible, setTotalCorrectPossible] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [timeLeft, setTimeLeft] = useState(45);
  const [roundEndReason, setRoundEndReason] = useState(null);

  // ── visibleCount: how many chips are currently shown ──────
  // Starts at 0. We reveal one chip, speak it, then increment.
  const [visibleCount, setVisibleCount] = useState(0);
  const revealingRef = useRef(false); // prevents re-entry
  const revealStoppedRef = useRef(false); // set true when round ends mid-reveal

  const [floatingStars, setFloatingStars] = useState([]);
  const starIdRef = useRef(0);
  const scoreBadgePos = useRef({ x: SW - 80, y: 60 });

  const timerRef = useRef(null);
  const stopTickRef = useRef(null);
  const stopNarrationRef = useRef(null);
  const wrongTapsRef = useRef(0);
  const roundDoneRef = useRef(false);

  // BG music ref — loaded once, plays throughout
  const sndBgRef = useRef(null);

  const stopTick = useCallback(async () => {
    if (stopTickRef.current) {
      await stopTickRef.current();
      stopTickRef.current = null;
    }
  }, []);

  const stopNarration = useCallback(async () => {
    if (stopNarrationRef.current) {
      await stopNarrationRef.current();
      stopNarrationRef.current = null;
    }
  }, []);

  // Stop any ongoing chip-reveal speech chain
  const stopReveal = useCallback(() => {
    revealStoppedRef.current = true;
    Speech.stop();
  }, []);

  // ── Load bg music on mount ────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch (_) {}
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/game/detective/bg.mp3"),
          { shouldPlay: true, isLooping: true, volume: 0.6 },
        );
        if (alive) sndBgRef.current = sound;
        else sound.unloadAsync();
      } catch (e) {
        console.log("[SceneDetective] bg music error:", e);
      }
    })();
    return () => {
      alive = false;
      sndBgRef.current?.unloadAsync().catch(() => {});
      sndBgRef.current = null;
      stopReveal();
      stopTick();
      stopNarration();
    };
  }, []);

  // detective-start narration on mount (one-shot, separate from looping bg)
  useEffect(() => {
    playSoundTracked(SOUNDS.detectiveStart).then((fn) => {
      stopNarrationRef.current = fn;
    });
  }, []);

  useEffect(() => {
    if (screen !== "start") return;
    const t = setTimeout(() => {
      playSound(SOUNDS.sparkle);
      setupRound(0);
      setSceneIndex(0);
      setScreen("round_intro");
    }, 60000);
    return () => clearTimeout(t);
  }, [screen]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scorePopAnim = useRef(new Animated.Value(0)).current;
  const scorePopY = useRef(new Animated.Value(0)).current;
  const [scorePopVal, setScorePopVal] = useState(0);
  const [showScorePop, setShowScorePop] = useState(false);

  const currentScene = SCENES[sceneIndex];
  const correctAnswers = currentScene?.answers.filter((a) => a.correct) || [];

  useEffect(() => {
    stopNarration();
    stopReveal();
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    if (screen === "round_intro") {
      const roundSound = ROUND_SOUNDS[sceneIndex];
      if (roundSound)
        playSoundTracked(roundSound).then((fn) => {
          stopNarrationRef.current = fn;
        });
    }
    if (screen === "round_result") {
      const found = Object.values(chipStates).filter(
        (s) => s === "correct",
      ).length;
      const total = (SCENES[sceneIndex]?.answers.filter((a) => a.correct) || [])
        .length;
      const stars =
        found / total >= 1 && wrongTaps === 0
          ? 3
          : found / total >= 0.7 && wrongTaps <= 2
            ? 2
            : 1;
      playSound(stars >= 2 ? SOUNDS.win : SOUNDS.loose);
    }
  }, [screen]);

  const setupRound = useCallback((idx) => {
    const scene = SCENES[idx];
    const answers = shuffle(scene.answers);
    setShuffledAnswers(answers);
    const states = {};
    answers.forEach((a) => {
      states[a.id] = "idle";
    });
    setChipStates(states);
    setRoundDone(false);
    roundDoneRef.current = false;
    setWrongTaps(0);
    wrongTapsRef.current = 0;
    setTimeLeft(90);
    setRoundEndReason(null);
    setFloatingStars([]);
    // Reset chip reveal
    setVisibleCount(0);
    revealingRef.current = false;
    revealStoppedRef.current = false;
  }, []);

  const endRound = useCallback(
    (reason, scene) => {
      if (roundDoneRef.current) return;
      roundDoneRef.current = true;
      setRoundDone(true);
      clearInterval(timerRef.current);
      stopTick();
      stopReveal(); // stop chip-reveal chain immediately
      setRoundEndReason(reason);
      setChipStates((prev) => {
        const next = { ...prev };
        scene.answers.forEach((a) => {
          if (a.correct && next[a.id] === "idle") next[a.id] = "missed";
        });
        return next;
      });
      setTimeout(
        () => setScreen("round_result"),
        reason === "complete" ? 800 : 1200,
      );
    },
    [stopTick, stopReveal],
  );

  useEffect(() => {
    if (screen !== "playing") {
      clearInterval(timerRef.current);
      stopTick();
      return;
    }
    startLoopingSound(SOUNDS.clockTick, { volume: 0.35 }).then((fn) => {
      stopTickRef.current = fn;
    });
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endRound("time", currentScene);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  // ── Sequential chip reveal ────────────────────────────────
  // When screen becomes "playing", start the chain from index 0.
  // Each step: show chip N → speak it → when speech done → show chip N+1 → ...
  useEffect(() => {
    if (screen !== "playing" || shuffledAnswers.length === 0) return;
    // Reset and kick off the chain
    revealStoppedRef.current = false;
    revealingRef.current = false;
    setVisibleCount(0);

    // Small initial delay so the playing screen has rendered before we start
    const initTimer = setTimeout(() => {
      revealNext(0, shuffledAnswers);
    }, 400);

    return () => {
      clearTimeout(initTimer);
      revealStoppedRef.current = true;
      Speech.stop();
    };
  }, [screen, shuffledAnswers]);

  // Reveal chip at `index`, speak it, then move to next
  const revealNext = useCallback((index, answers) => {
    if (revealStoppedRef.current) return;
    if (index >= answers.length) return; // all chips shown

    // Show chip N
    setVisibleCount(index + 1);

    // Speak the word — onDone triggers the next chip
    Speech.speak(answers[index].word, {
      language: "en-US",
      rate: 0.85,
      pitch: 1.1,
      onDone: () => {
        if (revealStoppedRef.current) return;
        // Small gap between chips
        const t = setTimeout(() => {
          revealNext(index + 1, answers);
        }, 800);
      },
      onError: () => {
        if (revealStoppedRef.current) return;
        // If TTS fails, still proceed
        const t = setTimeout(() => {
          revealNext(index + 1, answers);
        }, 800);
      },
    });
  }, []);

  const badgeScale = useRef(new Animated.Value(1)).current;
  const pulseBadge = useCallback(() => {
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1.45,
        friction: 3,
        tension: 800,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 4,
        tension: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [badgeScale]);

  const spawnStar = useCallback(
    (cx, cy) => {
      const newStars = Array.from({ length: 4 }, (_, i) => ({
        id: starIdRef.current++,
        startX: cx - 13 + (Math.random() - 0.5) * 20,
        startY: cy - 13 + (Math.random() - 0.5) * 20,
        endX: scoreBadgePos.current.x,
        endY: scoreBadgePos.current.y,
        delay: i * 70,
      }));
      setFloatingStars((prev) => [...prev, ...newStars]);
      setTimeout(pulseBadge, 350);
    },
    [pulseBadge],
  );

  const removeStar = useCallback(
    (id) => setFloatingStars((prev) => prev.filter((s) => s.id !== id)),
    [],
  );

  const handleChipPress = useCallback(
    (answer, chipX, chipY) => {
      if (roundDoneRef.current) return;
      setChipStates((prev) => ({
        ...prev,
        [answer.id]: answer.correct ? "correct" : "wrong",
      }));

      if (answer.correct) {
        playSound(SOUNDS.correctHit);
        spawnStar(chipX ?? SW / 2, chipY ?? SH / 2);
        const pts = 15;
        setScore((s) => s + pts);
        setTotalCorrectFound((f) => f + 1);
        setScorePopVal(pts);
        setShowScorePop(true);
        scorePopAnim.setValue(1);
        scorePopY.setValue(0);
        Animated.parallel([
          Animated.timing(scorePopAnim, {
            toValue: 0,
            duration: 900,
            delay: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scorePopY, {
            toValue: -40,
            duration: 900,
            useNativeDriver: true,
          }),
        ]).start(() => setShowScorePop(false));

        setChipStates((prev) => {
          const allFound = currentScene.answers
            .filter((a) => a.correct)
            .every((a) => prev[a.id] === "correct" || a.id === answer.id);
          if (allFound) {
            setScore((s) => s + 20);
            endRound("complete", currentScene);
          }
          return prev;
        });
      } else {
        playSound(SOUNDS.wrongHit);
        setScore((s) => Math.max(0, s - 5));
        const newWrong = wrongTapsRef.current + 1;
        wrongTapsRef.current = newWrong;
        setWrongTaps(newWrong);
        if (newWrong >= MAX_WRONG) endRound("strikes", currentScene);
      }
    },
    [currentScene, endRound, spawnStar],
  );

  const calcStars = useCallback((found, total, wrong) => {
    if (found / total >= 1 && wrong === 0) return 3;
    if (found / total >= 0.7 && wrong <= 2) return 2;
    return 1;
  }, []);

  const handleNextRound = useCallback(() => {
    playSound(SOUNDS.sparkle);
    const found = Object.values(chipStates).filter(
      (s) => s === "correct",
    ).length;
    const total = correctAnswers.length;
    const stars = calcStars(found, total, wrongTaps);
    setRoundScores((rs) => [...rs, { found, total, wrong: wrongTaps, stars }]);
    setTotalCorrectPossible((p) => p + total);
    if (sceneIndex + 1 < SCENES.length) {
      setSceneIndex((i) => {
        const next = i + 1;
        setupRound(next);
        return next;
      });
      setScreen("round_intro");
    } else {
      setScreen("final");
    }
  }, [
    chipStates,
    correctAnswers,
    wrongTaps,
    sceneIndex,
    calcStars,
    setupRound,
  ]);

  // ─────────────────────────────────────────────────────────────
  // SCREEN: START
  // ─────────────────────────────────────────────────────────────
  if (screen === "start") {
    return (
      <ImageBackground
        source={require("../../assets/games/scene-detective/cover.jpg")}
        resizeMode="stretch"
        style={StyleSheet.absoluteFill}
      >
        <View style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          <Animated.View
            style={[
              styles.centered,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.startMagnifier}>
              <Text style={{ fontSize: 80 }}>🔍</Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: "135%" }]}
              onPress={() => {
                playSound(SOUNDS.sparkle);
                setupRound(0);
                setSceneIndex(0);
                setScreen("round_intro");
              }}
            >
              <Text style={styles.primaryBtnText}>🔍 INVESTIGATE!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: ROUND INTRO
  // ─────────────────────────────────────────────────────────────
  if (screen === "round_intro") {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <Animated.View
          style={[
            styles.centered,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.roundIntroNum}>
            Round {currentScene.round} of {SCENES.length}
          </Text>
          <Text style={styles.roundIntroTitle}>{currentScene.title}</Text>
          <Text style={styles.roundIntroCategory}>
            {currentScene.categoryIcon} {currentScene.category}
          </Text>
          <View style={styles.roundIntroCard}>
            <Text style={styles.roundIntroHint}>🔍 Your Mission:</Text>
            <Text style={styles.roundIntroPrompt}>{currentScene.prompt}</Text>
          </View>
          <View style={styles.roundIntroTips}>
            <Text style={styles.roundIntroTipTitle}>
              Tips for good detectives:
            </Text>
            <Text style={styles.roundIntroTip}>
              • Look at colors, shapes, and expressions
            </Text>
            <Text style={styles.roundIntroTip}>
              • Check the background, not just the main subject
            </Text>
            <Text style={styles.roundIntroTip}>
              • Only tap what you can actually SEE!
            </Text>
            <Text
              style={[
                styles.roundIntroTip,
                { color: C.redLight, marginTop: 6 },
              ]}
            >
              ⚠️ {MAX_WRONG} wrong taps and the round ends!
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              stopNarration();
              playSound(SOUNDS.sparkle);
              setScreen("playing");
            }}
          >
            <Text style={styles.primaryBtnText}>🔍 Investigate!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: PLAYING
  // ─────────────────────────────────────────────────────────────
  if (screen === "playing") {
    const foundCount = Object.values(chipStates).filter(
      (s) => s === "correct",
    ).length;
    const timerPct = timeLeft / 45;
    const timerColor = timeLeft > 20 ? C.green : timeLeft > 10 ? C.gold : C.red;

    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.gameHeader}>
          <View style={styles.gameHeaderInner}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text
                style={{ fontSize: 20, color: "#fff", paddingHorizontal: 10 }}
              >
                ✕
              </Text>
            </TouchableOpacity>
            <Text style={styles.sceneTitleBadge}>{currentScene.title}</Text>
            <Animated.View
              style={[
                styles.scoreBadge,
                { transform: [{ scale: badgeScale }] },
              ]}
              onLayout={(e) => {
                e.target.measureInWindow((x, y, w, h) => {
                  scoreBadgePos.current = {
                    x: x + w / 2 - 13,
                    y: y + h / 2 - 13,
                  };
                });
              }}
            >
              <Text style={styles.scoreText}>⭐ {score}</Text>
            </Animated.View>
          </View>
          <View style={styles.timerBarBg}>
            <View
              style={[
                styles.timerBarFill,
                { width: `${timerPct * 100}%`, backgroundColor: timerColor },
              ]}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 2,
              marginTop: 5,
            }}
          >
            <Text style={[styles.timerText, { color: timerColor }]}>
              ⏱ {timeLeft}s
            </Text>
            <WrongStrikes wrongTaps={wrongTaps} max={MAX_WRONG} />
          </View>
        </SafeAreaView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.sceneImageContainer}>
            <SceneImage scene={currentScene} />
          </View>
          <View style={styles.sceneFoundBadgeRow}>
            <Text style={styles.sceneFoundBadge}>
              Found {foundCount}/{correctAnswers.length} clues
            </Text>
          </View>
          <Text style={styles.playingPrompt}>{currentScene.prompt}</Text>

          {/* Only render chips up to visibleCount — new chips pop in + speak sequentially */}
          <View style={styles.chipsGrid}>
            {shuffledAnswers.slice(0, visibleCount).map((answer) => (
              <ChipWithLayout
                key={answer.id}
                answer={answer}
                state={chipStates[answer.id] || "idle"}
                onPress={handleChipPress}
                disabled={roundDone}
              />
            ))}
          </View>
        </ScrollView>

        {showScorePop && (
          <Animated.View
            style={[
              styles.scorePop,
              { opacity: scorePopAnim, transform: [{ translateY: scorePopY }] },
            ]}
          >
            <Text style={styles.scorePopText}>+{scorePopVal}</Text>
          </Animated.View>
        )}

        {floatingStars.map((star) => (
          <FloatingStar
            key={star.id}
            startX={star.startX}
            startY={star.startY}
            endX={star.endX}
            endY={star.endY}
            delay={star.delay}
            onDone={() => removeStar(star.id)}
          />
        ))}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: ROUND RESULT
  // ─────────────────────────────────────────────────────────────
  if (screen === "round_result") {
    const found = Object.values(chipStates).filter(
      (s) => s === "correct",
    ).length;
    const total = correctAnswers.length;
    const stars = calcStars(found, total, wrongTaps);
    const isWin = stars >= 2;
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.overlayBg}>
          <RoundResultCard
            stars={stars}
            isWin={isWin}
            found={found}
            total={total}
            wrongTaps={wrongTaps}
            score={score}
            endReason={roundEndReason}
            missedAnswers={currentScene.answers.filter(
              (a) => a.correct && chipStates[a.id] !== "correct",
            )}
            isLast={sceneIndex + 1 >= SCENES.length}
            onNext={handleNextRound}
          />
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: FINAL
  // ─────────────────────────────────────────────────────────────
  if (screen === "final") {
    const totalStars = roundScores.reduce((s, r) => s + r.stars, 0);
    const maxStars = SCENES.length * 3;
    const isMaster = totalStars >= maxStars * 0.85;
    const grade = isMaster
      ? "Master Detective"
      : totalStars >= maxStars * 0.6
        ? "Great Detective"
        : totalStars >= maxStars * 0.4
          ? "Good Detective"
          : "Detective Trainee";
    const gradeEmoji = isMaster
      ? "🏆"
      : totalStars >= maxStars * 0.6
        ? "🥇"
        : totalStars >= maxStars * 0.4
          ? "🥈"
          : "🔍";
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.overlayBg}>
          <FinalCard
            grade={grade}
            gradeEmoji={gradeEmoji}
            isMaster={isMaster}
            score={score}
            totalStars={totalStars}
            maxStars={maxStars}
            roundScores={roundScores}
            onReplay={() => {
              setScore(0);
              setTotalCorrectFound(0);
              setTotalCorrectPossible(0);
              setRoundScores([]);
              setSceneIndex(0);
              setupRound(0);
              setScreen("start");
            }}
            onExit={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// ROUND RESULT CARD
// ─────────────────────────────────────────────────────────────
function RoundResultCard({
  stars,
  isWin,
  found,
  total,
  wrongTaps,
  score,
  endReason,
  missedAnswers,
  isLast,
  onNext,
}) {
  const sc = useRef(new Animated.Value(0.65)).current;
  const op = useRef(new Animated.Value(0)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    [
      [s1, 280],
      [s2, 430],
      [s3, 580],
    ].forEach(([v, d]) =>
      Animated.sequence([
        Animated.delay(d),
        Animated.spring(v, {
          toValue: 1,
          friction: 3,
          tension: 130,
          useNativeDriver: true,
        }),
      ]).start(),
    );
    if (isWin) {
      Animated.loop(
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(shimX, {
            toValue: 320,
            duration: 1300,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(shimX, {
            toValue: -200,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, []);

  const accentColor = isWin ? C.gold : C.red;
  const accentDim = isWin ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.1)";
  const accentBorder = isWin ? "rgba(245,158,11,0.45)" : "rgba(239,68,68,0.35)";
  const bannerLabel =
    endReason === "strikes"
      ? "💀 Too Many Wrong Guesses!"
      : endReason === "time"
        ? "⏱ Time's Up!"
        : stars === 3
          ? "🕵️ Amazing Detective!"
          : stars === 2
            ? "👍 Good Work!"
            : "💪 Keep Trying!";

  return (
    <Animated.View
      style={[
        styles.resultCard,
        { borderColor: accentBorder, opacity: op, transform: [{ scale: sc }] },
      ]}
    >
      <View
        style={[
          styles.resultBanner,
          { backgroundColor: accentDim, borderColor: accentBorder },
        ]}
      >
        {isWin && (
          <Animated.View
            pointerEvents="none"
            style={[styles.shimmer, { transform: [{ translateX: shimX }] }]}
          />
        )}
        <Text style={[styles.resultBannerText, { color: accentColor }]}>
          {bannerLabel}
        </Text>
      </View>
      <View style={styles.starsRow}>
        {[s1, s2, s3].map((s, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.starEmoji,
              { transform: [{ scale: s }], opacity: i < stars ? s : 0.18 },
            ]}
          >
            ⭐
          </Animated.Text>
        ))}
      </View>
      <View style={styles.statsPillRow}>
        <View
          style={[
            styles.statsPill,
            {
              borderColor: "rgba(16,185,129,0.5)",
              backgroundColor: "rgba(16,185,129,0.1)",
            },
          ]}
        >
          <Text style={styles.statsPillLabel}>FOUND</Text>
          <Text style={[styles.statsPillVal, { color: C.green }]}>
            {found}/{total}
          </Text>
        </View>
        <View
          style={[
            styles.statsPill,
            {
              borderColor: "rgba(239,68,68,0.45)",
              backgroundColor: "rgba(239,68,68,0.08)",
            },
          ]}
        >
          <Text style={styles.statsPillLabel}>WRONG</Text>
          <Text style={[styles.statsPillVal, { color: C.red }]}>
            {wrongTaps}
          </Text>
        </View>
        <View
          style={[
            styles.statsPill,
            {
              borderColor: "rgba(245,158,11,0.45)",
              backgroundColor: "rgba(245,158,11,0.08)",
            },
          ]}
        >
          <Text style={styles.statsPillLabel}>SCORE</Text>
          <Text style={[styles.statsPillVal, { color: C.gold }]}>{score}</Text>
        </View>
      </View>
      {missedAnswers.length > 0 && (
        <View style={styles.missedBox}>
          <Text style={styles.missedTitle}>Missed clues:</Text>
          <Text style={styles.missedWords}>
            {missedAnswers.map((a) => a.word).join("  •  ")}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.resultBtn,
          {
            backgroundColor: isWin ? C.purple : C.purpleLight,
            shadowColor: C.purple,
          },
        ]}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={styles.resultBtnText}>
          {isLast ? "See Final Score 🏆" : "Next Scene →"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// FINAL CARD
// ─────────────────────────────────────────────────────────────
function FinalCard({
  grade,
  gradeEmoji,
  isMaster,
  score,
  totalStars,
  maxStars,
  roundScores,
  onReplay,
  onExit,
}) {
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
      Animated.spring(sc, {
        toValue: 1,
        friction: 4,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    stars.forEach((s, i) =>
      Animated.sequence([
        Animated.delay(300 + i * 150),
        Animated.spring(s, {
          toValue: 1,
          friction: 3,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start(),
    );
    Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(shimX, {
          toValue: 320,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimX, {
          toValue: -200,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const filledStars = Math.round((totalStars / maxStars) * 3);
  return (
    <Animated.View
      style={[
        styles.resultCard,
        styles.finalCard,
        { opacity: op, transform: [{ scale: sc }] },
      ]}
    >
      <View style={styles.finalBanner}>
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, { transform: [{ translateX: shimX }] }]}
        />
        <Text style={styles.finalBannerEmoji}>{gradeEmoji}</Text>
        <Text style={styles.finalBannerText}>{grade.toUpperCase()}</Text>
      </View>
      <View style={styles.starsRow}>
        {stars.map((s, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.starEmoji,
              {
                transform: [{ scale: s }],
                opacity: i < filledStars ? s : 0.18,
              },
            ]}
          >
            ⭐
          </Animated.Text>
        ))}
      </View>
      <View style={styles.statsPillRow}>
        <View
          style={[
            styles.statsPill,
            {
              borderColor: "rgba(124,58,237,0.5)",
              backgroundColor: "rgba(124,58,237,0.1)",
            },
          ]}
        >
          <Text style={styles.statsPillLabel}>SCORE</Text>
          <Text style={[styles.statsPillVal, { color: C.purpleLight }]}>
            {score}
          </Text>
        </View>
        <View
          style={[
            styles.statsPill,
            {
              borderColor: "rgba(245,158,11,0.45)",
              backgroundColor: "rgba(245,158,11,0.08)",
            },
          ]}
        >
          <Text style={styles.statsPillLabel}>STARS</Text>
          <Text style={[styles.statsPillVal, { color: C.gold }]}>
            ⭐ {totalStars}/{maxStars}
          </Text>
        </View>
      </View>
      <View style={styles.roundBreakdown}>
        {roundScores.map((r, i) => (
          <View key={i} style={styles.roundBreakdownRow}>
            <Text style={styles.roundBreakdownLabel} numberOfLines={1}>
              {SCENES[i]?.categoryIcon} Scene {i + 1}
            </Text>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1, 2, 3].map((s) => (
                <Text
                  key={s}
                  style={{ fontSize: 13, opacity: s <= r.stars ? 1 : 0.18 }}
                >
                  ⭐
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[
          styles.resultBtn,
          { backgroundColor: C.purple, shadowColor: C.purple },
        ]}
        onPress={onReplay}
        activeOpacity={0.85}
      >
        <Text style={styles.resultBtnText}>🔁 Play Again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.resultBtnSecondary}
        onPress={onExit}
        activeOpacity={0.75}
      >
        <Text style={styles.resultBtnSecText}>✕ Exit</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    marginTop: "30%",
  },
  startMagnifier: {
    position: "absolute",
    top: 20,
    right: 20,
    opacity: 0.08,
    transform: [{ rotate: "-15deg" }],
  },
  roundIntroNum: {
    fontSize: font.lg,
    color: C.purpleLight,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 15,
  },
  roundIntroCategory: {
    fontSize: font.xl,
    color: C.gold,
    fontWeight: "700",
    marginBottom: pad.xl,
  },
  roundIntroTitle: {
    fontSize: font.h2,
    fontWeight: "900",
    color: C.text,
    textAlign: "center",
    marginTop: pad.xxl,
    marginBottom: 4,
  },
  roundIntroCard: {
    backgroundColor: C.purpleDim,
    borderRadius: 16,
    padding: 18,
    width: "100%",
    borderWidth: 1,
    borderColor: C.purple,
    marginBottom: 16,
  },
  roundIntroHint: {
    fontSize: font.xl,
    color: C.purpleLight,
    fontWeight: "700",
    marginBottom: 6,
  },
  roundIntroPrompt: { fontSize: font.lg, color: C.text, lineHeight: 24 },
  roundIntroTips: {
    width: "100%",
    marginBottom: 28,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  roundIntroTipTitle: {
    color: C.gold,
    fontWeight: "700",
    fontSize: font.lg,
    marginBottom: 6,
  },
  roundIntroTip: { color: C.textSec, fontSize: font.md, lineHeight: 22 },
  gameHeader: {
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  gameHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 8,
  },
  sceneTitleBadge: { color: "#fff", fontWeight: "800", fontSize: font.xl },
  scoreBadge: {
    backgroundColor: C.goldDim,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.gold,
  },
  scoreText: { color: C.goldLight, fontSize: 14, fontWeight: "800" },
  timerBarBg: {
    height: 5,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  timerBarFill: { height: "100%", borderRadius: 4 },
  timerText: { fontSize: 12, fontWeight: "700" },
  sceneImageContainer: { width: SW, height: SW * 0.65 },
  sceneImage: { width: "100%", height: "100%" },
  sceneFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sceneFoundBadgeRow: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 10,
  },
  sceneFoundBadge: { color: C.goldLight, fontWeight: "700", fontSize: font.md },
  playingPrompt: {
    color: C.textSec,
    fontSize: font.lg,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: pad.md,
    lineHeight: 21,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 20,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    gap: 2,
  },
  chipText: { fontSize: font.xl, fontWeight: "500", color: C.text },
  scorePop: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    backgroundColor: C.gold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  scorePopText: { color: "#1a1a2e", fontWeight: "900", fontSize: font.md },
  overlayBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8,8,26,0.84)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
  },
  resultCard: {
    width: SW * 0.9,
    maxWidth: 420,
    backgroundColor: "rgba(26,26,46,0.97)",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.4)",
    padding: 24,
    alignItems: "center",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 14,
  },
  finalCard: { borderColor: "rgba(245,158,11,0.45)", shadowColor: C.gold },
  resultBanner: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "rgba(255,255,255,0.15)",
    transform: [{ skewX: "-18deg" }],
  },
  resultBannerText: {
    fontSize: font.xl,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  finalBanner: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.45)",
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
    gap: 4,
  },
  finalBannerEmoji: { fontSize: 36 },
  finalBannerText: {
    fontSize: font.xl,
    fontWeight: "900",
    color: C.gold,
    letterSpacing: 2,
    textShadowColor: "rgba(245,158,11,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  starsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  starEmoji: { fontSize: 36 },
  statsPillRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    width: "100%",
  },
  statsPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statsPillLabel: {
    fontSize: font.sm,
    fontWeight: "900",
    color: C.textMuted,
    letterSpacing: 1.5,
  },
  statsPillVal: { fontSize: font.lg, fontWeight: "900" },
  missedBox: {
    width: "100%",
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  missedTitle: {
    color: C.gold,
    fontWeight: "700",
    fontSize: font.lg,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  missedWords: { color: C.text, fontSize: font.lg, lineHeight: 20 },
  roundBreakdown: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  roundBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundBreakdownLabel: { color: C.textSec, fontSize: 13, flex: 1 },
  resultBtn: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  resultBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.4,
  },
  resultBtnSecondary: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  resultBtnSecText: { fontSize: 14, fontWeight: "700", color: C.textSec },
  primaryBtn: {
    backgroundColor: C.purple,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: font.xxl, fontWeight: "900" },
  closeBtn: { padding: 12 },
  closeBtnText: { color: "#fefefe", fontSize: font.md, fontWeight: "600" },
});
