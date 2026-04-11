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
} from "react-native";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_H =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

// ── Constants ─────────────────────────────────────────────────
const TICK_MS = 16;
const ROAD_TOP = STATUS_H + 100;
const ROAD_BOTTOM = SH - 60;
const ROAD_H = ROAD_BOTTOM - ROAD_TOP;

const CAT_W = 52;
const CAT_H = 44;
const CAT_Y = ROAD_BOTTOM - CAT_H - 24;

const CAR_W = 52;
const CAR_H = 80;

const WORD_W = 72;
const WORD_H = 34;
const WORD_FONT = 13;

const SPEED_INIT = 4;
const SPEED_MAX = 14;
const SPEED_INC_EVERY = 250;
const SPEED_INC_AMT = 0.6;

// Dodge this many cars to win
const WIN_SCORE = 35;

// Word spawns once every N car-cooldown cycles
const WORD_SPAWN_CHANCE = 0.28; // ~28% chance a word spawns instead of a car slot

const LANE_MILESTONES = [
  [0, 2],
  [8, 3],
  [20, 4],
  [40, 5],
];

const CAR_COLORS = [
  "#EF5350",
  "#FF7043",
  "#AB47BC",
  "#42A5F5",
  "#26C6DA",
  "#EC407A",
  "#FFA726",
];

// Simple vocab words the cat "collects"
const COLLECT_WORDS = [
  "fish",
  "milk",
  "paws",
  "yarn",
  "cozy",
  "purr",
  "meow",
  "nap",
  "bell",
  "leap",
  "hiss",
  "flop",
  "curl",
  "mew",
  "claw",
  "soft",
  "warm",
  "snug",
  "play",
  "zoom",
];

const C = {
  bg: "#08081a",
  bgMid: "#0d0d28",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.18)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.15)",
  yellowBorder: "rgba(255,213,79,0.6)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.18)",
  greenBorder: "rgba(76,175,80,0.6)",
  red: "#EF5350",
  road: "#1a1a2e",
  roadLine: "rgba(255,255,255,0.18)",
  roadEdge: "rgba(0,188,212,0.6)",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

// ── Helpers ───────────────────────────────────────────────────
let _oid = 0;

function getLaneCount(score) {
  let lanes = 2;
  for (const [t, c] of LANE_MILESTONES) {
    if (score >= t) lanes = c;
  }
  return lanes;
}

function getLanes(laneCount) {
  const pad = 16;
  const roadW = SW - pad * 2;
  const laneW = roadW / laneCount;
  return Array.from({ length: laneCount }, (_, i) => ({
    x: pad + i * laneW,
    w: laneW,
    cx: pad + i * laneW + laneW / 2,
  }));
}

function makeCar(lane) {
  return {
    id: _oid++,
    kind: "car",
    x: lane.cx - CAR_W / 2,
    y: ROAD_TOP - CAR_H - 10,
    w: CAR_W,
    h: CAR_H,
    color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    hit: false,
    scored: false,
  };
}

function makeWord(lane) {
  const text = COLLECT_WORDS[Math.floor(Math.random() * COLLECT_WORDS.length)];
  return {
    id: _oid++,
    kind: "word",
    text,
    x: lane.cx - WORD_W / 2,
    y: ROAD_TOP - WORD_H - 10,
    w: WORD_W,
    h: WORD_H,
    hit: false,
    scored: false,
  };
}

// ─────────────────────────────────────────────────────────────
// FLYING COIN  (copied exactly from FlappyWordGame)
// ─────────────────────────────────────────────────────────────
function FlyingCoin({ startX, startY, endX, endY, delay, onDone }) {
  const ax = useRef(new Animated.Value(startX)).current;
  const ay = useRef(new Animated.Value(startY)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.5)).current;

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
          duration: 420 + Math.random() * 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ay, {
          toValue: endY,
          duration: 420 + Math.random() * 120,
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
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: C.yellow,
        borderWidth: 2,
        borderColor: "#FFB300",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        opacity: op,
        transform: [{ translateX: ax }, { translateY: ay }, { scale: sc }],
      }}
    >
      <Text style={{ fontSize: 11, color: "#7B3F00" }}>🪙</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// CAR VISUAL
