import React, { useRef, useEffect } from "react";
import { Audio } from "expo-av";
import { StyleSheet, Text, Image, Pressable, View } from "react-native";
import { useUser } from "../../../_contexts/UserContext";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../../theme";
import { useTheme } from "../../../_contexts/ThemeContext";

// ── Activity sequence — PNG icons ─────────────────────────────
const ACTIVITY_STEPS = [
  {
    image: require("../../../../assets/img/read_icon.png"),
    label: "Read",
    color: "#00BCD4",
  },
  {
    image: require("../../../../assets/img/guess_icon.png"),
    label: "Guess",
    color: "#FFD54F",
  },
  {
    image: require("../../../../assets/img/listen_icon.png"),
    label: "Listen",
    color: "#FF7043",
  },
  {
    image: require("../../../../assets/img/describe_icon.png"),
    label: "Describe",
    color: "#9652D9",
  },
];

const COMPLETED_GREEN = "#1B5E20";

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
      // ── CHANGE: solid dark green fill, matching completed ribbon color ──
      backgroundColor: COMPLETED_GREEN,
      borderWidth: 2,
      borderColor: COMPLETED_GREEN,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: COMPLETED_GREEN,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
      elevation: 8,
    },
    // completedBadge no longer needed as overrides — base badge now IS the completed style.
    // Kept as empty so nothing breaks if referenced elsewhere.
    completedBadge: {},
    tickIcon: {
      fontFamily: FONTS.bold,
      fontSize: sz.tickFontSize,
      // ── CHANGE: white tick on dark green background ──
      color: "#ffffff",
    },
    card: {
      backgroundColor: "#16213e",
      alignItems: "center",
      overflow: "hidden",
      zIndex: 1,
      borderWidth: 1.5,
      justifyContent: "flex-start",
    },
    cardPressed: {
      borderColor: "rgba(0,188,212,0.6)",
      backgroundColor: "#1a2a50",
    },
    titleOverlayContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "column",
      justifyContent: "flex-end",
    },
    imageOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(13,13,36,0.78)",
    },
    title: {
      fontFamily: FONTS.bold,
      fontSize: sz.titleFontSize,
      color: "#E0F7FA",
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
      // ── CHANGE: same dark green as badge ──
      backgroundColor: COMPLETED_GREEN,
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
      backgroundColor: "rgba(0,0,0,0.35)",
      borderRadius: sz.stepsRowBorderRadius,
      borderWidth: 1,
      borderColor: "rgba(0,188,212,0.2)",
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
    stepImage: {
      width: sz.stepImageSize,
      height: sz.stepImageSize,
    },
    stepImageDone: { opacity: 0.55 },
    stepDot: {
      width: sz.stepDotSize,
      height: sz.stepDotSize,
      borderRadius: sz.stepDotSize / 2,
      backgroundColor: "rgba(0,188,212,0.35)",
      marginHorizontal: sz.stepDotMarginH,
    },
    resumeLabel: {
      fontFamily: FONTS.bold,
      fontSize: sz.resumeLabelFontSize,
      color: "#FFD54F",
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
            shadowColor: isCompleted ? COMPLETED_GREEN : "#00BCD4",
          },
        ]}
      />

      {/* Top-left badge — solid dark green when completed, generic otherwise */}
      {isCompleted ? (
        <View style={[styles.topLeftBadge, styles.completedBadge]}>
          <Text style={styles.tickIcon}>✓</Text>
        </View>
      ) : topLeftIcon ? (
        <View
          style={[
            styles.topLeftBadge,
            {
              backgroundColor: "#1a1a2e",
              borderColor: "rgba(0,188,212,0.45)",
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
              ? "#1B5E20"
              : resuming
                ? "rgba(255,213,79,0.45)"
                : "rgba(0,188,212,0.28)",
          },
          pressed && styles.cardPressed,
        ]}
        onPress={handlePress}
      >
        {/* Image with title overlay */}
        <View
          style={{ width: "100%", height: imageHeight, overflow: "hidden" }}
        >
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

        {/* Activity steps */}
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
                        borderColor: step.color,
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
                        isDone && { backgroundColor: "rgba(76,175,80,0.6)" },
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
