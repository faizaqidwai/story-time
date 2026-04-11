// AdvancedBookReader.jsx

import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Platform,
  FlatList,
  StatusBar,
} from "react-native";
import { ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import InteractiveTextAdvance from "../components/InteractiveTextAdvance";
import ScreenWrapper from "../components/ScreenWrapper";
import AppBackground from "../components/AppBackground";
import { useUser } from "../_contexts/UserContext";
import {
  useStoryActivity,
  ACTIVITY,
  ACTIVITY_ROUTES,
} from "../_contexts/StoryActivityContext";
import { attachActivityDataToStories } from "../data/storyActivityData";
import backgroundImage from "../../assets/img/storyPageBack4.jpg";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens"; // ← ADD

const { width } = Dimensions.get("window");
const READING_COINS = 50;

// AdvancedBookReader theme — warm parchment palette
const GOLD = "#C8A96E";

export default function AdvancedBookReader() {
  const { id, replay } = useLocalSearchParams();
  const isReplay = replay === "1";
  const router = useRouter();
  const { currentProfile } = useUser();
  const { storySession, completeActivity, currentStory } = useStoryActivity();

  const [book, setBook] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wordTaps, setWordTaps] = useState([]);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (currentStory) {
      const enriched = currentStory.activityData
        ? currentStory
        : attachActivityDataToStories([currentStory])[0];
      setBook(enriched);
      setLoading(false);
    } else {
      setError("Story not available offline");
      setLoading(false);
    }
  }, [currentStory]);

  const goToPage = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setPageIndex(index);
  };
  const handleWordTap = (word) => {
    setWordTaps((prev) => [...prev, word.toLowerCase()]);
  };

  const generateReadingReport = () => {
    const allWords = book.pages.flatMap((p) => p.text.split(" "));
    const frequency = wordTaps.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
    const mostTapped =
      Object.keys(frequency).length > 0
        ? Object.entries(frequency).sort((a, b) => b[1] - a[1])[0]
        : null;
    return {
      storyId: book.id,
      storyTitle: book.title,
      totalWords: allWords.length,
      totalTaps: wordTaps.length,
      uniqueWordsTapped: Object.keys(frequency).length,
      mostTappedWord: mostTapped,
      wordFrequency: frequency,
    };
  };

  const handleFinishStory = async () => {
    const report = generateReadingReport();
    const tappedWords = Object.keys(report.wordFrequency);
    if (isReplay) {
      router.back();
      return;
    }
    await completeActivity(
      ACTIVITY.STORY_READING,
      { report },
      { coins: READING_COINS, words: tappedWords },
    );
    const nextRoute = ACTIVITY_ROUTES[ACTIVITY.WORD_STORY_CHALLENGE];
    router.replace({
      pathname: `/components/${nextRoute}`,
      params: { storyId: book.id, title: book.title },
    });
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Opening story…</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.navBtn} onPress={() => router.back()}>
          <Text style={styles.navBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  if (!book) return null;

  const isLast = pageIndex === book.pages.length - 1;
  const isFirst = pageIndex === 0;

  return (
    <ScreenWrapper background={backgroundImage}>
      <AppBackground>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#F5E6C8" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {book.title}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((pageIndex + 1) / book.pages.length) * 100}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.pageCounter}>
            <Text style={styles.pageCounterText}>
              {pageIndex + 1}
              <Text style={styles.pageCounterTotal}>/{book.pages.length}</Text>
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={book.pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setPageIndex(index);
          }}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <AdvancedPage
              page={item}
              hasImage={!!item.image}
              onWordTap={handleWordTap}
            />
          )}
        />

        {/* Navigation */}
        <View style={styles.navBar}>
          <Pressable
            style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
            onPress={() => goToPage(pageIndex - 1)}
            disabled={isFirst}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isFirst ? "#5a4a35" : "#F5E6C8"}
            />
            <Text
              style={[styles.navBtnText, isFirst && styles.navBtnTextDisabled]}
            >
              Back
            </Text>
          </Pressable>

          <View style={styles.dotRow}>
            {book.pages.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === pageIndex && styles.dotActive]}
              />
            ))}
          </View>

          {isLast ? (
            <Pressable style={styles.finishBtn} onPress={handleFinishStory}>
              <Text style={styles.finishBtnText}>Finish</Text>
              <Ionicons name="star" size={16} color="#1a1208" />
            </Pressable>
          ) : (
            <Pressable
              style={styles.navBtn}
              onPress={() => goToPage(pageIndex + 1)}
            >
              <Text style={styles.navBtnText}>Next</Text>
              <Ionicons name="chevron-forward" size={22} color="#F5E6C8" />
            </Pressable>
          )}
        </View>
      </AppBackground>
    </ScreenWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE LAYOUTS
