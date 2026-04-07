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
// Background: two static glow circles (teal top-left, purple bottom-right) — no dots, no pulsing.
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
} from "react-native";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { FONTS, COLORS } from "./theme";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Layout constants ───────────────────────────────────────────────────────
const TOP_H = SH * 0.3;
const BOT_H = SH * 0.7;
const HALF_W = SW * 0.5;
const S1_DESC_W = SW * 0.65;
const S1_VIS_W = SW * 0.35;

// ── Timing (ms) ────────────────────────────────────────────────────────────
const LINE_DUR = 480;
const LINE_STAGGER = 550;
const VIS_DELAY = 250;
const VIS_STAGGER = 220;

// ── Sound helper ──────────────────────────────────────────────────────────
// Fire-and-forget: loads, plays, then unloads. Safe to call rapidly.
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
    id: "1",
    accentColor: COLORS.teal,
    title: "Welcome to Story Time",
    subtitle: "A Journey Built to Grow With Them",
    descSide: "left",
    visSide: "right",
    visType: "levels",
    lines: [
      "Where every story\nplants the seed of a\npowerful vocabulary",
      "Your child enters a world of carefully crafted stories — built for their age, curiosity, and growing mind.",
      "A guided journey from beginner to advanced vocabulary — natural, playful, and perfectly paced.",
    ],
  },
  {
    id: "2",
    accentColor: COLORS.coral,
    title: "Learning That Feels Like Playing",
    subtitle: "Read · Guess · Listen · Describe",
    descSide: "right",
    visSide: "left",
    visType: "activities",
    lines: [
      "Four fun challenges\nbuilt into every story",
      "After every story: guess, listen, answer, and describe — turning every word into a lasting skill.",
      "Kids don't just read words — they hear, use, and own them. Vocabulary that truly stays.",
    ],
  },
  {
    id: "3",
    accentColor: "#31ad79",
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

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL BADGE MINI — slide 1 visual
// ─────────────────────────────────────────────────────────────────────────────
const LEVEL_NUMS = [1, 5, 10, 20, "30+"];
const LEVEL_COLORS = [
  COLORS.teal,
  COLORS.yellow,
  COLORS.coral,
  COLORS.purple,
  COLORS.teal,
  COLORS.yellow,
];

function LevelBadgeMini({ level, color, anim }) {
  const slideX = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const barPct =
    typeof level === "number" ? `${Math.round((level / 30) * 100)}%` : "100%";
  return (
    <Animated.View
      style={[
        lbS.outer,
        { opacity: anim, transform: [{ translateX: slideX }] },
      ]}
    >
      <View style={[lbS.ring, { borderColor: color + "77" }]}>
        <View style={lbS.inner}>
          <View style={[lbS.diagBg, { backgroundColor: color + "20" }]} />
          <Text style={[lbS.lvlLabel, { color }]}>LEVEL</Text>
          <Text style={[lbS.lvlNum, { textShadowColor: color }]}>{level}</Text>
        </View>
      </View>
      <View style={lbS.barTrack}>
        <View
          style={[lbS.barFill, { backgroundColor: color, width: barPct }]}
        />
      </View>
    </Animated.View>
  );
}

const lbS = StyleSheet.create({
  outer: { alignItems: "center", marginVertical: 5 },
  ring: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#0d0f22",
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 10,
  },
  inner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#10122a",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  diagBg: {
    position: "absolute",
    top: 0,
    left: -6,
    right: -6,
    height: "55%",
    transform: [{ rotate: "-6deg" }, { translateY: -3 }],
  },
  lvlLabel: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 2 },
  lvlNum: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: "#E0F7FA",
    lineHeight: 32,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  barTrack: {
    width: 78,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 6,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY BADGE MINI — slide 2 visual
// ─────────────────────────────────────────────────────────────────────────────
function ActivityBadgeMini({ step, anim }) {
  const slideX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 0],
  });
  return (
    <Animated.View
      style={[
        abS.outer,
        { opacity: anim, transform: [{ translateX: slideX }] },
      ]}
    >
      <View
        style={[
          abS.card,
          {
            borderColor: step.color + "66",
            backgroundColor: step.color + "16",
          },
        ]}
      >
        <View
          style={[
            abS.iconBox,
            {
              borderColor: step.color + "88",
              backgroundColor: step.color + "20",
            },
          ]}
        >
          <Image source={step.image} style={abS.icon} resizeMode="contain" />
        </View>
        <View style={abS.textCol}>
          <Text style={[abS.label, { color: step.color }]}>{step.label}</Text>
          <View style={[abS.pill, { backgroundColor: step.color + "33" }]}>
            <View style={[abS.pillDot, { backgroundColor: step.color }]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const abS = StyleSheet.create({
  outer: { marginVertical: 7 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    width: HALF_W - 22,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { width: 38, height: 38 },
  textCol: { flex: 1, gap: 7 },
  label: { fontFamily: FONTS.bold, fontSize: 18, letterSpacing: 0.3 },
  pill: { width: 36, height: 6, borderRadius: 3, justifyContent: "center" },
  pillDot: { width: 12, height: 6, borderRadius: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY CARD MINI
// ─────────────────────────────────────────────────────────────────────────────
const CARD_W = HALF_W - 22;
const IMAGE_H = Math.round(CARD_W * 0.72);
const STEP_COLORS = [COLORS.teal, COLORS.yellow, COLORS.coral, COLORS.purple];

function StoryCardMini({ story }) {
  return (
    <View
      style={[
        scS.card,
        {
          borderColor: story.isCompleted
            ? "rgba(76,175,80,0.45)"
            : "rgba(0,188,212,0.28)",
        },
      ]}
    >
      <View style={[scS.imageWrap, { height: IMAGE_H }]}>
        {story.image ? (
          <Image
            source={story.image}
            style={scS.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[scS.coverSwatch, { backgroundColor: story.color + "55" }]}
          >
            <Text style={scS.coverEmoji}>📖</Text>
          </View>
        )}
        <View style={[scS.newBadge, { backgroundColor: story.color }]}>
          <Text style={scS.newTxt}>NEW</Text>
        </View>
        <View style={scS.titleOverlayBg} />
        <View style={scS.titleOverlay}>
          <Text style={scS.title}>{story.title}</Text>
        </View>
      </View>
      <Text style={scS.intro} numberOfLines={3}>
        {story.intro}
      </Text>
      <View style={scS.stepsRow}>
        {STEP_COLORS.map((c, i) => (
          <View key={i} style={scS.stepItem}>
            <View style={[scS.stepDot, { backgroundColor: c + "99" }]} />
            {i < STEP_COLORS.length - 1 && <View style={scS.connector} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const scS = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: "#16213e",
    borderRadius: 22,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: "hidden",
  },
  imageWrap: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  coverSwatch: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  coverInner: {
    width: CARD_W * 0.45,
    height: CARD_W * 0.45,
    borderRadius: CARD_W * 0.225,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: { fontSize: 28 },
  newBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 2,
  },
  newTxt: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: "#08081a",
    letterSpacing: 1.2,
  },
  titleOverlayBg: {
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
    paddingBottom: 9,
    paddingTop: 6,
    zIndex: 1,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: "#E0F7FA",
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  intro: {
    fontFamily: FONTS.light,
    fontSize: 10,
    color: "#7a9aaa",
    fontStyle: "italic",
    lineHeight: 14,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    flexShrink: 1,
  },
  stepsRow: {
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
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  connector: {
    width: 12,
    height: 2,
    backgroundColor: "rgba(0,188,212,0.25)",
    marginHorizontal: 3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIPTION LINE — fade + slide up on appear
// ─────────────────────────────────────────────────────────────────────────────
function DescLine({ text, anim, isFirst }) {
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  return (
    <Animated.Text
      style={[
        isFirst ? dlS.lineFirst : dlS.lineBody,
        { opacity: anim, transform: [{ translateY }] },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const dlS = StyleSheet.create({
  lineFirst: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: "#E0F7FA",
    lineHeight: 30,
    marginBottom: 14,
  },
  lineBody: {
    fontFamily: FONTS.light,
    fontSize: 16,
    color: "#7a9aaa",
    lineHeight: 23,
    marginBottom: 10,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function SlidePanel({ slide, isActive }) {
  const lineCount = slide.lines.length;
  const visCount =
    slide.visType === "levels"
      ? LEVEL_NUMS.length
      : slide.visType === "activities"
        ? ACTIVITY_STEPS.length
        : 0;

  // ── Slide 1: compute how many level badges fit ────────────────────────────
  const BADGE_H = 112;
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
  const CARD_H = 240;
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

    // ── Visual items (level badges / activity badges) ──────────────────────
    // Each item plays pop.mp3 when it becomes visible
    const visSeq = visAnims.slice(0, visCount).map((anim, i) =>
      Animated.sequence([
        Animated.delay(allLinesDone + i * VIS_STAGGER),
        Animated.timing(anim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
    );

    // Schedule pop sounds to match each visual item's reveal time
    const popTimers = visAnims
      .slice(0, visCount)
      .map((_, i) =>
        setTimeout(
          () => playSound(require("../assets/sounds/pop.mp3")),
          allLinesDone + i * VIS_STAGGER,
        ),
      );

    Animated.parallel([...lineSeq, ...visSeq]).start();

    // ── Slide 3: story cards + auto-scroll with swish ──────────────────────
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
          // swish on each auto-scroll page turn
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
    <View style={pnlS.descWrap}>
      {slide.lines.map((line, i) => (
        <DescLine key={i} text={line} anim={lineAnims[i]} isFirst={i === 0} />
      ))}
    </View>
  );

  const VisSection = (() => {
    if (slide.visType === "levels") {
      return (
        <View style={pnlS.visWrapCentered}>
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
        <View style={pnlS.visWrapTop}>
          {ACTIVITY_STEPS.map((step, i) => (
            <ActivityBadgeMini key={i} step={step} anim={visAnims[i]} />
          ))}
        </View>
      );
    }
    if (slide.visType === "stories") {
      return (
        <View style={[pnlS.visWrapTop, pnlS.storyBox]}>
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
    <View style={pnlS.root}>
      <View
        style={[pnlS.topArea, slide.visType === "levels" && pnlS.topAreaSlide1]}
      >
        <View style={[pnlS.accentBar, { backgroundColor: accent }]} />
        <Text style={pnlS.title}>{slide.title}</Text>
        {slide.subtitle ? (
          <Text style={[pnlS.subtitle, { color: accent }]}>
            {slide.subtitle}
          </Text>
        ) : null}
      </View>

      <View style={pnlS.botArea}>
        {slide.descSide === "left" ? (
          <>
            <View style={[pnlS.halfLeft, { width: descW }]}>{DescSection}</View>
            <View style={[pnlS.halfRight, { width: visW }]}>{VisSection}</View>
          </>
        ) : (
          <>
            <View style={[pnlS.halfLeft, { width: visW }]}>{VisSection}</View>
            <View style={[pnlS.halfRight, { width: descW }]}>
              {DescSection}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const pnlS = StyleSheet.create({
  root: { width: SW, flex: 1 },
  topArea: {
    height: TOP_H,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 52 : 32,
    paddingBottom: 20,
    justifyContent: "flex-end",
  },
  topAreaSlide1: { paddingBottom: 8 },
  accentBar: { width: 44, height: 4, borderRadius: 2, marginBottom: 12 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: "#E0F7FA",
    lineHeight: 39,
    letterSpacing: 0.15,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: 15,
    marginTop: 6,
    letterSpacing: 0.35,
  },
  botArea: { height: BOT_H, flexDirection: "row" },
  halfLeft: {
    paddingLeft: 18,
    paddingRight: 8,
    paddingTop: 16,
    paddingBottom: 88,
  },
  halfRight: {
    paddingLeft: 8,
    paddingRight: 14,
    paddingTop: 16,
    paddingBottom: 88,
  },
  descWrap: { gap: 0 },
  visWrapCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  visWrapTop: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  storyBox: { position: "relative", overflow: "hidden" },
});

// ─────────────────────────────────────────────────────────────────────────────
// DOT INDICATORS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function IntroCarousel() {
  const router = useRouter();
  const flatRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ── swish.mp3 on page turn ────────────────────────────────────────────────
  const playSwish = () => playSound(require("../assets/sounds/swish.mp3"));
  const playButton = () => playSound(require("../assets/sounds/button.mp3"));

  const goNext = useCallback(() => {
    playButton();
    router.replace("/AccountChoice");
  }, []);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
      playSwish(); // swish on Next button press
    } else {
      goNext(); // button.mp3 on Get Started
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const accent = SLIDES[currentIndex].accentColor;

  return (
    <View style={styles.root}>
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      <StatusBar barStyle="light-content" />

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
            playSwish(); // swish when user swipes manually
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

// ─────────────────────────────────────────────────────────────────────────────
// ROOT STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#08081a" },
  glowTL: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  glowBR: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(150,82,217,0.07)",
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    right: 20,
    zIndex: 30,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  skipText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
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
    paddingHorizontal: 26,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    paddingTop: 14,
    backgroundColor: "rgba(8,8,26,0.88)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 30,
    borderWidth: 2.5,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  nextText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    letterSpacing: 0.3,
  },
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
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#08081a",
    letterSpacing: 0.5,
  },
});
