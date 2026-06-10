/**
 * ExpandedGameCard.jsx
 * app/gamification/components/ExpandedGameCard.jsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   ✅ GameCardFace now shows game cover image full-bleed when available
 *   ✅ Falls back to original gradient + circles + animated-icon design
 *   ✅ GameCardFace export preserved — StoryFinishOverlay & other consumers unchanged
 *   ✅ All entrance animations, glow ring, Play Now / Maybe later logic unchanged
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS, COLORS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";
import { GAME_ANIMATIONS } from "../constants/gameAnimations";
import GAME_COVERS from "../constants/gameCoverImages";

const CARD_SIZE = 160;

// ─────────────────────────────────────────────────────────────────────────────
// GAME CARD FACE
// Exported — used here and externally (StoryFinishOverlay etc.)
//
// Shows game cover image full-bleed when GAME_COVERS[gameId] is non-null.
// Falls back to the original gradient + decorative circles + mini animation
// design for games without a cover (spin_wheel, tressure_hunt).
// ─────────────────────────────────────────────────────────────────────────────
export function GameCardFace({ slot, size = CARD_SIZE }) {
  const gradient    = slot?.gradient  ?? [COLORS.primary, COLORS.primaryDark];
  const MiniAnim    = slot?.gameId ? GAME_ANIMATIONS[slot.gameId] : null;
  const coverSource = slot?.gameId ? (GAME_COVERS[slot.gameId] ?? null) : null;

  return (
    <View style={{ width: size, height: size, borderRadius: radius.xl, overflow: "hidden" }}>
      {coverSource ? (
        // ── COVER IMAGE ────────────────────────────────────────────────────
        <>
          <ExpoImage
            source={coverSource}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* Subtle dark overlay so glow ring / border reads on any image */}
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,8,26,0.10)" }} />
        </>
      ) : (
        // ── FALLBACK: original gradient + circles + animated icon ──────────
        <>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[1] }]} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[0], height: "60%", opacity: 0.92 }]} />
          <View style={[cs.circle1, { width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35, top: -size * 0.18, right: -size * 0.18 }]} />
          <View style={[cs.circle2, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, bottom: size * 0.1, left: -size * 0.1 }]} />
          <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
            {MiniAnim
              ? <MiniAnim />
              : <Text style={{ fontSize: size * 0.28 }}>{slot?.icon ?? "🎮"}</Text>}
          </View>
        </>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  circle1: { position: "absolute", backgroundColor: "rgba(255,255,255,0.08)" },
  circle2: { position: "absolute", backgroundColor: "rgba(255,255,255,0.05)" },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED GAME CARD — entrance animation + Play Now (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export default function ExpandedGameCard({ slot, onPlay, onDismiss, startX = 0 }) {
  const slideX     = useRef(new Animated.Value(startX)).current;
  const scale      = useRef(new Animated.Value(startX !== 0 ? 0.45 : 0.75)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0.4)).current;
  const glowLoop   = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideX,  { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

      glowLoop.current = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      glowLoop.current.start();
    });
    return () => glowLoop.current?.stop();
  }, []);

  return (
    <Animated.View style={[eg.container, { opacity, transform: [{ translateX: slideX }, { scale }] }]}>
      {/* Glow ring wraps the card face */}
      <View style={eg.glowRingWrap}>
        <Animated.View style={[eg.glowRing, { opacity: glowAnim }]} />
        <GameCardFace slot={slot} size={CARD_SIZE} />
      </View>

      <Text style={eg.gameName}>{slot?.name ?? "Game Unlocked!"}</Text>

      <Animated.View style={[eg.btnWrap, { opacity: btnOpacity }]}>
        <TouchableOpacity style={eg.playBtn} onPress={onPlay} activeOpacity={0.85}>
          <ExpoImage
            source={require("../../../assets/img/play-icon-2.png")}
            style={eg.playIcon}
            contentFit="contain"
          />
          <Text style={eg.playBtnText}>Play Now</Text>
        </TouchableOpacity>

        {onDismiss && (
          <TouchableOpacity style={eg.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={eg.laterText}>Maybe later</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
const eg = StyleSheet.create({
  container:    { alignItems: "center", paddingTop: pad.sm, width: "100%" },
  glowRingWrap: { width: CARD_SIZE + 24, height: CARD_SIZE + 24, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  glowRing: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius:  radius.xl + 10,
    borderWidth:   2.5,
    borderColor:   "rgba(245,166,35,0.8)",
    shadowColor:   COLORS.amber,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius:  18,
    elevation:     0,
  },
  gameName: {
    fontFamily: FONTS.bold, fontSize: font.xl, color: COLORS.textPrimary,
    marginTop: pad.md, marginBottom: pad.xs, letterSpacing: 0.3,
    textShadowColor: "rgba(245,166,35,0.4)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  btnWrap:     { width: "100%", alignItems: "center", marginTop: pad.sm },
  playBtn: {
    flexDirection: "row", alignItems: "center", gap: pad.sm,
    width: "100%", paddingVertical: pad.md, borderRadius: radius.pill,
    backgroundColor: COLORS.primary, justifyContent: "center",
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 12, elevation: 10,
  },
  playIcon:    { width: 22, height: 22 },
  playBtnText: { fontFamily: FONTS.bold, fontSize: font.lg, color: COLORS.background, letterSpacing: 0.3 },
  laterBtn:    { marginTop: pad.sm, paddingVertical: pad.s, paddingHorizontal: pad.sm },
  laterText:   { fontFamily: FONTS.light, fontSize: font.sm, color: COLORS.textMuted },
});
