// app/home.jsx

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
  Modal,
  Platform,
} from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Image as ExpoImage } from "expo-image";
import { Audio } from "expo-av";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import StoryCard from "./components/StoryCard";
import { bookService } from "./services/bookService";
import ScreenWrapper from "./components/ScreenWrapper";
import { useUser } from "./_contexts/UserContext";
import { useLevelAccess } from "./_contexts/LevelAccessContext";
import {
  useStoryActivity,
  ACTIVITY_ROUTES,
} from "./_contexts/StoryActivityContext";
import MainStoryCard from "./components/MainStoryCard";
import StoryFinishOverlay from "./components/StoryFinishOverlay";
import { attachActivityDataToStories } from "./data/storyActivityData";
import LevelProgressionOverlay from "./components/LevelProgressionOverlay";
import NewLevelBanner from "./components/NewLevelBanner";
import PremiumUpgradeModal from "./components/PremiumUpgradeModal";
import {
  getPendingProgression,
  clearPendingProgression,
} from "./services/levelProgressionService";

import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "./theme";
import { font, pad, radius, size, isTablet } from "./theme/tokens";

// ── Module-level guards ───────────────────────────────────────────────────────
let _finishHandled = false;
let _overlayShownForStoryId = null;

const { width, height } = Dimensions.get("window");

const DARK_BG = "#1a1a2e";
const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";
const CORAL = "#FF7043";

// Header height — how far the main content sits below the side UI
const HEADER_HEIGHT = isTablet ? 260 : 190;

const _tutorialCheckedAccounts = new Set();
const storyCacheKey = (levelNumber) => `@stories_cache_v2_level_${levelNumber}`;

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

const TUTORIAL_STEPS = [
  {
    key: "account",
    title: "Your Account",
    description:
      "Use this to see your account details and switch between profiles.",
  },
  {
    key: "levelBadge",
    title: "Level Badge",
    description:
      "This shows your current level. Tap it to switch between levels.",
  },
  {
    key: "wordbag",
    title: "Word Bag",
    description:
      "Upon completing stories, you collect important words and phrases here.",
  },
  {
    key: "diamond",
    title: "Diamonds",
    description: "This shows the diamonds collected by your profile.",
  },
  {
    key: "coins",
    title: "Coins",
    description: "This shows the coins collected by your profile.",
  },
  {
    key: "storyImage",
    title: "Recommended Story",
    description:
      "This shows the recommended story to start with. Tap to begin!",
  },
  {
    key: "readIcon",
    title: "Read Activity",
    description: "This indicates the Read activity for this story.",
  },
  {
    key: "guessIcon",
    title: "Guess the Word",
    description: "This indicates the 'Guess the Word' activity.",
  },
  {
    key: "listenIcon",
    title: "Listening Activity",
    description: "This indicates the 'Listening' activity.",
  },
  {
    key: "describeIcon",
    title: "Describe the Word",
    description: "This indicates the 'Describe the Word' activity.",
  },
  {
    key: "storyCard",
    title: "Story Cards",
    description: "You can start any story by tapping on a story card.",
  },
];

