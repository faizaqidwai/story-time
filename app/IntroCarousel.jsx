// app/IntroCarousel.jsx
//
// Introductory 4-slide carousel shown to first-time users.
// After last slide (or Skip) → AccountChoice screen.
//
// Image → Slide mapping:
//   c1.jpg  (open book / world)         → Slide 1: Welcome to Story Time
//   c2.jpg  (path to graduation cap)    → Slide 2: Curriculum journey
//   c3.jpg  (kids guessing/listening)   → Slide 3: Challenge activities
//   c4.jpg  (read→listen→describe loop) → Slide 4: The word cycle

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  yellow: "#FFD54F",
  coral: "#FF7043",
  purple: "#9652D9",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const SLIDES = [
  {
    id: "1",
    image: require("../assets/img/c1.jpg"),
    accentColor: C.teal,
    tagline: "Welcome to Story Time",
    title: "Where every story\nplants the seed of a\npowerful vocabulary",
    body: "Your child discovers a world of carefully crafted stories — each one designed to match their age, curiosity and growing mind.",
  },
  {
    id: "2",
    image: require("../assets/img/c2.jpg"),
    accentColor: C.yellow,
    tagline: "A Journey Built to Grow With Them",
    title: "From first words to\nconfident readers",
    body: "Our step-by-step learning path takes children from beginner to advanced vocabulary — naturally, playfully, at exactly the right pace.",
  },
  {
    id: "3",
    image: require("../assets/img/c3.jpg"),
    accentColor: C.coral,
    tagline: "Learning That Feels Like Playing",
    title: "Four fun challenges\nbuilt into every story",
    body: "After every story, kids Guess the hidden word, Listen and answer questions, and Describe what they learned. Every challenge builds words deeper into memory.",
  },
  {
    id: "4",
    image: require("../assets/img/c4.jpg"),
    accentColor: C.purple,
    tagline: "Read · Guess · Listen · Describe",
    title: "A proven cycle that\nmakes new words stick",
    body: "Children don't just read words — they hear them, use them and own them. Each story cycle builds real vocabulary that stays with them for life.",
  },
];

// ── Static starfield ───────────────────────────────────────────────────────
const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % SW,
  y: (i * 97.3) % (SH * 0.5),
  size: 1.5 + (i % 3),
  opacity: 0.1 + (i % 4) * 0.07,
}));

// ── Dot indicators ─────────────────────────────────────────────────────────
function Dots({ total, current, accentColor }) {
  return (
    <View style={dotS.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotS.dot,
            {
              backgroundColor:
                i === current ? accentColor : "rgba(255,255,255,0.2)",
              width: i === current ? 26 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const dotS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});

// ── Single slide ───────────────────────────────────────────────────────────
function SlideItem({ slide, index, scrollX }) {
  const inputRange = [(index - 1) * SW, index * SW, (index + 1) * SW];

  const textOp = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  });
  const textY = scrollX.interpolate({
    inputRange,
    outputRange: [28, 0, -28],
    extrapolate: "clamp",
  });
  const imgSc = scrollX.interpolate({
    inputRange,
    outputRange: [0.93, 1, 0.93],
    extrapolate: "clamp",
  });

  const IMAGE_H = SH * 0.57;

  return (
    <View style={{ width: SW, flex: 1 }}>
      {/* Image */}
      <Animated.View
        style={{
          height: IMAGE_H,
          overflow: "hidden",
          transform: [{ scale: imgSc }],
        }}
      >
        <Image source={slide.image} style={sS.image} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(8,8,26,0.65)", "#08081a"]}
          style={sS.gradient}
          locations={[0.4, 0.75, 1]}
        />
      </Animated.View>

      {/* Text */}
      <Animated.View
        style={[
          sS.textWrap,
          { opacity: textOp, transform: [{ translateY: textY }] },
        ]}
      >
        <View
          style={[
            sS.pill,
            {
              backgroundColor: slide.accentColor + "33",
              borderColor: slide.accentColor + "99",
            },
          ]}
        >
          <Text style={[sS.tagline, { color: slide.accentColor }]}>
            {slide.tagline}
          </Text>
        </View>

        <Text style={sS.title}>{slide.title}</Text>
        <Text style={sS.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
}

const sS = StyleSheet.create({
  image: { width: "100%", height: "100%" },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
  },
  textWrap: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 6,
    gap: 10,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  title: {
    fontFamily:
      Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
    fontSize: 26,
    fontWeight: "900",
    color: "#E0F7FA",
    lineHeight: 34,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 13,
    color: "#7a9aaa",
    lineHeight: 21,
    fontWeight: "500",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function IntroCarousel() {
  const router = useRouter();
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    router.replace("/AccountChoice");
  }, []);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      goNext();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const accent = SLIDES[currentIndex].accentColor;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Starfield */}
      {STARS.map((s) => (
        <View
          key={s.id}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: "#fff",
            opacity: s.opacity,
          }}
        />
      ))}

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={goNext}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
          setCurrentIndex(idx);
        }}
        renderItem={({ item, index }) => (
          <SlideItem slide={item} index={index} scrollX={scrollX} />
        )}
        getItemLayout={(_, index) => ({
          length: SW,
          offset: SW * index,
          index,
        })}
      />

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Dots
          total={SLIDES.length}
          current={currentIndex}
          accentColor={accent}
        />

        {isLast ? (
          <TouchableOpacity
            style={[
              styles.getStartedBtn,
              { backgroundColor: accent, shadowColor: accent },
            ]}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started ✦</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { borderColor: accent + "80" }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextText, { color: accent }]}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    right: 20,
    zIndex: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  skipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7a9aaa",
    letterSpacing: 0.3,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    paddingTop: 14,
    backgroundColor: C.bg,
  },

  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 30,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  nextText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },

  getStartedBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 8,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#08081a",
    letterSpacing: 0.5,
  },
});
