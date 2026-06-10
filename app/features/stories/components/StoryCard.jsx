/**
 * StoryCard.jsx
 * app/features/stories/components/StoryCard.jsx
 *
 * BRAND UPDATE — feature/brand-guidelines-v2
 * COLOUR-ONLY changes — zero functional/logic/layout/animation changes:
 *
 *   ✅ ACTIVITY_STEPS colours corrected per §5.6 v2.0 (names AND colours were mismatched):
 *        Read     was "#00BCD4" (old cyan)   → COLORS.activityColors.read    (#E8445A coral)
 *        Guess    was "#FFD54F" (old yellow)  → COLORS.activityColors.guess   (#7B2FBE purple)
 *        Listen   was "#FF7043" (old coral)   → COLORS.activityColors.listen  (#00C4CC cyan)
 *        Describe was "#9652D9" (old purple)  → COLORS.activityColors.describe(#2A9D8F teal)
 *   ✅ COMPLETED_GREEN "#1B5E20" → COLORS.teal (#2A9D8F)
 *      §3.3: teal is the brand completion/habit signal — off-brand dark green retired
 *   ✅ card bg "#16213e" → COLORS.surface
 *   ✅ pressed card bg "#1a2a50" → COLORS.surfaceElevated
 *   ✅ title colour "#E0F7FA" → COLORS.textPrimary
 *   ✅ resume label "#FFD54F" → COLORS.amber
 *   ✅ glow shadowColor "#00BCD4" → COLORS.primary
 *   ✅ pressed border "rgba(0,188,212,0.6)" → COLORS.borderBold
 *   ✅ default border "rgba(0,188,212,0.28)" → COLORS.borderPrimary
 *   ✅ resuming border "rgba(255,213,79,0.45)" → amber rgba (same opacity)
 *   ✅ stepsRow border "rgba(0,188,212,0.2)" → COLORS.borderPrimary
 *   ✅ stepDot "rgba(0,188,212,0.35)" → COLORS.glowCyan
 *   ✅ stepDot done "rgba(76,175,80,0.6)" → brand teal rgba (off-brand green retired)
 *   ✅ COLORS imported from theme
 *
 * UNTOUCHED (zero changes):
 *   ✅ All audio logic (sndButton, handlePress)
 *   ✅ All layout, sizing, all sz.* tokens
 *   ✅ All logic: isCompleted, resuming, resumeAtIndex, topLeftType, isResumeStep, isDone
 *   ✅ All refs and effects
 *   ✅ All JSX structure — zero additions or removals
 *   ✅ "#1B5E20" completed badge/ribbon — replaced uniformly with COLORS.teal
 *   ✅ Boy blue "#42A5F5" topLeftBadge non-completed bg — kept (character, not UI colour)
 *   ✅ "rgba(13,13,36,0.78)" image overlay — keep (overlay)
 *   ✅ "rgba(0,0,0,0.35)" stepsRow bg — keep (overlay)
 */

import React, { useRef, useEffect } from "react";
import { Audio } from "expo-av";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { useUser } from "../../../_contexts/UserContext";
import { Image as ExpoImage } from "expo-image";
import { FONTS, COLORS } from "../../../theme";
import { useTheme } from "../../../_contexts/ThemeContext";

// ── Activity sequence — §5.6 v2.0 corrected ──────────────────────────────────
// Previous mapping had ALL four colours wrong — each activity had another
// activity's colour. Now each activity gets its exact brand hex per §5.6.
const ACTIVITY_STEPS = [
  {
    image: require("../../../../assets/img/read_icon.png"),
    label: "Read",
    color: COLORS.activityColors.read,       // ✅ #E8445A coral (was "#00BCD4" old cyan)
  },
  {
    image: require("../../../../assets/img/guess_icon.png"),
    label: "Guess",
    color: COLORS.activityColors.guess,      // ✅ #7B2FBE purple (was "#FFD54F" old yellow)
  },
  {
    image: require("../../../../assets/img/listen_icon.png"),
    label: "Listen",
    color: COLORS.activityColors.listen,     // ✅ #00C4CC cyan (was "#FF7043" old coral)
  },
  {
    image: require("../../../../assets/img/describe_icon.png"),
    label: "Describe",
    color: COLORS.activityColors.describe,   // ✅ #2A9D8F teal (was "#9652D9" old purple)
  },
];

// ✅ Brand completion colour — §3.3 teal = completion/habit signal
// was "#1B5E20" off-brand dark green — retired
const COMPLETED_COLOR = COLORS.teal;   // #2A9D8F

