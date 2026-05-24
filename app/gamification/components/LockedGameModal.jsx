/**
 * LockedGameModal.jsx
 * app/gamification/components/LockedGameModal.jsx
 *
 * CHANGES vs document 19:
 *   - surprise.png image replaced with ScratchGameCard showing the actual
 *     scratch state of the locked slot (same component as StoryFinishOverlay)
 *   - ScratchGameCard, buildTearPath, buildScratchLinesPath, ScratchLines
 *     copied from StoryFinishOverlay and wired to the slot's storiesCompleted
 *   - StoryCollectionArc retained below (unchanged)
 *   - All other logic (animation, sheet, dynamic state) unchanged from doc 19
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";
import { useGamification } from "../GamificationContext";
import StoryCollectionArc from "./StoryCollectionArc";
import Svg, {
  Defs,
  ClipPath,
  Path,
  Rect,
  Image as SvgImage,
} from "react-native-svg";
import { GAME_ANIMATIONS } from "../constants/gameAnimations";
import GAME_COVERS from "../constants/gameCoverImages";

const { height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(8,8,26,0.96)",
  yellow: "#FFD54F",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const SHEET_HEIGHT = SH * 0.78; // slightly taller to fit scratch card + arc

// ─── Scratch card constants ───────────────────────────────────────────────────
const CARD_W = 140;
const CARD_H = 185;

// ─── Dynamic state ────────────────────────────────────────────────────────────
function getState(progress) {
  if (progress >= 2) {
    return {
      title: "🔥 So Close!",
      message: "Only 1 more story to open your surprise!",
      cta: "Unlock Now →",
      scale: 1.05,
    };
  }
  if (progress === 1) {
    return {
      title: "✨ Nice! ✨",
      message: "2 more stories to reveal your surprise",
      cta: "Keep Reading →",
      scale: 1,
    };
  }
  return {
    title: null,
    message: "Read 3 stories to open it",
    cta: "Start Reading →",
    scale: 0.95,
  };
}

// ─── Tear path builder ────────────────────────────────────────────────────────
function buildTearPath(progress) {
  if (progress === 0) return null;
  const tearHalfW =
    progress === 1
      ? CARD_W * 0.12
      : progress === 2
        ? CARD_W * 0.22
        : CARD_W * 0.4;
  const cx1 = CARD_W * 0.22,
    cy1 = CARD_H * 0.14;
  const cx2 = CARD_W * 0.78,
    cy2 = CARD_H * 0.86;
  const dxC = cx2 - cx1,
    dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const px = -dyC / lineLen,
    py = dxC / lineLen;
  const steps = 12;
  const leftPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jaggle = tearHalfW * (0.5 + 0.5 * Math.sin(i * 2.4 + 0.8));
    leftPts.push({
      x: cx1 + dxC * t - px * jaggle,
      y: cy1 + dyC * t - py * jaggle,
    });
  }
  const rightPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jaggle = tearHalfW * (0.55 + 0.45 * Math.sin(i * 1.8 + 2.1));
    rightPts.push({
      x: cx1 + dxC * t + px * jaggle,
      y: cy1 + dyC * t + py * jaggle,
    });
  }
  const allPts = [...leftPts, ...[...rightPts].reverse()];
  const outerRect = `M 0,0 L ${CARD_W},0 L ${CARD_W},${CARD_H} L 0,${CARD_H} Z`;
  const innerPoly =
    allPts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z";
  return `${outerRect} ${innerPoly}`;
}

function buildScratchLinesPath(progress) {
  if (progress === 0) return null;
  const cx1 = CARD_W * 0.22,
    cy1 = CARD_H * 0.14;
  const cx2 = CARD_W * 0.78,
    cy2 = CARD_H * 0.86;
  const dxC = cx2 - cx1,
    dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const ux = dxC / lineLen,
    uy = dyC / lineLen;
  const px2 = -dyC / lineLen,
    py2 = dxC / lineLen;
  const tearHalfW =
    progress === 1
      ? CARD_W * 0.09
      : progress === 2
        ? CARD_W * 0.17
        : CARD_W * 0.32;
  const lineCount = progress === 1 ? 5 : progress === 2 ? 9 : 14;
  const paths = [];
  for (let i = 0; i < lineCount; i++) {
    const t = 0.15 + (i / (lineCount - 1)) * 0.7;
    const perpOffset =
      tearHalfW * 0.55 * Math.sin(i * 1.9 + 0.4) * (i % 2 === 0 ? 1 : -0.65);
    const lx = cx1 + dxC * t + px2 * perpOffset,
      ly = cy1 + dyC * t + py2 * perpOffset;
    const scratchLen = 10 + 8 * Math.abs(Math.sin(i * 1.3));
    paths.push(
      `M ${(lx - ux * scratchLen * 0.5).toFixed(1)},${(ly - uy * scratchLen * 0.5).toFixed(1)} L ${(lx + ux * scratchLen * 0.5).toFixed(1)},${(ly + uy * scratchLen * 0.5).toFixed(1)}`,
    );
  }
  return paths.join(" ");
}

function ScratchLines({ progress }) {
  const d = buildScratchLinesPath(progress);
  if (!d) return null;
  return (
    <Path
      d={d}
      fill="none"
      stroke="rgba(255,220,100,0.55)"
      strokeWidth={1.2}
      strokeLinecap="round"
    />
  );
}

// ─── Static scratch card — shows current scratch state, no animation ──────────
// Unlike StoryFinishOverlay's animated version, this one is static (no shake,
// no progressive reveal) since it's just showing current progress in the modal.
function StaticScratchCard({ slot, storiesCompleted }) {
  const progress = Math.min(storiesCompleted, 3); // 0, 1, 2, or 3
  const tearPath = buildTearPath(progress);

  const gradient = slot?.gradient ?? ["#00BCD4", "#0097A7"];
  const MiniAnim = slot?.gameId ? GAME_ANIMATIONS[slot.gameId] : null;
  const coverSource = slot?.gameId ? (GAME_COVERS[slot.gameId] ?? null) : null;

  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1.0],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.05],
  });

  return (
    <View style={sc.outerWrap}>
      {/* Glow ring */}
      <Animated.View
        style={[
          sc.glowRing,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />

      <View style={sc.cardWrap}>
        {/* Card face */}
        {coverSource ? (
          <View style={[sc.card, { overflow: "hidden" }]}>
            <ExpoImage
              source={coverSource}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(8,8,26,0.08)",
              }}
            />
          </View>
        ) : (
          <View style={[sc.card, { backgroundColor: gradient[1] }]}>
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: gradient[0], height: "60%", opacity: 0.9 },
              ]}
            />
            <View style={sc.circle1} />
            <View style={sc.circle2} />
            <View style={sc.questionWrap}>
              {MiniAnim ? (
                <MiniAnim />
              ) : (
                <Text style={sc.questionText}>{slot?.icon ?? "🎮"}</Text>
              )}
            </View>
          </View>
        )}

        {/* SVG scratch overlay — static at current progress level */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Svg width={CARD_W} height={CARD_H}>
            <Defs>
              <ClipPath id="lgmScratchClip">
                {tearPath ? (
                  <Path d={tearPath} fillRule="evenodd" />
                ) : (
                  <Rect x={0} y={0} width={CARD_W} height={CARD_H} />
                )}
              </ClipPath>
            </Defs>
            <SvgImage
              href={require("../../../assets/games/scratch-cover.jpeg")}
              x={0}
              y={0}
              width={CARD_W}
              height={CARD_H}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#lgmScratchClip)"
            />
            {tearPath && <ScratchLines progress={progress} />}
          </Svg>
        </View>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  outerWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.sm,
    padding: 10,
    marginTop: 10,
  },
  glowRing: {
    position: "absolute",
    width: CARD_W + 22,
    height: CARD_H + 22,
    borderRadius: radius.xl + 6,
    borderWidth: 2.5,
    borderColor: "rgba(255,213,79,0.75)",
    shadowColor: "#FFD54F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 0,
  },
  cardWrap: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.xl,
    overflow: "hidden",
    shadowColor: "#FFD54F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 14,
  },
  card: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -20,
    right: -20,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    bottom: 20,
    left: -15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  questionWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  questionText: { fontSize: 40 },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function LockedGameModal({
  visible,
  storiesCompleted = 0,
  onClose,
  onGoRead,
}) {
  const { levelGames, lockedModal } = useGamification();
  const gameId = lockedModal?.gameId ?? null;
  const slotIndex = levelGames?.findIndex((g) => g.gameId === gameId) ?? 0;
  const slot = levelGames?.[slotIndex] ?? null;

  const state = getState(storiesCompleted);

  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    sheetY.setValue(SHEET_HEIGHT);
    scrim.setValue(0);
    Animated.parallel([
      Animated.timing(scrim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    Animated.parallel([
      Animated.spring(scale, { toValue: state.scale, useNativeDriver: true }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scrim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none">
      <View style={s.shell}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[s.scrim, { opacity: scrim }]} />
        </TouchableOpacity>

        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <View style={s.handle} />

          <Animated.View
            style={{
              opacity,
              transform: [{ scale }],
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* ── Scratch card (replaces surprise.png) ── */}
            <StaticScratchCard
              slot={slot}
              storiesCompleted={storiesCompleted}
            />

            {/* Dynamic title */}
            {state.title && <Text style={s.title}>{state.title}</Text>}

            {/* Story Collection Arc */}
            <View style={s.arcWrap}>
              <StoryCollectionArc
                levelGames={levelGames ?? []}
                slotIndex={slotIndex >= 0 ? slotIndex : 0}
                compact={false}
              />
            </View>

            {/* Message */}
            <Text style={s.message}>{state.message}</Text>

            {/* CTA */}
            <TouchableOpacity
              style={s.cta}
              onPress={onGoRead}
              activeOpacity={0.85}
            >
              <Text style={s.ctaText}>{state.cta}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    minHeight: SHEET_HEIGHT,
    backgroundColor: C.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: pad.lg,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ffffff30",
    borderRadius: 3,
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    color: C.textPri,
    marginBottom: pad.sm,
    textAlign: "center",
  },
  arcWrap: { width: "100%", alignItems: "center", marginBottom: pad.md },
  message: {
    color: C.textMuted,
    fontSize: font.lg,
    marginBottom: pad.xl,
    textAlign: "center",
    fontFamily: FONTS.light,
  },
  cta: {
    backgroundColor: "rgba(255,213,79,0.2)",
    borderWidth: 1.5,
    borderColor: C.yellow,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  ctaText: { fontFamily: FONTS.bold, color: C.yellow, fontSize: font.lg },
});
