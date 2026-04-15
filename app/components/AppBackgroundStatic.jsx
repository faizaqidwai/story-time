// ─────────────────────────────────────────────────────────────
// AppBackgroundStatic.jsx  —  Drop-in dark background with
// static (non-animated) circles.  Same visual as AppBackground
// but with zero animation overhead — use on heavy screens like
// home.jsx where multiple useEffects and lists are rendering.
//
// Usage:
//   import AppBackgroundStatic from "./components/AppBackgroundStatic";
//
//   return (
//     <AppBackgroundStatic>
//       <YourScreenContent />
//     </AppBackgroundStatic>
//   );
// ─────────────────────────────────────────────────────────────
import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS, BG_CIRCLES } from "../theme";

const AppBackgroundStatic = ({ children, style }) => {
  return (
    <View style={[styles.background, style]}>
      {BG_CIRCLES.map((circle) => (
        <View
          key={circle.key}
          style={[
            styles.circle,
            {
              width: circle.size,
              height: circle.size,
              backgroundColor: circle.color,
              top: circle.top,
              right: circle.right,
              bottom: circle.bottom,
              left: circle.left,
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

export default AppBackgroundStatic;
