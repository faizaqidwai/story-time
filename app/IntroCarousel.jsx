// app/IntroCarousel.jsx
//
// Revamped 3-slide intro carousel.
//
// Layout per slide:
//   ┌──────────────────────────────────┐
//   │  TOP 30%  — slide title          │
//   ├─────────────────┬────────────────┤
//   │  LEFT 50%       │  RIGHT 50%     │  ← bottom 70%
//   │  (text or vis.) │  (vis. or txt) │
//   └─────────────────┴────────────────┘
//
// Slide 1: title top | description left (lines fade in) | level badges right
// Slide 2: title top | activity badges left             | description right
// Slide 3: title top | description left                 | story cards right (auto-scroll)
//
// Sounds:
//   pop.mp3    — each level badge (slide 1) and activity badge (slide 2) appears
//   swish.mp3  — carousel page turn + slide 3 auto-scroll tick
//   button.mp3 — Get Started button pressed
//
// Background: full-screen looping video with dark blue overlay.
// After last slide (or Skip) → AccountChoice screen.

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
  StatusBar,
  ScrollView,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { Video, ResizeMode } from "expo-av";
import { FONTS, COLORS } from "./theme";
import { useTheme } from "./_contexts/ThemeContext";
import { font, pad, radius, size } from "./theme/tokens"; // ← ADD
// ── Timing (ms) ────────────────────────────────────────────────────────────
const LINE_DUR = 480;
const LINE_STAGGER = 550;
const VIS_DELAY = 250;
const VIS_STAGGER = 220;

// ── Sound helper ──────────────────────────────────────────────────────────
async function playSound(file) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (_) {}
}

// ── Carousel cover images ─────────────────────────────────────────────────
const COVERS = [
  require("../assets/img/intro/the-enchanted-forest.jpg"),
  require("../assets/img/intro/the-space-adventure.jpg"),
  require("../assets/img/intro/the-dragons-secret.jpg"),
  require("../assets/img/intro/ocean-mysteries.jpg"),
  require("../assets/img/intro/the-brave little-robot.jpg"),
  require("../assets/img/intro/jungle-rythms.jpg"),
  require("../assets/img/intro/the-star-light-library.jpg"),
  require("../assets/img/intro/cloud-kingdom.jpg"),
  require("../assets/img/intro/the-inventors-workshop.jpg"),
  require("../assets/img/intro/the-midnight-garden.jpg"),
  require("../assets/img/intro/the-talking-mountains.jpg"),
  require("../assets/img/intro/the-polar-expedition.jpg"),
  require("../assets/img/intro/the-magic-paintbrush.jpg"),
  require("../assets/img/intro/the-city-of-echoes.jpg"),
  require("../assets/img/intro/the-lightning-catcher.jpg"),
  require("../assets/img/intro/beneath-the-desert.jpg"),
  require("../assets/img/intro/the-friendship-bridge.jpg"),
  require("../assets/img/intro/sky-pirates.jpg"),
  require("../assets/img/intro/the-whispering-seeds.jpg"),
  require("../assets/img/intro/the-dream-weavers.jpg"),
];

