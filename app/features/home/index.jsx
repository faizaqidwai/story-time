// app/home.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs previous version:
//   1. Header: all icons top-aligned with level badge (alignItems:"flex-start")
//      Equal spacing on both sides of badge (symmetric flex groups)
//   2. LevelBadge progress bar hidden (showProgressBar={false})
//   3. LevelGoalTracker has negative marginTop so its top card edge overlaps
//      the bottom of the level badge — badge visually overlays tracker border
//   4. StoryCollectionArc removed from home (moved to UnlockModal)
//   5. MainStoryCard entire card is clickable — onPress passed directly
// ─────────────────────────────────────────────────────────────────────────────

import {
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  Platform,
} from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Image as ExpoImage } from "expo-image";
import { Audio } from "expo-av";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import StoryCard from "../stories/components/StoryCard";
import { bookService } from "../../services/bookService";
import ScreenWrapper from "../../shared/ScreenWrapper";
import { useUser } from "../../_contexts/UserContext";
import { useLevelAccess } from "../../_contexts/LevelAccessContext";
import { useSubscription } from "../../_contexts/SubscriptionContext";
import { useStoryActivity } from "../../_contexts/StoryActivityContext";
import MainStoryCard from "../stories/components/MainStoryCard";
import StoryFinishOverlay from "../stories/components/StoryFinishOverlay";
import LevelProgressionOverlay from "../levels/components/LevelProgressionOverlay";
import NewLevelBanner from "../levels/components/NewLevelBanner";
import PremiumUpgradeModal from "./components/PremiumUpgradeModal";
import {
  getPendingProgression,
  clearPendingProgression,
} from "../../services/levelProgressionService";
import LevelBadge from "../levels/components/LevelBadge";
import { HomeVocabularySection } from "../vocabulary/components/HomeVocabularySection";

import {
  GamificationProvider,
  useGamification,
} from "../../gamification/GamificationContext";
import GamesSection from "../../gamification/components/GamesSection";
import LevelGoalTracker from "../../gamification/components/LevelGoalTracker";
import UnlockModal from "../../gamification/components/UnlockModal";
import CoinPromptModal from "../../gamification/components/CoinPromptModal";
import LockedGameModal from "../../gamification/components/LockedGameModal";
import DiamondInfoModal from "./components/DiamondInfoModal";
import CoinInfoModal from "./components/CoinInfoModal";

import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../../theme";
import { font, pad, radius, isTablet } from "../../theme/tokens";

let _finishHandled = false;
let _overlayShownForStoryId = null;
let _initializedProfileId = null;

const { width, height } = Dimensions.get("window");
const DARK_BG = "#1a1a2e";
const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";
const CORAL = "#FF7043";

const _tutorialCheckedAccounts = new Set();
const storyCacheKey = (levelNumber) => `@stories_cache_v2_level_${levelNumber}`;

// Level badge size — used to calculate tracker overlap
const BADGE_RING_SIZE = isTablet ? 110 : 82;
// How much the tracker top should slide behind the badge
const TRACKER_OVERLAP = isTablet ? 30 : 24;

const TUTORIAL_STEPS = [
  {
    key: "account",
    title: "Your Account",
    description:
      "Use this to see your account details and switch between profiles.",
    sound: require("../../../assets/sounds/tutorial/s1.mp3"),
  },
  {
    key: "levelBadge",
    title: "Level Badge",
    description:
      "This shows your current level. Tap it to switch between levels.",
    sound: require("../../../assets/sounds/tutorial/s2.mp3"),
  },
  {
    key: "wordbag",
    title: "Word Bag",
    description:
      "Upon completing stories, you collect important words and phrases here.",
    sound: require("../../../assets/sounds/tutorial/s3.mp3"),
  },
  {
    key: "storyImage",
    title: "Recommended Story",
    description:
      "This shows the recommended story to start with. Tap to begin!",
    sound: require("../../../assets/sounds/tutorial/s4.mp3"),
  },
  {
    key: "activities",
    isActivitiesStep: true,
    title: "Story Activities",
    description:
      "Each story has four activities: Read, Guess the Word, Listening, and Describe the Word. Complete them all to finish a story!",
    sound: require("../../../assets/sounds/tutorial/s5.mp3"),
    subKeys: ["readIcon", "guessIcon", "listenIcon", "describeIcon"],
    subLabels: ["Read", "Guess the Word", "Listening", "Describe the Word"],
  },
];

async function playSound(file, { volume = 1.0 } = {}) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    await sound.setVolumeAsync(volume);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (_) {}
}

