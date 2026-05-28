/**
 * LevelGoalTracker.jsx
 * app/gamification/components/LevelGoalTracker.jsx
 *
 * FIXES:
 *   1. BoxConnector: moving dot only shows when goal is actively IN PROGRESS
 *      (connector is active but the NEXT slot is still locked).
 *      Once the next goal is achieved, line stays bright but dot stops.
 *   2. LevelGoalTracker no longer hides when mode !== "PLAY".
 *      It always renders. The "Read Only" / "View Only" banner from
 *      AccessModeBanner (already in home.jsx) handles the mode messaging.
 *      Game slot cards reflect their true engine state (LOCKED/REVEALED/UNLOCKED).
 *      Connecting lines use a static bright color on previous levels
 *      (no animation, no moving dot) since all goals are already achieved there.
 */

import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { radius, isTablet } from "../../theme/tokens";
import { GAME_STATUS } from "../GamificationEngine";
import MiniGameCard, { TRACKER_CARD_SIZE } from "./MiniGameCard";

const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";
const DARK = "#08081a";

// ─── Glow pulse hook ──────────────────────────────────────────────────────────
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

// ─── Box connector ─────────────────────────────────────────────────────────────
// active      — true when the LEFT slot's goal has been achieved (connector lit)
// inProgress  — true when lit AND the RIGHT slot is still locked (dot animates)
//               Once right slot is also achieved, dot stops but line stays bright.
function BoxConnector({ active, inProgress }) {
  const glowAnim = useGlow(inProgress); // dot animation only when in-progress

  // Line color: bright teal when active (achieved or in-progress), dim otherwise
  const lineColor = active
    ? inProgress
      ? glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["rgba(0,188,212,0.5)", "rgba(0,188,212,0.95)"],
        })
      : "rgba(0,188,212,0.75)" // achieved: static bright, no pulse
    : "rgba(255,255,255,0.07)"; // locked: dim

  const dotLeft = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["5%", "88%"],
  });

  return (
    <View style={connS.wrap}>
      <View style={connS.base} />
      <Animated.View style={[connS.glow, { backgroundColor: lineColor }]} />
      {/* Dot only renders when actively in progress — not after goal achieved */}
      {inProgress && (
        <Animated.View
          style={[
            connS.dot,
            {
              left: dotLeft,
              shadowColor: TEAL,
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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 1,
  },
  glow: { position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1 },
  dot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: TEAL,
    top: "50%",
    marginTop: -3.5,
  },
});

// ─── Level Finish Box ──────────────────────────────────────────────────────────
function LevelFinishBox({ allDone, active, inProgress, completedStoryCount }) {
  const glowAnim = useGlow(true);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      allDone
        ? "rgba(255,213,79,0.55)"
        : active
          ? "rgba(255,213,79,0.2)"
          : "rgba(255,255,255,0.07)",
      allDone
        ? "rgba(255,213,79,1.0)"
        : active
          ? "rgba(255,213,79,0.6)"
          : "rgba(255,255,255,0.1)",
    ],
  });
  const shadowOpacity = allDone
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] })
    : active
      ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.35] })
      : 0;

  // Stars only start filling after both game goals are achieved (6 stories).
  // Count stories beyond the 6 goal stories toward the finish box.
  // Guard: if slot1 not yet achieved (active=false), finish stars stay empty.
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
            shadowColor: YELLOW,
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
              { backgroundColor: "rgba(8,8,26,0.45)" },
            ]}
          />
        )}
        {allDone && (
          <>
            <View
              style={[
                finS.confetti,
                { top: 6, left: 8, backgroundColor: TEAL },
              ]}
            />
            <View
              style={[
                finS.confetti,
                { top: 10, right: 9, backgroundColor: "#FF7043" },
              ]}
            />
            <View
              style={[
                finS.confetti,
                { bottom: 14, left: 9, backgroundColor: YELLOW },
              ]}
            />
            <View
              style={[
                finS.confetti,
                { bottom: 10, right: 7, backgroundColor: TEAL },
              ]}
            />
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
              color: filled ? YELLOW : "rgba(255,255,255,0.2)",
              ...(filled && {
                textShadowColor: YELLOW,
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
    backgroundColor: DARK,
  },
  confetti: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.8,
  },
});

// ─── Pulsing glow card border — NO overflow:hidden (blocks touches) ───────────
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
    outputRange: ["rgba(0,188,212,0.18)", "rgba(0,188,212,0.6)"],
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
          shadowColor: TEAL,
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
    backgroundColor: "rgba(0,188,212,0.04)",
    borderWidth: 1.5,
    borderRadius: radius.xl,
    // NO overflow:"hidden" — would block MiniGameCard touches
  },
});

// ═════════════════════════════════════════════════════════════════════════════
export default function LevelGoalTracker({
  levelGames = [],
  completedStoryCount = 0,
  totalStories = 8,
}) {
  const slot0 = levelGames[0] ?? null;
  const slot1 = levelGames[1] ?? null;

  if (!slot0 && !slot1) return null;

  // Whether each slot's goal has been passed (connector to its right lights up)
  const slot0Achieved = slot0 != null && slot0.status !== GAME_STATUS.LOCKED;
  const slot1Achieved = slot1 != null && slot1.status !== GAME_STATUS.LOCKED;
  const allDone = completedStoryCount >= totalStories;

  // Connector 1 (between slot0 and slot1):
  //   active      = slot0 goal achieved
  //   inProgress  = slot0 achieved BUT slot1 not yet achieved (dot animates)
  const conn1Active = slot0Achieved;
  const conn1InProgress = slot0Achieved && !slot1Achieved;

  // Connector 2 (between slot1 and finish):
  //   active      = slot1 goal achieved
  //   inProgress  = slot1 achieved BUT level not yet finished (dot animates)
  const conn2Active = slot1Achieved;
  const conn2InProgress = slot1Achieved && !allDone;

  return (
    <GlowCard style={s.trackerCard}>
      <View style={s.boxesRow}>
        {/* Slot 0 — always interactive, reflects true engine state */}
        {slot0 ? (
          <MiniGameCard slot={slot0} size="tracker" interactive />
        ) : (
          <View style={s.placeholder} />
        )}

        {/* Connector 1: lit when slot0 achieved, dot only while slot1 pending */}
        <BoxConnector active={conn1Active} inProgress={conn1InProgress} />

        {/* Slot 1 — dims until slot0 cleared, reflects true engine state */}
        <Animated.View style={{ opacity: slot0Achieved ? 1 : 0.35 }}>
          {slot1 ? (
            <MiniGameCard slot={slot1} size="tracker" interactive />
          ) : (
            <View style={s.placeholder} />
          )}
        </Animated.View>

        {/* Connector 2: lit when slot1 achieved, dot only while finish pending */}
        <BoxConnector active={conn2Active} inProgress={conn2InProgress} />

        {/* Level finish box */}
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
    paddingTop: isTablet ? 14 : 10,
    paddingBottom: isTablet ? 20 : 10,
    paddingHorizontal: isTablet ? 14 : 10,
    marginLeft: 14,
    marginRight: 14,
  },
  boxesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  placeholder: {
    width: TRACKER_CARD_SIZE,
    height: TRACKER_CARD_SIZE,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});
