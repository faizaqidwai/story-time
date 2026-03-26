// app/book/[id].jsx  — Story Home Screen
//
// Shown after the user taps a story card on home.
// startStorySession() has already been called by home.jsx before navigation,
// so currentStory and storySession are already populated in context.
//
// Rules:
//  • First visit (nextActivityIndex === 0): only Read is enabled, rest locked
//  • In-progress (nextActivityIndex 1–3): Read + current activity enabled
//  • Completed (nextActivityIndex >= 4): Read enabled, rest shown as Done/disabled
//  • Read is ALWAYS tappable. When replaying after completion, replay=1 is
//    passed so BookReader skips calling completeActivity.

import React, { useRef, useEffect } from "react";
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
  Image,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import {
  useStoryActivity,
  ACTIVITY_ROUTES,
} from "../_contexts/StoryActivityContext";
import AppBackground from "../components/AppBackground";
import { FONTS } from "../theme";

const { height: SH } = Dimensions.get("window");

const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.13)",
  tealBorder: "rgba(0,188,212,0.35)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.22)",
  greenBorder: "rgba(76,175,80,0.55)",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
  lockedBg: "rgba(255,255,255,0.03)",
  lockedBorder: "rgba(255,255,255,0.07)",
  lockedText: "rgba(255,255,255,0.18)",
  lockedIconBg: "rgba(255,255,255,0.04)",
  lockedIconBorder: "rgba(255,255,255,0.08)",
};

// ── Activity definitions ───────────────────────────────────────────────────
const ACTIVITIES = [
  {
    index: 0,
    title: "Read the story",
    subtitle: "Learn while you read",
    label: "Read",
    image: require("../../assets/img/read_icon.png"),
  },
  {
    index: 1,
    title: "Guess the Word",
    subtitle: "Word Challenge",
    label: "Guess",
    image: require("../../assets/img/guess_icon.png"),
  },
  {
    index: 2,
    title: "Listen Quest!",
    subtitle: "Listen. Think. Choose.",
    label: "Listen",
    image: require("../../assets/img/listen_icon.png"),
  },
  {
    index: 3,
    title: "Spot the Truth",
    subtitle: "Choose what's true.",
    label: "Describe",
    image: require("../../assets/img/describe_icon.png"),
  },
];

// ── Status from session index ──────────────────────────────────────────────
function getActivityStatus(activityIndex, nextActivityIndex) {
  if (nextActivityIndex >= 4) return "done";
  if (activityIndex < nextActivityIndex) return "done";
  if (activityIndex === nextActivityIndex) return "current";
  return "locked";
}

