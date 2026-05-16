/**
 * MonkeyFishingGame.jsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   ✅ ROUNDS renamed to FALLBACK_ROUNDS
 *   ✅ gameDataJson read from route params via useLocalSearchParams
 *   ✅ rounds resolved at component level via useMemo (falls back to FALLBACK_ROUNDS)
 *   ✅ totalRounds derived from rounds.length
 *   ✅ All ROUNDS[x] references replaced with rounds[x]
 *   ✅ All ROUNDS.length references replaced with totalRounds
 *   ✅ InstructionOverlay receives totalRounds as prop
 *   ✅ startRound reads from rounds (resolved), not ROUNDS (hardcoded)
 *   ✅ handleNext uses totalRounds
 *   ✅ BG music loaded on mount with shouldPlay:true (same pattern as DinoWorldGame)
 *   ✅ All other game logic, physics, and UI unchanged
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";
import { Audio } from "expo-av";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ImageBackground } from "react-native";
import { font, pad, radius, size } from "../../theme/tokens";

const STATUS_H = Platform.OS === "ios" ? 54 : 28;
const IMG_ASPECT = 3 / 4;

const F = {
  rodTipX: 0.156,
  rodTipY: 0.252,
  fishX: 0.132,
  waterY: 0.545,
  fishPeak: 0.244,
};

const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.18)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.15)",
  yellowBorder: "rgba(255,213,79,0.6)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.25)",
  greenBorder: "rgba(76,175,80,0.85)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.22)",
  redBorder: "rgba(239,83,80,0.85)",
  string: "#4a2a0e",
  white: "#FFFFFF",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const POINTS_CORRECT = 10;
const POINTS_WRONG = -5;
const POINTS_MISSED = -3;
const JUMP_UP_MS = 900;
const HANG_MS = 700;
const JUMP_DOWN_MS = 700;
const PAUSE_BETWEEN = 1400;
const ROUND_SECONDS = 60;

const FALLBACK_ROUNDS = [
  {
    id: 1,
    category: "Size",
    emoji: "📏",
    instruction:
      'Catch fish with SIZE words!\n"big", "small", "tall" — words that describe size.',
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
    instruction:
      'Catch fish with COLOR words!\n"red", "blue", "green" are color words.',
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
    instruction:
      "Catch fish with ANIMAL words!\nDog, cat, lion — animal names.",
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
    instruction:
      'Catch fish with FEELING words!\n"happy", "sad", "angry" — how we feel.',
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
    instruction:
      'Catch fish with ACTION words!\n"run", "jump", "swim" — things we do.',
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

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildQueue = (round) =>
  shuffle([
    ...shuffle(round.targetWords)
      .slice(0, 10)
      .map((w) => ({ word: w, isTarget: true })),
    ...shuffle(round.distractWords)
      .slice(0, 10)
      .map((w) => ({ word: w, isTarget: false })),
  ]);

function coords(sw, sh) {
  return {
    rodTipX: sw * F.rodTipX,
    rodTipY: sh * F.rodTipY,
    fishX: sw * F.fishX,
    waterY: sh * F.waterY,
    fishPeak: sh * F.fishPeak,
    imgW: sh * IMG_ASPECT,
    imgH: sh,
    imgLeft: (sw - sh * IMG_ASPECT) / 2,
  };
}

function FishingString({ C: coord, fishY }) {
  const dx = coord.fishX - coord.rodTipX;
  const dy = fishY - coord.rodTipY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: coord.rodTipX,
        top: coord.rodTipY - 1.5,
        width: length,
        height: 2.5,
        backgroundColor: C.string,
        opacity: 0.92,
        zIndex: 62,
        transformOrigin: "0% 50%",
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
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
          duration: 480,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ay, {
          toValue: endY,
          duration: 480,
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
      <Text style={{ fontSize: 12 }}>🪙</Text>
    </Animated.View>
  );
}

function Fish({
  word,
  isTarget,
  C: coord,
  onPeak,
  onGone,
  onYChange,
  dismissRef,
}) {
  const fishAnim = useRef(new Animated.Value(coord.waterY)).current;
  const rotAnim = useRef(new Animated.Value(-20)).current;
  const opAnim = useRef(new Animated.Value(1)).current;
  const peakFired = useRef(false);
  const fallStarted = useRef(false);
  const fallAnim = useRef(null);

  useEffect(() => {
    if (dismissRef) {
      dismissRef.current = () => {
        fishAnim.stopAnimation();
        rotAnim.stopAnimation();
        if (fallAnim.current) fallAnim.current.stop();
        Animated.timing(opAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
        dismissRef.current = null;
      };
    }
    return () => {
      if (dismissRef) dismissRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = fishAnim.addListener(({ value }) => onYChange(value));
    return () => fishAnim.removeListener(id);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fishAnim, {
        toValue: coord.fishPeak,
        duration: JUMP_UP_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rotAnim, {
        toValue: -22,
        duration: JUMP_UP_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      if (!peakFired.current) {
        peakFired.current = true;
        onPeak();
      }
      setTimeout(() => {
        if (fallStarted.current) return;
        fallStarted.current = true;
        const anim = Animated.parallel([
          Animated.timing(fishAnim, {
            toValue: coord.waterY + 80,
            duration: JUMP_DOWN_MS,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(rotAnim, {
            toValue: 22,
            duration: JUMP_DOWN_MS,
            useNativeDriver: true,
          }),
          Animated.timing(opAnim, {
            toValue: 0,
            duration: 200,
            delay: JUMP_DOWN_MS - 200,
            useNativeDriver: true,
          }),
        ]);
        fallAnim.current = anim;
        anim.start(({ finished: f }) => {
          if (f) onGone();
        });
      }, HANG_MS);
    });
  }, []);

  const rotate = rotAnim.interpolate({
    inputRange: [-22, 0, 22],
    outputRange: ["-22deg", "0deg", "22deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: coord.fishX - 44,
        top: 0,
        width: 88,
        alignItems: "center",
        zIndex: 80,
        transform: [{ translateY: fishAnim }, { rotate }],
        opacity: opAnim,
      }}
    >
      <View style={st.wordBubble}>
        <Text style={st.wordText} adjustsFontSizeToFit numberOfLines={1}>
          {word}
        </Text>
      </View>
      <Text style={{ fontSize: 46, lineHeight: 50 }}>🐟</Text>
    </Animated.View>
  );
}

function Splash({ C: coord, onDone }) {
  const sc = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1.8, friction: 4, useNativeDriver: true }),
      Animated.timing(op, {
        toValue: 0,
        duration: 500,
        delay: 80,
        useNativeDriver: true,
      }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: coord.fishX - 28,
        top: coord.waterY - 20,
        opacity: op,
        transform: [{ scale: sc }],
        zIndex: 70,
      }}
    >
      <Text style={{ fontSize: 30 }}>💦</Text>
    </Animated.View>
  );
}

function CatchMsg({ text, color, sw, sh, onDone }) {
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(sc, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(850),
      Animated.timing(op, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: sw * 0.06,
        right: sw * 0.06,
        top: sh * 0.33,
        backgroundColor: "rgba(0,0,0,0.85)",
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.15)",
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: "center",
        zIndex: 300,
        opacity: op,
        transform: [{ scale: sc }],
      }}
    >
      <Text style={[st.catchMsgText, { color }]}>{text}</Text>
    </Animated.View>
  );
}

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
        <Text style={st.scoreTxt}>🪙 {score}</Text>
      </Animated.View>
    </View>
  );
}

function IdleOverlay({ onStart }) {
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
    <ImageBackground
      source={require("../../../assets/games/monkey-fishing/cover.jpg")}
      resizeMode="stretch"
      style={StyleSheet.absoluteFill}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          marginTop: "160%",
        }}
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity
            style={st.primaryBtn}
            onPress={onStart}
            activeOpacity={0.85}
          >
            <Text style={st.primaryBtnText}>▶ Play</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

function InstructionOverlay({ round, totalRounds, onStart }) {
  const slide = useRef(new Animated.Value(50)).current;
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
    <View style={st.overlay}>
      <Animated.View
        style={[st.card, { transform: [{ translateY: slide }], opacity: fade }]}
      >
        <View style={st.roundBadge}>
          <Text style={st.roundBadgeText}>
            Round {round.id} of {totalRounds}
          </Text>
        </View>
        <Text style={{ fontSize: 44, marginBottom: 4 }}>{round.emoji}</Text>
        <Text style={st.cardTitle}>{round.category}</Text>
        <Text style={st.cardDesc}>{round.instruction}</Text>
        <Text style={{ color: C.textSec, fontSize: font.xl, marginBottom: 8 }}>
          Words to catch:
        </Text>
        <View style={st.chipRow}>
          {round.targetWords.slice(0, 8).map((w) => (
            <View key={w} style={st.chip}>
              <Text style={st.chipText}>{w}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[st.primaryBtn, { width: "100%" }]}
          onPress={onStart}
          activeOpacity={0.85}
        >
          <Text style={st.primaryBtnText}>🎣 Start Fishing!</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function ResultOverlay({ score, caught, missed, isLast, onNext, onExit }) {
  const sc = useRef(new Animated.Value(0.6)).current;
  const op = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-200)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;
  const stars = caught >= 8 ? 3 : caught >= 5 ? 2 : 1;
  const emoji = stars === 3 ? "🏆" : stars === 2 ? "⭐" : "🐟";
  const title =
    stars === 3 ? "Amazing!" : stars === 2 ? "Good Job!" : "Keep Trying!";

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
        <View style={st.starsRow}>
          {[star1, star2, star3].map((s, i) => (
            <Animated.Text
              key={i}
              style={[
                st.starEmoji,
                i >= stars && { opacity: 0.2 },
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
          style={[st.resultBtn, { marginBottom: 10 }]}
          onPress={onNext}
          activeOpacity={0.85}
        >
          <Text style={st.resultBtnText}>
            {isLast ? "🎉 Final Score!" : "➡  Next Round"}
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

function FinalOverlay({ totalScore, onRestart, onExit }) {
  const grade =
    totalScore >= 200
      ? "Master Fisher! 🏆"
      : totalScore >= 120
        ? "Great Fisher! 🌟"
        : "Keep Practicing! 🐟";
  const sc = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const shimX = useRef(new Animated.Value(-200)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;

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
          <Text style={[st.resultBannerText, { fontSize: 24 }]}>
            🎣 Game Complete!
          </Text>
        </View>
        <View style={st.starsRow}>
          {[star1, star2, star3].map((s, i) => (
            <Animated.Text
              key={i}
              style={[st.starEmoji, { transform: [{ scale: s }] }]}
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
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {grade}
        </Text>
        <View style={st.statRow}>
          <View style={[st.statPill, st.finalPill]}>
            <Text style={st.statLabel}>TOTAL SCORE</Text>
            <Text style={[st.statVal, { color: C.yellow, fontSize: 32 }]}>
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
            style={[st.resultBtn, st.finalBtn]}
            onPress={onRestart}
            activeOpacity={0.85}
          >
            <Text style={[st.resultBtnText, { color: C.bg }]}>
              🔄 Play Again!
            </Text>
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
export default function MonkeyFishingGame({ onExit }) {
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();
  const co = coords(sw, sh);

  const { gameDataJson } = useLocalSearchParams();

  const rounds = useMemo(() => {
    try {
      if (!gameDataJson) return FALLBACK_ROUNDS;
      const parsed = JSON.parse(gameDataJson);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        Array.isArray(parsed[0]?.targetWords) &&
        parsed[0].targetWords.length > 0
      ) {
        console.log(
          "[MonkeyFishingGame] using backend rounds, count:",
          parsed.length,
        );
        return parsed;
      }
      console.log("[MonkeyFishingGame] invalid shape — using fallback");
      return FALLBACK_ROUNDS;
    } catch (_) {
      return FALLBACK_ROUNDS;
    }
  }, [gameDataJson]);

  const totalRounds = rounds.length;

  const [phase, setPhase] = useState("idle");
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [coinsAnim, setCoinsAnim] = useState([]);
  const [fishVisible, setFishVisible] = useState(false);
  const [currentFish, setCurrentFish] = useState(null);
  const [fishY, setFishY] = useState(co.waterY);
  const [atPeak, setAtPeak] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showString, setShowString] = useState(false);
  const [catchMsg, setCatchMsg] = useState(null);

  const phaseRef = useRef("idle");
  const scoreRef = useRef(0);
  const caughtRef = useRef(0);
  const missedRef = useRef(0);
  const queueRef = useRef([]);
  const queueIdxRef = useRef(0);
  const atPeakRef = useRef(false);
  const tappedRef = useRef(false);
  const fishVisRef = useRef(false);
  const clockRef = useRef(null);
  const spawnRef = useRef(null);
  const coinIdRef = useRef(0);
  const dismissFishRef = useRef(null);
  const spawnScheduled = useRef(false);
  const coRef = useRef(co);
  const badgeScale = useRef(new Animated.Value(1)).current;
  const badgePosRef = useRef({ x: sw - 55, y: STATUS_H + 12 });

  useEffect(() => {
    coRef.current = co;
    badgePosRef.current.x = sw - 55;
  }, [sw, sh]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    caughtRef.current = caught;
  }, [caught]);
  useEffect(() => {
    missedRef.current = missed;
  }, [missed]);
  useEffect(() => {
    atPeakRef.current = atPeak;
  }, [atPeak]);
  useEffect(() => {
    tappedRef.current = tapped;
  }, [tapped]);
  useEffect(() => {
    fishVisRef.current = fishVisible;
  }, [fishVisible]);

  // ── Sound refs ────────────────────────────────────────────────────────────
  const sndCorrect = useRef(null);
  const sndWrong = useRef(null);
  const sndWin = useRef(null);
  const sndLose = useRef(null);
  const sndBg = useRef(null);

  // Load all sounds on mount — bg music starts immediately with shouldPlay:true
  // same pattern as DinoWorldGame's dino-bg.mp3
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch (_) {}

      for (const [ref, asset] of [
        [sndCorrect, require("../../../assets/sounds/game/correct-hit.mp3")],
        [sndWrong, require("../../../assets/sounds/game/wrong-hit.mp3")],
        [sndWin, require("../../../assets/sounds/game/win.mp3")],
        [sndLose, require("../../../assets/sounds/game/lose.mp3")],
      ]) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset);
          if (alive) ref.current = sound;
          else sound.unloadAsync();
        } catch (_) {}
      }

      // BG music — shouldPlay:true starts it immediately on mount
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../../assets/sounds/game/monkey-fishing/bg.mp3"),
          { shouldPlay: true, isLooping: true, volume: 0.2 },
        );
        if (alive) sndBg.current = sound;
        else sound.unloadAsync();
      } catch (e) {
        console.log("[MonkeyFishingGame] bg music error:", e);
      }
    })();

    return () => {
      alive = false;
      [sndCorrect, sndWrong, sndWin, sndLose, sndBg].forEach((r) => {
        r.current?.unloadAsync().catch(() => {});
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

  const spawnCoins = (fx, fy) => {
    const bp = badgePosRef.current;
    const coins = Array.from({ length: 5 }, (_, i) => ({
      id: coinIdRef.current++,
      startX: fx - 11,
      startY: fy - 11,
      endX: bp.x,
      endY: bp.y,
      delay: i * 55,
    }));
    setCoinsAnim((prev) => [...prev, ...coins]);
    setTimeout(pulseBadge, 350);
  };

  const endRound = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "result";
    clearInterval(clockRef.current);
    clearTimeout(spawnRef.current);
    if (dismissFishRef.current) {
      dismissFishRef.current();
      dismissFishRef.current = null;
    }
    setFishVisible(false);
    fishVisRef.current = false;
    setShowString(false);
    setAtPeak(false);
    setLastResult({
      score: scoreRef.current,
      caught: caughtRef.current,
      missed: missedRef.current,
    });
    setPhase("result");
    // Pause bg music during result screen
    sndBg.current?.pauseAsync().catch(() => {});
    playSound(scoreRef.current >= 0 ? sndWin : sndLose);
  }, []);

  const spawnFish = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    spawnScheduled.current = false;
    const idx = queueIdxRef.current;
    if (idx >= queueRef.current.length) {
      endRound();
      return;
    }
    const fish = queueRef.current[idx];
    queueIdxRef.current = idx + 1;
    setQueueIdx(idx + 1);
    setCurrentFish(fish);
    setTapped(false);
    tappedRef.current = false;
    setAtPeak(false);
    atPeakRef.current = false;
    setShowString(false);
    setFishY(coRef.current.waterY);
    setFishVisible(true);
    fishVisRef.current = true;
  }, [endRound]);

  const handlePeak = useCallback(() => {
    setAtPeak(true);
    atPeakRef.current = true;
  }, []);

  const handleFishGone = useCallback(() => {
    if (!fishVisRef.current) return;
    setFishVisible(false);
    fishVisRef.current = false;
    setAtPeak(false);
    atPeakRef.current = false;
    setShowString(false);
    setShowSplash(true);
    const fish = queueRef.current[queueIdxRef.current - 1];
    if (fish?.isTarget && !tappedRef.current) {
      setScore((p) => p + POINTS_MISSED);
      setMissed((p) => p + 1);
      setCatchMsg({
        id: Date.now(),
        text: `💨 Missed! ${POINTS_MISSED}`,
        color: C.red,
      });
    }
    if (spawnScheduled.current) return;
    spawnScheduled.current = true;
    spawnRef.current = setTimeout(spawnFish, PAUSE_BETWEEN);
  }, [spawnFish]);

  const handleTap = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    if (!atPeakRef.current || tappedRef.current || !fishVisRef.current) return;
    tappedRef.current = true;
    setTapped(true);
    const fish = queueRef.current[queueIdxRef.current - 1];
    if (!fish) return;

    if (fish.isTarget) {
      setScore((p) => p + POINTS_CORRECT);
      setCaught((p) => p + 1);
      playSound(sndCorrect);
      setShowString(true);
      const c = coRef.current;
      spawnCoins(c.fishX, c.fishPeak + 20);
      setCatchMsg({
        id: Date.now(),
        text: `🎣 Caught it! +${POINTS_CORRECT}`,
        color: C.green,
      });
      setTimeout(() => {
        if (dismissFishRef.current) {
          dismissFishRef.current();
          dismissFishRef.current = null;
        }
        setFishVisible(false);
        fishVisRef.current = false;
        setAtPeak(false);
        atPeakRef.current = false;
        setShowString(false);
        setShowSplash(true);
        if (!spawnScheduled.current) {
          spawnScheduled.current = true;
          spawnRef.current = setTimeout(spawnFish, PAUSE_BETWEEN);
        }
      }, 650);
    } else {
      setScore((p) => p + POINTS_WRONG);
      playSound(sndWrong);
      setCatchMsg({
        id: Date.now(),
        text: `❌ Wrong! ${POINTS_WRONG}`,
        color: C.red,
      });
    }
  }, [spawnFish]);

  const startRound = useCallback(
    (idx) => {
      const round = rounds[idx];
      const q = buildQueue(round);
      queueRef.current = q;
      queueIdxRef.current = 0;
      scoreRef.current = 0;
      caughtRef.current = 0;
      missedRef.current = 0;
      dismissFishRef.current = null;
      spawnScheduled.current = false;
      setQueue(q);
      setQueueIdx(0);
      setScore(0);
      setCaught(0);
      setMissed(0);
      setFishVisible(false);
      setShowString(false);
      setAtPeak(false);
      setTapped(false);
      setTimeLeft(ROUND_SECONDS);
      setCoinsAnim([]);
      setCatchMsg(null);
      phaseRef.current = "playing";
      setPhase("playing");
      // Resume bg music from beginning when round starts
      sndBg.current
        ?.setPositionAsync(0)
        .then(() => sndBg.current?.playAsync())
        .catch(() => {});
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
      spawnRef.current = setTimeout(spawnFish, 900);
    },
    [endRound, spawnFish, rounds],
  );

  const handleStartGame = () => {
    setRoundIndex(0);
    setTotalScore(0);
    phaseRef.current = "instruction";
    setPhase("instruction");
  };

  const handleStartRound = () => startRound(roundIndex);

  const handleNext = () => {
    const ns = lastResult?.score ?? 0;
    if (roundIndex + 1 >= totalRounds) {
      setTotalScore((t) => t + ns);
      phaseRef.current = "final";
      setPhase("final");
    } else {
      setTotalScore((t) => t + ns);
      const next = roundIndex + 1;
      setRoundIndex(next);
      phaseRef.current = "instruction";
      setPhase("instruction");
    }
  };

  const handleRestart = () => {
    setRoundIndex(0);
    setTotalScore(0);
    phaseRef.current = "idle";
    setPhase("idle");
  };

  const handleExit = useCallback(() => {
    clearInterval(clockRef.current);
    clearTimeout(spawnRef.current);
    if (dismissFishRef.current) {
      dismissFishRef.current();
      dismissFishRef.current = null;
    }
    // Pause bg music on exit
    sndBg.current?.pauseAsync().catch(() => {});
    phaseRef.current = "idle";
    if (typeof onExit === "function") onExit();
    else router.back();
  }, [onExit]);

  useEffect(
    () => () => {
      clearInterval(clockRef.current);
      clearTimeout(spawnRef.current);
    },
    [],
  );

  const isPlaying = phase === "playing";
  const round = rounds[roundIndex];

  return (
    <TouchableWithoutFeedback onPress={isPlaying ? handleTap : undefined}>
      <View style={st.root}>
        {phase !== "idle" && (
          <Image
            source={require("../../../assets/games/monkey-fishing/base-image-no-string.jpeg")}
            style={{
              position: "absolute",
              left: co.imgLeft,
              top: 0,
              width: co.imgW,
              height: co.imgH,
              zIndex: 1,
            }}
            resizeMode="stretch"
          />
        )}

        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.06)", zIndex: 2 },
          ]}
          pointerEvents="none"
        />

        {isPlaying && showString && (
          <View
            style={[StyleSheet.absoluteFillObject, { zIndex: 62 }]}
            pointerEvents="none"
          >
            <FishingString C={co} fishY={fishY} />
          </View>
        )}

        {isPlaying && fishVisible && currentFish && (
          <Fish
            key={`fish-${queueIdx}`}
            word={currentFish.word}
            isTarget={currentFish.isTarget}
            C={co}
            onPeak={handlePeak}
            onGone={handleFishGone}
            onYChange={setFishY}
            dismissRef={dismissFishRef}
          />
        )}

        {showSplash && <Splash C={co} onDone={() => setShowSplash(false)} />}

        {catchMsg && (
          <CatchMsg
            key={catchMsg.id}
            text={catchMsg.text}
            color={catchMsg.color}
            sw={sw}
            sh={sh}
            onDone={() => setCatchMsg(null)}
          />
        )}

        {coinsAnim.map((c) => (
          <FlyingCoin
            key={c.id}
            startX={c.startX}
            startY={c.startY}
            endX={c.endX}
            endY={c.endY}
            delay={c.delay}
            onDone={() =>
              setCoinsAnim((prev) => prev.filter((x) => x.id !== c.id))
            }
          />
        ))}

        {isPlaying && (
          <Hud
            round={round}
            timeLeft={timeLeft}
            score={score}
            onExit={handleExit}
            badgeScale={badgeScale}
          />
        )}

        {isPlaying && (
          <View
            style={[
              st.tapBar,
              { left: sw * 0.07, right: sw * 0.07 },
              atPeak && !tapped && st.tapBarActive,
            ]}
            pointerEvents="none"
          >
            <Text
              style={[st.tapBarText, atPeak && !tapped && st.tapBarTextActive]}
            >
              {!fishVisible
                ? "🐟 Get ready..."
                : !atPeak
                  ? "🎣 Get ready to tap!"
                  : "👆 TAP NOW!"}
            </Text>
          </View>
        )}

        {phase === "idle" && <IdleOverlay onStart={handleStartGame} />}

        {phase === "instruction" && (
          <InstructionOverlay
            round={round}
            totalRounds={totalRounds}
            onStart={handleStartRound}
          />
        )}

        {phase === "result" && lastResult && (
          <ResultOverlay
            score={lastResult.score}
            caught={lastResult.caught}
            missed={lastResult.missed}
            isLast={roundIndex + 1 >= totalRounds}
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

        {(phase === "idle" || phase === "instruction") && (
          <TouchableOpacity
            style={st.topExit}
            onPress={handleExit}
            activeOpacity={0.8}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Text style={st.exitTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
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
    fontSize: font.h1,
    fontWeight: "800",
    color: C.red,
    letterSpacing: 0.3,
  },
  hudTime: { fontSize: 22, fontWeight: "900", color: "#FFF", lineHeight: 26 },
  scorePill: {
    backgroundColor: C.greenDim,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.green,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: "center",
  },
  scoreTxt: { fontSize: 14, fontWeight: "900", color: C.green },
  wordBubble: {
    minWidth: 90,
    maxWidth: 130,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 2.5,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
  },
  wordText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1a1a2e",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  catchMsgText: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  tapBar: {
    position: "absolute",
    bottom: 34,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 30,
    paddingVertical: "8%",
    alignItems: "center",
    zIndex: 150,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tapBarActive: {
    backgroundColor: "rgba(210, 189, 94, 0.45)",
    borderColor: C.string,
    paddingVertical: "8%",
  },
  tapBarText: {
    color: "#FFF",
    fontSize: font.xxl,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tapBarTextActive: { color: C.string, fontWeight: "900" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,26,0.91)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    paddingHorizontal: 24,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,26,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    paddingHorizontal: 20,
  },
  resultCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.45)",
    padding: 24,
    alignItems: "center",
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  finalCard: { borderColor: "rgba(255,213,79,0.6)", shadowOpacity: 0.4 },
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
    backgroundColor: "rgba(255,213,79,0.15)",
    borderColor: "rgba(255,213,79,0.7)",
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
    fontSize: 22,
    fontWeight: "900",
    color: C.yellow,
    letterSpacing: 1,
    textShadowColor: "rgba(255,213,79,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  starsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  starEmoji: { fontSize: 34 },
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
  finalPill: {
    backgroundColor: "rgba(255,213,79,0.1)",
    borderColor: "rgba(255,213,79,0.5)",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statVal: { fontSize: 26, fontWeight: "900", color: C.yellow },
  resultBtn: {
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
  finalBtn: { backgroundColor: C.yellow },
  resultBtnText: {
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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: C.textSec },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: 22,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  roundBadge: {
    backgroundColor: C.tealDim,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
  },
  roundBadgeText: { color: C.teal, fontWeight: "700", fontSize: font.lg },
  cardTitle: {
    fontSize: font.h3,
    fontWeight: "900",
    color: C.white,
    marginBottom: pad.lg,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: font.lg,
    color: C.textSec,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: pad.xl,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginBottom: pad.xxl,
  },
  chip: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipText: { color: C.teal, fontWeight: "800", fontSize: font.lg },
  primaryBtn: {
    backgroundColor: "#FBC91A",
    borderRadius: 30,
    paddingHorizontal: 25,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
    borderColor: "#673208",
    borderWidth: 5,
  },
  primaryBtnText: {
    fontSize: font.h3,
    fontWeight: "900",
    color: "#673208",
    letterSpacing: 0.5,
  },
});