function playStepVoice(file, { volume = 1.0, onFinished } = {}) {
  let cancelled = false,
    soundObj = null;
  (async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(file);
      soundObj = sound;
      await sound.setVolumeAsync(volume);
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.didJustFinish) {
          sound.unloadAsync();
          if (!cancelled && onFinished) onFinished();
        }
      });
      if (!cancelled) await sound.playAsync();
      else sound.unloadAsync();
    } catch (_) {}
  })();
  return () => {
    cancelled = true;
    if (soundObj) {
      soundObj.stopAsync().catch(() => {});
      soundObj.unloadAsync().catch(() => {});
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS MODE BANNER (unchanged)
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
  } else return null;
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
// SUBSCRIPTION EXPIRED (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function subscriptionStatusMessage(subscription) {
  if (!subscription)
    return {
      emoji: "📚",
      title: "Start Your Reading Journey",
      message:
        "Unlock all stories, activities and levels with a StoryTime subscription. Your child's learning adventure awaits.",
      ctaLabel: "View Plans →",
    };
  const status = subscription.status,
    planName = subscription.packageName ?? "your plan";
  switch (status) {
    case "EXPIRED":
      return {
        emoji: "⏰",
        title: "Your Subscription Has Ended",
        message: `Your ${planName} plan is no longer active. Renew your plan to continue your child's reading journey and keep their progress going.`,
        ctaLabel: "Renew Plan →",
      };
    case "CANCELLED":
      return {
        emoji: "📖",
        title: "Subscription Cancelled",
        message: `Your ${planName} plan has been cancelled. Your child's progress is saved — resubscribe anytime to pick up right where you left off.`,
        ctaLabel: "Resubscribe →",
      };
    case "PAST_DUE":
      return {
        emoji: "💳",
        title: "Payment Issue",
        message: `We couldn't process your payment for ${planName}. Please update your payment method in your ${Platform.OS === "ios" ? "Apple ID" : "Google Play"} settings to continue reading.`,
        ctaLabel: "View Plans →",
      };
    default:
      return {
        emoji: "🔒",
        title: "Subscription Required",
        message:
          "An active subscription is required to access StoryTime's full library. Choose a plan that's right for your family.",
        ctaLabel: "View Plans →",
      };
  }
}

