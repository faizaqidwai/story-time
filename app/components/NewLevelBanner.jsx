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
import { FONTS } from "../theme";

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
    marginBottom: 10,
    zIndex: 20,
  },
  glowRing: {
    position: "absolute",
    top: -6,
    left: -12,
    right: -12,
    bottom: -6,
    borderRadius: 24,
    backgroundColor: "rgba(0,188,212,0.18)",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0d1f35",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#00BCD4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
  star: { fontSize: 20 },

  // CoText-Bold — banner headline, needs urgency and weight
  title: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: "#E0F7FA",
    letterSpacing: 0.3,
  },

  // CoText-Bold — short CTA, keep same weight family
  sub: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: "#00BCD4",
    marginTop: 1,
  },

  // Decorative glyph — no fontFamily needed
  arrow: { fontSize: 22, color: "#00BCD4", marginLeft: 4 },
});
