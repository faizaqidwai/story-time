// app/theme/tokens.js
//
// Responsive design tokens — phone value / tablet value.
// Import { font, size, radius, pad } and just use the token.
// Device detection is automatic — no hooks, no context needed.
//
// Usage:
//   import { font, size, radius, pad } from "../theme/tokens";
//
//   fontSize: font.sm        → 14 on phone, 18 on tablet
//   padding:  pad.md         → 16 on phone, 22 on tablet
//   width:    size.iconSm    → 24 on phone, 32 on tablet

import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
const isTablet = Math.min(width, height) >= 768;
const t = (phone, tablet) => (isTablet ? tablet : phone);

// ─────────────────────────────────────────────────────────────────────────────
// FONT SIZES
// ─────────────────────────────────────────────────────────────────────────────
export const font = {
  xs: t(9, 14),
  s: t(12, 15),
  sm: t(13, 17),
  md: t(15, 19),
  lg: t(17, 22),
  xl: t(20, 30),
  xxl: t(24, 32),
  h3: t(28, 38),
  h2: t(34, 56),
  h1: t(40, 74),
};

// ─────────────────────────────────────────────────────────────────────────────
// SPACING / PADDING / MARGIN
// ─────────────────────────────────────────────────────────────────────────────
export const pad = {
  xs: t(4, 6),
  s: t(8, 14),
  sm: t(12, 18),
  md: t(16, 24),
  lg: t(20, 30),
  xl: t(24, 36),
  xxl: t(32, 46),
  xxxl: t(48, 66),
  xxxxl: t(60, 80),
};

// ─────────────────────────────────────────────────────────────────────────────
// BORDER RADIUS
// ─────────────────────────────────────────────────────────────────────────────
export const radius = {
  xs: t(6, 8),
  sm: t(10, 14),
  md: t(14, 19),
  lg: t(18, 24),
  xl: t(24, 32),
  xxl: t(32, 44),
  pill: 999,
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SIZES  (icon sizes, button heights, avatar sizes, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const size = {
  // Icons
  iconXs: t(16, 22),
  iconSm: t(20, 28),
  iconMd: t(24, 32),
  iconLg: t(32, 44),
  iconXl: t(48, 64),

  // Buttons
  btnHeightSm: t(36, 48),
  btnHeightMd: t(44, 58),
  btnHeightLg: t(54, 70),

  // Avatars / badges
  avatarSm: t(32, 44),
  avatarMd: t(44, 60),
  avatarLg: t(60, 80),

  // Touch targets (back buttons, menu buttons)
  hitSm: t(36, 48),
  hitMd: t(40, 52),
  hitLg: t(48, 64),

  // Card chips (e.g. credit card brand badge)
  chipW: t(44, 60),
  chipH: t(30, 40),
};

// ─────────────────────────────────────────────────────────────────────────────
// LINE HEIGHTS  (paired with font sizes above)
// ─────────────────────────────────────────────────────────────────────────────
export const lineHeight = {
  xs: t(13, 17),
  s: t(16, 20),
  sm: t(19, 24),
  md: t(22, 28),
  lg: t(26, 33),
  xl: t(30, 39),
  xxl: t(34, 44),
};

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE — export isTablet so screens can use it for layout decisions
// ─────────────────────────────────────────────────────────────────────────────
export { isTablet };
