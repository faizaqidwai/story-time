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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import NewWordsOverlay from "../components/NewWordsOverlay";
import InteractiveTextAdvance from "../components/InteractiveTextAdvance";
import { useUser } from "../../../_contexts/UserContext";
import {
  useStoryActivity,
  ACTIVITY,
  ACTIVITY_ROUTES,
} from "../../../_contexts/StoryActivityContext";
import { attachActivityDataToStories } from "../../../data/storyActivityData";
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";

const { width } = Dimensions.get("window");
const READING_COINS = 50;
const GOLD = "#C8A96E";           // book-specific parchment gold — KEPT (not a UI CTA)
const IMAGE_ASPECT_RATIO = 1;

export default function AdvancedBookReader() {
  const { id, replay } = useLocalSearchParams();
  const isReplay = replay === "1";
  const router = useRouter();
  const { currentProfile } = useUser();
  const { storySession, completeActivity, currentStory } = useStoryActivity();
  const insets = useSafeAreaInsets();

  const [book, setBook] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wordTaps, setWordTaps] = useState([]);
  const [listHeight, setListHeight] = useState(0);
  const [showWordsOverlay, setShowWordsOverlay] = useState(false);
  const [cachedChallengeWords, setCachedChallengeWords] = useState([]);
  const pendingFinishRef = useRef(null);
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

  useEffect(() => {
    if (storySession?.challengeWords?.length > 0) {
      setCachedChallengeWords(storySession.challengeWords);
    }
  }, [storySession]);

  const goToPage = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setPageIndex(index);
  };

  const handleWordTap = (word) => setWordTaps((prev) => [...prev, word.toLowerCase()]);

  const generateReadingReport = () => {
    const allWords = book.pages.flatMap((p) => p.text.split(" "));
    const frequency = wordTaps.reduce((acc, word) => { acc[word] = (acc[word] || 0) + 1; return acc; }, {});
    const mostTapped = Object.keys(frequency).length > 0
      ? Object.entries(frequency).sort((a, b) => b[1] - a[1])[0] : null;
    return { storyId: book.id, storyTitle: book.title, totalWords: allWords.length,
      totalTaps: wordTaps.length, uniqueWordsTapped: Object.keys(frequency).length,
      mostTappedWord: mostTapped, wordFrequency: frequency };
  };

  const navigateToNextActivity = () => {
    const nextRoute = ACTIVITY_ROUTES[ACTIVITY.WORD_STORY_CHALLENGE];
    router.replace({ pathname: `/features/stories/activities/${nextRoute}`,
      params: { storyId: book.id, title: book.title } });
  };

  const handleFinishStory = async () => {
    const report = generateReadingReport();
    const tappedWords = Object.keys(report.wordFrequency);
    const challengeWords = cachedChallengeWords.length > 0
      ? cachedChallengeWords : (storySession?.challengeWords ?? []);
    if (challengeWords.length > 0) {
      pendingFinishRef.current = () => { if (isReplay) router.back(); else navigateToNextActivity(); };
      if (!isReplay) {
        await completeActivity(ACTIVITY.STORY_READING, { report }, { coins: READING_COINS, words: tappedWords });
      }
      setShowWordsOverlay(true);
    } else {
      if (isReplay) router.back();
      else {
        await completeActivity(ACTIVITY.STORY_READING, { report }, { coins: READING_COINS, words: tappedWords });
        navigateToNextActivity();
      }
    }
  };

  const handleOverlayDone = () => {
    setShowWordsOverlay(false);
    if (pendingFinishRef.current) { pendingFinishRef.current(); pendingFinishRef.current = null; }
  };

  const imageHeight = listHeight > 0
    ? Math.min(Math.round(width / IMAGE_ASPECT_RATIO), Math.round(listHeight * 0.55)) : 0;
  const headerPaddingTop = Math.max(insets.top, 8);
  const navPaddingBottom = Math.max(insets.bottom, pad.s);

  if (loading) return (
    <View style={[styles.root, { paddingTop: headerPaddingTop }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Opening story…</Text>
      </View>
    </View>
  );

  if (error) return (
    <View style={[styles.root, { paddingTop: headerPaddingTop }]}>
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.navBtn} onPress={() => router.back()}>
          <Text style={styles.navBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!book) return null;
  const isLast = pageIndex === book.pages.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#F5E6C8" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((pageIndex + 1) / book.pages.length) * 100}%` }]} />
          </View>
        </View>
        <View style={styles.pageCounter}>
          <Text style={styles.pageCounterText}>
            {pageIndex + 1}
            <Text style={styles.pageCounterTotal}>/{book.pages.length}</Text>
          </Text>
        </View>
      </View>

      <FlatList ref={flatListRef} data={book.pages} horizontal pagingEnabled
        showsHorizontalScrollIndicator={false} keyExtractor={(_, index) => index.toString()}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setPageIndex(index);
        }}
        scrollEventThrottle={16} style={styles.flatList}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        renderItem={({ item }) => (
          <AdvancedPage page={item} hasImage={!!item.image} onWordTap={handleWordTap}
            listHeight={listHeight} imageHeight={imageHeight} />
        )}
      />

      {isLast && (
        <View style={[styles.navBar, { paddingBottom: navPaddingBottom }]}>
          <Pressable style={styles.finishBtn} onPress={handleFinishStory}>
            <Text style={styles.finishBtnText}>Finish</Text>
            <Ionicons name="star" size={16} color="#1a1208" />
          </Pressable>
        </View>
      )}

      <NewWordsOverlay visible={showWordsOverlay}
        words={cachedChallengeWords.length > 0 ? cachedChallengeWords : (storySession?.challengeWords ?? [])}
        onDone={handleOverlayDone} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE LAYOUTS — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────
