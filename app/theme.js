// ─────────────────────────────────────────────────────────────
// theme.js  —  Shared design tokens for the app
// Usage:  import { COLORS, CIRCLE_STYLES, SHADOWS } from "./theme";
// ─────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  darkBg:      "#1a1a2e",
  darkBg2:     "#16213e",   // slightly lighter, used for modal surfaces

  // Accent palette
  teal:        "#00BCD4",
  tealLight:   "#B2EBF2",
  tealFaint:   "#E0F7FA",
  yellow:      "#FFD54F",
  coral:       "#FF7043",
  pink:        "#EC407A",
  purple:      "#9652D9",
  purpleLight: "#E8D5FF",

  // Text
  textPrimary:   "#E0F7FA",
  textSecondary: "#B2EBF2",
  textMuted:     "#7a9aaa",

  // Borders / surfaces
  borderTeal:    "rgba(0,188,212,0.35)",
  borderTealBold:"rgba(0,188,212,0.6)",
  surfaceDim:    "rgba(255,255,255,0.07)",
  surfacePurple: "rgba(150,82,217,0.35)",
};

// Background circle definitions — position + size only
// Applied via AppBackground component
export const BG_CIRCLES = [
  { key: "c1", size: 350, color: COLORS.teal,   top: -80,   right: -80,  bottom: undefined, left: undefined },
  { key: "c2", size: 200, color: COLORS.yellow, bottom: 100, left: -60,  top: undefined,    right: undefined },
  { key: "c3", size: 150, color: COLORS.coral,  bottom: 200, right: -40, top: undefined,    left: undefined },
];

// Pulse animation configs per circle
export const BG_PULSE_CONFIGS = [
  { min: 0.92, max: 1.08, duration: 2500, delay: 0    },
  { min: 0.88, max: 1.12, duration: 2000, delay: 700  },
  { min: 0.90, max: 1.10, duration: 1700, delay: 1300 },
];

export const SHADOWS = {
  tealGlow: {
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
