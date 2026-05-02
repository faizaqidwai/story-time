/**
 * PolicePursuitGame.jsx
 *
 * POLICE PATROL CHASE — Top-down road game, word-learning for children.
 *
 * MECHANICS:
 *  - Top-down straight road view (like DodgeCar)
 *  - Police car chases a black criminal car ahead on the road
 *  - Words float down the road toward the police car
 *  - Collect CORRECT word → police car speeds up, gains on black car
 *  - Collect WRONG word   → police car slows down, black car pulls away
 *  - When police car catches the black car → GREAT CATCH! popup, points, new black car spawns
 *  - 5 rounds, each with a category of words
 *  - Black header bar with score badge + exit button
 *  - Stars fly to score badge on every catch
 *  - Gold/black result screens
 *
 * REGISTER IN _layout.jsx:
 *   <Stack.Screen name="PolicePursuitGame"
 *     options={{headerShown:false, animation:"slide_from_bottom", gestureEnabled:false}}/>
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { font, pad, radius, size } from "../theme/tokens";
// ─── LAYOUT ───────────────────────────────────────────────────────────────────
const STATUS_H =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;
const HEADER_H = STATUS_H + 56; // black header height
const TICK_MS = 16;

// Road & lanes
const ROAD_PADDING = 24;
const NUM_LANES = 3; // police switches between 3 lanes

// Cars
const POLICE_W = 48;
const POLICE_H = 76;
const BLACK_W = 44;
const BLACK_H = 72;

// Word chips
const WORD_H = 38;
const WORD_FONT = 15;
const WORD_CHAR_W = 10;
const WORD_PAD_H = 20;

// Game physics
const SPEED_NORMAL = 3.0; // baseline scroll speed
const SPEED_BOOST = 5.5; // speed after correct word
const SPEED_SLOW = 1.2; // speed after wrong word
const SPEED_DECAY = 0.04; // how quickly boost/slow returns to normal per tick
const CATCH_DIST = 30; // px between cars = caught!
const START_GAP = 0.3; // black car starts at 30% of screen height
const CLOSE_RATE = 0.8; // px per tick police gains on correct speed
const OPEN_RATE = 1.4; // px per tick black car pulls away on slow
const WORD_SPEED = 2.2; // word scroll speed (px/tick)
const SPAWN_TICKS = 90; // ticks between word spawns

// Scoring
const PTS_CATCH = 50; // points per black car caught
const PTS_CORRECT = 5; // points per correct word (shown briefly)
const PTS_WRONG = -3;

// Round
const ROUND_SECS = 90;

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#08081a",
  header: "#000000",
  road: "#1c1c2e",
  roadLine: "rgba(255,255,255,0.22)",
  roadEdge: "rgba(0,188,212,0.7)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.18)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.15)",
  yellowBorder: "rgba(255,213,79,0.6)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.22)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.22)",
  greenBorder: "rgba(76,175,80,0.7)",
  siren1: "#FF1744",
  siren2: "#2979FF",
  police: "#1565C0",
  policeStripe: "#FFFFFF",
  black: "#212121",
  blackCar: "#1a1a1a",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
  white: "#FFFFFF",
};

// ─── ROUNDS ───────────────────────────────────────────────────────────────────
const ROUNDS = [
  {
    id: 1,
    category: "Size",
    emoji: "📏",
    briefing:
      'Collect SIZE words to speed up!\n"big","tall","huge" help you catch the car.',
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
      'Collect COLOR words to speed up!\n"red","blue","green" fuel the chase.',
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
      "Collect ANIMAL words to speed up!\nDog, cat, lion — animal names.",
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
      'Collect FEELING words to speed up!\n"happy","brave","calm" fuel the chase.',
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
      'Collect ACTION words to speed up!\n"run","jump","fly" — action words.',
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

// ─── HELPERS ─────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => ++_uid;
const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = 0 | (Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const buildQ = (r) =>
  shuffle([
    ...shuffle(r.targetWords)
      .slice(0, 10)
      .map((w) => ({ word: w, isTarget: true })),
    ...shuffle(r.distractWords)
      .slice(0, 10)
      .map((w) => ({ word: w, isTarget: false })),
  ]);

// Compute lane centre X positions for a given screen width
function getLaneCentres(sw) {
  const roadW = sw - ROAD_PADDING * 2;
  const laneW = roadW / NUM_LANES;
  return Array.from(
    { length: NUM_LANES },
    (_, i) => ROAD_PADDING + i * laneW + laneW / 2,
  );
}

function makeWord(sw, sh, item) {
  const centres = getLaneCentres(sw);
  const laneW = (sw - ROAD_PADDING * 2) / NUM_LANES;
  // Cap word width to 85% of lane width so it always fits
  const w = Math.min(
    item.word.length * WORD_CHAR_W + WORD_PAD_H * 2,
    laneW * 0.85,
  );
  // Spawn centred in a random lane
  const cx = centres[Math.floor(Math.random() * NUM_LANES)];
  return {
    id: uid(),
    text: item.word,
    isTarget: item.isTarget,
    x: cx - w / 2,
    y: HEADER_H - WORD_H - 10,
    w,
    h: WORD_H,
    hit: false,
  };
}

// ─── ROAD COMPONENT ───────────────────────────────────────────────────────────
function Road({ sw, sh, dashOffset }) {
  const roadH = sh - HEADER_H;
  const dashH = 32,
    gapH = 20,
    total = dashH + gapH;
  const count = Math.ceil(roadH / total) + 2;
  const off = dashOffset % total;
  // 3 lane dividers
  const dividers = [sw * 0.33, sw * 0.66];

  return (
    <View
      style={[StyleSheet.absoluteFill, { top: HEADER_H }]}
      pointerEvents="none"
    >
      {/* Road surface */}
      <View
        style={{ ...StyleSheet.absoluteFillObject, backgroundColor: C.road }}
      />
      {/* Edge lines */}
      <View
        style={{
          position: "absolute",
          left: ROAD_PADDING,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: C.roadEdge,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: ROAD_PADDING,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: C.roadEdge,
          borderRadius: 2,
        }}
      />
      {/* Lane dashes */}
      {dividers.map((lx, li) => (
        <View
          key={li}
          style={{
            position: "absolute",
            left: lx,
            top: 0,
            bottom: 0,
            width: 2,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: count }, (_, d) => (
            <View
              key={d}
              style={{
                position: "absolute",
                top: d * total + off - total,
                width: 2,
                height: dashH,
                backgroundColor: C.roadLine,
                borderRadius: 1,
              }}
            />
          ))}
        </View>
      ))}
      {/* Side grass/kerb hint */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: ROAD_PADDING,
          backgroundColor: "rgba(34,85,34,0.35)",
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: ROAD_PADDING,
          backgroundColor: "rgba(34,85,34,0.35)",
        }}
      />
    </View>
  );
}

