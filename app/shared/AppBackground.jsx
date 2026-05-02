// ─────────────────────────────────────────────────────────────
// AppBackground.jsx  —  Drop-in dark background with animated
// pulsing circles.  Wrap any screen content with this.
//
// Usage:
//   import AppBackground from "./components/AppBackground";
//
//   return (
//     <AppBackground>
//       <YourScreenContent />
//     </AppBackground>
//   );
// ─────────────────────────────────────────────────────────────
import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { COLORS, BG_CIRCLES, BG_PULSE_CONFIGS } from "../theme";

const AppBackground = ({ children, style }) => {
  // One Animated.Value per circle
  const pulseAnims = useRef(
    BG_PULSE_CONFIGS.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    BG_PULSE_CONFIGS.forEach(({ min, max, duration, delay }, i) => {
      const startAnim = () =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[i], {
              toValue: max,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnims[i], {
              toValue: min,
              duration,
              useNativeDriver: true,
            }),
          ]),
        ).start();

      if (delay > 0) {
        setTimeout(startAnim, delay);
      } else {
        startAnim();
      }
    });
  }, []);

  return (
    <View style={[styles.background, style]}>
      {BG_CIRCLES.map((circle, i) => (
        <Animated.View
          key={circle.key}
          style={[
            styles.circle,
            {
              width:  circle.size,
              height: circle.size,
              backgroundColor: circle.color,
              top:    circle.top,
              right:  circle.right,
              bottom: circle.bottom,
              left:   circle.left,
              transform: [{ scale: pulseAnims[i] }],
            },
          ]}
        />
      ))}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.18,
  },
});

export default AppBackground;
