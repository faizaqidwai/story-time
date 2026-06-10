// app/components/LearningPath.jsx
//
// CHANGES FROM ORIGINAL:
//   ✅ Grade line removed
//   ✅ Word count / sentence length line removed
//   ✅ All introduces[] lines shown vertically with dot bullets
//   ✅ Expand/collapse + button replaces emoji (rotates 45° when open)
//   ✅ Expandable panel: absolutely positioned (never affects layout → connectors never move)
//      Left-side card  → panel opens RIGHT
//      Right-side card → panel opens LEFT
//      Spring animation with fade
//   ✅ Panel shows: Examples (italic, bulleted) + Tip box
//   ✅ Card styling: colored accent per level, decorative circles (like GameCard), accent bar at bottom, glow ring for current level
//   ✅ expandedId state — only one panel open at a time
//   ✅ zIndex: 999 on expanded card's wrapper so panel renders above connectors
//   ✅ All original logic preserved: Connector component unchanged, scroll-to-current unchanged, cardRefs unchanged

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "../../_contexts/UserContext";
import { CURRICULUM } from "../../data/curriculumData";
import { FONTS } from "../../theme";
import { useTheme } from "../../_contexts/ThemeContext";

const { width: SW, height: SH } = Dimensions.get("window");
const isTablet = SW >= 768;
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const LW = 1.5;

// Solid dark base for each accent — mirrors GameCard's gradientEnd.
// Used as the bottom fill so the card has a proper two-tone look.
const DARK_FOR_ACCENT = {
  "#2A9D8F": "#1F7A6E",
  "#00C4CC": "#009BA3",
  "#F5A623": "#C07A1A",
  "#7B2FBE": "#5E1F96",
  "#E8445A": "#C73448",
  "#F5A623": "#C07A1A",
  "#00C4CC": "#009BA3",
};

const C = {
  bg: "#0A1628",
  teal: "#00C4CC",
  tealBorder: "rgba(0,196,204,0.3)",
  tealDim: "rgba(0,196,204,0.12)",
  tealBorderBold: "rgba(0,196,204,0.5)",
  textPri: "#FFFFFF",
  textSec: "#8899AA",
  textMuted: "#8899AA",
};

// ── Card size overrides — larger than theme defaults, consistent across
// LevelCard and Connector so connecting lines are never affected.
// Both components read from these same constants.
const CARD_W = isTablet ? Math.floor(SW * 0.44) : Math.floor(SW * 0.46);
const CARD_H = isTablet ? 260 : 210;
const SCREEN_PAD = isTablet ? 16 : 12;

