/**
 * StoryCollectionArc.jsx
 * app/gamification/components/StoryCollectionArc.jsx
 *
 * BRAND UPDATE — feature/brand-guidelines-v2
 * COLOUR-ONLY changes — zero functional/logic/animation changes:
 *
 *   ✅ Removed local TEAL/YELLOW/GREEN constants — all from COLORS theme:
 *        TEAL   "#00BCD4" → COLORS.primary    (#00C4CC — §3.1 brand cyan)
 *        YELLOW "#FFD54F" → COLORS.amber      (#F5A623 — §3.1 brand amber)
 *        GREEN  "#4CAF50" → COLORS.teal       (#2A9D8F — §3.3 completion signal)
 *   ✅ All rgba(0,188,212,…) → rgba(0,196,204,…) correct cyan hex, same opacity
 *   ✅ All rgba(76,175,80,…) → rgba(42,157,143,…) brand teal rgba, same opacity
 *        (off-brand green retired — §9.1)
 *   ✅ "#1a1a2e" tick badge border → COLORS.background (#0A1628)
 *   ✅ COLORS imported from theme
 *
 * KEPT EXACTLY (neutral — not colour-specific):
 *   ✅ "rgba(255,255,255,0.04)" inactive node bg
 *   ✅ "rgba(255,255,255,0.08)" inactive connector
 *   ✅ "rgba(255,255,255,0.15)" inactive node border
 *   ✅ "#fff" tick text (white on teal bg — correct)
 *
 * UNTOUCHED (zero changes):
 *   ✅ All animation logic (useGlow, loops, interpolations)
 *   ✅ All layout, sizing, nodeSize, lineW, padding
 *   ✅ All logic: doneCount, isActive, isDone, overrideCount/Total
 *   ✅ All JSX structure — zero additions or removals
 *   ✅ All props interface unchanged
 */

import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { FONTS, COLORS } from "../../theme";
import { isTablet } from "../../theme/tokens";
import { GAME_STATUS } from "../GamificationEngine";

// ── Constants — UNCHANGED ─────────────────────────────────────────────────────
const STORIES_PER_GOAL = 3;
const GOAL3_NODES      = 2;

// ─── Glow pulse hook — UNCHANGED ─────────────────────────────────────────────
function useGlow(active) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { anim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  return anim;
}

// ─── Story node — layout/animation UNCHANGED, colours corrected ───────────────
function StoryNode({ done, active, nodeSize }) {
  const glowAnim = useGlow(active && !done);
  const nodeHalf = nodeSize / 2;

  const borderColor = done
    ? COLORS.teal                              // ✅ was GREEN "#4CAF50"
    : active
    ? glowAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: [
          "rgba(0,196,204,0.4)",               // ✅ was "rgba(0,188,212,0.4)"
          "rgba(0,196,204,1)",                 // ✅ was "rgba(0,188,212,1)"
        ],
      })
    : "rgba(255,255,255,0.15)";               // keep — neutral inactive

  const bgColor = done
    ? "rgba(42,157,143,0.2)"                  // ✅ was "rgba(76,175,80,0.2)" off-brand green
    : active
    ? "rgba(0,196,204,0.14)"                  // ✅ was "rgba(0,188,212,0.14)"
    : "rgba(255,255,255,0.04)";               // keep — neutral inactive

  return (
    <Animated.View
      style={[
        {
          width: nodeSize, height: nodeSize,
          borderRadius: nodeHalf,
          borderWidth: 2, borderColor, backgroundColor: bgColor,
          alignItems: "center", justifyContent: "center",
          position: "relative",
        },
        done && {
          shadowColor: COLORS.teal,            // ✅ was GREEN "#4CAF50"
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7, shadowRadius: 7, elevation: 7,
        },
        active && !done && {
          shadowColor: COLORS.primary,         // ✅ was TEAL "#00BCD4"
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.65, shadowRadius: 7, elevation: 7,
        },
      ]}
    >
      <ExpoImage
        source={require("../../../assets/img/read_icon.png")}
        style={{ width: nodeSize * 0.6, height: nodeSize * 0.6 }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      {done && (
        <View
          style={{
            position: "absolute", top: -7, right: -7,
            width: 22, height: 22,
            borderRadius: 11,
            backgroundColor: COLORS.teal,      // ✅ was GREEN "#4CAF50"
            alignItems: "center", justifyContent: "center",
            borderWidth: 2,
            borderColor: COLORS.background,    // ✅ was "#1a1a2e"
            zIndex: 10,
          }}
        >
          <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: "#fff", lineHeight: 15 }}>
            ✓
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Connector line — logic/animation UNCHANGED, colours corrected ────────────
function ArcLine({ done, active, lineW }) {
  const glowAnim = useGlow(active && !done);
  const bgColor  = done
    ? "rgba(42,157,143,0.75)"                 // ✅ was "rgba(76,175,80,0.75)" off-brand green
    : active
    ? glowAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: [
          "rgba(0,196,204,0.2)",              // ✅ was "rgba(0,188,212,0.2)"
          "rgba(0,196,204,0.7)",              // ✅ was "rgba(0,188,212,0.7)"
        ],
      })
    : "rgba(255,255,255,0.08)";              // keep — neutral inactive

  return (
    <View style={{ width: lineW, height: 2, justifyContent: "center" }}>
      <Animated.View
        style={{ height: 2, width: "100%", borderRadius: 1, backgroundColor: bgColor }}
      />
    </View>
  );
}

