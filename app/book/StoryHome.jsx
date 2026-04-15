// app/book/[id]/index.jsx  — Story Home Screen

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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import {
  useStoryActivity,
  ACTIVITY_ROUTES,
} from "../_contexts/StoryActivityContext";
import AppBackground from "../components/AppBackground";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens";

const { height: SH, width: SW } = Dimensions.get("window");
const isTablet = SW >= 768;

const IMAGE_HEIGHT = isTablet
  ? Math.min(SH * 0.45, 420)
  : Math.min(SH * 0.35, 280);

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

function getActivityStatus(activityIndex, nextActivityIndex) {
  if (nextActivityIndex >= 4) return "done";
  if (activityIndex < nextActivityIndex) return "done";
  if (activityIndex === nextActivityIndex) return "current";
  return "locked";
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY CARD
// ─────────────────────────────────────────────────────────────────────────────
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
  const isInactive = isDone || status === "locked";

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
          {
            backgroundColor: isInactive ? C.lockedBg : C.tealDim,
            borderColor: isInactive ? C.lockedBorder : C.tealBorder,
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isEnabled}
        activeOpacity={1}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isInactive ? C.lockedIconBg : C.tealDim,
              borderColor: isInactive ? C.lockedIconBorder : C.tealBorder,
            },
          ]}
        >
          <Image
            source={activity.image}
            style={[styles.icon, { opacity: isInactive ? 0.25 : 1 }]}
            resizeMode="contain"
          />
        </View>

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

        <View style={styles.rightCol}>
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
              {isDone ? "Done" : isCurrent ? "Start" : "Locked"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function StoryHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentStory, storySession } = useStoryActivity();

  if (!currentStory) {
    return (
      <>
        {/* Hide the default navigator header */}
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={{ color: C.textMuted, fontSize: font.md }}>
            Story not available. Please go back.
          </Text>
          <TouchableOpacity
            style={styles.fallbackBtn}
            onPress={() => router.replace("/home")}
          >
            <Text style={styles.fallbackBtnText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

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
        pathname: `/book/${story.id}/read`,
        params: { title: story.title, ...(alreadyRead ? { replay: "1" } : {}) },
      });
    } else {
      const route = ACTIVITY_ROUTES[idx];
      if (route)
        router.push({
          pathname: `/components/${route}`,
          params: {
            storyId: story.id,
            title: story.title,
            resuming: nextActivityIndex > idx ? "1" : "0",
          },
        });
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

  // Top padding for the custom header — clears the status bar on both
  // iPhone (insets.top ≈ 44–59) and iPad (insets.top ≈ 24).
  const headerPaddingTop = Math.max(insets.top, 8);

  return (
    <View style={styles.root}>
      {/* Tell Expo Router to hide its default header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Custom Header ─────────────────────────────────────────────── */}
      <View style={[styles.customHeader, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={C.teal} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentStory.title}
        </Text>

        {/* Spacer keeps title centered */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            contentFit="fill"
            cachePolicy="disk"
          />

          <View style={styles.textOverlay} pointerEvents="none">
            <Text style={styles.storyTitle} numberOfLines={2}>
              {currentStory.title}
            </Text>
          </View>
        </Animated.View>

        <Text style={styles.storyIntro} numberOfLines={3}>
          {currentStory.introduction}
        </Text>

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
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Custom header ────────────────────────────────────────────────────────
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
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.teal,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginHorizontal: pad.s,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // Matches backButton width so title stays visually centered
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
    backgroundColor: C.tealDim,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.lg,
    paddingVertical: pad.sm,
  },
  fallbackBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.teal,
  },

  // Cover image
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
    height: "20%",
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
    paddingBottom: pad.sm,
    paddingTop: pad.sm,
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: "rgba(224,247,250,0.7)",
    lineHeight: font.sm * 1.3,
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Activities section
  section: { paddingHorizontal: pad.md, paddingTop: pad.lg },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.textMuted,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: pad.sm,
  },

  // Activity card
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: pad.sm,
    paddingHorizontal: pad.sm,
    marginBottom: pad.sm,
    gap: pad.sm,
    elevation: 2,
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },

  // Icon box
  iconBox: {
    width: size.avatarMd,
    height: size.avatarMd,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: {
    width: size.iconMd,
    height: size.iconMd,
  },

  // Text
  textCol: { flex: 1, gap: pad.xs / 2 },
  activityTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    letterSpacing: 0.15,
    lineHeight: font.lg * 1.15,
  },
  activitySubtitle: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    lineHeight: font.sm * 1.2,
  },

  // Right column
  rightCol: {
    width: isTablet ? 110 : 90,
    alignItems: "flex-end",
    gap: pad.s,
    flexShrink: 0,
  },

  // Status badge
  statusBadge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
    alignItems: "center",
    minWidth: 80,
  },
  statusText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    letterSpacing: 0.2,
  },
});