// ─── POLICE CAR ───────────────────────────────────────────────────────────────
// Top-down view: police blue/white livery, siren on roof
function PoliceCar({ x, y, sirenAnim }) {
  // Siren uses opacity pulse on two separate colored halves
  // Left half = red, right half = blue, alternating opacity
  const redOp = sirenAnim; // JS driver only - no transforms
  const blueOp = sirenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: POLICE_W,
        height: POLICE_H,
        zIndex: 70,
      }}
    >
      {/* Body */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: POLICE_W,
          height: POLICE_H,
          backgroundColor: C.police,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: "#0D47A1",
          shadowColor: C.teal,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* White stripe across middle */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: POLICE_H * 0.38,
            height: 6,
            backgroundColor: C.policeStripe,
            opacity: 0.9,
          }}
        />
        {/* Windshield (top) */}
        <View
          style={{
            position: "absolute",
            left: 6,
            top: 6,
            right: 6,
            height: 16,
            backgroundColor: "rgba(144,200,255,0.6)",
            borderRadius: 4,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.3)",
          }}
        />
        {/* Rear window (bottom) */}
        <View
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            right: 8,
            height: 12,
            backgroundColor: "rgba(144,200,255,0.5)",
            borderRadius: 3,
          }}
        />
        {/* Wheels — 4 corners */}
        {[
          { top: 8, left: -5 },
          { top: 8, right: -5 },
          { bottom: 8, left: -5 },
          { bottom: 8, right: -5 },
        ].map((pos, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              ...pos,
              width: 8,
              height: 14,
              borderRadius: 3,
              backgroundColor: "#222",
              borderWidth: 1,
              borderColor: "#555",
            }}
          />
        ))}
        {/* POLICE text */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: POLICE_H * 0.44,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: font.sm,
              fontWeight: "900",
              color: C.policeStripe,
              letterSpacing: 0.5,
            }}
          ></Text>
        </View>
      </View>

      {/* ── SIREN light bar — JS-driver opacity, separate from body ── */}
      {/* Dark base bar */}
      <View
        style={{
          position: "absolute",
          left: POLICE_W * 0.1,
          top: POLICE_H * 0.16,
          width: POLICE_W * 0.8,
          height: 10,
          borderRadius: 5,
          backgroundColor: "#111",
        }}
      />
      {/* Red half */}
      <Animated.View
        style={{
          position: "absolute",
          left: POLICE_W * 0.1,
          top: POLICE_H * 0.16,
          width: POLICE_W * 0.38,
          height: 10,
          borderRadius: 5,
          backgroundColor: C.siren1,
          opacity: redOp,
          shadowColor: C.siren1,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 12,
        }}
      />
      {/* Blue half */}
      <Animated.View
        style={{
          position: "absolute",
          left: POLICE_W * 0.52,
          top: POLICE_H * 0.16,
          width: POLICE_W * 0.38,
          height: 10,
          borderRadius: 5,
          backgroundColor: C.siren2,
          opacity: blueOp,
          shadowColor: C.siren2,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 12,
        }}
      />
    </View>
  );
}