async function playSound(file, { volume = 1.0 } = {}) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    await sound.setVolumeAsync(volume);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS MODE BANNER
// ─────────────────────────────────────────────────────────────────────────────
function AccessModeBanner({
  levelContext,
  currentPlayLevel,
  onSwitchToCurrent,
}) {
  const { mode, levelNumber, accessScope } = levelContext;

  if (
    mode === "PLAY" &&
    levelNumber === currentPlayLevel &&
    accessScope !== "PARTIAL"
  )
    return null;

  let bgColor, borderColor, emoji, messageText;

  if (mode === "VIEW_ONLY") {
    bgColor = "rgba(239,83,80,0.10)";
    borderColor = "rgba(239,83,80,0.35)";
    emoji = "🔒";
    messageText = `Level ${levelNumber} is locked. Complete earlier levels to unlock.`;
  } else if (mode === "READ_ONLY") {
    bgColor = "rgba(0,188,212,0.08)";
    borderColor = "rgba(0,188,212,0.3)";
    emoji = "📖";
    messageText = `Level ${levelNumber} — Read Only. Return to Level ${currentPlayLevel} to do activities.`;
  } else if (mode === "PLAY" && accessScope === "PARTIAL") {
    bgColor = "rgba(255,213,79,0.08)";
    borderColor = "rgba(255,213,79,0.35)";
    emoji = "✨";
    messageText = `Level ${levelNumber} Preview — 1 story available. Upgrade to unlock all.`;
  } else if (levelNumber !== currentPlayLevel) {
    bgColor = "rgba(0,188,212,0.08)";
    borderColor = "rgba(0,188,212,0.3)";
    emoji = "👁";
    messageText = `Viewing Level ${levelNumber}. Your active level is ${currentPlayLevel}.`;
  } else {
    return null;
  }

  return (
    <View
      style={[bannerS.container, { backgroundColor: bgColor, borderColor }]}
    >
      <Text style={bannerS.emoji}>{emoji}</Text>
      <Text style={bannerS.text} numberOfLines={2}>
        {messageText}
      </Text>
      {levelNumber !== currentPlayLevel && (
        <TouchableOpacity
          style={bannerS.btn}
          onPress={onSwitchToCurrent}
          activeOpacity={0.8}
        >
          <Text style={bannerS.btnText}>Level {currentPlayLevel} ↩</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const bannerS = StyleSheet.create({
  container: {
    marginHorizontal: pad.sm,
    marginBottom: pad.s,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.sm / 1.4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: { fontSize: font.lg },
  text: {
    fontFamily: FONTS.light,
    flex: 1,
    fontSize: font.sm,
    color: "#B2EBF2",
    lineHeight: font.sm * 1.4,
  },
  btn: {
    backgroundColor: "rgba(0,188,212,0.18)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.4)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    flexShrink: 0,
  },
  btnText: { fontFamily: FONTS.bold, fontSize: font.s, color: TEAL },
});

// ─────────────────────────────────────────────────────────────────────────────
// HOME TUTORIAL OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
const PADDING = 10;

function HomeTutorial({ visible, refs, onDone }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const stepData = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  const measureStep = useCallback(
    (stepIndex) => {
      const key = TUTORIAL_STEPS[stepIndex].key;
      const ref = refs[key];
      if (!ref?.current) return;
      ref.current.measureInWindow((x, y, w, h) => {
        if (w === 0 && h === 0) return;
        setRect({
          x: x - PADDING,
          y: y - PADDING,
          width: w + PADDING * 2,
          height: h + PADDING * 2,
        });
        tooltipAnim.setValue(0);
        Animated.timing(tooltipAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        if (pulseLoop.current) pulseLoop.current.stop();
        pulseAnim.setValue(1);
        pulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.04,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0.97,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        );
        pulseLoop.current.start();
      });
    },
    [refs, tooltipAnim, pulseAnim],
  );

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => measureStep(step), 120);
    return () => clearTimeout(t);
  }, [visible, step, measureStep]);

  useEffect(() => {
    if (!visible) {
      if (pulseLoop.current) pulseLoop.current.stop();
      setStep(0);
      setRect(null);
    }
  }, [visible]);

  const handleNext = () => {
    playSound(require("../assets/sounds/tick1.mp3"));
    if (isLast) {
      onDone();
      return;
    }
    setRect(null);
    setStep((p) => p + 1);
  };
  const handlePrev = () => {
    if (isFirst) return;
    playSound(require("../assets/sounds/tick1.mp3"));
    setRect(null);
    setStep((p) => p - 1);
  };
  const handleSkip = () => onDone();

  if (!visible) return null;

  const showTooltipBelow = rect
    ? rect.y + rect.height / 2 < height * 0.55
    : true;
  const TOOLTIP_MARGIN = 14;
  const tooltipTop = rect
    ? showTooltipBelow
      ? rect.y + rect.height + TOOLTIP_MARGIN
      : rect.y - TOOLTIP_MARGIN - 130
    : height * 0.5;
  const clampedTooltipTop = Math.max(60, Math.min(tooltipTop, height - 200));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      <View style={tutS.container} pointerEvents="box-none">
        <View style={tutS.tapZones} pointerEvents="box-none">
          <TouchableOpacity
            style={tutS.tapLeft}
            onPress={handlePrev}
            disabled={isFirst}
            activeOpacity={0}
          />
          <TouchableOpacity
            style={tutS.tapRight}
            onPress={handleNext}
            activeOpacity={0}
          />
        </View>

        {rect ? (
          <>
            <View
              style={[
                tutS.scrimPanel,
                { top: 0, left: 0, right: 0, height: Math.max(0, rect.y) },
              ]}
            />
            <View
              style={[
                tutS.scrimPanel,
                { top: rect.y + rect.height, left: 0, right: 0, bottom: 0 },
              ]}
            />
            <View
              style={[
                tutS.scrimPanel,
                {
                  top: rect.y,
                  left: 0,
                  width: Math.max(0, rect.x),
                  height: rect.height,
                },
              ]}
            />
            <View
              style={[
                tutS.scrimPanel,
                {
                  top: rect.y,
                  left: rect.x + rect.width,
                  right: 0,
                  height: rect.height,
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                tutS.highlightBorder,
                {
                  top: rect.y,
                  left: rect.x,
                  width: rect.width,
                  height: rect.height,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </>
        ) : (
          <View style={[tutS.scrimPanel, StyleSheet.absoluteFillObject]} />
        )}

        {rect && (
          <Animated.View
            pointerEvents="none"
            style={[
              tutS.tooltip,
              {
                top: clampedTooltipTop,
                opacity: tooltipAnim,
                transform: [
                  {
                    translateY: tooltipAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [showTooltipBelow ? -10 : 10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={tutS.tooltipTitle}>{stepData.title}</Text>
            <Text style={tutS.tooltipDesc}>{stepData.description}</Text>
          </Animated.View>
        )}

        <View style={tutS.topBar} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleSkip}
            style={tutS.skipBtn}
            activeOpacity={0.8}
          >
            <Text style={tutS.skipText}>Skip</Text>
          </TouchableOpacity>
          <View style={tutS.dotsRow}>
            {TUTORIAL_STEPS.map((_, i) => (
              <View key={i} style={[tutS.dot, i === step && tutS.dotActive]} />
            ))}
          </View>
        </View>

        <View style={tutS.navBar} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              tutS.navBtn,
              tutS.navBtnSecondary,
              isFirst && tutS.navBtnDisabled,
            ]}
            onPress={handlePrev}
            disabled={isFirst}
            activeOpacity={0.8}
          >
            <Text
              style={[
                tutS.navBtnText,
                tutS.navBtnTextSecondary,
                isFirst && tutS.navBtnTextDisabled,
              ]}
            >
              ← Prev
            </Text>
          </TouchableOpacity>
          <Text style={tutS.stepCounter}>
            {step + 1} / {TUTORIAL_STEPS.length}
          </Text>
          <TouchableOpacity
            style={[tutS.navBtn, isLast && tutS.navBtnPrimary]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[tutS.navBtnText, isLast && tutS.navBtnTextPrimary]}>
              {isLast ? "Got it! ✓" : "Next →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const tutS = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  scrimPanel: { position: "absolute", backgroundColor: "rgba(0,0,0,0.78)" },
  highlightBorder: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  tooltip: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "rgba(10,18,36,0.97)",
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.55)",
    paddingVertical: pad.md,
    paddingHorizontal: pad.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 100,
  },
  tooltipTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: TEAL,
    marginBottom: pad.s,
    letterSpacing: 0.3,
  },
  tooltipDesc: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: "#B2EBF2",
    lineHeight: font.sm * 1.5,
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? (isTablet ? 68 : 56) : isTablet ? 44 : 32,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 200,
  },
  skipBtn: {
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  skipText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "rgba(255,255,255,0.8)",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    position: "absolute",
    left: 0,
    right: 0,
    alignSelf: "center",
    justifyContent: "center",
  },
  dot: {
    width: isTablet ? 8 : 6,
    height: isTablet ? 8 : 6,
    borderRadius: isTablet ? 4 : 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: { width: isTablet ? 26 : 18, backgroundColor: TEAL },
  navBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? (isTablet ? 56 : 44) : isTablet ? 36 : 24,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 200,
  },
  navBtn: {
    paddingHorizontal: pad.lg,
    paddingVertical: pad.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.35)",
    backgroundColor: "rgba(0,188,212,0.1)",
    minWidth: isTablet ? 140 : 100,
    alignItems: "center",
  },
  navBtnSecondary: {
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  navBtnPrimary: { borderColor: TEAL, backgroundColor: "rgba(0,188,212,0.25)" },
  navBtnDisabled: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  navBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: TEAL,
    letterSpacing: 0.3,
  },
  navBtnTextSecondary: { color: "rgba(255,255,255,0.65)" },
  navBtnTextPrimary: { color: "#E0F7FA" },
  navBtnTextDisabled: { color: "rgba(255,255,255,0.2)" },
  stepCounter: {
    fontFamily: FONTS.regular,
    fontSize: font.md,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
  },
  tapZones: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 50,
  },
  tapLeft: { flex: 1, height: "100%" },
  tapRight: { flex: 1, height: "100%" },
});

// ─────────────────────────────────────────────────────────────────────────────
// MINI BIRD
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

  const containerH = isTablet ? 100 : 72;
  const bodyW = isTablet ? 94 : 68;
  const bodyH = isTablet ? 70 : 50;

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginTop: 18,
        marginBottom: 6,
        height: containerH,
      }}
    >
      <View
        style={{
          width: bodyW,
          height: bodyH,
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
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: -12,
            left: 20,
            width: 30,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#FFA000",
            borderWidth: 2,
            borderColor: "#FF6F00",
            transform: [{ rotate: "-15deg" }, { translateY: wingY }],
          }}
        />
        <View
          style={{
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
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: "#111",
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            right: -10,
            top: "38%",
            width: 14,
            height: 10,
            borderRadius: 4,
            backgroundColor: "#FF6D00",
            borderWidth: 1.5,
            borderColor: "#E65100",
          }}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI CAT
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

  const containerSize = isTablet ? 100 : 72;

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: containerSize,
        height: containerSize,
        alignSelf: "center",
        marginTop: 14,
        marginBottom: 6,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          bottom: 4,
          right: 2,
          width: 16,
          height: 30,
          backgroundColor: "#F4A460",
          borderRadius: 8,
          borderWidth: 2,
          borderColor: "#CD853F",
          transform: [{ rotate: tailRot }],
        }}
      />
      <View
        style={{
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
        }}
      >
        <View
          style={{
            width: "52%",
            height: "42%",
            backgroundColor: "#FAEBD7",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(205,133,63,0.3)",
          }}
        />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
          <View
            style={{
              width: 10,
              height: 7,
              borderRadius: 5,
              backgroundColor: "#F4A460",
              borderWidth: 1.5,
              borderColor: "#CD853F",
            }}
          />
          <View
            style={{
              width: 10,
              height: 7,
              borderRadius: 5,
              backgroundColor: "#F4A460",
              borderWidth: 1.5,
              borderColor: "#CD853F",
            }}
          />
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 10,
          width: 44,
          height: 36,
          backgroundColor: "#F4A460",
          borderRadius: 22,
          borderWidth: 2,
          borderColor: "#CD853F",
        }}
      >
        <Animated.View
          style={{
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
            transform: [{ scale: earSc }],
          }}
        >
          <View
            style={{
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
            }}
          />
        </Animated.View>
        <Animated.View
          style={{
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
            transform: [{ scale: earSc }],
          }}
        >
          <View
            style={{
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
            }}
          />
        </Animated.View>
        <View
          style={{
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
          }}
        >
          <View
            style={{
              width: 3,
              height: 6,
              borderRadius: 1.5,
              backgroundColor: "#111",
            }}
          />
        </View>
        <View
          style={{
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
          }}
        >
          <View
            style={{
              width: 3,
              height: 6,
              borderRadius: 1.5,
              backgroundColor: "#111",
            }}
          />
        </View>
        <View
          style={{
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
          }}
        />
        {[
          { bottom: 12, left: 0 },
          { bottom: 9, left: 0 },
          { bottom: 12, right: 0 },
          { bottom: 9, right: 0 },
        ].map((pos, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              ...pos,
              width: 12,
              height: 1.5,
              backgroundColor: "rgba(100,60,20,0.45)",
              borderRadius: 1,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE ICON
// ─────────────────────────────────────────────────────────────────────────────
function ProfileIcon({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const outerSize = isTablet ? 80 : 60;
  const halfOuter = outerSize / 2;
  const letterSize = isTablet ? 14 : 10;

  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: halfOuter,
        overflow: "hidden",
        shadowColor: TEAL,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.65,
        shadowRadius: 10,
        elevation: 10,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: halfOuter,
          borderWidth: 2.5,
          borderColor: TEAL,
          backgroundColor: "#0d0f22",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#111830",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 5,
              left: 8,
              width: outerSize - 16,
              height: 12,
              borderRadius: 8,
              backgroundColor: "rgba(0,188,212,0.09)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 9,
              width: outerSize * 0.33,
              height: outerSize * 0.33,
              borderRadius: outerSize * 0.165,
              backgroundColor: "rgba(0,188,212,0.22)",
              borderWidth: 1.5,
              borderColor: "rgba(0,188,212,0.55)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -6,
              width: outerSize * 0.73,
              height: outerSize * 0.43,
              borderRadius: outerSize * 0.365,
              backgroundColor: "rgba(0,188,212,0.16)",
              borderWidth: 1.5,
              borderColor: "rgba(0,188,212,0.38)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 11,
              width: outerSize * 0.33,
              height: outerSize * 0.33,
              borderRadius: outerSize * 0.165,
              backgroundColor: "rgba(255,213,79,0.13)",
              borderWidth: 1,
              borderColor: YELLOW,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.bold,
                fontSize: letterSize,
                color: YELLOW,
                textShadowColor: "rgba(255,213,79,0.7)",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 4,
              }}
            >
              {initial}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: TEAL,
          opacity: 0.5,
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME CARD
// ─────────────────────────────────────────────────────────────────────────────
function GameCard({ game, onPress }) {
  const cardW = isTablet ? 220 : 160;
  const cardH = isTablet ? 270 : 200;
  const scaleA = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scaleA, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scaleA, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleA }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={{
          width: cardW,
          height: cardH,
          borderRadius: radius.xl,
          marginRight: pad.sm,
          overflow: "hidden",
          elevation: 10,
          shadowColor: "#00BCD4",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
        }}
      >
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: game.gradient[1] },
          ]}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "60%",
            borderRadius: radius.xl,
            opacity: 0.9,
            backgroundColor: game.gradient[0],
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: 65,
            top: -30,
            right: -30,
            backgroundColor: "rgba(255,255,255,0.07)",
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 80,
            height: 80,
            borderRadius: 40,
            bottom: 30,
            left: -20,
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: isTablet ? 44 : 32,
            height: isTablet ? 44 : 32,
            borderRadius: isTablet ? 22 : 16,
            alignItems: "center",
            justifyContent: "center",
            elevation: 4,
            backgroundColor: game.accentColor,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.sm,
              color: "#08081a",
              marginLeft: 2,
            }}
          >
            ▶
          </Text>
        </View>
        {game.id === "flappy" && <MiniBird />}
        {game.id === "dodge" && <MiniCat />}
        <View
          style={{
            paddingHorizontal: pad.sm,
            paddingBottom: pad.sm,
            marginTop: "auto",
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.md,
              color: "#fff",
              letterSpacing: 0.2,
              textShadowColor: "rgba(0,0,0,0.4)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {game.title}
          </Text>
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: font.s,
              color: "rgba(255,255,255,0.7)",
              marginTop: 2,
            }}
          >
            {game.subtitle}
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            opacity: 0.8,
            backgroundColor: game.accentColor,
          }}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL BADGE
