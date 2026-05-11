/**
 * FlappyWordGame.jsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   ✅ Removed useGamification() — caused ReferenceError outside GamificationProvider
 *   ✅ THEMES object renamed to FALLBACK_THEMES (kept as module-level fallback)
 *   ✅ FALLBACK_THEMES_ARRAY — flat array version used as useMemo fallback
 *   ✅ gameDataJson read from route params via useLocalSearchParams
 *   ✅ themes resolved inside component via useMemo (falls back to FALLBACK_THEMES_ARRAY)
 *   ✅ Backend shape: gameData["level_N"] = { garden: {...}, ocean: {...}, space: {...} }
 *      → Object.values() converts named-theme object to array automatically
 *   ✅ pickTheme(themesArray) now accepts themes as parameter — no module-level read
 *   ✅ initGame uses resolved themes — always fresh at play-start time
 *   ✅ All game physics, word logic, animations, and UI unchanged
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Audio } from "expo-av";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ImageBackground } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const TICK_MS = 16;
const GRAVITY = 0.28;
const TAP_IMPULSE = -7.5;
const MAX_FALL_VEL = 7;
const BIRD_X = SW * 0.22;
const BIRD_W = 52;
const BIRD_H = 38;
const GROUND_Y = SH - 80;

const WORD_SPEED = 2.8;
const WORD_SPAWN_EVERY = 110;
const WORD_PADDING_H = 18;
const WORD_PADDING_V = 10;
const WORD_FONT_SIZE = 18;
const WORD_CHAR_W = 11.5;

const BG_SPEED_CLOUD = 0.6;
const BG_SPEED_BUILDING = 1.2;
const BG_SPEED_GROUND = WORD_SPEED;

const C = {
  bg: "#171756ad",
  bgMid: "#0d0d28",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.18)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.15)",
  yellowBorder: "rgba(255,213,79,0.6)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.2)",
  greenBorder: "rgba(76,175,80,0.65)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.2)",
  redBorder: "rgba(239,83,80,0.6)",
  purple: "#9652D9",
  cloud: "rgba(2, 48, 112, 0.97)",
  cloudBorder: "rgba(2, 48, 112, 0.97)",
  building: "rgba(80, 110, 200, 0.15)",
  buildingWin: "rgba(0, 187, 212, 0.23)",
  ground: "rgba(0,188,212,0.15)",
  white: "#FFFFFF",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

// ─── FALLBACK THEMES ──────────────────────────────────────────────────────────
// Used when no gameDataJson is passed or backend has no data for this level.
// The component reads from `themes` (resolved at runtime) — never from these
// constants directly — so wiring backend data requires zero other changes.
//
// Backend shape for gameData["level_N"]:
//   {
//     garden: { label: "🌸 Garden", collect: [...], avoid: [...] },
//     ocean:  { label: "🌊 Ocean",  collect: [...], avoid: [...] },
//     space:  { label: "🚀 Space",  collect: [...], avoid: [...] },
//   }
// Object.values() converts this named-theme object to the flat array the game needs.
const FALLBACK_THEMES_ARRAY = [
  {
    label: "🌸 Garden",
    collect: ["rose","tulip","daisy","lily","stem","leaf","seed","root","petal","bloom","soil","rake","fence","gate","path","hedge","shrub","moss","vine","bud"],
    avoid:   ["rock","brick","stone","mud","rain","frost","snow","hail","worm","slug","pest","weed","thorn","mold","dust","rust","bark","grit","clay","sand"],
  },
  {
    label: "🌊 Ocean",
    collect: ["wave","coral","shell","pearl","fish","reef","tide","crab","kelp","foam","sail","buoy","whale","seal","orca","gull","sand","bay","cove","deep"],
    avoid:   ["storm","cliff","rock","rain","hail","mist","ship","net","hook","trap","cage","rust","slime","moss","brine","salt","grit","mud","cold","dark"],
  },
  {
    label: "🚀 Space",
    collect: ["star","moon","mars","ring","nova","comet","orbit","solar","flare","dust","beam","void","glow","core","pulse","quark","dark","warp","rift","zone"],
    avoid:   ["crash","burn","blast","bang","hole","trap","cloud","smog","waste","storm","bolt","flak","rock","shard","cold","void","shock","rift","tear","fall"],
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// pickTheme now receives the resolved themes array — never reads the module-level fallback
function pickTheme(themesArray) {
  return themesArray[Math.floor(Math.random() * themesArray.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _wid = 0;
function makeWord(text, isCollect, collectIndex) {
  const w = text.length * WORD_CHAR_W + WORD_PADDING_H * 2;
  const h = WORD_FONT_SIZE + WORD_PADDING_V * 2;
  const minY = STATUS_H + 120;
  const maxY = GROUND_Y - h - 20;
  return {
    id: _wid++, text, isCollect, collectIndex,
    x: SW + 20,
    y: minY + Math.random() * (maxY - minY),
    w, h, hit: false,
  };
}

function FlyingCoin({ startX, startY, endX, endY, delay, onDone }) {
  const ax = useRef(new Animated.Value(startX)).current;
  const ay = useRef(new Animated.Value(startY)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(ax, { toValue: endX, duration: 420 + Math.random() * 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ay, { toValue: endY, duration: 420 + Math.random() * 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() =>
      Animated.timing(op, { toValue: 0, duration: 80, useNativeDriver: true }).start(onDone),
    );
  }, []);

  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: C.yellow, borderWidth: 2, borderColor: "#FFB300", alignItems: "center", justifyContent: "center", zIndex: 999, opacity: op, transform: [{ translateX: ax }, { translateY: ay }, { scale: sc }] }}>
      <Text style={{ fontSize: 11, color: "#7B3F00" }}>🪙</Text>
    </Animated.View>
  );
}

function makeBgObj(type) {
  const isCloud = type === "cloud";
  const minY = isCloud ? STATUS_H + 20 : SH * 0.3;
  const maxY = isCloud ? SH * 0.55 : GROUND_Y - 80;
  const h = isCloud ? 30 + Math.random() * 50 : 80 + Math.random() * 160;
  const w = isCloud ? 80 + Math.random() * 120 : 30 + Math.random() * 60;
  return {
    id: _wid++, type,
    x: SW + Math.random() * 200,
    y: maxY - (type === "cloud" ? Math.random() * (maxY - minY) : h),
    w, h,
    speed: isCloud ? BG_SPEED_CLOUD : BG_SPEED_BUILDING,
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function FlappyWordGame({ onExit }) {
  const router = useRouter();

  // ── Resolve themes from route params ──────────────────────────────────────
  // gameDataJson is passed by GamificationContext.startPlay via router.push params.
  // Backend shape: { garden: {...}, ocean: {...}, space: {...} } — a named-theme object.
  // Object.values() converts it to the flat array the game needs.
  // Also handles array shape in case the resolver already converted it.
  // Falls back to FALLBACK_THEMES_ARRAY when absent or invalid.
  const { gameDataJson } = useLocalSearchParams();

  const themes = useMemo(() => {
    try {
      if (!gameDataJson) return FALLBACK_THEMES_ARRAY;
      const parsed = JSON.parse(gameDataJson);
      if (!parsed || typeof parsed !== "object") return FALLBACK_THEMES_ARRAY;

      // Support both object shape { garden: {...} } and array shape [{...}]
      const arr = Array.isArray(parsed) ? parsed : Object.values(parsed);

      if (
        arr.length > 0 &&
        Array.isArray(arr[0]?.collect) &&
        arr[0].collect.length > 0 &&
        Array.isArray(arr[0]?.avoid) &&
        arr[0].avoid.length > 0
      ) {
        console.log("[FlappyWordGame] using backend themes, count:", arr.length);
        return arr;
      }
      console.log("[FlappyWordGame] invalid theme shape — using fallback");
      return FALLBACK_THEMES_ARRAY;
    } catch (_) {
      return FALLBACK_THEMES_ARRAY;
    }
  }, [gameDataJson]);

  // ── State ─────────────────────────────────────────────────
  const [phase, setPhase] = useState("idle");
  const [score, setScore] = useState(0);
  const [coinsAnim, setCoinsAnim] = useState([]);
  const [birdY, setBirdY] = useState(SH / 2 - 60);
  const [birdRot, setBirdRot] = useState(0);
  const [words, setWords] = useState([]);

  const initialBgObjs = (() => {
    const clouds = Array.from({ length: 6 }, () => makeBgObj("cloud"));
    const buildings = Array.from({ length: 5 }, () => makeBgObj("building"));
    return [...clouds, ...buildings].map((o) => ({ ...o, x: Math.random() * SW }));
  })();
  const [bgObjs, setBgObjs] = useState(initialBgObjs);
  const [groundX, setGroundX] = useState(0);

  const themeRef = useRef(null);
  const collectQueueRef = useRef([]);
  const collectIdxRef = useRef(0);
  const [collectQueue, setCollectQueue] = useState([]);
  const [collectIdx, setCollectIdx] = useState(0);

  // ── Refs ──────────────────────────────────────────────────
  const birdYRef = useRef(SH / 2 - 60);
  const birdVelRef = useRef(0);
  const wordsRef = useRef([]);
  const bgObjsRef = useRef(initialBgObjs);
  const groundXRef = useRef(0);
  const tickRef = useRef(0);
  const phaseRef = useRef("idle");
  const scoreRef = useRef(0);
  const coinIdRef = useRef(0);
  const coinBadgePos = useRef({ x: SW - 70, y: STATUS_H + 18 });
  const loopRef = useRef(null);

  // ── Sounds ────────────────────────────────────────────────
  const sndButton = useRef(null);
  const sndPop = useRef(null);
  const sndCorrect = useRef(null);
  const sndWrong = useRef(null);
  const sndWin = useRef(null);
  const sndLose = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const map = [
        [sndButton, require("../../assets/sounds/button.mp3")],
        [sndPop, require("../../assets/sounds/pop.mp3")],
        [sndCorrect, require("../../assets/sounds/game/correct-hit.mp3")],
        [sndWrong, require("../../assets/sounds/game/wrong-hit.mp3")],
        [sndWin, require("../../assets/sounds/game/win.mp3")],
        [sndLose, require("../../assets/sounds/game/lose.mp3")],
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
      [sndButton, sndPop, sndCorrect, sndWrong, sndWin, sndLose].forEach((r) => {
        r.current?.unloadAsync(); r.current = null;
      });
    };
  }, []);

  const playSound = (ref) => {
    try { ref.current?.setPositionAsync(0).then(() => ref.current?.playAsync()); } catch (_) {}
  };

  const badgeScale = useRef(new Animated.Value(1)).current;
  const wingAnim = useRef(new Animated.Value(0)).current;
  const wingLoop = useRef(null);

  const renderRef = useRef(null);
  const scheduleRender = () => {
    if (renderRef.current) return;
    renderRef.current = setTimeout(() => {
      renderRef.current = null;
      setBirdY(birdYRef.current);
      setBirdRot(Math.max(-30, Math.min(70, birdVelRef.current * 4)));
      setWords([...wordsRef.current]);
      setBgObjs([...bgObjsRef.current]);
      setGroundX(groundXRef.current % (SW * 2));
      setCollectIdx(collectIdxRef.current);
    }, 0);
  };

  const startFlap = () => {
    wingLoop.current?.stop();
    wingLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(wingAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(wingAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]),
    );
    wingLoop.current.start();
  };
  const stopFlap = () => { wingLoop.current?.stop(); wingAnim.setValue(0); };

  const handleExit = useCallback(() => {
    stopFlap();
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    phaseRef.current = "idle";
    if (typeof onExit === "function") onExit();
    else router.back();
  }, [onExit]);

  const endGame = useCallback((result) => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = result;
    setPhase(result);
    stopFlap();
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    playSound(result === "won" ? sndWin : sndLose);
    scheduleRender();
  }, []);

  // ── initGame reads from resolved `themes` at play-start time ─────────────
  // `themes` is in the useCallback deps so initGame is always recreated
  // with the latest resolved theme list (backend or fallback).
  const initGame = useCallback(() => {
    // Pick a random theme from the resolved array — backend or fallback
    const theme = pickTheme(themes);
    console.log(
      "[FlappyWordGame] initGame — theme:", theme.label,
      "| source:", gameDataJson ? "backend" : "fallback",
    );

    themeRef.current = theme;
    const cq = shuffle(theme.collect).slice(0, 20);
    collectQueueRef.current = cq;
    collectIdxRef.current = 0;
    birdYRef.current = SH / 2 - 60;
    birdVelRef.current = 0;
    wordsRef.current = [];
    tickRef.current = 0;
    scoreRef.current = 0;

    const freshBg = [
      ...Array.from({ length: 6 }, () => makeBgObj("cloud")),
      ...Array.from({ length: 5 }, () => makeBgObj("building")),
    ].map((o) => ({ ...o, x: Math.random() * SW }));
    bgObjsRef.current = freshBg;
    setBgObjs(freshBg);

    setCollectQueue(cq);
    setCollectIdx(0);
    setScore(0);
    setWords([]);
    setCoinsAnim([]);
    phaseRef.current = "playing";
    setPhase("playing");
    startFlap();
  }, [themes, gameDataJson]); // `themes` in deps — always picks from current data

  const handleTap = useCallback(() => {
    if (phaseRef.current === "idle") {
      playSound(sndButton);
      initGame();
      return;
    }
    if (phaseRef.current !== "playing") return;
    playSound(sndPop);
    birdVelRef.current = TAP_IMPULSE;
  }, [initGame]);

  const pulseBadge = () => {
    Animated.sequence([
      Animated.spring(badgeScale, { toValue: 1.4, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
  };

  const spawnCoins = (wx, wy) => {
    const coins = Array.from({ length: 5 }, (_, i) => ({
      id: coinIdRef.current++,
      startX: wx - 11, startY: wy - 11,
      endX: coinBadgePos.current.x, endY: coinBadgePos.current.y,
      delay: i * 60,
    }));
    setCoinsAnim((prev) => [...prev, ...coins]);
    setTimeout(pulseBadge, 350);
  };

  const removeCoin = (id) => setCoinsAnim((prev) => prev.filter((c) => c.id !== id));

  const tick = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    tickRef.current++;

    birdVelRef.current = Math.min(birdVelRef.current + GRAVITY, MAX_FALL_VEL);
    birdYRef.current += birdVelRef.current;

    if (birdYRef.current <= STATUS_H + 115) {
      birdYRef.current = STATUS_H + 115;
      birdVelRef.current = 0;
    }
    if (birdYRef.current >= GROUND_Y - BIRD_H) { endGame("dead"); return; }

    bgObjsRef.current = bgObjsRef.current.map((o) => {
      const nx = o.x - o.speed;
      if (nx + o.w < 0) return { ...makeBgObj(o.type), x: SW + 40 };
      return { ...o, x: nx };
    });

    groundXRef.current -= BG_SPEED_GROUND;

    if (tickRef.current % WORD_SPAWN_EVERY === 0) {
      const theme = themeRef.current;
      const cidx = collectIdxRef.current;
      const cq = collectQueueRef.current;
      if (cidx < cq.length) {
        const cWord = makeWord(cq[cidx], true, cidx);
        const MIN_GAP_Y = 180;
        const avoidObjs = shuffle(theme.avoid)
          .slice(0, 1 + Math.floor(Math.random() * 2))
          .map((a) => {
            const w = makeWord(a, false, -1);
            const diff = w.y - cWord.y;
            if (Math.abs(diff) < MIN_GAP_Y) {
              w.y = diff >= 0 ? cWord.y + MIN_GAP_Y : cWord.y - MIN_GAP_Y - w.h;
              w.y = Math.max(STATUS_H + 140, Math.min(GROUND_Y - w.h - 40, w.y));
            }
            return w;
          });
        wordsRef.current = [...wordsRef.current, cWord, ...avoidObjs];
        collectIdxRef.current = cidx + 1;
      }
    }

    const bx1 = BIRD_X - BIRD_W / 2 + 6;
    const bx2 = BIRD_X + BIRD_W / 2 - 6;
    const by1 = birdYRef.current + 4;
    const by2 = birdYRef.current + BIRD_H - 4;
    let died = false;

    wordsRef.current = wordsRef.current
      .map((w) => {
        if (w.hit) return w;
        const nx = w.x - WORD_SPEED;
        if (bx1 < nx + w.w && bx2 > nx && by1 < w.y + w.h && by2 > w.y) {
          if (w.isCollect) {
            scoreRef.current += 100;
            setScore(scoreRef.current);
            spawnCoins(nx + w.w / 2, w.y + w.h / 2);
            playSound(sndCorrect);
            return { ...w, x: nx, hit: true };
          } else {
            playSound(sndWrong);
            died = true;
            return w;
          }
        }
        return { ...w, x: nx };
      })
      .filter((w) => w.x + w.w > -20);

    if (died) { endGame("dead"); return; }

    const allSpawned = collectIdxRef.current >= collectQueueRef.current.length;
    const allCollected =
      collectQueueRef.current.length > 0 &&
      wordsRef.current.filter((w) => w.isCollect && !w.hit).length === 0 &&
      allSpawned;
    if (allCollected) { endGame("won"); return; }

    scheduleRender();
  }, [endGame]);

  useEffect(() => {
    if (phase === "playing") {
      loopRef.current = setInterval(tick, TICK_MS);
    } else {
      if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    }
    return () => {
      if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    };
  }, [phase, tick]);

  useEffect(() => () => {
    if (loopRef.current) clearInterval(loopRef.current);
    stopFlap();
  }, []);

  const wingY = wingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.root}>
        <ImageBackground source={require("../../assets/games/flappy-word/game-back.jpg")} resizeMode="stretch" style={StyleSheet.absoluteFill}>
          {/* BACKGROUND */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "transparent", borderBottomWidth: SH * 0.5, borderBottomColor: "rgba(13, 13, 40, 0.42)", borderTopWidth: 0 }]} />
            {bgObjs.map((o) =>
              o.type === "cloud"
                ? <CloudShape key={o.id} x={o.x} y={o.y} w={o.w} h={o.h} />
                : <BuildingShape key={o.id} x={o.x} y={o.y} w={o.w} h={o.h} />,
            )}
            <GroundStripe offsetX={groundX} />
          </View>

          {/* FLYING COINS */}
          {coinsAnim.map((c) => (
            <FlyingCoin key={c.id} startX={c.startX} startY={c.startY} endX={c.endX} endY={c.endY} delay={c.delay} onDone={() => removeCoin(c.id)} />
          ))}

          {/* HUD */}
          <View style={styles.hud} pointerEvents="box-none">
            <TouchableOpacity style={styles.exitBtn} onPress={handleExit} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.exitTxt}>✕</Text>
            </TouchableOpacity>
            <Animated.View style={[styles.scorePill, { transform: [{ scale: badgeScale }] }]}>
              <Text style={styles.scoreTxt}>🪙 {score}</Text>
            </Animated.View>
          </View>

          {/* TICKER */}
          {phase === "playing" && <WordTicker queue={collectQueue} currentIdx={collectIdx} />}

          {/* WORDS */}
          {words.map((w) => <WordChip key={w.id} word={w} />)}

          {/* BIRD */}
          {phase !== "idle" && (
            <Animated.View pointerEvents="none" style={[styles.bird, { top: birdY, left: BIRD_X - BIRD_W / 2, transform: [{ rotate: `${birdRot}deg` }] }]}>
              <View style={styles.birdBody}>
                <Animated.View style={[styles.birdWing, { transform: [{ translateY: wingY }] }]} />
                <View style={styles.birdEye}><View style={styles.birdPupil} /></View>
                <View style={styles.birdBeak} />
                <View style={styles.birdGlow} />
              </View>
            </Animated.View>
          )}
        </ImageBackground>

        {phase === "idle" && <IdleOverlay />}

        {(phase === "dead" || phase === "won") && (
          <ResultOverlay
            phase={phase}
            score={score}
            total={collectQueue.length}
            theme={themeRef.current?.label ?? ""}
            onReplay={initGame}
            onExit={handleExit}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─────────────────────────────────────────────────────────────
// WORD CHIP
// ─────────────────────────────────────────────────────────────
function WordChip({ word }) {
  const op = useRef(new Animated.Value(word.hit ? 0 : 1)).current;
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (word.hit) {
      Animated.parallel([
        Animated.spring(sc, { toValue: 1.5, friction: 3, tension: 200, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [word.hit]);
  const bg = word.isCollect ? C.greenDim : C.redDim;
  const border = word.isCollect ? C.greenBorder : C.redBorder;
  const color = word.isCollect ? C.green : C.red;
  return (
    <Animated.View pointerEvents="none" style={[styles.wordChip, { left: word.x, top: word.y, width: word.w, height: word.h, backgroundColor: bg, borderColor: border, opacity: op, transform: [{ scale: sc }] }]}>
      <Text style={[styles.wordChipText, { color }]}>{word.text}</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// WORD TICKER
// ─────────────────────────────────────────────────────────────
const TICKER_ITEM_W = 90;

function WordTicker({ queue, currentIdx }) {
  const scrollRef = useRef(null);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef(null);

  useEffect(() => {
    const offset = Math.max(0, currentIdx - 1) * TICKER_ITEM_W;
    scrollRef.current?.scrollTo({ x: offset, animated: true });
  }, [currentIdx]);

  useEffect(() => {
    glowLoop.current?.stop();
    glowAnim.setValue(0);
    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    glowLoop.current.start();
    return () => glowLoop.current?.stop();
  }, [currentIdx]);

  const glowBorder = glowAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(0,188,212,0.5)", "rgba(0,188,212,1)"] });
  const glowBg = glowAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(0,188,212,0.15)", "rgba(0,188,212,0.35)"] });

  return (
    <View style={styles.ticker} pointerEvents="none">
      <View style={styles.tickerLabelWrap}>
        <Text style={styles.tickerLabel}>NEXT</Text>
        <Text style={styles.tickerArrow}>▶</Text>
      </View>
      <Animated.ScrollView ref={scrollRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerScroll} style={{ flex: 1 }}>
        {queue.map((w, i) => {
          const isCurrent = i === currentIdx;
          const isPast = i < currentIdx;
          if (isCurrent) {
            return (
              <Animated.View key={i} style={[styles.tickerWord, { backgroundColor: glowBg, borderColor: glowBorder, shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 8, width: TICKER_ITEM_W }]}>
                <Text style={styles.tickerWordTextActive}>{w}</Text>
                <Text style={styles.tickerArrowSmall}>←</Text>
              </Animated.View>
            );
          }
          return (
            <View key={i} style={[styles.tickerWord, isPast ? styles.tickerWordPast : styles.tickerWordUpcoming, { width: TICKER_ITEM_W }]}>
              <Text style={[styles.tickerWordText, isPast && styles.tickerWordTextPast]}>{isPast ? "✓ " : ""}{w}</Text>
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// BACKGROUND SHAPES — unchanged from original
// ─────────────────────────────────────────────────────────────
function CloudShape({ x, y, w, h }) {
  return (
    <View style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <View style={{ position: "absolute", bottom: 0, left: w * 0.1, width: w * 0.8, height: h * 0.6, borderRadius: h * 0.3, backgroundColor: C.cloud, borderWidth: 1, borderColor: C.cloudBorder }} />
      <View style={{ position: "absolute", bottom: h * 0.3, left: 0, width: w * 0.45, height: h * 0.55, borderRadius: h * 0.28, backgroundColor: C.cloud, borderWidth: 1, borderColor: C.cloudBorder }} />
      <View style={{ position: "absolute", bottom: h * 0.3, right: w * 0.05, width: w * 0.4, height: h * 0.5, borderRadius: h * 0.25, backgroundColor: C.cloud, borderWidth: 1, borderColor: C.cloudBorder }} />
      <View style={{ position: "absolute", top: 0, left: w * 0.28, width: w * 0.44, height: h * 0.6, borderRadius: h * 0.3, backgroundColor: C.cloud, borderWidth: 1, borderColor: C.cloudBorder }} />
    </View>
  );
}

function BuildingShape({ x, y, w, h }) {
  const winRows = Math.floor(h / 26);
  return (
    <View style={{ position: "absolute", left: x, top: y, width: w, height: h + 100 }}>
      <View style={{ flex: 1, backgroundColor: C.building, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderWidth: 1, borderColor: "rgba(80,120,220,0.18)", overflow: "hidden" }}>
        {Array.from({ length: winRows }).map((_, i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 6, paddingHorizontal: 4 }}>
            <View style={{ width: (w - 16) * 0.42, height: 8, backgroundColor: C.buildingWin, borderRadius: 2 }} />
            <View style={{ width: (w - 16) * 0.42, height: 8, backgroundColor: C.buildingWin, borderRadius: 2 }} />
          </View>
        ))}
      </View>
      <View style={{ position: "absolute", top: -3, left: w * 0.3, width: w * 0.4, height: 4, backgroundColor: "rgba(0, 187, 212, 0.49)", borderRadius: 2 }} />
    </View>
  );
}

function GroundStripe({ offsetX }) {
  return (
    <View style={{ position: "absolute", bottom: 60, left: offsetX, width: SW * 3, height: 2 }}>
      <View style={{ flex: 1, backgroundColor: C.tealBorder }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// IDLE OVERLAY — unchanged from original
// ─────────────────────────────────────────────────────────────
function IdleOverlay() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <ImageBackground source={require("../../assets/games/flappy-word/cover.jpg")} resizeMode="stretch" style={StyleSheet.absoluteFill}>
      <View style={styles.overlayCenter} pointerEvents="none">
        <Animated.View style={[styles.tapHint, { transform: [{ scale: pulse }] }]}>
          <ImageBackground source={require("../../assets/games/flappy-word/play.png")} style={styles.startBtnBg} imageStyle={styles.startBtnImage} resizeMode="stretch" />
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULT OVERLAY — unchanged from original
// ─────────────────────────────────────────────────────────────
function ResultOverlay({ phase, score, total, theme, onReplay, onExit }) {
  const sc = useRef(new Animated.Value(0.6)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);
  const won = phase === "won";
  const emoji = won ? "🏆" : "💥";
  const title = won ? "You Won!" : "Game Over";
  const msg = won ? `All words collected in ${theme}!` : `Better luck next time in ${theme}!`;
  return (
    <View style={styles.overlayBg}>
      <Animated.View style={[styles.resultCard, { opacity: op, transform: [{ scale: sc }] }]}>
        <Text style={styles.resultEmoji}>{emoji}</Text>
        <Text style={[styles.resultTitle, { color: won ? C.green : C.red }]}>{title}</Text>
        <Text style={styles.resultMsg}>{msg}</Text>
        <View style={styles.resultScoreRow}>
          <View style={styles.resultScorePill}>
            <Text style={styles.resultScoreLabel}>SCORE</Text>
            <Text style={styles.resultScoreVal}>{score}</Text>
          </View>
          <View style={styles.resultScorePill}>
            <Text style={styles.resultScoreLabel}>WORDS</Text>
            <Text style={[styles.resultScoreVal, { color: C.green }]}>{Math.floor(score / 100)} / {total}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.resultBtn, { backgroundColor: C.teal }]} onPress={onReplay} activeOpacity={0.85}>
          <Text style={styles.resultBtnText}>▶ Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resultBtnSecondary} onPress={onExit} activeOpacity={0.75}>
          <Text style={styles.resultBtnSecText}>✕ Exit</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES — unchanged from original
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: "hidden" },
  hud: { position: "absolute", top: STATUS_H + 10, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, zIndex: 100 },
  exitBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center" },
  exitTxt: { fontSize: 13, color: C.textSec, fontWeight: "700" },
  scorePill: { backgroundColor: C.yellowDim, borderRadius: 18, borderWidth: 1.5, borderColor: C.yellowBorder, paddingHorizontal: 14, paddingVertical: 5, minWidth: 80, alignItems: "center" },
  scoreTxt: { fontSize: 15, fontWeight: "900", color: C.yellow },
  ticker: { position: "absolute", top: STATUS_H + 58, left: 0, right: 0, flexDirection: "row", alignItems: "center", height: 48, backgroundColor: "rgba(0,0,0,0.55)", borderBottomWidth: 1, borderBottomColor: "rgba(0,188,212,0.2)", zIndex: 90, overflow: "hidden", paddingHorizontal: 8 },
  tickerLabelWrap: { flexDirection: "column", alignItems: "center", justifyContent: "center", marginRight: 6, paddingRight: 8, borderRightWidth: 1, borderRightColor: "rgba(0,188,212,0.3)", width: 42 },
  tickerLabel: { fontSize: 9, fontWeight: "900", color: C.teal, letterSpacing: 1 },
  tickerArrow: { fontSize: 10, color: C.teal, marginTop: 1 },
  tickerScroll: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 4 },
  tickerWord: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3 },
  tickerWordUpcoming: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" },
  tickerWordPast: { backgroundColor: "rgba(76,175,80,0.08)", borderColor: "rgba(76,175,80,0.25)", opacity: 0.6 },
  tickerWordText: { fontSize: 14, fontWeight: "700", color: C.textMuted },
  tickerWordTextActive: { fontSize: 15, fontWeight: "900", color: C.teal, letterSpacing: 0.3 },
  tickerWordTextPast: { fontSize: 13, fontWeight: "600", color: C.green, textDecorationLine: "line-through" },
  tickerArrowSmall: { fontSize: 11, color: C.teal, fontWeight: "900" },
  wordChip: { position: "absolute", borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", zIndex: 50 },
  wordChipText: { fontSize: WORD_FONT_SIZE, fontWeight: "800", letterSpacing: 0.3 },
  bird: { position: "absolute", width: BIRD_W, height: BIRD_H, zIndex: 60 },
  birdBody: { width: BIRD_W, height: BIRD_H, borderRadius: BIRD_H * 0.45, backgroundColor: "#FFD54F", borderWidth: 2.5, borderColor: "#FF8F00", overflow: "visible", alignItems: "center", justifyContent: "center", shadowColor: "#FFD54F", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 10 },
  birdGlow: { ...StyleSheet.absoluteFillObject, borderRadius: BIRD_H * 0.45, backgroundColor: "rgba(255,213,79,0.15)" },
  birdWing: { position: "absolute", top: -10, left: BIRD_W * 0.3, width: BIRD_W * 0.45, height: 14, borderRadius: 7, backgroundColor: "#FFA000", borderWidth: 1.5, borderColor: "#FF6F00", transform: [{ rotate: "-15deg" }] },
  birdEye: { position: "absolute", right: 10, top: 8, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  birdPupil: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#111" },
  birdBeak: { position: "absolute", right: -8, top: "40%", width: 12, height: 8, borderRadius: 3, backgroundColor: "#FF6D00", borderWidth: 1, borderColor: "#E65100" },
  overlayCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 200 },
  idleTitle: { fontSize: 48, fontWeight: "900", color: C.teal, letterSpacing: 1, fontFamily: Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed", textShadowColor: "rgba(0,188,212,0.7)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 },
  idleSubtitle: { fontSize: 18, fontWeight: "700", color: C.yellow, letterSpacing: 2, marginBottom: 36, textShadowColor: "rgba(255,213,79,0.5)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  startBtnBg: { width: 150, height: 150, justifyContent: "center", alignItems: "center" },
  startBtnImage: { borderRadius: 40 },
  tapHint: { marginTop: "120%", borderRadius: 30, paddingHorizontal: 36, paddingVertical: 16, marginBottom: 24, shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 18, elevation: 12 },
  tapHintText: { fontSize: 18, fontWeight: "900", color: C.bg, letterSpacing: 1 },
  idleHint: { fontSize: 14, color: C.textSec, textAlign: "center", paddingHorizontal: 40, lineHeight: 22 },
  overlayBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,8,26,0.82)", alignItems: "center", justifyContent: "center", zIndex: 300 },
  resultCard: { width: SW * 0.85, maxWidth: 380, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 28, borderWidth: 1.5, borderColor: C.tealBorder, padding: 32, alignItems: "center", shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10 },
  resultEmoji: { fontSize: 64, marginBottom: 8 },
  resultTitle: { fontSize: 32, fontWeight: "900", letterSpacing: 0.5, marginBottom: 6 },
  resultMsg: { fontSize: 14, color: C.textSec, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  resultScoreRow: { flexDirection: "row", gap: 14, marginBottom: 28 },
  resultScorePill: { flex: 1, backgroundColor: C.tealDim, borderRadius: 14, borderWidth: 1, borderColor: C.tealBorder, padding: 14, alignItems: "center" },
  resultScoreLabel: { fontSize: 10, fontWeight: "900", color: C.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  resultScoreVal: { fontSize: 28, fontWeight: "900", color: C.teal },
  resultBtn: { width: "100%", borderRadius: 28, paddingVertical: 15, alignItems: "center", marginBottom: 10, shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 12, elevation: 8 },
  resultBtnText: { fontSize: 16, fontWeight: "900", color: C.bg, letterSpacing: 0.4 },
  resultBtnSecondary: { width: "100%", borderRadius: 28, paddingVertical: 13, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  resultBtnSecText: { fontSize: 14, fontWeight: "700", color: C.textSec },
});
