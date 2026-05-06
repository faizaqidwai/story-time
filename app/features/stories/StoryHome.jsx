// app/book/[id]/index.jsx  — Story Home Screen

import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import {
  useStoryActivity,
  ACTIVITY_ROUTES,
} from "../../_contexts/StoryActivityContext";
import { FONTS } from "../../theme";
import { font, pad, radius, size } from "../../theme/tokens";

const { height: SH, width: SW } = Dimensions.get("window");
const isTablet = SW >= 768;

const IMAGE_HEIGHT = isTablet
  ? Math.min(SH * 0.38, 360)
  : Math.min(SH * 0.3, 240);

// ── Grid card dimensions ─────────────────────────────────────────────────────
const H_PAD = pad.md; // horizontal padding each side
const GRID_GAP = isTablet ? 16 : 12; // gap between cards
const CARD_W = (SW - H_PAD * 2 - GRID_GAP) / 2; // square
const CARD_H = CARD_W;

// ── Color palette — one vibrant color per activity ───────────────────────────
const ACTIVITY_COLORS = {
  0: { base: "#00BCD4", dark: "#00838F", glow: "rgba(0,188,212,0.5)" }, // Read    teal
  1: { base: "#9C27B0", dark: "#6A0080", glow: "rgba(156,39,176,0.5)" }, // Guess   purple
  2: { base: "#FF9800", dark: "#E65100", glow: "rgba(255,152,0,0.5)" }, // Listen  orange
  3: { base: "#E91E63", dark: "#880E4F", glow: "rgba(233,30,99,0.5)" }, // Describe pink
};

