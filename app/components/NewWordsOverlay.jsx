// app/components/NewWordsOverlay.jsx
//
// Shown after a story is finished (before the next activity route).
// Cycles through challengeWords one by one — emoji, name, phonics chips,
// explanation, extras.
//
// Features:
//   • Real horizontal FlatList swipe — physically drag between words
//   • Per-phonics-chip animation: the chip being spoken scales up + bounces
//   • activePhonicsIndex tracks which phonics part Speech is on
//
// Props:
//   visible  — boolean
//   words    — challengeWords array from storySession
//   onDone   — () => void  called when all words have been seen

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
} from "react-native";
import * as Speech from "expo-speech";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(6,7,20,0.98)",
  surface: "rgba(255,255,255,0.05)",
  surfaceHigh: "rgba(255,255,255,0.09)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.12)",
  yellowBorder: "rgba(255,213,79,0.4)",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.18)",
  purpleBorder: "rgba(150,82,217,0.4)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

// ─────────────────────────────────────────────────────────────────────────────
// DOTS
// ─────────────────────────────────────────────────────────────────────────────
function Dots({ total, current }) {
  return (
    <View style={dotS.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            dotS.dot,
            i === current && dotS.dotActive,
            i < current && dotS.dotDone,
          ]}
        />
      ))}
    </View>
  );
}
const dotS = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: pad.xs,
    justifyContent: "center",
    marginBottom: pad.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dotActive: {
    width: 24,
    backgroundColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  dotDone: { backgroundColor: "rgba(0,188,212,0.4)" },
});

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED PHONICS CHIP
// isActive => scale up + bounce loop + glow halo
// ─────────────────────────────────────────────────────────────────────────────
function PhonicsChip({ label, isFullWord, isActive }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOp = useRef(new Animated.Value(0)).current;
  const bounceLoop = useRef(null);

  useEffect(() => {
    if (isActive) {
      // Immediate pop
      Animated.spring(scale, {
        toValue: 1.55,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }).start();
      //   Animated.timing(glowOp, {
      //     toValue: 1,
      //     duration: 150,
      //     useNativeDriver: true,
      //   }).start();
      // Gentle breathing while speaking
      bounceLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.62,
            duration: 260,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 260,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      // bounceLoop.current.start();
    } else {
      bounceLoop.current?.stop();
      bounceLoop.current = null;
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(glowOp, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    return () => {
      bounceLoop.current?.stop();
      bounceLoop.current = null;
    };
  }, [isActive]);

  const chipStyle = isFullWord ? wS.phonicsChipWord : wS.phonicsChip;
  const textStyle = isFullWord ? wS.phonicsTextWord : wS.phonicsText;
  const glowColor = isFullWord ? "rgba(255,213,79,0.5)" : "rgba(0,188,212,0.5)";

  return (
    <Animated.View
      style={[chipStyle, { transform: [{ scale }], zIndex: isActive ? 10 : 1 }]}
    >
      {/* Glow halo */}
      <Animated.View
        style={[wS.chipGlow, { opacity: glowOp, backgroundColor: glowColor }]}
        pointerEvents="none"
      />
      <Text style={[textStyle, isActive && wS.phonicsTextActive]}>{label}</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE WORD CARD  (one page in the outer FlatList)
// ─────────────────────────────────────────────────────────────────────────────
function WordCard({ word, isPlaying, onAudio, activePhonicsIndex }) {
  const slideY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0.55)).current;
  const emojiBounce = useRef(new Animated.Value(1)).current;
  const emojiBounceLoop = useRef(null);

  // Entrance animation keyed to word name
  useEffect(() => {
    slideY.setValue(30);
    opacity.setValue(0);
    emojiScale.setValue(0.55);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(emojiScale, {
        toValue: 1,
        friction: 5,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [word.name]);

  // Emoji bounces while audio plays
  useEffect(() => {
    if (isPlaying) {
      emojiBounceLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(emojiBounce, {
            toValue: 1.13,
            duration: 290,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(emojiBounce, {
            toValue: 0.94,
            duration: 290,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      emojiBounceLoop.current.start();
    } else {
      emojiBounceLoop.current?.stop();
      emojiBounceLoop.current = null;
      Animated.spring(emojiBounce, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      emojiBounceLoop.current?.stop();
      emojiBounceLoop.current = null;
    };
  }, [isPlaying]);

  return (
    <Animated.View
      style={[wS.card, { opacity, transform: [{ translateY: slideY }] }]}
    >
      {/* Emoji */}
      <Animated.View
        style={[
          wS.emojiRing,
          { transform: [{ scale: emojiScale }, { scale: emojiBounce }] },
        ]}
      >
        <Text style={wS.emoji}>{word.image || "📖"}</Text>
      </Animated.View>

      {/* Word name */}
      <Text style={wS.wordName}>{word.name}</Text>

      {/* Phonics row: m + a + n = man */}
      {word.phonics && word.phonics.length > 0 && (
        <View style={wS.phonicsRow}>
          {word.phonics.map((p, i) => {
            const isFullWord = i === word.phonics.length - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <Text style={wS.phonicsSep}>{isFullWord ? "=" : "+"}</Text>
                )}
                <PhonicsChip
                  label={p}
                  isFullWord={isFullWord}
                  isActive={activePhonicsIndex === i}
                />
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* Audio button */}
      <TouchableOpacity
        style={[wS.audioBtn, isPlaying && wS.audioBtnActive]}
        onPress={onAudio}
        activeOpacity={0.8}
      >
        <Text style={wS.audioBtnIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
        <Text style={[wS.audioBtnText, isPlaying && { color: C.teal }]}>
          {isPlaying ? "Stop" : "Hear it"}
        </Text>
      </TouchableOpacity>

      {/* Category badges */}
      <View style={wS.badgeRow}>
        {word.grammarCategory ? (
          <View style={[wS.badge, wS.badgePurple]}>
            <Text style={[wS.badgeText, { color: C.purple }]}>
              {word.grammarCategory}
            </Text>
          </View>
        ) : null}
        {word.category ? (
          <View style={[wS.badge, wS.badgeTeal]}>
            <Text style={[wS.badgeText, { color: C.teal }]}>
              {word.category}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Explanation */}
      {word.explanation ? (
        <View style={wS.explanationBox}>
          <Text style={wS.explanationLabel}>WHAT IS IT?</Text>
          <Text style={wS.explanationText}>{word.explanation}</Text>
        </View>
      ) : null}

      {/* Extras */}
      {word.extras && word.extras.length > 0 ? (
        <View style={wS.extrasBox}>
          <Text style={wS.explanationLabel}>DID YOU KNOW?</Text>
          {word.extras.map((extra, i) => (
            <View key={i} style={wS.extraRow}>
              <Text style={wS.extraBullet}>✦</Text>
              <Text style={wS.extraText}>{extra}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const wS = StyleSheet.create({
  card: {
    alignItems: "center",
    paddingHorizontal: pad.xl,
    paddingBottom: pad.xxxl,
    paddingTop: pad.md,
  },
  emojiRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(0,188,212,0.1)",
    borderWidth: 2.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.md,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  emoji: { fontSize: 64 },
  wordName: {
    fontFamily: FONTS.bold,
    fontSize: font.h2,
    color: C.textPri,
    letterSpacing: 0.5,
    marginBottom: pad.sm,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    textAlign: "center",
  },
  phonicsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    // Extra vertical padding so scaled chips (1.6×) don't clip
    paddingVertical: pad.lg,
    marginBottom: pad.md,
    overflow: "visible",
  },
  phonicsChip: {
    backgroundColor: C.tealDim,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    overflow: "visible",
  },
  phonicsText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.teal,
    letterSpacing: 1.5,
  },
  phonicsTextActive: {
    //color: "#fff",
  },
  phonicsSep: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: "rgba(0,188,212,0.45)",
    alignSelf: "center",
    marginHorizontal: pad.xs,
  },
  phonicsChipWord: {
    backgroundColor: "rgba(255,213,79,0.15)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,213,79,0.55)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    overflow: "visible",
  },
  phonicsTextWord: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.yellow,
    letterSpacing: 0.5,
  },
  chipGlow: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: radius.md,
  },
  audioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: pad.xl,
    paddingVertical: pad.sm,
    marginBottom: pad.md,
  },
  audioBtnActive: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
  },
  audioBtnIcon: { fontSize: font.xl },
  audioBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textSec,
    letterSpacing: 0.3,
  },
  badgeRow: {
    flexDirection: "row",
    gap: pad.s,
    marginBottom: pad.md,
  },
  badge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  badgePurple: { backgroundColor: C.purpleDim, borderColor: C.purpleBorder },
  badgeTeal: { backgroundColor: C.tealDim, borderColor: C.tealBorder },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    letterSpacing: 0.3,
    textTransform: "capitalize",
  },
  explanationBox: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: pad.md,
    marginBottom: pad.sm,
  },
  extrasBox: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: pad.md,
  },
  explanationLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.teal,
    letterSpacing: 2,
    marginBottom: pad.s,
    opacity: 0.85,
  },
  explanationText: {
    fontFamily: FONTS.regular,
    fontSize: font.md,
    color: C.textSec,
    lineHeight: font.md + 8,
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: pad.s,
    marginBottom: pad.xs,
  },
  extraBullet: { fontSize: font.xs, color: C.teal, marginTop: 4 },
  extraText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.md - 1,
    color: C.textSec,
    lineHeight: font.md + 6,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
export default function NewWordsOverlay({ visible, words = [], onDone }) {
  const [index, setIndex] = useState(0);
  // Which phonics chip index is currently being spoken (-1 = none)
  const [activePhonicsIndex, setActivePhonicsIndex] = useState(-1);
  // Which word name is playing audio
  const [playingWord, setPlayingWord] = useState(null);

  const flatRef = useRef(null);
  const sheetY = useRef(new Animated.Value(SH)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Sheet open / close ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setIndex(0);
      setActivePhonicsIndex(-1);
      setPlayingWord(null);
      Speech.stop();
      // Reset FlatList to first page
      setTimeout(
        () => flatRef.current?.scrollToOffset({ offset: 0, animated: false }),
        50,
      );

      Animated.parallel([
        Animated.timing(scrOp, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          friction: 9,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      doSlideOut();
    }
  }, [visible]);

  const doSlideOut = () => {
    Speech.stop();
    Animated.parallel([
      Animated.timing(scrOp, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: SH,
        duration: 320,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Audio ───────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    Speech.stop();
    if (mountedRef.current) {
      setPlayingWord(null);
      setActivePhonicsIndex(-1);
    }
  }, []);

  const handleAudio = useCallback(
    (word) => {
      if (playingWord === word.name) {
        stopAudio();
        return;
      }
      stopAudio();
      if (!mountedRef.current) return;

      setPlayingWord(word.name);
      const parts = word.phonics?.length ? word.phonics : [word.name];
      let i = 0;

      const speakNext = () => {
        if (!mountedRef.current) return;
        if (i >= parts.length) {
          setPlayingWord(null);
          setActivePhonicsIndex(-1);
          return;
        }
        const chipIndex = i;
        setActivePhonicsIndex(chipIndex);
        Speech.speak(parts[i++], {
          language: "en",
          pitch: 1.15,
          rate: 0.72,
          onDone: () => {
            if (!mountedRef.current) return;
            setTimeout(speakNext, 220);
          },
          onStopped: () => {
            if (mountedRef.current) {
              setPlayingWord(null);
              setActivePhonicsIndex(-1);
            }
          },
          onError: () => {
            if (mountedRef.current) {
              setPlayingWord(null);
              setActivePhonicsIndex(-1);
            }
          },
        });
      };

      speakNext();
    },
    [playingWord, stopAudio],
  );

  // ── Navigation ──────────────────────────────────────────────────────────
  const goTo = useCallback(
    (nextIndex) => {
      stopAudio();
      flatRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setIndex(nextIndex);
    },
    [stopAudio],
  );

  const goNext = useCallback(() => {
    if (index < words.length - 1) {
      goTo(index + 1);
    } else {
      doSlideOut();
      setTimeout(onDone, 340);
    }
  }, [index, words.length, onDone, goTo]);

  const goPrev = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [index, goTo]);

  // Sync index when user swipes manually with finger
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIdx = viewableItems[0].index ?? 0;
      setIndex(newIdx);
      stopAudio();
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  // ── Render each word as a full-width scrollable page ────────────────────
  const renderItem = useCallback(
    ({ item }) => {
      const isThisWordPlaying = playingWord === item.name;
      const phonicsIndexForThis = isThisWordPlaying ? activePhonicsIndex : -1;

      return (
        // Each page is a vertical ScrollView so long cards don't get clipped
        <ScrollView
          style={{ width: SW }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: pad.xl }}
          // Lock vertical scrolling so it doesn't fight horizontal swipe
          directionalLockEnabled
        >
          <WordCard
            word={item}
            isPlaying={isThisWordPlaying}
            onAudio={() => handleAudio(item)}
            activePhonicsIndex={phonicsIndexForThis}
          />
        </ScrollView>
      );
    },
    [playingWord, activePhonicsIndex, handleAudio],
  );

  if (!visible && words.length === 0) return null;

  const isLast = index === words.length - 1;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {}}
    >
      {/* Scrim */}
      <Animated.View
        style={[s.scrim, { opacity: scrOp }]}
        pointerEvents="none"
      />

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]}>
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerEmoji}>🌟</Text>
            <Text style={s.headerTitle}>New Words!</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.counterText}>
              {index + 1} / {words.length}
            </Text>
          </View>
        </View>

        {/* Dots */}
        {words.length > 1 && <Dots total={words.length} current={index} />}

        {/* ── Swipable word pages ── */}
        <FlatList
          ref={flatRef}
          data={words}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEnabled={words.length > 1}
          style={s.flatList}
          // Prevent Android flicker on re-render
          removeClippedSubviews={false}
        />

        {/* Nav buttons */}
        <View style={s.navRow}>
          <TouchableOpacity
            style={[s.navBtn, index === 0 && s.navBtnDisabled]}
            onPress={goPrev}
            activeOpacity={0.75}
            disabled={index === 0}
          >
            <Text style={s.navBtnIcon}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.navBtn, s.navBtnPrimary]}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={s.navBtnPrimaryText}>
              {isLast ? "Let's Go! 🚀" : "Next →"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.9,
    backgroundColor: "#080917",
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.tealBorder,
    paddingTop: pad.s,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 28,
    overflow: "hidden",
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.xs,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginBottom: pad.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.xl,
    marginBottom: pad.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
  },
  headerEmoji: { fontSize: font.xl },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerRight: {
    backgroundColor: C.tealDim,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  counterText: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.teal,
    letterSpacing: 0.5,
  },
  flatList: { flex: 1 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.xl,
    paddingVertical: pad.md,
    paddingBottom: pad.xxl,
    gap: pad.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  navBtn: {
    width: size.hitLg,
    height: size.hitLg,
    borderRadius: size.hitLg / 2,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnIcon: {
    fontSize: font.h3,
    color: C.textSec,
    lineHeight: font.h3 + 4,
  },
  navBtnPrimary: {
    flex: 1,
    width: undefined,
    height: size.btnHeightLg,
    borderRadius: radius.pill,
    backgroundColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 0,
  },
  navBtnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: "#06070f",
    letterSpacing: 0.3,
  },
});
