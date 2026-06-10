// ─────────────────────────────────────────────────────────────────────────────
// app/theme/index.js  —  StoryTime Design System
//
// SINGLE SOURCE OF TRUTH for all colours, fonts, shadows, buttons,
// gamification tokens, animation timings, and border radii.
//
// Components and screens must NEVER hard-code brand colours or values.
// Always import from here.
//
// Brand Guideline refs:
//   §3.1 / §3.2  — Colour palette
//   §3.3         — Colour role map (amber = rewards/CTAs ONLY)
//   §3.4 / §3.5  — Typography (Co Text — app font confirmed in _layout.jsx)
//   §3.6         — Spacing system (base-8 grid)
//   §3.7         — Border radius
//   §5.1         — Core app theme (Midnight Navy background everywhere)
//   §5.2         — Screen-level rules
//   §5.3         — Buttons
//   §5.4         — Cards
//   §5.5         — Gamification elements
//   §5.6         — Activity colour system v2.0 (SINGLE SOURCE OF TRUTH)
//   §5.7         — Animation & motion
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FONTS  —  Co Text family (confirmed in _layout.jsx useFonts())
//
// Co Text is the app font. Nunito/Nunito Sans in the brand doc
// refers to the website/marketing materials — NOT the app.
//
// Rules:
//   - NEVER combine fontFamily with fontWeight in the same style object
//   - Use the correct variant file directly (Bold file = bold weight)
//   - FONTS.bold   → headings, buttons, accents, labels
//   - FONTS.regular → body copy, UI labels, input text
//   - FONTS.light  → captions, muted text, by-lines
// ─────────────────────────────────────────────────────────────────────────────
export const FONTS = {
  bold:    "CoText-Bold",    // Co-Text-Bold.otf   — headings, buttons, accents
  regular: "CoText",         // Co-Text.otf         — body copy, UI labels
  light:   "CoText-Light",   // Co-Text-Light.otf   — captions, muted text
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY STYLES  —  §3.4 / §3.5
// Ready-to-spread text style objects matching brand type scale.
// ─────────────────────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  // Display / Hero — splash, onboarding hero text
  display: {
    fontFamily: "CoText-Bold",
    letterSpacing: -1.5,
  },

  // H1 — section hero headings
  h1: {
    fontFamily: "CoText-Bold",
    letterSpacing: -0.5,
  },

  // H2 — subsection headings, card titles
  h2: {
    fontFamily: "CoText-Bold",
    letterSpacing: 0,
  },

  // CTA / Button label
  cta: {
    fontFamily: "CoText-Bold",
    letterSpacing: 0,
  },

  // Eyebrow label — §3.4: 11–12px UPPERCASE letter-spacing +0.12em
  eyebrow: {
    fontFamily: "CoText-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,   // ~0.12em at 12px
  },

  // Body large — §3.5: line-height 1.7
  bodyLarge: {
    fontFamily: "CoText",
    lineHeight: 1.7,      // apply as: fontSize * 1.7 in RN
  },

  // Body default — §3.5: line-height 1.65
  body: {
    fontFamily: "CoText",
    lineHeight: 1.65,
  },

  // Body small / semibold
  bodySmall: {
    fontFamily: "CoText-Bold",
  },

  // Muted / caption
  caption: {
    fontFamily: "CoText-Light",
    letterSpacing: 0.4,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RAW PALETTE  —  internal only, do not import directly in screens
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = {
  // Primary backgrounds
  midnightNavy:  "#0A1628",   // §5.1 — primary bg ALL screens
  navy2:         "#0F2040",   // §3.2 — card/surface/modal bg
  navy3:         "#162848",   // elevated surface (modals over modals)
  navyLegacy:    "#08081a",   // legacy screens — avoid in new work

  // Brand accents
  cyan:          "#00C4CC",   // §3.1 — accent + Listen Quest
  cyanDark:      "#009BA3",   // pressed/hover state of cyan
  amber:         "#F5A623",   // §3.1 — rewards & CTAs ONLY
  amberDark:     "#D08C10",   // pressed/hover state of amber
  purple:        "#7B2FBE",   // §3.1 — Guess activity + premium
  coral:         "#E8445A",   // §3.1 — Read activity + error/streak
  teal:          "#2A9D8F",   // §3.2 — Describe activity + calm-growth
  offWhite:      "#F0F4F8",   // §3.2 — light sections (web/marketing)

  // Text
  white:         "#FFFFFF",
  textMuted:     "#8899AA",   // §3.2 exact hex — do NOT use rgba

  // Surfaces
  surfaceCard:   "rgba(255,255,255,0.04)",   // §5.4 feature card bg
  surfaceBorder: "rgba(255,255,255,0.08)",   // §5.4 feature card border
  surfaceDim:    "rgba(255,255,255,0.06)",   // input backgrounds

  // Overlays
  overlay:       "rgba(0,0,0,0.70)",
  overlayLight:  "rgba(0,0,0,0.45)",

  // Glows (ambient bg blobs)
  glowCyan:      "rgba(0,196,204,0.08)",
  glowPurple:    "rgba(123,47,190,0.08)",
  glowCyanBtn:   "rgba(0,196,204,0.25)",

  // Borders
  borderCyan:    "rgba(0,196,204,0.25)",
  borderCyanBold:"rgba(0,196,204,0.60)",
  borderFaint:   "rgba(255,255,255,0.12)",

  // Listen card special text — §5.6: white on cyan fails WCAG AA
  listenCardText:"#003A3C",
};

// ─────────────────────────────────────────────────────────────────────────────
// COLORS  —  semantic map — USE THESE in all screens and components
//
// §3.3 COLOUR ROLE MAP — roles must never be mixed:
//   Amber  → rewards, coins, stars, CTA buttons ONLY. Never activity cards.
//   Cyan   → Listen Quest activity + brand accent (nav, links, rings)
//   Coral  → Read the Story activity + error/streak. Not for standard buttons.
//   Purple → Guess the Word activity + premium signal
//   Teal   → Describe/Spot the Truth activity + calm-growth UI
//   Navy   → background ONLY. Never as text or icon colour.
// ─────────────────────────────────────────────────────────────────────────────
export const COLORS = {

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  background:       PALETTE.midnightNavy,   // §5.1 ALL screens — #0A1628
  backgroundAlt:    PALETTE.navyLegacy,     // legacy screens only — #08081a
  surface:          PALETTE.navy2,          // cards, modals — #0F2040
  surfaceElevated:  PALETTE.navy3,          // modals over modals — #162848
  surfaceCard:      PALETTE.surfaceCard,    // §5.4 glass card bg
  surfaceBorder:    PALETTE.surfaceBorder,  // §5.4 glass card border
  surfaceDim:       PALETTE.surfaceDim,     // input bg
  overlay:          PALETTE.overlay,        // modal backdrop
  overlayLight:     PALETTE.overlayLight,   // lighter modal backdrop

  // ── Brand accents ────────────────────────────────────────────────────────────
  // §3.3: use semantic names below — never the raw colour name in components
  primary:          PALETTE.cyan,           // brand primary interactive
  primaryDark:      PALETTE.cyanDark,       // pressed/hover
  secondary:        PALETTE.amber,          // CTA/rewards
  secondaryDark:    PALETTE.amberDark,      // pressed/hover

  // Named aliases — for components that need the colour name explicitly
  cyan:             PALETTE.cyan,
  cyanDark:         PALETTE.cyanDark,
  amber:            PALETTE.amber,
  amberDark:        PALETTE.amberDark,
  purple:           PALETTE.purple,
  coral:            PALETTE.coral,
  teal:             PALETTE.teal,
  offWhite:         PALETTE.offWhite,

  // ── Activity colours — §5.6 v2.0 SINGLE SOURCE OF TRUTH ─────────────────────
  // Apply identically on ALL screens: home buttons, detail cards,
  // mini dots, dashboard labels, and all future components.
  // NEVER substitute, invent alternatives, or use retired colours.
  activityColors: {
    read:     "#E8445A",   // Coral   — Read the Story
    guess:    "#7B2FBE",   // Purple  — Guess the Word
    listen:   "#00C4CC",   // Cyan    — Listen Quest
    describe: "#2A9D8F",   // Teal    — Describe / Spot the Truth
  },

  // §5.6: Listen card uses dark navy text (white on cyan fails WCAG AA)
  listenCardText: PALETTE.listenCardText,   // #003A3C

  // ── Text ─────────────────────────────────────────────────────────────────────
  textPrimary:      PALETTE.white,                     // #FFFFFF
  textSecondary:    "rgba(255,255,255,0.85)",           // subtitles, taglines
  textMuted:        PALETTE.textMuted,                 // #8899AA — exact hex §3.2
  textDisabled:     "rgba(255,255,255,0.30)",           // by-lines, placeholder
  textOnPrimary:    PALETTE.midnightNavy,               // navy text ON cyan btn §5.3
  textOnSecondary:  PALETTE.midnightNavy,               // navy text ON amber btn §5.3
  white:            PALETTE.white,

  // ── Borders ──────────────────────────────────────────────────────────────────
  borderPrimary:    PALETTE.borderCyan,                // rgba(0,196,204,0.25)
  borderBold:       PALETTE.borderCyanBold,            // rgba(0,196,204,0.60)
  borderFaint:      PALETTE.borderFaint,               // rgba(255,255,255,0.12)

  // Legacy aliases — keep so existing screens don't break during migration
  darkBg:           PALETTE.midnightNavy,   // legacy alias → use COLORS.background
  darkBg2:          PALETTE.navy2,          // legacy alias → use COLORS.surface
  borderTeal:       PALETTE.borderCyan,     // legacy alias → use COLORS.borderPrimary
  borderCyan:       PALETTE.borderCyan,
  borderCyanBold:   PALETTE.borderCyanBold,
  surfacePurple:    "rgba(123,47,190,0.35)",
  tealGlow:         PALETTE.glowCyan,       // legacy alias

  // ── Glows ────────────────────────────────────────────────────────────────────
  glowCyan:         PALETTE.glowCyan,       // rgba(0,196,204,0.08) — bg blobs
  glowPurple:       PALETTE.glowPurple,     // rgba(123,47,190,0.08)
  glowCyanBtn:      PALETTE.glowCyanBtn,    // rgba(0,196,204,0.25) — btn border glow

  // ── Gamification — §5.5 ──────────────────────────────────────────────────────
  coinColor:        PALETTE.amber,          // #F5A623 — coins, star fill
  diamondColor:     PALETTE.cyan,           // #00C4CC — diamond counter number
  streakActive:     PALETTE.coral,          // #E8445A — active streak flame
  starEarned:       PALETTE.amber,          // #F5A623 — filled star
  starUnearned:     "transparent",          // unearned star (stroke only)
  progressRingStroke: PALETTE.cyan,         // #00C4CC — §5.5
  progressRingTrack:  "rgba(255,255,255,0.08)", // §5.5

  // ── State opacities — §5.3 / §5.6 ───────────────────────────────────────────
  // Use these as the `opacity` prop value — never change colour to grey
  disabledOpacity:  0.4,    // §5.3 disabled buttons
  lockedOpacity:    0.45,   // §5.6 locked activity cards

  // ── Utility ──────────────────────────────────────────────────────────────────
  error:            PALETTE.coral,          // #E8445A
  success:          PALETTE.teal,           // #2A9D8F
  black:            "#000000",              // NEVER use as background — §9.1
};

// ─────────────────────────────────────────────────────────────────────────────
// SPACING  —  §3.6 base-8 grid
// ─────────────────────────────────────────────────────────────────────────────
export const SPACING = {
  xs:      4,    // within components
  sm:      8,    // within components
  md:      16,   // standard component padding
  lg:      24,   // between components
  xl:      48,   // between sections
  hero:    80,   // section / hero padding
  section: 120,  // top-level section separation
};

// ─────────────────────────────────────────────────────────────────────────────
// BORDER RADIUS  —  §3.7
// ─────────────────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:              8,    // small chips, badges
  md:              12,   // inputs, small cards
  lg:              16,   // story cards, large cards
  xl:              20,   // feature/pricing cards (upper bound §3.7)
  card:            20,   // §3.7 feature card radius
  activityCardSm:  12,   // §3.7 home screen 4-button row
  activityCardLg:  16,   // §3.7 story detail 2×2 grid
  btn:             50,   // §3.7 ALL primary + secondary buttons — pill
  appIcon:         22,   // §3.7 18–20% of icon size
};

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON STYLES  —  §5.3
// Ready-to-spread style objects. Apply with: style={[BUTTON_STYLES.primary, ...]}
// ─────────────────────────────────────────────────────────────────────────────
export const BUTTON_STYLES = {
  // Primary — Amber bg, Navy text, pill radius, exact brand padding
  primary: {
    backgroundColor: PALETTE.amber,
    borderRadius:    RADIUS.btn,
    paddingVertical:   15,   // §5.3 exact
    paddingHorizontal: 30,   // §5.3 exact
  },
  primaryText: {
    fontFamily: FONTS.bold,
    color:      PALETTE.midnightNavy,   // Navy on Amber — §5.3
  },

  // Cyan CTA — Cyan bg, Navy text — for in-app Continue actions
  cyanCta: {
    backgroundColor: PALETTE.cyan,
    borderRadius:    RADIUS.btn,
    paddingVertical:   15,
    paddingHorizontal: 30,
  },
  cyanCtaText: {
    fontFamily: FONTS.bold,
    color:      PALETTE.midnightNavy,   // Navy on Cyan — §5.3
  },

  // Secondary — transparent, white border
  secondary: {
    backgroundColor: "transparent",
    borderRadius:    RADIUS.btn,
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.28)",
  },
  secondaryText: {
    fontFamily: FONTS.bold,
    color:      PALETTE.white,
  },

  // Destructive — Coral bg, white text — delete/irreversible ONLY
  destructive: {
    backgroundColor: PALETTE.coral,
    borderRadius:    RADIUS.btn,
    paddingVertical:   15,
    paddingHorizontal: 30,
  },
  destructiveText: {
    fontFamily: FONTS.bold,
    color:      PALETTE.white,
  },

  // Disabled — apply as opacity prop, never change colour to grey — §5.3
  disabledOpacity: COLORS.disabledOpacity,   // 0.4
};

