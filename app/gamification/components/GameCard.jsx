/**
 * GameCard.jsx
 * app/gamification/components/GameCard.jsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   ✅ Upper portion now shows the game's cover image full-bleed (no margins)
 *   ✅ Lower footer reduced — just name + coins/unlock/dots row
 *   ✅ Falls back to original animated-icon design for games with no cover
 *      (spin_wheel, tressure_hunt return null from GAME_COVERS)
 *   ✅ All gamification logic, states, scratch cover, low-coins badge unchanged
 *   ✅ Cover image sourced from GAME_COVERS mapper (all requires are static)
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

import { FONTS, COLORS } from "../../theme";
import { font, pad, radius, isTablet } from "../../theme/tokens";
import { GAME_STATUS } from "../GamificationEngine";
import { useGamification } from "../GamificationContext";
import { GAME_ANIMATIONS } from "../constants/gameAnimations";
import ScratchCover from "./ScratchCover";
import GAME_COVERS from "../constants/gameCoverImages";


const CARD_W = isTablet ? 220 : 160;
const CARD_H = isTablet ? 270 : 200;

// 72% of card height is the cover image, 28% is the text footer
const COVER_RATIO = 0.72;
const COVER_H = Math.round(CARD_H * COVER_RATIO);
const FOOTER_H = CARD_H - COVER_H;

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC ICON FALLBACK (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function GenericIcon({ icon }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -6,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const containerH = isTablet ? 100 : 72;
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        height: containerH,
        flex: 1,
      }}
    >
      <Animated.Text
        style={{
          fontSize: isTablet ? 52 : 38,
          transform: [{ translateY: bounceAnim }],
        }}
      >
        {icon ?? "🎮"}
      </Animated.Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH PROGRESS DOTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ScratchDots({ count }) {
  return (
    <View style={dotS.row}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[dotS.dot, i < count && dotS.dotFilled]} />
      ))}
    </View>
  );
}
const dotS = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: isTablet ? 8 : 6,
    marginTop: pad.xs,
    justifyContent: "flex-start",
  },
  dot: {
    width: isTablet ? 10 : 8,
    height: isTablet ? 10 : 8,
    borderRadius: isTablet ? 5 : 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PULSE HOOK (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function usePulse(active) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      anim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.96,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  return anim;
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER SECTION
// Shows the full-bleed cover image, OR the original animated-icon fallback.
// ─────────────────────────────────────────────────────────────────────────────
function CoverSection({ coverSource, gradient, icon, gameId, isLocked }) {
  if (!coverSource) {
    // ── FALLBACK: original animated-icon design for games without a cover ──
    const g0 = gradient?.[0] ?? COLORS.primary;
    const g1 = gradient?.[1] ?? COLORS.surface;
    const MiniComponent = GAME_ANIMATIONS[gameId];
    return (
      <View style={[s.coverFallback, { height: COVER_H }]}>
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: g1 }]}
        />
        <View style={[s.gradientTop, { backgroundColor: g0 }]} />
        <View style={s.circle1} />
        <View style={s.circle2} />
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {MiniComponent ? <MiniComponent /> : <GenericIcon icon={icon} />}
        </View>
      </View>
    );
  }

  // ── COVER IMAGE ────────────────────────────────────────────────────────
  return (
    <View style={[s.coverWrap, { height: COVER_H }]}>
      <ExpoImage
        source={coverSource}
        style={StyleSheet.absoluteFillObject}
        contentFit="fill"
        cachePolicy="memory-disk"
      />
      {/* Thin gradient scrim at bottom so footer edge blends */}
      {/* <View style={s.coverScrim} /> */}
      {/* Extra dark tint when card is locked */}
      {isLocked && <View style={s.lockTint} />}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME CARD