// ─────────────────────────────────────────────────────────────────────────────
function LevelBadge({
  displayLevel = 1,
  currentLevel = 1,
  progress = 0.62,
  onPress,
}) {
  const ringSize = isTablet ? 110 : 82;
  const innerSize = isTablet ? 92 : 68;
  const barW = isTablet ? 102 : 76;
  const barH = isTablet ? 8 : 6;
  const dotSize = isTablet ? 16 : 12;

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
  const isViewingOther = displayLevel !== currentLevel;

  return (
    <TouchableOpacity
      style={{ alignItems: "center" }}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View
        style={[
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            backgroundColor: "#0d0f22",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.9,
            shadowRadius: 8,
            elevation: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
          },
          isViewingOther
            ? { borderColor: "rgba(255,213,79,0.5)" }
            : { borderColor: "rgba(255,255,255,0.06)" },
        ]}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: "#10122a",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: "rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: -10,
              right: -10,
              height: "58%",
              backgroundColor: "#1a2540",
              transform: [{ rotate: "-6deg" }, { translateY: -4 }],
              borderRadius: 4,
              opacity: 0.9,
            }}
          />
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.xs,
              color: TEAL,
              letterSpacing: isTablet ? 2.5 : 2,
              marginBottom: 3,
              opacity: 0.9,
            }}
          >
            LEVEL
          </Text>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.h2,
              color: "#E0F7FA",
              // lineHeight: isTablet ? 38 : 28,
              textShadowColor: TEAL,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
            }}
          >
            {displayLevel}
          </Text>
          {isViewingOther && (
            <Text
              style={{
                fontSize: isTablet ? 8 : 6,
                color: YELLOW,
                marginTop: 1,
              }}
            >
              ●
            </Text>
          )}
        </View>
      </View>
      <View
        style={{
          width: barW,
          height: barH,
          borderRadius: barH / 2,
          backgroundColor: "rgba(255,255,255,0.08)",
          marginTop: isTablet ? 7 : 5,
          overflow: "visible",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.35)",
        }}
      >
        <Animated.View
          style={{
            height: "100%",
            borderRadius: barH / 2,
            backgroundColor: TEAL,
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 4,
            elevation: 4,
            width: fillW,
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            top: -(dotSize / 2 - barH / 2),
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: "#fff",
            borderWidth: 2,
            borderColor: TEAL,
            marginLeft: -(dotSize / 2),
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 6,
            elevation: 6,
            left: fillW,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Home = () => {
  const router = useRouter();

  const {
    currentProfile,
    isLoading: profileLoading,
    updateProfile,
    userAccount,
  } = useUser();
  const {
    storySession,
    startStorySession,
    clearStorySession,
    resetSessionForProfileSwitch,
    syncNow,
    hasInitialSyncedRef,
  } = useStoryActivity();
  const {
    loadedLevel,
    loadedLevelContext,
    initForProfile,
    switchLevel,
    refreshAfterProgression,
    canPlay,
    canRead,
    canView,
    isStoryAccessible,
  } = useLevelAccess();

  const pendingSessionRef = useRef(null);
  const prevLoadedLevelRef = useRef(null);
  const lastInitializedProfileIdRef = useRef(null);
  const profileSwitchInProgressRef = useRef(false);
  const [localCompletedIds, setLocalCompletedIds] = useState(new Set());
  const [sound, setSound] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storyProgressMap, setStoryProgressMap] = useState({});

  const loadAllStoryProgress = async (profileId) => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = `@story_activity_${profileId}_`;
      const storyKeys = allKeys.filter((k) => k.startsWith(prefix));
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
        return new Set([...prev, ...completedFromStorage]);
      });
    } catch (_) {}
  };

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
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const DIAMONDS_PER_FINISH = 3;

  const coinIconRef = useRef(null);
  const diamondIconRef = useRef(null);
  const bagIconRef = useRef(null);

  const tutorialRefs = {
    account: useRef(null),
    levelBadge: useRef(null),
    wordbag: useRef(null),
    diamond: useRef(null),
    coins: useRef(null),
    storyImage: useRef(null),
    readIcon: useRef(null),
    guessIcon: useRef(null),
    listenIcon: useRef(null),
    describeIcon: useRef(null),
    storyCard: useRef(null),
  };

  const [showTutorial, setShowTutorial] = useState(false);
  const handleTutorialDone = useCallback(() => setShowTutorial(false), []);

  // ADD THIS anywhere among your useEffects
  useEffect(() => {
    console.log("[HOME LIFECYCLE] Home MOUNTED");
    return () => {
      console.log("[HOME LIFECYCLE] Home UNMOUNTED");
    };
  }, []);

  useEffect(() => {
    if (!books?.length) return;

    const allImages = [
      ...books
        .filter(
          (book) => typeof book.cover === "string" && book.cover.length > 0,
        )
        .map((book) => book.cover),
      ...books.flatMap((book) =>
        book.pages
          .filter((p) => typeof p.image === "string" && p.image.length > 0)
          .map((p) => p.image),
      ),
    ];

    allImages.forEach((uri) => ExpoImage.prefetch(uri));
  }, [books]);

  const loadStoriesFromCache = async (levelNumber) => {
    try {
      const raw = await AsyncStorage.getItem(storyCacheKey(levelNumber));
      if (!raw) return null;
      const { stories } = JSON.parse(raw);
      return stories;
    } catch (_) {
      return null;
    }
  };

  const saveStoriesToCache = async (stories, levelNumber) => {
    try {
      await AsyncStorage.setItem(
        storyCacheKey(levelNumber),
        JSON.stringify({ stories }),
      );
    } catch (_) {}
  };

  const loadBooksForLevel = useCallback(
    async (levelNumber, profileId, playLevel) => {
      console.log(
        "[LOAD LEVEL BOOKS] level:",
        levelNumber,
        "profileId:",
        profileId,
      );
      setLoading(true);
      const cached = await loadStoriesFromCache(levelNumber);
      if (cached) {
        setBooks(cached);
        setLoading(false);
        _fetchBooksFromApi(levelNumber, profileId, playLevel).catch(() => {});
        return;
      }
      await _fetchBooksFromApi(levelNumber, profileId, playLevel);
    },
    [],
  );

  const _fetchBooksFromApi = async (levelNumber, profileId, playLevel) => {
    console.log(
      "[FETCH BOOKS FROM API] level:",
      levelNumber,
      "profileId:",
      profileId,
    );
    try {
      const data =
        levelNumber === playLevel
          ? await bookService.getBooks(profileId)
          : await bookService.getBooksByLevel(levelNumber);
      setBooks(data);
      await saveStoriesToCache(data, levelNumber);
    } catch (e) {
      console.warn("Home: failed to fetch books", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(
      "[PROFILE EFFECT] fired — current:",
      currentProfile?.name,
      "ref:",
      lastInitializedProfileIdRef.current,
    );
    if (!currentProfile) return;
    // Guard: don't re-initialize if this profile was already initialized
    if (lastInitializedProfileIdRef.current === currentProfile.id) return;

    lastInitializedProfileIdRef.current = currentProfile.id;
    profileSwitchInProgressRef.current = true;

    resetSessionForProfileSwitch();
    setStoryProgressMap({});
    setLocalCompletedIds(new Set());
    setBooks([]);
    console.log(
      "[PROFILE EFFECT] about to init — name:",
      currentProfile.name,
      "id:",
      currentProfile.id,
    );
    initForProfile(currentProfile).then(() => {
      profileSwitchInProgressRef.current = false; // ← clear flag
      prevLoadedLevelRef.current = currentProfile.playLevel ?? 1;
      loadBooksForLevel(
        currentProfile.playLevel ?? 1,
        currentProfile.id,
        currentProfile.playLevel ?? 1,
      );
    });
    loadAllStoryProgress(currentProfile.id);
    getPendingProgression(currentProfile.id).then(setPendingProgression);
    if (!userAccount?.id || _tutorialCheckedAccounts.has(userAccount.id)) {
      setShowTutorial(false);
    } else {
      AsyncStorage.getItem(`@show_tutorial_${userAccount.id}`).then((flag) => {
        _tutorialCheckedAccounts.add(userAccount.id);
        if (flag === "true") {
          AsyncStorage.removeItem(`@show_tutorial_${userAccount.id}`);
          setShowTutorial(true);
        } else {
          setShowTutorial(false);
        }
      });
    }
    if (!hasInitialSyncedRef.current) {
      hasInitialSyncedRef.current = true;
      syncNow().catch(() => {});
    }
  }, [currentProfile?.id]);

  useEffect(() => {
    if (!currentProfile) return;
    if (profileSwitchInProgressRef.current) return; // ← skip during profile switch
    if (prevLoadedLevelRef.current === loadedLevel) return;
    prevLoadedLevelRef.current = loadedLevel;
    loadBooksForLevel(
      loadedLevel,
      currentProfile.id,
      currentProfile.playLevel ?? 1,
    );
  }, [loadedLevel]);

  useEffect(() => {
    if (currentProfile) loadAllStoryProgress(currentProfile.id);
  }, [storySession?.nextActivityIndex, storySession?.storyId]);

  useFocusEffect(
    useCallback(() => {
      if (_finishHandled) return; // ← add this guard
      if (!storySession || storySession.nextActivityIndex < 4 || showFinish)
        return;
      _finishHandled = false; // reset for fresh journey
      pendingSessionRef.current = storySession;
      const challengeWords = storySession.challengeWords || [];
      const rewards = storySession.totalRewards;
      setFinishData({
        coins: rewards.coins || 0,
        diamonds: DIAMONDS_PER_FINISH,
        words: challengeWords.length,
        sampleWords: challengeWords.slice(0, 8).map((w) => w.name || w),
      });
      setTimeout(() => setShowFinish(true), 1000);
    }, [storySession?.nextActivityIndex, storySession?.storyId, showFinish]),
  );

  const handleStoryPress = async (story, storyIndex) => {
    _finishHandled = false;
    _overlayShownForStoryId = null;
    if (!currentProfile) return;
    const ctx = loadedLevelContext;
    if (!canView(ctx)) return;
    if (!isStoryAccessible(storyIndex, ctx)) {
      setShowPremiumModal(true);
      return;
    }
    await startStorySession(story, currentProfile.id, !canPlay(ctx));
    router.push({
      pathname: `/book/${story.id}`,
      params: { title: story.title },
    });
  };

  const handleFinishDone = async () => {
    if (_finishHandled) return;
    _finishHandled = true;
    setShowFinish(false);
    setTimeout(async () => {
      const session = pendingSessionRef.current;
      if (currentProfile && session) {
        const rewards = session.totalRewards;
        const storyId = String(session.storyId);
        const updatedProfile = {
          ...currentProfile,
          coins: (currentProfile.coins || 0) + (rewards.coins || 0),
          diamonds: (currentProfile.diamonds || 0) + DIAMONDS_PER_FINISH,
          wordBag: {
            ...currentProfile.wordBag,
            words: [
              ...(currentProfile.wordBag?.words || []),
              ...(session.challengeWords || []),
            ],
          },
          readingHistory: currentProfile.readingHistory?.includes(storyId)
            ? currentProfile.readingHistory
            : [...(currentProfile.readingHistory || []), storyId],
        };
        setLocalCompletedIds((prev) => new Set([...prev, storyId]));
        await updateProfile(updatedProfile);
        pendingSessionRef.current = null;
      }
      await clearStorySession();
      if (currentProfile) loadAllStoryProgress(currentProfile.id);
      syncNow().catch(() => {});
      if (currentProfile) {
        if (pendingSessionRef.current) return;
        const updatedCompletedIds = new Set([
          ...(currentProfile?.readingHistory?.map(String) ?? []),
          ...localCompletedIds,
        ]);
        if (books.every((b) => updatedCompletedIds.has(String(b.id)))) {
          const level = currentProfile.playLevel ?? 1;
          setCompletedLevelRef(level);
          const pendingBody = {
            profileId: currentProfile.id,
            completedLevel: level,
          };
          await AsyncStorage.setItem(
            `@level_progress_pending_${currentProfile.id}`,
            JSON.stringify(pendingBody),
          );
          setPendingProgression(pendingBody);
          setTimeout(() => setShowLevelProgression(true), 600);
        }
      }
      _overlayShownForStoryId = null;
    }, 300);
  };

  const handleLevelProgressComplete = async (result) => {
    setShowLevelProgression(false);
    setPendingProgression(null);
    await clearPendingProgression(currentProfile.id);
    await refreshAfterProgression(currentProfile.id, result.newLevel);
    setBooks(result.stories);
    await saveStoriesToCache(result.stories, result.newLevel);
    setStoryProgressMap({});
    setLocalCompletedIds(new Set());
    await updateProfile({ ...currentProfile, playLevel: result.newLevel });
  };

  const handleRetryLevelProgression = () => {
    if (!pendingProgression) return;
    setCompletedLevelRef(pendingProgression.completedLevel);
    setShowLevelProgression(true);
  };
  const handleSwitchToCurrent = () =>
    switchLevel(currentProfile?.playLevel ?? 1);

  if (profileLoading || loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9652D9" />
      </View>
    );

  if (!currentProfile)
    return (
      <View style={styles.center}>
        <Text>Select profile first</Text>
      </View>
    );

  const formatNumber = (n) => (!n ? 0 : n > 999 ? "999+" : n);
  const isViewOnly = loadedLevelContext.mode === "VIEW_ONLY";
  const isPlayMode = canPlay(loadedLevelContext);

  const getRecommendedStory = () => {
    if (!books.length) return null;
    const completedIds = new Set([
      ...(currentProfile?.readingHistory?.map(String) ?? []),
      ...localCompletedIds,
    ]);
    for (const book of books) {
      const sid = String(book.id);
      if (completedIds.has(sid)) continue;
      const progressIdx = storyProgressMap[sid] ?? 0;
      if ([progressIdx > 0 && progressIdx < 4]) return book;
    }
    for (const book of books) {
      const sid = String(book.id);
      if (completedIds.has(sid)) continue;
      const progressIdx = storyProgressMap[sid] ?? 0;
      if (progressIdx === 0) return book;
    }
    return books[0];
  };

  const recommendedStory = isPlayMode ? getRecommendedStory() : books[0];
  const completedIdsForProgress = new Set([
    ...(currentProfile?.readingHistory?.map(String) ?? []),
    ...localCompletedIds,
  ]);
  const levelProgress =
    books.length > 0
      ? books.filter((b) => completedIdsForProgress.has(String(b.id))).length /
        books.length
      : 0;

  const SIDE_ICON = isTablet ? 80 : 60;
  const BADGE_SIZE = isTablet ? 34 : 26;
  const BADGE_FONT = isTablet ? 14 : 11;
  const SIDE_LEFT = isTablet ? 28 : 20;
  const SIDE_TOP = isTablet ? 12 : 8;
  const BADGE_ANCHOR_TOP = isTablet ? 52 : 40;
  const ROW_MB = isTablet ? 32 : 25;

  return (
    <>
      <ScreenWrapper>
        {/* ── Static background — no animation loops ── */}
        <View style={styles.background}>
          <View style={[styles.bgCircle, styles.bgCircle1]} />
          <View style={[styles.bgCircle, styles.bgCircle2]} />
          <View style={[styles.bgCircle, styles.bgCircle3]} />

          <SafeAreaView style={styles.safeTop} edges={["top"]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ── SIDE UI ── */}
              <View
                style={{
                  position: "absolute",
                  top: SIDE_TOP,
                  left: SIDE_LEFT,
                  right: SIDE_LEFT,
                }}
              >
                {/* Level badge centre */}
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: BADGE_ANCHOR_TOP,
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                  pointerEvents="box-none"
                >
                  {pendingProgression && (
                    <NewLevelBanner onPress={handleRetryLevelProgression} />
                  )}
                  <View ref={tutorialRefs.levelBadge} collapsable={false}>
                    <LevelBadge
                      displayLevel={loadedLevel}
                      currentLevel={currentProfile.playLevel ?? 1}
                      progress={levelProgress}
                      onPress={() => router.push("/components/Levels")}
                    />
                  </View>
                </View>

                {/* Row 1 — account | diamond */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: ROW_MB,
                  }}
                >
                  <View ref={tutorialRefs.account} collapsable={false}>
                    <TouchableOpacity
                      style={{
                        width: SIDE_ICON,
                        height: SIDE_ICON,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      activeOpacity={0.8}
                      onPress={() => router.push("/account")}
                    >
                      <ProfileIcon name={currentProfile?.name} />
                    </TouchableOpacity>
                  </View>
                  <View ref={tutorialRefs.diamond} collapsable={false}>
                    <View
                      ref={diamondIconRef}
                      collapsable={false}
                      style={{ alignItems: "center" }}
                    >
                      <ExpoImage
                        source={require("../assets/img/diamond.png")}
                        style={{
                          width: SIDE_ICON,
                          height: SIDE_ICON,
                          resizeMode: "contain",
                        }}
                        cachePolicy="memory-disk"
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          minWidth: BADGE_SIZE,
                          height: BADGE_SIZE,
                          paddingHorizontal: pad.s,
                          borderRadius: BADGE_SIZE / 2,
                          backgroundColor: "#FF3B30",
                          justifyContent: "center",
                          alignItems: "center",
                          borderWidth: 2,
                          borderColor: "#fff",
                          elevation: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            color: "#fff",
                            fontSize: BADGE_FONT,
                          }}
                        >
                          {formatNumber(currentProfile?.diamonds ?? 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Row 2 — wordbag | coins */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: ROW_MB,
                  }}
                >
                  <View ref={tutorialRefs.wordbag} collapsable={false}>
                    <TouchableOpacity
                      ref={bagIconRef}
                      collapsable={false}
                      style={{ alignItems: "center" }}
                      onPress={() => router.push("/components/WordBag")}
                      activeOpacity={0.8}
                    >
                      <ExpoImage
                        source={require("../assets/img/bag.png")}
                        style={{
                          width: SIDE_ICON,
                          height: SIDE_ICON,
                          resizeMode: "contain",
                        }}
                        cachePolicy="memory-disk"
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          minWidth: BADGE_SIZE,
                          height: BADGE_SIZE,
                          paddingHorizontal: pad.s,
                          borderRadius: BADGE_SIZE / 2,
                          backgroundColor: "#FF3B30",
                          justifyContent: "center",
                          alignItems: "center",
                          borderWidth: 2,
                          borderColor: "#fff",
                          elevation: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            color: "#fff",
                            fontSize: BADGE_FONT,
                          }}
                        >
                          {formatNumber(
                            currentProfile?.wordBag?.words?.length ?? 0,
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View ref={tutorialRefs.coins} collapsable={false}>
                    <View
                      ref={coinIconRef}
                      collapsable={false}
                      style={{ alignItems: "center" }}
                    >
                      <ExpoImage
                        source={require("../assets/img/coin.png")}
                        style={{
                          width: SIDE_ICON,
                          height: SIDE_ICON,
                          resizeMode: "contain",
                        }}
                        cachePolicy="memory-disk"
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          minWidth: BADGE_SIZE,
                          height: BADGE_SIZE,
                          paddingHorizontal: pad.s,
                          borderRadius: BADGE_SIZE / 2,
                          backgroundColor: "#FFD700",
                          justifyContent: "center",
                          alignItems: "center",
                          borderWidth: 2,
                          borderColor: "#fff",
                          elevation: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            color: "#fff",
                            fontSize: BADGE_FONT,
                          }}
                        >
                          {formatNumber(currentProfile?.coins ?? 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── MAIN CONTENT ── */}
              <View style={{ marginTop: HEADER_HEIGHT }}>
                <AccessModeBanner
                  levelContext={loadedLevelContext}
                  currentPlayLevel={currentProfile.playLevel ?? 1}
                  onSwitchToCurrent={handleSwitchToCurrent}
                />

                {isViewOnly ? (
                  <View style={styles.viewOnlyContainer}>
                    <Text style={styles.viewOnlyEmoji}>🔒</Text>
                    <Text style={styles.viewOnlyTitle}>
                      Level {loadedLevel} is Locked
                    </Text>
                    <Text style={styles.viewOnlyText}>
                      Complete all stories in Level{" "}
                      {currentProfile.playLevel ?? 1} to unlock this level.
                    </Text>
                    <TouchableOpacity
                      style={styles.goCurrentBtn}
                      onPress={handleSwitchToCurrent}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.goCurrentBtnText}>
                        Go to Level {currentProfile.playLevel ?? 1}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {recommendedStory && (
                      <View ref={tutorialRefs.storyImage} collapsable={false}>
                        <MainStoryCard
                          title={recommendedStory.title}
                          description={recommendedStory.introduction}
                          image={{ uri: recommendedStory.cover }}
                          onPress={() =>
                            handleStoryPress(
                              recommendedStory,
                              books.indexOf(recommendedStory),
                            )
                          }
                          progressIndex={
                            storyProgressMap[String(recommendedStory.id)] ?? 0
                          }
                          readIconRef={tutorialRefs.readIcon}
                          guessIconRef={tutorialRefs.guessIcon}
                          listenIconRef={tutorialRefs.listenIcon}
                          describeIconRef={tutorialRefs.describeIcon}
                          accessMode={loadedLevelContext.mode}
                        />
                      </View>
                    )}

                    <View style={{ paddingHorizontal: 15 }}>
                      <Text style={styles.sectionTitle}>Stories</Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={{ flexDirection: "row", paddingLeft: 15 }}>
                        {(() => {
                          const completedIds = new Set([
                            ...(currentProfile?.readingHistory?.map(String) ??
                              []),
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
                            const isCompleted =
                              isPlayMode && completedIds.has(sid);
                            const progressIdx = getProgressIdx(item);
                            const resuming =
                              isPlayMode &&
                              !isCompleted &&
                              progressIdx > 0 &&
                              progressIdx < 4;
                            const resumeAtIndex = resuming ? progressIdx : 0;
                            const storyAccessible = isStoryAccessible(
                              index,
                              loadedLevelContext,
                            );
                            return (
                              <View
                                key={item.id}
                                ref={
                                  index === 0 ? tutorialRefs.storyCard : null
                                }
                                collapsable={false}
                              >
                                <StoryCard
                                  title={item.title}
                                  image={{ uri: item.cover }}
                                  intro={item.introduction}
                                  bookId={item.id}
                                  index={index}
                                  topLeftType={undefined}
                                  isCompleted={isCompleted}
                                  resuming={resuming}
                                  resumeAtIndex={resumeAtIndex}
                                  isLocked={!storyAccessible}
                                  accessMode={loadedLevelContext.mode}
                                  onPress={() => handleStoryPress(item, index)}
                                />
                              </View>
                            );
                          });
                        })()}
                      </View>
                    </ScrollView>
                  </>
                )}

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
      <HomeTutorial
        visible={showTutorial}
        refs={tutorialRefs}
        onDone={handleTutorialDone}
      />
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={() => {
          setShowPremiumModal(false);
          router.push("/components/billing/PlanBillingScreen");
        }}
      />
    </>
  );
};

