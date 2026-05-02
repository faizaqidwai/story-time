// app/components/Levels.jsx  (updated — now a level selector)
//
// Changes from original:
//   1. Reads levelMap from LevelAccessContext → shows correct visual state per level.
//   2. Tapping a level calls switchLevel() then navigates back to home.
//   3. Visual states driven by mode/accessScope: current, preview, readonly, locked.
//   4. Legend row explains the visual states.
//   5. Header pill shows both "Playing" and "Viewing" levels when different.
//
// Unchanged: slide animation, grid layout, badge geometry, fonts.

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
import { Image as ExpoImage } from "expo-image";
import { useUser } from "../../_contexts/UserContext";
import { useLevelAccess } from "../../_contexts/LevelAccessContext";
import { FONTS } from "../../theme";
import { font, pad, radius, size } from "../../theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";
const DARK_BG = "#08081a";
const TOTAL_LEVELS = 20;
const COLS = 3;
const BADGE_SIZE = Math.floor((SW - 48) / COLS);
const RING = Math.floor(BADGE_SIZE * 0.78);
const INNER = Math.floor(RING * 0.82);

// ── Map levelMap entry → visual state string ──────────────────────────────────
function getVisualState(level, currentPlayLevel, levelMap) {
  const entry = levelMap[level];
  if (!entry || entry.mode === "VIEW_ONLY") return "locked";
  if (level === currentPlayLevel && entry.mode === "PLAY") return "current";
  if (entry.mode === "PLAY" && entry.accessScope === "PARTIAL")
    return "preview";
  if (entry.mode === "READ_ONLY") return "readonly";
  if (entry.mode === "PLAY") return "unlocked";
  return "locked";
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL BADGE
// ─────────────────────────────────────────────────────────────────────────────
function LevelBadgeGrid({ level, isCurrent, isLoaded, visualState, onPress }) {
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

  const isLocked = visualState === "locked";
  const isPreview = visualState === "preview";
  const isReadOnly = visualState === "readonly";
  const isUnlocked = !isLocked;

  const ringColor = isCurrent
    ? "rgba(0,188,212,0.55)"
    : isLoaded && !isCurrent
      ? "rgba(255,213,79,0.45)"
      : isUnlocked
        ? "rgba(0,188,212,0.28)"
        : "rgba(255,255,255,0.06)";

  const innerBg = isLocked ? "#0a0b18" : "#10122a";
  const labelColor = isLocked ? "rgba(0,188,212,0.25)" : TEAL;
  const numberColor = isLocked ? "rgba(224,247,250,0.18)" : "#E0F7FA";
  const lightShade = isLocked
    ? "rgba(255,255,255,0.02)"
    : "rgba(255,255,255,0.055)";

  return (
    <Animated.View
      style={[
        gridS.cell,
        { opacity: opAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={isLocked ? 1 : 0.75}
        disabled={isLocked}
        style={gridS.touchable}
      >
        {isCurrent && <View style={gridS.currentOutline} />}
        {isLoaded && !isCurrent && <View style={gridS.loadedOutline} />}

        <View style={[gridS.ring, { borderColor: ringColor }]}>
          <View style={[gridS.inner, { backgroundColor: innerBg }]}>
            <View style={[gridS.diagHalf, { backgroundColor: lightShade }]} />
            <Text style={[gridS.label, { color: labelColor }]}>LEVEL</Text>
            <Text style={[gridS.number, { color: numberColor }]}>{level}</Text>
            {isLocked && (
              // <Text style={gridS.lockIcon}>🔒</Text>
              <ExpoImage
                source={require("../../../assets/img/lock.png")}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            )}
            {isLocked && <View style={gridS.lockedOverlay} />}
          </View>
        </View>

        {isPreview && (
          <View
            style={[
              gridS.modePill,
              { borderColor: YELLOW + "66", backgroundColor: YELLOW + "22" },
            ]}
          >
            <Text style={[gridS.modePillText, { color: YELLOW }]}>PREVIEW</Text>
          </View>
        )}
        {isCurrent && (
          <View
            style={[
              gridS.modePill,
              { borderColor: "#4DD0E166" + "66", backgroundColor: "#4DD0E122" },
            ]}
          >
            <Text style={[gridS.modePillText, { color: "#4DD0E1" }]}>
              CURRENT
            </Text>
          </View>
        )}
        {isReadOnly && (
          <View
            style={[
              gridS.modePill,
              { borderColor: YELLOW, backgroundColor: YELLOW + "22" },
            ]}
          >
            <Text style={[gridS.modePillText, { color: YELLOW }]}>READ</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const gridS = StyleSheet.create({
  cell: {
    width: BADGE_SIZE,
    height: BADGE_SIZE + 20,
    alignItems: "center",
    justifyContent: "center",
  },
  touchable: { alignItems: "center" },
  currentOutline: {
    position: "absolute",
    width: RING + 22,
    height: RING + pad.xxl,
    borderRadius: radius.md, // 14 → radius.md (14/19)
    borderWidth: 2,
    borderColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  loadedOutline: {
    position: "absolute",
    width: RING + 22,
    height: RING + 28,
    borderRadius: radius.md, // 14 → radius.md (14/19)
    borderWidth: 2,
    borderColor: YELLOW,
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
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
    marginTop: pad.s, // 8 → pad.s (8/11)
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
  label: {
    fontFamily: FONTS.bold,
    fontSize: font.xs, // 7 → font.xs (9/12) — closest small token
    letterSpacing: 1.5,
    marginBottom: 1,
    opacity: 0.9,
  },
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
    fontSize: font.md, // 15 → font.md (15/19)
    bottom: pad.xs, // 5 → pad.xs (4/6)
    right: pad.xs, // 5 → pad.xs
    zIndex: 2,
  },
  lockedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20,22,35,0.55)",
    zIndex: 1,
  },
  modePill: {
    marginTop: RING + pad.sm,

    borderRadius: radius.xs, // 6 → radius.xs (6/8)
    borderWidth: 1,
    paddingHorizontal: pad.xs, // 6 → pad.xs (4/6)
    paddingVertical: 2,
    position: "absolute",
  },
  modePillText: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    letterSpacing: 0.5,
  }, // 8 → font.xs (9/12)
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGEND
// ─────────────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <View style={legS.row}>
      {[
        { color: TEAL, label: "Your Level" },
        { color: YELLOW, label: "Viewing" },
        { color: "#4DD0E1", label: "Read Only" },
        { color: "rgba(255,255,255,0.2)", label: "Locked" },
      ].map((item) => (
        <View key={item.label} style={legS.item}>
          <View style={[legS.dot, { backgroundColor: item.color }]} />
          <Text style={legS.text}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
const legS = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: pad.sm, // 12 → pad.sm (12/16)
    paddingHorizontal: pad.md, // 16 → pad.md (16/22)
    paddingVertical: pad.s, // 8 → pad.s (8/11)
  },
  item: { flexDirection: "row", alignItems: "center", gap: pad.xs }, // gap 5 → pad.xs (4/6)
  dot: { width: pad.s, height: pad.s, borderRadius: pad.xs }, // 8/8/4 → pad.s/pad.s/pad.xs
  text: {
    fontFamily: FONTS.light,
    fontSize: font.xs, // 10 → font.xs (9/12)
    color: "rgba(255,255,255,0.5)",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const LevelsScreen = () => {
  const router = useRouter();
  const { currentProfile } = useUser();
  const { loadedLevel, switchLevel, levelMap } = useLevelAccess();
  const currentPlayLevel = currentProfile?.playLevel ?? 1;

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

  const handleLevelPress = (lvl) => {
    switchLevel(lvl);
    handleClose();
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
              {loadedLevel !== currentPlayLevel
                ? `Playing ${currentPlayLevel}  ·  Viewing ${loadedLevel}`
                : `Current: Level ${currentPlayLevel}`}
            </Text>
          </View>
        </View>
        <View style={screenS.headerRight} />
      </View>

      <View style={screenS.handle} />
      <Legend />

      {/* Grid */}
      <ScrollView
        contentContainerStyle={screenS.grid}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((lvl) => (
          <LevelBadgeGrid
            key={lvl}
            level={lvl}
            isCurrent={lvl === currentPlayLevel}
            isLoaded={lvl === loadedLevel}
            visualState={getVisualState(lvl, currentPlayLevel, levelMap)}
            onPress={() => handleLevelPress(lvl)}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const screenS = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BG },
  glow: { position: "absolute", borderRadius: radius.pill, opacity: 0.1 },
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
    paddingTop: STATUS_BAR_HEIGHT + pad.xs, // +6 → +pad.xs (4/6)
    paddingHorizontal: pad.lg, // 20 → pad.lg (20/28)
    paddingBottom: pad.sm, // 12 → pad.sm (12/16)
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  headerRight: { width: size.hitMd }, // 40 → size.hitMd (40/52)
  headerCenter: { alignItems: "center", gap: pad.xs }, // gap 5 → pad.xs (4/6)
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl, // 22 → font.xxl (24/32)
    color: "#E0F7FA",
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  currentPill: {
    backgroundColor: "rgba(0,188,212,0.12)",
    borderRadius: radius.sm, // 10 → radius.sm (10/14)
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    paddingHorizontal: pad.s, // 10 → pad.s (8/11)
    paddingVertical: pad.xs, // 3 → pad.xs (4/6)
  },
  currentPillText: {
    fontFamily: FONTS.bold,
    fontSize: font.s, // 11 → font.s (12/14)
    color: TEAL,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: size.hitMd, // 40 → size.hitMd (40/52)
    height: size.hitMd,
    borderRadius: size.hitMd / 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontFamily: FONTS.regular,
    fontSize: font.md, // 14 → font.md (15/19)
    color: "rgba(176,190,197,0.8)",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.xs, // 2 → radius.xs (6/8)
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: pad.s, // 10 → pad.s (8/11)
    marginBottom: pad.xs, // 4 → pad.xs (4/6)
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: pad.sm, // 12 → pad.sm (12/16)
    paddingTop: pad.s, // 10 → pad.s (8/11)
    paddingBottom: pad.xxxl, // 40 → pad.xxxl (48/66)
  },
});

export default LevelsScreen;
