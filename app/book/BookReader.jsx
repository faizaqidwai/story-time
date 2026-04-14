// app/book/[id]/read.jsx  — BookReader

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
import NewWordsOverlay from "../components/NewWordsOverlay";
import { useUser } from "../_contexts/UserContext";
import {
  useStoryActivity,
  ACTIVITY,
  ACTIVITY_ROUTES,
} from "../_contexts/StoryActivityContext";
import { attachActivityDataToStories } from "../data/storyActivityData";
import backgroundImage from "../../assets/img/storyPageBack4.jpg";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens";

const { width } = Dimensions.get("window");
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
  const [showWordsOverlay, setShowWordsOverlay] = useState(false);

  // Cache challenge words the moment the session loads so they survive
  // completeActivity clearing/mutating the session (also works on replay).
  const [cachedChallengeWords, setCachedChallengeWords] = useState([]);

  const pendingFinishRef = useRef(null);
  const flatListRef = useRef(null);

  // Load book
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

  // Cache challenge words whenever the session provides them
  useEffect(() => {
    if (storySession?.challengeWords?.length > 0) {
      setCachedChallengeWords(storySession.challengeWords);
    }
  }, [storySession]);

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

  const navigateToNextActivity = () => {
    const nextRoute = ACTIVITY_ROUTES[ACTIVITY.WORD_STORY_CHALLENGE];
    router.replace({
      pathname: `/components/${nextRoute}`,
      params: { storyId: book.id, title: book.title },
    });
  };

  const handleFinishStory = async () => {
    const report = generateReadingReport();
    const tappedWords = Object.keys(report.wordFrequency);

    // Use cached words so they're available on replay and after completeActivity
    const challengeWords =
      cachedChallengeWords.length > 0
        ? cachedChallengeWords
        : (storySession?.challengeWords ?? []);

    if (challengeWords.length > 0) {
      // Set what happens after the overlay closes
      pendingFinishRef.current = () => {
        if (isReplay || storySession?.isReadOnly) {
          router.back();
        } else {
          navigateToNextActivity();
        }
      };

      // Only award coins/complete on a real (non-replay) read
      if (!isReplay && !storySession?.isReadOnly) {
        await completeActivity(
          ACTIVITY.STORY_READING,
          { report },
          { coins: READING_COINS, words: tappedWords },
        );
      }

      setShowWordsOverlay(true);
    } else {
      // No challenge words — skip overlay
      if (isReplay || storySession?.isReadOnly) {
        router.back();
      } else {
        await completeActivity(
          ACTIVITY.STORY_READING,
          { report },
          { coins: READING_COINS, words: tappedWords },
        );
        navigateToNextActivity();
      }
    }
  };

  const handleOverlayDone = () => {
    setShowWordsOverlay(false);
    if (pendingFinishRef.current) {
      pendingFinishRef.current();
      pendingFinishRef.current = null;
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading story...</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
        <Pressable style={styles.bigButton} onPress={() => router.back()}>
          <Text style={styles.bigButtonText}>⬅ Go Back</Text>
        </Pressable>
      </View>
    );
  if (!book) return null;

  return (
    <ScreenWrapper background={backgroundImage}>
      <AppBackground>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
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
          <Pressable
            disabled={pageIndex === 0}
            onPress={() => goToPage(pageIndex - 1)}
            style={[styles.bigButton, pageIndex === 0 && styles.disabledButton]}
          >
            <Ionicons name="chevron-back" size={36} color="#333" />
          </Pressable>
          <Text style={styles.pageNumber}>
            {pageIndex + 1} / {book.pages.length}
          </Text>
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

      {/* New Words Overlay — outside AppBackground so it covers everything */}
      <NewWordsOverlay
        visible={showWordsOverlay}
        words={
          cachedChallengeWords.length > 0
            ? cachedChallengeWords
            : (storySession?.challengeWords ?? [])
        }
        onDone={handleOverlayDone}
      />
    </ScreenWrapper>
  );
}

const StorySwipePage = ({ page, onWordTap }) => (
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

const styles = StyleSheet.create({
  page: { flex: 1 },
  imageSection: { flex: 4, alignItems: "center" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  textSection: {
    flex: 2.5,
    paddingHorizontal: pad.sm,
    paddingBottom: pad.xl,
    height: "100%",
    backgroundColor: "#dfd3bd",
  },
  textScrollContent: { paddingBottom: 40 },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: pad.md,
  },
  bigButton: {
    backgroundColor: "#FFD93D",
    paddingVertical: pad.sm,
    paddingHorizontal: pad.lg,
    borderRadius: radius.pill,
    minWidth: 110,
    alignItems: "center",
    elevation: 4,
    height: size.btnHeightLg,
  },
  bigButtonText: {
    fontSize: font.xl,
    fontFamily: FONTS.bold,
    color: "#333",
    paddingVertical: pad.xs,
  },
  disabledButton: { opacity: 0.4 },
  pageNumber: { fontSize: font.md, fontFamily: FONTS.bold },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.sm,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: pad.s,
  },
  backButton: {
    width: size.hitMd,
    height: size.hitMd,
    borderRadius: size.hitMd / 2,
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
    fontSize: font.md,
    fontFamily: FONTS.bold,
    color: "#00BCD4",
    letterSpacing: 0.3,
    marginHorizontal: pad.s,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSpacer: { width: size.hitMd, flexShrink: 0 },
});
