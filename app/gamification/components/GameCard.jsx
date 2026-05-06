/**
 * GameCard.jsx
 * app/gamification/components/GameCard.jsx
 *
 * Visual design matches the original GameCard in home.jsx exactly —
 * same decorative circles, same mini character animations (MiniBird,
 * MiniCat, MiniMonkey), same badge, same accent bar.
 *
 * Adds 4 gamification states on top:
 *   LOCKED     — scratch cover with progress dots, title shows "???"
 *   REVEALED   — full card visible, pulsing Unlock CTA
 *   UNLOCKED   — full card, "100 🪙 to play" subtitle
 *   UNLOCKED + low coins — "Need coins" badge top-left
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

import { FONTS } from "../../theme";
import { font, pad, radius, isTablet } from "../../theme/tokens";
import { GAME_STATUS } from "../GamificationEngine";
import { useGamification } from "../GamificationContext";
import { GAME_ANIMATIONS } from "../constants/gameAnimations";
import ScratchCover from "./ScratchCover";

const TEAL   = "#00BCD4";
const YELLOW = "#FFD54F";
const DARK   = "#08081a";

const CARD_W = isTablet ? 220 : 160;
const CARD_H = isTablet ? 270 : 200;

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC ICON FALLBACK — used when no animation is registered for a gameId
// ─────────────────────────────────────────────────────────────────────────────
function GenericIcon({ icon }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -6, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0,  duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  const containerH = isTablet ? 100 : 72;
  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 18, marginBottom: 6, height: containerH }}>
      <Animated.Text style={{ fontSize: isTablet ? 52 : 38, transform: [{ translateY: bounceAnim }] }}>
        {icon ?? "🎮"}
      </Animated.Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH PROGRESS DOTS
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
  row: { flexDirection: "row", gap: isTablet ? 8 : 6, marginTop: pad.xs, justifyContent: "flex-start" },
  dot: { width: isTablet ? 10 : 8, height: isTablet ? 10 : 8, borderRadius: isTablet ? 5 : 4, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  dotFilled: { backgroundColor: TEAL, borderColor: TEAL, shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PULSE HOOK
// ─────────────────────────────────────────────────────────────────────────────
function usePulse(active) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) { anim.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.96, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active]);
  return anim;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME CARD
// ─────────────────────────────────────────────────────────────────────────────
export default function GameCard({ slot }) {
  const { openLockedModal, openUnlockModal, startPlay, canAffordPlay } = useGamification();
  const {
    status,
    storiesCompletedInGroup,
    gameId,
    name,
    icon,
    gradient,
    accentColor,
  } = slot;

  // If storiesCompletedInGroup reached 3 but engine status didn't flip yet
  // (e.g. onStoryComplete failed), treat as REVEALED so UI is correct
  const effectivelyRevealed = status === GAME_STATUS.LOCKED && storiesCompletedInGroup >= 3;
  const isLocked   = status === GAME_STATUS.LOCKED && !effectivelyRevealed;
  const isRevealed = status === GAME_STATUS.REVEALED || effectivelyRevealed;
  const isUnlocked = status === GAME_STATUS.UNLOCKED;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = usePulse(isRevealed);

  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.95, friction: 5, tension: 200, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    friction: 5, tension: 200, useNativeDriver: true }).start();

  const handlePress = () => {
    if (isLocked)   openLockedModal(gameId, storiesCompletedInGroup);
    if (isRevealed) openUnlockModal(gameId);
    if (isUnlocked) startPlay(gameId);
  };

  const renderMini = () => {
    const MiniComponent = GAME_ANIMATIONS[gameId];
    if (MiniComponent) return <MiniComponent />;
    // Fallback: bouncing emoji for games without a registered animation
    return <GenericIcon icon={icon} />;
  };

  const g0  = gradient?.[0]   ?? TEAL;
  const g1  = gradient?.[1]   ?? "#1a1a2e";
  const acc = accentColor      ?? YELLOW;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginRight: pad.sm }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={s.card}
      >
        {/* ── Background ── */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g1 }]} />
        <View style={[s.gradientTop, { backgroundColor: g0 }]} />

        {/* ── Decorative circles — exact same as original ── */}
        <View style={s.circle1} />
        <View style={s.circle2} />

        {/* ── Top-right badge ── */}
        <View style={[s.badge, { backgroundColor: acc }]}>
          <Text style={s.badgeText}>
            {isLocked ? "🔒" : "▶"}
          </Text>
        </View>

        {/* ── Mini character — always rendered, covered by scratch when locked ── */}
        {renderMini()}

        {/* ── Bottom text block ── */}
        <View style={s.textBlock}>
          <Text style={s.title} numberOfLines={1}>
            {isLocked ? "???" : name}
          </Text>

          {/* LOCKED: progress dots */}
          {isLocked && (
            <ScratchDots count={storiesCompletedInGroup} />
          )}

          {/* REVEALED: pulsing unlock button */}
          {isRevealed && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 4 }}>
              <TouchableOpacity
                style={[s.unlockBtn, { backgroundColor: acc }]}
                onPress={() => openUnlockModal(gameId)}
                activeOpacity={0.85}
              >
                <Text style={s.unlockBtnText}>Unlock  💎 9</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* UNLOCKED: subtitle */}
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

        {/* ── Accent bar — exact same as original ── */}
        <View style={[s.accentBar, { backgroundColor: acc }]} />

        {/* ── Scratch cover — on top of everything, only when LOCKED ── */}
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
    width:         CARD_W,
    height:        CARD_H,
    borderRadius:  radius.xl,
    overflow:      "hidden",
    elevation:     10,
    shadowColor:   "#00BCD4",
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
  },
  gradientTop: {
    position:     "absolute",
    top: 0, left: 0, right: 0,
    height:       "60%",
    borderRadius: radius.xl,
    opacity:      0.9,
  },
  circle1: {
    position:        "absolute",
    width:           130, height: 130,
    borderRadius:    65,
    top: -30, right: -30,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle2: {
    position:        "absolute",
    width:           80, height: 80,
    borderRadius:    40,
    bottom: 30, left: -20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  badge: {
    position:       "absolute",
    top: 12, right: 12,
    width:          isTablet ? 44 : 32,
    height:         isTablet ? 44 : 32,
    borderRadius:   isTablet ? 22 : 16,
    alignItems:     "center",
    justifyContent: "center",
    elevation:      4,
    zIndex:         2,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize:   font.sm,
    color:      DARK,
    marginLeft: 2,
  },
  textBlock: {
    paddingHorizontal: pad.sm,
    paddingBottom:     pad.sm,
    marginTop:         "auto",
  },
  title: {
    fontFamily:       FONTS.bold,
    fontSize:         font.md,
    color:            "#fff",
    letterSpacing:    0.2,
    textShadowColor:  "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize:   font.s,
    color:      "rgba(255,255,255,0.7)",
    marginTop:  2,
  },
  coinRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    marginTop:      2,
  },
  coinImg: {
    width:  isTablet ? 20 : 16,
    height: isTablet ? 20 : 16,
  },
  unlockBtn: {
    borderRadius:      radius.pill,
    paddingVertical:   isTablet ? 8 : 6,
    paddingHorizontal: isTablet ? 14 : 10,
    alignItems:        "center",
    alignSelf:         "flex-start",
    marginTop:         4,
  },
  unlockBtnText: {
    fontFamily:    FONTS.bold,
    fontSize:      font.s,
    color:         DARK,
    letterSpacing: 0.2,
  },
  accentBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height:  3,
    opacity: 0.8,
  },
  lowCoinsBadge: {
    position:          "absolute",
    top: pad.s, left: pad.s,
    backgroundColor:   "rgba(255,100,60,0.88)",
    borderRadius:      radius.xs,
    paddingHorizontal: pad.xs,
    paddingVertical:   2,
  },
  lowCoinsText: {
    fontFamily: FONTS.bold,
    fontSize:   font.xs,
    color:      "#fff",
  },
});
