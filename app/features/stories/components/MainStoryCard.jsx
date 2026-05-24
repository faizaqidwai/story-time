/**
 * MainStoryCard.jsx
 * app/features/stories/components/MainStoryCard.jsx
 *
 * CHANGES:
 *   - No whole-card pulse animation — only the current active step card pulses
 *   - activeDot removed (was overlapping title at reduced height)
 *   - stepLabelActive removed — active step keeps its original bg color
 *   - stepCardActive border/shadow glow retained but bg color NOT overridden
 *   - "RECOMMENDED" badge replaced with a START button (top-right of image)
 *   - borderAnim / scaleAnim whole-card animations removed entirely
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { FONTS } from "../../../theme";
import { useTheme } from "../../../_contexts/ThemeContext";
import { Image as ExpoImage } from "expo-image";
import { font } from "../../../theme/tokens";

const { width: SW } = Dimensions.get("window");
const T = {
  darkBg2: "#16213e",
  teal: "#00BCD4",
  yellow: "#FFD54F",
  textPrimary: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const STEPS = [
  {
    image: require("../../../../assets/img/read_icon.png"),
    label: "Read",
    bg: "#880E4F",
  },
  {
    image: require("../../../../assets/img/guess_icon.png"),
    label: "Guess",
    bg: "#6A1B9A",
  },
  {
    image: require("../../../../assets/img/listen_icon.png"),
    label: "Listen",
    bg: "#1565C0",
  },
  {
    image: require("../../../../assets/img/describe_icon.png"),
    label: "Describe",
    bg: "#F57F17",
  },
];

// ─── Per-step pulse — only the active step animates ───────────────────────────
function StepCard({ step, isActive, isCompleted, stepRef, pulseAnim, sz, s }) {
  useEffect(() => {
    if (!isActive) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive]);

  // Active step: glow border only — bg stays its original color (not overridden)
  // Done step: same bg at reduced opacity
  const bgColor = isCompleted ? `${step.bg}55` : step.bg;

  return (
    <Animated.View
      ref={stepRef ?? null}
      collapsable={false}
      style={[
        s.stepCard,
        { backgroundColor: bgColor },
        isActive && s.stepCardActive,
        isCompleted && s.stepCardDone,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <ExpoImage
        source={step.image}
        style={[s.stepImage, isCompleted && s.stepImageDone]}
        contentFit="contain"
      />
      <Text style={s.stepLabel}>{step.label}</Text>
      {isCompleted && (
        <View style={s.checkBadge}>
          <Text style={s.checkText}>✓</Text>
        </View>
      )}
      {/* activeDot removed — was overlapping title at reduced card height */}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MainStoryCard({
  title,
  description,
  image,
  onPress,
  progressIndex = 0,
  readIconRef,
  guessIconRef,
  listenIconRef,
  describeIconRef,
}) {
  const { sizes } = useTheme();
  const sz = sizes.mainStoryCard;
  const cardW = Math.min(SW - sz.cardMarginHorizontal, sz.cardMaxWidth);

  // One pulse anim per step — only the active one actually animates
  const pulseAnims = useRef(STEPS.map(() => new Animated.Value(1))).current;
  const stepRefs = [readIconRef, guessIconRef, listenIconRef, describeIconRef];

  const s = StyleSheet.create({
    wrapper: {
      alignSelf: "center",
      marginVertical: sz.cardMarginVertical,
      alignItems: "center",
      // Static teal border — no animation on the whole card
      borderWidth: 1.5,
      borderColor: "rgba(0,188,212,0.45)",
      borderRadius: sz.cardBorderRadius,
      shadowColor: T.teal,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 12,
      elevation: 10,
    },
    card: {
      backgroundColor: T.darkBg2,
      borderRadius: sz.cardBorderRadius,
      overflow: "hidden",
      width: cardW,
    },
    imageFrame: {
      marginHorizontal: sz.imageFrameMarginH,
      marginTop: sz.imageFrameMarginTop,
      marginBottom: sz.imageFrameMarginBottom,
      borderRadius: sz.imageFrameBorderRadius,
      overflow: "hidden",
      height: sz.imageFrameHeight,
      borderWidth: 2,
      borderColor: "rgba(255,213,79,0.3)",
      backgroundColor: "#0d0d24",
    },
    storyImage: {
      width: "100%",
      height: "100%",
      borderRadius: sz.imageFrameBorderRadius - 2,
    },
    imageOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: sz.titleOverlayPaddingTop,
      paddingBottom: sz.titleOverlayPaddingBottom,
      paddingHorizontal: sz.titleOverlayPaddingH,
      backgroundColor: "rgba(10,12,30,0.72)",
      justifyContent: "flex-end",
    },
    title: {
      fontFamily: FONTS.bold,
      fontSize: sz.titleFontSize,
      color: T.textPrimary,
      lineHeight: sz.titleLineHeight,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    corner: {
      position: "absolute",
      width: sz.cornerSize,
      height: sz.cornerSize,
      borderColor: "rgba(255,213,79,0.7)",
      zIndex: 3,
    },
    cornerTL: {
      top: sz.cornerInset,
      left: sz.cornerInset,
      borderTopWidth: sz.cornerBorderWidth,
      borderLeftWidth: sz.cornerBorderWidth,
      borderTopLeftRadius: sz.cornerBorderRadius,
    },
    cornerTR: {
      top: sz.cornerInset,
      right: sz.cornerInset,
      borderTopWidth: sz.cornerBorderWidth,
      borderRightWidth: sz.cornerBorderWidth,
      borderTopRightRadius: sz.cornerBorderRadius,
    },
    cornerBL: {
      bottom: sz.cornerInset,
      left: sz.cornerInset,
      borderBottomWidth: sz.cornerBorderWidth,
      borderLeftWidth: sz.cornerBorderWidth,
      borderBottomLeftRadius: sz.cornerBorderRadius,
    },
    cornerBR: {
      bottom: sz.cornerInset,
      right: sz.cornerInset,
      borderBottomWidth: sz.cornerBorderWidth,
      borderRightWidth: sz.cornerBorderWidth,
      borderBottomRightRadius: sz.cornerBorderRadius,
    },

    // ── START button (replaces RECOMMENDED badge) ─────────────────────────
    startBtn: {
      position: "absolute",
      top: sz.newBadgeTop,
      right: sz.newBadgeRight,
      backgroundColor: T.teal,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
      zIndex: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      shadowColor: T.teal,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.75,
      shadowRadius: 8,
      elevation: 8,
    },
    startBtnText: {
      fontFamily: FONTS.bold,
      fontSize: sz.newBadgeFontSize ?? 11,
      color: "#08081a",
      letterSpacing: 0.5,
    },

    body: {
      paddingHorizontal: sz.descPaddingH,
      paddingTop: sz.descPaddingTop,
      paddingBottom: sz.descPaddingBottom,
    },
    desc: {
      fontFamily: FONTS.light,
      fontSize: sz.descFontSize,
      color: T.textMuted,
      lineHeight: sz.descLineHeight,
      fontStyle: "italic",
    },
    stepsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "space-between",
      marginHorizontal: sz.stepsRowMarginH,
      marginBottom: sz.stepsRowMarginBottom ?? 12,
      gap: sz.stepsRowGap,
    },
    stepCard: {
      flex: 1,
      height: sz.stepCardHeight,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: sz.stepCardPaddingV,
      paddingHorizontal: sz.stepCardPaddingH,
      borderRadius: sz.stepCardBorderRadius,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      overflow: "hidden",
      gap: sz.stepCardGap,
    },
    // Active: glow border only — bg color comes from step.bg (not overridden here)
    stepCardActive: {
      borderColor: "rgba(255,255,255,0.55)",
      borderWidth: 2,
      shadowColor: "#fff",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    stepCardDone: {
      borderColor: "rgba(255,255,255,0.05)",
    },
    stepImage: { width: sz.stepImageSize, height: sz.stepImageSize },
    stepImageDone: { opacity: 0.45 },
    stepLabel: {
      fontFamily: FONTS.bold,
      fontSize: sz.stepLabelFontSize,
      color: T.textPrimary, // always white — never changes with active state
      letterSpacing: sz.stepLabelLetterSpacing,
      textAlign: "center",
    },
    checkBadge: {
      position: "absolute",
      top: sz.checkBadgeTop,
      right: sz.checkBadgeRight,
      width: sz.checkBadgeSize,
      height: sz.checkBadgeSize,
      borderRadius: sz.checkBadgeSize / 2,
      backgroundColor: T.teal,
      alignItems: "center",
      justifyContent: "center",
    },
    checkText: {
      fontFamily: FONTS.bold,
      fontSize: sz.checkBadgeFontSize,
      color: "#08081a",
    },
  });

  return (
    <View style={[s.wrapper, { width: cardW }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={s.card}>
        {/* Story image */}
        {image && (
          <View style={s.imageFrame}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
            <ExpoImage
              source={image}
              style={s.storyImage}
              contentFit="cover"
              cachePolicy="disk"
            />
            <View style={s.imageOverlay}>
              <Text style={s.title} numberOfLines={2}>
                {title}
              </Text>
            </View>
            {/* START button replaces RECOMMENDED badge */}
            <TouchableOpacity
              style={s.startBtn}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>▶ START</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        <View style={s.body}>
          <Text style={s.desc} numberOfLines={2}>
            {description}
          </Text>
        </View>

        {/* Activity steps — only active step pulses */}
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => {
            const isCompleted = i < progressIndex;
            const isActive = i === progressIndex && progressIndex < 4;
            return (
              <StepCard
                key={i}
                step={step}
                isActive={isActive}
                isCompleted={isCompleted}
                stepRef={stepRefs[i]}
                pulseAnim={pulseAnims[i]}
                sz={sz}
                s={s}
              />
            );
          })}
        </View>
      </TouchableOpacity>
    </View>
  );
}
