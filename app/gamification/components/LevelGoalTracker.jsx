/**
 * LevelGoalTracker.jsx
 * app/gamification/components/LevelGoalTracker.jsx
 *
 * BRAND UPDATE — feature/brand-guidelines-v2
 * COLOUR-ONLY changes — zero functional/logic/animation changes:
 *
 *   ✅ Removed local TEAL/YELLOW/DARK constants — all from COLORS theme:
 *        TEAL   "#00BCD4" → COLORS.primary    (#00C4CC — §3.1 brand cyan)
 *        YELLOW "#FFD54F" → COLORS.amber      (#F5A623 — §3.1 brand amber)
 *        DARK   "#08081a" → COLORS.background (#0A1628 — §5.1 midnight navy)
 *   ✅ All rgba(0,188,212,…) — old cyan hex → rgba(0,196,204,…) correct cyan
 *        Same opacities preserved exactly: 0.04, 0.18, 0.5, 0.6, 0.75, 0.95
 *   ✅ All rgba(255,213,79,…) — old yellow hex → rgba(245,166,35,…) correct amber
 *        Same opacities preserved exactly: 0.2, 0.55, 0.6, 1.0
 *   ✅ "#FF7043" confetti dot → COLORS.coral (#E8445A — §3.1 brand coral)
 *   ✅ COLORS imported from theme
 *
 * KEPT EXACTLY (neutral values, not colour-specific):
 *   ✅ All rgba(255,255,255,…) — white neutral opacities unchanged
 *   ✅ rgba(8,8,26,0.45) — dark overlay on locked finish box
 *   ✅ rgba(0,0,0,0.35) — not present here but pattern confirmed
 *
 * UNTOUCHED (zero changes):
 *   ✅ All animation logic (useGlow, BoxConnector pulse, GlowCard pulse)
 *   ✅ All layout, sizing, padding, radius tokens
 *   ✅ All logic: slot0Achieved, slot1Achieved, conn1Active, conn1InProgress etc.
 *   ✅ All JSX structure — zero additions or removals
 *   ✅ All props interface unchanged
 *   ✅ GAME_STATUS import, MiniGameCard import, radius/isTablet tokens
 */

import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { radius, isTablet } from "../../theme/tokens";
import { COLORS } from "../../theme";
import { GAME_STATUS } from "../GamificationEngine";
import MiniGameCard, { TRACKER_CARD_SIZE } from "./MiniGameCard";

// ─── Glow pulse hook — UNCHANGED ─────────────────────────────────────────────
function useGlow(active) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  return anim;
}

// ─── Box connector — logic/animation UNCHANGED, colours corrected ─────────────
function BoxConnector({ active, inProgress }) {
  const glowAnim = useGlow(inProgress);

  const lineColor = active
    ? inProgress
      ? glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [
            "rgba(0,196,204,0.5)",    // ✅ was "rgba(0,188,212,0.5)"
            "rgba(0,196,204,0.95)",   // ✅ was "rgba(0,188,212,0.95)"
          ],
        })
      : "rgba(0,196,204,0.75)"        // ✅ was "rgba(0,188,212,0.75)"
    : "rgba(255,255,255,0.07)";       // keep — neutral dim

  const dotLeft = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["5%", "88%"],
  });

  return (
    <View style={connS.wrap}>
      <View style={connS.base} />
      <Animated.View style={[connS.glow, { backgroundColor: lineColor }]} />
      {inProgress && (
        <Animated.View
          style={[
            connS.dot,
            {
              left: dotLeft,
              shadowColor: COLORS.primary,     // ✅ was TEAL "#00BCD4"
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 4,
              elevation: 4,
            },
          ]}
        />
      )}
    </View>
  );
}

const connS = StyleSheet.create({
  wrap: {
    flex: 1,
    height: 20,
    justifyContent: "center",
    position: "relative",
    marginHorizontal: 6,
  },
  base: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.05)", // keep — neutral
    borderRadius: 1,
  },
  glow: { position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1 },
  dot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,           // ✅ was TEAL "#00BCD4"
    top: "50%",
    marginTop: -3.5,
  },
});