// ─────────────────────────────────────────────────────────────────────────────
export default function GameCard({ slot }) {
  const { openLockedModal, openUnlockModal, startPlay, canAffordPlay } =
    useGamification();
  const {
    status,
    storiesCompletedInGroup,
    gameId,
    name,
    icon,
    gradient,
    accentColor,
  } = slot;

  const effectivelyRevealed =
    status === GAME_STATUS.LOCKED && storiesCompletedInGroup >= 3;
  const isLocked = status === GAME_STATUS.LOCKED && !effectivelyRevealed;
  const isRevealed = status === GAME_STATUS.REVEALED || effectivelyRevealed;
  const isUnlocked = status === GAME_STATUS.UNLOCKED;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = usePulse(isRevealed);

  const pressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  const handlePress = () => {
    if (isLocked) openLockedModal(gameId, storiesCompletedInGroup);
    if (isRevealed) openUnlockModal(gameId);
    if (isUnlocked) startPlay(gameId);
  };

  const acc = accentColor ?? COLORS.amber;
  const coverSource = GAME_COVERS[gameId] ?? null;

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }], marginRight: pad.sm }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={s.card}
      >
        {/* ── Dark card base ── */}
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.background }]}
        />

        {/* ── TOP: cover image or animated fallback ── */}
        <CoverSection
          coverSource={coverSource}
          gradient={gradient}
          icon={icon}
          gameId={gameId}
          isLocked={isLocked}
        />

        {/* ── Lock / play badge — floats over the cover, top-right ── */}
        <View style={[s.badge, { backgroundColor: acc }]}>
          <Text style={s.badgeText}>{isLocked ? "🔒" : "▶"}</Text>
        </View>

        {/* ── FOOTER: name + secondary row ── */}
        <View style={[s.footer, { height: FOOTER_H }]}>
          <Text style={s.title} numberOfLines={1}>
            {isLocked ? "???" : name}
          </Text>

          {isLocked && <ScratchDots count={storiesCompletedInGroup} />}

          {isRevealed && (
            <Animated.View
              style={{ transform: [{ scale: pulseAnim }], marginTop: 2 }}
            >
              <TouchableOpacity
                style={[s.unlockBtn, { backgroundColor: acc }]}
                onPress={() => openUnlockModal(gameId)}
                activeOpacity={0.85}
              >
                <Text style={s.unlockBtnText}>Unlock 💎 9</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {isUnlocked && (
            <View style={s.coinRow}>
              <ExpoImage
                source={require("../../../assets/img/coin.png")}
                style={s.coinImg}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Text style={s.subtitle}>100 to play</Text>
            </View>
          )}
        </View>

        {/* ── Accent bar ── */}
        <View style={[s.accentBar, { backgroundColor: acc }]} />

        {/* ── Scratch cover ── */}
        {isLocked && storiesCompletedInGroup < 3 && (
          <ScratchCover storiesCompleted={storiesCompletedInGroup} />
        )}

        {/* ── Low coins badge ── */}
        {isUnlocked && !canAffordPlay && (
          <View style={s.lowCoinsBadge}>
            <Text style={s.lowCoinsText}>Need coins</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.xl,
    overflow: "hidden",
    elevation: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },

  // ── Cover: image path ─────────────────────────────────────────────────────
  coverWrap: {
    width: "100%",
    overflow: "hidden",
  },
  coverScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    // Linear gradient effect via layered opacity
    backgroundColor: COLORS.background,
    opacity: 0.6,
  },
  lockTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,26,0.40)",
  },

  // ── Cover: fallback (no image) ────────────────────────────────────────────
  coverFallback: {
    width: "100%",
    overflow: "hidden",
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "65%",
    borderRadius: radius.xl,
    opacity: 0.9,
  },
  circle1: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    top: -30,
    right: -30,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: 0,
    left: -20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  // ── Badge ─────────────────────────────────────────────────────────────────
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: isTablet ? 44 : 32,
    height: isTablet ? 44 : 32,
    borderRadius: isTablet ? 22 : 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    zIndex: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  badgeText: {
    fontSize: font.sm,
    color: COLORS.background,
    marginLeft: 2,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    width: "100%",
    backgroundColor: COLORS.background,
    paddingHorizontal: pad.sm,
    paddingTop: 6,
    paddingBottom: 6,
    justifyContent: "center",
  },
  title: {
    fontSize: font.md,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: font.s,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  coinImg: {
    width: isTablet ? 20 : 16,
    height: isTablet ? 20 : 16,
  },
  unlockBtn: {
    borderRadius: radius.pill,
    paddingVertical: isTablet ? 6 : 4,
    paddingHorizontal: isTablet ? 12 : 8,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  unlockBtnText: {
    fontSize: font.s,
    fontWeight: "700",
    color: COLORS.background,
    letterSpacing: 0.2,
  },

  // ── Accent bar ────────────────────────────────────────────────────────────
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.8,
    zIndex: 2,
  },

  // ── Low coins badge ───────────────────────────────────────────────────────
  lowCoinsBadge: {
    position: "absolute",
    top: pad.s,
    left: pad.s,
    backgroundColor: "rgba(232,68,90,0.88)",
    borderRadius: radius.xs,
    paddingHorizontal: pad.xs,
    paddingVertical: 2,
    zIndex: 5,
  },
  lowCoinsText: {
    fontSize: font.xs,
    fontWeight: "700",
    color: "#fff",
  },
});
