// app/features/vocabulary/components/HomeCategoryCard.jsx
//
// Horizontal scroll card shown in home vocabulary section.
// Same rounded card size as GameCard but different inner layout:
//   - big centered emoji icon
//   - category name below
//   - word count pill
//   - gradient background matching the category theme

import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { FONTS } from "../../../theme";
import { font, pad, radius } from "../../../theme/tokens";
import { Image as ExpoImage } from "expo-image";
import { getCategoryIcon } from "../utils/categoryImages";

const { width: SW } = Dimensions.get("window");
const isTablet = SW >= 768;

const CARD_W = isTablet ? 180 : 140;
const CARD_H = isTablet ? 220 : 175;

export function HomeCategoryCard({ category, onPress }) {
  const scaleA = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scaleA, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(scaleA, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  const gradientStart = category.gradientStart || "#37474F";
  const gradientEnd = category.gradientEnd || "#263238";
  const accentColor = category.accentColor || "#90A4AE";

  return (
    <Animated.View style={{ transform: [{ scale: scaleA }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          s.card,
          {
            shadowColor: accentColor,
          },
        ]}
      >
        {/* Background layers — same technique as GameCard */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: gradientEnd },
          ]}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "55%",
            backgroundColor: gradientStart,
            opacity: 0.92,
          }}
        />

        {/* Decorative circles */}
        <View style={s.circle1} />
        <View style={s.circle2} />

        {/* Center icon */}
        <View style={s.iconArea}>
          {getCategoryIcon(category.categoryName) ? (
            <ExpoImage
              source={getCategoryIcon(category.categoryName)}
              style={s.iconImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={s.iconEmoji}>{category.iconEmoji || "📚"}</Text>
          )}
        </View>

        {/* Bottom info */}
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>
            {category.displayName}
          </Text>
          <View
            style={[
              s.countPill,
              {
                backgroundColor: `${accentColor}22`,
                borderColor: `${accentColor}55`,
              },
            ]}
          >
            <Text style={[s.countText, { color: accentColor }]}>
              {category.wordCount} {category.wordCount === 1 ? "word" : "words"}
            </Text>
          </View>
        </View>

        {/* Accent bar */}
        <View style={[s.accentBar, { backgroundColor: accentColor }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.xl,
    marginRight: pad.sm,
    overflow: "hidden",
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  circle1: {
    position: "absolute",
    width: CARD_W * 0.9,
    height: CARD_W * 0.9,
    borderRadius: CARD_W * 0.45,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -CARD_W * 0.3,
    right: -CARD_W * 0.25,
  },
  circle2: {
    position: "absolute",
    width: CARD_W * 0.5,
    height: CARD_W * 0.5,
    borderRadius: CARD_W * 0.25,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: CARD_H * 0.2,
    left: -CARD_W * 0.1,
  },
  iconArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: pad.md,
  },
  iconRing: {
    width: isTablet ? 80 : 64,
    height: isTablet ? 80 : 64,
    borderRadius: isTablet ? 40 : 32,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: isTablet ? 36 : 30,
  },
  info: {
    paddingHorizontal: pad.sm,
    paddingBottom: pad.sm + 4,
    alignItems: "center",
    gap: pad.xs,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.lg : font.md,
    color: "#fff",
    letterSpacing: 0.2,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: pad.s,
    paddingVertical: 3,
  },
  countText: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    letterSpacing: 0.3,
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },
  iconImage: {
    width: isTablet ? 48 : 100,
    height: isTablet ? 48 : 100,
  },
});
