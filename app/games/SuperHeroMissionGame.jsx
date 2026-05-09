/**
 * SuperHeroMissionGame.jsx
 *
 * Superhero flies horizontally (fixed position) while the city scrolls past —
 * exactly like FlappyWordGame's bird passing clouds and buildings.
 *
 * MECHANICS:
 *  - Hero is fixed at x=22%, y=28% of screen
 *  - City buildings scroll RIGHT → LEFT at constant speed (same loop as FlappyWord)
 *  - Each building carries a word on its rooftop panel
 *  - Player taps a building → hero fires a glowing red laser at it
 *  - Laser animates (growing width, rotated View, like MonkeyFishing string)
 *  - After laser reaches the building, a comic-book FLASH appears (sharp-edged burst)
 *  - Correct word → flash + stars fly to badge + score
 *  - Wrong word  → flash + penalty notification
 *  - 5 rounds, 90s each, same word sets as MonkeyFishingGame
 *
 * REGISTER IN _layout.jsx:
 *   <Stack.Screen name="SuperHeroMissionGame"
 *     options={{headerShown:false, animation:"slide_from_bottom", gestureEnabled:false}}/>
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { font, pad, radius, size } from "../theme/tokens";
import * as Speech from "expo-speech";
import { Image } from "react-native";
import * as Device from "expo-device";
import { Dimensions } from "react-native";
import { ImageBackground } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

const isTablet =
  Device.deviceType === Device.DeviceType.TABLET || Math.min(SW, SH) >= 768;

// ─── SCREEN / LAYOUT ─────────────────────────────────────────────────────────
const STATUS_H =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;
const TICK_MS = 16; // ~60 fps game loop

// Hero is fixed on screen — city scrolls past it
// (Same concept as FlappyWord: bird is fixed X, background moves)
const HERO_X_FRAC = 0.22; // 22% from left
const HERO_Y_FRAC = 0.3; // 30% from top
const HERO_W = 72; // hero sprite width
const HERO_H = 52; // hero sprite height

// Building scroll speed (matches FlappyWord BG_SPEED_BUILDING=1.2, but faster for gameplay)
const BUILDING_SCROLL_SPEED = 2.0;
const CLOUD_SCROLL_SPEED = 0.7;
const GROUND_SCROLL_SPEED = 2.0;

// Building dimensions
const BUILDING_W_MIN = 70;
const BUILDING_W_MAX = 100;
const BUILDING_GAP = 220; // horizontal gap between buildings

// Word panel on top of each building
const WORD_PANEL_H = 48;

// Laser travel time (ms) — grows from hero to building like MonkeyFishing string
const LASER_TRAVEL_MS = 280;
// Flash appears after laser arrives
const FLASH_APPEAR_DELAY = LASER_TRAVEL_MS + 40;
// Flash lasts
const FLASH_DURATION_MS = 600;

// Scoring
const POINTS_CORRECT = 15;
const POINTS_WRONG = -5;
const POINTS_MISSED = -3;

// Round timer
const ROUND_SECONDS = 90;

const CARD_W = isTablet ? Math.min(SW * 0.65, 700) : SW - 32;

const CARD_H = isTablet ? Math.min(SH * 0.75, 800) : undefined; // let it grow naturally on mobile

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#08081a",
  bgMid: "#0d0d28",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.18)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.15)",
  yellowBorder: "rgba(255,213,79,0.6)",
  red: "#FF1744",
  redDim: "rgba(255,23,68,0.18)",
  redBorder: "rgba(255,23,68,0.75)",
  green: "#00E676",
  greenDim: "rgba(0,230,118,0.18)",
  greenBorder: "rgba(0,230,118,0.75)",
  heroBlue: "#1565C0",
  heroDark: "#0D47A1",
  heroGold: "#FFD740",
  heroCape: "#C62828",
  cloud: "rgba(160,200,255,0.13)",
  cloudBorder: "rgba(180,220,255,0.09)",
  building: "rgba(20,35,80,0.90)",
  buildingEdge: "rgba(0,188,212,0.28)",
  windowOn: "rgba(255,213,79,0.65)",
  windowOff: "rgba(255,213,79,0.06)",
  ground: "#080c1a",
  groundLine: "rgba(0,188,212,0.5)",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
  white: "#FFFFFF",
};

// ─── Expo- Male Voice ───────────────────────────────────────────────────────────────────
const getMaleVoice = async () => {
  const voices = await Speech.getAvailableVoicesAsync();

  // Debug: see all voices
  console.log(voices);

  // Try to find a male English voice
  const maleVoice = voices.find(
    (v) =>
      v.language.startsWith("en") &&
      (v.name.toLowerCase().includes("male") ||
        v.identifier.toLowerCase().includes("male")),
  );

  return maleVoice?.identifier;
};

// ─── ROUNDS ───────────────────────────────────────────────────────────────────
const ROUNDS = [
  {
    id: 1,
    category: "Size",
    emoji: "📏",
    briefing:
      'Blast buildings with SIZE words!\n"big", "tall", "huge" are size words.',
    targetWords: [
      "big",
      "small",
      "tall",
      "short",
      "huge",
      "tiny",
      "wide",
      "narrow",
      "large",
      "little",
    ],
    distractWords: [
      "happy",
      "run",
      "blue",
      "jump",
      "fast",
      "loud",
      "sweet",
      "cold",
      "sing",
      "red",
    ],
  },
  {
    id: 2,
    category: "Colors",
    emoji: "🌈",
    briefing:
      'Blast buildings with COLOR words!\n"red", "blue", "green" are color words.',
    targetWords: [
      "red",
      "blue",
      "green",
      "yellow",
      "pink",
      "purple",
      "orange",
      "black",
      "white",
      "brown",
    ],
    distractWords: [
      "big",
      "run",
      "loud",
      "jump",
      "happy",
      "slow",
      "soft",
      "round",
      "shiny",
      "cold",
    ],
  },
  {
    id: 3,
    category: "Animals",
    emoji: "🐾",
    briefing:
      "Blast buildings with ANIMAL words!\nDog, cat, lion — animal names.",
    targetWords: [
      "dog",
      "cat",
      "lion",
      "tiger",
      "bird",
      "frog",
      "bear",
      "wolf",
      "duck",
      "fish",
    ],
    distractWords: [
      "apple",
      "run",
      "blue",
      "table",
      "happy",
      "fast",
      "jump",
      "cloud",
      "red",
      "warm",
    ],
  },
  {
    id: 4,
    category: "Feelings",
    emoji: "💛",
    briefing:
      'Blast buildings with FEELING words!\n"happy", "sad", "brave" — feelings.',
    targetWords: [
      "happy",
      "sad",
      "angry",
      "scared",
      "excited",
      "tired",
      "proud",
      "silly",
      "calm",
      "brave",
    ],
    distractWords: [
      "dog",
      "green",
      "run",
      "table",
      "big",
      "cloud",
      "fast",
      "apple",
      "blue",
      "swim",
    ],
  },
  {
    id: 5,
    category: "Actions",
    emoji: "⚡",
    briefing:
      'Blast buildings with ACTION words!\n"run", "jump", "fly" — action words.',
    targetWords: [
      "run",
      "jump",
      "swim",
      "fly",
      "sing",
      "dance",
      "eat",
      "sleep",
      "climb",
      "read",
    ],
    distractWords: [
      "big",
      "red",
      "dog",
      "table",
      "happy",
      "cloud",
      "apple",
      "blue",
      "shiny",
      "soft",
    ],
  },
];

//////////////////// expo speaking///////////
const speakBriefing = async () => {
  const voice = await getMaleVoice();

  Speech.speak("Blast the building with size words! Big, tall, huge!", {
    voice: voice, // may be undefined if not found
    pitch: 0.8, // lower pitch = more masculine tone
    rate: 0.9,
  });
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => _uid++;
const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const buildQueue = (r) =>
  shuffle([
    ...shuffle(r.targetWords)
      .slice(0, 10)
      .map((w) => ({ word: w, isTarget: true })),
    ...shuffle(r.distractWords)
      .slice(0, 10)
      .map((w) => ({ word: w, isTarget: false })),
  ]);

// ─── OBJECT FACTORIES ─────────────────────────────────────────────────────────
function makeCloud(sw, sh, startOffscreen = true) {
  const w = 80 + Math.random() * 130;
  const h = 30 + Math.random() * 50;
  return {
    id: uid(),
    type: "cloud",
    x: startOffscreen ? sw + Math.random() * 200 : Math.random() * sw,
    y: STATUS_H + 20 + Math.random() * (sh * 0.4),
    w,
    h,
    speed: CLOUD_SCROLL_SPEED,
  };
}

function makeBuilding(sw, sh, word, isTarget, startOffscreen = true) {
  const bw = Math.max(BUILDING_W_MIN, word.length * 11 + 32);
  const bh = sh * (0.32 + Math.random() * 0.22); // 32%–54% of screen height
  return {
    id: uid(),
    type: "building",
    x: startOffscreen ? sw + 20 + Math.random() * 60 : Math.random() * sw,
    y: sh - bh, // always sits on ground
    w: bw,
    h: bh,
    speed: BUILDING_SCROLL_SPEED,
    word,
    isTarget,
    hit: false, // has the player tapped this?
    blasted: false, // flash shown?
  };
}

// ─── SUPERHERO COMPONENT ─────────────────────────────────────────────────────
// Horizontally-stretched body, face looking toward screen (toward right = direction of flight)
// Cape streams behind (left side), fist punches forward (right side)
// Rendered as a composite of Views — no images needed
function SuperHero({ x, y }) {
  const cape = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.5)).current;
  const punch = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cape flutter
    Animated.loop(
      Animated.sequence([
        Animated.timing(cape, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cape, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    // Hero glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    ).start();
    // Fist pump
    Animated.loop(
      Animated.sequence([
        Animated.timing(punch, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(punch, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const capeSkew = cape.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "8deg"],
  });
  const punchX = punch.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x - HERO_W / 2,
        top: y - HERO_H / 2,
        width: HERO_W + 30, // extra for cape overhang
        height: HERO_H + 20,
        zIndex: 90,
      }}
    >
      {/* === CAPE (streams behind hero = left side) === */}
      <Animated.View
        style={{
          position: "absolute",
          left: 10,
          top: 5,
          width: 60,
          height: 36,
          backgroundColor: C.heroCape,
          borderTopRightRadius: 4,
          borderBottomRightRadius: 18,
          borderBottomLeftRadius: 8,
          transform: [{ skewY: capeSkew }],
          shadowColor: C.heroCape,
          shadowOffset: { width: -2, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 6,
        }}
      />

      {/* === BODY (torso — horizontally wide) === */}
      <View
        style={{
          position: "absolute",
          left: 22,
          top: 12,
          width: HERO_W - 8,
          height: 28,
          backgroundColor: C.heroBlue,
          borderRadius: 6,
          borderWidth: 2.5,
          borderColor: C.teal,
          shadowColor: C.teal,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* S Emblem */}
        <View
          style={{
            position: "absolute",
            left: "50%",
            marginLeft: -20,
            top: 4,
            width: 24,
            height: 20,
            borderRadius: 10,
            backgroundColor: C.heroGold,
            borderWidth: 2,
            borderColor: "#E65100",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "900",
              color: C.heroDark,
              lineHeight: 16,
            }}
          >
            S
          </Text>
        </View>
      </View>

      {/* === LEGS (two parallel rectangles) === */}
      <View
        style={{
          position: "absolute",
          left: 10,
          top: 18,
          gap: 6,
          // backgroundColor: "pink",
        }}
      >
        <View
          style={{
            width: 14,
            height: 16,
            backgroundColor: C.heroDark,
            borderRadius: 3,
            borderWidth: 1.5,
            borderColor: C.teal,
          }}
        />
        {/* <View style={{width:14, height:16, backgroundColor:C.heroDark, borderRadius:3, borderWidth:1.5, borderColor:C.teal}}/> */}
      </View>

      {/* === HEAD (face looking RIGHT = forward direction) === */}
      <View
        style={{
          position: "absolute",
          left: HERO_W - 12,
          top: 4,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "#FFCCBC",
          borderWidth: 2.5,
          borderColor: C.teal,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: C.teal,
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 6,
          elevation: 6,
          overflow: "hidden",
        }}
      >
        {/* Hair */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 11,
            backgroundColor: "#4A148C",
            borderTopLeftRadius: 17,
            borderTopRightRadius: 17,
          }}
        />
        {/* Mask over eyes */}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 2,
            right: 2,
            height: 9,
            backgroundColor: "#1565C0",
            borderRadius: 4,
            opacity: 0.85,
          }}
        />
        {/* Eye whites */}
        <View
          style={{
            position: "absolute",
            top: 11,
            left: 6,
            width: 9,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#FFF",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 11,
            right: 6,
            width: 9,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#FFF",
          }}
        />
        {/* Pupils */}
        <View
          style={{
            position: "absolute",
            top: 13,
            left: 9,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#111",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 13,
            right: 9,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#111",
          }}
        />
        {/* Jaw / chin */}
        <View
          style={{
            position: "absolute",
            bottom: 3,
            left: 8,
            right: 8,
            height: 7,
            backgroundColor: "#FFCCBC",
            borderRadius: 4,
          }}
        />
        {/* Smile line */}
        <View
          style={{
            position: "absolute",
            bottom: 5,
            left: 11,
            right: 11,
            height: 1.5,
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 1,
          }}
        />
      </View>

      {/* === PUNCHING FIST (right side — direction of laser fire) === */}
      <Animated.View
        style={{
          position: "absolute",
          right: 0,
          top: 18,
          width: 18,
          height: 16,
          borderRadius: 8,
          backgroundColor: "#FFCCBC",
          borderWidth: 2,
          borderColor: C.heroCape,
          shadowColor: C.red,
          shadowOffset: { width: 3, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 8,
          transform: [{ translateX: punchX }],
        }}
      />

      {/* === GLOW AURA (Animated — JS driver) === */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: -5,
          width: HERO_W + 45,
          height: HERO_H + 12,
          borderRadius: 8,
          backgroundColor: `rgba(0,188,212,0.15)`,
          opacity: glow,
        }}
      />
    </View>
  );
}