export default Home;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const BG_CIRCLE1_SIZE = isTablet ? 500 : 350;
const BG_CIRCLE2_SIZE = isTablet ? 300 : 200;
const BG_CIRCLE3_SIZE = isTablet ? 220 : 150;

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: DARK_BG },

  // Static circles — same positions/sizes as before, no animation
  bgCircle: { position: "absolute", borderRadius: 999, opacity: 0.18 },
  bgCircle1: {
    width: BG_CIRCLE1_SIZE,
    height: BG_CIRCLE1_SIZE,
    backgroundColor: TEAL,
    top: isTablet ? -120 : -80,
    right: isTablet ? -120 : -80,
  },
  bgCircle2: {
    width: BG_CIRCLE2_SIZE,
    height: BG_CIRCLE2_SIZE,
    backgroundColor: YELLOW,
    bottom: isTablet ? 140 : 100,
    left: isTablet ? -80 : -60,
  },
  bgCircle3: {
    width: BG_CIRCLE3_SIZE,
    height: BG_CIRCLE3_SIZE,
    backgroundColor: CORAL,
    bottom: isTablet ? 280 : 200,
    right: isTablet ? -60 : -40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: DARK_BG,
  },
  safeTop: { alignItems: "center" },

  sectionHeader: { paddingHorizontal: 15, marginTop: 8, marginBottom: 2 },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: "#fff",
    marginBottom: pad.xs,
  },
  sectionTagline: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: "rgba(255,255,255,0.45)",
    marginBottom: pad.sm,
  },

  viewOnlyContainer: {
    alignItems: "center",
    paddingVertical: isTablet ? pad.xxxl : 60,
    paddingHorizontal: isTablet ? pad.xxl : pad.xxl,
    gap: isTablet ? 20 : 14,
  },
  viewOnlyEmoji: { fontSize: isTablet ? 88 : 64 },
  viewOnlyTitle: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.h3 : font.xxl,
    color: "#E0F7FA",
    textAlign: "center",
  },
  viewOnlyText: {
    fontFamily: FONTS.light,
    fontSize: isTablet ? font.lg : font.md,
    color: "#7a9aaa",
    textAlign: "center",
    lineHeight: isTablet ? font.lg * 1.5 : font.md * 1.6,
  },
  goCurrentBtn: {
    backgroundColor: TEAL,
    borderRadius: radius.pill,
    paddingHorizontal: isTablet ? 40 : pad.xl,
    paddingVertical: isTablet ? 18 : pad.sm,
    marginTop: pad.xs,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  goCurrentBtnText: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.lg : font.md,
    color: "#08081a",
  },
});
