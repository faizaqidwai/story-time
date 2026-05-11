/**
 * DinoWorldGame.jsx
 *
 * DINO WORLD — Children's word-learning game
 *
 * MECHANICS:
 *  - Looping MP4 background video fills screen
 *  - Baby dino animated via PNG sprite sheet (transparent background preserved!)
 *    Sprite sheet: 850×624px, 15 frames (5 cols × 3 rows), 170×208 per frame
 *    Animated at 12fps using setInterval cycling through frames
 *  - Tap LEFT half = dino moves left (sprite flipped via scaleX:-1)
 *  - Tap RIGHT half = dino moves right (natural)
 *  - Eggs fall from top carrying words — dino walks under to collect
 *  - Correct word = stars + points; Wrong = penalty; Missed target = penalty
 *  - 5 rounds, 90s timer per round
 *
 * ASSETS:
 *   assets/games/dino-world/bg.mp4          ← dino-world-bg.mp4
 *   assets/games/dino-world/dino-sprite.png ← dino-sprite.png (sprite sheet)
 *
 * _layout.jsx:
 *   <Stack.Screen name="DinoWorldGame"
 *     options={{headerShown:false, animation:"slide_from_bottom", gestureEnabled:false}}/>
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Audio } from "expo-av";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ImageBackground } from "react-native";

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
const STATUS_H =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;
const TICK_MS = 16; // ~60fps

// Dino sprite sheet constants
const SPRITE_COLS = 5;
const SPRITE_ROWS = 3;
const SPRITE_FRAMES = 15;
const SPRITE_FW = 170;
const SPRITE_FH = 208;
const SPRITE_SHEET_W = 850;
const SPRITE_SHEET_H = 624;
const SPRITE_FPS = 12;
const SPRITE_INTERVAL_MS = Math.round(1000 / SPRITE_FPS);

const DINO_W = 115;
const DINO_H = Math.round((SPRITE_FH / SPRITE_FW) * DINO_W);
const SPRITE_SCALE = DINO_W / SPRITE_FW;
const SHEET_DISP_W = SPRITE_SHEET_W * SPRITE_SCALE;
const SHEET_DISP_H = SPRITE_SHEET_H * SPRITE_SCALE;
const DINO_Y_FRAC = 0.87;
const DINO_SPEED = 2.2;

const EGG_W = 92;
const EGG_H = 76;
const EGG_SPEED_MIN = 1.4;
const EGG_SPEED_MAX = 2.6;
const MAX_ON_SCREEN = 3;
const SPAWN_EVERY_MS = 1600;

const PTS_CORRECT = 10;
const PTS_WRONG = -5;
const PTS_MISSED = -3;
const ROUND_SECS = 90;

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#1a3a1a",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.15)",
  yellowBorder: "rgba(255,213,79,0.6)",
  red: "#EF5350",
  green: "#4CAF50",
  teal: "#00BCD4",
  tealBorder: "rgba(0,188,212,0.5)",
  eggShell: "#FFF9C4",
  eggBorder: "#F9A825",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
  white: "#FFFFFF",
};

// ─── FALLBACK ROUNDS ──────────────────────────────────────────────────────────
// Used when no gameDataJson is passed (e.g. during development or if backend
// has no data for the current level). Identical to the original ROUNDS constant.
// The component reads from `rounds` (resolved at runtime), never from this
// constant directly — so switching to backend data requires zero other changes.
const FALLBACK_ROUNDS = [
  {
    id: 1,
    category: "Size",
    emoji: "📏",
    briefing: 'Catch eggs with SIZE words!\n"big","small","tall" — size words.',
    targetWords: ["big","small","tall","short","huge","tiny","wide","narrow","large","little"],
    distractWords: ["happy","run","blue","jump","fast","loud","sweet","cold","sing","red"],
  },
  {
    id: 2,
    category: "Colors",
    emoji: "🌈",
    briefing: 'Catch eggs with COLOR words!\n"red","blue","green" — colors.',
    targetWords: ["red","blue","green","yellow","pink","purple","orange","black","white","brown"],
    distractWords: ["big","run","loud","jump","happy","slow","soft","round","shiny","cold"],
  },
  {
    id: 3,
    category: "Animals",
    emoji: "🐾",
    briefing: "Catch eggs with ANIMAL words!\nDog, cat, lion — animal names.",
    targetWords: ["dog","cat","lion","tiger","bird","frog","bear","wolf","duck","fish"],
    distractWords: ["apple","run","blue","table","happy","fast","jump","cloud","red","warm"],
  },
  {
    id: 4,
    category: "Feelings",
    emoji: "💛",
    briefing: 'Catch eggs with FEELING words!\n"happy","sad","brave" — feelings.',
    targetWords: ["happy","sad","angry","scared","excited","tired","proud","silly","calm","brave"],
    distractWords: ["dog","green","run","table","big","cloud","fast","apple","blue","swim"],
  },
  {
    id: 5,
    category: "Actions",
    emoji: "⚡",
    briefing: 'Catch eggs with ACTION words!\n"run","jump","fly" — actions.',
    targetWords: ["run","jump","swim","fly","sing","dance","eat","sleep","climb","read"],
    distractWords: ["big","red","dog","table","happy","cloud","apple","blue","shiny","soft"],
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

// buildQ takes any round object — works with both backend and fallback data
const buildQ = (round) =>
  shuffle([
    ...shuffle(round.targetWords).slice(0, 10).map((w) => ({ word: w, isTarget: true })),
    ...shuffle(round.distractWords).slice(0, 10).map((w) => ({ word: w, isTarget: false })),
  ]);

// ─── PURE COMPONENTS (no rounds dependency — receive data via props) ──────────

function DinoSprite({ x, y, dir }) {
  const frameRef = useRef(0);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % SPRITE_FRAMES;
      setFrame(frameRef.current);
    }, SPRITE_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);
  const col = frame % SPRITE_COLS;
  const row = Math.floor(frame / SPRITE_COLS);
  const offsetX = -(col * DINO_W);
  const offsetY = -(row * DINO_H);
  return (
    <View style={{ position: "absolute", left: x - DINO_W / 2, top: y - DINO_H, width: DINO_W, height: DINO_H, overflow: "hidden", zIndex: 80, transform: [{ scaleX: dir }] }}>
      <Image
        source={require("../../assets/games/dino-world/dino-sprite.png")}
        style={{ width: SHEET_DISP_W, height: SHEET_DISP_H, marginLeft: offsetX, marginTop: offsetY }}
        resizeMode="stretch"
      />
    </View>
  );
}

function EggSprite({ egg }) {
  const wobble = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;
  const op = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);
  useEffect(() => {
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wobble, { toValue: -1, duration: 380, useNativeDriver: true }),
      ]),
    );
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, []);
  useEffect(() => {
    if (egg.collected) {
      loopRef.current?.stop();
      Animated.parallel([
        Animated.spring(sc, { toValue: 1.7, friction: 3, tension: 100, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [egg.collected]);
  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: egg.x - EGG_W / 2, top: egg.y, width: EGG_W, height: EGG_H, zIndex: 60, opacity: op, transform: [{ scale: sc }, { rotate }] }}>
      <View style={{ flex: 1, backgroundColor: C.eggShell, borderRadius: EGG_W * 0.52, borderWidth: 3, borderColor: C.eggBorder, alignItems: "center", justifyContent: "center", shadowColor: C.eggBorder, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 8 }}>
        <View style={{ position: "absolute", top: 8, left: 11, width: 18, height: 11, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 9, transform: [{ rotate: "-25deg" }] }} />
        <View style={{ position: "absolute", top: 5, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(249,168,37,0.38)" }} />
        <View style={{ position: "absolute", bottom: 8, left: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(249,168,37,0.28)" }} />
        <Text style={{ fontSize: Math.min(15, 95 / Math.max(egg.word.length, 1)), fontWeight: "900", color: "#5D4037", textAlign: "center", letterSpacing: 0.2 }}>
          {egg.word}
        </Text>
      </View>
    </Animated.View>
  );
}

function CatchBurst({ x, y, isCorrect, onDone }) {
  const sc = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 2, friction: 3, tension: 80, useNativeDriver: true }),
      Animated.sequence([Animated.delay(150), Animated.timing(op, { toValue: 0, duration: 280, useNativeDriver: true })]),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: x - 36, top: y - 36, width: 72, height: 72, alignItems: "center", justifyContent: "center", zIndex: 200, opacity: op, transform: [{ scale: sc }] }}>
      <Text style={{ fontSize: 40 }}>{isCorrect ? "🎉" : "💥"}</Text>
    </Animated.View>
  );
}

function FlyingStar({ startX, startY, endX, endY, delay, onDone }) {
  const ax = useRef(new Animated.Value(startX)).current;
  const ay = useRef(new Animated.Value(startY)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(ax, { toValue: endX, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ay, { toValue: endY, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => Animated.timing(op, { toValue: 0, duration: 80, useNativeDriver: true }).start(onDone));
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width: 26, height: 26, zIndex: 999, opacity: op, transform: [{ translateX: ax }, { translateY: ay }, { scale: sc }] }}>
      <Text style={{ fontSize: 22 }}>⭐</Text>
    </Animated.View>
  );
}

function Notif({ text, color, icon, sw, sh, onDone }) {
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => Animated.timing(op, { toValue: 0, duration: 280, useNativeDriver: true }).start(onDone), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: sw * 0.08, right: sw * 0.08, top: sh * 0.43, zIndex: 500, opacity: op, transform: [{ scale: sc }] }}>
      <View style={{ backgroundColor: "rgba(5,20,5,0.97)", borderRadius: 20, borderWidth: 2.5, borderColor: color, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20, elevation: 14 }}>
        <Text style={{ fontSize: 26, marginBottom: 3 }}>{icon}</Text>
        <Text style={{ fontSize: 15, fontWeight: "900", color, textAlign: "center" }}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function TapZones({ sw, sh, onLeft, onRight, active }) {
  if (!active) return null;
  return (
    <>
      <TouchableOpacity style={{ position: "absolute", left: 0, top: 0, width: sw / 2, height: sh, zIndex: 40 }} onPress={onLeft} activeOpacity={1}>
        <View style={{ position: "absolute", left: 14, top: "50%", marginTop: -28, opacity: 0.3 }}>
          <Text style={{ fontSize: 38, color: "#FFF" }}>◀</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={{ position: "absolute", right: 0, top: 0, width: sw / 2, height: sh, zIndex: 40 }} onPress={onRight} activeOpacity={1}>
        <View style={{ position: "absolute", right: 14, top: "50%", marginTop: -28, opacity: 0.3 }}>
          <Text style={{ fontSize: 38, color: "#FFF" }}>▶</Text>
        </View>
      </TouchableOpacity>
    </>
  );
}

function Hud({ round, timeLeft, score, onExit, badgeScale }) {
  return (
    <View style={st.hud}>
      <TouchableOpacity style={st.exitBtn} onPress={onExit} activeOpacity={0.8} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Text style={st.exitTxt}>✕</Text>
      </TouchableOpacity>
      <View style={st.hudCenter}>
        <Text style={st.hudCat}>{round.emoji} {round.category}</Text>
        <Text style={[st.hudTime, timeLeft <= 10 && { color: C.red }]}>{timeLeft}s</Text>
      </View>
      <Animated.View style={[st.scorePill, { transform: [{ scale: badgeScale }] }]}>
        <Text style={st.scoreTxt}>⭐ {score}</Text>
      </Animated.View>
    </View>
  );
}

function IdleOverlay({ onStart, onExit }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <ImageBackground source={require("../../assets/games/dino-world/cover.jpg")} resizeMode="stretch" style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={st.topExit} onPress={onExit} activeOpacity={0.8} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Text style={st.exitTxt}>✕</Text>
      </TouchableOpacity>
      <View style={{ alignItems: "center", justifyContent: "center", marginTop: "160%" }}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity onPress={onStart} activeOpacity={0.85}>
            <ImageBackground source={require("../../assets/games/dino-world/start.png")} style={st.startBtnBg} imageStyle={st.startBtnImage} resizeMode="stretch" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

// ── RoundBriefing receives totalRounds as prop instead of reading ROUNDS.length
function RoundBriefing({ round, totalRounds, onStart, onExit }) {
  const slide = useRef(new Animated.Value(60)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, friction: 5, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <View style={st.overlayBg}>
      <TouchableOpacity style={st.topExit} onPress={onExit} activeOpacity={0.8} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Text style={st.exitTxt}>✕</Text>
      </TouchableOpacity>
      <Animated.View style={[st.card, { transform: [{ translateY: slide }], opacity: fade }]}>
        <View style={st.roundHeader}>
          {/* totalRounds prop replaces hardcoded ROUNDS.length */}
          <Text style={st.roundHeaderTxt}>🥚 ROUND {round.id} of {totalRounds}</Text>
        </View>
        <Text style={{ fontSize: 42, marginBottom: 6 }}>{round.emoji}</Text>
        <Text style={st.cardTitle}>{round.category} Words</Text>
        <Text style={st.cardDesc}>{round.briefing}</Text>
        <Text style={{ color: C.textSec, fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 1 }}>CATCH THESE EGGS:</Text>
        <View style={st.chipRow}>
          {round.targetWords.slice(0, 8).map((w) => (
            <View key={w} style={st.chip}>
              <Text style={st.chipText}>{w}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[st.greenBtn, { width: "100%" }]} onPress={onStart} activeOpacity={0.85}>
          <Text style={st.greenBtnText}>🦕 GO!</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── ResultOverlay receives isLast as prop (computed in component from resolved rounds)
function ResultOverlay({ score, caught, missed, isLast, onNext, onExit }) {
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-220)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  const stars = caught >= 8 ? 3 : caught >= 5 ? 2 : 1;
  const title = stars === 3 ? "Egg Expert! 🏆" : stars === 2 ? "Nice Catch! ⭐" : "Keep Trying! 🥚";
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    [[s1, 300], [s2, 480], [s3, 660]].forEach(([s, d]) =>
      Animated.sequence([Animated.delay(d), Animated.spring(s, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true })]).start(),
    );
    Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(shimX, { toValue: 340, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimX, { toValue: -220, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <View style={st.overlayBg}>
      <Animated.View style={[st.resultCard, { opacity: op, transform: [{ scale: sc }] }]}>
        <View style={st.resultBanner}>
          <Animated.View pointerEvents="none" style={[st.resultShimmer, { transform: [{ translateX: shimX }] }]} />
          <Text style={st.resultBannerText}>{title}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {[s1, s2, s3].map((s, i) => (
            <Animated.Text key={i} style={[{ fontSize: 30 }, i >= stars && { opacity: 0.15 }, { transform: [{ scale: s }] }]}>⭐</Animated.Text>
          ))}
        </View>
        <View style={st.statRow}>
          <View style={st.statPill}><Text style={st.statLabel}>CAUGHT</Text><Text style={[st.statVal, { color: C.green }]}>{caught}</Text></View>
          <View style={st.statPill}><Text style={st.statLabel}>MISSED</Text><Text style={[st.statVal, { color: C.red }]}>{missed}</Text></View>
          <View style={st.statPill}><Text style={st.statLabel}>SCORE</Text><Text style={[st.statVal, { color: C.yellow }]}>{score}</Text></View>
        </View>
        <TouchableOpacity style={[st.goldBtn, { marginBottom: 10 }]} onPress={onNext} activeOpacity={0.85}>
          <Text style={st.goldBtnText}>{isLast ? "🏆 Final Score!" : "🦕  Next Round"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.secondaryBtn} onPress={onExit} activeOpacity={0.75}>
          <Text style={st.secondaryBtnText}>✕ Exit Game</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function FinalOverlay({ totalScore, onRestart, onExit }) {
  const grade = totalScore >= 200 ? "Dino Champion! 🏆" : totalScore >= 120 ? "Egg Expert! 🌟" : "Baby Dino 🦕";
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const shimX = useRef(new Animated.Value(-220)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    [[s1, 300], [s2, 480], [s3, 660]].forEach(([s, d]) =>
      Animated.sequence([Animated.delay(d), Animated.spring(s, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true })]).start(),
    );
    Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(shimX, { toValue: 340, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimX, { toValue: -220, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.96, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <View style={st.overlayBg}>
      <Animated.View style={[st.resultCard, st.finalCard, { opacity: op, transform: [{ scale: sc }] }]}>
        <View style={[st.resultBanner, st.finalBanner]}>
          <Animated.View pointerEvents="none" style={[st.resultShimmer, { transform: [{ translateX: shimX }] }]} />
          <Text style={st.resultBannerText}>🏆 Game Complete!</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          {[s1, s2, s3].map((s, i) => (
            <Animated.Text key={i} style={{ fontSize: 32, transform: [{ scale: s }] }}>⭐</Animated.Text>
          ))}
        </View>
        <Text style={{ color: C.yellow, fontSize: 15, fontWeight: "700", marginBottom: 14, textAlign: "center" }}>{grade}</Text>
        <View style={[st.statRow, { width: "100%" }]}>
          <View style={[st.statPill, st.totalPill]}>
            <Text style={st.statLabel}>TOTAL SCORE</Text>
            <Text style={[st.statVal, { color: C.yellow, fontSize: 36 }]}>{totalScore}</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ scale: pulse }], width: "100%", marginBottom: 10 }}>
          <TouchableOpacity style={st.goldBtn} onPress={onRestart} activeOpacity={0.85}>
            <Text style={st.goldBtnText}>🦕 Play Again!</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity style={st.secondaryBtn} onPress={onExit} activeOpacity={0.75}>
          <Text style={st.secondaryBtnText}>✕ Exit Game</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function DinoWorldGame({ onExit }) {
  const { gameDataJson } = useLocalSearchParams();
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();

  // ── Resolve rounds from params once — falls back to FALLBACK_ROUNDS ────────
  // gameDataJson comes from GamificationContext.startPlay via router params.
  // The backend stores rounds as an array under gameData["level_N"].
  // If absent (dev mode, no backend data) FALLBACK_ROUNDS is used.
  const rounds = useMemo(() => {
    try {
      if (!gameDataJson) return FALLBACK_ROUNDS;
      const parsed = JSON.parse(gameDataJson);
      // Backend data is an array of round objects matching the FALLBACK_ROUNDS shape
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].targetWords) {
        console.log("[DinoWorldGame] using backend rounds, count:", parsed.length);
        return parsed;
      }
      console.log("[DinoWorldGame] gameDataJson invalid shape — using fallback");
      return FALLBACK_ROUNDS;
    } catch (_) {
      return FALLBACK_ROUNDS;
    }
  }, [gameDataJson]);

  // Derived constants — computed once from resolved rounds
  const totalRounds = rounds.length;

  const DINO_Y = sh * DINO_Y_FRAC;
  const BADGE_X = sw - 55;
  const BADGE_Y = STATUS_H + 12;

  // ── Render state ──────────────────────────────────────────
  const [phase, setPhase] = useState("idle");
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECS);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [eggs, setEggs] = useState([]);
  const [dinoX, setDinoX] = useState(sw * 0.15);
  const [dinoDir, setDinoDir] = useState(1);
  const [stars, setStars] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [notif, setNotif] = useState(null);

  // ── Game refs ─────────────────────────────────────────────
  const phaseRef = useRef("idle");
  const scoreRef = useRef(0);
  const caughtRef = useRef(0);
  const missedRef = useRef(0);
  const dinoXRef = useRef(sw * 0.15);
  const dinoDirRef = useRef(1);
  const eggsRef = useRef([]);
  const queueRef = useRef([]);
  const queueIdxRef = useRef(0);
  const starIdRef = useRef(0);
  const burstIdRef = useRef(0);
  const loopRef = useRef(null);
  const clockRef = useRef(null);
  const spawnTimRef = useRef(null);
  const renderRef = useRef(null);
  const badgeScale = useRef(new Animated.Value(1)).current;

  const scheduleRender = () => {
    if (renderRef.current) return;
    renderRef.current = setTimeout(() => {
      renderRef.current = null;
      setEggs([...eggsRef.current]);
      setDinoX(dinoXRef.current);
      setDinoDir(dinoDirRef.current);
      setScore(scoreRef.current);
      setCaught(caughtRef.current);
      setMissed(missedRef.current);
    }, 0);
  };

  // ── Sounds ────────────────────────────────────────────────
  const sndCorrect = useRef(null);
  const sndWrong = useRef(null);
  const sndWin = useRef(null);
  const sndLose = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }); } catch (_) {}
      for (const [r, a] of [
        [sndCorrect, require("../../assets/sounds/game/correct-hit.mp3")],
        [sndWrong, require("../../assets/sounds/game/wrong-hit.mp3")],
        [sndWin, require("../../assets/sounds/game/win.mp3")],
        [sndLose, require("../../assets/sounds/game/lose.mp3")],
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
      [sndCorrect, sndWrong, sndWin, sndLose].forEach((r) => {
        r.current?.unloadAsync();
        r.current = null;
      });
    };
  }, []);

  const playSound = (r) => {
    try { r.current?.setPositionAsync(0).then(() => r.current?.playAsync()); } catch (_) {}
  };

  const pulseBadge = () => {
    Animated.sequence([
      Animated.spring(badgeScale, { toValue: 1.45, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
  };

  const spawnStars = (x, y) => {
    const s = Array.from({ length: 6 }, (_, i) => ({
      id: starIdRef.current++,
      startX: x - 13, startY: y - 13,
      endX: BADGE_X, endY: BADGE_Y,
      delay: i * 65,
    }));
    setStars((prev) => [...prev, ...s]);
    setTimeout(pulseBadge, 400);
  };

  const stopAll = () => {
    clearInterval(loopRef.current); loopRef.current = null;
    clearInterval(clockRef.current); clockRef.current = null;
    clearInterval(spawnTimRef.current); spawnTimRef.current = null;
  };

  const endRound = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "result";
    stopAll();
    eggsRef.current = [];
    setEggs([]);
    setLastResult({ score: scoreRef.current, caught: caughtRef.current, missed: missedRef.current });
    setPhase("result");
    playSound(scoreRef.current >= 0 ? sndWin : sndLose);
  }, []);

  const doSpawnEgg = () => {
    if (phaseRef.current !== "playing") return;
    const active = eggsRef.current.filter((e) => !e.collected).length;
    if (active >= MAX_ON_SCREEN) return;
    if (queueIdxRef.current >= queueRef.current.length) return;
    const item = queueRef.current[queueIdxRef.current];
    queueIdxRef.current++;
    const egg = {
      id: uid(),
      x: EGG_W / 2 + 10 + Math.random() * (sw - EGG_W - 20),
      y: -EGG_H - 5,
      speed: EGG_SPEED_MIN + Math.random() * (EGG_SPEED_MAX - EGG_SPEED_MIN),
      word: item.word,
      isTarget: item.isTarget,
      collected: false,
    };
    eggsRef.current = [...eggsRef.current, egg];
  };

  const tickFnRef = useRef(null);
  tickFnRef.current = () => {
    if (phaseRef.current !== "playing") return;
    let nx = dinoXRef.current + dinoDirRef.current * DINO_SPEED;
    const minX = DINO_W / 2;
    const maxX = sw - DINO_W / 2;
    if (nx >= maxX) { nx = maxX; dinoDirRef.current = -1; }
    if (nx <= minX) { nx = minX; dinoDirRef.current = 1; }
    dinoXRef.current = nx;

    const dinoLeft = dinoXRef.current - DINO_W / 2 + 14;
    const dinoRight = dinoXRef.current + DINO_W / 2 - 14;
    const catchTop = DINO_Y - DINO_H + 10;
    let correctCatch = null;
    let wrongCatch = null;

    const nextEggs = eggsRef.current.map((egg) => {
      if (egg.collected) return egg;
      const ny = egg.y + egg.speed;
      const eggLeft = egg.x - EGG_W / 2;
      const eggRight = egg.x + EGG_W / 2;
      const eggBot = ny + EGG_H;
      const hitH = eggRight >= dinoLeft && eggLeft <= dinoRight;
      const hitV = eggBot >= catchTop && ny <= DINO_Y + 10;
      if (hitH && hitV) {
        if (egg.isTarget) correctCatch = egg;
        else wrongCatch = egg;
        return { ...egg, y: ny, collected: true };
      }
      if (ny > sh + 10) {
        if (egg.isTarget) {
          scoreRef.current += PTS_MISSED;
          missedRef.current++;
          setNotif({ id: uid(), text: `💨 Egg escaped! ${PTS_MISSED}`, color: C.red, icon: "😢" });
        }
        return null;
      }
      return { ...egg, y: ny };
    }).filter(Boolean);

    eggsRef.current = nextEggs;

    if (correctCatch) {
      scoreRef.current += PTS_CORRECT;
      caughtRef.current++;
      playSound(sndCorrect);
      const bx = correctCatch.x, by = DINO_Y - DINO_H / 2;
      spawnStars(bx, by);
      setBursts((prev) => [...prev, { id: burstIdRef.current++, x: bx, y: by, isCorrect: true }]);
      setNotif({ id: uid(), text: `🎉 Great catch! +${PTS_CORRECT}`, color: C.green, icon: "🥚" });
    }
    if (wrongCatch) {
      scoreRef.current += PTS_WRONG;
      playSound(sndWrong);
      const bx = wrongCatch.x, by = DINO_Y - DINO_H / 2;
      setBursts((prev) => [...prev, { id: burstIdRef.current++, x: bx, y: by, isCorrect: false }]);
      setNotif({ id: uid(), text: `❌ Wrong egg! ${PTS_WRONG}`, color: C.red, icon: "💥" });
    }

    const allSpawned = queueIdxRef.current >= queueRef.current.length;
    const noEggsLeft = eggsRef.current.filter((e) => !e.collected).length === 0;
    if (allSpawned && noEggsLeft) { endRound(); return; }
    scheduleRender();
  };

  // ── startRound reads from resolved `rounds` array ─────────
  const startRound = useCallback(
    (idx) => {
      // reads from `rounds` (resolved from gameDataJson or FALLBACK_ROUNDS)
      const round = rounds[idx];
      const q = buildQ(round);

      queueRef.current = q;
      queueIdxRef.current = 0;
      scoreRef.current = 0;
      caughtRef.current = 0;
      missedRef.current = 0;
      eggsRef.current = [];
      dinoXRef.current = sw * 0.15;
      dinoDirRef.current = 1;

      setScore(0);
      setCaught(0);
      setMissed(0);
      setEggs([]);
      setStars([]);
      setBursts([]);
      setNotif(null);
      setDinoX(sw * 0.15);
      setDinoDir(1);
      setTimeLeft(ROUND_SECS);

      phaseRef.current = "playing";
      setPhase("playing");
      stopAll();

      loopRef.current = setInterval(() => tickFnRef.current(), TICK_MS);
      spawnTimRef.current = setInterval(doSpawnEgg, SPAWN_EVERY_MS);
      setTimeout(doSpawnEgg, 600);
      clockRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { endRound(); return 0; }
          return t - 1;
        });
      }, 1000);
    },
    [sw, endRound, rounds], // `rounds` in deps so it always uses fresh data
  );

  useEffect(() => () => stopAll(), []);

  const handleLeft = () => { dinoDirRef.current = -1; setDinoDir(-1); };
  const handleRight = () => { dinoDirRef.current = 1; setDinoDir(1); };

  const handleStartGame = () => {
    setRoundIndex(0);
    setTotalScore(0);
    phaseRef.current = "briefing";
    setPhase("briefing");
  };
  const handleStartRound = () => startRound(roundIndex);

  const handleNext = () => {
    const ns = lastResult?.score ?? 0;
    // Uses totalRounds (derived from resolved rounds) not hardcoded ROUNDS.length
    if (roundIndex + 1 >= totalRounds) {
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
  // round reads from resolved `rounds` — not the module-level FALLBACK_ROUNDS
  const round = rounds[roundIndex];

  return (
    <View style={st.root}>
      <Video
        source={require("../../assets/games/dino-world/bg.mp4")}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        shouldPlay isLooping isMuted rate={1.0}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.15)", zIndex: 2 }]} pointerEvents="none" />

      {eggs.map((egg) => <EggSprite key={egg.id} egg={egg} />)}

      {(isPlaying || phase === "briefing") && (
        <DinoSprite x={dinoX} y={DINO_Y} dir={dinoDir} />
      )}

      {bursts.map((b) => (
        <CatchBurst key={b.id} x={b.x} y={b.y} isCorrect={b.isCorrect} onDone={() => setBursts((prev) => prev.filter((x) => x.id !== b.id))} />
      ))}

      {stars.map((s) => (
        <FlyingStar key={s.id} startX={s.startX} startY={s.startY} endX={s.endX} endY={s.endY} delay={s.delay} onDone={() => setStars((prev) => prev.filter((x) => x.id !== s.id))} />
      ))}

      {notif && <Notif key={notif.id} text={notif.text} color={notif.color} icon={notif.icon} sw={sw} sh={sh} onDone={() => setNotif(null)} />}

      {isPlaying && <Hud round={round} timeLeft={timeLeft} score={score} onExit={handleExit} badgeScale={badgeScale} />}

      <TapZones sw={sw} sh={sh} onLeft={handleLeft} onRight={handleRight} active={isPlaying} />

      {isPlaying && (
        <View style={[st.tapBar, { left: sw * 0.06, right: sw * 0.06 }]} pointerEvents="none">
          <Text style={st.tapBarText}>◀ Tap sides to steer the dino ▶</Text>
        </View>
      )}

      {phase === "idle" && <IdleOverlay onStart={handleStartGame} onExit={handleExit} />}

      {phase === "briefing" && (
        // totalRounds passed as prop — RoundBriefing no longer touches ROUNDS
        <RoundBriefing round={round} totalRounds={totalRounds} onStart={handleStartRound} onExit={handleExit} />
      )}

      {phase === "result" && lastResult && (
        // isLast computed from totalRounds — not hardcoded ROUNDS.length
        <ResultOverlay
          score={lastResult.score}
          caught={lastResult.caught}
          missed={lastResult.missed}
          isLast={roundIndex + 1 >= totalRounds}
          onNext={handleNext}
          onExit={handleExit}
        />
      )}

      {phase === "final" && <FinalOverlay totalScore={totalScore} onRestart={handleRestart} onExit={handleExit} />}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: "hidden" },
  hud: { position: "absolute", top: STATUS_H + 6, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, zIndex: 200 },
  exitBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  topExit: { position: "absolute", top: STATUS_H + 12, right: 14, zIndex: 500, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  exitTxt: { color: "#ECEFF1", fontSize: 15, fontWeight: "700" },
  hudCenter: { alignItems: "center", flex: 1 },
  hudCat: { fontSize: 14, fontWeight: "800", color: "#FFF", textShadowColor: "rgba(0,0,0,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  hudTime: { fontSize: 22, fontWeight: "900", color: "#FFF", lineHeight: 26, textShadowColor: "rgba(0,0,0,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  scorePill: { backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20, borderWidth: 1.5, borderColor: C.yellowBorder, paddingHorizontal: 14, paddingVertical: 6, minWidth: 70, alignItems: "center" },
  scoreTxt: { fontSize: 14, fontWeight: "900", color: C.yellow, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  tapBar: { position: "absolute", bottom: 28, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 28, paddingVertical: 10, alignItems: "center", zIndex: 150, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)" },
  tapBarText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,18,3,0.88)", alignItems: "center", justifyContent: "center", zIndex: 400, paddingHorizontal: 22 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "rgba(5,22,5,0.97)", borderRadius: 28, borderWidth: 1.5, borderColor: "rgba(105,240,174,0.4)", padding: 24, alignItems: "center", shadowColor: "#69F0AE", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10 },
  roundHeader: { width: "100%", backgroundColor: "rgba(105,240,174,0.12)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(105,240,174,0.35)", paddingVertical: 10, alignItems: "center", marginBottom: 12 },
  roundHeaderTxt: { fontSize: 12, fontWeight: "900", color: "#69F0AE", letterSpacing: 2 },
  cardTitle: { fontSize: 22, fontWeight: "900", color: "#FFF", marginBottom: 8, textAlign: "center" },
  cardDesc: { fontSize: 13, color: "#B2DFDB", textAlign: "center", lineHeight: 20, marginBottom: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 18 },
  chip: { backgroundColor: "rgba(105,240,174,0.12)", borderColor: "rgba(105,240,174,0.4)", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { color: "#69F0AE", fontWeight: "800", fontSize: 12 },
  greenBtn: { backgroundColor: "#2E7D32", borderRadius: 30, paddingHorizontal: 36, paddingVertical: 15, alignItems: "center", shadowColor: "#69F0AE", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16, elevation: 10, borderWidth: 2, borderColor: "#69F0AE" },
  startBtnBg: { width: 230, height: 150, justifyContent: "center", alignItems: "center" },
  startBtnImage: { borderRadius: 40 },
  greenBtnText: { fontSize: 18, fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },
  resultCard: { width: "100%", maxWidth: 400, backgroundColor: "rgba(10,20,10,0.98)", borderRadius: 28, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", padding: 24, alignItems: "center", shadowColor: C.yellow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 10 },
  finalCard: { borderColor: "rgba(255,213,79,0.75)", shadowOpacity: 0.45 },
  resultBanner: { width: "100%", borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,213,79,0.12)", borderWidth: 1.5, borderColor: "rgba(255,213,79,0.5)", paddingVertical: 14, alignItems: "center", marginBottom: 14 },
  finalBanner: { backgroundColor: "rgba(255,213,79,0.2)", borderColor: "rgba(255,213,79,0.85)" },
  resultShimmer: { position: "absolute", top: 0, bottom: 0, width: 80, backgroundColor: "rgba(255,255,255,0.18)", transform: [{ skewX: "-18deg" }] },
  resultBannerText: { fontSize: 20, fontWeight: "900", color: C.yellow, letterSpacing: 1, textShadowColor: "rgba(255,213,79,0.6)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 20, width: "100%" },
  statPill: { flex: 1, backgroundColor: "rgba(255,213,79,0.07)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,213,79,0.3)", padding: 12, alignItems: "center" },
  totalPill: { backgroundColor: "rgba(255,213,79,0.12)", borderColor: "rgba(255,213,79,0.6)" },
  statLabel: { fontSize: 9, fontWeight: "900", color: C.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  statVal: { fontSize: 24, fontWeight: "900", color: C.yellow },
  goldBtn: { width: "100%", borderRadius: 28, paddingVertical: 15, alignItems: "center", backgroundColor: C.yellow, shadowColor: C.yellow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 12, elevation: 8 },
  goldBtnText: { fontSize: 16, fontWeight: "900", color: "#1a2e1a", letterSpacing: 0.4 },
  secondaryBtn: { width: "100%", borderRadius: 28, paddingVertical: 13, alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: C.textSec },
});
