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
import { FONTS } from "../theme";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

// ── Layout constants ──────────────────────────────────────────────────────────
const SCREEN_PAD = 16;
const CARD_W = Math.floor(SW * 0.42);
// Card height is slightly taller to give "YOU ARE HERE" badge room to breathe
const CARD_H = 162;
const CONN_H = 60;
const LW = 1.5;
const CR = 16;

// Colours — single uniform teal theme for all cards
const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  tealBorder: "rgba(0,188,212,0.3)",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorderBold: "rgba(0,188,212,0.5)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

// ── Single accent used for every card (current level uses a brighter variant)
const ACCENT = C.teal;
const ACCENT_DIM = C.tealDim;
const ACCENT_BORDER = C.tealBorder;

// ─────────────────────────────────────────────────────────────────────────────
// ZigZag Connector
// ─────────────────────────────────────────────────────────────────────────────
function Connector({ fromSide, color }) {
  const lc = color ?? C.teal;
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
// Compact Level Card — uniform teal theme for all levels
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
          // Current level gets a brighter teal border; others use a muted teal
          borderColor: isCurrent ? C.tealBorderBold : C.tealBorder,
          borderWidth: isCurrent ? 2 : 1.5,
          shadowColor: isCurrent ? C.teal : "#000",
          shadowOpacity: isCurrent ? 0.55 : 0.25,
        },
      ]}
    >
      {/* Level badge + emoji row */}
      <View style={cardS.topRow}>
        <View
          style={[
            cardS.lvlBadge,
            { backgroundColor: ACCENT_DIM, borderColor: ACCENT_BORDER },
          ]}
        >
          <Text style={[cardS.lvlNum, { color: ACCENT }]}>{item.level}</Text>
        </View>
        <Text style={cardS.emoji}>{item.emoji}</Text>
      </View>

      {/* Grade name */}
      <Text style={cardS.grade} numberOfLines={2}>
        {item.grade}
      </Text>

      {/* Compact stat */}
      <Text style={[cardS.stat, { color: ACCENT }]} numberOfLines={1}>
        {item.challengeWords} words · {item.sentenceLength}
      </Text>

      {/* Key skill */}
      <Text style={cardS.skill} numberOfLines={2}>
        {item.introduces[0]}
      </Text>

      {/* YOU ARE HERE — has bottom padding so it doesn't touch the card edge */}
      {isCurrent && (
        <View style={cardS.youBadge}>
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
    // paddingBottom is larger so "YOU ARE HERE" badge has breathing room
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
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
  // Level number inside badge — bold
  lvlNum: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  emoji: { fontSize: 20 },
  // Grade name — bold
  grade: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: C.textPri,
    marginBottom: 4,
    lineHeight: 16,
  },
  // Stats line — bold, teal
  stat: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  // Key skill intro — light, muted
  skill: {
    fontFamily: FONTS.light,
    fontSize: 10,
    color: C.textMuted,
    lineHeight: 14,
  },
  // "YOU ARE HERE" badge — pushed to bottom with marginTop:auto + marginBottom
  youBadge: {
    marginTop: "auto",
    marginBottom: 2, // space between badge bottom and card bottom edge
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: "center",
    backgroundColor: C.teal,
  },
  // Badge label — bold, dark
  youTxt: {
    fontFamily: FONTS.bold,
    fontSize: 8,
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
  // Back arrow — bold, teal
  backIcon: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: C.teal,
  },
  // Screen title — bold
  title: {
    fontFamily: FONTS.bold,
    fontSize: 19,
    color: C.textPri,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // Subtitle — light, muted
  subTitle: {
    fontFamily: FONTS.light,
    fontSize: 11,
    color: C.textMuted,
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
  // Level pill text — bold, teal
  lvlPillTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
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
  // Strip value — bold, teal
  stripVal: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: C.teal,
  },
  // Strip label — light, muted
  stripLbl: {
    fontFamily: FONTS.light,
    fontSize: 9,
    color: C.textMuted,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  stripDiv: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.08)" },

  scrollContent: { paddingTop: 20, paddingBottom: 60 },

  endCap: { alignItems: "center", paddingVertical: 28 },
  // End cap text — light, muted
  endCapTxt: {
    fontFamily: FONTS.light,
    fontSize: 12,
    color: C.textMuted,
  },
});
