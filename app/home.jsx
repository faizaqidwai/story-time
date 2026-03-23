// app/home.jsx  (updated)
//
// Changes from original:
//  1. Stories for the current playLevel are cached in AsyncStorage and served
//     from cache on subsequent opens (refreshed in background).
//  2. When the user taps a story, startStorySession() is called to initialise
//     (or restore) the StoryActivityContext session, then the user is routed to
//     the correct starting point (BookReader or a mid-sequence activity).
//  3. StoryFinishOverlay now receives the real accumulated rewards from the
//     completed session and calls clearStorySession + disbursement on done.

import {
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Easing,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import StoryCard from "./components/StoryCard";
import { bookService } from "./services/bookService";
import ScreenWrapper from "./components/ScreenWrapper";
import { useUser } from "./_contexts/UserContext";
import {
  useStoryActivity,
  ACTIVITY_ROUTES,
} from "./_contexts/StoryActivityContext";
import MainStoryCard from "./components/MainStoryCard";
import StoryFinishOverlay from "./components/StoryFinishOverlay";
import { attachActivityDataToStories } from "./data/storyActivityData";
import LevelProgressionOverlay from "./components/LevelProgressionOverlay";
import NewLevelBanner from "./components/NewLevelBanner";
import {
  getPendingProgression,
  clearPendingProgression,
} from "./services/levelProgressionService";

import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const HEADER_HEIGHT = 190;
const DARK_BG = "#1a1a2e";
const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";
const CORAL = "#FF7043";

// ── AsyncStorage key for story cache ─────────────────────────────────────────
const storyCacheKey = (playLevel) => `@stories_cache_v2_level_${playLevel}`;
// No TTL — stories are cached until level progression clears them

// ── Game card data ─────────────────────────────────────────────────────────
const GAMES = [
  {
    id: "flappy",
    title: "Flappy Bird",
    subtitle: "Fly & collect words!",
    gradient: ["#00BCD4", "#0097A7"],
    accentColor: "#FFD54F",
    route: "/FlappyWordGame",
  },
  {
    id: "dodge",
    title: "Dodge Car",
    subtitle: "Dodge & collect words!",
    gradient: ["#31ad79", "#1e6e47"],
    accentColor: "#FFD54F",
    route: "/DodgeCarGame",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MINI BIRD  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function MiniBird() {
  const wingAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wingAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(wingAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const wingY = wingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  return (
    <View style={mbS.container}>
      <View style={mbS.body}>
        <Animated.View
          style={[mbS.wing, { transform: [{ translateY: wingY }] }]}
        />
        <View style={mbS.eye}>
          <View style={mbS.pupil} />
        </View>
        <View style={mbS.beak} />
      </View>
    </View>
  );
}

const mbS = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 6,
    height: 72,
  },
  body: {
    width: 68,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFD54F",
    borderWidth: 3,
    borderColor: "#FF8F00",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#FFD54F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  wing: {
    position: "absolute",
    top: -12,
    left: 20,
    width: 30,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFA000",
    borderWidth: 2,
    borderColor: "#FF6F00",
    transform: [{ rotate: "-15deg" }],
  },
  eye: {
    position: "absolute",
    right: 13,
    top: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pupil: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#111" },
  beak: {
    position: "absolute",
    right: -10,
    top: "38%",
    width: 14,
    height: 10,
    borderRadius: 4,
    backgroundColor: "#FF6D00",
    borderWidth: 1.5,
    borderColor: "#E65100",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MINI CAT  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function MiniCat() {
  const tailAnim = useRef(new Animated.Value(0)).current;
  const earAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tailAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tailAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    const twitch = () => {
      Animated.sequence([
        Animated.timing(earAnim, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(earAnim, {
          toValue: 0,
          duration: 130,
          useNativeDriver: true,
        }),
      ]).start(() => setTimeout(twitch, 1800 + Math.random() * 1200));
    };
    twitch();
  }, []);
  const tailRot = tailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-22deg", "22deg"],
  });
  const earSc = earAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });
  return (
    <View style={mcS.container}>
      <Animated.View style={[mcS.tail, { transform: [{ rotate: tailRot }] }]} />
      <View style={mcS.body}>
        <View style={mcS.tummy} />
        <View style={mcS.paws}>
          <View style={mcS.paw} />
          <View style={mcS.paw} />
        </View>
      </View>
      <View style={mcS.head}>
        <Animated.View style={[mcS.earL, { transform: [{ scale: earSc }] }]}>
          <View style={mcS.earInner} />
        </Animated.View>
        <Animated.View style={[mcS.earR, { transform: [{ scale: earSc }] }]}>
          <View style={mcS.earInner} />
        </Animated.View>
        <View style={mcS.eyeL}>
          <View style={mcS.pupilSlit} />
        </View>
        <View style={mcS.eyeR}>
          <View style={mcS.pupilSlit} />
        </View>
        <View style={mcS.nose} />
        <View style={mcS.wL1} />
        <View style={mcS.wL2} />
        <View style={mcS.wR1} />
        <View style={mcS.wR2} />
      </View>
    </View>
  );
}

