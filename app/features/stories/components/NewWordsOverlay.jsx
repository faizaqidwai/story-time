// app/components/NewWordsOverlay.jsx
//
// Shown after a story is finished (before the next activity route).
// Cycles through challengeWords one by one — emoji, name, explanation.
// Rendered as a centered popup modal (not a bottom sheet).
//
// Props:
//   visible  — boolean
//   words    — challengeWords array from storySession
//   onDone   — () => void  called when all words have been seen

// BRAND UPDATE — feature/brand-guidelines-v2 — COLOUR-ONLY changes:
// All logic, animation, layout, props unchanged.

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
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";
import * as Device from "expo-device";

const isTablet =
  Device.deviceType === Device.DeviceType.TABLET || Math.min(SW, SH) >= 768;
const { width: SW, height: SH } = Dimensions.get("window");

// Popup dimensions
const POPUP_W = isTablet
  ? Math.min(SW * 0.8, 820) // bigger width on iPad
  : Math.min(SW - 40, 420);

const POPUP_H = isTablet
  ? SH * 0.9 // 👈 much better presence
  : SH * 0.72;

const C = {
  bg: "rgba(10,16,38,0.98)",
  surface: "rgba(255,255,255,0.05)",
  surfaceHigh: "rgba(255,255,255,0.09)",
  teal: "#00C4CC",
  tealDim: "rgba(0,196,204,0.15)",
  tealBorder: "rgba(0,196,204,0.35)",
  yellow: "#F5A623",
  yellowDim: "rgba(245,166,35,0.12)",
  yellowBorder: "rgba(245,166,35,0.4)",
  purple: "#7B2FBE",
  purpleDim: "rgba(123,47,190,0.18)",
  purpleBorder: "rgba(123,47,190,0.4)",
  textPri: "#FFFFFF",
  textSec: "#8899AA",
  textMuted: "#8899AA",
};
console.log("is tablet: " + isTablet);
console.log("Device type:", Device.deviceType);
console.log("Width:", SW, "Height:", SH);
console.log("isTablet:", isTablet);
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
  dotDone: { backgroundColor: "rgba(0,196,204,0.4)" },
});

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE WORD CARD
// ─────────────────────────────────────────────────────────────────────────────
function WordCard({ word, isPlaying, onAudio }) {
  const slideY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0.6)).current;
  const emojiBounce = useRef(new Animated.Value(1)).current;
  const emojiBounceLoop = useRef(null);

  useEffect(() => {
    slideY.setValue(20);
    opacity.setValue(0);
    emojiScale.setValue(0.6);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 300,
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

  useEffect(() => {
    if (isPlaying) {
      emojiBounceLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(emojiBounce, {
            toValue: 1.1,
            duration: 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(emojiBounce, {
            toValue: 0.95,
            duration: 300,
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

      {/* Word name box */}
      <View style={wS.wordBox}>
        <Text style={wS.wordName}>{word.name}</Text>
      </View>

      {/* Hear it button */}
      {/* <TouchableOpacity
        style={[wS.audioBtn, isPlaying && wS.audioBtnActive]}
        onPress={onAudio}
        activeOpacity={0.8}
      >
        <Text style={wS.audioBtnIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
        <Text style={[wS.audioBtnText, isPlaying && { color: C.teal }]}>
          {isPlaying ? "Stop" : "Hear it"}
        </Text>
      </TouchableOpacity> */}

      {/* Category badges */}
      {word.grammarCategory || word.category ? (
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
      ) : null}

      {/* Explanation */}
      {word.explanation ? (
        <View style={wS.explanationBox}>
          <Text style={wS.explanationLabel}>WHAT IS IT?</Text>
          <Text style={wS.explanationText}>{word.explanation}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const wS = StyleSheet.create({
  card: {
    width: POPUP_W,
    alignItems: "center",
    paddingHorizontal: pad.lg,
    paddingBottom: pad.lg,
    paddingTop: pad.sm,
  },
  emojiRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(0,196,204,0.1)",
    borderWidth: 2.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.md,
    marginTop: pad.sm,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  emoji: { fontSize: 56 },
  wordBox: {
    backgroundColor: C.yellowDim,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: pad.xl,
    paddingVertical: pad.sm,
    alignItems: "center",
    marginBottom: pad.sm,
    // width: "100%",
  },
  wordName: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    color: C.yellow,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(245,166,35,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: "center",
  },
  audioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: pad.lg,
    paddingVertical: pad.sm,
    marginBottom: pad.sm,
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
    marginBottom: pad.sm,
    flexWrap: "wrap",
    justifyContent: "center",
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
    padding: pad.lg,
    marginTop: pad.lg,
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
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
export default function NewWordsOverlay({ visible, words = [], onDone }) {
  const [index, setIndex] = useState(0);
  const [activePhonicsIndex, setActivePhonicsIndex] = useState(-1);
  const [playingWord, setPlayingWord] = useState(null);

  const flatRef = useRef(null);

  // Popup entrance animations
  const backdropOp = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.85)).current;
  const popupOp = useRef(new Animated.Value(0)).current;

  const mountedRef = useRef(true);
  const hasOpenedRef = useRef(false);
  const handleAudioRef = useRef(null);
  const wordsRef = useRef(words);
  const audioGenRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // ── Audio ───────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    audioGenRef.current += 1; // invalidate all in-flight callbacks
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
      stopAudio(); // increments audioGenRef, kills old callbacks
      if (!mountedRef.current) return;

      const myGen = audioGenRef.current; // capture this session's ID

      setPlayingWord(word.name);

      Speech.speak(word.name, {
        language: "en",
        pitch: 1.15,
        rate: 0.72,
        onDone: () => {
          if (!mountedRef.current) return;
          if (audioGenRef.current !== myGen) return; // stale, ignore
          setPlayingWord(null);
          setActivePhonicsIndex(-1);
        },
        onStopped: () => {
          if (!mountedRef.current) return;
          if (audioGenRef.current !== myGen) return; // stale, ignore
          setPlayingWord(null);
          setActivePhonicsIndex(-1);
        },
        onError: () => {
          if (!mountedRef.current) return;
          if (audioGenRef.current !== myGen) return;
          setPlayingWord(null);
          setActivePhonicsIndex(-1);
        },
      });
    },
    [playingWord, stopAudio],
  );

  handleAudioRef.current = handleAudio;

  // ── Popup open / close ──────────────────────────────────────────────────
  const animateIn = () => {
    hasOpenedRef.current = false;
    backdropOp.setValue(0);
    popupScale.setValue(0.85);
    popupOp.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(popupScale, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(popupOp, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hasOpenedRef.current = true;
      if (mountedRef.current && wordsRef.current.length > 0) {
        setTimeout(() => {
          if (mountedRef.current) {
            handleAudioRef.current(wordsRef.current[0]);
          }
        }, 300);
      }
    });
  };

  const animateOut = (cb) => {
    hasOpenedRef.current = false;
    Speech.stop();
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(popupOp, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(popupScale, {
        toValue: 0.88,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => cb?.());
  };

  useEffect(() => {
    if (visible) {
      setIndex(0);
      setActivePhonicsIndex(-1);
      setPlayingWord(null);
      Speech.stop();
      setTimeout(
        () => flatRef.current?.scrollToOffset({ offset: 0, animated: false }),
        50,
      );
      animateIn();
    } else {
      animateOut();
    }
  }, [visible]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const goTo = useCallback(
    (nextIndex) => {
      stopAudio();
      isProgrammaticScrollRef.current = true; // suppress viewability callback
      flatRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setIndex(nextIndex);
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        if (mountedRef.current && wordsRef.current[nextIndex]) {
          handleAudioRef.current(wordsRef.current[nextIndex]);
        }
      }, 420);
    },
    [stopAudio],
  );

  const goNext = useCallback(() => {
    if (index < words.length - 1) {
      goTo(index + 1);
    } else {
      animateOut(() => setTimeout(onDone, 50));
    }
  }, [index, words.length, onDone, goTo]);

  const goPrev = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [index, goTo]);

  // ── Sync index on manual swipe ──────────────────────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!hasOpenedRef.current) return;
    if (isProgrammaticScrollRef.current) return; // ignore programmatic scrolls
    if (viewableItems.length > 0) {
      const newIdx = viewableItems[0].index ?? 0;
      setIndex(newIdx);
      Speech.stop();
      setTimeout(() => {
        if (mountedRef.current && wordsRef.current[newIdx]) {
          handleAudioRef.current(wordsRef.current[newIdx]);
        }
      }, 320);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  // ── Render ──────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }) => {
      const isThisWordPlaying = playingWord === item.name;
      return (
        <ScrollView
          style={{ width: POPUP_W }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: pad.sm }}
          directionalLockEnabled
        >
          <WordCard
            word={item}
            isPlaying={isThisWordPlaying}
            onAudio={() => handleAudio(item)}
            activePhonicsIndex={isThisWordPlaying ? activePhonicsIndex : -1}
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
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: backdropOp }]} />

      {/* Centered popup */}
      <View style={s.shell} pointerEvents="box-none">
        <Animated.View
          style={[
            s.popup,
            {
              opacity: popupOp,
              transform: [{ scale: popupScale }],
            },
          ]}
        >
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

          {/* Divider */}
          <View style={s.divider} />

          {/* Swipable word pages */}
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
            removeClippedSubviews={false}
          />

          {/* Nav buttons */}
          <View style={s.divider} />
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
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  shell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  popup: {
    width: POPUP_W,
    maxHeight: POPUP_H,
    backgroundColor: "#0A1628",
    borderRadius: radius.xxl,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderTopColor: "rgba(0,196,204,0.5)",
    overflow: "hidden",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.lg,
    paddingTop: pad.md,
    paddingBottom: pad.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
  },
  headerEmoji: { fontSize: font.xl },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,196,204,0.4)",
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
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 0,
  },
  flatList: {
    flexGrow: 0,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: pad.lg,
    paddingVertical: pad.md,
    gap: pad.md,
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
    color: "#0A1628",
    // fontWeight: 700,
    letterSpacing: 0.3,
  },
});
