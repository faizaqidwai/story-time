import React, { useRef, useEffect } from "react";
import { Audio } from "expo-av";
import {
  StyleSheet,
  Text,
  Image,
  Pressable,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useUser } from "../_contexts/UserContext";
import { Image as ExpoImage } from "expo-image";

// ── Activity sequence — PNG icons ─────────────────────────────
const ACTIVITY_STEPS = [
  {
    image: require("../../assets/img/read_icon.png"),
    label: "Read",
    color: "#00BCD4",
  },
  {
    image: require("../../assets/img/guess_icon.png"),
    label: "Guess",
    color: "#FFD54F",
  },
  {
    image: require("../../assets/img/listen_icon.png"),
    label: "Listen",
    color: "#FF7043",
  },
  {
    image: require("../../assets/img/describe_icon.png"),
    label: "Describe",
    color: "#9652D9",
  },
];

// ─────────────────────────────────────────────────────────────
// Props:
//   title, image, onPress, bookId, index
//   resuming       — bool: is there an in-progress session for this story?
//   resumeAtIndex  — number (0-3): which activity step to resume at
//   isCompleted    — bool: all 4 activities finished for this story
//   topLeftType    — "crown" | "bird" | undefined  (ignored when isCompleted)
// ─────────────────────────────────────────────────────────────
function StoryCard({
  title,
  image,
  intro,
  onPress,
  bookId,
  topLeftType,
  index = 0,
  resuming = false,
  resumeAtIndex = 0,
  isCompleted = false,
}) {
  const { width } = useWindowDimensions();
  const { currentProfile } = useUser();

  const isTablet = width >= 768;
  const cardWidth = isTablet ? 250 : 175;
  const cardHeight = isTablet ? 290 : 252;
  const imageHeight = isTablet ? 155 : 135;
  const iconSize = isTablet ? 20 : 16;

  const topLeftIcon = isCompleted
    ? null
    : topLeftType === "crown"
      ? "👑"
      : topLeftType === "bird"
        ? "🐦"
        : null;

  // ── Button sound ──────────────────────────────────────────
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

  return (
    <View style={[styles.container, { width: cardWidth }]}>
      {/* Glow layer */}
      <View
        style={[
          styles.glowLayer,
          {
            height: cardHeight,
            width: cardWidth,
            borderRadius: cardWidth / 8,
            shadowColor: isCompleted ? "#4CAF50" : "#00BCD4",
          },
        ]}
      />

      {/* Top-left badge */}
      {isCompleted ? (
        <View style={[styles.topLeftBadge, styles.completedBadge]}>
          <Text style={styles.tickIcon}>✓</Text>
        </View>
      ) : topLeftIcon ? (
        <View style={styles.topLeftBadge}>
          <Text style={{ fontSize: iconSize + 2 }}>{topLeftIcon}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            width: cardWidth,
            height: cardHeight,
            borderRadius: cardWidth / 8,
            borderColor: isCompleted
              ? "rgba(76,175,80,0.45)"
              : resuming
                ? "rgba(255,213,79,0.45)"
                : "rgba(0,188,212,0.28)",
          },
          pressed && styles.cardPressed,
        ]}
        onPress={handlePress}
      >
        {/* ── Image with title overlay ── */}
        <View
          style={{ width: "100%", height: imageHeight, overflow: "hidden" }}
        >
          <ExpoImage
            source={image}
            style={{ width: "100%", height: imageHeight }}
            contentFit="cover"
            cachePolicy="disk"
          />
          <View style={styles.imageOverlay} />
          <View style={styles.titleOverlay}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
          {isCompleted && (
            <View style={styles.completedRibbon}>
              <Text style={styles.completedRibbonText}>✓ Completed</Text>
            </View>
          )}
        </View>

        {/* ── Intro text ── */}
        <Text style={styles.intro} numberOfLines={3}>
          {intro}
        </Text>

        {/* ── Activity steps ── */}
        {/* marginTop:"auto" pushes this block to the bottom of the card.    */}
        {/* The resumeLabel below is ALWAYS rendered (empty string when not  */}
        {/* resuming) so both cards occupy the same vertical space and the   */}
        {/* icon bar sits at the same position regardless of resume state.   */}
        <View style={styles.stepsBlock}>
          <View style={styles.stepsRow}>
            {ACTIVITY_STEPS.map((step, i) => {
              const isResumeStep = resuming && i === resumeAtIndex;
              // Steps before current are "done" visually (shown as-is but
              // with a green dot). The icon itself is NEVER replaced —
              // only the current step gets a coloured border highlight.
              const isDone = (resuming && i < resumeAtIndex) || isCompleted;

              return (
                <View key={i} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepIconWrap,
                      isResumeStep && {
                        borderWidth: 2,
                        borderColor: step.color,
                        borderRadius: 8,
                        backgroundColor: `${step.color}22`,
                        shadowColor: step.color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 6,
                        elevation: 4,
                      },
                    ]}
                  >
                    {/* Always show the real PNG icon — never replace with tick */}
                    <Image
                      source={step.image}
                      style={[styles.stepImage, isDone && styles.stepImageDone]}
                      resizeMode="contain"
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

          {/* Always reserve the same height for the resume label.          */}
          {/* Invisible when not resuming so both cards align identically.  */}
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

const styles = StyleSheet.create({
  container: {
    margin: 10,
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
    top: -10,
    left: -10,
    zIndex: 5,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "rgba(0,188,212,0.45)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  completedBadge: {
    backgroundColor: "rgba(76,175,80,0.2)",
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  tickIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4CAF50",
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
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "30%",
    backgroundColor: "rgba(13,13,36,0.78)",
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 12,
  },
  title: {
    fontFamily:
      Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
    fontSize: 14,
    fontWeight: "900",
    color: "#E0F7FA",
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  completedRibbon: {
    position: "absolute",
    top: 8,
    right: 0,
    backgroundColor: "rgba(76,175,80,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  completedRibbonText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  intro: {
    fontSize: 10,
    color: "#7a9aaa",
    fontStyle: "italic",
    lineHeight: 14,
    textAlign: "center",
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 2,
    flexShrink: 1,
  },

  // ── Steps block — pushed to card bottom, always same height ──
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
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.2)",
    width: "88%",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepIconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    padding: 2,
  },
  // Real PNG icon — never replaced with emoji
  stepImage: {
    width: 20,
    height: 20,
  },
  // Completed steps shown slightly dimmed so current step stands out
  stepImageDone: {
    opacity: 0.55,
  },
  stepDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,188,212,0.35)",
    marginHorizontal: 3,
  },
  // Always rendered — transparent when not resuming to hold space
  resumeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFD54F",
    marginTop: 4,
    marginBottom: 2,
    opacity: 0.85,
  },
});

export default StoryCard;