// ─── ArcContainer — animation UNCHANGED, colours corrected ───────────────────
function ArcContainer({ children }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const borderColor = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      "rgba(0,196,204,0.25)",               // ✅ was "rgba(0,188,212,0.25)"
      "rgba(0,196,204,0.75)",               // ✅ was "rgba(0,188,212,0.75)"
    ],
  });
  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.1, 0.55],
  });

  return (
    <Animated.View
      style={[
        arcContS.wrap,
        {
          borderColor,
          shadowColor: COLORS.primary,        // ✅ was TEAL "#00BCD4"
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const arcContS = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(0,196,204,0.05)",  // ✅ was "rgba(0,188,212,0.05)"
    borderWidth: 1.5,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// Main component — logic/JSX/props UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════
export default function StoryCollectionArc({
  levelGames = [],
  slotIndex = 0,
  completedStoryCount = 0,
  totalStories = 8,
  compact = false,
  overrideCount = null,
  overrideTotal = null,
}) {
  const nodeSize = compact ? (isTablet ? 56 : 46) : (isTablet ? 74 : 64);
  const lineW    = compact ? 20 : (isTablet ? 28 : 24);

  const slot0 = levelGames[0] ?? null;
  const slot1 = levelGames[1] ?? null;

  let nodeCount = overrideTotal ?? STORIES_PER_GOAL;
  let doneCount = 0;

  if (overrideCount !== null) {
    doneCount = Math.min(overrideCount, nodeCount);
  } else if (slotIndex === 0) {
    doneCount = slot0 ? Math.min(slot0.storiesCompletedInGroup, STORIES_PER_GOAL) : 0;
  } else if (slotIndex === 1) {
    doneCount = slot1 ? Math.min(slot1.storiesCompletedInGroup, STORIES_PER_GOAL) : 0;
  } else {
    nodeCount = GOAL3_NODES;
    doneCount = Math.min(Math.max(completedStoryCount - STORIES_PER_GOAL * 2, 0), GOAL3_NODES);
  }

  return (
    <ArcContainer>
      {Array.from({ length: nodeCount }).map((_, i) => {
        const isDone    = i < doneCount;
        const isActive  = i === doneCount && doneCount < nodeCount;
        const lineDone  = isDone;
        const lineActive = !lineDone && i >= doneCount - 1;

        return (
          <React.Fragment key={i}>
            <StoryNode done={isDone} active={isActive} nodeSize={nodeSize} />
            {i < nodeCount - 1 && (
              <ArcLine done={lineDone} active={lineActive} lineW={lineW} />
            )}
          </React.Fragment>
        );
      })}
    </ArcContainer>
  );
}