// ── Dummy story data for slide 3 ──────────────────────────────────────────
const DUMMY_STORIES = [
  {
    id: "1",
    title: "The Enchanted Forest",
    intro: "A young explorer discovers a magical world behind an ancient oak.",
    color: COLORS.teal,
    image: COVERS[0],
  },
  {
    id: "2",
    title: "Space Adventure",
    intro:
      "Captain Nova leads her crew through the galaxy searching for a lost star.",
    color: COLORS.purple,
    image: COVERS[1],
  },
  {
    id: "3",
    title: "The Dragon's Secret",
    intro: "Deep in the mountains lives a dragon with a heartwarming secret.",
    color: COLORS.coral,
    image: COVERS[2],
  },
  {
    id: "4",
    title: "Ocean Mysteries",
    intro: "Dive deep with Maya as she uncovers treasures beneath the waves.",
    color: COLORS.yellow,
    image: COVERS[3],
  },
  {
    id: "5",
    title: "The Brave Little Robot",
    intro: "A tiny robot learns what it truly means to be a hero.",
    color: COLORS.teal,
    image: COVERS[4],
  },
  {
    id: "6",
    title: "Jungle Rhythms",
    intro: "Follow Kito through a vibrant jungle alive with music and wonder.",
    color: "#4CAF50",
    image: COVERS[5],
  },
  {
    id: "7",
    title: "The Starlight Library",
    intro: "Every book in this magical library opens a door to another world.",
    color: COLORS.purple,
    image: COVERS[6],
  },
  {
    id: "8",
    title: "Cloud Kingdom",
    intro: "High above the earth, a kingdom of clouds holds ancient secrets.",
    color: COLORS.teal,
    image: COVERS[7],
  },
  {
    id: "9",
    title: "The Inventor's Workshop",
    intro:
      "Young Petra builds incredible machines from scraps in her backyard.",
    color: COLORS.yellow,
    image: COVERS[8],
  },
  {
    id: "10",
    title: "Midnight Garden",
    intro:
      "When the clock strikes twelve, the garden awakens with astonishing life.",
    color: COLORS.coral,
    image: COVERS[9],
  },
  {
    id: "11",
    title: "The Talking Mountains",
    intro:
      "Two siblings discover mountains with stories older than time itself.",
    color: COLORS.teal,
    image: COVERS[10],
  },
  {
    id: "12",
    title: "Polar Expedition",
    intro: "A team of young explorers races to rescue a family of polar bears.",
    color: "#4CAF50",
    image: COVERS[11],
  },
  {
    id: "13",
    title: "The Magic Paintbrush",
    intro: "Whatever Lena paints comes to life — but not always as expected.",
    color: "#EC407A",
    image: COVERS[12],
  },
  {
    id: "14",
    title: "City of Echoes",
    intro:
      "In a city built inside a canyon, every sound carries a hidden message.",
    color: COLORS.purple,
    image: COVERS[13],
  },
  {
    id: "15",
    title: "The Lightning Catcher",
    intro: "Brave Sam harnesses lightning to power her tiny seaside village.",
    color: COLORS.yellow,
    image: COVERS[14],
  },
  {
    id: "16",
    title: "Beneath the Desert",
    intro: "Below the burning sands lies an ancient civilisation to be found.",
    color: COLORS.coral,
    image: COVERS[15],
  },
  {
    id: "17",
    title: "The Friendship Bridge",
    intro: "Building a bridge teaches two rival villages the meaning of unity.",
    color: COLORS.teal,
    image: COVERS[16],
  },
  {
    id: "18",
    title: "Sky Pirates",
    intro: "Captain Cloud sails the skies on a ship made entirely of wind.",
    color: COLORS.purple,
    image: COVERS[17],
  },
  {
    id: "19",
    title: "The Whispering Seeds",
    intro:
      "A small seed carries within it the story of an entire ancient forest.",
    color: "#4CAF50",
    image: COVERS[18],
  },
  {
    id: "20",
    title: "The Dream Weavers",
    intro:
      "At the edge of sleep, three children weave dreams into golden threads.",
    color: "#EC407A",
    image: COVERS[19],
  },
];

// ── Activity icons (same as MainStoryCard) ────────────────────────────────
const ACTIVITY_STEPS = [
  {
    image: require("../assets/img/read_icon.png"),
    label: "Read",
    color: COLORS.teal,
  },
  {
    image: require("../assets/img/guess_icon.png"),
    label: "Guess",
    color: COLORS.yellow,
  },
  {
    image: require("../assets/img/listen_icon.png"),
    label: "Listen",
    color: COLORS.coral,
  },
  {
    image: require("../assets/img/describe_icon.png"),
    label: "Describe",
    color: COLORS.purple,
  },
];

// ── Slide definitions ─────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "3",
    accentColor: "#00BCD4",
    title: "Get Ready to Explore Story Time",
    subtitle: "With Your Child!",
    descSide: "left",
    visSide: "right",
    visType: "stories",
    lines: [
      "Explore 100+ stories crafted for every curious mind",
      "Unlock 1,000+ new words through play — not memorisation",
      "Track your child's progress across levels, badges and rewards",
    ],
  },
];

