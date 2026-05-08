// app/features/vocabulary/CategoryScreen.jsx
//
// Category detail screen — opened from both home and vocabulary screen.
//
// mode = "level"  → shows words for one specific play level (from home)
// mode = "all"    → shows words across all levels up to current (from vocabulary)
//
// Header: big cover image (emoji + gradient background, like StoryHome)
//         category name + word count + level context label
// Body:   2-column word card grid (same as WordBag)
//         DescribeModal (same as WordBag)

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  Easing,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import * as Speech from "expo-speech";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { vocabularyService } from "../../services/vocabularyService";
import { WordCard } from "./components/WordCard";
import { FONTS } from "../../theme";
import { font, pad, radius, size } from "../../theme/tokens";
import { getCategoryCover } from "./utils/categoryImages";
import { Image as ExpoImage } from "expo-image";

const { width: SW, height: SH } = Dimensions.get("window");
const isTablet = SW >= 768;
const COVER_H = isTablet ? Math.min(SH * 0.32, 280) : Math.min(SH * 0.26, 200);
const STATUS_BAR_H =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  surfaceHigh: "rgba(255,255,255,0.09)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.18)",
  purpleBorder: "rgba(150,82,217,0.4)",
};

// ── Phonics Player (same as WordBag) ─────────────────────────────────────────
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