// ─── BLACK CAR ────────────────────────────────────────────────────────────────
// Top-down dark car — the fugitive
function BlackCar({ x, y }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: BLACK_W,
        height: BLACK_H,
        zIndex: 65,
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: BLACK_W,
          height: BLACK_H,
          backgroundColor: C.blackCar,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: "#444",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.7,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        {/* Windshield */}
        <View
          style={{
            position: "absolute",
            left: 5,
            top: 5,
            right: 5,
            height: 14,
            backgroundColor: "rgba(100,180,255,0.4)",
            borderRadius: 3,
          }}
        />
        {/* Rear */}
        <View
          style={{
            position: "absolute",
            left: 7,
            bottom: 7,
            right: 7,
            height: 11,
            backgroundColor: "rgba(100,180,255,0.3)",
            borderRadius: 3,
          }}
        />
        {/* Red tail lights */}
        <View
          style={{
            position: "absolute",
            bottom: 2,
            left: 3,
            width: 8,
            height: 5,
            backgroundColor: "#FF1744",
            borderRadius: 2,
            shadowColor: "#FF1744",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 4,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 2,
            right: 3,
            width: 8,
            height: 5,
            backgroundColor: "#FF1744",
            borderRadius: 2,
            shadowColor: "#FF1744",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 4,
          }}
        />
        {/* Wheels */}
        {[
          { t: 6, l: -5 },
          { t: 6, r: -5 },
          { b: 6, l: -5 },
          { b: 6, r: -5 },
        ].map((pos, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              ...pos,
              width: 7,
              height: 13,
              borderRadius: 3,
              backgroundColor: "#111",
              borderWidth: 1,
              borderColor: "#444",
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─── WORD CHIP ────────────────────────────────────────────────────────────────
function WordChip({ word }) {
  // JS-driver: border/bg glow — OUTER view only, NO transform/opacity here
  const glow = useRef(new Animated.Value(0)).current;
  const glowRef = useRef(null);
  // Native-driver: opacity + scale on collect — INNER view only
  const op = useRef(new Animated.Value(1)).current;
  const sc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    glowRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
    );
    glowRef.current.start();
    return () => glowRef.current?.stop();
  }, []);

  useEffect(() => {
    if (word.hit) {
      glowRef.current?.stop(); // stop JS loop BEFORE native animations fire
      Animated.parallel([
        Animated.spring(sc, {
          toValue: 1.5,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [word.hit]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: word.isTarget
      ? ["rgba(76,175,80,0.5)", "rgba(76,175,80,1)"]
      : ["rgba(239,83,80,0.4)", "rgba(239,83,80,0.9)"],
  });
  const bgColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: word.isTarget
      ? ["rgba(76,175,80,0.12)", "rgba(76,175,80,0.28)"]
      : ["rgba(239,83,80,0.10)", "rgba(239,83,80,0.22)"],
  });

  return (
    // OUTER: JS-driver only — borderColor + backgroundColor, NO transform/opacity
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: word.x,
        top: word.y,
        width: word.w,
        height: word.h,
        borderRadius: 14,
        borderWidth: 2,
        borderColor,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
    >
      {/* INNER: native-driver only — opacity + scale, NO color props */}
      <Animated.View
        style={{
          opacity: op,
          transform: [{ scale: sc }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: WORD_FONT,
            fontWeight: "900",
            color: word.isTarget ? C.green : C.red,
            letterSpacing: 0.3,
          }}
        >
          {word.text}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── SPEED INDICATOR ─────────────────────────────────────────────────────────
function SpeedBar({ speed }) {
  const frac = Math.min(1, (speed - SPEED_SLOW) / (SPEED_BOOST - SPEED_SLOW));
  const color = frac > 0.6 ? C.green : frac > 0.3 ? C.yellow : C.red;
  return (
    <View
      style={{
        position: "absolute",
        bottom: 50,
        left: 24,
        right: 24,
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        zIndex: 80,
      }}
      pointerEvents="none"
    >
      <View
        style={{
          width: `${Math.round(frac * 100)}%`,
          height: "100%",
          borderRadius: 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 6,
        }}
      />
    </View>
  );
}

// ─── CATCH POPUP ─────────────────────────────────────────────────────────────
function CatchPopup({ sw, sh, catches, onDone }) {
  const sc = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-160)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimX, {
          toValue: 240,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimX, {
          toValue: -160,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    const t = setTimeout(() => {
      Animated.timing(op, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(onDone);
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
        top: sh * 0.3,
        zIndex: 300,
        opacity: op,
        transform: [{ scale: sc }],
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(10,10,10,0.96)",
          borderRadius: 22,
          borderWidth: 2.5,
          borderColor: C.yellow,
          overflow: "hidden",
          paddingVertical: 18,
          paddingHorizontal: 24,
          alignItems: "center",
          shadowColor: C.yellow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 24,
          elevation: 16,
        }}
      >
        {/* Shimmer */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 80,
            backgroundColor: "rgba(255,255,255,0.12)",
            transform: [{ translateX: shimX }, { skewX: "-15deg" }],
          }}
        />
        <Text style={{ fontSize: 36, marginBottom: 4 }}>🚨</Text>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "900",
            color: C.yellow,
            letterSpacing: 1,
            textAlign: "center",
            textShadowColor: "rgba(255,213,79,0.6)",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
          }}
        >
          GREAT CATCH!
        </Text>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "900",
            color: C.white,
            marginTop: 4,
          }}
        >
          +{PTS_CATCH}
        </Text>
        <Text style={{ fontSize: 13, color: C.textSec, marginTop: 2 }}>
          {catches} {catches === 1 ? "car" : "cars"} caught!
        </Text>
      </View>
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

// ─── NOTIF ────────────────────────────────────────────────────────────────────
function Notif({ text, color, icon, sw, sh, onDone }) {
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(
      () =>
        Animated.timing(op, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }).start(onDone),
      1200,
    );
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: sw * 0.1,
        right: sw * 0.1,
        top: sh * 0.55,
        zIndex: 500,
        opacity: op,
        transform: [{ scale: sc }],
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(8,8,26,0.96)",
          borderRadius: 18,
          borderWidth: 2,
          borderColor: color,
          paddingVertical: 11,
          paddingHorizontal: 16,
          alignItems: "center",
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 14,
          elevation: 12,
        }}
      >
        <Text style={{ fontSize: 20, marginBottom: 2 }}>{icon}</Text>
        <Text
          style={{
            fontSize: 13,
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

// ─── IDLE OVERLAY ─────────────────────────────────────────────────────────────
function IdleOverlay({ onStart, onExit }) {
  const pulse = useRef(new Animated.Value(1)).current;
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
  return (
    <View style={st.overlayBg}>
      <Text style={st.idleTitle}>🚨 Police{"\n"}Patrol Chase!</Text>
      <Text style={st.idleSubtitle}>Word Power Pursuit</Text>
      <Text style={st.idleHint}>
        Words appear on the road ahead.{"\n"}
        Collect{" "}
        <Text style={{ color: C.green, fontWeight: "700" }}>
          correct words
        </Text>{" "}
        to speed up!{"\n"}
        Wrong words slow you down.{"\n"}
        Catch the black car to score! 🚗💨
      </Text>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity
          style={st.blueBtn}
          onPress={onStart}
          activeOpacity={0.85}
        >
          <Text style={st.blueBtnText}>🚨 START CHASE!</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── ROUND BRIEFING ───────────────────────────────────────────────────────────
function RoundBriefing({ round, onStart, onExit }) {
  const slide = useRef(new Animated.Value(60)).current;
  const fade = useRef(new Animated.Value(0)).current;
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
  return (
    <View style={st.overlayBg}>
      <Animated.View
        style={[st.card, { transform: [{ translateY: slide }], opacity: fade }]}
      >
        <View style={st.roundHeader}>
          <Text style={st.roundHeaderTxt}>
            🚨 DISPATCH ROUND {round.id}/{ROUNDS.length}
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
            marginBottom: pad.sm,
            letterSpacing: 1,
          }}
        >
          SPEED BOOST WORDS:
        </Text>
        <View style={st.chipRow}>
          {round.targetWords.slice(0, 8).map((w) => (
            <View key={w} style={st.chip}>
              <Text style={st.chipText}>{w}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[st.blueBtn, { width: "100%" }]}
          onPress={onStart}
          activeOpacity={0.85}
        >
          <Text style={st.blueBtnText}>🚨 GO!</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── RESULT OVERLAY ───────────────────────────────────────────────────────────
function ResultOverlay({ score, catches, isLast, onNext, onExit }) {
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-220)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  const stars = catches >= 6 ? 3 : catches >= 3 ? 2 : 1;
  const title =
    stars === 3
      ? "Top Officer! 🏆"
      : stars === 2
        ? "Good Chase! ⭐"
        : "Keep Trying!";
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
          <Text style={st.resultBannerText}>🚨 {title}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {[s1, s2, s3].map((s, i) => (
            <Animated.Text
              key={i}
              style={[
                { fontSize: 30 },
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
            <Text style={st.statLabel}>CAUGHT</Text>
            <Text style={[st.statVal, { color: C.green }]}>{catches}</Text>
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
            {isLast ? "🏆 Final Score!" : "🚨  Next Round"}
          </Text>
        </TouchableOpacity>
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

// ─── FINAL OVERLAY ────────────────────────────────────────────────────────────
function FinalOverlay({ totalScore, onRestart, onExit }) {
  const grade =
    totalScore >= 400
      ? "Chief Officer! 🏆"
      : totalScore >= 200
        ? "Detective! 🌟"
        : "Cadet 🚨";
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
          <Text style={st.resultBannerText}>🏆 Mission Complete!</Text>
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
            fontSize: 15,
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
            <Text style={st.goldBtnText}>🚨 New Patrol!</Text>
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
export default function PolicePursuitGame({ onExit }) {
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();

  // Police car fixed Y position
  const POLICE_Y = sh * 0.72;
  // Lane centres computed from screen width
  const LANE_CENTRES = getLaneCentres(sw);
  // Police starts in middle lane (index 1)
  const POLICE_START_LANE = 1;

  // Badge position for stars
  const BADGE_X = sw - 60;
  const BADGE_Y = STATUS_H + 16;

  // ── State ─────────────────────────────────────────────────
  const [phase, setPhase] = useState("idle");
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [score, setScore] = useState(0);
  const [catches, setCatches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECS);
  const [words, setWords] = useState([]);
  const [dashOffset, setDashOffset] = useState(0);
  const [blackCarY, setBlackCarY] = useState(sh * START_GAP);
  const [speed, setSpeed] = useState(SPEED_NORMAL);
  const [stars, setStars] = useState([]);
  const [catchPopup, setCatchPopup] = useState(null);
  const [notif, setNotif] = useState(null);

  // ── Refs ──────────────────────────────────────────────────
  const phaseRef = useRef("idle");
  const scoreRef = useRef(0);
  const catchesRef = useRef(0);
  const speedRef = useRef(SPEED_NORMAL);
  const blackYRef = useRef(sh * START_GAP);
  const policeLaneRef = useRef(POLICE_START_LANE); // current lane index
  const policeXRef = useRef(LANE_CENTRES[POLICE_START_LANE] - POLICE_W / 2);
  const wordsRef = useRef([]);
  const queueRef = useRef([]);
  const queueIdxRef = useRef(0);
  const dashRef = useRef(0);
  const tickRef = useRef(0);
  const clockRef = useRef(null);
  const loopRef = useRef(null);
  const starIdRef = useRef(0);
  const renderRef = useRef(null);
  const tickFnRef = useRef(null);

  // Police car animated X — spring between lane centres
  const policeAnimX = useRef(
    new Animated.Value(LANE_CENTRES[POLICE_START_LANE] - POLICE_W / 2),
  ).current;

  // Siren animation (JS driver - opacity only)
  const sirenAnim = useRef(new Animated.Value(0)).current;
  const sirenLoop = useRef(null);

  // Badge pulse
  const badgeScale = useRef(new Animated.Value(1)).current;

  // ── Sounds ────────────────────────────────────────────────
  const sndCorrect = useRef(null);
  const sndWrong = useRef(null);
  const sndWin = useRef(null);
  const sndLose = useRef(null);
  const sndCatch = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch (_) {}
      for (const [r, a] of [
        [sndCorrect, require("../../assets/sounds/game/correct-hit.mp3")],
        [sndWrong, require("../../assets/sounds/game/wrong-hit.mp3")],
        [sndWin, require("../../assets/sounds/game/win.mp3")],
        [sndLose, require("../../assets/sounds/game/lose.mp3")],
        [sndCatch, require("../../assets/sounds/game/correct-hit.mp3")],
      ]) {
        try {
          const { sound } = await Audio.Sound.createAsync(a);
          if (alive) r.current = sound;
          else sound.unloadAsync();
        } catch (_) {}
      }
    })();
    return () => {
      alive = false;
      [sndCorrect, sndWrong, sndWin, sndLose, sndCatch].forEach((r) => {
        r.current?.unloadAsync();
        r.current = null;
      });
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

  // ── Lane switching ────────────────────────────────────────
  const moveLane = useCallback(
    (dir) => {
      if (phaseRef.current !== "playing") return;
      const next = Math.max(
        0,
        Math.min(NUM_LANES - 1, policeLaneRef.current + dir),
      );
      if (next === policeLaneRef.current) return;
      policeLaneRef.current = next;
      const targetX = LANE_CENTRES[next] - POLICE_W / 2;
      policeXRef.current = targetX;
      // useNativeDriver:false because policeAnimX drives `left` (layout prop)
      Animated.spring(policeAnimX, {
        toValue: targetX,
        friction: 8,
        tension: 140,
        useNativeDriver: false,
      }).start();
    },
    [LANE_CENTRES, policeAnimX],
  );

  const spawnStars = (x, y) => {
    const s = Array.from({ length: 6 }, (_, i) => ({
      id: starIdRef.current++,
      startX: x - 13,
      startY: y - 13,
      endX: BADGE_X,
      endY: BADGE_Y,
      delay: i * 65,
    }));
    setStars((prev) => [...prev, ...s]);
    setTimeout(pulseBadge, 400);
  };

  // ── Siren ─────────────────────────────────────────────────
  const startSiren = () => {
    sirenLoop.current?.stop();
    sirenLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(sirenAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(sirenAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]),
    );
    sirenLoop.current.start();
  };
  const stopSiren = () => {
    sirenLoop.current?.stop();
    sirenAnim.setValue(0);
  };

  // ── Stop all ──────────────────────────────────────────────
  const stopAll = () => {
    clearInterval(loopRef.current);
    loopRef.current = null;
    clearInterval(clockRef.current);
    clockRef.current = null;
    stopSiren();
  };

  // ── Spawn black car at top after catch ────────────────────
  const respawnBlackCar = () => {
    blackYRef.current = sh * 0.12; // reappear near top
    setBlackCarY(sh * 0.12);
  };

  // ── Batch render ──────────────────────────────────────────
  const scheduleRender = () => {
    if (renderRef.current) return;
    renderRef.current = setTimeout(() => {
      renderRef.current = null;
      setWords([...wordsRef.current]);
      setDashOffset(dashRef.current);
      setBlackCarY(blackYRef.current);
      setSpeed(speedRef.current);
      setScore(scoreRef.current);
      setCatches(catchesRef.current);
    }, 0);
  };

  // ── Tick function (stored in ref to avoid stale closures) ─
  tickFnRef.current = () => {
    if (phaseRef.current !== "playing") return;
    tickRef.current++;

    // Decay speed toward normal
    if (speedRef.current > SPEED_NORMAL) {
      speedRef.current = Math.max(SPEED_NORMAL, speedRef.current - SPEED_DECAY);
    } else if (speedRef.current < SPEED_NORMAL) {
      speedRef.current = Math.min(SPEED_NORMAL, speedRef.current + SPEED_DECAY);
    }

    // Scroll road dashes (speed-dependent)
    dashRef.current = (dashRef.current + speedRef.current) % 460;

    // Move black car relative to speed:
    // At SPEED_NORMAL → gap constant
    // Above normal    → police gains (gap closes)
    // Below normal    → black car pulls away (gap opens)
    const delta = speedRef.current - SPEED_NORMAL;
    if (delta > 0) {
      // gaining — black car moves toward police (Y increases toward POLICE_Y)
      blackYRef.current = Math.min(
        POLICE_Y - CATCH_DIST - BLACK_H,
        blackYRef.current + delta * CLOSE_RATE,
      );
    } else if (delta < 0) {
      // slowing — black car moves away (Y decreases toward top)
      blackYRef.current = Math.max(
        sh * 0.05,
        blackYRef.current + delta * OPEN_RATE,
      );
    }

    // Catch check: black car close enough to police car
    if (blackYRef.current >= POLICE_Y - CATCH_DIST - BLACK_H) {
      // CAUGHT!
      catchesRef.current++;
      scoreRef.current += PTS_CATCH;
      playSound(sndCatch);
      const cx = policeXRef.current + POLICE_W / 2,
        cy = POLICE_Y - 40;
      spawnStars(cx, cy);
      setCatchPopup({ id: uid(), catches: catchesRef.current });
      respawnBlackCar();
      // Reset speed to normal after catch
      speedRef.current = SPEED_NORMAL;
    }

    // Spawn words from queue — loops back when queue exhausted so words never stop
    if (tickRef.current % SPAWN_TICKS === 0) {
      // Wrap index to loop the queue infinitely for the full round duration
      if (queueIdxRef.current >= queueRef.current.length) {
        queueIdxRef.current = 0; // restart from beginning (reshuffled queue stays same order)
      }
      const item = queueRef.current[queueIdxRef.current];
      queueIdxRef.current++;
      wordsRef.current = [...wordsRef.current, makeWord(sw, sh, item)];
    }

    // Move words down + collision with police car (use live policeXRef)
    const pLeft = policeXRef.current + 8;
    const pRight = policeXRef.current + POLICE_W - 8;
    const pTop = POLICE_Y + 8;
    const pBot = POLICE_Y + POLICE_H - 8;

    let correctHit = null;
    let wrongHit = null;

    wordsRef.current = wordsRef.current
      .map((w) => {
        if (w.hit) return w;
        const ny = w.y + WORD_SPEED;
        const wLeft = w.x;
        const wRight = w.x + w.w;
        const wBot = ny + w.h;

        if (wLeft < pRight && wRight > pLeft && wBot >= pTop && ny <= pBot) {
          if (w.isTarget) {
            correctHit = w;
          } else {
            wrongHit = w;
          }
          return { ...w, y: ny, hit: true, hitTick: tickRef.current };
        }
        return { ...w, y: ny };
      })
      .filter(
        (w) =>
          w.y < sh + 20 &&
          !(w.hit && w.hitTick && tickRef.current - w.hitTick > 20),
      );

    if (correctHit) {
      speedRef.current = SPEED_BOOST;
      scoreRef.current += PTS_CORRECT;
      playSound(sndCorrect);
      setNotif({
        id: uid(),
        text: `🚀 Speed boost! +${PTS_CORRECT}`,
        color: C.green,
        icon: "💨",
      });
    }
    if (wrongHit) {
      speedRef.current = SPEED_SLOW;
      scoreRef.current += PTS_WRONG; // negative
      playSound(sndWrong);
      setNotif({
        id: uid(),
        text: `🐌 Slowing down! ${PTS_WRONG}`,
        color: C.red,
        icon: "⚠️",
      });
    }

    scheduleRender();
  };

  // ── End round ─────────────────────────────────────────────
  const endRound = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "result";
    stopAll();
    wordsRef.current = [];
    setWords([]);
    setLastResult({ score: scoreRef.current, catches: catchesRef.current });
    setPhase("result");
    playSound(sndWin);
  }, []);

  // ── Start round ───────────────────────────────────────────
  const startRound = useCallback(
    (idx) => {
      const round = ROUNDS[idx];
      const q = buildQ(round);
      queueRef.current = q;
      queueIdxRef.current = 0;
      scoreRef.current = 0;
      catchesRef.current = 0;
      speedRef.current = SPEED_NORMAL;
      blackYRef.current = sh * START_GAP;
      wordsRef.current = [];
      dashRef.current = 0;
      tickRef.current = 0;
      // Reset police to middle lane
      policeLaneRef.current = POLICE_START_LANE;
      const startX = LANE_CENTRES[POLICE_START_LANE] - POLICE_W / 2;
      policeXRef.current = startX;
      policeAnimX.setValue(startX);

      setScore(0);
      setCatches(0);
      setWords([]);
      setStars([]);
      setNotif(null);
      setCatchPopup(null);
      setBlackCarY(sh * START_GAP);
      setSpeed(SPEED_NORMAL);
      setTimeLeft(ROUND_SECS);

      phaseRef.current = "playing";
      setPhase("playing");

      stopAll(); // stop first, then start fresh
      startSiren();
      loopRef.current = setInterval(() => tickFnRef.current(), TICK_MS);
      clockRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            endRound();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    [sh, endRound, LANE_CENTRES, policeAnimX],
  );

  // Cleanup
  useEffect(() => () => stopAll(), []);

  // ── Navigation ────────────────────────────────────────────
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
    stopAll();
    phaseRef.current = "idle";
    if (typeof onExit === "function") onExit();
    else router.back();
  }, [onExit]);

  const isPlaying = phase === "playing";
  const round = ROUNDS[roundIndex];

  return (
    <View style={st.root}>
      {/* ── BLACK HEADER BAR ── */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_H,
          backgroundColor: C.header,
          zIndex: 200,
          borderBottomWidth: 2,
          borderBottomColor: "rgba(0,188,212,0.4)",
          flexDirection: "row",
          alignItems: "flex-end",
          paddingBottom: 10,
          paddingHorizontal: 14,
        }}
      >
        {/* Exit */}
        <TouchableOpacity
          style={st.headerExitBtn}
          onPress={handleExit}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={st.exitTxt}>✕</Text>
        </TouchableOpacity>

        {/* Title / round info */}
        <View style={{ flex: 1, alignItems: "center" }}>
          {isPlaying && (
            <>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: C.teal,
                  letterSpacing: 0.5,
                }}
              >
                {round.emoji} {round.category}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "900",
                  color: C.white,
                  ...(timeLeft <= 10 && { color: C.red }),
                }}
              >
                {timeLeft}s
              </Text>
            </>
          )}
          {!isPlaying && (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                color: C.teal,
                letterSpacing: 1,
              }}
            >
              🚨 POLICE PURSUIT
            </Text>
          )}
        </View>

        {/* Score badge */}
        <Animated.View
          style={[st.scorePill, { transform: [{ scale: badgeScale }] }]}
        >
          <Text style={st.scoreTxt}>⭐ {score}</Text>
        </Animated.View>
      </View>

      {/* ── ROAD (below header) ── */}
      <Road sw={sw} sh={sh} dashOffset={dashOffset} />

      {/* Background city/scenery stripes */}
      <View
        style={[StyleSheet.absoluteFill, { top: HEADER_H, zIndex: 1 }]}
        pointerEvents="none"
      >
        {/* Sky */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: sh * 0.18,
            backgroundColor: "rgba(13,13,40,0.8)",
          }}
        />
        {/* Stars */}
        {Array.from({ length: 18 }, (_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: (i * 113 + 17) % sw,
              top: (i * 37 + 5) % (sh * 0.16),
              width: 2,
              height: 2,
              borderRadius: 1,
              backgroundColor: "rgba(255,255,255,0.6)",
              opacity: 0.5,
            }}
          />
        ))}
      </View>

      {/* ── WORD CHIPS ── */}
      {words.map((w) => (
        <WordChip key={w.id} word={w} />
      ))}

      {/* ── BLACK CAR — horizontally centred (always middle lane) ── */}
      {isPlaying && (
        <BlackCar x={LANE_CENTRES[1] - BLACK_W / 2} y={blackCarY} />
      )}

      {/* ── POLICE CAR — left animated directly, no translateX confusion ── */}
      {(isPlaying || phase === "briefing" || phase === "idle") && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: policeAnimX, // animated directly as left position
            top: POLICE_Y,
            width: POLICE_W,
            height: POLICE_H,
            zIndex: 70,
          }}
        >
          <PoliceCar x={0} y={0} sirenAnim={sirenAnim} />
        </Animated.View>
      )}

      {/* ── TAP ZONES — left/right halves steer police car ── */}
      {isPlaying && (
        <>
          <TouchableOpacity
            style={{
              position: "absolute",
              left: 0,
              top: HEADER_H,
              width: sw / 2,
              bottom: 0,
              zIndex: 50,
            }}
            onPress={() => moveLane(-1)}
            activeOpacity={0.01}
          >
            <View
              style={{
                position: "absolute",
                left: 16,
                top: "42%",
                opacity: 0.28,
              }}
            >
              <Text style={{ fontSize: 36, color: C.white }}>◀</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              position: "absolute",
              right: 0,
              top: HEADER_H,
              width: sw / 2,
              bottom: 0,
              zIndex: 50,
            }}
            onPress={() => moveLane(1)}
            activeOpacity={0.01}
          >
            <View
              style={{
                position: "absolute",
                right: 16,
                top: "42%",
                opacity: 0.28,
              }}
            >
              <Text style={{ fontSize: 36, color: C.white }}>▶</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* ── SPEED BAR ── */}
      {isPlaying && <SpeedBar speed={speed} />}

      {/* ── Speed hint label ── */}
      {isPlaying && (
        <View
          style={{
            position: "absolute",
            bottom: 62,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 81,
          }}
          pointerEvents="none"
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color:
                speed > SPEED_NORMAL + 0.5
                  ? C.green
                  : speed < SPEED_NORMAL - 0.5
                    ? C.red
                    : C.textSec,
            }}
          >
            {speed > SPEED_NORMAL + 0.5
              ? "🚀 BOOSTING!"
              : speed < SPEED_NORMAL - 0.5
                ? "🐌 SLOWING..."
                : "SPEED"}
          </Text>
        </View>
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

      {/* ── Catch popup ── */}
      {catchPopup && (
        <CatchPopup
          key={catchPopup.id}
          sw={sw}
          sh={sh}
          catches={catchPopup.catches}
          onDone={() => setCatchPopup(null)}
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

      {/* ── Catches badge ── */}
      {isPlaying && (
        <View
          style={{
            position: "absolute",
            bottom: 80,
            right: 16,
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: C.tealBorder,
            paddingHorizontal: 10,
            paddingVertical: 5,
            zIndex: 100,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "900", color: C.teal }}>
            🚗 {catches}
          </Text>
        </View>
      )}

      {/* ── Overlays ── */}
      {phase === "idle" && (
        <IdleOverlay onStart={handleStartGame} onExit={handleExit} />
      )}
      {phase === "briefing" && (
        <RoundBriefing
          round={round}
          onStart={handleStartRound}
          onExit={handleExit}
        />
      )}
      {phase === "result" && lastResult && (
        <ResultOverlay
          score={lastResult.score}
          catches={lastResult.catches}
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
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: "hidden" },

  headerExitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  exitTxt: { fontSize: 13, color: C.textSec, fontWeight: "700" },

  scorePill: {
    backgroundColor: C.yellowDim,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 70,
    alignItems: "center",
  },
  scoreTxt: { fontSize: 14, fontWeight: "900", color: C.yellow },

  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,26,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    paddingHorizontal: 22,
  },
  idleTitle: {
    fontSize: font.h1 + 2,
    fontWeight: "900",
    color: C.teal,
    letterSpacing: 0.5,
    textAlign: "center",
    textShadowColor: "rgba(0,188,212,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginBottom: pad.sm,
  },
  idleSubtitle: {
    fontSize: font.lg,
    fontWeight: "700",
    color: C.yellow,
    letterSpacing: 2,
    marginBottom: pad.xxl,
    textAlign: "center",
  },
  idleHint: {
    fontSize: font.xl,
    color: C.textSec,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: pad.xxxl,
    paddingHorizontal: 8,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(8,8,26,0.98)",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: 24,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  roundHeader: {
    width: "100%",
    backgroundColor: C.tealDim,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  roundHeaderTxt: {
    fontSize: font.lg,
    fontWeight: "900",
    color: C.teal,
    letterSpacing: 1.5,
  },
  cardTitle: {
    fontSize: font.xxl,
    fontWeight: "900",
    color: C.white,
    marginBottom: 8,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: font.md,
    color: C.textSec,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: pad.xl,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: pad.xxl,
  },
  chip: {
    backgroundColor: C.greenDim,
    borderColor: C.greenBorder,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { color: C.green, fontWeight: "800", fontSize: font.lg },

  blueBtn: {
    backgroundColor: C.police,
    borderRadius: 30,
    paddingHorizontal: 36,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: C.teal,
  },
  blueBtnText: {
    fontSize: font.h3,
    fontWeight: "900",
    color: C.white,
    letterSpacing: 0.5,
  },

  resultCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(8,8,26,0.98)",
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
  statVal: { fontSize: 24, fontWeight: "900", color: C.yellow },
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
    fontSize: 16,
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
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: C.textSec },
});
