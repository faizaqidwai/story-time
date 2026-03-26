// AdvancedBookReader.jsx
//
// For stories with readingLevel: "ADVANCE" or "MID"
// Layout:
//   - Has image  → image on top, text on bottom
//   - No image   → full page text only
// Navigation: swipe left/right OR tap Back/Next buttons

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

const { width } = Dimensions.get("window");
const READING_COINS = 50;

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C8A96E" />
        <Text style={styles.loadingText}>Opening story…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.navBtn} onPress={() => router.back()}>
          <Text style={styles.navBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!book) return null;

  const isLast = pageIndex === book.pages.length - 1;
  const isFirst = pageIndex === 0;

  return (
    <ScreenWrapper background={backgroundImage}>
      <AppBackground>
        <StatusBar barStyle="light-content" />

        {/* ── HEADER ── */}
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

        {/* ── SWIPABLE PAGES ── */}
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
          // Prevent vertical scroll inside FlatList from conflicting
          // with the inner ScrollView on each page
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <AdvancedPage
              page={item}
              hasImage={!!item.image}
              onWordTap={handleWordTap}
            />
          )}
        />

        {/* ── NAVIGATION ── */}
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

          {/* Dot indicators */}
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

/* ──────────────────────────────────────────────
   PAGE LAYOUT
   Each page is exactly `width` wide so FlatList
   paging snaps correctly.
────────────────────────────────────────────── */
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

  // Image top + text bottom
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
          // Needed so vertical scroll doesn't fight horizontal swipe
          nestedScrollEnabled
        >
          <InteractiveTextAdvance text={page.text} onWordTap={onWordTap} />
        </ScrollView>
      </View>
    );
  }

  // Text only
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

/* ──────────────────────────────────────────────
   STYLES
────────────────────────────────────────────── */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#120d07",
  },
  loadingText: {
    marginTop: 12,
    color: "#C8A96E",
    fontSize: 15,
    fontStyle: "italic",
  },
  errorText: {
    color: "#e07070",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 10,
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(20,14,8,0.7)",
    borderWidth: 1,
    borderColor: "rgba(200,169,110,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    gap: 5,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C8A96E",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(200,169,110,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C8A96E",
    borderRadius: 2,
  },
  pageCounter: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pageCounterText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C8A96E",
  },
  pageCounterTotal: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(200,169,110,0.5)",
  },

  // Every page must be exactly `width` wide for paging to snap
  pageRoot: {
    width,
    flex: 1,
  },

  // Image top + text bottom
  imageTopPage: {
    // no extra styles needed beyond pageRoot
  },
  imageSection: {
    flex: 0.6,
    overflow: "hidden",
  },
  topImage: {
    width: "100%",
    height: "100%",
  },
  textSection: {
    flex: 3.5,
  },
  textSectionContent: {
    paddingBottom: 16,
  },

  // Text only
  textOnlyPage: {
    // no extra styles needed beyond pageRoot
    backgroundColor: "#dfd3bd",
  },
  textOnlyScroll: {
    flex: 1,
  },
  textOnlyContent: {
    paddingBottom: 20,
  },

  // To be continued
  continuedPage: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  continuedDivider: {
    width: 80,
    height: 1,
    backgroundColor: "rgba(200,169,110,0.4)",
  },
  continuedText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#C8A96E",
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: 1,
  },
  continuedSubtext: {
    fontSize: 13,
    color: "rgba(200,169,110,0.5)",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(200,169,110,0.12)",
    borderWidth: 1,
    borderColor: "rgba(200,169,110,0.25)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    minWidth: 90,
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.25 },
  navBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F5E6C8",
    letterSpacing: 0.4,
  },
  navBtnTextDisabled: { color: "#5a4a35" },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C8A96E",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    minWidth: 90,
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#C8A96E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1208",
    letterSpacing: 0.4,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(200,169,110,0.2)",
  },
  dotActive: {
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#C8A96E",
  },
});
