// ─────────────────────────────────────────────────────────────────────────────
// NewLevelBanner
//
// Shown on the home screen when a level progression call failed offline.
// Pulsing, prominent — sits above the LevelBadge.
// Tapping it re-opens the LevelProgressionOverlay to retry the backend call.
//
// Props:
//   onPress — () => void
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { FONTS, COLORS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";

export default function NewLevelBanner({ onPress }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[s.wrapper, { transform: [{ scale: pulse }] }]}>
      {/* Glow ring behind button */}
      <Animated.View style={[s.glowRing, { opacity: glow }]} />
      <TouchableOpacity style={s.btn} onPress={onPress} activeOpacity={0.85}>
        <Text style={s.star}>⭐</Text>
        <View>
          <Text style={s.title}>New Level Awaits!</Text>
          <Text style={s.sub}>Tap to advance →</Text>
        </View>
        <Text style={s.arrow}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginBottom: pad.s, // 10 → pad.s (8/11)
    zIndex: 20,
  },
  glowRing: {
    position: "absolute",
    top: -pad.xs, // -6 → -pad.xs (-4/-6)
    left: -pad.sm, // -12 → -pad.sm (-12/-16)
    right: -pad.sm, // -12 → -pad.sm
    bottom: -pad.xs, // -6 → -pad.xs
    borderRadius: radius.xl, // 24 → radius.xl (24/32)
    backgroundColor: "rgba(0,196,204,0.18)",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s, // 8 → pad.s (8/11)
    backgroundColor: "#0F2040",
    borderRadius: radius.xl, // 20 → radius.xl (24/32)
    borderWidth: 1.5,
    borderColor: "#00C4CC",
    paddingHorizontal: pad.md, // 16 → pad.md (16/22)
    paddingVertical: pad.s, // 10 → pad.s (8/11)
    shadowColor: "#00C4CC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
  star: { fontSize: size.iconSm }, // 20 → size.iconSm (20/28)

  // CoText-Bold — banner headline, needs urgency and weight
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.sm, // 13 → font.sm (13/17)
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // CoText-Bold — short CTA, keep same weight family
  sub: {
    fontFamily: FONTS.bold,
    fontSize: font.xs, // 10 → font.xs (9/12)
    color: "#00C4CC",
    marginTop: 1,
  },

  // Decorative glyph — no fontFamily needed
  arrow: { fontSize: font.xl, color: "#00C4CC", marginLeft: pad.xs }, // 22 → font.xl (20/26), marginLeft 4 → pad.xs (4/6)
});
