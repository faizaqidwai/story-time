// app/features/vocabulary/components/WordCard.jsx
//
// Shared word card used in both CategoryScreen and VocabularyScreen.
// Matches the existing WordBag WordCard style exactly.

import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";

const { width: SW } = Dimensions.get("window");
const isTablet = SW >= 768;
const CARD_SIZE = (SW - 48) / 2;

const C = {
  surface: "rgba(255,255,255,0.05)",
  surfaceHigh: "rgba(255,255,255,0.09)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  textPri: "#E0F7FA",
  textMuted: "#546E7A",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.18)",
  purpleBorder: "rgba(150,82,217,0.4)",
};

export function WordCard({ word, index, onDescribe, playingId, onPlay }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const op = useRef(new Animated.Value(0)).current;
  const isPlaying = playingId === (word.id ?? word.name);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        delay: Math.min(index * 60, 600), // cap delay so long lists feel fast
        useNativeDriver: true,
      }),
      Animated.timing(op, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 60, 600),
        useNativeDriver: true,
      }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <View style={cardS.emojiRing}>
        <Text style={cardS.emoji}>{word.image || "📖"}</Text>
      </View>
      <Text style={cardS.name}>{word.name}</Text>

      {/* Level badge — shown in vocabulary multi-level view */}
      {word.playLevel != null && (
        <View style={cardS.levelBadge}>
          <Text style={cardS.levelText}>Lv {word.playLevel}</Text>
        </View>
      )}

      <View style={cardS.actions}>
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
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    paddingVertical: pad.lg,
    paddingHorizontal: pad.s,
    margin: pad.xs,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  emojiRing: {
    width: isTablet ? 88 : 72,
    height: isTablet ? 88 : 72,
    borderRadius: isTablet ? 44 : 36,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 2,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.s,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  emoji: { fontSize: isTablet ? font.h2 : font.h2 - 4 },
  name: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.xl : font.lg,
    color: C.textPri,
    letterSpacing: 0.5,
    marginBottom: pad.xs,
    textAlign: "center",
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  levelBadge: {
    backgroundColor: "rgba(0,188,212,0.1)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.3)",
    paddingHorizontal: pad.s,
    paddingVertical: 2,
    marginBottom: pad.s,
  },
  levelText: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.teal,
    letterSpacing: 0.5,
  },
  actions: { flexDirection: "row", gap: pad.s },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs + 3,
    gap: 3,
  },
  actionBtnActive: {
    backgroundColor: C.tealDim,
    borderColor: C.tealBorder,
  },
  actionIcon: { fontSize: isTablet ? font.xl : font.lg },
  actionLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.textMuted,
    letterSpacing: 0.3,
  },
});
