import React, { useEffect, useRef } from "react";
import { Audio } from "expo-av";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { FONTS } from "../../app/theme";
import { useTheme } from "../../app/_contexts/ThemeContext";
import { Image as ExpoImage } from "expo-image";

const { width: SW } = Dimensions.get("window");
const T = {
  darkBg2: "#16213e",
  teal: "#00BCD4",
  yellow: "#FFD54F",
  coral: "#FF7043",
  purple: "#9652D9",
  textPrimary: "#E0F7FA",
  textMuted: "#7a9aaa",
};

// ── Activity steps — PNG icons ────────────────────────────────
const STEPS = [
  { image: require("../../assets/img/read_icon.png"), label: "Read" },
  { image: require("../../assets/img/guess_icon.png"), label: "Guess" },
  { image: require("../../assets/img/listen_icon.png"), label: "Listen" },
  { image: require("../../assets/img/describe_icon.png"), label: "Describe" },
];

// ─────────────────────────────────────────────────────────────
// Play button
// ─────────────────────────────────────────────────────────────
function PlayButton({ onPress, sz }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const sndSelect = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/button.mp3"),
        );
        if (alive) sndSelect.current = sound;
        else sound.unloadAsync();
      } catch (_) {}
    })();
    return () => {
      alive = false;
      sndSelect.current?.unloadAsync();
      sndSelect.current = null;
    };
  }, []);

  const handlePress = () => {
    try {
      sndSelect.current
        ?.setPositionAsync(0)
        .then(() => sndSelect.current?.playAsync());
    } catch (_) {}
    onPress?.();
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={{ marginHorizontal: sz.tapHintMarginH }}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={{
            backgroundColor: T.teal,
            width: "100%",
            borderRadius: sz.tapHintBorderRadius,
            paddingHorizontal: sz.tapHintPaddingH,
            paddingVertical: sz.tapHintPaddingV,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: T.teal,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.tapHintFontSize,
              color: "#08081a",
              letterSpacing: sz.tapHintLetterSpacing,
            }}
          >
            ▶ START
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function MainStoryCard({
  title,
  description,
  image,
  onPress,
  // Tutorial refs — wired from home.jsx so HomeTutorial can
  // measureInWindow() each activity icon card for spotlight highlighting.
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
  const activeIdx = progressIndex < 4 ? progressIndex : -1;

  const stepRefs = [readIconRef, guessIconRef, listenIconRef, describeIconRef];

  // Build styles from tokens
  const s = StyleSheet.create({
    wrapper: {
      alignSelf: "center",
      marginVertical: sz.cardMarginVertical,
      alignItems: "center",
      shadowColor: T.teal,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 12,
      elevation: 12,
    },
    card: {
      backgroundColor: T.darkBg2,
      borderRadius: sz.cardBorderRadius,
      borderWidth: 1.5,
      borderColor: "rgba(0,188,212,0.35)",
      overflow: "hidden",
      shadowColor: T.teal,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 18,
      elevation: 12,
      paddingBottom: sz.cardPaddingBottom,
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
    newBadge: {
      position: "absolute",
      top: sz.newBadgeTop,
      right: sz.newBadgeRight,
      backgroundColor: T.yellow,
      borderRadius: sz.newBadgeBorderRadius,
      paddingHorizontal: sz.newBadgePaddingH,
      paddingVertical: sz.newBadgePaddingV,
      zIndex: 4,
    },
    newBadgeTxt: {
      fontFamily: FONTS.bold,
      fontSize: sz.newBadgeFontSize,
      color: "#0d0d1a",
      letterSpacing: sz.newBadgeLetterSpacing,
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
      marginBottom: sz.stepsRowMarginBottom,
      gap: sz.stepsRowGap,
    },
    stepCard: {
      flex: 1,
      height: sz.stepCardHeight,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: sz.stepCardPaddingV,
      paddingHorizontal: sz.stepCardPaddingH,
      backgroundColor: "rgba(0,0,0,0.30)",
      borderRadius: sz.stepCardBorderRadius,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      overflow: "hidden",
      gap: sz.stepCardGap,
    },
    stepCardActive: {
      borderColor: "rgba(0,188,212,0.75)",
      backgroundColor: "rgba(0,188,212,0.13)",
      borderWidth: 2,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
      elevation: 8,
    },
    stepCardDone: {
      borderColor: "rgba(255,255,255,0.05)",
      backgroundColor: "rgba(0,0,0,0.18)",
    },
    stepImage: { width: sz.stepImageSize, height: sz.stepImageSize },
    stepImageDone: { opacity: 0.45 },
    stepLabel: {
      fontFamily: FONTS.bold,
      fontSize: sz.stepLabelFontSize,
      color: T.textPrimary,
      letterSpacing: sz.stepLabelLetterSpacing,
      textAlign: "center",
    },
    stepLabelActive: { color: T.teal },
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
    activeDot: {
      position: "absolute",
      bottom: sz.activeDotBottom,
      width: sz.activeDotSize,
      height: sz.activeDotSize,
      borderRadius: sz.activeDotSize / 2,
      backgroundColor: T.teal,
      shadowColor: T.teal,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 4,
    },
  });

  return (
    <View style={[s.wrapper, { width: cardW }]}>
      <View style={[s.card, { width: cardW }]}>
        {/* STORY IMAGE with title overlay */}
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
            <View style={s.newBadge}>
              <Text style={s.newBadgeTxt}>NEW</Text>
            </View>
          </View>
        )}

        {/* DESCRIPTION */}
        <View style={s.body}>
          <Text style={s.desc} numberOfLines={2}>
            {description}
          </Text>
        </View>

        {/* ACTIVITY STEPS — 4 icon cards */}
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => {
            const isCompleted = i < progressIndex;
            const isActive = i === progressIndex && progressIndex < 4;

            return (
              <Animated.View
                key={i}
                ref={stepRefs[i] ?? null}
                collapsable={false}
                style={[
                  s.stepCard,
                  isActive && s.stepCardActive,
                  isCompleted && s.stepCardDone,
                  { transform: [{ scale: pulseAnims[i] }] },
                ]}
              >
                <ExpoImage
                  source={step.image}
                  style={[s.stepImage, isCompleted && s.stepImageDone]}
                  contentFit="contain"
                />
                <Text style={[s.stepLabel, isActive && s.stepLabelActive]}>
                  {step.label}
                </Text>
                {isCompleted && (
                  <View style={s.checkBadge}>
                    <Text style={s.checkText}>✓</Text>
                  </View>
                )}
                {isActive && <View style={s.activeDot} />}
              </Animated.View>
            );
          })}
        </View>

        {/* PLAY BUTTON */}
        <View style={{ alignItems: "center" }}>
          <PlayButton onPress={onPress} sz={sz} />
        </View>
      </View>
    </View>
  );
}