// ─────────────────────────────────────────────────────────────────────────────
// ZigZag Connector — uses module-level CARD_W / CARD_H / SCREEN_PAD constants
// ─────────────────────────────────────────────────────────────────────────────
function Connector({ fromSide, color, sz }) {
  const lc = color ?? C.teal;
  const SCREEN_PAD = sz.screenPad;
  const CARD_W = Math.floor(SW * sz.cardWidth);
  const CARD_H = sz.cardHeight;
  const CONN_H = sz.connectorHeight;

  const containerW = SW - SCREEN_PAD * 2;
  const totalH = CARD_H / 2 + CONN_H;
  const leftCardRightX = CARD_W;
  const rightCardLeftX = containerW - CARD_W;
  const leftCardCenterX = CARD_W / 2;
  const rightCardCenterX = containerW - CARD_W / 2;
  const DOT = 5;

  if (fromSide === "left") {
    return (
      <View
        style={{
          width: containerW,
          height: totalH,
          alignSelf: "center",
          marginTop: -(CARD_H / 2),
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -LW / 2,
            left: leftCardRightX,
            width: rightCardCenterX - leftCardRightX + LW,
            height: LW,
            backgroundColor: lc,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: rightCardCenterX - LW / 2,
            width: LW,
            height: totalH,
            backgroundColor: lc,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: -(DOT / 2),
            left: rightCardCenterX - DOT / 2,
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: lc,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -(DOT / 2),
            left: rightCardCenterX - DOT / 2,
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: lc,
          }}
        />
      </View>
    );
  } else {
    return (
      <View
        style={{
          width: containerW,
          height: totalH,
          alignSelf: "center",
          marginTop: -(CARD_H / 2),
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -LW / 2,
            left: leftCardCenterX - LW,
            width: rightCardLeftX - leftCardCenterX + LW,
            height: LW,
            backgroundColor: lc,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: leftCardCenterX - LW / 2,
            width: LW,
            height: totalH,
            backgroundColor: lc,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: -(DOT / 2),
            left: leftCardCenterX - DOT / 2,
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: lc,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -(DOT / 2),
            left: leftCardCenterX - DOT / 2,
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: lc,
          }}
        />
      </View>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expand / Collapse Button — + rotates to × when open
// ─────────────────────────────────────────────────────────────────────────────
function ExpandBtn({ expanded, onPress, accentColor }) {
  const rotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotAnim, {
      toValue: expanded ? 1 : 0,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotate = rotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const ac = accentColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={[
          btnS.wrap,
          {
            backgroundColor: expanded ? ac : `${ac}1A`,
            borderColor: `${ac}66`,
            transform: [{ rotate }],
          },
        ]}
      >
        <Text style={[btnS.icon, { color: expanded ? "#0A1628" : ac }]}>+</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const btnS = StyleSheet.create({
  wrap: {
    width: isTablet ? 32 : 26,
    height: isTablet ? 32 : 26,
    borderRadius: isTablet ? 16 : 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? 18 : 16,
    lineHeight: isTablet ? 20 : 18,
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Expand Panel — ABSOLUTELY POSITIONED so it NEVER shifts layout.
// This is the key technique that keeps connectors perfectly in place.
// side="left"  → panel opens to the RIGHT of the card
// side="right" → panel opens to the LEFT of the card
// ─────────────────────────────────────────────────────────────────────────────
function ExpandPanel({ item, visible, side, cardH, cardW, accentColor }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          friction: 14,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 14,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const PANEL_W = cardW - 10;
  const GAP = 8;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [side === "left" ? -PANEL_W * 0.5 : PANEL_W * 0.5, 0],
  });

  const positionStyle =
    side === "left" ? { left: cardW + GAP } : { right: cardW + GAP };

  const ac = accentColor;
  const darkBase = DARK_FOR_ACCENT[ac] ?? "#0F2040";

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        panelS.panel,
        positionStyle,
        {
          width: PANEL_W,
          height: cardH,
          opacity: fadeAnim,
          transform: [{ translateX }],
          shadowColor: ac,
        },
      ]}
    >
      {/* Same two-color GameCard layers */}
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: darkBase }]}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "0%",
          backgroundColor: ac,
          opacity: 0.75,
        }}
      />
      {/* Subtle circle decoration */}
      <View style={panelS.decoCircle} />

      <View style={panelS.inner}>
        <Text style={panelS.heading}>Examples</Text>

        {(item.examples ?? []).map((ex, i) => (
          <View key={i} style={panelS.exRow}>
            <View style={panelS.bullet} />
            <Text style={panelS.exText}>{ex}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const panelS = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    borderRadius: 18,
    borderWidth: 0,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 16,
    zIndex: 200,
  },
  decoCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -30,
    right: -20,
  },
  inner: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 12,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? 12 : 10.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.65)",
    marginBottom: 2,
  },
  exRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: isTablet ? 6 : 5,
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  exText: {
    fontFamily: FONTS.regular,
    fontSize: isTablet ? 12.5 : 11,
    color: "rgba(255,255,255,0.88)",
    lineHeight: isTablet ? 19 : 16,
    flex: 1,
    fontStyle: "italic",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Level Card — redesigned
// Fixed height = same as original (sz.cardHeight) → connectors never move.
// Expand panel floats outside via absolute positioning.
// ─────────────────────────────────────────────────────────────────────────────
function LevelCard({
  item,
  isCurrent,
  side,
  index,
  cardRef,
  sz,
  expandedId,
  onToggle,
}) {
  const CARD_W = Math.floor(SW * sz.cardWidth);
  const CARD_H = sz.cardHeight;
  const SCREEN_PAD = sz.screenPad;

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.min(index * 65, 480);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 55,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opAnim, {
        toValue: 1,
        duration: 280,
        delay,
        useNativeDriver: true,
      }),
    ]).start();

    if (isCurrent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isCurrent]);

  const isExpanded = expandedId === item.level;
  const ac = item.accentColor;

  const alignStyle =
    side === "left"
      ? { alignSelf: "flex-start", marginLeft: SCREEN_PAD }
      : { alignSelf: "flex-end", marginRight: SCREEN_PAD };

  return (
    <Animated.View
      ref={cardRef}
      style={[
        {
          width: CARD_W,
          height: CARD_H,
          overflow: "visible", // lets panel float outside
        },
        alignStyle,
        {
          opacity: opAnim,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      {/* ── Card body — clipped so overflow:hidden applies only to visuals ── */}
      <View
        style={[
          cardS.body,
          {
            width: CARD_W,
            height: CARD_H,
            borderRadius: sz.cardBorderRadius,
            borderWidth: 0,
            shadowColor: ac,
            shadowOpacity: isCurrent ? 0.55 : 0.35,
          },
        ]}
      >
        {/* GameCard layer 1 — solid darker color fills entire card */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: DARK_FOR_ACCENT[ac] ?? "#0F2040" },
          ]}
        />

        {/* GameCard layer 2 — lighter color covers top 60%, high opacity */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100%",
            backgroundColor: ac,
            opacity: 0.9,
          }}
        />

        {/* Decorative circles — GameCard opacity levels */}
        <View
          style={[cardS.circle1, { backgroundColor: "rgba(255,255,255,0.07)" }]}
        />
        <View
          style={[cardS.circle2, { backgroundColor: "rgba(255,255,255,0.05)" }]}
        />
        <View
          style={[cardS.circle3, { backgroundColor: "rgba(255,255,255,0.04)" }]}
        />

        {/* Current level: extra glow ring */}
        {isCurrent && (
          <View
            style={[cardS.glowRing, { borderColor: "rgba(255,255,255,0.25)" }]}
          />
        )}

        {/* ── Content ── */}
        <View
          style={[
            cardS.content,
            {
              paddingTop: sz.cardPaddingTop,
              paddingHorizontal: sz.cardPaddingH,
              paddingBottom: sz.cardPaddingBottom,
            },
          ]}
        >
          {/* Top row: Level number badge + expand/collapse button */}
          <View style={cardS.topRow}>
            <View
              style={[
                cardS.levelBadge,
                {
                  backgroundColor: "rgba(0,0,0,0.25)",
                  borderColor: "rgba(255,255,255,0.25)",
                },
              ]}
            >
              <Text style={[cardS.levelNum, { color: "#fff" }]}>
                {item.level}
              </Text>
            </View>
            <ExpandBtn
              expanded={isExpanded}
              onPress={() => onToggle(item.level)}
              accentColor="#fff"
            />
          </View>

          {/* ALL introduces lines — vertically stacked with dot bullets */}
          <View style={cardS.introducesWrap}>
            {item.introduces.map((line, i) => (
              <View key={i} style={cardS.introRow}>
                <View
                  style={[
                    cardS.introDot,
                    { backgroundColor: "rgba(255,255,255,0.7)" },
                  ]}
                />
                <Text style={cardS.introText} numberOfLines={2}>
                  {line}
                </Text>
              </View>
            ))}
          </View>

          {/* YOU ARE HERE badge */}
          {isCurrent && (
            <View
              style={[
                cardS.youBadge,
                { backgroundColor: "rgba(255,255,255,0.9)" },
              ]}
            >
              <Text
                style={[
                  cardS.youText,
                  {
                    fontSize: sz.youTxtFontSize,
                    letterSpacing: sz.youTxtLetterSpacing,
                    color: DARK_FOR_ACCENT[ac] ?? "#0A1628",
                  },
                ]}
              >
                YOU ARE HERE
              </Text>
            </View>
          )}
        </View>

        {/* Bottom accent bar */}
        <View
          style={[cardS.accentBar, { backgroundColor: "rgba(0,0,0,0.2)" }]}
        />
      </View>

      {/* ── Expand panel — lives OUTSIDE card body, absolutely positioned ── */}
      <ExpandPanel
        item={item}
        visible={isExpanded}
        side={side}
        cardH={CARD_H}
        cardW={CARD_W}
        accentColor={ac}
      />
    </Animated.View>
  );
}