// ─── LASER BEAM ───────────────────────────────────────────────────────────────
// Glowing red line that grows from hero fist to building word panel
// Uses same rotated-View technique as MonkeyFishing fishing string
function LaserBeam({ fromX, fromY, toX, toY, onArrived }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  useEffect(() => {
    const arrivedCalled = { done: false };
    // Phase 1: grow from hero to target
    Animated.timing(progress, {
      toValue: length,
      duration: LASER_TRAVEL_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !arrivedCalled.done) {
        arrivedCalled.done = true;
        onArrived?.();
        // Phase 2: hold briefly then fade
        setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }).start();
        }, 80);
      }
    });
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: fromX,
        top: fromY - 4,
        height: 8,
        width: progress,
        borderRadius: 4,
        backgroundColor: C.red,
        opacity,
        zIndex: 150,
        // Glow effect
        shadowColor: C.red,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 12,
        // Rotate around left origin (from hero)
        transformOrigin: "0% 50%",
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

// ─── COMIC FLASH ─────────────────────────────────────────────────────────────
// Sharp-edged starburst that appears overlapping building from the top
// Straight-line borders, comic-book style — NOT rounded circles
function ComicFlash({ cx, topY, isCorrect, onDone }) {
  const sc = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 3,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(rot, {
        toValue: 1,
        duration: FLASH_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(FLASH_DURATION_MS * 0.55),
        Animated.timing(op, {
          toValue: 0,
          duration: FLASH_DURATION_MS * 0.45,
          useNativeDriver: true,
        }),
      ]),
    ]).start(onDone);
  }, []);

  const rotate = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "20deg"],
  });
  const flashColor = isCorrect ? "#FFD740" : "#FF5252";
  const innerColor = isCorrect ? "#FFF176" : "#FFCDD2";
  const borderColor = isCorrect ? "#E65100" : "#B71C1C";
  const SIZE = 130;
  // 8 sharp spike points for the comic starburst
  const SPIKES = 8;

  // Build spike polygon using border-trick Views rotated around centre
  const spikeAngles = Array.from(
    { length: SPIKES },
    (_, i) => (360 / SPIKES) * i,
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: cx - SIZE / 2,
        top: topY - SIZE * 0.35, // overlaps building from top
        width: SIZE,
        height: SIZE,
        zIndex: 200,
        alignItems: "center",
        justifyContent: "center",
        opacity: op,
        transform: [{ scale: sc }, { rotate }],
      }}
    >
      {/* Base octagon / diamond shape */}
      <View
        style={{
          width: SIZE * 0.72,
          height: SIZE * 0.72,
          backgroundColor: flashColor,
          borderWidth: 3,
          borderColor: borderColor,
          transform: [{ rotate: "45deg" }],
          position: "absolute",
          shadowColor: flashColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 20,
          elevation: 12,
        }}
      />

      {/* Second diamond rotated 22.5deg for 8-pointed star */}
      <View
        style={{
          width: SIZE * 0.65,
          height: SIZE * 0.65,
          backgroundColor: flashColor,
          borderWidth: 2.5,
          borderColor: borderColor,
          transform: [{ rotate: "22.5deg" }],
          position: "absolute",
        }}
      />

      {/* Horizontal bar — sharp edge */}
      <View
        style={{
          position: "absolute",
          width: SIZE * 0.9,
          height: SIZE * 0.28,
          backgroundColor: flashColor,
          borderTopWidth: 3,
          borderBottomWidth: 3,
          borderColor: borderColor,
        }}
      />

      {/* Vertical bar — sharp edge */}
      <View
        style={{
          position: "absolute",
          width: SIZE * 0.28,
          height: SIZE * 0.9,
          backgroundColor: flashColor,
          borderLeftWidth: 3,
          borderRightWidth: 3,
          borderColor: borderColor,
        }}
      />

      {/* Inner bright core */}
      <View
        style={{
          position: "absolute",
          width: SIZE * 0.38,
          height: SIZE * 0.38,
          backgroundColor: innerColor,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: borderColor,
          transform: [{ rotate: "15deg" }],
        }}
      />

      {/* Text label */}
      <Text
        style={{
          position: "absolute",
          fontSize: isCorrect ? 14 : 12,
          fontWeight: "900",
          color: borderColor,
          textAlign: "center",
          letterSpacing: 0.5,
          zIndex: 10,
        }}
      >
        {isCorrect ? "POW!" : "MISS!"}
      </Text>
    </Animated.View>
  );
}