// ─────────────────────────────────────────────────────────────────────────────
// GAMIFICATION  —  §5.5
// Token set for all reward/progress UI elements
// ─────────────────────────────────────────────────────────────────────────────
export const GAMIFICATION = {
  // Progress ring
  ringStroke:      PALETTE.cyan,                   // #00C4CC
  ringTrack:       "rgba(255,255,255,0.08)",
  ringStrokeWidth: 7,                              // mid of 6–8px range

  // Coin counter
  coinColor:       PALETTE.amber,                  // #F5A623
  coinFontFamily:  FONTS.bold,

  // Diamond counter — number is Cyan, NOT amber
  diamondColor:    PALETTE.cyan,                   // #00C4CC

  // Streak
  streakActive:    PALETTE.coral,                  // #E8445A — flame when active
  streakInactive:  PALETTE.textMuted,              // #8899AA

  // Stars
  starEarned:      PALETTE.amber,                  // #F5A623 filled
  starUnearned:    "transparent",                  // stroke only

  // Activity card locked state — §5.6
  lockedOpacity:   0.45,                           // opacity on full card
  // Keep activity hex — do NOT change colour when locked
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION  —  §5.7
// Use these values in all Animated.timing / spring / CSS transition calls
// ─────────────────────────────────────────────────────────────────────────────
export const ANIMATION = {
  // Micro-interactions — button press, tap feedback
  pressDuration:   180,    // ms — mid of 150–200ms range
  pressScale:      0.95,   // scale down to 0.95 on press

  // Screen transitions
  screenDuration:  320,    // ms — mid of 300–350ms range

  // Reward animations — coins/diamonds burst
  rewardDuration:  700,    // ms — mid of 600–800ms range

  // Splash / intro sequences
  splashLogo:      900,
  splashTitle:     450,
  splashSub:       350,

  // Loading skeleton shimmer
  shimmerDuration: 1200,

  // §5.7: Never flash, strobe, or rapid colour change
  // §5.7: No animation under prefers-reduced-motion (handle in components)
};

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────────────────────────
export const SHADOWS = {
  // Cyan / primary glow — nav borders, active rings, cyan buttons
  primaryGlow: {
    shadowColor:   PALETTE.cyan,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  10,
    elevation:     6,
  },
  // Legacy alias — existing screens use SHADOWS.tealGlow
  tealGlow: {
    shadowColor:   PALETTE.cyan,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  10,
    elevation:     6,
  },
  // Amber / secondary glow — CTA buttons, reward elements
  amberGlow: {
    shadowColor:   PALETTE.amber,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius:  8,
    elevation:     5,
  },
  // Card shadow — general elevated card
  card: {
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius:  8,
    elevation:     4,
  },
  // cyanGlow alias (used in some screens)
  cyanGlow: {
    shadowColor:   PALETTE.cyan,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  10,
    elevation:     6,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND CIRCLES  —  ambient glow blobs via AppBackground component
// ─────────────────────────────────────────────────────────────────────────────
export const BG_CIRCLES = [
  {
    key: "c1",
    size: 350,
    color: PALETTE.cyan,
    top: -80, right: -80,
    bottom: undefined, left: undefined,
  },
  {
    key: "c2",
    size: 200,
    color: PALETTE.amber,
    bottom: 100, left: -60,
    top: undefined, right: undefined,
  },
  {
    key: "c3",
    size: 150,
    color: PALETTE.coral,
    bottom: 200, right: -40,
    top: undefined, left: undefined,
  },
];

export const BG_PULSE_CONFIGS = [
  { min: 0.92, max: 1.08, duration: 2500, delay: 0 },
  { min: 0.88, max: 1.12, duration: 2000, delay: 700 },
  { min: 0.9,  max: 1.1,  duration: 1700, delay: 1300 },
];