// ─────────────────────────────────────────────────────────────
function CarChip({ obj }) {
  const op = useRef(new Animated.Value(1)).current;
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (obj.hit) {
      Animated.parallel([
        Animated.spring(sc, {
          toValue: 1.6,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [obj.hit]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.car,
        {
          left: obj.x,
          top: obj.y,
          backgroundColor: obj.color,
          opacity: op,
          transform: [{ scale: sc }],
        },
      ]}
    >
      <View style={styles.carWindshield} />
      <View style={styles.carBody}>
        <View style={styles.carWheelRow}>
          <View style={styles.carWheel} />
          <View style={styles.carWheel} />
        </View>
        <View style={styles.carWheelRow}>
          <View style={styles.carWheel} />
          <View style={styles.carWheel} />
        </View>
      </View>
      <View style={styles.carLights}>
        <View style={styles.carLight} />
        <View style={styles.carLight} />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// WORD CHIP  (green glowing pill the cat collects)
// ─────────────────────────────────────────────────────────────
function WordChip({ obj }) {
  // native-driver: opacity + scale on collect
  const op = useRef(new Animated.Value(1)).current;
  const sc = useRef(new Animated.Value(1)).current;
  // JS-driver: border/bg colour pulse — MUST be on a SEPARATE Animated.View
  const glow = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef(null);

  useEffect(() => {
    glowLoop.current = Animated.loop(
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
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    glowLoop.current.start();
    return () => glowLoop.current?.stop();
  }, []);

  useEffect(() => {
    if (obj.hit) {
      glowLoop.current?.stop(); // stop JS-driver loop before native-driver fires
      Animated.parallel([
        Animated.spring(sc, {
          toValue: 1.5,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [obj.hit]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(76,175,80,0.5)", "rgba(76,175,80,1)"],
  });
  const bgColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(76,175,80,0.15)", "rgba(76,175,80,0.32)"],
  });

  return (
    // Outer: JS-driver only (borderColor, backgroundColor) — no transform/opacity
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wordChip,
        { left: obj.x, top: obj.y, borderColor, backgroundColor: bgColor },
      ]}
    >
      {/* Inner: native-driver only (opacity, scale) — no colour props */}
      <Animated.View
        style={{
          opacity: op,
          transform: [{ scale: sc }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={styles.wordChipText}>{obj.text}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// ROAD
// ─────────────────────────────────────────────────────────────
function Road({ laneCount, dashOffset }) {
  const lanes = getLanes(laneCount);
  const dashH = 28,
    gapH = 18,
    total = dashH + gapH;
  const count = Math.ceil(ROAD_H / total) + 2;
  const off = dashOffset % total;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.road }]} />
      <View style={[styles.edgeLine, { left: 14 }]} />
      <View style={[styles.edgeLine, { right: 14 }]} />
      {lanes.slice(0, -1).map((lane, i) => {
        const lx = lane.x + lane.w - 1;
        return (
          <View
            key={i}
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
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// CAT  (replaces the bird — drawn with RN Views)
// ─────────────────────────────────────────────────────────────
function Cat({ animX, tailAnim, earAnim }) {
  // Tail wag: rotate left/right
  const tailRot = tailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-25deg", "25deg"],
  });
  // Ear twitch: tiny scale
  const earSc = earAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.cat, { transform: [{ translateX: animX }] }]}
    >
      {/* TAIL — sits behind body */}
      <Animated.View
        style={[styles.catTail, { transform: [{ rotate: tailRot }] }]}
      />

      {/* BODY */}
      <View style={styles.catBody}>
        {/* Tummy stripe */}
        <View style={styles.catTummy} />
        {/* FRONT PAWS */}
        <View style={styles.catPaws}>
          <View style={styles.catPaw} />
          <View style={styles.catPaw} />
        </View>
      </View>

      {/* HEAD */}
      <View style={styles.catHead}>
        {/* EARS */}
        <Animated.View
          style={[styles.catEarL, { transform: [{ scale: earSc }] }]}
        >
          <View style={styles.catEarInnerL} />
        </Animated.View>
        <Animated.View
          style={[styles.catEarR, { transform: [{ scale: earSc }] }]}
        >
          <View style={styles.catEarInnerR} />
        </Animated.View>
        {/* EYES */}
        <View style={styles.catEyeL}>
          <View style={styles.catPupilL} />
        </View>
        <View style={styles.catEyeR}>
          <View style={styles.catPupilR} />
        </View>
        {/* NOSE */}
        <View style={styles.catNose} />
        {/* WHISKERS */}
        <View style={styles.whiskerL1} />
        <View style={styles.whiskerL2} />
        <View style={styles.whiskerR1} />
        <View style={styles.whiskerR2} />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// IDLE OVERLAY
// ─────────────────────────────────────────────────────────────
function IdleOverlay({ onStart, onExit }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.overlayCenter} pointerEvents="box-none">
      {/* Exit button — top-left corner */}
      <TouchableOpacity
        style={styles.idleExitBtn}
        onPress={onExit}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.exitTxt}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.idleTitle}>Dodge the Car!</Text>
      <Text style={styles.idleSubtitle}>🐱 Don't get hit!</Text>
      <View style={styles.idleHintBox}>
        <Text style={styles.idleHintRow}>⬅️ Tap LEFT to move left</Text>
        <Text style={styles.idleHintRow}>➡️ Tap RIGHT to move right</Text>
        <Text style={styles.idleHintRow}>🟢 Touch green words for coins!</Text>
        <Text style={styles.idleHintRow}>
          🚗 Speed &amp; lanes increase over time
        </Text>
      </View>
      <Animated.View style={{ transform: [{ scale: pulse }], width: "72%" }}>
        <TouchableOpacity
          style={styles.tapHint}
          onPress={onStart}
          activeOpacity={0.85}
        >
          <Text style={styles.tapHintText}>▶ TAP TO START</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULT OVERLAY
// ─────────────────────────────────────────────────────────────
function ResultOverlay({ score, coins, survived, onReplay, onExit }) {
  const sc = useRef(new Animated.Value(0.6)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 5,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.overlayBg}>
      <Animated.View
        style={[styles.resultCard, { opacity: op, transform: [{ scale: sc }] }]}
      >
        <Text style={styles.resultEmoji}>💥</Text>
        <Text style={[styles.resultTitle, { color: C.red }]}>Crashed!</Text>
        <Text style={styles.resultMsg}>
          Dodged {score} cars · collected {coins} coins{"\n"}survived {survived}
          s
        </Text>
        <View style={styles.resultScoreRow}>
          <View style={styles.resultScorePill}>
            <Text style={styles.resultScoreLabel}>DODGED</Text>
            <Text style={styles.resultScoreVal}>{score}</Text>
          </View>
          <View style={styles.resultScorePill}>
            <Text style={styles.resultScoreLabel}>COINS</Text>
            <Text style={[styles.resultScoreVal, { color: C.yellow }]}>
              🪙 {coins}
            </Text>
          </View>
          <View style={styles.resultScorePill}>
            <Text style={styles.resultScoreLabel}>TIME</Text>
            <Text style={[styles.resultScoreVal, { color: C.green }]}>
              {survived}s
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.resultBtn, { backgroundColor: C.teal }]}
          onPress={onReplay}
          activeOpacity={0.85}
        >
          <Text style={styles.resultBtnText}>▶ Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.resultBtnSecondary}
          onPress={onExit}
          activeOpacity={0.75}
        >
          <Text style={styles.resultBtnSecText}>✕ Exit</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// WIN OVERLAY
// ─────────────────────────────────────────────────────────────
function WinOverlay({ score, coins, survived, onReplay, onExit }) {
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    // Card pop-in
    Animated.parallel([
      Animated.spring(sc, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Stars cascade in
    const starDelay = (val, delay) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(val, {
          toValue: 1,
          friction: 3,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    starDelay(star1, 300);
    starDelay(star2, 480);
    starDelay(star3, 660);

    // Shimmer sweep on trophy banner
    Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(shimX, {
          toValue: 300,
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

  return (
    <View style={styles.overlayBg}>
      <Animated.View
        style={[
          styles.resultCard,
          styles.winCard,
          { opacity: op, transform: [{ scale: sc }] },
        ]}
      >
        {/* Trophy banner with shimmer */}
        <View style={styles.winBanner}>
          <Animated.View
            pointerEvents="none"
            style={[styles.winShimmer, { transform: [{ translateX: shimX }] }]}
          />
          <Text style={styles.winBannerText}>🏆 YOU WIN!</Text>
        </View>

        {/* Stars row */}
        <View style={styles.starsRow}>
          {[star1, star2, star3].map((s, i) => (
            <Animated.Text
              key={i}
              style={[styles.starEmoji, { transform: [{ scale: s }] }]}
            >
              ⭐
            </Animated.Text>
          ))}
        </View>

        <Text style={styles.winSubtitle}>
          Amazing! You dodged {WIN_SCORE} cars!
        </Text>

        {/* Stats */}
        <View style={styles.resultScoreRow}>
          <View style={[styles.resultScorePill, styles.winPill]}>
            <Text style={styles.resultScoreLabel}>DODGED</Text>
            <Text style={[styles.resultScoreVal, { color: C.green }]}>
              {score}
            </Text>
          </View>
          <View style={[styles.resultScorePill, styles.winPill]}>
            <Text style={styles.resultScoreLabel}>COINS</Text>
            <Text style={[styles.resultScoreVal, { color: C.yellow }]}>
              🪙 {coins}
            </Text>
          </View>
          <View style={[styles.resultScorePill, styles.winPill]}>
            <Text style={styles.resultScoreLabel}>TIME</Text>
            <Text style={[styles.resultScoreVal, { color: C.teal }]}>
              {survived}s
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resultBtn, styles.winBtn]}
          onPress={onReplay}
          activeOpacity={0.85}
        >
          <Text style={styles.resultBtnText}>▶ Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.resultBtnSecondary}
          onPress={onExit}
          activeOpacity={0.75}
        >
          <Text style={styles.resultBtnSecText}>✕ Exit</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN GAME
// ─────────────────────────────────────────────────────────────
export default function DodgeCarGame({ onExit }) {
  const router = useRouter();

  // ── Render state ──────────────────────────────────────────
  const [phase, setPhase] = useState("idle");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [survived, setSurvived] = useState(0);
  const [laneCount, setLaneCount] = useState(2);
  const [objs, setObjs] = useState([]); // cars + words combined
  const [catLane, setCatLane] = useState(0);
  const [dashOffset, setDashOffset] = useState(0);
  const [level, setLevel] = useState(1);
  const [coinsAnim, setCoinsAnim] = useState([]);

  // ── Refs ──────────────────────────────────────────────────
  const phaseRef = useRef("idle");
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const survivedRef = useRef(0);
  const laneCountRef = useRef(2);
  const catLaneRef = useRef(0);
  const objsRef = useRef([]);
  const dashRef = useRef(0);
  const tickRef = useRef(0);
  const speedRef = useRef(SPEED_INIT);
  const coolRef = useRef(60);
  const coinIdRef = useRef(0);
  const loopRef = useRef(null);
  const renderRef = useRef(null);

  // ── Sounds ────────────────────────────────────────────────
  const sndButton = useRef(null); // button.mp3    — any button press
  const sndSwish = useRef(null); // swish.mp3     — cat switches lane
  const sndCorrect = useRef(null); // correct-hit.mp3 — cat eats word
  const sndHit = useRef(null); // hit.mp3       — cat hits car
  const sndWin = useRef(null); // win.mp3       — game won
  const sndLose = useRef(null); // lose.mp3      — game lost

  useEffect(() => {
    let alive = true;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const map = [
        [sndButton, require("../assets/audio/button.mp3")],
        [sndSwish, require("../assets/audio/swish.mp3")],
        [sndCorrect, require("../assets/audio/correct-hit.mp3")],
        [sndHit, require("../assets/audio/hit.mp3")],
        [sndWin, require("../assets/audio/win.mp3")],
        [sndLose, require("../assets/audio/lose.mp3")],
      ];
      for (const [ref, asset] of map) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset);
          if (alive) ref.current = sound;
          else sound.unloadAsync();
        } catch (_) {}
      }
    })();
    return () => {
      alive = false;
      [sndButton, sndSwish, sndCorrect, sndHit, sndWin, sndLose].forEach(
        (r) => {
          r.current?.unloadAsync();
          r.current = null;
        },
      );
    };
  }, []);

  const playSound = (ref) => {
    try {
      ref.current?.setPositionAsync(0).then(() => ref.current?.playAsync());
    } catch (_) {}
  };

  // Score badge position (top-right) — same ref pattern as Flappy
  const badgePos = useRef({ x: SW - 60, y: STATUS_H + 18 });
  const badgeScale = useRef(new Animated.Value(1)).current;

  // ── Cat animations ────────────────────────────────────────
  const catAnimX = useRef(new Animated.Value(0)).current;
  const tailAnim = useRef(new Animated.Value(0)).current;
  const earAnim = useRef(new Animated.Value(0)).current;
  const tailLoop = useRef(null);

  const startTailWag = () => {
    tailLoop.current?.stop();
    tailLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(tailAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tailAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    tailLoop.current.start();
  };
  const stopTailWag = () => {
    tailLoop.current?.stop();
    tailAnim.setValue(0);
  };

  const twitchEar = () => {
    Animated.sequence([
      Animated.timing(earAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(earAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Coin burst ────────────────────────────────────────────
  const pulseBadge = () => {
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1.4,
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

  const spawnCoins = (wx, wy) => {
    const newCoins = Array.from({ length: 4 }, (_, i) => ({
      id: coinIdRef.current++,
      startX: wx - 11,
      startY: wy - 11,
      endX: badgePos.current.x,
      endY: badgePos.current.y,
      delay: i * 60,
    }));
    setCoinsAnim((prev) => [...prev, ...newCoins]);
    setTimeout(pulseBadge, 320);
  };

  const removeCoin = (id) =>
    setCoinsAnim((prev) => prev.filter((c) => c.id !== id));

  // ── Throttled render ──────────────────────────────────────
  const scheduleRender = () => {
    if (renderRef.current) return;
    renderRef.current = setTimeout(() => {
      renderRef.current = null;
      setObjs([...objsRef.current]);
      setDashOffset(dashRef.current);
      setScore(scoreRef.current);
      setCoins(coinsRef.current);
      setLaneCount(laneCountRef.current);
      setCatLane(catLaneRef.current);
    }, 0);
  };

  // ── Exit ──────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    playSound(sndButton);
    stopTailWag();
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    phaseRef.current = "idle";
    if (typeof onExit === "function") {
      onExit();
    } else {
      router.back();
    }
  }, [onExit]);

  // ── End game (crash) ──────────────────────────────────────
  const endGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "dead";
    setPhase("dead");
    setSurvived(Math.floor(survivedRef.current / 60));
    stopTailWag();
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    playSound(sndHit);
    playSound(sndLose);
    scheduleRender();
  }, []);

  // ── Win game ──────────────────────────────────────────────
  const winGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "won";
    setPhase("won");
    setSurvived(Math.floor(survivedRef.current / 60));
    stopTailWag();
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    playSound(sndWin);
    scheduleRender();
  }, []);

  // ── Move cat ──────────────────────────────────────────────
  const moveCat = useCallback((dir) => {
    if (phaseRef.current !== "playing") return;
    const next = Math.max(
      0,
      Math.min(laneCountRef.current - 1, catLaneRef.current + dir),
    );
    if (next === catLaneRef.current) return;
    catLaneRef.current = next;
    playSound(sndSwish);
    twitchEar();
    const lanes = getLanes(laneCountRef.current);
    Animated.spring(catAnimX, {
      toValue: lanes[next].cx - CAT_W / 2,
      friction: 8,
      tension: 130,
      useNativeDriver: true,
    }).start();
    setCatLane(next);
  }, []);

  // ── Init ──────────────────────────────────────────────────
  const initGame = useCallback(() => {
    playSound(sndButton);
    tickRef.current = 0;
    scoreRef.current = 0;
    coinsRef.current = 0;
    survivedRef.current = 0;
    speedRef.current = SPEED_INIT;
    laneCountRef.current = 2;
    catLaneRef.current = 0;
    objsRef.current = [];
    dashRef.current = 0;
    coolRef.current = 60;

    const startX = getLanes(2)[0].cx - CAT_W / 2;
    catAnimX.setValue(startX);

    setScore(0);
    setCoins(0);
    setSurvived(0);
    setLaneCount(2);
    setCatLane(0);
    setObjs([]);
    setDashOffset(0);
    setLevel(1);
    setCoinsAnim([]);
    phaseRef.current = "playing";
    setPhase("playing");
    startTailWag();
  }, []);

  // ── Tick ──────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    tickRef.current++;
    survivedRef.current++;
    if (tickRef.current % SPEED_INC_EVERY === 0) {
      speedRef.current = Math.min(speedRef.current + SPEED_INC_AMT, SPEED_MAX);
      setLevel((l) => l + 1);
    }

    // Lane expansion
    const newLC = getLaneCount(scoreRef.current);
    if (newLC !== laneCountRef.current) {
      laneCountRef.current = newLC;
      if (catLaneRef.current >= newLC) {
        catLaneRef.current = newLC - 1;
        const ls = getLanes(newLC);
        Animated.spring(catAnimX, {
          toValue: ls[catLaneRef.current].cx - CAT_W / 2,
          friction: 8,
          tension: 130,
          useNativeDriver: true,
        }).start();
      }
    }

    // Scroll road dashes
    dashRef.current = (dashRef.current + speedRef.current) % 460;

    // Spawn object (car or word)
    coolRef.current--;
    if (coolRef.current <= 0) {
      const lanes = getLanes(laneCountRef.current);
      const occupied = new Set(
        objsRef.current
          .filter(
            (o) => o.y < ROAD_TOP + Math.max(CAR_H, WORD_H) * 2.5 && !o.hit,
          )
          .map((o) => Math.round(o.x)),
      );
      const free = lanes.filter((l) => {
        const ox = Math.round(l.cx - CAR_W / 2);
        const wx = Math.round(l.cx - WORD_W / 2);
        return !occupied.has(ox) && !occupied.has(wx);
      });

      if (free.length > 0) {
        const lane = free[Math.floor(Math.random() * free.length)];
        const spawnWord = Math.random() < WORD_SPAWN_CHANCE;
        objsRef.current = [
          ...objsRef.current,
          spawnWord ? makeWord(lane) : makeCar(lane),
        ];
      }

      const baseCool = Math.max(36, 100 - (speedRef.current - SPEED_INIT) * 6);
      coolRef.current = baseCool + Math.floor(Math.random() * 28);
    }

    // Move objects + collision
    const lanes = getLanes(laneCountRef.current);
    const catCX = lanes[Math.min(catLaneRef.current, lanes.length - 1)].cx;
    const catLeft = catCX - CAT_W / 2 + 6;
    const catRight = catCX + CAT_W / 2 - 6;
    const catTop = CAT_Y + 4;
    const catBot = CAT_Y + CAT_H - 4;

    let crashed = false;
    let wordHitX = null,
      wordHitY = null;

    objsRef.current = objsRef.current
      .map((o) => {
        const ny = o.y + speedRef.current;
        if (!o.hit) {
          const oLeft = o.x + 4;
          const oRight = o.x + o.w - 4;
          const oTop = ny;
          const oBot = ny + o.h;
          const collides =
            oLeft < catRight &&
            oRight > catLeft &&
            oTop < catBot &&
            oBot > catTop;

          if (collides) {
            if (o.kind === "car") {
              crashed = true;
              return { ...o, y: ny, hit: true };
            } else {
              // Word collected! +3 coins
              coinsRef.current += 3;
              wordHitX = o.x + o.w / 2;
              wordHitY = o.y + o.h / 2;
              playSound(sndCorrect);
              return { ...o, y: ny, hit: true };
            }
          }

          // Car passed = +1 dodge score
          if (
            o.kind === "car" &&
            !o.scored &&
            o.y + o.h < catTop &&
            ny + o.h >= catTop
          ) {
            scoreRef.current += 1;
            return { ...o, y: ny, scored: true };
          }
        }
        return { ...o, y: ny };
      })
      .filter((o) => o.y < ROAD_BOTTOM + 30);

    // Spawn coin animation for word collect
    if (wordHitX !== null) {
      spawnCoins(wordHitX, wordHitY);
    }

    if (crashed) {
      endGame();
      return;
    }

    // Win check — dodged enough cars
    if (scoreRef.current >= WIN_SCORE) {
      winGame();
      return;
    }

    scheduleRender();
  }, [endGame, winGame]);

  // ── Loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "playing") {
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
      stopTailWag();
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* SKY */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: C.bgMid }]}
        pointerEvents="none"
      >
        {[...Array(14)].map((_, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (i * 79 + 20) % (SW - 4),
              top: STATUS_H + 8 + ((i * 37) % 70),
              width: 2,
              height: 2,
              borderRadius: 1,
              backgroundColor: "rgba(0,188,212,0.35)",
            }}
          />
        ))}
      </View>

      {/* ROAD */}
      <View
        style={[StyleSheet.absoluteFill, { top: ROAD_TOP }]}
        pointerEvents="none"
      >
        <Road laneCount={laneCount} dashOffset={dashOffset} />
      </View>

      {/* CARS + WORDS */}
      {objs.map((o) =>
        o.kind === "car" ? (
          <CarChip key={o.id} obj={o} />
        ) : (
          <WordChip key={o.id} obj={o} />
        ),
      )}

      {/* FLYING COINS */}
      {coinsAnim.map((c) => (
        <FlyingCoin
          key={c.id}
          startX={c.startX}
          startY={c.startY}
          endX={c.endX}
          endY={c.endY}
          delay={c.delay}
          onDone={() => removeCoin(c.id)}
        />
      ))}

      {/* CAT */}
      {phase !== "idle" && (
        <View style={[styles.catWrapper, { top: CAT_Y }]} pointerEvents="none">
          <Cat animX={catAnimX} tailAnim={tailAnim} earAnim={earAnim} />
        </View>
      )}

      {/* HUD */}
      {phase === "playing" && (
        <View style={styles.hud} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={handleExit}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.exitTxt}>✕</Text>
          </TouchableOpacity>
          <View style={styles.scorePill}>
            <Text style={styles.scoreTxt}>
              🚗 {score}/{WIN_SCORE}
            </Text>
          </View>
          <Animated.View
            style={[styles.coinPill, { transform: [{ scale: badgeScale }] }]}
          >
            <Text style={styles.coinTxt}>🪙 {coins}</Text>
          </Animated.View>
          <View style={styles.levelPill}>
            <Text style={styles.levelTxt}>⚡ LV {level}</Text>
          </View>
        </View>
      )}

      {/* Lane unlock toast */}
      {phase === "playing" && laneCount > 2 && (
        <View style={styles.laneToast} pointerEvents="none">
          <Text style={styles.laneToastTxt}>
            🛣️ {laneCount} lanes unlocked!
          </Text>
        </View>
      )}

      {/* TAP ZONES */}
      {phase === "playing" && (
        <>
          <TouchableOpacity
            style={[styles.tapZone, { left: 0, width: SW / 2 }]}
            onPress={() => moveCat(-1)}
            activeOpacity={0.01}
          />
          <TouchableOpacity
            style={[styles.tapZone, { right: 0, width: SW / 2 }]}
            onPress={() => moveCat(1)}
            activeOpacity={0.01}
          />
        </>
      )}

      {/* Arrow hints */}
      {phase === "playing" && (
        <View style={styles.arrowHints} pointerEvents="none">
          <Text style={styles.arrowTxt}>◀</Text>
          <Text style={styles.arrowTxt}>▶</Text>
        </View>
      )}

      {phase === "idle" && (
        <IdleOverlay onStart={initGame} onExit={handleExit} />
      )}

      {phase === "dead" && (
        <ResultOverlay
          score={score}
          coins={coins}
          survived={Math.floor(survivedRef.current / 60)}
          onReplay={initGame}
          onExit={handleExit}
        />
      )}

      {phase === "won" && (
        <WinOverlay
          score={score}
          coins={coins}
          survived={Math.floor(survivedRef.current / 60)}
          onReplay={initGame}
          onExit={handleExit}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: "hidden" },

  // Road
  edgeLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: C.roadEdge,
    borderRadius: 2,
  },

  // Car
  car: {
    position: "absolute",
    width: CAR_W,
    height: CAR_H,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 50,
  },
  carWindshield: {
    width: CAR_W - 14,
    height: 14,
    backgroundColor: "rgba(180,230,255,0.55)",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  carBody: { width: "100%", gap: 3, paddingHorizontal: 3 },
  carWheelRow: { flexDirection: "row", justifyContent: "space-between" },
  carWheel: {
    width: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#555",
  },
  carLights: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 6,
  },
  carLight: {
    width: 9,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFF9C4",
    shadowColor: "#FFD54F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },

  // Word chip
  wordChip: {
    position: "absolute",
    width: WORD_W,
    height: WORD_H,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  wordChipText: {
    fontSize: WORD_FONT,
    fontWeight: "900",
    color: C.green,
    letterSpacing: 0.5,
  },

  // Cat wrapper
  catWrapper: { position: "absolute", left: 0, right: 0, zIndex: 60 },

  // Cat body
  cat: {
    position: "absolute",
    width: CAT_W,
    height: CAT_H + 10, // +10 for tail clearance at top
  },
  catBody: {
    position: "absolute",
    bottom: 0,
    left: 4,
    width: CAT_W - 8,
    height: CAT_H - 12,
    backgroundColor: "#F4A460",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#CD853F",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    shadowColor: "#CD853F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  catTummy: {
    width: "55%",
    height: "45%",
    backgroundColor: "#FAEBD7",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(205,133,63,0.4)",
  },
  catPaws: { flexDirection: "row", gap: 10, marginTop: 2 },
  catPaw: {
    width: 12,
    height: 8,
    backgroundColor: "#F4A460",
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CD853F",
  },

  // Tail — positioned behind/left of body
  catTail: {
    position: "absolute",
    bottom: 6,
    right: -12,
    width: 20,
    height: 36,
    backgroundColor: "#F4A460",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CD853F",
    transformOrigin: "bottom center",
  },

  // Head — sits on top of body
  catHead: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -(CAT_W * 0.42),
    width: CAT_W * 0.84,
    height: CAT_W * 0.72,
    backgroundColor: "#F4A460",
    borderRadius: (CAT_W * 0.84) / 2,
    borderWidth: 2,
    borderColor: "#CD853F",
    shadowColor: "#CD853F",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },

  // Ears
  catEarL: {
    position: "absolute",
    top: -10,
    left: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#F4A460",
  },
  catEarR: {
    position: "absolute",
    top: -10,
    right: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#F4A460",
  },
  catEarInnerL: {
    position: "absolute",
    top: 3,
    left: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFB6C1",
  },
  catEarInnerR: {
    position: "absolute",
    top: 3,
    left: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFB6C1",
  },

  // Eyes
  catEyeL: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7CFC00",
    borderWidth: 1.5,
    borderColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
  },
  catEyeR: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7CFC00",
    borderWidth: 1.5,
    borderColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
  },
  catPupilL: { width: 4, height: 7, borderRadius: 2, backgroundColor: "#111" },
  catPupilR: { width: 4, height: 7, borderRadius: 2, backgroundColor: "#111" },

  // Nose
  catNose: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF69B4",
  },

  // Whiskers
  whiskerL1: {
    position: "absolute",
    bottom: 13,
    left: 0,
    width: 14,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.5)",
    borderRadius: 1,
  },
  whiskerL2: {
    position: "absolute",
    bottom: 10,
    left: 0,
    width: 14,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.5)",
    borderRadius: 1,
  },
  whiskerR1: {
    position: "absolute",
    bottom: 13,
    right: 0,
    width: 14,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.5)",
    borderRadius: 1,
  },
  whiskerR2: {
    position: "absolute",
    bottom: 10,
    right: 0,
    width: 14,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.5)",
    borderRadius: 1,
  },

  // HUD
  hud: {
    position: "absolute",
    top: STATUS_H + 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 100,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  exitTxt: { fontSize: 13, color: C.textSec, fontWeight: "700" },
  scorePill: {
    backgroundColor: C.tealDim,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  scoreTxt: { fontSize: 14, fontWeight: "900", color: C.teal },
  coinPill: {
    backgroundColor: C.yellowDim,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  coinTxt: { fontSize: 14, fontWeight: "900", color: C.yellow },
  levelPill: {
    backgroundColor: "rgba(76,175,80,0.15)",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(76,175,80,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelTxt: { fontSize: 13, fontWeight: "900", color: C.green },

  laneToast: {
    position: "absolute",
    top: STATUS_H + 58,
    alignSelf: "center",
    backgroundColor: "rgba(0,188,212,0.18)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: 16,
    paddingVertical: 6,
    zIndex: 90,
  },
  laneToastTxt: { fontSize: 13, fontWeight: "800", color: C.teal },

  arrowHints: {
    position: "absolute",
    bottom: ROAD_BOTTOM - CAT_Y + CAT_H + 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    zIndex: 65,
  },
  arrowTxt: { fontSize: 22, color: "rgba(0,188,212,0.3)", fontWeight: "900" },

  tapZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 70,
    backgroundColor: "transparent",
  },

  // Overlays
  overlayCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    backgroundColor: "rgba(8,8,26,0.78)",
  },
  idleExitBtn: {
    position: "absolute",
    top: STATUS_H + 14,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  idleTitle: {
    fontSize: 40,
    fontWeight: "900",
    color: C.teal,
    letterSpacing: 1,
    fontFamily:
      Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
    textShadowColor: "rgba(0,188,212,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginBottom: 6,
  },
  idleSubtitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.yellow,
    letterSpacing: 2,
    marginBottom: 28,
    textShadowColor: "rgba(255,213,79,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  idleHintBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 32,
    gap: 10,
    width: "80%",
  },
  idleHintRow: { fontSize: 14, color: C.textSec, lineHeight: 22 },
  tapHint: {
    backgroundColor: C.teal,
    borderRadius: 30,
    paddingHorizontal: 36,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 12,
  },
  tapHintText: {
    fontSize: 18,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 1,
  },

  overlayBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8,8,26,0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
  },
  resultCard: {
    width: SW * 0.88,
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: 28,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  resultEmoji: { fontSize: 64, marginBottom: 8 },
  resultTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  resultMsg: {
    fontSize: 13,
    color: C.textSec,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  resultScoreRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  resultScorePill: {
    flex: 1,
    backgroundColor: C.tealDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.tealBorder,
    padding: 12,
    alignItems: "center",
  },
  resultScoreLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  resultScoreVal: { fontSize: 22, fontWeight: "900", color: C.teal },
  resultBtn: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  resultBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 0.4,
  },
  resultBtnSecondary: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  resultBtnSecText: { fontSize: 14, fontWeight: "700", color: C.textSec },

  // ── Win overlay ───────────────────────────────────────────
  winCard: {
    borderColor: "rgba(255,213,79,0.45)",
    shadowColor: "#FFD54F",
  },
  winBanner: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,213,79,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.5)",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  winShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ skewX: "-18deg" }],
  },
  winBannerText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFD54F",
    letterSpacing: 1.5,
    textShadowColor: "rgba(255,213,79,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  starsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  starEmoji: { fontSize: 38 },
  winSubtitle: {
    fontSize: 14,
    color: C.textSec,
    marginBottom: 20,
    textAlign: "center",
  },
  winPill: {
    borderColor: "rgba(255,213,79,0.3)",
    backgroundColor: "rgba(255,213,79,0.07)",
  },
  winBtn: { backgroundColor: "#FFD54F", shadowColor: "#FFD54F" },
});
