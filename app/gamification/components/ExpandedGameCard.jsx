/**
 * ExpandedGameCard.jsx
 * app/gamification/components/ExpandedGameCard.jsx
 *
 * Shared "revealed game" panel used in two places:
 *   - UnlockModal   — after all diamonds land, card slides to center
 *   - StoryFinishOverlay — after scratch fully reveals (story 3 or 6)
 *
 * Handles its own entrance animation (slide + scale from startX offset).
 * Parent just mounts it when ready.
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
import { FONTS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";
import { GAME_ANIMATIONS } from "../constants/gameAnimations";

const CARD_SIZE = 160;

const C = {
  teal:       "#00BCD4",
  yellow:     "#FFD54F",
  yellowGlow: "rgba(255,213,79,0.45)",
  purple:     "#B39DDB",
  textPri:    "#E0F7FA",
  textMuted:  "#7a9aaa",
};

// ─────────────────────────────────────────────────────────────────────────────
// GAME CARD FACE — renders gradient, circles, and mini animation
// ─────────────────────────────────────────────────────────────────────────────
export function GameCardFace({ slot, size = CARD_SIZE }) {
  const gradient  = slot?.gradient  ?? ["#00BCD4", "#0097A7"];
  const MiniAnim  = slot?.gameId ? GAME_ANIMATIONS[slot.gameId] : null;

  return (
    <View style={{
      width: size, height: size,
      borderRadius: radius.xl, overflow: "hidden",
    }}>
      {/* Background */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[1] }]} />
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: gradient[0], height: "60%", opacity: 0.92,
      }]} />
      {/* Decorative circles */}
      <View style={[cs.circle1, { width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35, top: -size * 0.18, right: -size * 0.18 }]} />
      <View style={[cs.circle2, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, bottom: size * 0.1, left: -size * 0.1 }]} />
      {/* Mini animation */}
      <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
        {MiniAnim
          ? <MiniAnim />
          : <Text style={{ fontSize: size * 0.28 }}>{slot?.icon ?? "🎮"}</Text>
        }
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  circle1: { position: "absolute", backgroundColor: "rgba(255,255,255,0.08)" },
  circle2: { position: "absolute", backgroundColor: "rgba(255,255,255,0.05)" },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED GAME CARD
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Props:
 *   slot       — the game slot object ({ gameId, name, gradient, icon, ... })
 *   onPlay     — called when user taps Play Now
 *   onDismiss  — called when user taps Maybe later
 *   startX     — translateX offset to start from (for slide-in from right side)
 *                pass 0 for centered entrance (StoryFinishOverlay)
 *                pass positive value to slide from right (UnlockModal)
 */
export default function ExpandedGameCard({ slot, onPlay, onDismiss, startX = 0 }) {
  const slideX    = useRef(new Animated.Value(startX)).current;
  const scale     = useRef(new Animated.Value(startX !== 0 ? 0.45 : 0.75)).current;
  const opacity   = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0.4)).current;
  const glowLoop  = useRef(null);

  useEffect(() => {
    // Slide + scale into center simultaneously
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }),
      Animated.spring(slideX, {
        toValue: 0, friction: 7, tension: 50, useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1, friction: 6, tension: 50, useNativeDriver: true,
      }),
    ]).start(() => {
      // Play button fades in after card settles
      Animated.timing(btnOpacity, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }).start();

      // Glow pulse loop
      glowLoop.current = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      glowLoop.current.start();
    });

    return () => glowLoop.current?.stop();
  }, []);

  return (
    <Animated.View style={[
      eg.container,
      { opacity, transform: [{ translateX: slideX }, { scale }] },
    ]}>
      {/* Glow ring — wraps the card face precisely */}
      <View style={eg.glowRingWrap}>
        <Animated.View style={[eg.glowRing, { opacity: glowAnim }]} />
        {/* Game card face */}
        <GameCardFace slot={slot} size={CARD_SIZE} />
      </View>

      {/* Game name */}
      <Text style={eg.gameName}>{slot?.name ?? "Game Unlocked!"}</Text>

      {/* Play button */}
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

const eg = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: pad.sm,
    width: "100%",
  },
  glowRingWrap: {
    // Explicit size: card + 12px padding on all 4 sides equally
    width:  CARD_SIZE + 24,
    height: CARD_SIZE + 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  glowRing: {
    position:    "absolute",
    top:         0,
    left:        0,
    right:       0,
    bottom:      0,
    borderRadius: radius.xl + 10,
    borderWidth:  2.5,
    borderColor:  "rgba(255,213,79,0.8)",
    shadowColor:  C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius:  18,
    elevation: 0,
  },
  gameName: {
    fontFamily:   FONTS.bold,
    fontSize:     font.xl,
    color:        C.textPri,
    marginTop:    pad.md,
    marginBottom: pad.xs,
    letterSpacing: 0.3,
    textShadowColor:  "rgba(255,213,79,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  btnWrap: {
    width:      "100%",
    alignItems: "center",
    marginTop:  pad.sm,
  },
  playBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            pad.sm,
    width:          "100%",
    paddingVertical: pad.md,
    borderRadius:   radius.pill,
    backgroundColor: C.teal,
    justifyContent: "center",
    shadowColor:    C.teal,
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0.7,
    shadowRadius:   12,
    elevation: 10,
  },
  playIcon: { width: 22, height: 22 },
  playBtnText: {
    fontFamily:   FONTS.bold,
    fontSize:     font.lg,
    color:        "#08081a",
    letterSpacing: 0.3,
  },
  laterBtn: {
    marginTop:        pad.sm,
    paddingVertical:  pad.s,
    paddingHorizontal: pad.sm,
  },
  laterText: {
    fontFamily: FONTS.light,
    fontSize:   font.sm,
    color:      C.textMuted,
  },
});
