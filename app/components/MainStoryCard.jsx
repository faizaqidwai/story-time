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
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../app/theme";

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
function PlayButton({ onPress }) {
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
    <View style={{ marginHorizontal: 20 }}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={s.tapHint}
        >
          <Text style={s.tapHintText}>▶ START</Text>
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
  readIconRef,
  guessIconRef,
  listenIconRef,
  describeIconRef,
}) {
  const cardW = Math.min(SW - 45, 420);

  // Keep refs in order matching STEPS so we can attach them in the map.
  const stepRefs = [readIconRef, guessIconRef, listenIconRef, describeIconRef];

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
          {STEPS.map((step, i) => (
            <View
              key={i}
              ref={stepRefs[i] ?? null}
              collapsable={false}
              style={s.stepCard}
            >
              <Image
                source={step.image}
                style={s.stepImage}
                resizeMode="contain"
              />
              <Text style={s.stepLabel}>{step.label}</Text>
            </View>
          ))}
        </View>

        {/* PLAY BUTTON */}
        <View style={{ alignItems: "center" }}>
          <PlayButton onPress={onPress} />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
    marginVertical: 20,
    alignItems: "center",
    shadowColor: T.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 12,
  },
  card: {
    backgroundColor: T.darkBg2,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.35)",
    overflow: "hidden",
    shadowColor: T.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 12,
    paddingBottom: 20,
  },
  imageFrame: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 16,
    overflow: "hidden",
    height: 180,
    borderWidth: 2,
    borderColor: "rgba(255,213,79,0.3)",
    backgroundColor: "#0d0d24",
  },
  storyImage: { width: "100%", height: "100%", borderRadius: 14 },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(10,12,30,0.72)",
    justifyContent: "flex-end",
  },
  // Story title overlay — bold, CoText replaces Noteworthy
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: T.textPrimary,
    lineHeight: 26,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  corner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderColor: "rgba(255,213,79,0.7)",
    zIndex: 3,
  },
  cornerTL: {
    top: 4,
    left: 4,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 4,
    right: 4,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 4,
    left: 4,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 4,
    right: 4,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 4,
  },
  newBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: T.yellow,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 4,
  },
  // "NEW" badge label — bold, very small
  newBadgeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: "#0d0d1a",
    letterSpacing: 1.5,
  },
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  // Story description — light italic
  desc: {
    fontFamily: FONTS.light,
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 18,
    fontStyle: "italic",
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  stepCard: {
    flex: 1,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: "rgba(0,0,0,0.30)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    gap: 6,
  },
  stepImage: { width: 52, height: 52 },
  // Activity step label — bold, small caps feel
  stepLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: T.textPrimary,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  tapHint: {
    backgroundColor: T.teal,
    width: "100%",
    borderRadius: 30,
    paddingHorizontal: 36,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 12,
  },
  // START button text — bold, dark background CTA
  tapHintText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#08081a",
    letterSpacing: 1,
  },
});