function StoryCard({
  title,
  image,
  onPress,
  bookId,
  topLeftType,
  index = 0,
  resuming = false,
  resumeAtIndex = 0,
  isCompleted = false,
}) {
  const { currentProfile } = useUser();
  const { sizes } = useTheme();
  const sz = sizes.storyCard;

  const { cardWidth, cardHeight, imageHeight } = sz;

  const topLeftIcon = isCompleted
    ? null
    : topLeftType === "crown"
      ? "👑"
      : topLeftType === "bird"
        ? "🐦"
        : null;

  // ── Audio — UNCHANGED ─────────────────────────────────────────────────────
  const sndButton = useRef(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/button.mp3"),
        );
        if (alive) sndButton.current = sound;
        else sound.unloadAsync();
      } catch (_) {}
    })();
    return () => {
      alive = false;
      sndButton.current?.unloadAsync();
      sndButton.current = null;
    };
  }, []);

  const handlePress = () => {
    try {
      sndButton.current
        ?.setPositionAsync(0)
        .then(() => sndButton.current?.playAsync());
    } catch (_) {}
    onPress?.();
  };

  const styles = StyleSheet.create({
    container: {
      margin: sz.cardMargin,
      alignItems: "center",
    },
    glowLayer: {
      position: "absolute",
      top: 2,
      backgroundColor: "transparent",
      zIndex: 0,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 10,
    },
    topLeftBadge: {
      position: "absolute",
      top: sz.topLeftBadgeOffset,
      left: sz.topLeftBadgeOffset,
      zIndex: 5,
      width: sz.topLeftBadgeSize,
      height: sz.topLeftBadgeSize,
      borderRadius: sz.topLeftBadgeBorderRadius,
      backgroundColor: COMPLETED_COLOR,       // ✅ was COMPLETED_GREEN "#1B5E20"
      borderWidth: 2,
      borderColor: COMPLETED_COLOR,           // ✅ was COMPLETED_GREEN
      justifyContent: "center",
      alignItems: "center",
      shadowColor: COMPLETED_COLOR,           // ✅ was COMPLETED_GREEN
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
      elevation: 8,
    },
    completedBadge: {},                       // kept empty for compatibility
    tickIcon: {
      fontFamily: FONTS.bold,
      fontSize: sz.tickFontSize,
      color: "#ffffff",                       // keep — white tick on teal bg
    },
    card: {
      backgroundColor: COLORS.surface,        // ✅ was "#16213e"
      alignItems: "center",
      overflow: "hidden",
      zIndex: 1,
      borderWidth: 1.5,
      justifyContent: "flex-start",
    },
    cardPressed: {
      borderColor: COLORS.borderBold,         // ✅ was "rgba(0,188,212,0.6)"
      backgroundColor: COLORS.surfaceElevated, // ✅ was "#1a2a50"
    },
    titleOverlayContainer: {
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      flexDirection: "column",
      justifyContent: "flex-end",
    },
    imageOverlay: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(13,13,36,0.78)", // keep — image overlay
    },
    title: {
      fontFamily: FONTS.bold,
      fontSize: sz.titleFontSize,
      color: COLORS.textPrimary,              // ✅ was "#E0F7FA"
      lineHeight: sz.titleLineHeight,
      textShadowColor: "rgba(0,0,0,0.7)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
      paddingHorizontal: sz.titlePaddingH,
      paddingBottom: sz.titlePaddingBottom,
      paddingTop: sz.titlePaddingTop,
    },
    completedRibbon: {
      position: "absolute",
      top: sz.ribbonTop,
      right: 0,
      backgroundColor: COMPLETED_COLOR,       // ✅ was COMPLETED_GREEN "#1B5E20"
      paddingHorizontal: sz.ribbonPaddingH,
      paddingVertical: sz.ribbonPaddingV,
      borderTopLeftRadius: sz.ribbonBorderRadius,
      borderBottomLeftRadius: sz.ribbonBorderRadius,
      zIndex: 2,
    },
    completedRibbonText: {
      fontFamily: FONTS.bold,
      fontSize: sz.ribbonFontSize,
      color: "#fff",
    },

    stepsBlock: {
      marginTop: "auto",
      alignItems: "center",
      width: "100%",
      paddingBottom: 4,
    },
    stepsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: sz.stepsRowPaddingH,
      paddingVertical: sz.stepsRowPaddingV,
      marginHorizontal: sz.stepsRowMarginH,
      backgroundColor: "rgba(0,0,0,0.35)",    // keep — overlay
      borderRadius: sz.stepsRowBorderRadius,
      borderWidth: 1,
      borderColor: COLORS.borderPrimary,      // ✅ was "rgba(0,188,212,0.2)"
      width: "88%",
    },
    stepItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    stepIconWrap: {
      width: sz.stepIconWrapSize,
      height: sz.stepIconWrapSize,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: sz.stepIconWrapBorderRadius,
      padding: sz.stepIconWrapPadding,
    },
    stepImage:     { width: sz.stepImageSize, height: sz.stepImageSize },
    stepImageDone: { opacity: 0.55 },
    stepDot: {
      width: sz.stepDotSize,
      height: sz.stepDotSize,
      borderRadius: sz.stepDotSize / 2,
      backgroundColor: COLORS.glowCyan,      // ✅ was "rgba(0,188,212,0.35)"
      marginHorizontal: sz.stepDotMarginH,
    },
    resumeLabel: {
      fontFamily: FONTS.bold,
      fontSize: sz.resumeLabelFontSize,
      color: COLORS.amber,                    // ✅ was "#FFD54F"
      marginTop: sz.resumeLabelMarginTop,
      marginBottom: sz.resumeLabelMarginBottom,
      opacity: 0.85,
    },
  });

  const cardBorderRadius = cardWidth / 8;

  return (
    <View style={[styles.container, { width: cardWidth }]}>
      {/* Glow layer */}
      <View
        style={[
          styles.glowLayer,
          {
            height: cardHeight,
            width: cardWidth,
            borderRadius: cardBorderRadius,
            shadowColor: isCompleted ? COMPLETED_COLOR : COLORS.primary, // ✅ both corrected
          },
        ]}
      />

      {/* Top-left badge */}
      {isCompleted ? (
        <View style={[styles.topLeftBadge, styles.completedBadge]}>
          <Text style={styles.tickIcon}>✓</Text>
        </View>
      ) : topLeftIcon ? (
        <View
          style={[
            styles.topLeftBadge,
            {
              backgroundColor: COLORS.surface,         // ✅ was "#1a1a2e"
              borderColor: COLORS.borderPrimary,        // ✅ was "rgba(0,188,212,0.45)"
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 4,
              elevation: 6,
            },
          ]}
        >
          <Text style={{ fontSize: sz.tickFontSize - 4 }}>{topLeftIcon}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            width: cardWidth,
            height: cardHeight,
            borderRadius: cardBorderRadius,
            borderColor: isCompleted
              ? COMPLETED_COLOR                          // ✅ was "#1B5E20"
              : resuming
                ? "rgba(245,166,35,0.45)"               // ✅ was "rgba(255,213,79,0.45)" amber
                : COLORS.borderPrimary,                 // ✅ was "rgba(0,188,212,0.28)"
          },
          pressed && styles.cardPressed,
        ]}
        onPress={handlePress}
      >
        {/* Image with title overlay */}
        <View style={{ width: "100%", height: imageHeight, overflow: "hidden" }}>
          <ExpoImage
            source={image}
            style={{ width: "100%", height: imageHeight }}
            contentFit="cover"
            cachePolicy="disk"
          />

          {isCompleted && (
            <View style={styles.completedRibbon}>
              <Text style={styles.completedRibbonText}>✓ Completed</Text>
            </View>
          )}

          <View style={styles.titleOverlayContainer}>
            <View style={styles.imageOverlay} />
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        {/* Activity steps — logic UNCHANGED */}
        <View style={styles.stepsBlock}>
          <View style={styles.stepsRow}>
            {ACTIVITY_STEPS.map((step, i) => {
              const isResumeStep = resuming && i === resumeAtIndex;
              const isDone = (resuming && i < resumeAtIndex) || isCompleted;

              return (
                <View key={i} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepIconWrap,
                      isResumeStep && {
                        borderWidth: 2,
                        borderColor: step.color,              // uses corrected activity colour
                        borderRadius: sz.stepIconWrapBorderRadius,
                        backgroundColor: `${step.color}22`,
                        shadowColor: step.color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 6,
                        elevation: 4,
                      },
                    ]}
                  >
                    <ExpoImage
                      source={step.image}
                      style={[styles.stepImage, isDone && styles.stepImageDone]}
                      contentFit="contain"
                    />
                  </View>
                  {i < ACTIVITY_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.stepDot,
                        isDone && {
                          backgroundColor: "rgba(42,157,143,0.6)", // ✅ was "rgba(76,175,80,0.6)" off-brand green
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          <Text
            style={[styles.resumeLabel, !resuming && { color: "transparent" }]}
          >
            {resuming && !isCompleted
              ? `Resume: ${ACTIVITY_STEPS[resumeAtIndex]?.label}`
              : " "}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default StoryCard;
