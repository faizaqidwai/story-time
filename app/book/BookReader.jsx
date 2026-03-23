// app/book/[id].jsx  (BookReader — updated)
//
// Changes from original:
//  • Reads activityData from the story object (set by storyActivityData.js)
//  • Calls completeActivity(ACTIVITY.STORY_READING, report, rewards) on finish
//  • Routes to the next activity instead of showing a badge popup directly
//  • Badge popup is removed — reward celebration now happens in StoryFinishOverlay

import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions,
  Pressable,
  Platform,
} from "react-native";
import { ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import InteractiveText from "../components/InteractiveText";
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

// Coins earned for completing the story reading
const READING_COINS = 50;

export default function BookReader() {
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

  const handleBack = () => {
    router.back();
  };

  const handleFinishStory = async () => {
    const report = generateReadingReport();

    // Record which words the user tapped — add to rewards
    const tappedWords = Object.keys(report.wordFrequency);

    if (isReplay) {
      router.back();
      return;
    }

    // Mark story reading as complete in the session
    await completeActivity(
      ACTIVITY.STORY_READING,
      { report },
      {
        coins: READING_COINS,
        words: tappedWords,
      },
    );

    // Route to the next activity: WordGuessGame (activity index 1)
    const nextRoute = ACTIVITY_ROUTES[ACTIVITY.WORD_STORY_CHALLENGE];
    router.replace({
      pathname: `/components/${nextRoute}`,
      params: {
        storyId: book.id,
        title: book.title,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading story...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
        <Pressable style={styles.bigButton} onPress={() => router.back()}>
          <Text style={styles.bigButtonText}>⬅ Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!book) return null;

  return (
    <ScreenWrapper background={backgroundImage}>
      <AppBackground>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={22} color="#E0F7FA" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <View style={styles.headerSpacer} />
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
          renderItem={({ item }) => (
            <StorySwipePage page={item} onWordTap={handleWordTap} />
          )}
        />

        <View style={styles.buttons}>
          {/* BACK BUTTON */}
          <Pressable
            disabled={pageIndex === 0}
            onPress={() => goToPage(pageIndex - 1)}
            style={[styles.bigButton, pageIndex === 0 && styles.disabledButton]}
          >
            <Ionicons name="chevron-back" size={36} color="#333" />
          </Pressable>

          {/* PAGE NUMBER */}
          <Text style={styles.pageNumber}>
            {pageIndex + 1} / {book.pages.length}
          </Text>

          {/* NEXT OR FINISH */}
          {pageIndex === book.pages.length - 1 ? (
            <Pressable style={styles.bigButton} onPress={handleFinishStory}>
              <Text style={styles.bigButtonText}>Finish ⭐</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => goToPage(pageIndex + 1)}
              style={styles.bigButton}
            >
              <Ionicons name="chevron-forward" size={36} color="#333" />
            </Pressable>
          )}
        </View>
      </AppBackground>
    </ScreenWrapper>
  );
}

/* ===================== PAGE COMPONENT ===================== */
const StorySwipePage = ({ page, onWordTap }) => {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.imageSection}>
        <ExpoImage
          source={{ uri: page.image }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
        />
      </View>
      <View style={styles.textSection}>
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.textScrollContent}
        >
          <InteractiveText text={page.text} onWordTap={onWordTap} />
        </ScrollView>
      </View>
    </View>
  );
};

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  page: { flex: 1 },
  imageSection: { flex: 4, alignItems: "center" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  textSection: {
    flex: 2.5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  textScrollContent: { paddingBottom: 40 },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  bigButton: {
    backgroundColor: "#FFD93D",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    minWidth: 110,
    alignItems: "center",
    elevation: 4,
    height: 65,
  },
  bigButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    paddingVertical: 5,
  },
  disabledButton: { opacity: 0.4 },
  pageNumber: { fontSize: 16, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#00BCD4",
    letterSpacing: 0.3,
    marginHorizontal: 8,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSpacer: { width: 40, flexShrink: 0 },
});