const C = {
  bg: "#08081a",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const ACTIVITIES = [
  {
    index: 0,
    title: "Read the Story",
    subtitle: "Learn while you read",
    image: require("../../../assets/img/read_icon.png"),
  },
  {
    index: 1,
    title: "Guess the Word",
    subtitle: "Word Challenge",
    image: require("../../../assets/img/guess_icon.png"),
  },
  {
    index: 2,
    title: "Listen Quest!",
    subtitle: "Listen. Think. Choose.",
    image: require("../../../assets/img/listen_icon.png"),
  },
  {
    index: 3,
    title: "Spot the Truth",
    subtitle: "Choose what's true.",
    image: require("../../../assets/img/describe_icon.png"),
  },
];

function getActivityStatus(activityIndex, nextActivityIndex) {
  if (nextActivityIndex >= 4) return "done";
  if (activityIndex < nextActivityIndex) return "done";
  if (activityIndex === nextActivityIndex) return "current";
  return "locked";
}

// ─────────────────────────────────────────────────────────────────────────────
// SQUARE ACTIVITY CARD — GameCard-inspired square design
// ─────────────────────────────────────────────────────────────────────────────
function ActivityCard({ activity, status, isEnabled, onPress, delay }) {
  const colors = ACTIVITY_COLORS[activity.index];
  const isDone = status === "done";
  const isCurrent = status === "current";
  const isLocked = status === "locked";

  // Entrance — fires once only, tracked by ref
  const scaleIn = useRef(new Animated.Value(0.82)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const entranceFired = useRef(false);

  // Press scale
  const pressScale = useRef(new Animated.Value(1)).current;
  // Full card scale pulse
  const cardScale = useRef(new Animated.Value(1)).current;
  // Badge pulse
  const badgePulse = useRef(new Animated.Value(1)).current;
  // Card glow overlay
  const cardGlow = useRef(new Animated.Value(0.85)).current;
  // Checkmark — initialise to 1 if already done so tick shows immediately
  const checkScale = useRef(new Animated.Value(isDone ? 1 : 0)).current;

  // Refs to active loops so we can stop them when status changes
  const activeLoops = useRef([]);
  const stopLoops = useCallback(() => {
    activeLoops.current.forEach((l) => l.stop());
    activeLoops.current = [];
  }, []);

  // ── Entrance: once only ──────────────────────────────────────────────────
  useEffect(() => {
    if (entranceFired.current) return;
    entranceFired.current = true;
    Animated.parallel([
      Animated.spring(scaleIn, {
        toValue: 1,
        friction: 6,
        tension: 55,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 280,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status-driven animations — re-runs whenever status prop changes ──────
  // KEY FIX: deps = [status] so when user completes an activity and navigates
  // back, the previously-pulsing "current" card correctly stops pulsing and
  // shows its tick, and the newly-unlocked card starts pulsing.
  useEffect(() => {
    stopLoops();
    // Reset to neutral
    cardScale.setValue(1);
    badgePulse.setValue(1);
    cardGlow.setValue(0.85);

    if (isDone) {
      // Pop the checkmark whether done at mount or just became done
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      checkScale.setValue(0);
    }

    if (isCurrent) {
      const badgeLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1.25,
            duration: 550,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(badgePulse, {
            toValue: 1.0,
            duration: 550,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      const cardScaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(cardScale, {
            toValue: 1.03,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(cardScale, {
            toValue: 1.0,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(cardGlow, {
            toValue: 1.0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(cardGlow, {
            toValue: 0.85,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      badgeLoop.start();
      cardScaleLoop.start();
      glowLoop.start();
      activeLoops.current = [badgeLoop, cardScaleLoop, glowLoop];
    }

    return () => stopLoops();
  }, [status]); // ← status in deps = animations update when activity completes

  const onPressIn = () => {
    if (!isEnabled) return;
    Animated.spring(pressScale, {
      toValue: 0.94,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const cardOpacity = isLocked ? 0.52 : 1.0;

  return (
    <Animated.View
      style={{
        opacity: fadeIn,
        transform: [
          {
            scale: Animated.multiply(
              Animated.multiply(scaleIn, pressScale),
              cardScale,
            ),
          },
        ],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!isEnabled}
        activeOpacity={1}
        style={[card.wrap, { opacity: cardOpacity }]}
      >
        {/* ── Solid background ── */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.dark },
          ]}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.base, height: "50%", opacity: 0.92 },
          ]}
        />

        {/* ── Slow glow overlay (active card only) ── */}
        {isCurrent && (
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: "rgba(255,255,255,0.07)",
                opacity: cardGlow,
              },
            ]}
          />
        )}

        {/* ── Decorative circles ── */}
        <View style={[card.circle1, { opacity: 0.12 }]} />
        <View style={[card.circle2, { opacity: 0.09 }]} />
        <View style={[card.circle3, { opacity: 0.06 }]} />

        {/* ── Top-LEFT number badge ── */}
        <View style={[card.numBadge, { backgroundColor: "rgba(0,0,0,0.30)" }]}>
          <Text style={card.numText}>{activity.index + 1}</Text>
        </View>

        {/* ── Top-RIGHT status badge: lock / done / play ── */}
        <View style={[card.badgeWrap, { backgroundColor: "rgba(0,0,0,0.28)" }]}>
          {isLocked ? (
            <Ionicons
              name="lock-closed"
              size={isTablet ? 16 : 13}
              color="rgba(255,255,255,0.7)"
            />
          ) : isDone ? (
            // Always render the Animated.View — checkScale springs from 0→1
            // whether isDone was true at mount OR becomes true after status change
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Ionicons
                name="checkmark"
                size={isTablet ? 16 : 14}
                color="#fff"
              />
            </Animated.View>
          ) : (
            <Animated.View style={{ transform: [{ scale: badgePulse }] }}>
              <Ionicons name="play" size={isTablet ? 14 : 12} color="#fff" />
            </Animated.View>
          )}
        </View>

        {/* ── Activity icon ── */}
        <View style={card.iconWrap}>
          <ExpoImage
            source={activity.image}
            style={[card.icon, { opacity: isLocked ? 0.45 : 1 }]}
            contentFit="contain"
          />
        </View>

        {/* ── Bottom overlay — taller, centered ── */}
        <View style={card.bottomOverlay}>
          <Text style={card.title} numberOfLines={1}>
            {activity.title}
          </Text>
          <Text style={card.subtitle} numberOfLines={1}>
            {activity.subtitle}
          </Text>

          {/* Status pill */}
          <View
            style={[
              card.pill,
              {
                backgroundColor: isDone
                  ? "rgba(76,200,100,0.25)"
                  : isCurrent
                    ? "rgba(255,255,255,0.28)"
                    : "rgba(0,0,0,0.22)",
                borderColor: isDone
                  ? "rgba(76,200,100,0.65)"
                  : isCurrent
                    ? "rgba(255,255,255,0.65)"
                    : "rgba(255,255,255,0.12)",
              },
            ]}
          >
            {isDone ? (
              <Text style={[card.pillText, { color: "#69F0AE" }]}>✓ Done</Text>
            ) : isCurrent ? (
              <View style={card.pillRow}>
                <ExpoImage
                  source={require("../../../assets/img/play-icon-2.png")}
                  style={card.pillIcon}
                  contentFit="contain"
                />
                <Text style={[card.pillText, { color: "#fff" }]}>Start</Text>
              </View>
            ) : (
              <View style={card.pillRow}>
                <ExpoImage
                  source={require("../../../assets/img/lock.png")}
                  style={card.pillIcon}
                  contentFit="contain"
                />
                <Text
                  style={[card.pillText, { color: "rgba(255,255,255,0.4)" }]}
                >
                  Locked
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Accent bar ── */}
        <View style={[card.accentBar, { backgroundColor: colors.base }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const ICON_SIZE = isTablet ? 84 : 68;
// Bottom overlay height — taller to fit title + subtitle + pill
const BOTTOM_H = isTablet ? 112 : 94;

const card = StyleSheet.create({
  wrap: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.xl,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  circle1: {
    position: "absolute",
    backgroundColor: "#fff",
    width: CARD_W * 1.0,
    height: CARD_W * 1.0,
    borderRadius: CARD_W * 0.5,
    top: -CARD_W * 0.45,
    right: -CARD_W * 0.35,
  },
  circle2: {
    position: "absolute",
    backgroundColor: "#fff",
    width: CARD_W * 0.55,
    height: CARD_W * 0.55,
    borderRadius: CARD_W * 0.275,
    bottom: CARD_H * 0.18,
    left: -CARD_W * 0.18,
  },
  circle3: {
    position: "absolute",
    backgroundColor: "#fff",
    width: CARD_W * 0.35,
    height: CARD_W * 0.35,
    borderRadius: CARD_W * 0.175,
    bottom: -CARD_W * 0.1,
    right: CARD_W * 0.15,
  },
  // Top-left number badge
  numBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: isTablet ? 34 : 28,
    height: isTablet ? 34 : 28,
    borderRadius: isTablet ? 17 : 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  numText: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.lg : font.md,
    color: "rgba(255,255,255,0.9)",
    lineHeight: isTablet ? font.lg * 1.1 : font.md * 1.1,
  },
  // Top-right status badge
  badgeWrap: {
    position: "absolute",
    top: 10,
    right: 10,
    width: isTablet ? 34 : 28,
    height: isTablet ? 34 : 28,
    borderRadius: isTablet ? 17 : 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  iconWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // Icon sits in the top portion above the bottom overlay
    bottom: BOTTOM_H,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  // Bottom overlay — semi-dark, centered content
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_H,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: isTablet ? 10 : 8,
    paddingVertical: isTablet ? 10 : 8,
    gap: isTablet ? 5 : 3,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.xl : font.lg,
    color: "#fff",
    letterSpacing: 0.15,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: isTablet ? font.md : font.sm,
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
    letterSpacing: 0.1,
  },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: isTablet ? 12 : 20,
    paddingVertical: isTablet ? 4 : 10,
    marginTop: isTablet ? 2 : 1,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 6 : 5,
  },
  pillIcon: {
    width: isTablet ? 18 : 15,
    height: isTablet ? 18 : 15,
  },
  pillText: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.md : font.md,
    letterSpacing: 0.3,
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.8,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN — all logic unchanged from original
// ─────────────────────────────────────────────────────────────────────────────
export default function StoryHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentStory, storySession } = useStoryActivity();
  const headerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log("[StoryHome LIFECYCLE] StoryHome MOUNTED");
    return () => console.log("[StoryHome LIFECYCLE] StoryHome UNMOUNTED");
  }, []);

  useEffect(() => {
    Animated.timing(headerOp, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, []);

  // Prefetch pages 3+ (unchanged)
  useEffect(() => {
    if (!currentStory?.pages?.length) return;
    const remainingPageImages = currentStory.pages
      .slice(2)
      .filter((p) => typeof p.image === "string" && p.image.length > 0)
      .map((p) => p.image);
    if (remainingPageImages.length === 0) return;
    Promise.allSettled(
      remainingPageImages.map((uri) => ExpoImage.prefetch(uri)),
    );
  }, [currentStory?.id]);

  if (!currentStory) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[screen.center, { paddingTop: insets.top }]}>
          <Text style={{ color: C.textMuted, fontSize: font.md }}>
            Story not available. Please go back.
          </Text>
          <TouchableOpacity
            style={screen.fallbackBtn}
            onPress={() => router.back()}
          >
            <Text style={screen.fallbackBtnText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ── LOGIC UNCHANGED ──────────────────────────────────────────────────────────
  const nextActivityIndex = storySession?.nextActivityIndex ?? 0;
  const isReadOnly = storySession?.isReadOnly;

  const isActivityEnabled = (idx) => {
    if (idx === 0) return true;
    if (nextActivityIndex >= 4) return false;
    if (isReadOnly) return false;
    return idx === nextActivityIndex;
  };

  const handleActivityPress = (idx) => {
    const story = currentStory;
    if (idx === 0) {
      const alreadyRead = nextActivityIndex > 0;
      router.push({
        pathname: `/features/stories/book/${story.id}/read`,
        params: { title: story.title, ...(alreadyRead ? { replay: "1" } : {}) },
      });
    } else {
      const route = ACTIVITY_ROUTES[idx];
      if (route) {
        router.push({
          pathname: `/features/stories/activities/${route}`,
          params: {
            storyId: story.id,
            title: story.title,
            resuming: nextActivityIndex > idx ? "1" : "0",
          },
        });
      }
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  const headerPaddingTop = Math.max(insets.top, 8);

  // Split into 2 rows of 2
  const row1 = ACTIVITIES.slice(0, 2);
  const row2 = ACTIVITIES.slice(2, 4);

  return (
    <View style={screen.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Custom Header (unchanged) ── */}
      <View style={[screen.customHeader, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={screen.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color="#00BCD4" />
        </TouchableOpacity>
        <Text style={screen.headerTitle} numberOfLines={1}>
          {currentStory.title}
        </Text>
        <View style={screen.headerSpacer} />
      </View>

      <ScrollView
        style={screen.scroll}
        contentContainerStyle={screen.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cover image (unchanged) ── */}
        <Animated.View
          style={[
            screen.imageContainer,
            { height: IMAGE_HEIGHT, opacity: headerOp },
          ]}
        >
          <ExpoImage
            source={{ uri: currentStory.cover }}
            style={screen.coverImage}
            contentFit="fill"
            cachePolicy="disk"
          />
          <View style={screen.textOverlay} pointerEvents="none">
            <Text style={screen.storyTitle} numberOfLines={2}>
              {currentStory.title}
            </Text>
          </View>
        </Animated.View>

        <Text style={screen.storyIntro} numberOfLines={3}>
          {currentStory.introduction}
        </Text>

        {/* ── Activities 2×2 grid ── */}
        <View style={screen.section}>
          <Text style={screen.sectionHeading}>Activities</Text>

          {/* Row 1 */}
          <View style={screen.gridRow}>
            {row1.map((activity, i) => (
              <ActivityCard
                key={activity.index}
                activity={activity}
                status={getActivityStatus(activity.index, nextActivityIndex)}
                isEnabled={isActivityEnabled(activity.index)}
                onPress={() => handleActivityPress(activity.index)}
                delay={i * 80}
              />
            ))}
          </View>

          {/* Row 2 */}
          <View style={screen.gridRow}>
            {row2.map((activity, i) => (
              <ActivityCard
                key={activity.index}
                activity={activity}
                status={getActivityStatus(activity.index, nextActivityIndex)}
                isEnabled={isActivityEnabled(activity.index)}
                onPress={() => handleActivityPress(activity.index)}
                delay={160 + i * 80}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN STYLES
// ─────────────────────────────────────────────────────────────────────────────
const screen = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: pad.sm,
    paddingBottom: pad.sm,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  backButton: {
    width: size.hitSm,
    height: size.hitSm,
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "#00BCD4",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginHorizontal: pad.s,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerSpacer: { width: size.hitSm, flexShrink: 0 },

  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: pad.md,
    padding: pad.xxl,
  },
  fallbackBtn: {
    backgroundColor: "rgba(0,188,212,0.13)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    paddingHorizontal: pad.lg,
    paddingVertical: pad.sm,
  },
  fallbackBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "#00BCD4",
  },

  imageContainer: { width: "100%", position: "relative", overflow: "hidden" },
  coverImage: { width: "100%", height: "100%" },
  textOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: pad.md,
    paddingBottom: pad.sm,
    paddingTop: pad.s,
    height: "22%",
    backgroundColor: "rgba(8,8,26,0.84)",
    justifyContent: "flex-end",
  },
  storyTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: "#E0F7FA",
    lineHeight: font.xl * 1.2,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    marginBottom: 3,
  },
  storyIntro: {
    paddingHorizontal: pad.md,
    paddingVertical: pad.sm,
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: "rgba(224,247,250,0.7)",
    lineHeight: font.sm * 1.3,
    fontStyle: "italic",
  },

  section: { paddingHorizontal: H_PAD, paddingTop: pad.md },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.textMuted,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: pad.md,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
});