function SubscriptionExpiredScreen({ subscription, onViewPlans }) {
  const { emoji, title, message, ctaLabel } =
    subscriptionStatusMessage(subscription);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.97,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        subExpS.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={subExpS.glowCircle} />
      <Text style={subExpS.emoji}>{emoji}</Text>
      <Text style={subExpS.title}>{title}</Text>
      <Text style={subExpS.message}>{message}</Text>
      <View style={subExpS.divider} />
      <View style={subExpS.featureRow}>
        {[
          "📚 All Stories",
          "🎯 4 Activities",
          "🏆 Progress Tracking",
          "👨‍👩‍👧 Family Profiles",
        ].map((feat, i) => (
          <View key={i} style={subExpS.featurePill}>
            <Text style={subExpS.featurePillText}>{feat}</Text>
          </View>
        ))}
      </View>
      <Animated.View
        style={{ transform: [{ scale: pulseAnim }], width: "100%" }}
      >
        <TouchableOpacity
          style={subExpS.ctaBtn}
          onPress={onViewPlans}
          activeOpacity={0.88}
        >
          <View style={subExpS.ctaShine} />
          <Text style={subExpS.ctaBtnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={subExpS.footnote}>Cancel anytime · No hidden fees</Text>
    </Animated.View>
  );
}
const subExpS = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: isTablet ? pad.xxxl : 48,
    paddingHorizontal: isTablet ? pad.xxl : pad.lg,
    gap: isTablet ? 20 : 14,
  },
  glowCircle: {
    position: "absolute",
    top: isTablet ? 30 : 20,
    width: isTablet ? 180 : 130,
    height: isTablet ? 180 : 130,
    borderRadius: isTablet ? 90 : 65,
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  emoji: { fontSize: isTablet ? 88 : 64, marginBottom: pad.xs },
  title: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.h3 : font.xxl,
    color: "#E0F7FA",
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: isTablet ? font.h3 * 1.2 : font.xxl * 1.2,
  },
  message: {
    fontFamily: FONTS.light,
    fontSize: isTablet ? font.lg : font.md,
    color: "#7a9aaa",
    textAlign: "center",
    lineHeight: isTablet ? font.lg * 1.6 : font.md * 1.6,
    paddingHorizontal: pad.sm,
  },
  divider: {
    width: "40%",
    height: 1,
    backgroundColor: "rgba(0,188,212,0.2)",
    marginVertical: pad.xs,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: pad.sm,
  },
  featurePill: {
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  featurePillText: {
    fontFamily: FONTS.regular,
    fontSize: isTablet ? font.md : font.sm,
    color: "#B2EBF2",
  },
  ctaBtn: {
    backgroundColor: TEAL,
    borderRadius: radius.pill,
    paddingVertical: isTablet ? 18 : pad.sm,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
    width: "100%",
  },
  ctaShine: {
    position: "absolute",
    top: 0,
    left: "14%",
    width: "38%",
    height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  ctaBtnText: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.lg : font.md,
    color: "#08081a",
    letterSpacing: 0.3,
  },
  footnote: {
    fontFamily: FONTS.light,
    fontSize: isTablet ? font.sm : font.s,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HOME TUTORIAL OVERLAY (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────
const PADDING = 10;
function HomeTutorial({ visible, refs, onDone }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const subCycleTimer = useRef(null);
  const cancelVoiceRef = useRef(null);
  const stepRef = useRef(step);
  const stepData = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  const cancelVoice = useCallback(() => {
    if (cancelVoiceRef.current) {
      cancelVoiceRef.current();
      cancelVoiceRef.current = null;
    }
  }, []);
  const animateToRect = useCallback(
    (newRect) => {
      setRect(newRect);
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
    },
    [tooltipAnim, pulseAnim],
  );

  const measureStep = useCallback(
    (stepIndex, subIndex = 0) => {
      const sd = TUTORIAL_STEPS[stepIndex];
      const refKey = sd.isActivitiesStep ? sd.subKeys[subIndex] : sd.key;
      const ref = refs[refKey];
      if (!ref?.current) return;
      ref.current.measureInWindow((x, y, w, h) => {
        if (w === 0 && h === 0) return;
        animateToRect({
          x: x - PADDING,
          y: y - PADDING,
          width: w + PADDING * 2,
          height: h + PADDING * 2,
        });
      });
    },
    [refs, animateToRect],
  );

  const stopSubCycle = useCallback(() => {
    if (subCycleTimer.current) {
      clearInterval(subCycleTimer.current);
      subCycleTimer.current = null;
    }
  }, []);
  const startSubCycle = useCallback(
    (stepIndex) => {
      stopSubCycle();
      const sd = TUTORIAL_STEPS[stepIndex];
      if (!sd?.isActivitiesStep) return;
      let idx = 0;
      setActiveSubIndex(0);
      measureStep(stepIndex, 0);
      subCycleTimer.current = setInterval(() => {
        idx = (idx + 1) % sd.subKeys.length;
        setActiveSubIndex(idx);
        measureStep(stepIndex, idx);
      }, 6000);
    },
    [stopSubCycle, measureStep],
  );

  const goNext = useCallback(
    (currentStep) => {
      if (stepRef.current !== currentStep) return;
      if (currentStep >= TUTORIAL_STEPS.length - 1) {
        onDone();
        return;
      }
      setRect(null);
      setStep(currentStep + 1);
    },
    [onDone],
  );

  useEffect(() => {
    if (!visible) return;
    stepRef.current = step;
    cancelVoice();
    stopSubCycle();
    setActiveSubIndex(0);
    setRect(null);
    const capturedStep = step,
      sd = TUTORIAL_STEPS[capturedStep];
    const t = setTimeout(() => {
      if (sd.isActivitiesStep) startSubCycle(capturedStep);
      else measureStep(capturedStep, 0);
      if (sd?.sound) {
        const cancel = playStepVoice(sd.sound, {
          onFinished: () => goNext(capturedStep),
        });
        cancelVoiceRef.current = cancel;
      }
    }, 120);
    return () => {
      clearTimeout(t);
      cancelVoice();
    };
  }, [visible, step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) {
      cancelVoice();
      stopSubCycle();
      if (pulseLoop.current) pulseLoop.current.stop();
      setStep(0);
      setRect(null);
      setActiveSubIndex(0);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    cancelVoice();
    playSound(require("../../../assets/sounds/tick1.mp3"));
    if (isLast) {
      onDone();
      return;
    }
    setRect(null);
    setStep((p) => p + 1);
  };
  const handlePrev = () => {
    if (isFirst) return;
    cancelVoice();
    playSound(require("../../../assets/sounds/tick1.mp3"));
    setRect(null);
    setStep((p) => p - 1);
  };
  const handleSkip = () => {
    cancelVoice();
    onDone();
  };

  if (!visible) return null;
  const showTooltipBelow = rect
    ? rect.y + rect.height / 2 < height * 0.55
    : true;
  const tooltipTop = rect
    ? showTooltipBelow
      ? rect.y + rect.height + 14
      : rect.y - 14 - 160
    : height * 0.5;
  const clampedTooltipTop = Math.max(60, Math.min(tooltipTop, height - 220));
  const showSubLabel =
    stepData.isActivitiesStep && stepData.subLabels?.[activeSubIndex] != null;

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
            onPress={handleNext}
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
            {showSubLabel && (
              <View style={tutS.subLabelRow}>
                {stepData.subKeys.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      tutS.subLabelPill,
                      i === activeSubIndex && tutS.subLabelPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        tutS.subLabelText,
                        i === activeSubIndex && tutS.subLabelTextActive,
                      ]}
                    >
                      {stepData.subLabels[i]}
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
  subLabelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: pad.sm,
  },
  subLabelPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  subLabelPillActive: {
    borderColor: TEAL,
    backgroundColor: "rgba(0,188,212,0.22)",
  },
  subLabelText: {
    fontFamily: FONTS.regular,
    fontSize: font.s,
    color: "rgba(178,235,242,0.55)",
  },
  subLabelTextActive: { fontFamily: FONTS.bold, color: TEAL },
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
// PROFILE ICON (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileIcon({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const outerSize = isTablet ? 52 : 42;
  const halfOuter = outerSize / 2;
  const letterSize = isTablet ? 12 : 10;
  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: halfOuter,
        overflow: "hidden",
        shadowColor: TEAL,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,
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
              top: 4,
              left: 6,
              width: outerSize - 12,
              height: 10,
              borderRadius: 6,
              backgroundColor: "rgba(0,188,212,0.09)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 7,
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
              bottom: -5,
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
              bottom: 9,
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
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const HomeContent = () => {
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
  const { subscription, ensureFreshSubscription } = useSubscription();
  const gamification = useGamification();

  const pendingSessionRef = useRef(null);
  const storyCompletedRef = useRef(false);
  const rewardsDispersedRef = useRef(false);
  const prevLoadedLevelRef = useRef(null);
  const lastInitializedProfileIdRef = useRef(null);
  const profileSwitchInProgressRef = useRef(false);

  const [localCompletedIds, setLocalCompletedIds] = useState(new Set());
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storyProgressMap, setStoryProgressMap] = useState({});
  const [showFinish, setShowFinish] = useState(false);
  const [finishData, setFinishData] = useState({
    storyId: null,
    words: 0,
    coins: 0,
    diamonds: 0,
    sampleWords: [],
    scratchSlot: null,
  });
  const [showLevelProgression, setShowLevelProgression] = useState(false);
  const [completedLevelRef, setCompletedLevelRef] = useState(null);
  const [pendingProgression, setPendingProgression] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showDiamondInfo, setShowDiamondInfo] = useState(false);
  const [showCoinInfo, setShowCoinInfo] = useState(false);
  const [showSubscriptionExpired, setShowSubscriptionExpired] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const DIAMONDS_PER_FINISH = 3;
  const coinIconRef = useRef(null);
  const diamondIconRef = useRef(null);
  const bagIconRef = useRef(null);

  const diamondShakeAnim = useRef(new Animated.Value(0)).current;
  const bagShakeAnim = useRef(new Animated.Value(0)).current;
  const coinShakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shake = (anim) =>
      Animated.sequence([
        Animated.timing(anim, {
          toValue: -10,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 6,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: -7,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 4,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 70,
          useNativeDriver: true,
        }),
      ]);
    let cancelled = false;
    const timers = [];
    const runCycle = () => {
      if (cancelled) return;
      shake(diamondShakeAnim).start(() => {
        if (cancelled) return;
        const t1 = setTimeout(() => {
          if (cancelled) return;
          shake(bagShakeAnim).start(() => {
            if (cancelled) return;
            const t2 = setTimeout(() => {
              if (cancelled) return;
              shake(coinShakeAnim).start(() => {
                const t3 = setTimeout(runCycle, 35000);
                timers.push(t3);
              });
            }, 35000);
            timers.push(t2);
          });
        }, 35000);
        timers.push(t1);
      });
    };
    const t0 = setTimeout(runCycle, 8000);
    timers.push(t0);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      diamondShakeAnim.stopAnimation();
      bagShakeAnim.stopAnimation();
      coinShakeAnim.stopAnimation();
    };
  }, []);

  const tutorialRefs = {
    account: useRef(null),
    levelBadge: useRef(null),
    wordbag: useRef(null),
    storyImage: useRef(null),
    readIcon: useRef(null),
    guessIcon: useRef(null),
    listenIcon: useRef(null),
    describeIcon: useRef(null),
  };
  const handleTutorialDone = useCallback(() => setShowTutorial(false), []);

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
          if (session.nextActivityIndex > 0 && session.nextActivityIndex < 4)
            map[sid] = session.nextActivityIndex;
          else if (session.nextActivityIndex >= 4)
            completedFromStorage.add(sid);
        } catch (_) {}
      }
      setStoryProgressMap(map);
      setLocalCompletedIds((prev) =>
        completedFromStorage.size === 0
          ? prev
          : new Set([...prev, ...completedFromStorage]),
      );
    } catch (_) {}
  };

  useEffect(() => {
    const overlayAssets = [
      require("../../../assets/img/diamond.png"),
      require("../../../assets/img/coin.png"),
      require("../../../assets/img/bag.png"),
      require("../../../assets/games/scratch-cover.jpeg"),
    ];
    Promise.allSettled(overlayAssets.map((src) => ExpoImage.prefetch(src)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      ensureFreshSubscription();
    }, []),
  );
  useEffect(() => {
    if (!subscription || subscription.status !== "ACTIVE")
      setShowSubscriptionExpired(true);
    else setShowSubscriptionExpired(false);
  }, [subscription]);
  useEffect(() => {
    if (!books?.length) return;
    const coverImages = books
      .filter((b) => typeof b.cover === "string" && b.cover.length > 0)
      .map((b) => b.cover);
    Promise.allSettled(coverImages.map((uri) => ExpoImage.prefetch(uri)));
  }, [books]);
  useEffect(() => {
    if (!books?.length) return;
    const timer = setTimeout(() => {
      const earlyPageImages = books.flatMap((book) => {
        if (!Array.isArray(book.pages)) return [];
        return book.pages
          .slice(0, 2)
          .filter((p) => typeof p.image === "string" && p.image.length > 0)
          .map((p) => p.image);
      });
      Promise.allSettled(earlyPageImages.map((uri) => ExpoImage.prefetch(uri)));
    }, 1000);
    return () => clearTimeout(timer);
  }, [books]);

  const loadStoriesFromCache = async (levelNumber) => {
    try {
      const raw = await AsyncStorage.getItem(storyCacheKey(levelNumber));
      if (!raw) return null;
      return JSON.parse(raw).stories;
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
    if (!currentProfile) return;
    if (_initializedProfileId === currentProfile.id) return;
    _initializedProfileId = currentProfile.id;
    lastInitializedProfileIdRef.current = currentProfile.id;
    profileSwitchInProgressRef.current = true;
    resetSessionForProfileSwitch();
    setStoryProgressMap({});
    setLocalCompletedIds(new Set());
    setBooks([]);
    initForProfile(currentProfile).then(() => {
      profileSwitchInProgressRef.current = false;
      prevLoadedLevelRef.current = currentProfile.playLevel ?? 1;
      loadBooksForLevel(
        currentProfile.playLevel ?? 1,
        currentProfile.id,
        currentProfile.playLevel ?? 1,
      );
      try {
        if (gamification && !storyCompletedRef.current)
          gamification.loadGamesForLevel(currentProfile.playLevel ?? 1);
        storyCompletedRef.current = false;
      } catch (_) {}
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
        } else setShowTutorial(false);
      });
    }
    syncNow()
      .catch(() => {})
      .finally(() => loadAllStoryProgress(currentProfile.id));
  }, [currentProfile?.id]);

  useEffect(() => {
    if (
      !currentProfile ||
      profileSwitchInProgressRef.current ||
      prevLoadedLevelRef.current === loadedLevel
    )
      return;
    prevLoadedLevelRef.current = loadedLevel;
    loadBooksForLevel(
      loadedLevel,
      currentProfile.id,
      currentProfile.playLevel ?? 1,
    );
    try {
      if (gamification) gamification.loadGamesForLevel(loadedLevel);
    } catch (_) {}
  }, [loadedLevel]);

  useEffect(() => {
    if (currentProfile) loadAllStoryProgress(currentProfile.id);
  }, [storySession?.nextActivityIndex, storySession?.storyId]);

  useFocusEffect(
    useCallback(() => {
      if (
        _finishHandled ||
        !storySession ||
        storySession.nextActivityIndex < 4 ||
        showFinish
      )
        return;
      _finishHandled = false;
      pendingSessionRef.current = storySession;
      const challengeWords = storySession.challengeWords || [],
        rewards = storySession.totalRewards;
      (async () => {
        let scratchSlot = null;
        try {
          const games = gamification?.levelGames ?? [];
          if (games.length > 0 && currentProfile?.id) {
            const allKeys = await AsyncStorage.getAllKeys();
            const prefix = `@story_activity_${currentProfile.id}_`;
            const storyKeys = allKeys.filter((k) => k.startsWith(prefix));
            const pairs = await AsyncStorage.multiGet(storyKeys);
            const currentLevelStoryIds = new Set(
              books.map((b) => String(b.id)),
            );
            let completedCount = 0;
            for (const [, raw] of pairs) {
              if (!raw) continue;
              try {
                const session = JSON.parse(raw);
                if (
                  (session.nextActivityIndex ?? 0) >= 4 &&
                  currentLevelStoryIds.has(String(session.storyId))
                )
                  completedCount++;
              } catch (_) {}
            }
            if (completedCount <= 6) {
              const activeSlot = games.find(
                (g) => g.status === "LOCKED" && g.storiesCompletedInGroup < 3,
              );
              if (activeSlot)
                scratchSlot = {
                  storiesCompletedBefore: activeSlot.storiesCompletedInGroup,
                  storiesCompletedAfter: Math.min(
                    activeSlot.storiesCompletedInGroup + 1,
                    3,
                  ),
                  gameId: activeSlot.gameId,
                  gradient: activeSlot.gradient,
                  icon: activeSlot.icon,
                  name: activeSlot.name,
                };
            }
          }
        } catch (_) {}
        setFinishData({
          storyId: storySession.storyId,
          coins: rewards.coins || 0,
          diamonds: DIAMONDS_PER_FINISH,
          projectedDiamonds:
            (currentProfile?.diamonds || 0) + DIAMONDS_PER_FINISH,
          words: challengeWords.length,
          sampleWords: challengeWords.slice(0, 8).map((w) => w.name || w),
          scratchSlot,
        });
        storyCompletedRef.current = false;
        rewardsDispersedRef.current = false;
        setTimeout(() => setShowFinish(true), 1000);
      })();
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
      pathname: `features/stories/book/${story.id}`,
      params: { title: story.title },
    });
  };

  const disburseRewards = async () => {
    if (rewardsDispersedRef.current) return;
    rewardsDispersedRef.current = true;
    const session = pendingSessionRef.current;
    if (!currentProfile || !session) return;
    const rewards = session.totalRewards,
      storyId = String(session.storyId);
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
  };

  const handleFinishDone = async () => {
    if (_finishHandled) return;
    _finishHandled = true;
    setShowFinish(false);
    setTimeout(async () => {
      const session = pendingSessionRef.current;
      if (currentProfile && session) {
        const storyId = String(session.storyId);
        await disburseRewards();
        pendingSessionRef.current = null;
        try {
          if (gamification && !storyCompletedRef.current)
            gamification.onStoryComplete(storyId, loadedLevel);
          storyCompletedRef.current = false;
        } catch (_) {}
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

    await new Promise((resolve) => setTimeout(resolve, 350));

    await clearPendingProgression(currentProfile.id);

    // This updates loadedLevel in context, which triggers useEffect([loadedLevel])
    // which calls loadBooksForLevel — so we don't need setBooks here
    await refreshAfterProgression(currentProfile.id, result.newLevel);

    await saveStoriesToCache(result.stories, result.newLevel);
    await updateProfile({ ...currentProfile, playLevel: result.newLevel });

    // Batch remaining state resets
    setPendingProgression(null);
    setStoryProgressMap({});
    setLocalCompletedIds(new Set());
    // Don't call setBooks here — the loadedLevel useEffect handles it
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
      if (progressIdx > 0 && progressIdx < 4) return book;
    }
    for (const book of books) {
      const sid = String(book.id);
      if (completedIds.has(sid)) continue;
      if ((storyProgressMap[sid] ?? 0) === 0) return book;
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
  const currentLevelBookIds = new Set(books.map((b) => String(b.id)));
  const completedStoryCount = [
    ...(currentProfile?.readingHistory?.map(String) ?? []),
    ...localCompletedIds,
  ].filter((id) => currentLevelBookIds.has(id)).length;

  const ICON_SIZE = isTablet ? 50 : 40;
  const BADGE_SIZE = isTablet ? 20 : 16;
  const BADGE_FONT = isTablet ? 9 : 8;

  return (
    <>
      <ScreenWrapper>
        <View style={styles.background}>
          <View style={[styles.bgCircle, styles.bgCircle1]} />
          <View style={[styles.bgCircle, styles.bgCircle2]} />
          <View style={[styles.bgCircle, styles.bgCircle3]} />

          <SafeAreaView style={styles.safeTop} edges={["top"]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ════════════════════════════════════════════════════════════
                  HORIZONTAL HEADER ROW
                  Icons top-aligned with badge, equal spacing each side.
                  Progress bar hidden on LevelBadge.
                  ════════════════════════════════════════════════════════ */}
              <View style={hdrS.row}>
                {/* LEFT: Profile + WordBag */}
                <View style={hdrS.group}>
                  <View ref={tutorialRefs.account} collapsable={false}>
                    <TouchableOpacity
                      style={hdrS.iconBtn}
                      activeOpacity={0.8}
                      onPress={() => router.push("features/user/account")}
                    >
                      <ProfileIcon name={currentProfile?.name} />
                    </TouchableOpacity>
                  </View>
                  <View ref={tutorialRefs.wordbag} collapsable={false}>
                    <TouchableOpacity
                      ref={bagIconRef}
                      collapsable={false}
                      style={hdrS.iconBtn}
                      onPress={() =>
                        router.push("/features/vocabulary/VocabularyScreen")
                      }
                      activeOpacity={0.8}
                    >
                      <Animated.View
                        style={{ transform: [{ translateY: bagShakeAnim }] }}
                      >
                        <ExpoImage
                          source={require("../../../assets/img/bag.png")}
                          style={{ width: ICON_SIZE, height: ICON_SIZE }}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* CENTER: Level Badge — progress bar hidden */}
                <View style={hdrS.center} pointerEvents="box-none">
                  {pendingProgression && (
                    <NewLevelBanner onPress={handleRetryLevelProgression} />
                  )}
                  <View ref={tutorialRefs.levelBadge} collapsable={false}>
                    <LevelBadge
                      displayLevel={loadedLevel}
                      currentLevel={currentProfile.playLevel ?? 1}
                      progress={levelProgress}
                      onPress={() => router.push("/features/levels/Levels")}
                      showProgressBar={false}
                    />
                  </View>
                </View>

                {/* RIGHT: Diamond + Coins */}
                <View style={hdrS.group}>
                  <TouchableOpacity
                    ref={diamondIconRef}
                    collapsable={false}
                    onPress={() => setShowDiamondInfo(true)}
                    activeOpacity={0.8}
                    style={hdrS.iconBtn}
                  >
                    <Animated.View
                      style={{ transform: [{ translateY: diamondShakeAnim }] }}
                    >
                      <ExpoImage
                        source={require("../../../assets/img/diamond.png")}
                        style={{ width: ICON_SIZE, height: ICON_SIZE }}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    </Animated.View>
                    <View
                      style={[
                        hdrS.badge,
                        {
                          backgroundColor: "#FF3B30",
                          minWidth: BADGE_SIZE,
                          height: BADGE_SIZE,
                          borderRadius: BADGE_SIZE / 2,
                        },
                      ]}
                    >
                      <Text style={[hdrS.badgeText, { fontSize: BADGE_FONT }]}>
                        {formatNumber(currentProfile?.diamonds ?? 0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    ref={coinIconRef}
                    collapsable={false}
                    onPress={() => setShowCoinInfo(true)}
                    activeOpacity={0.8}
                    style={hdrS.iconBtn}
                  >
                    <Animated.View
                      style={{ transform: [{ translateY: coinShakeAnim }] }}
                    >
                      <ExpoImage
                        source={require("../../../assets/img/coin.png")}
                        style={{ width: ICON_SIZE, height: ICON_SIZE }}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    </Animated.View>
                    <View
                      style={[
                        hdrS.badge,
                        {
                          backgroundColor: "#FFD700",
                          minWidth: BADGE_SIZE,
                          height: BADGE_SIZE,
                          borderRadius: BADGE_SIZE / 2,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          hdrS.badgeText,
                          { fontSize: BADGE_FONT, color: "#1a1a00" },
                        ]}
                      >
                        {formatNumber(currentProfile?.coins ?? 0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
              {/* ════════════════════════════════════════════════════════════ */}

              {/* ── MAIN CONTENT ── */}
              {/* The tracker card pulls up with negative margin so its top
                  border sits slightly under the level badge */}
              <View style={{ marginTop: -TRACKER_OVERLAP }}>
                <AccessModeBanner
                  levelContext={loadedLevelContext}
                  currentPlayLevel={currentProfile.playLevel ?? 1}
                  onSwitchToCurrent={handleSwitchToCurrent}
                />

                {showSubscriptionExpired ? (
                  <SubscriptionExpiredScreen
                    subscription={subscription}
                    onViewPlans={() =>
                      router.push("/components/billing/SubscriptionPlansScreen")
                    }
                  />
                ) : isViewOnly ? (
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
                    {/* ── LEVEL GOAL TRACKER ── */}
                    {isPlayMode &&
                      !showSubscriptionExpired &&
                      gamification?.levelGames?.length > 0 && (
                        <LevelGoalTracker
                          levelGames={gamification.levelGames}
                          completedStoryCount={completedStoryCount}
                          totalStories={books.length || 8}
                        />
                      )}

                    {/* ── RECOMMENDED STORY — full card clickable, no start button ── */}
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
                      <Text style={styles.sectionTagline}>
                        Read stories to earn rewards
                      </Text>
                    </View>

                    {/* 2-column vertical grid */}
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
                      const cards = books.map((item, index) => {
                        const sid = String(item.id);
                        const isCompleted = isPlayMode && completedIds.has(sid);
                        const progressIdx = getProgressIdx(item);
                        const resuming =
                          isPlayMode &&
                          !isCompleted &&
                          progressIdx > 0 &&
                          progressIdx < 4;
                        const storyAccessible = isStoryAccessible(
                          index,
                          loadedLevelContext,
                        );
                        return (
                          <View
                            key={item.id}
                            collapsable={false}
                            style={styles.gridCell}
                          >
                            <StoryCard
                              title={item.title}
                              image={{ uri: item.cover }}
                              bookId={item.id}
                              index={index}
                              topLeftType={undefined}
                              isCompleted={isCompleted}
                              resuming={resuming}
                              resumeAtIndex={resuming ? progressIdx : 0}
                              isLocked={!storyAccessible}
                              accessMode={loadedLevelContext.mode}
                              onPress={() => handleStoryPress(item, index)}
                            />
                          </View>
                        );
                      });
                      // Pair into rows of 2
                      const rows = [];
                      for (let i = 0; i < cards.length; i += 2) {
                        rows.push(
                          <View key={i} style={styles.gridRow}>
                            {cards[i]}
                            {cards[i + 1] ?? <View style={styles.gridCell} />}
                          </View>,
                        );
                      }
                      return <View style={styles.gridContainer}>{rows}</View>;
                    })()}
                  </>
                )}

                {!showSubscriptionExpired && !isViewOnly && (
                  <HomeVocabularySection
                    playLevel={currentProfile.playLevel ?? 1}
                  />
                )}

                {/*
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Games</Text>
                  <Text style={styles.sectionTagline}>
                    Learn while you play
                  </Text>
                </View>
                <GamesSection />
                */}
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
        scratchSlot={finishData.scratchSlot}
        diamonds={(currentProfile?.diamonds ?? 0) + DIAMONDS_PER_FINISH}
        onConfirmUnlock={async (gameId) => {
          await disburseRewards();
          const storyId = String(
            finishData.storyId ?? pendingSessionRef.current?.storyId ?? "",
          );
          if (storyId && !storyCompletedRef.current) {
            storyCompletedRef.current = true;
            await gamification.onStoryComplete(storyId, loadedLevel);
          }
          await gamification.confirmUnlock(gameId);
        }}
        onPlayGame={(gameId) => gamification.startPlay(gameId)}
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
      <DiamondInfoModal
        visible={showDiamondInfo}
        onClose={() => setShowDiamondInfo(false)}
        diamonds={currentProfile?.diamonds ?? 0}
      />
      <CoinInfoModal
        visible={showCoinInfo}
        onClose={() => setShowCoinInfo(false)}
        coins={currentProfile?.coins ?? 0}
      />

      {/* ── Gamification modals — rendered here so they work even when
          GamesSection is hidden or removed from the screen ── */}
      <UnlockModal />
      <CoinPromptModal />
      <LockedGameModal
        visible={!!gamification?.lockedModal}
        storiesCompleted={gamification?.lockedModal?.storiesCompleted ?? 0}
        onClose={() => gamification?.setLockedModal(null)}
        onGoRead={() => gamification?.setLockedModal(null)}
      />
    </>
  );
};

const Home = () => {
  const { currentProfile, updateProfile } = useUser();
  if (!currentProfile) return null;
  return (
    <GamificationProvider
      profileId={currentProfile.id}
      diamonds={currentProfile.diamonds ?? 0}
      coins={currentProfile.coins ?? 0}
      onUpdateDiamonds={(n) =>
        updateProfile({ ...currentProfile, diamonds: n })
      }
      onUpdateCoins={(n) => updateProfile({ ...currentProfile, coins: n })}
    >
      <HomeContent />
    </GamificationProvider>
  );
};
export default Home;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const BG_CIRCLE1_SIZE = isTablet ? 500 : 350;
const BG_CIRCLE2_SIZE = isTablet ? 300 : 200;
const BG_CIRCLE3_SIZE = isTablet ? 220 : 150;

const hdrS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start", // TOP-align so icons start from same Y as badge
    justifyContent: "space-between",
    paddingHorizontal: isTablet ? 20 : 14,
    paddingTop: isTablet ? 14 : 10,
    paddingBottom: isTablet ? 10 : 8,
  },
  group: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    // space-between pushes the two icons to the edges of each group.
    // Left group edges: screen-left (profile) ↔ badge-left (wordbag) → midpoint.
    // Right group edges: badge-right (diamond) ↔ screen-right (coins) → midpoint.
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 1000,
  },
  iconBtn: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    elevation: 6,
  },
  badgeText: { fontFamily: FONTS.bold, color: "#fff" },
});

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: DARK_BG },
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
  safeTop: { flex: 1 },
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
  // 2-column story grid
  gridContainer: { paddingHorizontal: 10, paddingBottom: 8 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  gridCell: { flex: 1 },
});