// ─── FLYING STAR ─────────────────────────────────────────────────────────────
function FlyingStar({ startX, startY, endX, endY, delay, onDone }) {
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
          duration: 60,
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
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ay, {
          toValue: endY,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() =>
      Animated.timing(op, {
        toValue: 0,
        duration: 80,
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
        zIndex: 999,
        opacity: op,
        transform: [{ translateX: ax }, { translateY: ay }, { scale: sc }],
      }}
    >
      <Text style={{ fontSize: 22 }}>⭐</Text>
    </Animated.View>
  );
}

// ─── CLOUD SHAPE ─────────────────────────────────────────────────────────────
function CloudShape({ x, y, w, h }) {
  return (
    <View
      style={{ position: "absolute", left: x, top: y, width: w, height: h }}
      pointerEvents="none"
    >
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: w * 0.1,
          width: w * 0.8,
          height: h * 0.6,
          borderRadius: h * 0.3,
          backgroundColor: C.cloud,
          borderWidth: 1,
          borderColor: C.cloudBorder,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: h * 0.3,
          left: 0,
          width: w * 0.45,
          height: h * 0.55,
          borderRadius: h * 0.28,
          backgroundColor: C.cloud,
          borderWidth: 1,
          borderColor: C.cloudBorder,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: h * 0.3,
          right: w * 0.05,
          width: w * 0.4,
          height: h * 0.5,
          borderRadius: h * 0.25,
          backgroundColor: C.cloud,
          borderWidth: 1,
          borderColor: C.cloudBorder,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: w * 0.28,
          width: w * 0.44,
          height: h * 0.6,
          borderRadius: h * 0.3,
          backgroundColor: C.cloud,
          borderWidth: 1,
          borderColor: C.cloudBorder,
        }}
      />
    </View>
  );
}