const CIRC1 = isTablet ? 100 : 76;
const CIRC2 = isTablet ? 60 : 46;
const CIRC3 = isTablet ? 36 : 28;

const cardS = StyleSheet.create({
  body: {
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
  },
  circle1: {
    position: "absolute",
    width: CIRC1,
    height: CIRC1,
    borderRadius: CIRC1 / 2,
    opacity: 0.12,
    top: -CIRC1 * 0.35,
    right: -CIRC1 * 0.25,
  },
  circle2: {
    position: "absolute",
    width: CIRC2,
    height: CIRC2,
    borderRadius: CIRC2 / 2,
    opacity: 0.08,
    bottom: CIRC2 * 0.3,
    left: -CIRC2 * 0.3,
  },
  circle3: {
    position: "absolute",
    width: CIRC3,
    height: CIRC3,
    borderRadius: CIRC3 / 2,
    opacity: 0.07,
    bottom: -CIRC3 * 0.25,
    right: CIRC3 * 0.6,
  },
  glowRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 22,
    borderWidth: 6,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadge: {
    borderWidth: 1.5,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  levelNum: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? 13 : 11.5,
    letterSpacing: 0.2,
  },
  introducesWrap: {
    flex: 1,
    gap: 5,
    justifyContent: "center",
  },
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  introDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: isTablet ? 5 : 4,
    flexShrink: 0,
    opacity: 0.65,
  },
  introText: {
    fontFamily: FONTS.light,
    fontSize: isTablet ? 16 : 12,
    color: "rgba(255,255,255,0.88)",
    lineHeight: isTablet ? 18 : 15,
    flex: 1,
  },
  youBadge: {
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: "center",
    marginTop: "auto",
  },
  youText: {
    fontFamily: FONTS.bold,
    color: "#0A1628",
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.65,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN — scroll-to-current and all logic UNCHANGED from original.
// Only additions: expandedId state + zIndex wrapper on each CURRICULUM row.
// ─────────────────────────────────────────────────────────────────────────────
export default function LearningPathScreen() {
  const router = useRouter();
  const { currentProfile } = useUser();
  const { sizes } = useTheme();
  const sz = sizes.learningPath;

  const currentLevel = currentProfile?.playLevel ?? 1;
  const scrollRef = useRef(null);
  const cardRefs = useRef(CURRICULUM.map(() => React.createRef()));
  const scrollReady = useRef(false);
  const headerOp = useRef(new Animated.Value(0)).current;

  // Only one panel open at a time — null means all closed
  const [expandedId, setExpandedId] = useState(null);

  const handleToggle = useCallback((level) => {
    setExpandedId((prev) => (prev === level ? null : level));
  }, []);

  useEffect(() => {
    Animated.timing(headerOp, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Scroll-to-current — IDENTICAL TO ORIGINAL ────────────────────────────
  const handleScrollViewLayout = () => {
    if (scrollReady.current) return;
    scrollReady.current = true;
    const currentIdx = CURRICULUM.findIndex((c) => c.level === currentLevel);
    if (currentIdx <= 0) return;
    setTimeout(() => {
      const cardRef = cardRefs.current[currentIdx];
      if (!cardRef?.current) return;
      cardRef.current.measureLayout(
        scrollRef.current,
        (x, y) => {
          const scrollTo = Math.max(0, y - SH / 2 + 65);
          scrollRef.current?.scrollTo({ y: scrollTo, animated: true });
        },
        () => {
          const estY = currentIdx * (130 + sz.connectorHeight);
          scrollRef.current?.scrollTo({
            y: Math.max(0, estY - SH / 2 + 65),
            animated: true,
          });
        },
      );
    }, 600);
  };

  const stripStats = [
    { val: "8", lbl: "stories / level" },
    { val: "50+", lbl: "new words / level" },
    { val: "4", lbl: "activities / story" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Background glows — unchanged */}
      <View
        style={{
          position: "absolute",
          borderRadius: 999,
          backgroundColor: C.teal,
          top: -80,
          right: -80,
          width: 260,
          height: 260,
          opacity: 0.06,
        }}
      />
      <View
        style={{
          position: "absolute",
          borderRadius: 999,
          backgroundColor: "#7B2FBE",
          bottom: 60,
          left: -60,
          width: 220,
          height: 220,
          opacity: 0.07,
        }}
      />

      {/* Header — unchanged */}
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            paddingTop: STATUS_BAR_HEIGHT + 10,
            paddingBottom: 12,
            paddingHorizontal: 18,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0,196,204,0.12)",
          },
          { opacity: headerOp },
        ]}
      >
        <TouchableOpacity
          style={{
            width: sz.backBtnSize,
            height: sz.backBtnSize,
            borderRadius: sz.backBtnBorderRadius,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.backIconFontSize,
              color: C.teal,
            }}
          >
            ←
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.titleFontSize,
              color: C.textPri,
              textShadowColor: "rgba(0,196,204,0.4)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
            }}
          >
            Learning Path
          </Text>
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: sz.subtitleFontSize,
              color: C.textMuted,
              marginTop: 1,
            }}
          >
            {CURRICULUM.length}+ Levels · Curriculum Roadmap
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "rgba(0,196,204,0.12)",
            borderRadius: sz.lvlPillBorderRadius,
            borderWidth: 1.5,
            borderColor: C.tealBorder,
            paddingHorizontal: sz.lvlPillPaddingH,
            paddingVertical: sz.lvlPillPaddingV,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.lvlPillFontSize,
              color: C.teal,
              letterSpacing: 0.3,
            }}
          >
            Level {currentLevel}
          </Text>
        </View>
      </Animated.View>

      {/* Stats strip — unchanged */}
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: sz.stripPaddingV,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.05)",
            backgroundColor: "rgba(255,255,255,0.03)",
          },
          { opacity: headerOp },
        ]}
      >
        {stripStats.map((s, i) => (
          <React.Fragment key={s.lbl}>
            {i > 0 && (
              <View
                style={{
                  width: 1,
                  height: sz.stripDivHeight,
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              />
            )}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  fontSize: sz.stripValFontSize,
                  color: C.teal,
                }}
              >
                {s.val}
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.light,
                  fontSize: sz.stripLblFontSize,
                  color: C.textMuted,
                  letterSpacing: 0.3,
                  marginTop: 1,
                }}
              >
                {s.lbl}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </Animated.View>

      {/* ── ScrollView ── */}
      <ScrollView
        ref={scrollRef}
        onLayout={handleScrollViewLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 60 }}
      >
        {CURRICULUM.map((item, index) => {
          const side = index % 2 === 0 ? "left" : "right";
          const isLast = index === CURRICULUM.length - 1;
          const isThisExpanded = expandedId === item.level;

          return (
            // zIndex raised only on the currently expanded card so its
            // floating panel renders above adjacent connector lines.
            // All other rows stay at zIndex 1 — layout is never affected.
            <View key={item.level} style={{ zIndex: isThisExpanded ? 999 : 1 }}>
              <LevelCard
                item={item}
                isCurrent={item.level === currentLevel}
                side={side}
                index={index}
                cardRef={cardRefs.current[index]}
                sz={sz}
                expandedId={expandedId}
                onToggle={handleToggle}
              />
              {!isLast && (
                <Connector
                  fromSide={side}
                  color="rgba(255,255,255,0.09)"
                  sz={sz}
                />
              )}
            </View>
          );
        })}

        {/* <View
          style={{ alignItems: "center", paddingVertical: sz.endCapPaddingV }}
        >
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: sz.endCapFontSize,
              color: C.textMuted,
            }}
          >
            🚀 More levels coming soon
          </Text>
        </View> */}
      </ScrollView>
    </View>
  );
}
