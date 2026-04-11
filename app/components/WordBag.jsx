// app/components/WordBag.jsx
//
// Word bag screen — shows all words collected by the current profile.
// Each word card shows emoji + name, with audio (phonics) and describe actions.
// Describe opens a full modal with explanation + extras.

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import { useUser } from "../_contexts/UserContext";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

// ── Palette (matches app dark theme) ─────────────────────────────────────────
const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  surfaceHigh: "rgba(255,255,255,0.09)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  tealGlow: "rgba(0,188,212,0.25)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.12)",
  yellowBorder: "rgba(255,213,79,0.55)",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.18)",
  purpleBorder: "rgba(150,82,217,0.4)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.15)",
  greenBorder: "rgba(76,175,80,0.5)",
  white: "#FFFFFF",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const CARD_SIZE = (SW - 48) / 2; // 2 columns with padding

// ─────────────────────────────────────────────────────────────────────────────
// PHONICS PLAYER — plays each phonics part sequentially with a small gap
// ─────────────────────────────────────────────────────────────────────────────
function usePhonicsPlayer() {
  const timerRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const stop = useCallback(() => {
    Speech.stop();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const play = useCallback(
    (wordId, phonics) => {
      if (playingId === wordId) {
        stop();
        return;
      }
      stop();
      setPlayingId(wordId);

      const parts = [...phonics];
      let index = 0;

      const speakNext = () => {
        if (index >= parts.length) {
          setPlayingId(null);
          return;
        }
        const part = parts[index++];
        Speech.speak(part, {
          language: "en",
          pitch: 1.1,
          rate: 0.75,
          onDone: () => {
            timerRef.current = setTimeout(speakNext, 280);
          },
          onStopped: () => setPlayingId(null),
          onError: () => setPlayingId(null),
        });
      };

      speakNext();
    },
    [playingId, stop],
  );

  useEffect(() => () => stop(), []);

  return { playingId, play, stop };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORD CARD
// ─────────────────────────────────────────────────────────────────────────────
function WordCard({ word, index, onDescribe, playingId, onPlay }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const op = useRef(new Animated.Value(0)).current;
  const isPlaying = playingId === word.id || playingId === word.name;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(op, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={[cardS.wrapper, { opacity: op, transform: [{ scale }] }]}
    >
      {/* Emoji + name */}
      <View style={cardS.emojiRing}>
        <Text style={cardS.emoji}>{word.image || "📖"}</Text>
      </View>
      <Text style={cardS.name}>{word.name}</Text>

      {/* Action buttons */}
      <View style={cardS.actions}>
        {/* Audio / Phonics */}
        <TouchableOpacity
          style={[cardS.actionBtn, isPlaying && cardS.actionBtnActive]}
          onPress={() =>
            onPlay(word.id ?? word.name, word.phonics || [word.name])
          }
          onPressIn={pressIn}
          onPressOut={pressOut}
          activeOpacity={0.8}
        >
          <Text style={cardS.actionIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
          <Text style={[cardS.actionLabel, isPlaying && { color: C.teal }]}>
            {isPlaying ? "Stop" : "Audio"}
          </Text>
        </TouchableOpacity>

        {/* Describe */}
        <TouchableOpacity
          style={cardS.actionBtn}
          onPress={() => onDescribe(word)}
          activeOpacity={0.8}
        >
          <Text style={cardS.actionIcon}>📖</Text>
          <Text style={cardS.actionLabel}>Describe</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const cardS = StyleSheet.create({
  wrapper: {
    width: CARD_SIZE,
    backgroundColor: C.surface,
    borderRadius: radius.xl, // 20 → radius.xl (24/32)
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    paddingVertical: pad.lg, // 18 → pad.lg (20/28)
    paddingHorizontal: pad.s, // 10 → pad.s (8/11)
    margin: pad.xs, // 6 → pad.xs (4/6)
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  emojiRing: {
    width: size.avatarLg + 20, // 80 → avatarLg(60/80)+20 = 80/100
    height: size.avatarLg + 20,
    borderRadius: (size.avatarLg + 20) / 2,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 2,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.s, // 10 → pad.s (8/11)
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  emoji: { fontSize: font.h2 - 4 }, // 38 → font.h2(34/46)-4 = 30/42 — keeps proportional
  name: {
    fontFamily: FONTS.bold,
    fontSize: font.lg, // 18 → font.lg (17/22)
    color: C.textPri,
    letterSpacing: 0.5,
    marginBottom: pad.sm, // 14 → pad.sm (12/16)
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  actions: {
    flexDirection: "row",
    gap: pad.s, // 8 → pad.s (8/11)
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.sm, // 12 → radius.sm (10/14)
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: pad.sm, // 12 → pad.sm (12/16)
    paddingVertical: pad.xs + 3, // 7 → pad.xs(4/6)+3 = 7/9
    gap: pad.xs - 1, // 3 → pad.xs(4/6)-1 = 3/5
  },
  actionBtnActive: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
  },
  actionIcon: { fontSize: font.lg }, // 16 → font.lg (17/22)
  actionLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.xs, // 10 → font.xs (9/12)
    color: C.textMuted,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function DescribeModal({ word, visible, onClose, playingId, onPlay }) {
  const slideY = useRef(new Animated.Value(SH)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const isPlaying = word && (playingId === word.id || playingId === word.name);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scrOp, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scrOp, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: SH,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!word) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[modalS.scrim, { opacity: scrOp }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[modalS.sheet, { transform: [{ translateY: slideY }] }]}
      >
        {/* Handle */}
        <View style={modalS.handle} />

        {/* Close */}
        <TouchableOpacity
          style={modalS.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={modalS.closeText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={modalS.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Big emoji */}
          <View style={modalS.bigEmojiRing}>
            <Text style={modalS.bigEmoji}>{word.image || "📖"}</Text>
          </View>

          <Text style={modalS.bigName}>{word.name}</Text>

          {/* Phonics chips */}
          {word.phonics && word.phonics.length > 0 && (
            <View style={modalS.phonicsRow}>
              {word.phonics.map((p, i) => (
                <View key={i} style={modalS.phonicsChip}>
                  <Text style={modalS.phonicsText}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Audio button */}
          <TouchableOpacity
            style={[modalS.audioBtn, isPlaying && modalS.audioBtnActive]}
            onPress={() =>
              onPlay(word.id ?? word.name, word.phonics || [word.name])
            }
            activeOpacity={0.8}
          >
            <Text style={modalS.audioBtnIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
            <Text style={[modalS.audioBtnText, isPlaying && { color: C.teal }]}>
              {isPlaying ? "Stop Audio" : "Play Phonics"}
            </Text>
          </TouchableOpacity>

          {/* Explanation */}
          {word.explanation ? (
            <View style={modalS.section}>
              <Text style={modalS.sectionLabel}>What is it?</Text>
              <Text style={modalS.explanationText}>{word.explanation}</Text>
            </View>
          ) : null}

          {/* Extras */}
          {word.extras && word.extras.length > 0 ? (
            <View style={modalS.section}>
              <Text style={modalS.sectionLabel}>Did you know?</Text>
              {word.extras.map((extra, i) => (
                <View key={i} style={modalS.extraRow}>
                  <Text style={modalS.extraBullet}>✦</Text>
                  <Text style={modalS.extraText}>{extra}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Grammar / category badges */}
          <View style={modalS.badgeRow}>
            {word.grammarCategory ? (
              <View style={[modalS.badge, modalS.badgePurple]}>
                <Text style={[modalS.badgeText, { color: C.purple }]}>
                  {word.grammarCategory}
                </Text>
              </View>
            ) : null}
            {word.category ? (
              <View style={[modalS.badge, modalS.badgeTeal]}>
                <Text style={[modalS.badgeText, { color: C.teal }]}>
                  {word.category}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.78,
    backgroundColor: "#0d0f1e",
    borderTopLeftRadius: radius.xxl, // 28 → radius.xxl (32/44)
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "rgba(0,188,212,0.3)",
    paddingTop: pad.s, // 10 → pad.s (8/11)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.xs, // 3 → radius.xs (6/8)
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: pad.s, // 10 → pad.s (8/11)
  },
  closeBtn: {
    position: "absolute",
    top: pad.lg, // 18 → pad.lg (20/28)
    right: pad.lg, // 20 → pad.lg (20/28)
    width: size.hitSm, // 34 → size.hitSm (36/48)
    height: size.hitSm,
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
  },
  closeText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm, // 13 → font.sm (13/17)
    color: C.textMuted,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: pad.xl, // 24 → pad.xl (24/33)
    paddingBottom: pad.xxxl, // 40 → pad.xxxl (48/66)
    paddingTop: pad.s, // 10 → pad.s (8/11)
  },
  bigEmojiRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,188,212,0.1)",
    borderWidth: 2.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.md, // 16 → pad.md (16/22)
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  bigEmoji: { fontSize: font.h1 + 18 }, // 58 → font.h1(40/54)+18 = 58/72
  bigName: {
    fontFamily: FONTS.bold,
    fontSize: font.h2, // 36 → font.h2 (34/46)
    color: C.textPri,
    letterSpacing: 0.5,
    marginBottom: pad.sm, // 14 → pad.sm (12/16)
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  phonicsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: pad.xs, // 6 → pad.xs (4/6)
    marginBottom: pad.md, // 16 → pad.md (16/22)
  },
  phonicsChip: {
    backgroundColor: C.tealDim,
    borderRadius: radius.sm, // 10 → radius.sm (10/14)
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.sm, // 12 → pad.sm (12/16)
    paddingVertical: pad.xs, // 5 → pad.xs (4/6)
  },
  phonicsText: {
    fontFamily: FONTS.bold,
    fontSize: font.md, // 15 → font.md (15/19)
    color: C.teal,
    letterSpacing: 1,
  },
  audioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s, // 8 → pad.s (8/11)
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.lg, // 16 → radius.lg (18/24)
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: pad.xl, // 24 → pad.xl (24/33)
    paddingVertical: pad.sm, // 12 → pad.sm (12/16)
    marginBottom: pad.xl, // 24 → pad.xl (24/33)
  },
  audioBtnActive: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
  },
  audioBtnIcon: { fontSize: font.xl }, // 20 → font.xl (20/26)
  audioBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md, // 15 → font.md (15/19)
    color: C.textSec,
    letterSpacing: 0.3,
  },
  section: {
    width: "100%",
    marginBottom: pad.lg, // 20 → pad.lg (20/28)
  },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.s, // 11 → font.s (12/14)
    color: C.teal,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: pad.s, // 8 → pad.s (8/11)
    opacity: 0.8,
  },
  explanationText: {
    fontFamily: FONTS.regular,
    fontSize: font.md, // 15 → font.md (15/19)
    color: C.textSec,
    lineHeight: font.md + 7,
    backgroundColor: C.surface,
    borderRadius: radius.md, // 14 → radius.md (14/19)
    padding: pad.sm, // 14 → pad.sm (12/16)
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: pad.s, // 10 → pad.s (8/11)
    marginBottom: pad.s, // 8 → pad.s (8/11)
  },
  extraBullet: {
    fontSize: pad.s, // 10 → pad.s (8/11)
    color: C.teal,
    marginTop: pad.xs, // 4 → pad.xs (4/6)
  },
  extraText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.md - 1, // 14 → font.md(15/19)-1 = 14/18
    color: C.textSec,
    lineHeight: font.md + 6,
  },
  badgeRow: {
    flexDirection: "row",
    gap: pad.s, // 8 → pad.s (8/11)
    marginTop: pad.xs, // 4 → pad.xs (4/6)
  },
  badge: {
    borderRadius: radius.sm, // 10 → radius.sm (10/14)
    borderWidth: 1,
    paddingHorizontal: pad.sm, // 12 → pad.sm (12/16)
    paddingVertical: pad.xs, // 5 → pad.xs (4/6)
  },
  badgePurple: {
    backgroundColor: C.purpleDim,
    borderColor: C.purpleBorder,
  },
  badgeTeal: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: font.s, // 12 → font.s (12/14)
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <View style={emptyS.container}>
      <Animated.Text style={[emptyS.icon, { transform: [{ scale: pulse }] }]}>
        🎒
      </Animated.Text>
      <Text style={emptyS.title}>Your word bag is empty</Text>
      <Text style={emptyS.sub}>
        Complete stories to collect words and build your vocabulary!
      </Text>
    </View>
  );
}
const emptyS = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: pad.xxxl, // 40 → pad.xxxl (48/66)
  },
  icon: { fontSize: font.h1 + 32, marginBottom: pad.lg }, // 72 → font.h1(40/54)+32 = 72/86
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl, // 22 → font.xxl (24/32)
    color: C.textPri,
    textAlign: "center",
    marginBottom: pad.s, // 10 → pad.s (8/11)
  },
  sub: {
    fontFamily: FONTS.light,
    fontSize: font.md - 1, // 14 → font.md(15/19)-1 = 14/18
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.md + 6,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const WordBagScreen = () => {
  const router = useRouter();
  const { currentProfile } = useUser();
  const { playingId, play, stop } = usePhonicsPlayer();

  const [selectedWord, setSelectedWord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const words = currentProfile?.wordBag?.words || [];

  const uniqueWords = words.filter(
    (w, i, arr) => arr.findIndex((x) => x.name === w.name) === i,
  );

  const handleDescribe = useCallback(
    (word) => {
      stop();
      setSelectedWord(word);
      setModalVisible(true);
    },
    [stop],
  );

  const handleCloseModal = useCallback(() => {
    stop();
    setModalVisible(false);
    setTimeout(() => setSelectedWord(null), 350);
  }, [stop]);

  return (
    <View style={screenS.root}>
      {/* Background glow circles */}
      <View style={[screenS.glow, screenS.glow1]} />
      <View style={[screenS.glow, screenS.glow2]} />

      {/* Header */}
      <View style={screenS.header}>
        <TouchableOpacity
          style={screenS.backBtn}
          onPress={() => {
            stop();
            router.back();
          }}
          activeOpacity={0.75}
        >
          <Text style={screenS.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={screenS.headerCenter}>
          <Text style={screenS.headerTitle}>Word Bag</Text>
          <View style={screenS.countPill}>
            <Text style={screenS.countText}>{uniqueWords.length} words</Text>
          </View>
        </View>

        <View style={{ width: 60 }} />
      </View>

      {/* Content */}
      {uniqueWords.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          contentContainerStyle={screenS.grid}
          showsVerticalScrollIndicator={false}
        >
          {uniqueWords.map((word, i) => (
            <WordCard
              key={word.name + i}
              word={word}
              index={i}
              playingId={playingId}
              onPlay={play}
              onDescribe={handleDescribe}
            />
          ))}
        </ScrollView>
      )}

      {/* Describe modal */}
      <DescribeModal
        word={selectedWord}
        visible={modalVisible}
        onClose={handleCloseModal}
        playingId={playingId}
        onPlay={play}
      />
    </View>
  );
};

const screenS = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  glow: {
    position: "absolute",
    borderRadius: radius.pill,
    opacity: 0.12,
  },
  glow1: {
    width: 300,
    height: 300,
    backgroundColor: C.teal,
    top: -80,
    right: -80,
  },
  glow2: {
    width: 200,
    height: 200,
    backgroundColor: "#9652D9",
    bottom: 60,
    left: -60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + pad.s, // +10 → +pad.s (8/11)
    paddingBottom: pad.md, // 16 → pad.md (16/22)
    paddingHorizontal: pad.lg, // 18 → pad.lg (20/28)
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.15)",
  },
  backBtn: {
    width: size.hitMd, // 40 → size.hitMd (40/52)
    height: size.hitMd,
    borderRadius: size.hitMd / 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontFamily: FONTS.bold,
    fontSize: font.xl, // 20 → font.xl (20/26)
    color: C.teal,
  },
  headerCenter: {
    alignItems: "center",
    gap: pad.xs, // 6 → pad.xs (4/6)
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl, // 22 → font.xxl (24/32)
    color: C.textPri,
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  countPill: {
    backgroundColor: C.tealDim,
    borderRadius: radius.sm, // 10 → radius.sm (10/14)
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.s, // 10 → pad.s (8/11)
    paddingVertical: pad.xs - 1, // 3 → pad.xs(4/6)-1 = 3/5
  },
  countText: {
    fontFamily: FONTS.bold,
    fontSize: font.s, // 11 → font.s (12/14)
    color: C.teal,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: pad.sm, // 12 → pad.sm (12/16)
    paddingTop: pad.md, // 16 → pad.md (16/22)
    paddingBottom: pad.xxxl, // 40 → pad.xxxl (48/66)
  },
});

export default WordBagScreen;
