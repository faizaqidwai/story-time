// app/components/LearningPath.jsx
//
// Learning Path — compact zigzag cards in a proper flow layout.
// No absolute positioning for cards — each card + connector is a normal View child.
// Cards alternate left/right via marginLeft/marginRight.
// Connectors are drawn with nested Views using borders for the U-turn path.

import React, { useRef, useEffect } from "react";
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
import { useUser } from "../_contexts/UserContext";
import { CURRICULUM } from "../data/curriculumData";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

// ── Layout constants ──────────────────────────────────────────────────────────
const SCREEN_PAD = 16;
const CARD_W = Math.floor(SW * 0.42);
const CARD_H = 148; // fixed card height — connector geometry depends on this
const CONN_H = 60; // gap between cards (pure space, no overlap)
const LW = 1.5; // connector line width — matches card border width
const CR = 16; // corner radius on bends

// The connector container spans the full content width.
// Within it (width = SW - 2*SCREEN_PAD):
//   Left card  right edge = CARD_W
//   Right card left edge  = (SW - 2*SCREEN_PAD) - CARD_W
//
// The line exits from the VERTICAL CENTER of the card side:
//   → We use marginTop: -CARD_H/2 on the connector so its top aligns
//     with the card's vertical center.
// The line enters the TOP CENTER of the next card:
//   → The connector bottom aligns exactly with card N+1's top (normal flow).
//   → The bottom arm terminates at the horizontal center of the next card.
//     Left card  center-x = CARD_W / 2
//     Right card center-x = (containerW - CARD_W) + CARD_W / 2  = containerW - CARD_W/2

// Colours
const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  tealBorder: "rgba(0,188,212,0.3)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