// ── Single activity row ────────────────────────────────────────────────────
function ActivityCard({ activity, status, isEnabled, onPress, delay }) {
  const slideIn = useRef(new Animated.Value(36)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 360,
        delay,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    if (!isEnabled) return;
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const isDone = status === "done";
  const isCurrent = status === "current";
  const isLocked = status === "locked";

  const isInactive = isDone || isLocked;
  const cardBg = isInactive ? C.lockedBg : C.tealDim;
  const cardBorder = isInactive ? C.lockedBorder : C.tealBorder;
  const iconBg = isInactive ? C.lockedIconBg : C.tealDim;
  const iconBorder = isInactive ? C.lockedIconBorder : C.tealBorder;

  return (
    <Animated.View
      style={{
        opacity: fadeIn,
        transform: [{ translateY: slideIn }, { scale }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.activityCard,
          { backgroundColor: cardBg, borderColor: cardBorder },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isEnabled}
        activeOpacity={1}
      >
        {/* Icon box */}
        <View
          style={[
            styles.iconBox,
            { backgroundColor: iconBg, borderColor: iconBorder },
          ]}
        >
          <Image
            source={activity.image}
            style={[styles.icon, { opacity: isInactive ? 0.25 : 1 }]}
            resizeMode="contain"
          />
        </View>

        {/* Title + subtitle */}
        <View style={styles.textCol}>
          <Text
            style={[
              styles.activityTitle,
              { color: isInactive ? C.lockedText : C.textPri },
            ]}
            numberOfLines={1}
          >
            {activity.title}
          </Text>
          <Text
            style={[
              styles.activitySubtitle,
              { color: isInactive ? C.lockedText : C.textMuted },
            ]}
            numberOfLines={1}
          >
            {activity.subtitle}
          </Text>
        </View>

        {/* Right column — fixed width, always aligned */}
        <View style={styles.rightCol}>
          {/* Label — solid filled teal when active, dim when not */}
          {/* <View
            style={[
              styles.labelBadge,
              {
                backgroundColor: isInactive ? "rgba(255,255,255,0.05)" : C.teal,
                borderColor: isInactive ? C.lockedIconBorder : C.teal,
              },
            ]}
          >
            <Text
              style={[
                styles.labelText,
                { color: isInactive ? C.lockedText : "#08081a" },
              ]}
            >
              {activity.label}
            </Text>
          </View> */}

          {/* Status — solid green for Done, solid teal for Start, dim for Locked */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isDone
                  ? C.greenDim
                  : isCurrent
                    ? C.teal
                    : "rgba(255,255,255,0.04)",
                borderColor: isDone
                  ? C.greenBorder
                  : isCurrent
                    ? C.teal
                    : C.lockedIconBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isDone
                    ? C.green
                    : isCurrent
                      ? "#08081a"
                      : C.lockedText,
                },
              ]}
            >
              {isDone ? "✓ Done" : isCurrent ? "▶ Start" : "Locked"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── MAIN SCREEN ────────────────────────────────────────────────────────────
export default function StoryHome() {
  const router = useRouter();
  const { currentStory, storySession } = useStoryActivity();

  if (!currentStory) {
    return (
      <View style={styles.center}>
        <Text style={{ color: C.textMuted, fontSize: 15 }}>
          Story not available. Please go back.
        </Text>
        <TouchableOpacity
          style={styles.fallbackBtn}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.fallbackBtnText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextActivityIndex = storySession?.nextActivityIndex ?? 0;

  const isActivityEnabled = (idx) => {
    if (idx === 0) return true;
    if (nextActivityIndex >= 4) return false;
    return idx === nextActivityIndex;
  };

  const handleActivityPress = (idx) => {
    const story = currentStory;
    if (idx === 0) {
      const alreadyRead = nextActivityIndex > 0;
      router.push({
        pathname: `/book/${story.id}/read`,
        params: { title: story.title, ...(alreadyRead ? { replay: "1" } : {}) },
      });
    } else {
      const route = ACTIVITY_ROUTES[idx];
      if (route) {
        router.push({
          pathname: `/components/${route}`,
          params: {
            storyId: story.id,
            title: story.title,
            resuming: nextActivityIndex > idx ? "1" : "0",
          },
        });
      }
    }
  };

  const headerOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOp, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, []);

  const IMAGE_HEIGHT = Math.min(SH * 0.38, 300);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button — floats over image */}
        {/* <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity> */}

        {/* Cover image */}
        <Animated.View
          style={[
            styles.imageContainer,
            { height: IMAGE_HEIGHT, opacity: headerOp },
          ]}
        >
          <ExpoImage
            source={{ uri: currentStory.cover }}
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="disk"
          />

          {/* Gradient only behind the text — not a full-image overlay */}
          <View style={styles.imageGradient} pointerEvents="none" />

          {/* Title + intro sit at very bottom of image */}
          <View style={styles.textOverlay} pointerEvents="none">
            <Text style={styles.storyTitle} numberOfLines={2}>
              {currentStory.title}
            </Text>
            <Text style={styles.storyIntro} numberOfLines={3}>
              {currentStory.introduction}
            </Text>
          </View>
        </Animated.View>

        {/* Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Activities</Text>
          {ACTIVITIES.map((activity, i) => (
            <ActivityCard
              key={activity.index}
              activity={activity}
              status={getActivityStatus(activity.index, nextActivityIndex)}
              isEnabled={isActivityEnabled(activity.index)}
              onPress={() => handleActivityPress(activity.index)}
              delay={i * 75}
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  fallbackBtn: {
    backgroundColor: C.tealDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  // "← Back to Home" fallback button text — bold, teal
  fallbackBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: C.teal,
  },

  // Back button
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(8,8,26,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontFamily: FONTS.light,
    fontSize: 28,
    color: C.textPri,
    marginTop: -2,
  },

  // Image
  imageContainer: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: "100%" },

  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "25%",
    backgroundColor: "rgba(8,8,26,0.84)",
  },
  textOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 8,
  },
  // Story title on cover — CoText-Bold replaces Noteworthy
  storyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: "#E0F7FA",
    lineHeight: 26,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    marginBottom: 3,
  },
  // Story intro on cover — light italic
  storyIntro: {
    fontFamily: FONTS.light,
    fontSize: 13,
    color: "rgba(224,247,250,0.7)",
    lineHeight: 16,
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Activities section
  section: { paddingHorizontal: 16, paddingTop: 22 },
  // "ACTIVITIES" section heading — bold, spaced caps
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  // Activity card
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: 13,
    marginBottom: 11,
    gap: 13,
    elevation: 2,
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },

  // Icon box
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { width: 36, height: 36 },

  // Text
  textCol: { flex: 1, gap: 3 },
  // Activity title — bold, primary colour when active
  activityTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    letterSpacing: 0.15,
    lineHeight: 18,
  },
  // Activity subtitle — light, muted when active
  activitySubtitle: {
    fontFamily: FONTS.light,
    fontSize: 13,
    lineHeight: 15,
  },

  // Right column
  rightCol: {
    width: 70,
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },

  // Label badge
  labelBadge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignItems: "center",
    minWidth: 52,
  },
  // Label text — bold, small caps
  labelText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Status badge
  statusBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: "center",
    minWidth: 80,
  },
  // Status text — bold ("▶ Start", "✓ Done", "Locked")
  statusText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
