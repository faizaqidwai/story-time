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
//  4. HomeTutorial overlay — highlights each main UI element with a tooltip.
//     Currently always shown (will be gated by first-launch flag later).

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
// TUTORIAL STEPS — title + description for each highlighted element
// ─────────────────────────────────────────────────────────────────────────────
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
      "This shows your current level. Tap it to view and change your level.",
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
    description:
      "This indicates the Read activity for this story. Read the story and learn new words.",
  },
  {
    key: "guessIcon",
    title: "Guess the Word",
    description:
      "This indicates the 'Guess the Word' activity — test your memory of the words you read.",
  },
  {
    key: "listenIcon",
    title: "Listening Activity",
    description:
      "This indicates the 'Listening' activity — sharpen your ear for the new words.",
  },
  {
    key: "describeIcon",
    title: "Describe the Word",
    description:
      "This indicates the 'Describe the Word' activity — express what you've learned.",
  },
  {
    key: "storyCard",
    title: "Story Cards",
    description: "You can start any story by tapping on a story card.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOME TUTORIAL OVERLAY
// Highlights each UI element one at a time using a 4-panel cutout over a
// dark scrim. Tooltip appears above or below the highlighted element.
// All layout coordinates come from measureInWindow() on the target refs.
// ─────────────────────────────────────────────────────────────────────────────
const PADDING = 10; // extra padding around highlighted element

function HomeTutorial({ visible, refs, onDone }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const stepData = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  // ── measure the target ref and update rect ──────────────────────────────
  const measureStep = useCallback(
    (stepIndex) => {
      const key = TUTORIAL_STEPS[stepIndex].key;
      const ref = refs[key];
      if (!ref?.current) return;

      ref.current.measureInWindow((x, y, w, h) => {
        // guard against invalid measurements
        if (w === 0 && h === 0) return;
        const newRect = {
          x: x - PADDING,
          y: y - PADDING,
          width: w + PADDING * 2,
          height: h + PADDING * 2,
        };
        setRect(newRect);

        // reset and start tooltip fade-in
        tooltipAnim.setValue(0);
        Animated.timing(tooltipAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // restart pulse
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

  // ── measure whenever visible or step changes ────────────────────────────
  useEffect(() => {
    if (!visible) return;
    // small delay so the layout has settled before we measure
    const t = setTimeout(() => measureStep(step), 120);
    return () => clearTimeout(t);
  }, [visible, step, measureStep]);

  // ── cleanup on hide ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      if (pulseLoop.current) pulseLoop.current.stop();
      setStep(0);
      setRect(null);
    }
  }, [visible]);

  const handleNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    setRect(null);
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (isFirst) return;
    setRect(null);
    setStep((s) => s - 1);
  };

  const handleSkip = () => {
    onDone();
  };

  if (!visible) return null;

  // ── derive tooltip position ─────────────────────────────────────────────
  // If the rect is in the upper half of the screen → tooltip below, else above
  const showTooltipBelow = rect
    ? rect.y + rect.height / 2 < height * 0.55
    : true;

  const TOOLTIP_MARGIN = 14;

  const tooltipTop = rect
    ? showTooltipBelow
      ? rect.y + rect.height + TOOLTIP_MARGIN
      : rect.y - TOOLTIP_MARGIN - 130 // rough height of tooltip card
    : height * 0.5;

  // clamp so tooltip never goes off-screen
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
        {/* ── SCRIM — 4 panels creating the cutout hole ── */}
        {rect ? (
          <>
            {/* Top panel */}
            <View
              style={[
                tutS.scrimPanel,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(0, rect.y),
                },
              ]}
            />
            {/* Bottom panel */}
            <View
              style={[
                tutS.scrimPanel,
                {
                  top: rect.y + rect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            {/* Left panel */}
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
            {/* Right panel */}
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

            {/* Animated highlight border around the cutout */}
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
          // full scrim while measuring
          <View style={[tutS.scrimPanel, StyleSheet.absoluteFillObject]} />
        )}

        {/* ── TOOLTIP CARD ── */}
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

        {/* ── STEP COUNTER + SKIP ── */}
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

        {/* ── PREV / NEXT NAV ── */}
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
  container: {
    flex: 1,
    position: "relative",
  },
  scrimPanel: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.78)",
  },
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

  // ── Tooltip ──────────────────────────────────────────────
  tooltip: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "rgba(10, 18, 36, 0.97)",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.55)",
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 100,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEAL,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  tooltipDesc: {
    fontSize: 13,
    color: "#B2EBF2",
    lineHeight: 20,
    fontWeight: "500",
  },

  // ── Top bar — Skip on RIGHT, dots centered, nothing on left ────
  // Skip is intentionally top-right so it never overlaps step 1
  // (account icon / profile icon is top-LEFT of the home screen).
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 32,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 200,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  skipText: {
    fontSize: 13,
    fontWeight: "700",
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 18,
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  // ── Bottom nav bar ────────────────────────────────────────
  navBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 44 : 24,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 200,
  },
  navBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.35)",
    backgroundColor: "rgba(0,188,212,0.1)",
    minWidth: 100,
    alignItems: "center",
  },
  navBtnSecondary: {
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  navBtnPrimary: {
    borderColor: TEAL,
    backgroundColor: "rgba(0,188,212,0.25)",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  navBtnDisabled: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: TEAL,
    letterSpacing: 0.3,
  },
  navBtnTextSecondary: {
    color: "rgba(255,255,255,0.65)",
  },
  navBtnTextPrimary: {
    color: "#E0F7FA",
  },
  navBtnTextDisabled: {
    color: "rgba(255,255,255,0.2)",
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
  },
});

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

  const pendingSessionRef = useRef(null);
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
  const DIAMONDS_PER_FINISH = 3;

  // ── existing currency / bag refs ──────────────────────────────────────────
  const coinIconRef = useRef(null);
  const diamondIconRef = useRef(null);
  const bagIconRef = useRef(null);

  // ── NEW tutorial refs ─────────────────────────────────────────────────────
  // These are attached to wrappers around the elements we want to highlight.
  // Names match TUTORIAL_STEPS[n].key
  const tutorialRefs = {
    account: useRef(null), // profile icon (top-left)
    levelBadge: useRef(null), // level badge (center-top)
    wordbag: useRef(null), // word bag icon
    diamond: useRef(null), // diamond icon
    coins: useRef(null), // coins icon
    storyImage: useRef(null), // MainStoryCard wrapper
    readIcon: useRef(null), // Read activity icon inside MainStoryCard
    guessIcon: useRef(null), // Guess activity icon
    listenIcon: useRef(null), // Listen activity icon
    describeIcon: useRef(null), // Describe activity icon
    storyCard: useRef(null), // first StoryCard in Stories section
  };

  // ── Tutorial state — true always for now ─────────────────────────────────
  const [showTutorial, setShowTutorial] = useState(false);

  const handleTutorialDone = useCallback(() => {
    setShowTutorial(false);
    // TODO: persist first-launch flag to AsyncStorage to disable after first real view
    // await AsyncStorage.setItem("@tutorial_seen", "true");
  }, []);

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
        setBooks(data);
        await saveStoriesToCache(data, currentProfile?.playLevel ?? 1);
      } catch (e) {
        console.warn("Home: failed to fetch books from API", e);
      } finally {
        setLoading(false);
      }
    };

    if (currentProfile) {
      resetSessionForProfileSwitch();
      setStoryProgressMap({});
      setLocalCompletedIds(new Set());
      load();
      loadAllStoryProgress(currentProfile.id);
      getPendingProgression(currentProfile.id).then(setPendingProgression);
      // Show tutorial every time for now
      setShowTutorial(true);
    }
  }, [currentProfile]);

  useEffect(() => {
    if (currentProfile) loadAllStoryProgress(currentProfile.id);
  }, [storySession?.nextActivityIndex, storySession?.storyId]);

  useEffect(() => {
    if (!storySession) return;
    if (storySession.nextActivityIndex < 4) return;
    if (showFinish) return;

    pendingSessionRef.current = storySession;
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

  const handleStoryPress = async (story) => {
    if (!currentProfile) return;
    await startStorySession(story, currentProfile.id);
    router.push({
      pathname: `/book/${story.id}`,
      params: { title: story.title },
    });
  };

  const handleFinishDone = async () => {
    setShowFinish(false);
    const session = pendingSessionRef.current;
    if (currentProfile && session) {
      const rewards = session.totalRewards;
      const coinsToAdd = rewards.coins || 0;
      const diamondsToAdd = DIAMONDS_PER_FINISH;
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
      setLocalCompletedIds((prev) => new Set([...prev, storyId]));
      await updateProfile(updatedProfile);
      pendingSessionRef.current = null;
    }
    await clearStorySession();
    if (currentProfile) loadAllStoryProgress(currentProfile.id);

    if (currentProfile && pendingSessionRef.current === null) {
      const session2 = pendingSessionRef.current;
    }
    if (currentProfile) {
      const session = pendingSessionRef.current;
      if (session) return; // already cleared above

      const updatedCompletedIds = new Set([
        ...(currentProfile?.readingHistory?.map(String) ?? []),
        ...localCompletedIds,
      ]);
      const allDone = books.every((b) => updatedCompletedIds.has(String(b.id)));
      if (allDone) {
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
  };

  const handleLevelProgressComplete = async (result) => {
    setShowLevelProgression(false);
    setPendingProgression(null);
    await clearPendingProgression(currentProfile.id);
    setBooks(result.stories);
    await AsyncStorage.setItem(
      storyCacheKey(result.newLevel),
      JSON.stringify({ stories: result.stories }),
    );
    setStoryProgressMap({});
    setLocalCompletedIds(new Set());
    await updateProfile({ ...currentProfile, playLevel: result.newLevel });
  };

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
                  {pendingProgression && (
                    <NewLevelBanner onPress={handleRetryLevelProgression} />
                  )}
                  {/* Tutorial step 2 — Level Badge */}
                  <View ref={tutorialRefs.levelBadge} collapsable={false}>
                    <LevelBadge
                      level={currentProfile.playLevel}
                      progress={0.62}
                      onPress={() => router.push("/components/Levels")}
                    />
                  </View>
                </View>

                <View style={styles.sideRow}>
                  {/*
                    Tutorial step 1 — Account icon
                    Wrap the existing profileWrapper TouchableOpacity with the tutorial ref.
                    collapsable={false} is required for measureInWindow to work on Android.
                  */}
                  <View ref={tutorialRefs.account} collapsable={false}>
                    <TouchableOpacity
                      style={styles.profileWrapper}
                      activeOpacity={0.8}
                      onPress={() => router.push("/account")}
                    >
                      <ProfileIcon name={currentProfile?.name} />
                    </TouchableOpacity>
                  </View>

                  {/*
                    Tutorial step 3 — Diamond icon
                    Wrap the existing diamondIconRef View with the tutorial ref.
                  */}
                  <View ref={tutorialRefs.diamond} collapsable={false}>
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
                </View>

                <View style={styles.sideRow}>
                  {/*
                    Tutorial step 2 — Word Bag icon
                    Wrap the existing bagIconRef TouchableOpacity with the tutorial ref.
                  */}
                  <View ref={tutorialRefs.wordbag} collapsable={false}>
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
                  </View>

                  {/*
                    Tutorial step 4 — Coins icon
                    Wrap the existing coinIconRef View with the tutorial ref.
                  */}
                  <View ref={tutorialRefs.coins} collapsable={false}>
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
              </View>

              {/* ── MAIN CONTENT ── */}
              <View style={{ marginTop: HEADER_HEIGHT }}>
                {/*
                  Tutorial step 5 — Main story card (the whole card).
                  Steps 6-9 (Read/Guess/Listen/Describe icons) are measured from
                  sub-refs passed into the MainStoryCard area wrapper below.
                  Since we cannot modify MainStoryCard internals, we pass the refs
                  as a prop called tutorialIconRefs and forward them if MainStoryCard
                  supports it, OR we fall back to wrapping each icon in a View ref
                  via a custom wrapper around MainStoryCard.
                  
                  For now: we wrap the entire MainStoryCard in tutorialRefs.storyImage.
                  For steps 6-9, we place invisible measurement anchors in a row
                  below the card that mirror the icon positions, so tutorial can
                  highlight the correct area on screen.
                  These anchors are positioned to match the 4 activity icons in
                  MainStoryCard (Read/Guess/Listen/Describe).
                */}
                <View ref={tutorialRefs.storyImage} collapsable={false}>
                  <MainStoryCard
                    title={books[0].title}
                    description={books[0].introduction}
                    image={{ uri: books[0].cover }}
                    onPress={() => handleStoryPress(books[0])}
                    // Pass refs for activity icons if MainStoryCard accepts them
                    readIconRef={tutorialRefs.readIcon}
                    guessIconRef={tutorialRefs.guessIcon}
                    listenIconRef={tutorialRefs.listenIcon}
                    describeIconRef={tutorialRefs.describeIcon}
                  />
                </View>

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
                          // Tutorial step 10 — wrap the FIRST story card only
                          <View
                            key={item.id}
                            ref={index === 0 ? tutorialRefs.storyCard : null}
                            collapsable={false}
                          >
                            <StoryCard
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
                          </View>
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

      {/* Story-finish overlay — unchanged */}
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

      {/* ── HOME TUTORIAL OVERLAY ── */}
      <HomeTutorial
        visible={showTutorial}
        refs={tutorialRefs}
        onDone={handleTutorialDone}
      />
    </>
  );
};

export default Home;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES  (unchanged from original)
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