// ── Level badge data ───────────────────────────────────────────────────────
const LEVEL_NUMS = [1, 5, 10, 20, "30+"];
const LEVEL_COLORS = [
  COLORS.teal,
  COLORS.yellow,
  COLORS.coral,
  COLORS.purple,
  COLORS.teal,
  COLORS.yellow,
];
const STEP_COLORS = [COLORS.teal, COLORS.yellow, COLORS.coral, COLORS.purple];

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL BADGE MINI — slide 1 visual
// ─────────────────────────────────────────────────────────────────────────────
function LevelBadgeMini({ level, color, anim }) {
  const { sizes } = useTheme();
  const sz = sizes.carousel;
  const slideX = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const barPct =
    typeof level === "number" ? `${Math.round((level / 30) * 100)}%` : "100%";
  const innerSize = sz.badgeInnerSize;
  return (
    <Animated.View
      style={{
        alignItems: "center",
        marginVertical: sz.badgeMarginV,
        opacity: anim,
        transform: [{ translateX: slideX }],
      }}
    >
      <View
        style={{
          width: sz.badgeRingSize,
          height: sz.badgeRingSize,
          borderRadius: sz.badgeRingSize / 2,
          backgroundColor: "#0d0f22",
          borderWidth: 2.5,
          borderColor: color + "77",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.7,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: "#10122a",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: -6,
              right: -6,
              height: "55%",
              backgroundColor: color + "20",
              transform: [{ rotate: "-6deg" }, { translateY: -3 }],
            }}
          />
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.badgeLvlLabelSize,
              color,
              letterSpacing: 2,
            }}
          >
            LEVEL
          </Text>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.badgeLvlNumSize,
              color: "#E0F7FA",
              lineHeight: sz.badgeLvlNumSize + 4,
              textShadowColor: color,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
            }}
          >
            {level}
          </Text>
        </View>
      </View>
      <View
        style={{
          width: sz.badgeBarWidth,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.08)",
          marginTop: 6,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            borderRadius: 3,
            backgroundColor: color,
            width: barPct,
          }}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY BADGE MINI — slide 2 visual
