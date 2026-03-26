// app/components/Levels.jsx
//
// Levels screen — shows all available levels as a grid of circular badges.
// The current level has a teal square outline.
// Transition animation (slide from top) is handled by _layout.jsx / the router.
// This component uses a plain View root — no manual translateY animation needed.

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
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "../_contexts/UserContext";
import { FONTS } from "../theme";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const TEAL = "#00BCD4";
const DARK_BG = "#08081a";
const TOTAL_LEVELS = 20;

// ── Always 3 columns — badges are larger and easier to read ─────────────────
const COLS = 3;
const BADGE_SIZE = Math.floor((SW - 48) / COLS);

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL BADGE (no progress bar, diagonal half-split highlight)
// ─────────────────────────────────────────────────────────────────────────────
function LevelBadgeGrid({ level, isCurrent, isUnlocked }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = ((level - 1) % (COLS * 2)) * 55;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 55,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opAnim, {
        toValue: 1,
        duration: 280,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const ringColor = isCurrent
    ? "rgba(0,188,212,0.35)"
    : isUnlocked
      ? "rgba(0,188,212,0.35)"
      : "rgba(255,255,255,0.06)";

  const innerBg = isUnlocked ? "#10122a" : "#0a0b18";
  const labelColor = isUnlocked ? TEAL : "rgba(0,188,212,0.3)";
  const numberColor = isUnlocked ? "#E0F7FA" : "rgba(224,247,250,0.2)";
  const lightShade = isUnlocked
    ? "rgba(255,255,255,0.055)"
    : "rgba(255,255,255,0.02)";

  return (
    <Animated.View
      style={[
        gridS.cell,
        { opacity: opAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {isCurrent && <View style={gridS.currentOutline} />}

      <View style={[gridS.ring, { borderColor: ringColor }]}>
        <View style={[gridS.inner, { backgroundColor: innerBg }]}>
          <View style={[gridS.diagHalf, { backgroundColor: lightShade }]} />
          <Text style={[gridS.label, { color: labelColor }]}>LEVEL</Text>
          <Text style={[gridS.number, { color: numberColor }]}>{level}</Text>
          {!isUnlocked && <Text style={gridS.lockIcon}>🔒</Text>}
          {/* Grey desaturation overlay for locked levels */}
          {!isUnlocked && <View style={gridS.lockedOverlay} />}
        </View>
      </View>
    </Animated.View>
  );
}

const RING = Math.floor(BADGE_SIZE * 0.78);
const INNER = Math.floor(RING * 0.82);

const gridS = StyleSheet.create({
  cell: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  currentOutline: {
    position: "absolute",
    width: RING + 22,
    height: RING + 22,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: "#0d0f22",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  inner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  diagHalf: {
    position: "absolute",
    width: INNER * 1.5,
    height: INNER * 1.5,
    top: -INNER * 0.75,
    left: -INNER * 0.75,
    borderBottomRightRadius: INNER * 0.6,
  },
  // "LEVEL" label — bold, small caps, spaced
  label: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 1,
    opacity: 0.9,
  },
  // Level number — bold, large, glowing
  number: {
    fontFamily: FONTS.bold,
    fontSize: Math.floor(INNER * 0.38),
    lineHeight: Math.floor(INNER * 0.4),
    textShadowColor: TEAL,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  lockIcon: {
    position: "absolute",
    fontSize: 15,
    bottom: 5,
    right: 5,
    zIndex: 2,
  },
  // Semi-transparent grey overlay that desaturates the locked badge
  lockedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20,22,35,0.55)",
    zIndex: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const LevelsScreen = () => {
  const router = useRouter();
  const { currentProfile } = useUser();
  const currentLevel = currentProfile?.playLevel ?? 1;

  // _layout uses animation:"none" for this screen so we own the transition.
  // Slide in from top on mount, slide back up on close.
  const slideY = useRef(new Animated.Value(-SH)).current;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      friction: 9,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideY, {
      toValue: -SH,
      duration: 300,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => router.back());
  };

  return (
    <Animated.View
      style={[screenS.root, { transform: [{ translateY: slideY }] }]}
    >
      <View style={[screenS.glow, screenS.glow1]} />
      <View style={[screenS.glow, screenS.glow2]} />

      {/* Header */}
      <View style={screenS.header}>
        <TouchableOpacity
          style={screenS.closeBtn}
          onPress={handleClose}
          activeOpacity={0.75}
        >
          <Text style={screenS.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={screenS.headerCenter}>
          <Text style={screenS.title}>Levels</Text>
          <View style={screenS.currentPill}>
            <Text style={screenS.currentPillText}>
              Current: Level {currentLevel}
            </Text>
          </View>
        </View>
        <View style={screenS.headerRight} />
      </View>

      <View style={screenS.handle} />

      {/* Grid */}
      <ScrollView
        contentContainerStyle={screenS.grid}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((lvl) => (
          <LevelBadgeGrid
            key={lvl}
            level={lvl}
            isCurrent={lvl === currentLevel}
            isUnlocked={lvl <= currentLevel}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const screenS = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  glow: { position: "absolute", borderRadius: 999, opacity: 0.1 },
  glow1: { width: 300, height: 300, backgroundColor: TEAL, top: 0, right: -60 },
  glow2: {
    width: 200,
    height: 200,
    backgroundColor: "#9652D9",
    bottom: 80,
    left: -40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + 6,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  headerRight: { width: 40 },
  headerCenter: { alignItems: "center", gap: 5 },
  // Screen title — bold, glowing
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: "#E0F7FA",
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  currentPill: {
    backgroundColor: "rgba(0,188,212,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  // "Current: Level N" pill text — bold, teal
  currentPillText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: TEAL,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Close ✕ — regular, muted
  closeIcon: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(176,190,197,0.8)",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
  },
});

export default LevelsScreen;
