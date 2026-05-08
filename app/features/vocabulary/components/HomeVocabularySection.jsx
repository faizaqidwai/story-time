// app/features/vocabulary/components/HomeVocabularySection.jsx
//
// Horizontally scrollable category cards shown on the home screen.
// Shows categories that exist at the profile's CURRENT play level only.
// Data is fetched once when the component mounts / playLevel changes.
// On press → navigates to CategoryScreen passing all data inline (no loader).

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { vocabularyService } from "../../../services/vocabularyService";
import { HomeCategoryCard } from "./HomeCategoryCard";
import { FONTS } from "../../../theme";
import { font, pad } from "../../../theme/tokens";

export function HomeVocabularySection({ playLevel }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async (level) => {
    if (!level) return;
    setLoading(true);
    try {
      const data = await vocabularyService.getCategoriesForLevel(level);
      setCategories(data?.categories ?? []);
    } catch (_) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories(playLevel);
  }, [playLevel, fetchCategories]);

  if (loading) {
    return (
      <View style={s.loaderWrap}>
        <ActivityIndicator size="small" color="#00BCD4" />
      </View>
    );
  }

  if (!categories.length) return null;

  const handleCategoryPress = (category) => {
    // Pass all category data via params so CategoryScreen needs no API call
    router.push({
      pathname: "/features/vocabulary/CategoryScreen",
      params: {
        // Category metadata
        categoryName: category.categoryName,
        displayName: category.displayName,
        coverEmoji: category.coverEmoji || category.iconEmoji || "📚",
        coverImageUrl: category.coverImageUrl || "",
        gradientStart: category.gradientStart || "#37474F",
        gradientEnd: category.gradientEnd || "#263238",
        accentColor: category.accentColor || "#90A4AE",
        // Context
        playLevel: String(playLevel),
        mode: "level", // "level" = single level, "all" = multi-level
      },
    });
  };

  return (
    <View>
      <View style={s.header}>
        <Text style={s.title}>Words</Text>
        <Text style={s.tagline}>Explore words by topic</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {categories.map((cat) => (
          <HomeCategoryCard
            key={cat.categoryName}
            category={cat}
            onPress={() => handleCategoryPress(cat)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 15, marginTop: 8, marginBottom: 2 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: "#fff",
    marginBottom: 2,
  },
  tagline: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: "rgba(255,255,255,0.45)",
    marginBottom: pad.sm,
  },
  scroll: {
    paddingLeft: 15,
    paddingRight: 10,
    paddingBottom: 20,
  },
  loaderWrap: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
});