// ─── SCROLLING BUILDING (with word panel on top) ──────────────────────────────
function ScrollingBuilding({ b, sw, sh, onTap }) {
  // b = {id, x, y, w, h, word, isTarget, hit, blasted}
  const winCols = Math.floor(b.w / 22);
  const winRows = Math.floor((b.h - WORD_PANEL_H - 16) / 22);

  return (
    <TouchableOpacity
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w, // here i want building size according to words:  b.word.length
        height: b.h,
        zIndex: 50,
      }}
      onPress={() => onTap(b.id)}
      activeOpacity={0.85}
    >
      {/* Building body */}
      <View
        style={{
          flex: 1,
          backgroundColor: C.building,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          borderWidth: 1.5,
          borderColor: C.buildingEdge,
          overflow: "hidden",
        }}
      >
        {/* Windows grid */}
        {Array.from({ length: winRows }, (_, r) => (
          <View
            key={r}
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              paddingHorizontal: 6,
              marginTop: r === 0 ? WORD_PANEL_H + 10 : 5,
            }}
          >
            {Array.from({ length: winCols }, (_, c) => (
              <View
                key={c}
                style={{
                  width: (b.w - 20) / winCols - 2,
                  height: 10,
                  backgroundColor: (r + c) % 3 === 0 ? C.windowOn : C.windowOff,
                  borderRadius: 1,
                }}
              />
            ))}
          </View>
        ))}

        {/* Rooftop antenna */}
        <View
          style={{
            position: "absolute",
            top: -20,
            left: b.w / 2 - 2,
            width: 4,
            height: 24,
            backgroundColor: "rgba(0,188,212,0.45)",
            borderRadius: 2,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: -28,
            left: b.w / 2 - 6,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: C.red,
            shadowColor: C.red,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 4,
          }}
        />
      </View>

      {/* Word panel — glowing on very top of building */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: WORD_PANEL_H,
          backgroundColor: "rgba(6,8,24,0.97)",
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          borderWidth: 2,
          borderColor: b.hit ? "rgba(255,23,68,0.5)" : "rgba(0,188,212,0.8)",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: b.hit ? C.red : C.teal,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <Text
          style={{
            fontSize: Math.min(font.lg, 120 / b.word.length),
            fontWeight: "900",
            color: C.white,
            letterSpacing: 0.3,
            textAlign: "center",
          }}
        >
          {b.word}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── GROUND STRIPE ────────────────────────────────────────────────────────────
function GroundStripe({ sw, sh, offsetX }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        backgroundColor: C.ground,
        borderTopWidth: 2,
        borderTopColor: C.groundLine,
        zIndex: 20,
      }}
    >
      {/* Dashes */}
      {Array.from({ length: 20 }, (_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: i * 80 + (offsetX % 80) - 80,
            top: 10,
            width: 50,
            height: 3,
            backgroundColor: "rgba(0,188,212,0.25)",
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
}

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────
function Notif({ text, color, icon, sw, sh, onDone }) {
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.5)).current;
  const ty = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(op, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: -16,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(onDone);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: sw * 0.08,
        right: sw * 0.08,
        bottom: sh * 0.1,
        zIndex: 500,
        opacity: op,
        transform: [{ scale: sc }, { translateY: ty }],
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(6,8,24,0.97)",
          borderRadius: 18,
          borderWidth: 2.5,
          borderColor: color,
          paddingVertical: 12,
          paddingHorizontal: 18,
          alignItems: "center",
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 18,
          elevation: 14,
        }}
      >
        <Text style={{ fontSize: 24, marginBottom: 3 }}>{icon}</Text>
        <Text
          style={{
            fontSize: font.lg,
            fontWeight: "900",
            color,
            textAlign: "center",
          }}
        >
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function Hud({ round, timeLeft, score, onExit, badgeScale }) {
  return (
    <View style={st.hud}>
      <TouchableOpacity
        style={st.exitBtn}
        onPress={onExit}
        activeOpacity={0.8}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={st.exitTxt}>✕</Text>
      </TouchableOpacity>
      <View style={st.hudCenter}>
        <Text style={st.hudCat}>
          {round.emoji} {round.category}
        </Text>
        <Text style={[st.hudTime, timeLeft <= 10 && { color: C.red }]}>
          {timeLeft}s
        </Text>
      </View>
      <Animated.View
        style={[st.scorePill, { transform: [{ scale: badgeScale }] }]}
      >
        <Text style={st.scoreTxt}>⭐ {score}</Text>
      </Animated.View>
    </View>
  );
}