const mcS = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    height: 72,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  body: {
    position: "absolute",
    bottom: 0,
    left: 8,
    width: 52,
    height: 38,
    backgroundColor: "#F4A460",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#CD853F",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
    shadowColor: "#CD853F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  tummy: {
    width: "52%",
    height: "42%",
    backgroundColor: "#FAEBD7",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(205,133,63,0.3)",
  },
  paws: { flexDirection: "row", gap: 8, marginTop: 2 },
  paw: {
    width: 10,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#F4A460",
    borderWidth: 1.5,
    borderColor: "#CD853F",
  },
  tail: {
    position: "absolute",
    bottom: 4,
    right: 2,
    width: 16,
    height: 30,
    backgroundColor: "#F4A460",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#CD853F",
  },
  head: {
    position: "absolute",
    top: 0,
    left: 10,
    width: 44,
    height: 36,
    backgroundColor: "#F4A460",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#CD853F",
  },
  earL: {
    position: "absolute",
    top: -9,
    left: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#F4A460",
  },
  earR: {
    position: "absolute",
    top: -9,
    right: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#F4A460",
  },
  earInner: {
    position: "absolute",
    top: 3,
    left: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFB6C1",
  },
  eyeL: {
    position: "absolute",
    top: 8,
    left: 7,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#7CFC00",
    borderWidth: 1.5,
    borderColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
  },
  eyeR: {
    position: "absolute",
    top: 8,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#7CFC00",
    borderWidth: 1.5,
    borderColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
  },
  pupilSlit: {
    width: 3,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: "#111",
  },
  nose: {
    position: "absolute",
    bottom: 9,
    left: "50%",
    marginLeft: -3,
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 4,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF69B4",
  },
  wL1: {
    position: "absolute",
    bottom: 12,
    left: 0,
    width: 12,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.45)",
    borderRadius: 1,
  },
  wL2: {
    position: "absolute",
    bottom: 9,
    left: 0,
    width: 12,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.45)",
    borderRadius: 1,
  },
  wR1: {
    position: "absolute",
    bottom: 12,
    right: 0,
    width: 12,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.45)",
    borderRadius: 1,
  },
  wR2: {
    position: "absolute",
    bottom: 9,
    right: 0,
    width: 12,
    height: 1.5,
    backgroundColor: "rgba(100,60,20,0.45)",
    borderRadius: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE ICON  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileIcon({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <View style={piS.outer}>
      <View style={piS.ring}>
        <View style={piS.inner}>
          <View style={piS.highlight} />
          <View style={piS.silHead} />
          <View style={piS.silBody} />
          <View style={piS.letterBadge}>
            <Text style={piS.letterText}>{initial}</Text>
          </View>
        </View>
      </View>
      <View style={piS.shine} />
    </View>
  );
}

const piS = StyleSheet.create({
  outer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 10,
  },
  ring: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: TEAL,
    backgroundColor: "#0d0f22",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  inner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#111830",
    alignItems: "center",
    justifyContent: "center",
  },
  highlight: {
    position: "absolute",
    top: 5,
    left: 8,
    width: 44,
    height: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,188,212,0.09)",
  },
  silHead: {
    position: "absolute",
    top: 9,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,188,212,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.55)",
  },
  silBody: {
    position: "absolute",
    bottom: -6,
    width: 44,
    height: 26,
    borderRadius: 22,
    backgroundColor: "rgba(0,188,212,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.38)",
  },
  letterBadge: {
    position: "absolute",
    bottom: 11,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,213,79,0.13)",
    borderWidth: 1,
    borderColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: {
    fontSize: 10,
    fontWeight: "900",
    color: YELLOW,
    textShadowColor: "rgba(255,213,79,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  shine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: TEAL,
    opacity: 0.5,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GAME CARD  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function GameCard({ game, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.gameCard}
      >
        <View
          style={[styles.gameCardBg, { backgroundColor: game.gradient[1] }]}
        />
        <View
          style={[styles.gameCardBgTop, { backgroundColor: game.gradient[0] }]}
        />
        <View
          style={[
            styles.gameCardCircle1,
            { backgroundColor: "rgba(255,255,255,0.07)" },
          ]}
        />
        <View
          style={[
            styles.gameCardCircle2,
            { backgroundColor: "rgba(255,255,255,0.05)" },
          ]}
        />
        <View
          style={[styles.gamePlayBadge, { backgroundColor: game.accentColor }]}
        >
          <Text style={styles.gamePlayTxt}>▶</Text>
        </View>
        {game.id === "flappy" && <MiniBird />}
        {game.id === "dodge" && <MiniCat />}
        <View style={styles.gameCardTextWrap}>
          <Text style={styles.gameCardTitle}>{game.title}</Text>
          <Text style={styles.gameCardSub}>{game.subtitle}</Text>
        </View>
        <View
          style={[styles.gameCardStrip, { backgroundColor: game.accentColor }]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL BADGE  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function LevelBadge({ level = 1, progress = 0.62, onPress }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 1100,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);
  const fillW = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <TouchableOpacity
      style={lb.outer}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={lb.pitRing}>
        <View style={lb.pitInner}>
          {/* Diagonal two-tone: lighter shade covers top ~55%, slanted divider */}
          <View style={lb.diagonalTop} />
          <Text style={lb.label}>LEVEL</Text>
          <Text style={lb.number}>{level}</Text>
        </View>
      </View>
      <View style={lb.barTrack}>
        <Animated.View style={[lb.barFill, { width: fillW }]} />
        <Animated.View style={[lb.barDot, { left: fillW }]} />
      </View>
    </TouchableOpacity>
  );
}

const lb = StyleSheet.create({
  outer: { alignItems: "center" },
  pitRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#0d0f22",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.06)",
  },
  pitInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#10122a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  // Diagonal two-tone: covers top ~55% with a lighter shade.
  // The slight rotation makes the bottom edge cut diagonally across the circle
  // giving a smooth blend between the two shades.
  diagonalTop: {
    position: "absolute",
    top: 0,
    left: -10,
    right: -10,
    height: "58%",
    backgroundColor: "#1a2540",
    transform: [{ rotate: "-6deg" }, { translateY: -4 }],
    borderRadius: 4,
    opacity: 0.9,
  },
  label: {
    fontSize: 8,
    fontWeight: "900",
    color: TEAL,
    letterSpacing: 2,
    marginBottom: 1,
    opacity: 0.9,
  },
  number: {
    fontSize: 26,
    fontWeight: "900",
    color: "#E0F7FA",
    lineHeight: 28,
    textShadowColor: TEAL,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  barTrack: {
    width: 76,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 5,
    overflow: "visible",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  barDot: {
    position: "absolute",
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: TEAL,
    marginLeft: -6,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Home = () => {
  const router = useRouter();
  const {
    currentProfile,
    isLoading: profileLoading,
    updateProfile,
  } = useUser();
  const {
    storySession,
    startStorySession,
    clearStorySession,
    resetSessionForProfileSwitch,
  } = useStoryActivity();

  // ── Capture the session snapshot the moment the overlay is triggered so
  //    handleFinishDone always has the correct data even after clearStorySession
  //    sets storySession to null.
  const pendingSessionRef = useRef(null);

  // ── Track completed storyIds locally so the story card re-renders to
  //    "Completed" state immediately after handleFinishDone, without waiting
  //    for currentProfile.readingHistory to propagate through context.
  const [localCompletedIds, setLocalCompletedIds] = useState(new Set());

  const [sound, setSound] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Per-story progress map: storyId (string) → nextActivityIndex (0-4) ───
  const [storyProgressMap, setStoryProgressMap] = useState({});

  const loadAllStoryProgress = async (profileId) => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = `@story_activity_${profileId}_`;
      const storyKeys = allKeys.filter((k) => k.startsWith(prefix));
      // console.log(
      //   `[loadAllStoryProgress] profileId=${profileId} | found ${storyKeys.length} keys:`,
      //   storyKeys,
      // );
      if (storyKeys.length === 0) {
        setStoryProgressMap({});
        return;
      }
      const pairs = await AsyncStorage.multiGet(storyKeys);
      const map = {};
      const completedFromStorage = new Set();
      for (const [key, raw] of pairs) {
        if (!raw) continue;
        try {
          const session = JSON.parse(raw);
          if (!session.storyId) continue;
          const sid = String(session.storyId);
          // console.log(
          //   `[loadAllStoryProgress] key=${key} storyId=${sid} nextActivityIndex=${session.nextActivityIndex} rewardsDisbursed=${session.rewardsDisbursed}`,
          // );
          if (session.nextActivityIndex > 0 && session.nextActivityIndex < 4) {
            map[sid] = session.nextActivityIndex;
          } else if (session.nextActivityIndex >= 4) {
            completedFromStorage.add(sid);
          }
        } catch (_) {}
      }
      setStoryProgressMap(map);
      setLocalCompletedIds((prev) => {
        if (completedFromStorage.size === 0) return prev;
        const merged = new Set([...prev, ...completedFromStorage]);
        return merged;
      });
    } catch (_) {}
  };

  // ── Story-finish overlay ──────────────────────────────────────────────────
  const [showFinish, setShowFinish] = useState(false);
  const [finishData, setFinishData] = useState({
    words: 0,
    coins: 0,
    diamonds: 0,
    sampleWords: [],
  });
  const [showLevelProgression, setShowLevelProgression] = useState(false);
  const [completedLevelRef, setCompletedLevelRef] = useState(null);
  const [pendingProgression, setPendingProgression] = useState(null);
  const DIAMONDS_PER_FINISH = 3;

  // Refs wired to the home currency icons (flying-item targets)
  const coinIconRef = useRef(null);
  const diamondIconRef = useRef(null);
  const bagIconRef = useRef(null);

  // ── Background pulse animations ───────────────────────────────────────────
  const bgPulse = useRef(new Animated.Value(1)).current;
  const bgPulse2 = useRef(new Animated.Value(1)).current;
  const bgPulse3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = (val, dur, delay = 0) =>
      setTimeout(
        () =>
          Animated.loop(
            Animated.sequence([
              Animated.timing(val, {
                toValue: 1.1,
                duration: dur,
                useNativeDriver: true,
              }),
              Animated.timing(val, {
                toValue: 0.92,
                duration: dur,
                useNativeDriver: true,
              }),
            ]),
          ).start(),
        delay,
      );
    loop(bgPulse, 2500, 0);
    loop(bgPulse2, 2000, 700);
    loop(bgPulse3, 1700, 1300);
  }, []);

  useEffect(() => {
    return () => {
      sound?.stopAsync();
      sound?.unloadAsync();
    };
  }, []);

  // ── Story cache helpers ───────────────────────────────────────────────────
  const loadStoriesFromCache = async (playLevel) => {
    try {
      const raw = await AsyncStorage.getItem(storyCacheKey(playLevel));
      if (!raw) return null;
      const { stories } = JSON.parse(raw);
      return stories;
    } catch (_) {
      return null;
    }
  };

  const saveStoriesToCache = async (stories, playLevel) => {
    try {
      await AsyncStorage.setItem(
        storyCacheKey(playLevel),
        JSON.stringify({ stories }),
      );
    } catch (_) {}
  };

  // ── Load books ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const playLevel = currentProfile?.playLevel ?? 1;
      const cached = await loadStoriesFromCache(playLevel);
      if (cached) {
        setBooks(cached);
        setLoading(false);
        refreshBooksFromApi();
        return;
      }
      await refreshBooksFromApi();
    };

    const refreshBooksFromApi = async () => {
      try {
        const data = await bookService.getBooks(currentProfile?.id);
        //const enriched = attachActivityDataToStories(data);
        //console.log(JSON.stringify(data));
        setBooks(data);
        await saveStoriesToCache(data, currentProfile?.playLevel ?? 1);
      } catch (e) {
        console.warn("Home: failed to fetch books from API", e);
      } finally {
        setLoading(false);
      }
    };

    if (currentProfile) {
      // Clear the in-memory story session so the previous profile's session
      // never bleeds into the new profile's story cards. This does NOT delete
      // the session from AsyncStorage — the previous profile's progress is safe.
      resetSessionForProfileSwitch();
      // Clear progress map and local completed set for the same reason.
      setStoryProgressMap({});
      setLocalCompletedIds(new Set());
      load();
      loadAllStoryProgress(currentProfile.id);
      getPendingProgression(currentProfile.id).then(setPendingProgression);
      // console.log(
      //   "HOME UPDATED ==== CURRENT PROFILE === " +
      //     JSON.stringify(currentProfile),
      // );
    }
  }, [currentProfile]);

  // ── Reload progress map whenever the active session changes ──────────────
  useEffect(() => {
    if (currentProfile) loadAllStoryProgress(currentProfile.id);
  }, [storySession?.nextActivityIndex, storySession?.storyId]);

  // ── Detect return from all-activities-complete (storySession fully done) ──
  useEffect(() => {
    if (!storySession) return;
    if (storySession.nextActivityIndex < 4) return; // not done yet
    if (showFinish) return; // overlay already showing — don't re-trigger

    // Snapshot the session NOW — before clearStorySession can set it to null.
    // handleFinishDone reads from pendingSessionRef so it always has the data.
    pendingSessionRef.current = storySession;

    // challengeWords is snapshotted onto the session at startStorySession time
    // so it's always available here regardless of closure timing.
    const challengeWords = storySession.challengeWords || [];
    const rewards = storySession.totalRewards;

    setFinishData({
      coins: rewards.coins || 0,
      diamonds: DIAMONDS_PER_FINISH,
      words: challengeWords.length,
      sampleWords: challengeWords.slice(0, 8).map((w) => w.name || w),
    });
    setTimeout(() => setShowFinish(true), 400);
  }, [storySession?.nextActivityIndex]);

  // ── Story card press ──────────────────────────────────────────────────────
  // NEW — always goes to StoryHome
  const handleStoryPress = async (story) => {
    if (!currentProfile) return;
    await startStorySession(story, currentProfile.id);
    router.push({
      pathname: `/book/${story.id}`,
      params: { title: story.title },
    });
  };

  // ── Reward disbursement on overlay done ──────────────────────────────────
  const handleFinishDone = async () => {
    setShowFinish(false);

    // Use the snapshot captured when the overlay was triggered.
    // storySession in context may already be null by this point if something
    // cleared it during the animation, but pendingSessionRef is always safe.
    const session = pendingSessionRef.current;

    if (currentProfile && session) {
      const rewards = session.totalRewards;

      // Coins accumulated across all activities via completeActivity calls
      const coinsToAdd = rewards.coins || 0;
      // Always award fixed diamonds — diamonds are never passed to completeActivity
      const diamondsToAdd = DIAMONDS_PER_FINISH;

      // challengeWords is snapshotted onto the session at startStorySession time
      const storyId = String(session.storyId);
      const wordsToAdd = session.challengeWords || [];

      const updatedProfile = {
        ...currentProfile,
        coins: (currentProfile.coins || 0) + coinsToAdd,
        diamonds: (currentProfile.diamonds || 0) + diamondsToAdd,
        wordBag: {
          ...currentProfile.wordBag,
          words: [...(currentProfile.wordBag?.words || []), ...wordsToAdd],
        },
        readingHistory: currentProfile.readingHistory?.includes(storyId)
          ? currentProfile.readingHistory
          : [...(currentProfile.readingHistory || []), storyId],
      };

      // Mark story completed locally for immediate story card re-render (bug 4).
      // updateProfile also updates currentProfile in context, but the local set
      // ensures the card flips to "Completed" state in the same render cycle.
      setLocalCompletedIds((prev) => new Set([...prev, storyId]));

      // updateProfile calls setCurrentProfile internally (UserContext) so
      // the currency counters re-render with new coins/diamonds/words (bugs 1&3).
      await updateProfile(updatedProfile);

      pendingSessionRef.current = null;
    }

    await clearStorySession();
    if (currentProfile) loadAllStoryProgress(currentProfile.id);

    // ── Check if all stories in this level are now complete ───────────────
    // If so, show the level progression overlay after a short delay so
    // the finish overlay has time to fully dismiss first.
    if (currentProfile && session) {
      const updatedCompletedIds = new Set([
        ...(currentProfile?.readingHistory?.map(String) ?? []),
        ...localCompletedIds,
        String(session.storyId),
      ]);
      const allDone = books.every((b) => updatedCompletedIds.has(String(b.id)));
      if (allDone) {
        const level = currentProfile.playLevel ?? 1;
        setCompletedLevelRef(level);
        // Pre-save the pending flag BEFORE the network call.
        // If the device is offline during the overlay, the flag is already
        // persisted. progressLevel() will clear it on success.
        const pendingBody = {
          profileId: currentProfile.id,
          completedLevel: level,
          lastActivity: session,
        };
        await AsyncStorage.setItem(
          `@level_progress_pending_${currentProfile.id}`,
          JSON.stringify(pendingBody),
        );
        setPendingProgression(pendingBody);
        setTimeout(() => setShowLevelProgression(true), 600);
      }
    }
  };

  // ── Level progression result ──────────────────────────────────────────────
  const handleLevelProgressComplete = async (result) => {
    setShowLevelProgression(false);
    setPendingProgression(null);
    await clearPendingProgression(currentProfile.id);
    // result = { newLevel, stories }
    // Update books list with the new level's stories
    setBooks(result.stories);
    // Cache them under the new level key
    await AsyncStorage.setItem(
      storyCacheKey(result.newLevel),
      JSON.stringify({ stories: result.stories }),
    );
    // Clear progress maps — new level, fresh slate
    setStoryProgressMap({});
    setLocalCompletedIds(new Set());
    // Update profile in context with new playLevel
    await updateProfile({ ...currentProfile, playLevel: result.newLevel });
  };

  // ── Retry pending level progression ──────────────────────────────────────
  const handleRetryLevelProgression = () => {
    if (!pendingProgression) return;
    setCompletedLevelRef(pendingProgression.completedLevel);
    setShowLevelProgression(true);
  };

  if (profileLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9652D9" />
      </View>
    );
  }
  if (!currentProfile) {
    return (
      <View style={styles.center}>
        <Text>Select profile first</Text>
      </View>
    );
  }

  // const getTopLeftType = (i) =>
  //   i === 0 ? "crown" : i <= 2 ? "bird" : undefined;
  const getTopLeftType = (i) => undefined;
  const formatNumber = (n) => (!n ? 0 : n > 999 ? "999+" : n);

  return (
    <>
      <ScreenWrapper>
        <View style={styles.background}>
          <Animated.View
            style={[
              styles.bgCircle,
              styles.bgCircle1,
              { transform: [{ scale: bgPulse }] },
            ]}
          />
          <Animated.View
            style={[
              styles.bgCircle,
              styles.bgCircle2,
              { transform: [{ scale: bgPulse2 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.bgCircle,
              styles.bgCircle3,
              { transform: [{ scale: bgPulse3 }] },
            ]}
          />

          <SafeAreaView style={styles.safeTop} edges={["top"]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ── SIDE UI ── */}
              <View style={styles.sideLayer}>
                <View style={styles.levelBadgeAnchor} pointerEvents="box-none">
                  {/* Pending level progression banner */}
                  {pendingProgression && (
                    <NewLevelBanner onPress={handleRetryLevelProgression} />
                  )}
                  <LevelBadge
                    level={currentProfile.playLevel}
                    progress={0.62}
                    onPress={() => router.push("/components/Levels")}
                  />
                </View>

                <View style={styles.sideRow}>
                  <TouchableOpacity
                    style={styles.profileWrapper}
                    activeOpacity={0.8}
                    onPress={() => router.push("/account")}
                  >
                    <ProfileIcon name={currentProfile?.name} />
                  </TouchableOpacity>
                  <View
                    ref={diamondIconRef}
                    collapsable={false}
                    style={styles.currencyWrapper}
                  >
                    <Image
                      source={require("../assets/img/diamond.png")}
                      style={styles.sideIcon}
                    />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {formatNumber(currentProfile?.diamonds ?? 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sideRow}>
                  <TouchableOpacity
                    ref={bagIconRef}
                    collapsable={false}
                    style={styles.currencyWrapper}
                    onPress={() => router.push("/components/WordBag")}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require("../assets/img/bag.png")}
                      style={styles.sideIcon}
                    />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {formatNumber(
                          currentProfile?.wordBag?.words?.length ?? 0,
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View
                    ref={coinIconRef}
                    collapsable={false}
                    style={styles.currencyWrapper}
                  >
                    <Image
                      source={require("../assets/img/coin.png")}
                      style={styles.sideIcon}
                    />
                    <View style={styles.coinBadge}>
                      <Text style={styles.badgeText}>
                        {formatNumber(currentProfile?.coins ?? 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── MAIN CONTENT ── */}
              <View style={{ marginTop: HEADER_HEIGHT }}>
                <MainStoryCard
                  title={books[0].title}
                  description={books[0].introduction}
                  image={{ uri: books[0].cover }}
                  onPress={() => handleStoryPress(books[0])}
                />

                <View style={{ paddingHorizontal: 15 }}>
                  <Text style={styles.sectionTitle}>Stories</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", paddingLeft: 15 }}>
                    {(() => {
                      const completedIds = new Set([
                        ...(currentProfile?.readingHistory?.map(String) ?? []),
                        ...localCompletedIds,
                      ]);
                      const getProgressIdx = (item) => {
                        const sid = String(item.id);
                        if (storySession?.storyId === sid)
                          return storySession.nextActivityIndex;
                        return storyProgressMap[sid] ?? 0;
                      };

                      return books.map((item, index) => {
                        const sid = String(item.id);
                        const isCompleted = completedIds.has(sid);
                        const progressIdx = getProgressIdx(item);
                        const resuming =
                          !isCompleted && progressIdx > 0 && progressIdx < 4;
                        const resumeAtIndex = resuming ? progressIdx : 0;
                        const showTopLeft = !isCompleted && !resuming;

                        return (
                          <StoryCard
                            key={item.id}
                            title={item.title}
                            image={{ uri: item.cover }}
                            intro={item.introduction}
                            bookId={item.id}
                            index={index}
                            topLeftType={
                              showTopLeft ? getTopLeftType(index) : undefined
                            }
                            isCompleted={isCompleted}
                            resuming={resuming}
                            resumeAtIndex={resumeAtIndex}
                            onPress={() => handleStoryPress(item)}
                          />
                        );
                      });
                    })()}
                  </View>
                </ScrollView>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Games</Text>
                  <Text style={styles.sectionTagline}>
                    Learn while you play 🎮
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingLeft: 15,
                    paddingRight: 10,
                    paddingBottom: 20,
                  }}
                >
                  {GAMES.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onPress={() => router.push(game.route)}
                    />
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </ScreenWrapper>

      {/* Story-finish overlay — shown after all 4 activities complete */}
      <StoryFinishOverlay
        visible={showFinish}
        wordsCollected={finishData.words}
        sampleWords={finishData.sampleWords}
        coinsEarned={finishData.coins}
        diamondsEarned={finishData.diamonds}
        coinTargetRef={coinIconRef}
        diamondTargetRef={diamondIconRef}
        wordTargetRef={bagIconRef}
        onDone={handleFinishDone}
      />

      <LevelProgressionOverlay
        visible={showLevelProgression}
        completedLevel={completedLevelRef}
        profileId={currentProfile?.id}
        lastActivity={pendingProgression?.lastActivity}
        onProgressComplete={handleLevelProgressComplete}
        onDismiss={() => setShowLevelProgression(false)}
      />
    </>
  );
};

export default Home;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: DARK_BG },
  bgCircle: { position: "absolute", borderRadius: 999, opacity: 0.18 },
  bgCircle1: {
    width: 350,
    height: 350,
    backgroundColor: TEAL,
    top: -80,
    right: -80,
  },
  bgCircle2: {
    width: 200,
    height: 200,
    backgroundColor: YELLOW,
    bottom: 100,
    left: -60,
  },
  bgCircle3: {
    width: 150,
    height: 150,
    backgroundColor: CORAL,
    bottom: 200,
    right: -40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: DARK_BG,
  },
  safeTop: { alignItems: "center" },
  sideLayer: { position: "absolute", top: 8, left: 20, right: 20 },
  sideRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  levelBadgeAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  profileWrapper: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  currencyWrapper: { alignItems: "center" },
  sideIcon: { width: 60, height: 60, resizeMode: "contain" },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 8,
  },
  coinBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 8,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  sectionHeader: { paddingHorizontal: 15, marginTop: 8, marginBottom: 2 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  sectionTagline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 10,
  },
  gameCard: {
    width: 160,
    height: 200,
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  gameCardBg: { ...StyleSheet.absoluteFillObject },
  gameCardBgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%",
    borderRadius: 20,
    opacity: 0.9,
  },
  gameCardCircle1: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    top: -30,
    right: -30,
  },
  gameCardCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: 30,
    left: -20,
  },
  gamePlayBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  gamePlayTxt: {
    fontSize: 11,
    color: "#08081a",
    fontWeight: "900",
    marginLeft: 2,
  },
  gameCardTextWrap: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    marginTop: "auto",
  },
  gameCardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  gameCardSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    fontWeight: "600",
  },
  gameCardStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.8,
  },
});