// ─────────────────────────────────────────────────────────────────────────────
function ActivityBadgeMini({ step, anim, halfW }) {
  const { sizes } = useTheme();
  const sz = sizes.carousel;
  const slideX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 0],
  });
  return (
    <Animated.View
      style={{
        marginVertical: sz.activityMarginV,
        opacity: anim,
        transform: [{ translateX: slideX }],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 20,
          borderWidth: 1.5,
          paddingVertical: sz.activityCardPaddingV,
          paddingHorizontal: sz.activityCardPaddingH,
          gap: 12,
          width: halfW - 22,
          borderColor: step.color + "66",
          backgroundColor: step.color + "16",
        }}
      >
        <View
          style={{
            width: sz.activityIconBoxSize,
            height: sz.activityIconBoxSize,
            borderRadius: 16,
            borderWidth: 1.5,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderColor: step.color + "88",
            backgroundColor: step.color + "20",
          }}
        >
          <Image
            source={step.image}
            style={{ width: sz.activityIconSize, height: sz.activityIconSize }}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1, gap: 7 }}>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.activityLabelFontSize,
              color: step.color,
              letterSpacing: 0.3,
            }}
          >
            {step.label}
          </Text>
          <View
            style={{
              width: 36,
              height: 6,
              borderRadius: 3,
              justifyContent: "center",
              backgroundColor: step.color + "33",
            }}
          >
            <View
              style={{
                width: 12,
                height: 6,
                borderRadius: 3,
                backgroundColor: step.color,
              }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY CARD MINI
// ─────────────────────────────────────────────────────────────────────────────
function StoryCardMini({ story }) {
  const { sizes } = useTheme();
  const sz = sizes.carousel;
  const { width: SW } = useWindowDimensions();
  const cardW = SW * 0.5 - 22;
  const imageH = Math.round(cardW * 0.72);
  return (
    <View
      style={{
        width: cardW,
        backgroundColor: "#16213e",
        borderRadius: 22,
        borderWidth: 1.5,
        marginBottom: sz.storyCardMarginBottom,
        overflow: "hidden",
        borderColor: story.isCompleted
          ? "rgba(76,175,80,0.45)"
          : "rgba(0,188,212,0.28)",
      }}
    >
      <View
        style={{
          width: "100%",
          height: imageH,
          overflow: "hidden",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        {story.image ? (
          <Image
            source={story.image}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: story.color + "55",
            }}
          >
            <Text style={{ fontSize: 28 }}>📖</Text>
          </View>
        )}
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            borderRadius: 7,
            paddingHorizontal: 7,
            paddingVertical: 3,
            zIndex: 2,
            backgroundColor: story.color,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.xs,
              color: "#08081a",
              letterSpacing: 1.2,
            }}
          >
            NEW
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "25%",
            backgroundColor: "rgba(13,13,36,0.78)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 10,
            paddingBottom: 9,
            paddingTop: 6,
            zIndex: 1,
            justifyContent: "center",
            height: "25%",
            // alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.lg,
              color: "#E0F7FA",
              lineHeight: sz.storyCardTitleLineHeight,
              textShadowColor: "rgba(0,0,0,0.7)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {story.title}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontFamily: FONTS.light,
          fontSize: font.s,
          color: "#7a9aaa",
          fontStyle: "italic",
          lineHeight: sz.storyCardIntroLineHeight,
          paddingHorizontal: 10,
          paddingTop: 8,
          paddingBottom: 4,
          flexShrink: 1,
        }}
        numberOfLines={3}
      >
        {story.intro}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginHorizontal: 10,
          marginBottom: 10,
          backgroundColor: "rgba(0,0,0,0.3)",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(0,188,212,0.2)",
        }}
      >
        {STEP_COLORS.map((c, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: sz.storyDotSize,
                height: sz.storyDotSize,
                borderRadius: sz.storyDotSize / 2,
                backgroundColor: c + "99",
              }}
            />
            {i < STEP_COLORS.length - 1 && (
              <View
                style={{
                  width: sz.storyConnectorWidth,
                  height: 2,
                  backgroundColor: "rgba(0,188,212,0.25)",
                  marginHorizontal: 3,
                }}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIPTION LINE — fade + slide up on appear
// ─────────────────────────────────────────────────────────────────────────────
function DescLine({ text, anim, isFirst }) {
  const { sizes } = useTheme();
  const sz = sizes.carousel;
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  return (
    <Animated.Text
      style={[
        isFirst
          ? {
              fontFamily: FONTS.bold,
              fontSize: sz.descLineFirstFontSize,
              color: "#E0F7FA",
              lineHeight: sz.descLineFirstLineHeight,
              marginBottom: 14,
            }
          : {
              fontFamily: FONTS.light,
              fontSize: sz.descLineBodyFontSize,
              color: "#E0F7FA",
              lineHeight: sz.descLineBodyLineHeight,
              marginBottom: 10,
            },
        { opacity: anim, transform: [{ translateY }] },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function SlidePanel({ slide, isActive }) {
  const { width: SW, height: SH } = useWindowDimensions();
  const { sizes } = useTheme();
  const sz = sizes.carousel;
  const TOP_H = SH * sz.topHeightRatio;
  const BOT_H = SH * sz.botHeightRatio;
  const HALF_W = SW * 0.5;
  const S1_DESC_W = SW * sz.s1DescRatio;
  const S1_VIS_W = SW * sz.s1VisRatio;
  const CARD_W = HALF_W - 22;

  const lineCount = slide.lines.length;
  const visCount =
    slide.visType === "levels"
      ? LEVEL_NUMS.length
      : slide.visType === "activities"
        ? ACTIVITY_STEPS.length
        : 0;

  // ── Slide 1: compute how many level badges fit ────────────────────────────
  const BADGE_H = sz.badgeRingSize + 12 + sz.badgeMarginV * 2;
  const AVAILABLE_H = BOT_H - 16 - 88 - 20;
  const MAX_FIT = Math.floor(AVAILABLE_H / BADGE_H);

  const buildLevelSubset = () => {
    if (MAX_FIT >= LEVEL_NUMS.length)
      return LEVEL_NUMS.map((lv, i) => ({ lv, i }));
    if (MAX_FIT <= 2)
      return [
        { lv: LEVEL_NUMS[0], i: 0 },
        { lv: LEVEL_NUMS[LEVEL_NUMS.length - 1], i: LEVEL_NUMS.length - 1 },
      ];
    const middle = LEVEL_NUMS.slice(1, -1).map((lv, idx) => ({
      lv,
      i: idx + 1,
    }));
    const middleCount = MAX_FIT - 2;
    const step = Math.max(1, Math.floor(middle.length / middleCount));
    const picked = [];
    for (let j = 0; j < middle.length && picked.length < middleCount; j += step)
      picked.push(middle[j]);
    return [
      { lv: LEVEL_NUMS[0], i: 0 },
      ...picked,
      { lv: LEVEL_NUMS[LEVEL_NUMS.length - 1], i: LEVEL_NUMS.length - 1 },
    ];
  };
  const levelSubset = buildLevelSubset();

  const lineAnims = useRef(
    slide.lines.map(() => new Animated.Value(0)),
  ).current;
  const visAnims = useRef(
    Array.from({ length: Math.max(visCount, 1) }, () => new Animated.Value(0)),
  ).current;
  const storyAnims = useRef(
    DUMMY_STORIES.map(() => new Animated.Value(0)),
  ).current;

  const storyScrollRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const CARD_H = sz.badgeRingSize > 100 ? 280 : 240;
  const VISIBLE_H = BOT_H - 88 - 16;
  const PAGE_STEP = Math.floor(VISIBLE_H / CARD_H) * CARD_H;
  const MAX_OFFSET = DUMMY_STORIES.length * CARD_H - VISIBLE_H;

  useEffect(() => {
    if (!isActive) {
      lineAnims.forEach((a) => a.setValue(0));
      visAnims.forEach((a) => a.setValue(0));
      storyAnims.forEach((a) => a.setValue(0));
      if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
      scrollTimerRef.current = null;
      scrollOffsetRef.current = 0;
      storyScrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }

    // ── Description lines ──────────────────────────────────────────────────
    const lineSeq = lineAnims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * LINE_STAGGER),
        Animated.timing(anim, {
          toValue: 1,
          duration: LINE_DUR,
          useNativeDriver: true,
        }),
      ]),
    );

    const allLinesDone = (lineCount - 1) * LINE_STAGGER + LINE_DUR + VIS_DELAY;

    // ── Visual items ──────────────────────────────────────────────────────
    const actualVisCount =
      slide.visType === "levels" ? levelSubset.length : visCount;
    const visSeq = visAnims.slice(0, actualVisCount).map((anim, i) =>
      Animated.sequence([
        Animated.delay(allLinesDone + i * VIS_STAGGER),
        Animated.timing(anim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
    );

    const popTimers = visAnims
      .slice(0, actualVisCount)
      .map((_, i) =>
        setTimeout(
          () => playSound(require("../assets/sounds/pop.mp3")),
          allLinesDone + i * VIS_STAGGER,
        ),
      );

    Animated.parallel([...lineSeq, ...visSeq]).start();

    // ── Slide 3: story cards + auto-scroll ────────────────────────────────
    if (slide.visType === "stories") {
      const CARD_STAGGER = 80;
      const CARD_DUR = 250;
      const cardSeq = storyAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(allLinesDone + i * CARD_STAGGER),
          Animated.timing(anim, {
            toValue: 1,
            duration: CARD_DUR,
            useNativeDriver: true,
          }),
        ]),
      );
      Animated.parallel(cardSeq).start();

      const VISIBLE_CARDS = 4;
      const firstPageDone =
        allLinesDone + (VISIBLE_CARDS - 1) * CARD_STAGGER + CARD_DUR;
      const t = setTimeout(() => {
        scrollTimerRef.current = setInterval(() => {
          scrollOffsetRef.current = scrollOffsetRef.current + PAGE_STEP;
          if (scrollOffsetRef.current > MAX_OFFSET) scrollOffsetRef.current = 0;
          storyScrollRef.current?.scrollTo({
            y: scrollOffsetRef.current,
            animated: true,
          });
          playSound(require("../assets/sounds/button.mp3"), { volume: 0.4 });
        }, 2600);
      }, firstPageDone);

      return () => {
        clearTimeout(t);
        if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
        popTimers.forEach(clearTimeout);
      };
    }

    return () => {
      popTimers.forEach(clearTimeout);
    };
  }, [isActive]);

  // ── Section builders ───────────────────────────────────────────────────────
  const DescSection = (
    <View>
      {slide.lines.map((line, i) => (
        <DescLine key={i} text={line} anim={lineAnims[i]} isFirst={i === 0} />
      ))}
    </View>
  );

  const VisSection = (() => {
    if (slide.visType === "levels") {
      return (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          {levelSubset.map(({ lv, i }) => (
            <LevelBadgeMini
              key={i}
              level={lv}
              color={LEVEL_COLORS[i]}
              anim={visAnims[Math.min(i, visAnims.length - 1)]}
            />
          ))}
        </View>
      );
    }
    if (slide.visType === "activities") {
      return (
        <View
          style={{
            flex: 1,
            alignItems: "flex-start",
            justifyContent: "flex-start",
          }}
        >
          {ACTIVITY_STEPS.map((step, i) => (
            <ActivityBadgeMini
              key={i}
              step={step}
              anim={visAnims[i]}
              halfW={HALF_W}
            />
          ))}
        </View>
      );
    }
    if (slide.visType === "stories") {
      return (
        <View
          style={{
            flex: 1,
            alignItems: "flex-start",
            justifyContent: "flex-start",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ScrollView
            ref={storyScrollRef}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            style={{ flex: 1, width: CARD_W }}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {DUMMY_STORIES.map((story, i) => (
              <Animated.View
                key={story.id}
                style={{
                  opacity: storyAnims[i],
                  transform: [
                    {
                      translateY: storyAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <StoryCardMini story={story} />
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      );
    }
    return null;
  })();

  const accent = slide.accentColor;
  const descW = slide.visType === "levels" ? S1_DESC_W : HALF_W;
  const visW = slide.visType === "levels" ? S1_VIS_W : HALF_W;

  return (
    <View style={{ width: SW, flex: 1 }}>
      <View
        style={{
          height: TOP_H,
          paddingHorizontal: sz.panelPaddingH,
          paddingTop:
            Platform.OS === "ios"
              ? sz.panelPaddingTop_ios
              : sz.panelPaddingTop_android,
          paddingBottom: slide.visType === "levels" ? 8 : 20,
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            width: sz.accentBarWidth,
            height: sz.accentBarHeight,
            borderRadius: 2,
            marginBottom: 12,
            backgroundColor: accent,
          }}
        />
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: sz.titleFontSize,
            color: "#E0F7FA",
            lineHeight: sz.titleLineHeight,
            letterSpacing: 0.15,
          }}
        >
          {slide.title}
        </Text>
        {slide.subtitle ? (
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: sz.subtitleFontSize,
              marginTop: 6,
              letterSpacing: 0.35,
              color: accent,
            }}
          >
            {slide.subtitle}
          </Text>
        ) : null}
      </View>

      <View style={{ height: BOT_H, flexDirection: "row" }}>
        {slide.descSide === "left" ? (
          <>
            <View
              style={{
                width: descW,
                paddingLeft: 18,
                paddingRight: 8,
                paddingTop: sz.panelHalfPaddingV,
                paddingBottom: sz.panelHalfPaddingBottom,
              }}
            >
              {DescSection}
            </View>
            <View
              style={{
                width: visW,
                paddingLeft: 8,
                paddingRight: 14,
                paddingTop: sz.panelHalfPaddingV,
                paddingBottom: sz.panelHalfPaddingBottom,
              }}
            >
              {VisSection}
            </View>
          </>
        ) : (
          <>
            <View
              style={{
                width: visW,
                paddingLeft: 18,
                paddingRight: 8,
                paddingTop: sz.panelHalfPaddingV,
                paddingBottom: sz.panelHalfPaddingBottom,
              }}
            >
              {VisSection}
            </View>
            <View
              style={{
                width: descW,
                paddingLeft: 8,
                paddingRight: 14,
                paddingTop: sz.panelHalfPaddingV,
                paddingBottom: sz.panelHalfPaddingBottom,
              }}
            >
              {DescSection}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOT INDICATORS
// ─────────────────────────────────────────────────────────────────────────────
function Dots({ total, current, accentColor }) {
  const { sizes } = useTheme();
  const sz = sizes.carousel;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: sz.dotHeight,
            borderRadius: sz.dotHeight / 2,
            backgroundColor:
              i === current ? accentColor : "rgba(255,255,255,0.2)",
            width: i === current ? sz.dotActiveWidth : sz.dotInactiveWidth,
          }}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function IntroCarousel() {
  const router = useRouter();
  const flatRef = useRef(null);
  const videoRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width: SW, height: SH } = useWindowDimensions();
  const { sizes } = useTheme();
  const sz = sizes.carousel;

  const playSwish = () => playSound(require("../assets/sounds/swish.mp3"));
  const playButton = () => playSound(require("../assets/sounds/button.mp3"));
  const bgMusicRef = useRef(null);

  // Start music when component mounts, stop on unmount
  useEffect(() => {
    let mounted = true;

    const startMusic = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/intro_music.mp3"),
          { shouldPlay: true, isLooping: true, volume: 0.5 },
        );
        if (mounted) bgMusicRef.current = sound;
      } catch (_) {}
    };

    startMusic();

    return () => {
      mounted = false;
      bgMusicRef.current?.unloadAsync();
    };
  }, []);

  const stopMusicAndGo = useCallback(async () => {
    try {
      await bgMusicRef.current?.stopAsync();
      await bgMusicRef.current?.unloadAsync();
      bgMusicRef.current = null;
    } catch (_) {}
    router.replace("/AccountChoice");
  }, []);

  const goNext = useCallback(() => {
    playButton();
    stopMusicAndGo();
  }, [stopMusicAndGo]);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
      playSwish();
    } else {
      goNext();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const accent = SLIDES[currentIndex].accentColor;

  const videos = [
    require("../assets/videos/intro0.mp4"),
    require("../assets/videos/intro.mp4"),
  ];

  const [videoIndex, setVideoIndex] = useState(0);

  const videoRefs = useRef([]);

  // useEffect(() => {
  //   videos.forEach(async (vid, i) => {
  //     const { sound } = await Video.createAsync(vid, {
  //       shouldPlay: false,
  //     });
  //     videoRefs.current[i] = sound;
  //   });
  // }, []);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── Full-screen looping background video ── */}
      <Video
        key={videoIndex}
        ref={videoRef}
        source={videos[videoIndex]}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isMuted
        shouldPlay
        onPlaybackStatusUpdate={(status) => {
          if (!status.isLoaded) return;

          if (status.positionMillis >= status.durationMillis - 100) {
            setVideoIndex((prev) => (prev + 1) % videos.length);
          }
        }}
      />

      {/* ── Dark blue opaque overlay ── */}
      {/* Adjust the last value (0.65) between 0.4–0.8 to taste */}
      <View style={styles.videoOverlay} />

      {/* ── Subtle vignette corners (optional depth) ── */}
      <View style={styles.vignetteTL} pointerEvents="none" />
      <View style={styles.vignetteBR} pointerEvents="none" />

      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: Platform.OS === "ios" ? 54 : 20 }]}
          onPress={goNext}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipText, { fontSize: sz.skipFontSize }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
          if (idx !== currentIndex) {
            setCurrentIndex(idx);
            playSwish();
          }
        }}
        renderItem={({ item, index }) => (
          <SlidePanel slide={item} isActive={index === currentIndex} />
        )}
        getItemLayout={(_, index) => ({
          length: SW,
          offset: SW * index,
          index,
        })}
      />

      <View
        style={[
          styles.bottomBar,
          {
            paddingHorizontal: sz.bottomBarPaddingH,
            paddingBottom:
              Platform.OS === "ios"
                ? sz.bottomBarPaddingBottom_ios
                : sz.bottomBarPaddingBottom_android,
          },
        ]}
      >
        {/* <Dots
          total={SLIDES.length}
          current={currentIndex}
          accentColor={accent}
        /> */}

        {isLast ? (
          <TouchableOpacity
            style={[
              styles.getStartedBtn,
              {
                backgroundColor: "#00BCD4",
                shadowColor: "#00BCD4",
                paddingHorizontal: sz.getStartedPaddingH,
                paddingVertical: sz.getStartedPaddingV,
              },
            ]}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.getStartedText,
                { fontSize: sz.getStartedFontSize },
              ]}
            >
              Get Started ✦
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              {
                borderColor: accent + "80",
                paddingHorizontal: sz.nextBtnPaddingH,
                paddingVertical: sz.nextBtnPaddingV,
              },
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.nextText,
                { color: accent, fontSize: sz.nextFontSize },
              ]}
            >
              Next →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#08081a", // fallback color shown before video loads
  },

  // ── Dark blue overlay on top of the video ──────────────────────────────────
  // rgba(R, G, B, opacity) — tweak opacity (0.4 lighter ↔ 0.8 darker)
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 6, 24, 0.79)",
  },

  // ── Soft corner vignettes for extra depth (optional) ─────────────────────
  vignetteTL: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0,188,212,0.06)",
  },
  vignetteBR: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(150,82,217,0.06)",
  },

  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 30,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "pink",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "pink",
  },
  skipText: {
    fontFamily: FONTS.regular,
    color: "#7a9aaa",
    letterSpacing: 0.3,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    backgroundColor: "rgba(1, 6, 24, 0.79)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  nextBtn: {
    borderRadius: 30,
    borderWidth: 2.5,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  nextText: {
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },
  getStartedBtn: {
    borderRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 8,
  },
  getStartedText: {
    fontFamily: FONTS.bold,
    color: "#08081a",
    letterSpacing: 0.5,
  },
});