// ─── IDLE OVERLAY ─────────────────────────────────────────────────────────────
function IdleOverlay({ onStart, onExit, sw, sh }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const introSound = useRef(null);
  const laserSound = useRef(null);
  const heroWidth = isTablet ? SW * 0.3 : 190;
  const heroHeight = isTablet
    ? SH * 0.25 // 👈 key fix (use screen height)
    : 200;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  useEffect(() => {
    let isMounted = true;

    const loadAndPlayIntro = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/game/super-hero-mission/intro.mp3"),
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        introSound.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.log("Intro sound error", e);
      }
    };

    loadAndPlayIntro();

    return () => {
      isMounted = false;
      introSound.current?.unloadAsync();
      laserSound.current?.unloadAsync();
    };
  }, []);
  useEffect(() => {
    const loadLaser = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/game/super-hero-mission/laser.mp3"),
        );
        laserSound.current = sound;
      } catch (e) {
        console.log("Laser load error", e);
      }
    };

    loadLaser();
  }, []);

  useEffect(() => {
    // Float up/down
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Scale (breathing effect)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <ImageBackground
      source={require("../../assets/games/super-hero-mission/intro.jpg")}
      style={st.overlayBg}
      resizeMode="stretch"
    >
      <TouchableOpacity
        style={st.topExit}
        onPress={onExit}
        activeOpacity={0.8}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={st.exitTxt}>✕</Text>
      </TouchableOpacity>
      <View style={{ alignItems: "center", width: "100%" }}>
        <View style={{ marginTop: "25%", alignItems: "center" }}>
          <Animated.Image
            source={require("../../assets/games/super-hero-mission/super-hero.png")}
            style={{
              width: heroWidth,
              height: heroHeight,
              resizeMode: "contain",

              // 👇 animations go here
              transform: [{ translateY: floatAnim }, { scale: scaleAnim }],

              // 👇 glow effect goes here
              shadowColor: "#00E5FF",
              shadowOpacity: 0.8,
              shadowRadius: 12,
              elevation: 10,
              //  backgroundColor: "pink",
            }}
          />
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <TouchableOpacity
              style={st.redBtn}
              onPress={async () => {
                try {
                  await introSound.current?.stopAsync();

                  if (laserSound.current) {
                    await laserSound.current.setPositionAsync(0);
                    await laserSound.current.playAsync();
                  }
                } catch (e) {}

                setTimeout(() => {
                  onStart();
                }, 800);
              }}
              activeOpacity={0.85}
            >
              <Text style={st.redBtnText}>⚡ START MISSION</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </ImageBackground>
  );
}
const buildSpeechText = (round) => {
  const sample = round.targetWords.slice(0, 3).join(", ");
  return `Blast the buildings with ${round.category} words! ${sample}!`;
};
// ─── MISSION BRIEFING ─────────────────────────────────────────────────────────
function MissionBriefing({ round, onStart, onExit }) {
  const slide = useRef(new Animated.Value(60)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const laserSound = useRef(null);
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  useEffect(() => {
    const speak = async () => {
      const voices = await Speech.getAvailableVoicesAsync();

      const maleVoice = voices.find(
        (v) =>
          v.language.startsWith("en") &&
          (v.name.toLowerCase().includes("male") ||
            v.identifier.toLowerCase().includes("male")),
      );

      Speech.speak(buildSpeechText(round), {
        voice: maleVoice?.identifier,
        pitch: 0.8,
        rate: 0.9,
      });
    };

    speak();

    return () => {
      Speech.stop();
    };
  }, [round]);

  useEffect(() => {
    let mounted = true;

    const loadLaser = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/game/super-hero-mission/laser.mp3"),
        );
        laserSound.current = sound;
      } catch (e) {
        console.log("Laser load error", e);
      }
    };

    loadLaser();
  }, []);
  return (
    <ImageBackground
      source={require("../../assets/games/super-hero-mission/intro.jpg")}
      style={st.overlayBg}
      resizeMode="cover"
    >
      <View style={st.lightoverlayBg}>
        <TouchableOpacity
          style={st.topExit}
          onPress={onExit}
          activeOpacity={0.8}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={st.exitTxt}>✕</Text>
        </TouchableOpacity>
        <Animated.View
          style={[
            st.card,
            { transform: [{ translateY: slide }], opacity: fade },
          ]}
        >
          <View style={st.classifiedHeader}>
            <Text style={st.classifiedTxt}>📋 MISSION BRIEFING</Text>
          </View>
          <View style={st.roundBadge}>
            <Text style={st.roundBadgeText}>
              Mission {round.id} of {ROUNDS.length}
            </Text>
          </View>
          <Text style={{ fontSize: 40, marginBottom: 6 }}>{round.emoji}</Text>
          <Text style={st.cardTitle}>{round.category} Words</Text>
          <Text style={st.cardDesc}>{round.briefing}</Text>
          <Text
            style={{
              color: C.textSec,
              fontSize: font.md,
              fontWeight: "700",
              marginBottom: 8,
              letterSpacing: 1,
            }}
          >
            TARGET WORDS:
          </Text>
          <View style={st.chipRow}>
            {round.targetWords.slice(0, 8).map((w) => (
              <View key={w} style={st.chip}>
                <Text style={st.chipText}>{w}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[st.redBtn, { width: "100%" }]}
            onPress={async () => {
              try {
                if (laserSound?.current) {
                  await laserSound.current.setPositionAsync(0);
                  await laserSound.current.playAsync();
                }
              } catch (e) {}

              setTimeout(() => {
                onStart();
              }, 700);
            }}
            activeOpacity={0.85}
          >
            <Text style={st.redBtnText}>🚀 Launch Mission!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

// ─── RESULT OVERLAY (black + gold DodgeCar style) ────────────────────────────
function ResultOverlay({ score, caught, missed, isLast, onNext, onExit }) {
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-220)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  const stars = caught >= 8 ? 3 : caught >= 5 ? 2 : 1;
  const title =
    stars === 3
      ? "Excellent Agent!"
      : stars === 2
        ? "Good Work!"
        : "Keep Training!";
  const emoji = stars === 3 ? "🏆" : stars === 2 ? "🥈" : "🎖️";

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    [
      [s1, 300],
      [s2, 480],
      [s3, 660],
    ].forEach(([s, d]) =>
      Animated.sequence([
        Animated.delay(d),
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
        Animated.delay(700),
        Animated.timing(shimX, {
          toValue: 340,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimX, {
          toValue: -220,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={st.overlayBg}>
      <Animated.View
        style={[st.resultCard, { opacity: op, transform: [{ scale: sc }] }]}
      >
        <View style={st.resultBanner}>
          <Animated.View
            pointerEvents="none"
            style={[st.resultShimmer, { transform: [{ translateX: shimX }] }]}
          />
          <Text style={st.resultBannerText}>
            {emoji} {title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {[s1, s2, s3].map((s, i) => (
            <Animated.Text
              key={i}
              style={[
                { fontSize: font.xl },
                i >= stars && { opacity: 0.15 },
                { transform: [{ scale: s }] },
              ]}
            >
              ⭐
            </Animated.Text>
          ))}
        </View>
        <View style={st.statRow}>
          <View style={st.statPill}>
            <Text style={st.statLabel}>BLASTED</Text>
            <Text style={[st.statVal, { color: C.green }]}>{caught}</Text>
          </View>
          <View style={st.statPill}>
            <Text style={st.statLabel}>MISSED</Text>
            <Text style={[st.statVal, { color: C.red }]}>{missed}</Text>
          </View>
          <View style={st.statPill}>
            <Text style={st.statLabel}>SCORE</Text>
            <Text style={[st.statVal, { color: C.yellow }]}>{score}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[st.goldBtn, { marginBottom: 10 }]}
          onPress={onNext}
          activeOpacity={0.85}
        >
          <Text style={st.goldBtnText}>
            {isLast ? "🏆 Final Score!" : "⚡  Next Mission"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={st.secondaryBtn}
          onPress={onExit}
          activeOpacity={0.75}
        >
          <Text style={st.secondaryBtnText}>✕ Abort Mission</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── FINAL OVERLAY ────────────────────────────────────────────────────────────
function FinalOverlay({ totalScore, onRestart, onExit }) {
  const grade =
    totalScore >= 300
      ? "Supreme Agent! 🏆"
      : totalScore >= 180
        ? "Elite Agent! 🌟"
        : "Rookie Agent 🎖️";
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const shimX = useRef(new Animated.Value(-220)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    [
      [s1, 300],
      [s2, 480],
      [s3, 660],
    ].forEach(([s, d]) =>
      Animated.sequence([
        Animated.delay(d),
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
        Animated.delay(700),
        Animated.timing(shimX, {
          toValue: 340,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimX, {
          toValue: -220,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.96,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={st.overlayBg}>
      <Animated.View
        style={[
          st.resultCard,
          st.finalCard,
          { opacity: op, transform: [{ scale: sc }] },
        ]}
      >
        <View style={[st.resultBanner, st.finalBanner]}>
          <Animated.View
            pointerEvents="none"
            style={[st.resultShimmer, { transform: [{ translateX: shimX }] }]}
          />
          <Text style={st.resultBannerText}>🏆 All Missions Complete!</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          {[s1, s2, s3].map((s, i) => (
            <Animated.Text
              key={i}
              style={{ fontSize: 32, transform: [{ scale: s }] }}
            >
              ⭐
            </Animated.Text>
          ))}
        </View>
        <Text
          style={{
            color: C.yellow,
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          {grade}
        </Text>
        <View style={[st.statRow, { width: "100%" }]}>
          <View style={[st.statPill, st.totalPill]}>
            <Text style={st.statLabel}>TOTAL SCORE</Text>
            <Text style={[st.statVal, { color: C.yellow, fontSize: 36 }]}>
              {totalScore}
            </Text>
          </View>
        </View>
        <Animated.View
          style={{
            transform: [{ scale: pulse }],
            width: "100%",
            marginBottom: 10,
          }}
        >
          <TouchableOpacity
            style={st.goldBtn}
            onPress={onRestart}
            activeOpacity={0.85}
          >
            <Text style={st.goldBtnText}>⚡ New Mission!</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={st.secondaryBtn}
          onPress={onExit}
          activeOpacity={0.75}
        >
          <Text style={st.secondaryBtnText}>✕ Exit Game</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function SuperHeroMissionGame({ onExit }) {
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();

  // Hero fixed position
  const HERO_X = sw * HERO_X_FRAC;
  const HERO_Y = sh * HERO_Y_FRAC;
  // Laser fires from hero's right fist
  const LASER_FROM_X = HERO_X + HERO_W / 2 + 14;
  const LASER_FROM_Y = HERO_Y + 8;

  // ── Game state ────────────────────────────────────────────
  const [phase, setPhase] = useState("idle");
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);

  // Rendered display lists
  const [buildings, setBuildings] = useState([]);
  const [clouds, setClouds] = useState([]);
  const [groundX, setGroundX] = useState(0);

  // Overlay effects (laser, flash, stars, notif)
  const [laser, setLaser] = useState(null); // {fromX,fromY,toX,toY,id}
  const [flash, setFlash] = useState(null); // {cx,topY,isCorrect,id}
  const [stars, setStars] = useState([]);
  const [notif, setNotif] = useState(null);

  // ── Refs (mutable game state — no re-render on change) ────
  const phaseRef = useRef("idle");
  const scoreRef = useRef(0);
  const caughtRef = useRef(0);
  const missedRef = useRef(0);
  const buildingsRef = useRef([]); // source of truth for scroll loop
  const cloudsRef = useRef([]);
  const groundXRef = useRef(0);
  const queueRef = useRef([]);
  const queueIdxRef = useRef(0);
  const tickRef = useRef(0);
  const clockRef = useRef(null);
  const loopRef = useRef(null);
  const starIdRef = useRef(0);
  const firingRef = useRef(false); // prevent rapid double-fire
  const badgeScale = useRef(new Animated.Value(1)).current;
  const badgePosRef = useRef({ x: sw - 55, y: STATUS_H + 12 });
  const renderRef = useRef(null);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    caughtRef.current = caught;
  }, [caught]);
  useEffect(() => {
    missedRef.current = missed;
  }, [missed]);

  // ── Sounds ────────────────────────────────────────────────
  const sndCorrect = useRef(null);
  const sndWrong = useRef(null);
  const sndWin = useRef(null);
  const sndLose = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch (_) {}
      for (const [ref, asset] of [
        [
          sndCorrect,
          require("../../assets/sounds/game/super-hero-mission/laser.mp3"),
        ],
        [sndWrong, require("../../assets/sounds/game/wrong-hit.mp3")],
        [sndWin, require("../../assets/sounds/game/win.mp3")],
        [sndLose, require("../../assets/sounds/game/lose.mp3")],
      ]) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset);
          if (alive) ref.current = sound;
          else sound.unloadAsync();
        } catch (_) {}
      }
    })();
    return () => {
      alive = false;
      [sndCorrect, sndWrong, sndWin, sndLose].forEach((r) => {
        r.current?.unloadAsync();
        r.current = null;
      });
    };
  }, []);
  const laserSound = useRef(null);
  useEffect(() => {
    let mounted = true;

    const loadLaser = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/game/super-hero-mission/laser.mp3"),
        );

        if (mounted) {
          laserSound.current = sound;
        } else {
          sound.unloadAsync();
        }
      } catch (e) {
        console.log("Laser load error", e);
      }
    };

    loadLaser();

    return () => {
      mounted = false;
      laserSound.current?.unloadAsync();
    };
  }, []);

  const playSound = (r) => {
    try {
      r.current?.setPositionAsync(0).then(() => r.current?.playAsync());
    } catch (_) {}
  };

  const pulseBadge = () => {
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1.45,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const spawnStars = (tx, ty) => {
    const bp = badgePosRef.current;
    const newStars = Array.from({ length: 6 }, (_, i) => ({
      id: starIdRef.current++,
      startX: tx - 13,
      startY: ty - 13,
      endX: bp.x,
      endY: bp.y,
      delay: i * 65,
    }));
    setStars((prev) => [...prev, ...newStars]);
    setTimeout(pulseBadge, 420);
  };

  // ── Batch render (same pattern as FlappyWordGame) ─────────
  const scheduleRender = useCallback(() => {
    if (renderRef.current) return;
    renderRef.current = setTimeout(() => {
      renderRef.current = null;
      setBuildings([...buildingsRef.current]);
      setClouds([...cloudsRef.current]);
      setGroundX(groundXRef.current);
    }, 0);
  }, []);

  // ── Build initial scene ────────────────────────────────────
  const buildInitialScene = useCallback(
    (queueItems) => {
      // Pre-populate clouds scattered across screen
      cloudsRef.current = Array.from({ length: 6 }, () =>
        makeCloud(sw, sh, false),
      );

      // Pre-populate a few buildings already on screen
      // Space them out with proper gaps
      const initialBuildings = [];
      let nextX = sw * 0.6;
      for (let i = 0; i < 3 && i < queueItems.length; i++) {
        const item = queueItems[i];
        const bw = Math.max(BUILDING_W_MIN, item.word.length * 11 + 32);
        const bh = sh * (0.32 + Math.random() * 0.22);
        initialBuildings.push({
          id: uid(),
          type: "building",
          x: nextX,
          y: sh - bh - 28,
          w: bw,
          h: bh,
          speed: BUILDING_SCROLL_SPEED,
          word: item.word,
          isTarget: item.isTarget,
          hit: false,
          blasted: false,
        });
        nextX += bw + BUILDING_GAP;
      }
      buildingsRef.current = initialBuildings;
      queueIdxRef.current = initialBuildings.length;
    },
    [sw, sh],
  );

  // ── Game tick ─────────────────────────────────────────────
  // Mirrors FlappyWordGame tick: scroll objects, respawn off-screen ones
  const tick = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    tickRef.current++;

    // Scroll clouds
    cloudsRef.current = cloudsRef.current.map((c) => {
      const nx = c.x - c.speed;
      if (nx + c.w < 0) return makeCloud(sw, sh, true);
      return { ...c, x: nx };
    });

    // Scroll ground
    groundXRef.current =
      (groundXRef.current - GROUND_SCROLL_SPEED + sw * 2) % (sw * 2);

    // Scroll buildings
    const newBuildings = buildingsRef.current.map((b) => ({
      ...b,
      x: b.x - b.speed,
    }));

    // Remove buildings that scrolled fully off-screen
    const visible = newBuildings.filter((b) => b.x + b.w > -10);

    // Check if we need to spawn more buildings from the queue
    const rightmost =
      visible.length > 0 ? Math.max(...visible.map((b) => b.x + b.w)) : sw;

    // Spawn next building when there's room on screen
    if (rightmost < sw + 20 && queueIdxRef.current < queueRef.current.length) {
      const item = queueRef.current[queueIdxRef.current];
      queueIdxRef.current++;
      const bw = Math.max(BUILDING_W_MIN, item.word.length * 11 + 32);
      const bh = sh * (0.32 + Math.random() * 0.22);
      const spawnX = Math.max(rightmost + BUILDING_GAP, sw + 40);
      visible.push({
        id: uid(),
        type: "building",
        x: spawnX,
        y: sh - bh - 28,
        w: bw,
        h: bh,
        speed: BUILDING_SCROLL_SPEED,
        word: item.word,
        isTarget: item.isTarget,
        hit: false,
        blasted: false,
      });
    }

    buildingsRef.current = visible;

    // Check if all buildings from queue have scrolled off → round over
    if (
      queueIdxRef.current >= queueRef.current.length &&
      visible.length === 0
    ) {
      endRound();
      return;
    }

    scheduleRender();
  }, [sw, sh, scheduleRender]);

  // ── End round ─────────────────────────────────────────────
  const endRound = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "result";
    clearInterval(clockRef.current);
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    setLastResult({
      score: scoreRef.current,
      caught: caughtRef.current,
      missed: missedRef.current,
    });
    setPhase("result");
    playSound(scoreRef.current >= 0 ? sndWin : sndLose);
  }, []);

  // ── Start round ───────────────────────────────────────────
  const startRound = useCallback(
    (idx) => {
      const round = ROUNDS[idx];
      const q = buildQueue(round);
      queueRef.current = q;
      queueIdxRef.current = 0;
      scoreRef.current = 0;
      caughtRef.current = 0;
      missedRef.current = 0;
      tickRef.current = 0;
      firingRef.current = false;

      setScore(0);
      setCaught(0);
      setMissed(0);
      setLaser(null);
      setFlash(null);
      setStars([]);
      setNotif(null);
      setTimeLeft(ROUND_SECONDS);

      buildInitialScene(q);
      scheduleRender();

      phaseRef.current = "playing";
      setPhase("playing");

      // Countdown timer
      clearInterval(clockRef.current);
      clockRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            endRound();
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      // Game loop
      if (loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(tick, TICK_MS);
    },
    [buildInitialScene, scheduleRender, tick, endRound],
  );

  // Keep loop in sync with phase
  useEffect(() => {
    if (phase === "playing") {
      if (loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(tick, TICK_MS);
    } else {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
    }
    return () => {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
    };
  }, [phase, tick]);

  useEffect(
    () => () => {
      if (loopRef.current) clearInterval(loopRef.current);
      clearInterval(clockRef.current);
    },
    [],
  );

  // ── Handle building tap ────────────────────────────────────
  const handleBuildingTap = useCallback(
    (buildingId) => {
      if (phaseRef.current !== "playing") return;
      if (firingRef.current) return; // debounce rapid taps
      firingRef.current = true;

      // Find building in current ref
      const b = buildingsRef.current.find((b) => b.id === buildingId);
      if (!b || b.hit) {
        firingRef.current = false;
        return;
      }

      // Mark as hit immediately (prevents double-tap)
      buildingsRef.current = buildingsRef.current.map((x) =>
        x.id === buildingId ? { ...x, hit: true } : x,
      );

      // Target point: centre-top of building's word panel
      const targetX = b.x + b.w / 2;
      const targetY = b.y + WORD_PANEL_H / 2; // word panel centre Y

      // 1. Show laser (grows from hero to building)
      const laserId = uid();
      setLaser({
        fromX: LASER_FROM_X,
        fromY: LASER_FROM_Y,
        toX: targetX,
        toY: targetY,
        id: laserId,
      });

      // 2. After laser arrives → show flash
      setTimeout(() => {
        setLaser(null);

        const flashId = uid();
        setFlash({
          cx: targetX,
          topY: b.y, // flash overlaps from TOP of building
          isCorrect: b.isTarget,
          id: flashId,
        });

        // 3. Score & effects
        if (b.isTarget) {
          setScore((p) => {
            scoreRef.current = p + POINTS_CORRECT;
            return scoreRef.current;
          });
          setCaught((p) => p + 1);
          playSound(sndCorrect);
          spawnStars(targetX, b.y + WORD_PANEL_H / 2);
          setNotif({
            id: uid(),
            text: `💥 Enemy destroyed! +${POINTS_CORRECT}`,
            color: C.green,
            icon: "🎯",
          });
        } else {
          setScore((p) => {
            scoreRef.current = p + POINTS_WRONG;
            return scoreRef.current;
          });
          playSound(sndWrong);
          setNotif({
            id: uid(),
            text: `❌ Wrong building! ${POINTS_WRONG}`,
            color: C.red,
            icon: "⚠️",
          });
        }

        // 4. Allow next tap after flash duration
        setTimeout(() => {
          setFlash(null);
          firingRef.current = false;
        }, FLASH_DURATION_MS + 100);
      }, FLASH_APPEAR_DELAY);
    },
    [LASER_FROM_X, LASER_FROM_Y],
  );

  // ── Navigation handlers ────────────────────────────────────
  const handleStartGame = () => {
    setRoundIndex(0);
    setTotalScore(0);
    phaseRef.current = "briefing";
    setPhase("briefing");
  };
  const handleStartRound = () => startRound(roundIndex);
  const handleNext = () => {
    const ns = lastResult?.score ?? 0;
    if (roundIndex + 1 >= ROUNDS.length) {
      setTotalScore((t) => t + ns);
      phaseRef.current = "final";
      setPhase("final");
    } else {
      setTotalScore((t) => t + ns);
      const next = roundIndex + 1;
      setRoundIndex(next);
      phaseRef.current = "briefing";
      setPhase("briefing");
    }
  };
  const handleRestart = () => {
    setRoundIndex(0);
    setTotalScore(0);
    phaseRef.current = "idle";
    setPhase("idle");
  };
  const handleExit = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    clearInterval(clockRef.current);
    phaseRef.current = "idle";
    if (typeof onExit === "function") onExit();
    else router.back();
  }, [onExit]);

  const isPlaying = phase === "playing";
  const round = ROUNDS[roundIndex];

  return (
    <View style={st.root}>
      {/* ── Sky background ── */}
      <ImageBackground
        source={require("../../assets/games/super-hero-mission/game-back.jpg")}
        resizeMode="stretch"
        style={StyleSheet.absoluteFill}
      >
        <View pointerEvents="none" />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "transparent",
              borderBottomWidth: sh * 0.45,
              borderBottomColor: "rgba(13,13,40,0.55)",
              borderTopWidth: 0,
            },
          ]}
          pointerEvents="none"
        />
        {/* 
        {/* Stars */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* {Array.from({ length: 35 }, (_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: (i * 113 + 17) % sw,
                top: (i * 53 + 9) % (sh * 0.45),
                width: i % 5 === 0 ? 3 : 2,
                height: i % 5 === 0 ? 3 : 2,
                borderRadius: 2,
                backgroundColor:
                  i % 7 === 0 ? C.yellow : "rgba(255,255,255,0.7)",
                opacity: 0.4 + (i % 4) * 0.15,
              }}
            />
          ))} */}
          {/* Moon */}
          <View
            style={{
              position: "absolute",
              top: sh * 0.05,
              right: sw * 0.08,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "#FFF9E3",
              shadowColor: "#FFF9E3",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 16,
              elevation: 6,
            }}
          />
        </View>

        {/* ── Scrolling clouds ── */}
        {clouds.map((c) => (
          <CloudShape key={c.id} x={c.x} y={c.y} w={c.w} h={c.h} />
        ))}

        {/* ── Scrolling buildings with word panels ── */}
        {buildings.map((b) => (
          <ScrollingBuilding
            key={b.id}
            b={b}
            sw={sw}
            sh={sh}
            onTap={isPlaying ? handleBuildingTap : () => {}}
          />
        ))}

        {/* ── Ground ── */}
        <GroundStripe sw={sw} sh={sh} offsetX={groundX} />

        {/* ── Superhero (fixed position) ── */}
        {(isPlaying || phase === "idle" || phase === "briefing") && (
          <SuperHero x={HERO_X} y={HERO_Y} />
        )}

        {/* ── Laser beam ── */}
        {laser && (
          <LaserBeam
            key={laser.id}
            fromX={laser.fromX}
            fromY={laser.fromY}
            toX={laser.toX}
            toY={laser.toY}
            onArrived={() => {}}
          />
        )}

        {/* ── Comic flash ── */}
        {flash && (
          <ComicFlash
            key={flash.id}
            cx={flash.cx}
            topY={flash.topY}
            isCorrect={flash.isCorrect}
            onDone={() => setFlash(null)}
          />
        )}

        {/* ── Flying stars ── */}
        {stars.map((s) => (
          <FlyingStar
            key={s.id}
            startX={s.startX}
            startY={s.startY}
            endX={s.endX}
            endY={s.endY}
            delay={s.delay}
            onDone={() => setStars((prev) => prev.filter((x) => x.id !== s.id))}
          />
        ))}

        {/* ── HUD ── */}
        {isPlaying && (
          <Hud
            round={round}
            timeLeft={timeLeft}
            score={score}
            onExit={handleExit}
            badgeScale={badgeScale}
          />
        )}

        {/* ── Hint bar ── */}
        {isPlaying && (
          <View
            style={[st.tapBar, { left: sw * 0.07, right: sw * 0.07 }]}
            pointerEvents="none"
          >
            <Text style={st.tapBarText}>👆 TAP A BUILDING TO BLAST IT!</Text>
          </View>
        )}
      </ImageBackground>
      {/* ── Phase overlays ── */}
      {phase === "idle" && (
        <IdleOverlay
          onStart={handleStartGame}
          onExit={handleExit}
          sw={sw}
          sh={sh}
          laserSound={laserSound}
        />
      )}
      {phase === "briefing" && (
        <MissionBriefing
          round={round}
          onStart={handleStartRound}
          onExit={handleExit}
          laserSound={laserSound}
        />
      )}
      {phase === "result" && lastResult && (
        <ResultOverlay
          score={lastResult.score}
          caught={lastResult.caught}
          missed={lastResult.missed}
          isLast={roundIndex + 1 >= ROUNDS.length}
          onNext={handleNext}
          onExit={handleExit}
        />
      )}
      {phase === "final" && (
        <FinalOverlay
          totalScore={totalScore}
          onRestart={handleRestart}
          onExit={handleExit}
        />
      )}
      {/* ── Notification ── */}
      {notif && (
        <Notif
          key={notif.id}
          text={notif.text}
          color={notif.color}
          icon={notif.icon}
          sw={sw}
          sh={sh}
          onDone={() => setNotif(null)}
        />
      )}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },

  hud: {
    position: "absolute",
    top: STATUS_H + 6,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    zIndex: 200,
  },
  exitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  topExit: {
    position: "absolute",
    top: STATUS_H + 12,
    right: 14,
    zIndex: 500,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  exitTxt: { color: "#B0BEC5", fontSize: 15, fontWeight: "700" },
  hudCenter: { alignItems: "center", flex: 1 },
  hudCat: {
    fontSize: 14,
    fontWeight: "800",
    color: C.teal,
    letterSpacing: 0.3,
  },
  hudTime: { fontSize: 22, fontWeight: "900", color: "#FFF", lineHeight: 26 },
  scorePill: {
    backgroundColor: C.yellowDim,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: "center",
  },
  scoreTxt: { fontSize: 14, fontWeight: "900", color: C.yellow },

  tapBar: {
    position: "absolute",
    bottom: 34,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 30,
    paddingVertical: 13,
    alignItems: "center",
    zIndex: 150,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tapBarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,26,0.93)",

    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    paddingHorizontal: 22,
  },
  lightoverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 8, 26, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    paddingHorizontal: 22,
  },
  idleTitle: {
    fontSize: font.h1 + 4,
    fontWeight: "900",
    color: "rgba(22, 39, 39, 0.88)",
    letterSpacing: 0.5,
    textAlign: "center",
    textShadowColor: "rgba(22, 44, 47, 0.34)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 25,
    marginBottom: pad.md,
  },
  idleSubtitle: {
    fontSize: font.xl,
    fontWeight: "700",
    color: "#FFD54F",
    letterSpacing: 2,
    marginBottom: pad.xxxl,
    paddingHorizontal: 5,
    // textAlign: "center",
    textShadowColor: "rgba(93, 89, 47, 0.82)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
    backgroundColor: "black",
  },
  idleHint: {
    fontSize: font.xl,
    color: "#171f24",
    fontWeight: 600,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: pad.xxxl,
    paddingHorizontal: 8,
  },

  card: {
    width: isTablet ? SW * 0.7 : "100%", // 👈 expand on tablet
    maxWidth: isTablet ? 720 : 420, // 👈 bigger cap for iPad
    minHeight: isTablet ? SH * 0.6 : undefined,
    backgroundColor: "rgba(10,14,36,0.98)",
    borderRadius: isTablet ? 36 : 28, // 👈 slightly larger radius

    borderWidth: 1.5,
    borderColor: C.tealBorder,

    padding: isTablet ? 32 : 24, // 👈 more breathing space

    alignItems: "center",

    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: isTablet ? 32 : 24, // 👈 stronger glow
    elevation: isTablet ? 16 : 10,
  },
  classifiedHeader: {
    width: "100%",
    backgroundColor: "rgba(0,188,212,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: pad.md,
  },
  classifiedTxt: {
    fontSize: font.xl,
    fontWeight: "900",
    color: C.teal,
    letterSpacing: 2,
  },
  roundBadge: {
    backgroundColor: "rgba(255,23,68,0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.redBorder,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginBottom: pad.lg,
  },
  roundBadgeText: { color: C.red, fontWeight: "700", fontSize: font.xl },
  cardTitle: {
    fontSize: font.xxl,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: pad.md,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: font.lg,
    color: C.textSec,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: pad.lg,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginBottom: pad.xl,
  },
  chip: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { color: C.teal, fontWeight: "800", fontSize: font.lg },

  redBtn: {
    backgroundColor: C.red,
    borderRadius: 30,
    paddingHorizontal: 36,
    paddingVertical: pad.lg,
    alignItems: "center",
    shadowColor: C.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  redBtnText: {
    fontSize: font.xxl,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
  },

  // Result overlays
  resultCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(10,14,36,0.98)",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.45)",
    padding: 24,
    alignItems: "center",
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  finalCard: { borderColor: "rgba(255,213,79,0.75)", shadowOpacity: 0.45 },
  resultBanner: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,213,79,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.5)",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  finalBanner: {
    backgroundColor: "rgba(255,213,79,0.2)",
    borderColor: "rgba(255,213,79,0.85)",
  },
  resultShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ skewX: "-18deg" }],
  },
  resultBannerText: {
    fontSize: 20,
    fontWeight: "900",
    color: C.yellow,
    letterSpacing: 1,
    textShadowColor: "rgba(255,213,79,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 20, width: "100%" },
  statPill: {
    flex: 1,
    backgroundColor: "rgba(255,213,79,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,213,79,0.3)",
    padding: 12,
    alignItems: "center",
  },
  totalPill: {
    backgroundColor: "rgba(255,213,79,0.12)",
    borderColor: "rgba(255,213,79,0.6)",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statVal: { fontSize: font.lg, fontWeight: "900", color: C.yellow },
  goldBtn: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: C.yellow,
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  goldBtnText: {
    fontSize: font.lg,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  secondaryBtnText: { fontSize: font.lg, fontWeight: "700", color: C.textSec },
});