// ─────────────────────────────────────────────────────────────────────────────
const AdvancedPage = ({ page, hasImage, onWordTap }) => {
  const isContinued =
    page.text.toLowerCase().includes("to be continued") && !hasImage;

  if (isContinued) {
    return (
      <View style={[styles.pageRoot, styles.continuedPage]}>
        <View style={styles.continuedDivider} />
        <Text style={styles.continuedText}>To be continued…</Text>
        <View style={styles.continuedDivider} />
        <Text style={styles.continuedSubtext}>
          The adventure awaits in the next chapter
        </Text>
      </View>
    );
  }

  if (hasImage) {
    return (
      <View style={[styles.pageRoot, styles.imageTopPage]}>
        <View style={styles.imageSection}>
          <ExpoImage
            source={{ uri: page.image }}
            style={styles.topImage}
            contentFit="cover"
            cachePolicy="disk"
          />
        </View>
        <ScrollView
          style={styles.textSection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.textSectionContent}
          nestedScrollEnabled
        >
          <InteractiveTextAdvance text={page.text} onWordTap={onWordTap} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.pageRoot, styles.textOnlyPage]}>
      <ScrollView
        style={styles.textOnlyScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.textOnlyContent}
        nestedScrollEnabled
      >
        <InteractiveTextAdvance text={page.text} onWordTap={onWordTap} />
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#120d07",
  },
  loadingText: {
    marginTop: pad.sm,
    color: GOLD,
    fontSize: font.md,
    fontStyle: "italic",
  }, // was: 12, 15
  errorText: {
    color: "#e07070",
    fontSize: font.lg,
    marginBottom: pad.md,
    textAlign: "center",
    paddingHorizontal: pad.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: pad.sm, // was: 14
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: pad.sm, // was: 10
    gap: pad.sm, // was: 10
  },
  backButton: {
    width: size.hitSm, // was: 38
    height: size.hitSm,
    borderRadius: size.hitSm / 2, // was: 19
    backgroundColor: "rgba(20,14,8,0.7)",
    borderWidth: 1,
    borderColor: "rgba(200,169,110,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCenter: { flex: 1, gap: pad.xs }, // was: 5
  headerTitle: {
    fontSize: font.sm,
    fontFamily: FONTS.bold,
    color: GOLD,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  }, // was: 13
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(200,169,110,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: GOLD, borderRadius: 2 },
  pageCounter: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pageCounterText: { fontSize: font.lg, fontFamily: FONTS.bold, color: GOLD }, // was: 16
  pageCounterTotal: {
    fontSize: font.sm,
    fontFamily: FONTS.light,
    color: "rgba(200,169,110,0.5)",
  }, // was: 12

  // Pages
  pageRoot: { width, flex: 1 },
  imageTopPage: {},
  imageSection: { flex: 0.6, overflow: "hidden" },
  topImage: { width: "100%", height: "100%" },
  textSection: { flex: 3.5 },
  textSectionContent: { paddingBottom: pad.md }, // was: 16
  textOnlyPage: { backgroundColor: "#dfd3bd" },
  textOnlyScroll: { flex: 1 },
  textOnlyContent: { paddingBottom: pad.lg }, // was: 20

  // To be continued
  continuedPage: {
    justifyContent: "center",
    alignItems: "center",
    gap: pad.md,
    paddingHorizontal: pad.xxl,
  }, // was: 16, 40
  continuedDivider: {
    width: 80,
    height: 1,
    backgroundColor: "rgba(200,169,110,0.4)",
  },
  continuedText: {
    fontSize: font.h3,
    fontFamily: FONTS.bold,
    color: GOLD,
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: 1,
  }, // was: 24
  continuedSubtext: {
    fontSize: font.sm,
    color: "rgba(200,169,110,0.5)",
    textAlign: "center",
    letterSpacing: 0.5,
  }, // was: 13

  // Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.md, // was: 16
    paddingVertical: pad.sm, // was: 12
    paddingBottom: Platform.OS === "ios" ? pad.xl : pad.sm, // was: 24 / 14
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.xs, // was: 4
    backgroundColor: "rgba(200,169,110,0.12)",
    borderWidth: 1,
    borderColor: "rgba(200,169,110,0.25)",
    paddingVertical: pad.sm, // was: 10
    paddingHorizontal: pad.md, // was: 16
    borderRadius: radius.pill, // was: 24
    minWidth: 90,
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.25 },
  navBtnText: {
    fontSize: font.md,
    fontFamily: FONTS.bold,
    color: "#F5E6C8",
    letterSpacing: 0.4,
  }, // was: 14
  navBtnTextDisabled: { color: "#5a4a35" },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s, // was: 6
    backgroundColor: GOLD,
    paddingVertical: pad.sm, // was: 10
    paddingHorizontal: pad.lg, // was: 20
    borderRadius: radius.pill, // was: 24
    minWidth: 90,
    justifyContent: "center",
    elevation: 4,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  finishBtnText: {
    fontSize: font.md,
    fontFamily: FONTS.bold,
    color: "#1a1208",
    letterSpacing: 0.4,
  }, // was: 14

  // Dots
  dotRow: { flexDirection: "row", alignItems: "center", gap: pad.s }, // was: 6
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(200,169,110,0.2)",
  },
  dotActive: { width: 18, height: 5, borderRadius: 3, backgroundColor: GOLD },
});