// ── Describe Modal (identical to WordBag) ─────────────────────────────────────
function DescribeModal({ word, visible, onClose, playingId, onPlay }) {
  const slideY = useRef(new Animated.Value(SH)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const isPlaying = word && playingId === (word.id ?? word.name);

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
      <Animated.View style={[m.scrim, { opacity: scrOp }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>
      <Animated.View style={[m.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={m.handle} />
        <TouchableOpacity
          style={m.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={m.closeText}>✕</Text>
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={m.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={m.bigEmojiRing}>
            <Text style={m.bigEmoji}>{word.image || "📖"}</Text>
          </View>
          <Text style={m.bigName}>{word.name}</Text>
          {word.phonics?.length > 0 && (
            <View style={m.phonicsRow}>
              {word.phonics.map((p, i) => (
                <View key={i} style={m.phonicsChip}>
                  <Text style={m.phonicsText}>{p}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={[m.audioBtn, isPlaying && m.audioBtnActive]}
            onPress={() =>
              onPlay(word.id ?? word.name, word.phonics || [word.name])
            }
            activeOpacity={0.8}
          >
            <Text style={m.audioBtnIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
            <Text style={[m.audioBtnText, isPlaying && { color: C.teal }]}>
              {isPlaying ? "Stop Audio" : "Play Phonics"}
            </Text>
          </TouchableOpacity>
          {word.explanation ? (
            <View style={m.section}>
              <Text style={m.sectionLabel}>What is it?</Text>
              <Text style={m.explanationText}>{word.explanation}</Text>
            </View>
          ) : null}
          {word.extras?.length > 0 && (
            <View style={m.section}>
              <Text style={m.sectionLabel}>Did you know?</Text>
              {word.extras.map((extra, i) => (
                <View key={i} style={m.extraRow}>
                  <Text style={m.extraBullet}>✦</Text>
                  <Text style={m.extraText}>{extra}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={m.badgeRow}>
            {word.grammarCategory && (
              <View style={[m.badge, m.badgePurple]}>
                <Text style={[m.badgeText, { color: C.purple }]}>
                  {word.grammarCategory}
                </Text>
              </View>
            )}
            {word.category && (
              <View style={[m.badge, m.badgeTeal]}>
                <Text style={[m.badgeText, { color: C.teal }]}>
                  {word.category}
                </Text>
              </View>
            )}
            {word.playLevel && (
              <View
                style={[
                  m.badge,
                  {
                    backgroundColor: "rgba(255,213,79,0.12)",
                    borderColor: "rgba(255,213,79,0.4)",
                  },
                ]}
              >
                <Text style={[m.badgeText, { color: "#FFD54F" }]}>
                  Level {word.playLevel}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { playingId, play, stop } = usePhonicsPlayer();

  const {
    categoryName,
    displayName,
    coverEmoji,
    coverImageUrl,
    gradientStart,
    gradientEnd,
    accentColor,
    playLevel,
    mode, // "level" | "all"
  } = params;

  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const headerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOp, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let data;
        if (mode === "all") {
          data = await vocabularyService.getAllWordsForCategory(categoryName);
        } else {
          data = await vocabularyService.getWordsForLevelCategory(
            parseInt(playLevel, 10),
            categoryName,
          );
        }
        setWords(data?.words ?? []);
      } catch (_) {
        setWords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryName, playLevel, mode]);

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

  const gs = gradientStart || "#37474F";
  const ge = gradientEnd || "#263238";
  const ac = accentColor || "#90A4AE";

  const levelLabel =
    mode === "all" ? `Levels 1–${playLevel}` : `Level ${playLevel}`;

  return (
    <View style={sc.root}>
      {/* Custom header */}
      <View
        style={[
          sc.header,
          {
            paddingTop:
              insets.top + (Platform.OS === "android" ? STATUS_BAR_H : 0),
          },
        ]}
      >
        <TouchableOpacity
          style={sc.backBtn}
          onPress={() => {
            stop();
            router.back();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={C.teal} />
        </TouchableOpacity>
        <Text style={sc.headerTitle} numberOfLines={1}>
          {displayName || categoryName}
        </Text>
        <View style={sc.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover — emoji on gradient, like StoryHome cover image */}
        <Animated.View
          style={[sc.coverWrap, { height: COVER_H, opacity: headerOp }]}
        >
          {/* Background — real cover image or gradient fallback */}
          {getCategoryCover(categoryName) ? (
            <ExpoImage
              source={getCategoryCover(categoryName)}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <>
              <View
                style={[StyleSheet.absoluteFillObject, { backgroundColor: ge }]}
              />
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: gs, height: "55%", opacity: 0.92 },
                ]}
              />
            </>
          )}
          {/* Dark scrim so text stays readable regardless of image */}
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(8,8,26,0.35)" },
            ]}
          />
          {/* Decorative circles */}
          <View style={[sc.deco1, { backgroundColor: ac }]} />
          <View style={[sc.deco2, { backgroundColor: ac }]} />
          {/* Overlay with name + count */}
          <View style={sc.coverOverlay}>
            <Text style={sc.coverTitle}>{displayName || categoryName}</Text>
            <View
              style={[
                sc.levelPill,
                { backgroundColor: `${ac}33`, borderColor: `${ac}77` },
              ]}
            >
              <Text style={[sc.levelPillText, { color: ac }]}>
                {levelLabel} · {words.length}{" "}
                {words.length === 1 ? "word" : "words"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Word grid */}
        {loading ? (
          <View style={sc.loaderWrap}>
            <ActivityIndicator size="large" color={C.teal} />
          </View>
        ) : words.length === 0 ? (
          <View style={sc.emptyWrap}>
            <Text style={sc.emptyText}>No words found.</Text>
          </View>
        ) : (
          <View style={sc.grid}>
            {words.map((word, i) => (
              <WordCard
                key={(word.id ?? word.name) + i}
                word={word}
                index={i}
                playingId={playingId}
                onPlay={play}
                onDescribe={handleDescribe}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <DescribeModal
        word={selectedWord}
        visible={modalVisible}
        onClose={handleCloseModal}
        playingId={playingId}
        onPlay={play}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: pad.sm,
    paddingBottom: pad.sm,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  backBtn: {
    width: size.hitSm,
    height: size.hitSm,
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.teal,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginHorizontal: pad.s,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerSpacer: { width: size.hitSm },
  // Cover
  coverWrap: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  deco1: {
    position: "absolute",
    width: SW * 0.8,
    height: SW * 0.8,
    borderRadius: SW * 0.4,
    opacity: 0.06,
    top: -SW * 0.35,
    right: -SW * 0.25,
  },
  deco2: {
    position: "absolute",
    width: SW * 0.45,
    height: SW * 0.45,
    borderRadius: SW * 0.225,
    opacity: 0.04,
    bottom: -SW * 0.1,
    left: -SW * 0.1,
  },
  coverEmoji: { fontSize: isTablet ? 100 : 80, marginBottom: 40 },
  coverOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: pad.md,
    paddingBottom: pad.sm,
    paddingTop: pad.s,
    backgroundColor: "rgba(8,8,26,0.78)",
    alignItems: "flex-start",
    gap: 6,
  },
  coverTitle: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.h3 : font.xxl,
    color: "#E0F7FA",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  levelPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: pad.sm,
    paddingVertical: 3,
  },
  levelPillText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    letterSpacing: 0.3,
  },
  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: pad.sm,
    paddingTop: pad.md,
    paddingBottom: pad.xxxl,
  },
  loaderWrap: { height: 200, alignItems: "center", justifyContent: "center" },
  emptyWrap: { height: 200, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: FONTS.light, fontSize: font.md, color: C.textMuted },
});

// ── Describe Modal styles ─────────────────────────────────────────────────────
const m = StyleSheet.create({
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
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "rgba(0,188,212,0.3)",
    paddingTop: pad.s,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: pad.s,
  },
  closeBtn: {
    position: "absolute",
    top: pad.lg,
    right: pad.lg,
    width: size.hitSm,
    height: size.hitSm,
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
  },
  closeText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.textMuted },
  content: {
    alignItems: "center",
    paddingHorizontal: pad.xl,
    paddingBottom: pad.xxxl,
    paddingTop: pad.s,
  },
  bigEmojiRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,188,212,0.1)",
    borderWidth: 2.5,
    borderColor: "rgba(0,188,212,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.md,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  bigEmoji: { fontSize: font.h1 + 18 },
  bigName: {
    fontFamily: FONTS.bold,
    fontSize: font.h2,
    color: C.textPri,
    letterSpacing: 0.5,
    marginBottom: pad.sm,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  phonicsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: pad.xs,
    marginBottom: pad.md,
  },
  phonicsChip: {
    backgroundColor: "rgba(0,188,212,0.15)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  phonicsText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.teal,
    letterSpacing: 1,
  },
  audioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: pad.xl,
    paddingVertical: pad.sm,
    marginBottom: pad.xl,
  },
  audioBtnActive: {
    backgroundColor: "rgba(0,188,212,0.15)",
    borderColor: "rgba(0,188,212,0.35)",
  },
  audioBtnIcon: { fontSize: font.xl },
  audioBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textSec,
    letterSpacing: 0.3,
  },
  section: { width: "100%", marginBottom: pad.lg },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.teal,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: pad.s,
    opacity: 0.8,
  },
  explanationText: {
    fontFamily: FONTS.regular,
    fontSize: font.md,
    color: C.textSec,
    lineHeight: font.md + 7,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.md,
    padding: pad.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: pad.s,
    marginBottom: pad.s,
  },
  extraBullet: { fontSize: pad.s, color: C.teal, marginTop: pad.xs },
  extraText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.md - 1,
    color: C.textSec,
    lineHeight: font.md + 6,
  },
  badgeRow: {
    flexDirection: "row",
    gap: pad.s,
    marginTop: pad.xs,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  badgePurple: {
    backgroundColor: "rgba(150,82,217,0.18)",
    borderColor: "rgba(150,82,217,0.4)",
  },
  badgeTeal: {
    backgroundColor: "rgba(0,188,212,0.15)",
    borderColor: "rgba(0,188,212,0.35)",
  },
  badgeText: { fontFamily: FONTS.bold, fontSize: font.s, letterSpacing: 0.3 },
});
