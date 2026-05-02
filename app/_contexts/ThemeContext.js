// app/_contexts/ThemeContext.js
//
// Detects device type on first load (phone vs tablet) and exposes
// the correct DEVICE_SIZES token set to every screen via context.
//
// Usage in any component:
//   import { useTheme } from "./_contexts/ThemeContext";
//   const { sizes, isTablet } = useTheme();

import React, { createContext, useContext, useMemo } from "react";
import { Dimensions } from "react-native";

import { DEVICE_SIZES as MOBILE_SIZES } from "../theme/theme-mobile";
import { DEVICE_SIZES as TABLET_SIZES } from "../theme/theme-tablet";

// ── Tablet breakpoint ─────────────────────────────────────────
// 768pt is the standard smallest iPad width in portrait mode.
const TABLET_BREAKPOINT = 768;

function detectIsTablet() {
  const { width, height } = Dimensions.get("window");
  const shorter = Math.min(width, height);
  console.log("=== THEME DEBUG ===");
  console.log("width:", width, "height:", height);
  console.log("shorter dimension:", shorter);
  console.log("isTablet:", shorter >= TABLET_BREAKPOINT);
  console.log(
    "storyCardTitleFontSize:",
    shorter >= TABLET_BREAKPOINT
      ? TABLET_SIZES.carousel.storyCardTitleFontSize
      : MOBILE_SIZES.carousel.storyCardTitleFontSize,
  );
  console.log("==================");
  return shorter >= TABLET_BREAKPOINT;
}

// ── Context ───────────────────────────────────────────────────
const ThemeContext = createContext({
  sizes: MOBILE_SIZES,
  isTablet: false,
});

// ── Provider ──────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  // Computed once on mount — device type doesn't change at runtime.
  // useMemo with [] ensures this runs exactly once.
  const value = useMemo(() => {
    const isTablet = detectIsTablet();
    return {
      sizes: isTablet ? TABLET_SIZES : MOBILE_SIZES,
      isTablet,
    };
  }, []);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