const AdvancedPage = ({ page, hasImage, onWordTap, listHeight, imageHeight }) => {
  const isContinued = page.text.toLowerCase().includes("to be continued") && !hasImage;
  const pageRootStyle = [styles.pageRoot, listHeight > 0 ? { height: listHeight } : { flex: 1 }];

  if (isContinued) return (
    <View style={[pageRootStyle, styles.continuedPage]}>
      <View style={styles.continuedDivider} />
      <Text style={styles.continuedText}>To be continued…</Text>
      <View style={styles.continuedDivider} />
      <Text style={styles.continuedSubtext}>The adventure awaits in the next chapter</Text>
    </View>
  );

  if (hasImage) return (
    <View style={pageRootStyle}>
      <View style={[styles.imageSection, { height: imageHeight }]}>
        <ExpoImage source={{ uri: page.image }} style={styles.topImage} contentFit="fill" cachePolicy="disk" />
      </View>
      <ScrollView style={styles.textSection} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.textSectionContent} nestedScrollEnabled>
        <InteractiveTextAdvance text={page.text} onWordTap={onWordTap} />
      </ScrollView>
    </View>
  );

  return (
    <View style={[pageRootStyle, styles.textOnlyPage]}>
      <ScrollView style={styles.textOnlyScroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.textOnlyContent} nestedScrollEnabled>
        <InteractiveTextAdvance text={page.text} onWordTap={onWordTap} />
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — all raw hex, safe for Hermes module-level evaluation
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0A1628", flexDirection: "column" }, // ✅ was "#08081a"
  glowTL: {
    position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: 160,
    backgroundColor: "rgba(0,196,204,0.07)",                           // ✅ was rgba(0,188,212,0.07)
  },
  glowBR: {
    position: "absolute", bottom: -60, right: -60, width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(123,47,190,0.07)",                          // ✅ was rgba(150,82,217,0.07)
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: pad.sm, color: GOLD, fontSize: font.md, fontStyle: "italic" },
  errorText: {
    color: "#E8445A",                                                  // ✅ was "#e07070"
    fontSize: font.lg, marginBottom: pad.md, textAlign: "center", paddingHorizontal: pad.xl,
  },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: pad.sm,
    paddingBottom: pad.sm, gap: pad.sm,
    backgroundColor: "#0A1628",                                        // ✅ was "#08081a"
    borderBottomWidth: 1, borderBottomColor: "rgba(200,169,110,0.15)",
  },
  backButton: {
    width: size.hitSm, height: size.hitSm, borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(20,14,8,0.7)", borderWidth: 1,
    borderColor: "rgba(200,169,110,0.3)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  headerCenter:       { flex: 1, gap: pad.xs },
  headerTitle:        { fontSize: font.sm, fontFamily: FONTS.bold, color: GOLD, letterSpacing: 0.8, textTransform: "uppercase" },
  progressTrack:      { height: 2, backgroundColor: "rgba(200,169,110,0.15)", borderRadius: 2, overflow: "hidden" },
  progressFill:       { height: "100%", backgroundColor: GOLD, borderRadius: 2 },
  pageCounter:        { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pageCounterText:    { fontSize: font.lg, fontFamily: FONTS.bold, color: GOLD },
  pageCounterTotal:   { fontSize: font.sm, fontFamily: FONTS.light, color: "rgba(200,169,110,0.5)" },
  flatList:           { flex: 1 },
  pageRoot:           { width, overflow: "hidden", backgroundColor: "#0A1628" },  // ✅ was "#08081a"
  imageSection:       { width: "100%", overflow: "hidden" },
  topImage:           { width: "100%", height: "100%" },
  textSection:        { flex: 1, minHeight: 0, backgroundColor: "#dfd3bd" },      // KEPT — parchment aesthetic
  textSectionContent: { paddingBottom: pad.xxxl },
  textOnlyPage:       { backgroundColor: "#0A1628" },                             // ✅ was "#0f0e1a"
  textOnlyScroll:     { flex: 1 },
  textOnlyContent:    { paddingVertical: pad.lg, paddingBottom: pad.xxxl },
  continuedPage:      { justifyContent: "center", alignItems: "center", gap: pad.md, paddingHorizontal: pad.xxl },
  continuedDivider:   { width: 80, height: 1, backgroundColor: "rgba(200,169,110,0.4)" },
  continuedText:      { fontSize: font.h3, fontFamily: FONTS.bold, color: GOLD, fontStyle: "italic", textAlign: "center", letterSpacing: 1 },
  continuedSubtext:   { fontSize: font.sm, color: "rgba(200,169,110,0.5)", textAlign: "center", letterSpacing: 0.5 },
  navBar: {
    alignItems: "center", justifyContent: "center", paddingHorizontal: pad.md,
    paddingTop: pad.sm,
    backgroundColor: "#0A1628",                                        // ✅ was "#08081a"
    borderTopWidth: 1, borderTopColor: "rgba(200,169,110,0.15)",
  },
  navBtn: {
    flexDirection: "row", alignItems: "center", gap: pad.xs,
    backgroundColor: "rgba(200,169,110,0.12)", borderWidth: 1,
    borderColor: "rgba(200,169,110,0.25)", paddingVertical: pad.sm,
    paddingHorizontal: pad.md, borderRadius: radius.pill, minWidth: 90, justifyContent: "center",
  },
  navBtnText:   { fontSize: font.md, fontFamily: FONTS.bold, color: "#F5E6C8", letterSpacing: 0.4 }, // KEPT — warm white
  finishBtn: {
    flexDirection: "row", alignItems: "center", gap: pad.s, backgroundColor: GOLD,
    paddingVertical: pad.sm, paddingHorizontal: pad.lg, borderRadius: radius.pill,
    minWidth: 90, justifyContent: "center", elevation: 4,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  finishBtnText: { fontSize: font.md, fontFamily: FONTS.bold, color: "#1a1208", letterSpacing: 0.4 }, // KEPT — dark on gold
  dotRow:   { flexDirection: "row", alignItems: "center", gap: pad.s },
  dot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(200,169,110,0.2)" },
  dotActive:{ width: 18, height: 5, borderRadius: 3, backgroundColor: GOLD },
});
