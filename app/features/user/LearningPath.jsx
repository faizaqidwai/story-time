// app/components/LearningPath.jsx

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
import { useUser } from "../../_contexts/UserContext";
import { CURRICULUM } from "../../data/curriculumData";
import { FONTS } from "../../theme";
import { useTheme } from "../../_contexts/ThemeContext";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const LW = 1.5;
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

const ACCENT = C.teal;
const ACCENT_DIM = C.tealDim;
const ACCENT_BORDER = C.tealBorder;

// ─────────────────────────────────────────────────────────────────────────────
// ZigZag Connector
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
// Level Card
// ─────────────────────────────────────────────────────────────────────────────
function LevelCard({ item, isCurrent, side, index, cardRef, sz }) {
  const SCREEN_PAD = sz.screenPad;
  const CARD_W = Math.floor(SW * sz.cardWidth);
  const CARD_H = sz.cardHeight;

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
        {
          width: CARD_W,
          height: CARD_H,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: sz.cardBorderRadius,
          paddingTop: sz.cardPaddingTop,
          paddingHorizontal: sz.cardPaddingH,
          paddingBottom: sz.cardPaddingBottom,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 12,
          elevation: 6,
          overflow: "hidden",
        },
        alignStyle,
        {
          opacity: opAnim,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          borderColor: isCurrent ? C.tealBorderBold : C.tealBorder,
          borderWidth: isCurrent ? 2 : 1.5,
          shadowColor: isCurrent ? C.teal : "#000",
          shadowOpacity: isCurrent ? 0.55 : 0.25,
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 7,
        }}
      >
        <View
          style={{
            width: sz.lvlBadgeSize,
            height: sz.lvlBadgeSize,
            borderRadius: sz.lvlBadgeBorderRadius,
            borderWidth: 1.5,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: ACCENT_DIM,
            borderColor: ACCENT_BORDER,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.lvlNumFontSize,
              color: ACCENT,
            }}
          >
            {item.level}
          </Text>
        </View>
        <Text style={{ fontSize: sz.emojiFontSize }}>{item.emoji}</Text>
      </View>

      <Text
        style={{
          fontFamily: FONTS.bold,
          fontSize: sz.gradeFontSize,
          color: C.textPri,
          marginBottom: sz.gradeMarginBottom,
          lineHeight: sz.gradeLineHeight,
        }}
        numberOfLines={2}
      >
        {item.grade}
      </Text>
      <Text
        style={{
          fontFamily: FONTS.bold,
          fontSize: sz.statFontSize,
          color: ACCENT,
          marginBottom: sz.statMarginBottom,
          letterSpacing: 0.2,
        }}
        numberOfLines={1}
      >
        {item.challengeWords} words · {item.sentenceLength}
      </Text>
      <Text
        style={{
          fontFamily: FONTS.light,
          fontSize: sz.skillFontSize,
          color: C.textMuted,
          lineHeight: sz.skillLineHeight,
        }}
        numberOfLines={2}
      >
        {item.introduces[0]}
      </Text>

      {isCurrent && (
        <View
          style={{
            marginTop: "auto",
            marginBottom: 2,
            borderRadius: sz.youBadgeBorderRadius,
            paddingVertical: sz.youBadgePaddingV,
            alignItems: "center",
            backgroundColor: C.teal,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.youTxtFontSize,
              color: "#08081a",
              letterSpacing: sz.youTxtLetterSpacing,
            }}
          >
            YOU ARE HERE
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
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
    { val: "5–8", lbl: "stories / level" },
    { val: "3–4", lbl: "new words / story" },
    { val: "4", lbl: "activities / story" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={[
          { position: "absolute", borderRadius: 999 },
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
          { position: "absolute", borderRadius: 999 },
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

      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            paddingTop: STATUS_BAR_HEIGHT + 10,
            paddingBottom: 12,
            paddingHorizontal: 18,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0,188,212,0.12)",
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
              textShadowColor: "rgba(0,188,212,0.4)",
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
            {CURRICULUM.length} Levels · Curriculum Roadmap
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "rgba(0,188,212,0.12)",
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

      <ScrollView
        ref={scrollRef}
        onLayout={handleScrollViewLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 60 }}
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
                sz={sz}
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
        <View
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
        </View>
      </ScrollView>
    </View>
  );
}
