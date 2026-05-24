/**
 * StoryCollectionArc.jsx
 * app/gamification/components/StoryCollectionArc.jsx
 *
 * CHANGES:
 *   - Label text ("Read N stories to unlock...") removed entirely
 *   - Progress text removed
 *   - A glowing rounded border (like the design) wraps the story nodes row
 *   - compact=false nodes made larger (50px) to match design scale
 *   - compact=true nodes stay 34px for modal use
 */

import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { FONTS } from "../../theme";
import { isTablet } from "../../theme/tokens";
import { GAME_STATUS } from "../GamificationEngine";

const TEAL   = "#00BCD4";
const YELLOW = "#FFD54F";
const GREEN  = "#4CAF50";

const STORIES_PER_GOAL = 3;
const GOAL3_NODES      = 2;

// ─── Glow pulse hook ──────────────────────────────────────────────────────────
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

// ─── Story node ───────────────────────────────────────────────────────────────
function StoryNode({ done, active, nodeSize }) {
  const glowAnim = useGlow(active && !done);
  const nodeHalf = nodeSize / 2;

  const borderColor = done
    ? GREEN
    : active
    ? glowAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ["rgba(0,188,212,0.4)", "rgba(0,188,212,1)"],
      })
    : "rgba(255,255,255,0.15)";

  const bgColor = done
    ? "rgba(76,175,80,0.2)"
    : active
    ? "rgba(0,188,212,0.14)"
    : "rgba(255,255,255,0.04)";

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
          shadowColor: GREEN, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7, shadowRadius: 7, elevation: 7,
        },
        active && !done && {
          shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
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
        // Fixed tick size so it's always clearly visible regardless of nodeSize
        <View
          style={{
            position: "absolute", top: -7, right: -7,
            width: 22, height: 22,
            borderRadius: 11,
            backgroundColor: GREEN,
            alignItems: "center", justifyContent: "center",
            borderWidth: 2, borderColor: "#1a1a2e", zIndex: 10,
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

// ─── Connector line between nodes ─────────────────────────────────────────────
function ArcLine({ done, active, lineW }) {
  const glowAnim = useGlow(active && !done);
  const bgColor  = done
    ? "rgba(76,175,80,0.75)"
    : active
    ? glowAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ["rgba(0,188,212,0.2)", "rgba(0,188,212,0.7)"],
      })
    : "rgba(255,255,255,0.08)";

  return (
    <View style={{ width: lineW, height: 2, justifyContent: "center" }}>
      <Animated.View style={{ height: 2, width: "100%", borderRadius: 1, backgroundColor: bgColor }} />
    </View>
  );
}

// ─── Glowing rounded border container for the nodes row ───────────────────────
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
    outputRange: ["rgba(0,188,212,0.25)", "rgba(0,188,212,0.75)"],
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
          shadowColor: TEAL,
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
    backgroundColor: "rgba(0,188,212,0.05)",
    borderWidth: 1.5,
    borderRadius: 28,       // very rounded, matching the design
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: "center",    // shrinks to content width
    flexDirection: "row",
    alignItems: "center",
  },
});

// ═════════════════════════════════════════════════════════════════════════════
export default function StoryCollectionArc({
  levelGames = [],
  slotIndex = 0,
  completedStoryCount = 0,
  totalStories = 8,
  compact = false,
  // Optional overrides — used by StoryFinishOverlay which has no levelGames context
  overrideCount = null,
  overrideTotal = null,
}) {
  // compact=true  → 46px nodes (LockedGameModal)
  // compact=false → 64px nodes (standalone)
  const nodeSize = compact ? (isTablet ? 56 : 46) : (isTablet ? 74 : 64);
  const lineW    = compact ? 20 : (isTablet ? 28 : 24);

  const slot0 = levelGames[0] ?? null;
  const slot1 = levelGames[1] ?? null;

  let nodeCount = overrideTotal ?? STORIES_PER_GOAL;
  let doneCount = 0;

  if (overrideCount !== null) {
    // Direct override — used by StoryFinishOverlay (no levelGames available)
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