// ─── Level Finish Box — logic UNCHANGED, colours corrected ────────────────────
function LevelFinishBox({ allDone, active, inProgress, completedStoryCount }) {
  const glowAnim = useGlow(true);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      allDone
        ? "rgba(245,166,35,0.55)"    // ✅ was "rgba(255,213,79,0.55)"
        : active
          ? "rgba(245,166,35,0.2)"   // ✅ was "rgba(255,213,79,0.2)"
          : "rgba(255,255,255,0.07)",// keep — neutral locked
      allDone
        ? "rgba(245,166,35,1.0)"     // ✅ was "rgba(255,213,79,1.0)"
        : active
          ? "rgba(245,166,35,0.6)"   // ✅ was "rgba(255,213,79,0.6)"
          : "rgba(255,255,255,0.1)", // keep — neutral locked
    ],
  });
  const shadowOpacity = allDone
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] })
    : active
      ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.35] })
      : 0;

  const storiesBeyondGoals = active ? Math.max(0, completedStoryCount - 6) : 0;
  const star1Filled = storiesBeyondGoals >= 1;
  const star2Filled = storiesBeyondGoals >= 2;
  const starSize = isTablet ? 16 : 13;

  return (
    <View style={{ alignItems: "center", flexShrink: 0 }}>
      <Animated.View
        style={[
          finS.card,
          {
            borderColor,
            opacity: !active && !allDone ? 0.38 : 1,
            shadowColor: COLORS.amber,          // ✅ was YELLOW "#FFD54F"
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity,
            shadowRadius: 14,
            elevation: allDone ? 18 : active ? 8 : 1,
          },
        ]}
      >
        <ExpoImage
          source={require("../../../assets/img/level-finish.jpeg")}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {!active && !allDone && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(8,8,26,0.45)" }, // keep — dark overlay
            ]}
          />
        )}
        {allDone && (
          <>
            <View style={[finS.confetti, { top: 6,    left: 8,  backgroundColor: COLORS.primary }]} />
            <View style={[finS.confetti, { top: 10,   right: 9, backgroundColor: COLORS.coral   }]} />
            <View style={[finS.confetti, { bottom: 14, left: 9, backgroundColor: COLORS.amber   }]} />
            <View style={[finS.confetti, { bottom: 10, right: 7, backgroundColor: COLORS.primary }]} />
          </>
        )}
      </Animated.View>

      <View
        style={{
          flexDirection: "row",
          gap: 4,
          marginTop: 5,
          justifyContent: "center",
        }}
      >
        {[star1Filled, star2Filled].map((filled, i) => (
          <Text
            key={i}
            style={{
              fontSize: starSize,
              color: filled ? COLORS.amber : "rgba(255,255,255,0.2)", // ✅ was YELLOW
              ...(filled && {
                textShadowColor: COLORS.amber,                        // ✅ was YELLOW
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 4,
              }),
            }}
          >
            ★
          </Text>
        ))}
      </View>
    </View>
  );
}

const finS = StyleSheet.create({
  card: {
    width: TRACKER_CARD_SIZE,
    height: TRACKER_CARD_SIZE,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
    backgroundColor: COLORS.background,        // ✅ was DARK "#08081a"
  },
  confetti: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.8,
  },
});

// ─── GlowCard — animation UNCHANGED, colours corrected ───────────────────────
function GlowCard({ children, style }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(0,196,204,0.18)",   // ✅ was "rgba(0,188,212,0.18)"
      "rgba(0,196,204,0.6)",    // ✅ was "rgba(0,188,212,0.6)"
    ],
  });
  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.38],
  });

  return (
    <Animated.View
      style={[
        gcS.card,
        style,
        {
          borderColor,
          shadowColor: COLORS.primary,          // ✅ was TEAL "#00BCD4"
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity,
          shadowRadius: 14,
          elevation: 8,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const gcS = StyleSheet.create({
  card: {
    backgroundColor: "rgba(0,196,204,0.04)",   // ✅ was "rgba(0,188,212,0.04)"
    borderWidth: 1.5,
    borderRadius: radius.xl,
    // NO overflow:"hidden" — would block MiniGameCard touches
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// Main component — logic/JSX UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════
export default function LevelGoalTracker({
  levelGames = [],
  completedStoryCount = 0,
  totalStories = 8,
}) {
  const slot0 = levelGames[0] ?? null;
  const slot1 = levelGames[1] ?? null;

  if (!slot0 && !slot1) return null;

  const slot0Achieved = slot0 != null && slot0.status !== GAME_STATUS.LOCKED;
  const slot1Achieved = slot1 != null && slot1.status !== GAME_STATUS.LOCKED;
  const allDone = completedStoryCount >= totalStories;

  const conn1Active     = slot0Achieved;
  const conn1InProgress = slot0Achieved && !slot1Achieved;
  const conn2Active     = slot1Achieved;
  const conn2InProgress = slot1Achieved && !allDone;

  return (
    <GlowCard style={s.trackerCard}>
      <View style={s.boxesRow}>
        {slot0 ? (
          <MiniGameCard slot={slot0} size="tracker" interactive />
        ) : (
          <View style={s.placeholder} />
        )}

        <BoxConnector active={conn1Active} inProgress={conn1InProgress} />

        <Animated.View style={{ opacity: slot0Achieved ? 1 : 0.35 }}>
          {slot1 ? (
            <MiniGameCard slot={slot1} size="tracker" interactive />
          ) : (
            <View style={s.placeholder} />
          )}
        </Animated.View>

        <BoxConnector active={conn2Active} inProgress={conn2InProgress} />

        <LevelFinishBox
          allDone={allDone}
          active={slot1Achieved}
          inProgress={conn2InProgress}
          completedStoryCount={completedStoryCount}
        />
      </View>
    </GlowCard>
  );
}

const s = StyleSheet.create({
  trackerCard: {
    paddingTop:        isTablet ? 14 : 10,
    paddingBottom:     isTablet ? 20 : 10,
    paddingHorizontal: isTablet ? 14 : 10,
    marginLeft:  14,
    marginRight: 14,
  },
  boxesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  placeholder: {
    width:  TRACKER_CARD_SIZE,
    height: TRACKER_CARD_SIZE,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)", // keep — neutral
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",      // keep — neutral
  },
});