// ─────────────────────────────────────────────────────────────────────────────
// ZigZag Connector — L-shape path:
//   1. Exit from vertical CENTER of card's far edge  (horizontal arm)
//   2. Travel horizontally to the CENTER-X of the NEXT card (not screen edge)
//   3. Turn straight DOWN to the TOP-CENTER of the next card
//
// fromSide = "left"  → card is LEFT, next card is RIGHT
//   Horizontal: from left-card right-edge → rightCardCenterX
//   Vertical:   down from that point to next card top
//
// fromSide = "right" → card is RIGHT, next card is LEFT
//   Horizontal: from right-card left-edge → leftCardCenterX
//   Vertical:   down from that point to next card top
// ─────────────────────────────────────────────────────────────────────────────
function Connector({ fromSide, color }) {
  const lc = color ?? C.teal;
  const containerW = SW - SCREEN_PAD * 2;
  const totalH = CARD_H / 2 + CONN_H; // container starts at card center, ends at next card top

  // Key x positions (relative to containerW)
  const leftCardRightX = CARD_W; // right edge of left card
  const rightCardLeftX = containerW - CARD_W; // left edge of right card
  const leftCardCenterX = CARD_W / 2; // center-x of left card  (entry for fromRight)
  const rightCardCenterX = containerW - CARD_W / 2; // center-x of right card (entry for fromLeft)

  const DOT = 5;

  if (fromSide === "left") {
    // Exit: horizontal from left-card right edge → rightCardCenterX
    // Turn: vertical down from (rightCardCenterX, exitY) → (rightCardCenterX, totalH)
    return (
      <View
        style={{
          width: containerW,
          height: totalH,
          alignSelf: "center",
          marginTop: -(CARD_H / 2),
        }}
      >
        {/* Horizontal arm — right edge of left card → center of right card */}
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
        {/* Vertical arm — down from corner to next card top */}
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
        {/* Corner bend dot */}
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
        {/* Entry dot at next card top-center */}
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
    // Exit: horizontal from right-card left edge → leftCardCenterX
    // Turn: vertical down from (leftCardCenterX, exitY) → (leftCardCenterX, totalH)
    return (
      <View
        style={{
          width: containerW,
          height: totalH,
          alignSelf: "center",
          marginTop: -(CARD_H / 2),
        }}
      >
        {/* Horizontal arm — center of left card → left edge of right card */}
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
        {/* Vertical arm — down from corner to next card top */}
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
        {/* Corner bend dot */}
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
        {/* Entry dot at next card top-center */}
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
// Compact Level Card
// ─────────────────────────────────────────────────────────────────────────────
function LevelCard({ item, isCurrent, side, index, cardRef }) {
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

  const ac = item.accentColor;
  const acDim = item.tagColor;
  const acBorder = item.tagBorder;

  const alignStyle =
    side === "left"
      ? { alignSelf: "flex-start", marginLeft: SCREEN_PAD }
      : { alignSelf: "flex-end", marginRight: SCREEN_PAD };

  return (
    <Animated.View
      ref={cardRef}
      style={[
        cardS.card,
        alignStyle,
        {
          opacity: opAnim,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          borderColor: isCurrent ? ac : "rgba(255,255,255,0.09)",
          borderWidth: isCurrent ? 2 : 1.5,
          shadowColor: isCurrent ? ac : "#000",
          shadowOpacity: isCurrent ? 0.7 : 0.3,
        },
      ]}
    >
      {/* Level badge + emoji row */}
      <View style={cardS.topRow}>
        <View
          style={[
            cardS.lvlBadge,
            { backgroundColor: acDim, borderColor: acBorder },
          ]}
        >
          <Text style={[cardS.lvlNum, { color: ac }]}>{item.level}</Text>
        </View>
        <Text style={cardS.emoji}>{item.emoji}</Text>
      </View>

      {/* Grade name */}
      <Text style={cardS.grade} numberOfLines={2}>
        {item.grade}
      </Text>

      {/* Compact stat */}
      <Text style={[cardS.stat, { color: ac }]} numberOfLines={1}>
        {item.challengeWords} words · {item.sentenceLength}
      </Text>

      {/* Key skill — first introduce point */}
      <Text style={cardS.skill} numberOfLines={2}>
        {item.introduces[0]}
      </Text>

      {/* YOU ARE HERE */}
      {isCurrent && (
        <View style={[cardS.youBadge, { backgroundColor: ac }]}>
          <Text style={cardS.youTxt}>YOU ARE HERE</Text>
        </View>
      )}
    </Animated.View>
  );
}

const cardS = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  lvlBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  lvlNum: { fontSize: 15, fontWeight: "900" },
  emoji: { fontSize: 20 },
  grade: {
    fontSize: 12,
    fontWeight: "800",
    color: C.textPri,
    marginBottom: 4,
    lineHeight: 16,
  },
  stat: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  skill: {
    fontSize: 10,
    color: C.textMuted,
    lineHeight: 14,
    fontWeight: "500",
  },
  youBadge: {
    marginTop: 8,
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: "center",
  },
  youTxt: {
    fontSize: 8,
    fontWeight: "900",
    color: "#08081a",
    letterSpacing: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function LearningPathScreen() {
  const router = useRouter();
  const { currentProfile } = useUser();
  const currentLevel = currentProfile?.playLevel ?? 1;

  const scrollRef = useRef(null);
  // Ref per card to measure y position after layout
  const cardRefs = useRef(CURRICULUM.map(() => React.createRef()));
  const scrollReady = useRef(false);

  const headerOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOp, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Scroll to current level after layout settles
  const handleScrollViewLayout = () => {
    if (scrollReady.current) return;
    scrollReady.current = true;

    const currentIdx = CURRICULUM.findIndex((c) => c.level === currentLevel);
    if (currentIdx <= 0) return; // already at top

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
          // fallback: estimate
          const estY = currentIdx * (130 + CONN_H);
          scrollRef.current?.scrollTo({
            y: Math.max(0, estY - SH / 2 + 65),
            animated: true,
          });
        },
      );
    }, 600);
  };

  return (
    <View style={screenS.root}>
      {/* BG glows */}
      <View
        style={[
          screenS.glow,
          {
            backgroundColor: C.teal,
            top: -80,
            right: -80,
            width: 260,
            height: 260,
            opacity: 0.06,
          },
        ]}
      />
      <View
        style={[
          screenS.glow,
          {
            backgroundColor: "#9652D9",
            bottom: 60,
            left: -60,
            width: 220,
            height: 220,
            opacity: 0.07,
          },
        ]}
      />

      {/* Header */}
      <Animated.View style={[screenS.header, { opacity: headerOp }]}>
        <TouchableOpacity
          style={screenS.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={screenS.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={screenS.title}>Learning Path</Text>
          <Text style={screenS.subTitle}>
            {CURRICULUM.length} Levels · Curriculum Roadmap
          </Text>
        </View>
        <View style={screenS.lvlPill}>
          <Text style={screenS.lvlPillTxt}>Level {currentLevel}</Text>
        </View>
      </Animated.View>

      {/* Progress summary strip */}
      <Animated.View style={[screenS.strip, { opacity: headerOp }]}>
        {[
          { val: "5–8", lbl: "stories / level" },
          { val: "3–4", lbl: "new words / story" },
          { val: "4", lbl: "activities / story" },
        ].map((s, i) => (
          <React.Fragment key={s.lbl}>
            {i > 0 && <View style={screenS.stripDiv} />}
            <View style={screenS.stripItem}>
              <Text style={screenS.stripVal}>{s.val}</Text>
              <Text style={screenS.stripLbl}>{s.lbl}</Text>
            </View>
          </React.Fragment>
        ))}
      </Animated.View>

      {/* Zigzag scroll content */}
      <ScrollView
        ref={scrollRef}
        onLayout={handleScrollViewLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={screenS.scrollContent}
      >
        {CURRICULUM.map((item, index) => {
          const side = index % 2 === 0 ? "left" : "right";
          const isLast = index === CURRICULUM.length - 1;

          return (
            <View key={item.level}>
              <LevelCard
                item={item}
                isCurrent={item.level === currentLevel}
                side={side}
                index={index}
                cardRef={cardRefs.current[index]}
              />
              {!isLast && (
                // Same colour and width as the card border — clean, uniform look
                <Connector fromSide={side} color="rgba(255,255,255,0.09)" />
              )}
            </View>
          );
        })}

        {/* End cap */}
        <View style={screenS.endCap}>
          <Text style={screenS.endCapTxt}>🚀 More levels coming soon</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const screenS = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glow: { position: "absolute", borderRadius: 999 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 18, color: C.teal, fontWeight: "700" },
  title: {
    fontSize: 19,
    fontWeight: "900",
    color: C.textPri,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subTitle: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "500",
    marginTop: 1,
  },
  lvlPill: {
    backgroundColor: "rgba(0,188,212,0.12)",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lvlPillTxt: {
    fontSize: 11,
    fontWeight: "900",
    color: C.teal,
    letterSpacing: 0.3,
  },

  strip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripVal: { fontSize: 15, fontWeight: "900", color: C.teal },
  stripLbl: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  stripDiv: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.08)" },

  scrollContent: { paddingTop: 20, paddingBottom: 60 },

  endCap: { alignItems: "center", paddingVertical: 28 },
  endCapTxt: { fontSize: 12, color: C.textMuted, fontWeight: "600" },
});
