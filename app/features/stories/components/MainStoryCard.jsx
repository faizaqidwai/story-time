/**
 * MainStoryCard.jsx
 * app/features/stories/components/MainStoryCard.jsx
 *
 * BRAND UPDATE — feature/brand-guidelines-v2
 * COLOUR-ONLY changes — zero functional/logic/layout/animation changes:
 *
 *   ✅ Removed local T{} colour object — all values now from COLORS theme
 *   ✅ STEPS.bg corrected per §5.6 activity colour system v2.0:
 *        Read     "#880E4F" (off-brand deep pink)  → COLORS.activityColors.read    (#E8445A coral)
 *        Guess    "#6A1B9A" (off-brand deep purple) → COLORS.activityColors.guess   (#7B2FBE purple)
 *        Listen   "#1565C0" (off-brand blue)        → COLORS.activityColors.listen  (#00C4CC cyan)
 *        Describe "#F57F17" (off-brand orange)      → COLORS.activityColors.describe(#2A9D8F teal)
 *   ✅ T.darkBg2 "#16213e" → COLORS.surface
 *   ✅ T.teal "#00BCD4" → COLORS.primary (#00C4CC)
 *   ✅ T.yellow "#FFD54F" → COLORS.amber (#F5A623)
 *   ✅ T.textPrimary "#E0F7FA" → COLORS.textPrimary
 *   ✅ T.textMuted "#7a9aaa" → COLORS.textMuted
 *   ✅ "#0d0d24" image bg → COLORS.background
 *   ✅ "#08081a" text on btn → COLORS.background (textOnPrimary via COLORS)
 *   ✅ "rgba(0,188,212,0.45)" wrapper border → COLORS.borderBold
 *   ✅ "rgba(255,213,79,0.3)" image frame border → amber rgba
 *   ✅ startBtn bg/shadow T.teal → COLORS.primary
 *   ✅ checkBadge bg T.teal → COLORS.primary
 *   ✅ COLORS imported from theme
 *
 * UNTOUCHED (zero changes):
 *   ✅ All animation logic (StepCard pulse, loop, stop)
 *   ✅ All layout, sizing, padding, all sz.* tokens
 *   ✅ All card structure, wrapper, imageFrame, overlay
 *   ✅ All refs (readIconRef, guessIconRef, listenIconRef, describeIconRef)
 *   ✅ All logic: progressIndex, isActive, isCompleted
 *   ✅ All JSX structure — zero additions or removals
 *   ✅ "rgba(255,255,255,0.08)" neutral step border — kept as-is
 *   ✅ "rgba(255,255,255,0.55)" active step glow — kept as-is
 *   ✅ cornerBorderColor "rgba(255,213,79,0.7)" — amber accent, kept
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
import { FONTS, COLORS } from "../../../theme";
import { useTheme } from "../../../_contexts/ThemeContext";
import { Image as ExpoImage } from "expo-image";
import { font } from "../../../theme/tokens";

const { width: SW } = Dimensions.get("window");

// ── Activity steps — §5.6 v2.0 corrected ─────────────────────────────────────
// STEPS.bg was using off-brand colours that bore no relation to the brand
// activity colour system. Now uses exact brand activity hex values.
const STEPS = [
  {
    image: require("../../../../assets/img/read_icon.png"),
    label: "Read",
    bg: COLORS.activityColors.read,       // ✅ #E8445A coral (was "#880E4F" off-brand deep pink)
  },
  {
    image: require("../../../../assets/img/guess_icon.png"),
    label: "Guess",
    bg: COLORS.activityColors.guess,      // ✅ #7B2FBE purple (was "#6A1B9A" off-brand deep purple)
  },
  {
    image: require("../../../../assets/img/listen_icon.png"),
    label: "Listen",
    bg: COLORS.activityColors.listen,     // ✅ #00C4CC cyan (was "#1565C0" off-brand blue)
  },
  {
    image: require("../../../../assets/img/describe_icon.png"),
    label: "Describe",
    bg: COLORS.activityColors.describe,   // ✅ #2A9D8F teal (was "#F57F17" off-brand orange)
  },
];

// ─── Per-step pulse — only the active step animates — UNCHANGED ───────────────
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

  const pulseAnims = useRef(STEPS.map(() => new Animated.Value(1))).current;
  const stepRefs = [readIconRef, guessIconRef, listenIconRef, describeIconRef];

  const s = StyleSheet.create({
    wrapper: {
      alignSelf: "center",
      marginVertical: sz.cardMarginVertical,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: COLORS.borderBold,              // ✅ was "rgba(0,188,212,0.45)"
      borderRadius: sz.cardBorderRadius,
      shadowColor: COLORS.primary,                 // ✅ was T.teal "#00BCD4"
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 12,
      elevation: 10,
    },
    card: {
      backgroundColor: COLORS.surface,             // ✅ was T.darkBg2 "#16213e"
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
      borderColor: "rgba(245,166,35,0.3)",          // ✅ was "rgba(255,213,79,0.3)" amber tint
      backgroundColor: COLORS.background,           // ✅ was "#0d0d24"
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
      backgroundColor: "rgba(10,12,30,0.72)",       // keep — overlay, not brand surface
      justifyContent: "flex-end",
    },
    title: {
      fontFamily: FONTS.bold,
      fontSize: sz.titleFontSize,
      color: COLORS.textPrimary,                    // ✅ was T.textPrimary "#E0F7FA"
      lineHeight: sz.titleLineHeight,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    corner: {
      position: "absolute",
      width: sz.cornerSize,
      height: sz.cornerSize,
      borderColor: "rgba(255,213,79,0.7)",          // keep — amber accent on image corners
      zIndex: 3,
    },
    cornerTL: {
      top: sz.cornerInset, left: sz.cornerInset,
      borderTopWidth: sz.cornerBorderWidth,
      borderLeftWidth: sz.cornerBorderWidth,
      borderTopLeftRadius: sz.cornerBorderRadius,
    },
    cornerTR: {
      top: sz.cornerInset, right: sz.cornerInset,
      borderTopWidth: sz.cornerBorderWidth,
      borderRightWidth: sz.cornerBorderWidth,
      borderTopRightRadius: sz.cornerBorderRadius,
    },
    cornerBL: {
      bottom: sz.cornerInset, left: sz.cornerInset,
      borderBottomWidth: sz.cornerBorderWidth,
      borderLeftWidth: sz.cornerBorderWidth,
      borderBottomLeftRadius: sz.cornerBorderRadius,
    },
    cornerBR: {
      bottom: sz.cornerInset, right: sz.cornerInset,
      borderBottomWidth: sz.cornerBorderWidth,
      borderRightWidth: sz.cornerBorderWidth,
      borderBottomRightRadius: sz.cornerBorderRadius,
    },

    startBtn: {
      position: "absolute",
      top: sz.newBadgeTop,
      right: sz.newBadgeRight,
      backgroundColor: COLORS.primary,              // ✅ was T.teal "#00BCD4"
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
      zIndex: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      shadowColor: COLORS.primary,                  // ✅ was T.teal
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.75,
      shadowRadius: 8,
      elevation: 8,
    },
    startBtnText: {
      fontFamily: FONTS.bold,
      fontSize: sz.newBadgeFontSize ?? 11,
      color: COLORS.textOnPrimary,                  // ✅ was "#08081a" — now uses theme token
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
      color: COLORS.textMuted,                      // ✅ was T.textMuted "#7a9aaa"
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
      borderColor: "rgba(255,255,255,0.08)",         // keep — neutral, not cyan-specific
      overflow: "hidden",
      gap: sz.stepCardGap,
    },
    stepCardActive: {
      borderColor: "rgba(255,255,255,0.55)",         // keep — white glow on active
      borderWidth: 2,
      shadowColor: "#fff",                           // keep — white glow
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    stepCardDone: {
      borderColor: "rgba(255,255,255,0.05)",
    },
    stepImage:     { width: sz.stepImageSize, height: sz.stepImageSize },
    stepImageDone: { opacity: 0.45 },
    stepLabel: {
      fontFamily: FONTS.bold,
      fontSize: sz.stepLabelFontSize,
      color: COLORS.textPrimary,                    // ✅ was T.textPrimary "#E0F7FA"
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
      backgroundColor: COLORS.primary,              // ✅ was T.teal "#00BCD4"
      alignItems: "center",
      justifyContent: "center",
    },
    checkText: {
      fontFamily: FONTS.bold,
      fontSize: sz.checkBadgeFontSize,
      color: COLORS.textOnPrimary,                  // ✅ was "#08081a"
    },
  });

  return (
    <View style={[s.wrapper, { width: cardW }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={s.card}>
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
            <TouchableOpacity
              style={s.startBtn}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>▶ START</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.body}>
          <Text style={s.desc} numberOfLines={2}>
            {description}
          </Text>
        </View>

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
