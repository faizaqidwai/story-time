// app/book/[id]/read.jsx  — BookReader

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Platform,
  Animated,
  PanResponder,
  unstable_batchedUpdates,
  TouchableOpacity,
} from "react-native";
import { ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import InteractiveText from "../components/InteractiveText";
import NewWordsOverlay from "../components/NewWordsOverlay";
import ScreenWrapper from "../../../shared/ScreenWrapper";
import { useUser } from "../../../_contexts/UserContext";
import {
  useStoryActivity,
  ACTIVITY,
  ACTIVITY_ROUTES,
} from "../../../_contexts/StoryActivityContext";
import { attachActivityDataToStories } from "../../../data/storyActivityData";
import backgroundImage from "../../../../assets/img/something-wrong.png";
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";

const { width } = Dimensions.get("window");
const READING_COINS = 36;
const SWIPE_THRESHOLD = width * 0.28;
const VELOCITY_THRESHOLD = 0.4;
const HALF_W = width / 2;

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE — permanent base layer + temporary animated overlay
//
// Layer 1 (BASE) — always mounted, never unmounts.
//   Shows `basePage`, updated to destination BEFORE animation starts.
//
// Layer 2 (OVERLAY TOP) — only mounted during a turn.
//   Shows departing page rotating away.
//   When animation ends, unmounts — Layer 1 already shows correct page.
//
// WHY NO FLASH:
//   Layer 1 is updated to destination before animation starts.
//   Overlay covers Layer 1 at progress=0, rotates away revealing Layer 1.
//   When overlay unmounts, Layer 1 already shows correct page — zero flash.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TAP GUIDE TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────
function TapGuideTooltip({ visible }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.tapTooltip, { opacity: fadeAnim }]} pointerEvents="none">
      <Text style={styles.tapTooltipText}>👆 Tap any word to hear it!</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING BUTTONS — bookmark + tap guide
// Positioned absolutely on the left side over the image area
// ─────────────────────────────────────────────────────────────────────────────
function FloatingButtons({ isBookmarked, onBookmark, onTapGuide }) {
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const handleBookmarkPress = () => {
    // Quick pop animation on tap
    Animated.sequence([
      Animated.timing(bookmarkScale, { toValue: 0.78, duration: 100, useNativeDriver: true }),
      Animated.spring(bookmarkScale,  { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    onBookmark();
  };

  return (
    <View style={styles.floatingBtns} pointerEvents="box-none">
      {/* Bookmark button */}
      <TouchableOpacity
        onPress={handleBookmarkPress}
        activeOpacity={0.85}
        style={[
          styles.floatingBtn,
          isBookmarked && styles.floatingBtnActive,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
          <ExpoImage
            source={require("../../../../assets/img/bookmark-icon.png")}
            style={[
              styles.floatingBtnIcon,
              { opacity: isBookmarked ? 1 : 0.65 },
            ]}
            contentFit="contain"
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Tap guide button */}
      <TouchableOpacity
        onPress={onTapGuide}
        activeOpacity={0.85}
        style={styles.floatingBtn}
      >
        <ExpoImage
          source={require("../../../../assets/img/tap-icon.png")}
          style={[styles.floatingBtnIcon, { opacity: 0.75 }]}
          contentFit="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BookReader() {
  const { id, replay } = useLocalSearchParams();
  const isReplay = replay === "1";
  const router = useRouter();
  const { currentProfile } = useUser();
  const { storySession, completeActivity, currentStory, bookmarkPage } =
    useStoryActivity();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wordTaps, setWordTaps] = useState([]);
  const [showWordsOverlay, setShowWordsOverlay] = useState(false);
  const [cachedChallengeWords, setCachedChallengeWords] = useState([]);

  // displayIndex — drives button labels/state only, updated after turn ends
  const [displayIndex, setDisplayIndex] = useState(0);

  // ── Base layer state ──────────────────────────────────────────────────────
  const [basePage, setBasePage] = useState(null);

  // ── Overlay state ─────────────────────────────────────────────────────────
  const [overlayPage, setOverlayPage] = useState(null);
  const [isTurning, setIsTurning] = useState(false);
  const [turnDir, setTurnDir] = useState(1);

  // ── NEW: bookmark + tap guide state ──────────────────────────────────────
  // isBookmarked: true when the current displayIndex equals session.bookmarkedPage
  const [showTapGuide, setShowTapGuide] = useState(false);
  const tapGuideTimerRef = useRef(null);
  // We derive isBookmarked from storySession so it stays in sync with context
  const bookmarkedPage   = storySession?.bookmarkedPage ?? null;
  const isBookmarked     = bookmarkedPage === displayIndex;
  // ─────────────────────────────────────────────────────────────────────────

  // ── Refs ──────────────────────────────────────────────────────────────────
  const isTurningRef = useRef(false);
  const directionRef = useRef(1);
  const isAnimatingRef = useRef(false);
  const pageIndexRef = useRef(0);
  const bookRef = useRef(null);
  const gestureStartedRef = useRef(false);
  const animRef = useRef(new Animated.Value(0));
  const pendingFinishRef = useRef(null);
  // Track whether we already jumped to bookmark (do it once on mount only)
  const bookmarkJumpedRef = useRef(false);
  // Bookmark jump timer — declared here so unmount cleanup can reach it
  const bookmarkTimerRef  = useRef(null);
  const bookmarkedPageRef = useRef(null); // updated each render below

  useEffect(() => {
    console.log("[BookReader LIFECYCLE] BookReader MOUNTED");
    return () => {
      console.log("[BookReader LIFECYCLE] BookReader UNMOUNTED");
      // Clean up tap guide timer on unmount
      if (tapGuideTimerRef.current) clearTimeout(tapGuideTimerRef.current);
      // Clean up bookmark jump timer on unmount
      if (bookmarkTimerRef.current)  clearTimeout(bookmarkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentStory) {
      const enriched = currentStory.activityData
        ? currentStory
        : attachActivityDataToStories([currentStory])[0];
      setBook(enriched);
      bookRef.current = enriched;
      setBasePage(enriched.pages[0]);
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

  // ── NEW: Capture bookmarkedPage at mount time into a ref ────────────────
  // We read it once from storySession (already loaded from AsyncStorage by
  // startStorySession in home.jsx before navigation). We never re-read it
  // reactively — the goal is just to open the reader at the saved page.
  // bookmarkedPageRef holds the TARGET page we want to jump to.
  // It is null if there is no bookmark or if we're in replay mode.
  if (!bookmarkJumpedRef.current) {
    // isReplay intentionally NOT used here — bookmark navigation applies
    // regardless of whether the user is re-reading or reading for the first time.
    // isReplay only controls whether completeActivity is called, not navigation.
    bookmarkedPageRef.current = storySession?.bookmarkedPage ?? null;
    console.log('[Bookmark] captured at render:', {
      bookmarkedPage: storySession?.bookmarkedPage,
      isReplay,
      refValue: bookmarkedPageRef.current,
      sessionExists: !!storySession,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const handleWordTap = (word) =>
    setWordTaps((prev) => [...prev, word.toLowerCase()]);

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
      pathname: `features/stories/activities/${nextRoute}`,
      params: { storyId: book.id, title: book.title },
    });
  };

  const handleFinishStory = async () => {
    const report = generateReadingReport();
    const tappedWords = Object.keys(report.wordFrequency);
    const challengeWords =
      cachedChallengeWords.length > 0
        ? cachedChallengeWords
        : (storySession?.challengeWords ?? []);
    if (challengeWords.length > 0) {
      pendingFinishRef.current = () => {
        if (isReplay || storySession?.isReadOnly) router.back();
        else navigateToNextActivity();
      };
      if (!isReplay && !storySession?.isReadOnly) {
        await completeActivity(
          ACTIVITY.STORY_READING,
          { report },
          { coins: READING_COINS, words: tappedWords },
        );
      }
      setShowWordsOverlay(true);
    } else {
      if (isReplay || storySession?.isReadOnly) router.back();
      else {
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

  // ── beginTurn ─────────────────────────────────────────────────────────────
  // UNTOUCHED
  const beginTurn = useCallback((fromIdx, toIdx, dir) => {
    const b = bookRef.current;
    if (!b) return null;
    const anim = new Animated.Value(0);
    animRef.current = anim;
    directionRef.current = dir;
    isTurningRef.current = true;
    setBasePage(b.pages[toIdx]);
    setOverlayPage(b.pages[fromIdx]);
    setTurnDir(dir);
    setIsTurning(true);
    return anim;
  }, []);

  // ── endTurn ───────────────────────────────────────────────────────────────
  // UNTOUCHED
  const endTurn = useCallback((nextIdx) => {
    pageIndexRef.current = nextIdx;
    isTurningRef.current = false;
    unstable_batchedUpdates(() => {
      setIsTurning(false);
      setOverlayPage(null);
      setDisplayIndex(nextIdx);
    });
  }, []);

  // ── cancelTurn ────────────────────────────────────────────────────────────
  // UNTOUCHED
  const cancelTurn = useCallback((anim) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        const b = bookRef.current;
        if (b) setBasePage(b.pages[pageIndexRef.current]);
        isTurningRef.current = false;
        unstable_batchedUpdates(() => {
          setIsTurning(false);
          setOverlayPage(null);
        });
      }
    });
  }, []);

  // ── commitTurn — UNTOUCHED ────────────────────────────────────────────────
  const commitTurn = useCallback(
    (nextIdx, duration = 400) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      const dir = nextIdx > pageIndexRef.current ? 1 : -1;
      const anim = beginTurn(pageIndexRef.current, nextIdx, dir);
      if (!anim) {
        isAnimatingRef.current = false;
        return;
      }
      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) endTurn(nextIdx);
        isAnimatingRef.current = false;
      });
    },
    [beginTurn, endTurn],
  );

  const goToPage = useCallback(
    (nextIdx) => {
      const b = bookRef.current;
      if (!b || nextIdx < 0 || nextIdx >= b.pages.length) return;
      commitTurn(nextIdx, 420);
    },
    [commitTurn],
  );
  // Keep a stable ref to goToPage so the bookmark setTimeout closure
  // always calls the latest version without stale closure issues
  const goToPageRef = useRef(goToPage);
  goToPageRef.current = goToPage;

  // ── NEW: Navigate to bookmarked page — fires once after book + goToPage ready
  // This effect runs after book is loaded AND after all callbacks are defined.
  // bookmarkedPageRef.current was captured at render time above (mount only).
  useEffect(() => {
    console.log('[Bookmark] jump effect fired:', {
      alreadyJumped: bookmarkJumpedRef.current,
      book: !!book,
      bp: bookmarkedPageRef.current,
      pages: book?.pages?.length,
    });
    if (bookmarkJumpedRef.current) return;
    if (!book) return;

    const bp = bookmarkedPageRef.current;
    if (bp === null || bp === undefined || bp <= 0 || bp >= book.pages.length) {
      console.log('[Bookmark] skipped - invalid bp:', bp, 'pages:', book?.pages?.length);
      return;
    }

    bookmarkJumpedRef.current = true;
    console.log('[Bookmark] navigating to page:', bp);
    bookmarkTimerRef.current = setTimeout(() => {
      bookmarkTimerRef.current = null;
      console.log('[Bookmark] goToPage called with:', bp, 'goToPageRef:', !!goToPageRef.current);
      goToPageRef.current?.(bp);
    }, 350);
  }, [book]); // only book matters — goToPageRef is always current via the line above

  // ── PanResponder — UNTOUCHED ──────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 &&
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 &&
        !isAnimatingRef.current,
      onPanResponderGrant: () => {
        gestureStartedRef.current = false;
      },
      onPanResponderMove: (_, gs) => {
        const b = bookRef.current;
        if (!b) return;
        const total = b.pages.length;
        const cur = pageIndexRef.current;
        const dx = gs.dx;
        if (dx < 0 && cur < total - 1) {
          if (!gestureStartedRef.current) {
            gestureStartedRef.current = true;
            const anim = beginTurn(cur, cur + 1, 1);
            if (anim) animRef.current = anim;
          }
          animRef.current.setValue(Math.min(-dx / width, 1));
        } else if (dx > 0 && cur > 0) {
          if (!gestureStartedRef.current) {
            gestureStartedRef.current = true;
            const anim = beginTurn(cur, cur - 1, -1);
            if (anim) animRef.current = anim;
          }
          animRef.current.setValue(Math.min(dx / width, 1));
        }
      },
      onPanResponderRelease: (_, gs) => {
        gestureStartedRef.current = false;
        if (!isTurningRef.current) return;
        const b = bookRef.current;
        if (!b) return;
        const total = b.pages.length;
        const cur = pageIndexRef.current;
        const committed =
          Math.abs(gs.dx) > SWIPE_THRESHOLD ||
          Math.abs(gs.vx) > VELOCITY_THRESHOLD;
        const nextIdx = cur + directionRef.current;
        if (committed && nextIdx >= 0 && nextIdx < total) {
          if (isAnimatingRef.current) return;
          isAnimatingRef.current = true;
          Animated.timing(animRef.current, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) endTurn(nextIdx);
            isAnimatingRef.current = false;
          });
        } else {
          cancelTurn(animRef.current);
        }
      },
      onPanResponderTerminate: () => {
        gestureStartedRef.current = false;
        if (isTurningRef.current) cancelTurn(animRef.current);
      },
    }),
  ).current;

  // ── NEW: Bookmark handler ─────────────────────────────────────────────────
  const handleBookmark = useCallback(() => {
    bookmarkPage(displayIndex);
  }, [bookmarkPage, displayIndex]);

  // ── NEW: Tap guide handler ────────────────────────────────────────────────
  const handleTapGuide = useCallback(() => {
    // Clear any existing timer
    if (tapGuideTimerRef.current) clearTimeout(tapGuideTimerRef.current);
    setShowTapGuide(true);
    tapGuideTimerRef.current = setTimeout(() => {
      setShowTapGuide(false);
    }, 3500);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

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

  // ── Interpolations — UNTOUCHED ─────────────────────────────────────────
  const anim = animRef.current;

  const overlayRotateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: turnDir === 1 ? ["0deg", "-80deg"] : ["0deg", "0deg"],
    extrapolate: "clamp",
  });
  const overlayScale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: turnDir === 1 ? [1, 0.97, 0.91] : [1, 1, 1],
    extrapolate: "clamp",
  });
  const overlayShadow = anim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: turnDir === 1 ? [0, 0.25, 0.68] : [0, 0, 0],
    extrapolate: "clamp",
  });
  const overlayOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: turnDir === 1 ? [1, 1, 1] : [1, 0.5, 0],
    extrapolate: "clamp",
  });
  const baseRotateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: turnDir === -1 ? ["-80deg", "0deg"] : ["0deg", "0deg"],
    extrapolate: "clamp",
  });
  const baseShadow = anim.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: turnDir === -1 ? [0.68, 0.25, 0] : [0, 0, 0],
    extrapolate: "clamp",
  });

  return (
    <ScreenWrapper background={backgroundImage}>
      {/* ── Header — UNTOUCHED ── */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#E0F7FA" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Page stage with pan handlers — UNTOUCHED except NEW overlays ── */}
      <View style={styles.pageStage} {...panResponder.panHandlers}>
        {/* ── LAYER 1: BASE — UNTOUCHED ── */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { perspective: 1000 },
                { translateX: -HALF_W },
                { rotateY: isTurning ? baseRotateY : "0deg" },
                { translateX: HALF_W },
              ],
            },
          ]}
        >
          {basePage && (
            <StorySwipePage page={basePage} onWordTap={handleWordTap} />
          )}
          {isTurning && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "#000", opacity: baseShadow },
              ]}
            />
          )}
        </Animated.View>

        {/* ── LAYER 2: OVERLAY — UNTOUCHED ── */}
        {isTurning && overlayPage && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: overlayOpacity,
                transform: [
                  { perspective: 1000 },
                  { translateX: -HALF_W },
                  { rotateY: overlayRotateY },
                  { translateX: HALF_W },
                  { scale: overlayScale },
                ],
              },
            ]}
          >
            <StorySwipePage page={overlayPage} onWordTap={handleWordTap} />
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "#000", opacity: overlayShadow },
              ]}
            />
          </Animated.View>
        )}

        {/* ── NEW: Floating buttons (bookmark + tap guide) ── */}
        {/* Rendered outside the animated layers so they don't rotate with pages */}
        <FloatingButtons
          isBookmarked={isBookmarked}
          onBookmark={handleBookmark}
          onTapGuide={handleTapGuide}
        />

        {/* ── NEW: Tap guide tooltip ── */}
        <TapGuideTooltip visible={showTapGuide} />
      </View>

      {/* ── Navigation buttons — UNTOUCHED ── */}
      <View style={styles.buttons}>
        <Pressable
          disabled={displayIndex === 0}
          onPress={() => goToPage(displayIndex - 1)}
          style={[
            styles.bigButton,
            displayIndex === 0 && styles.disabledButton,
          ]}
        >
          <Ionicons name="chevron-back" size={36} color="#333" />
        </Pressable>
        <Text style={styles.pageNumber}>{displayIndex + 1}</Text>
        {displayIndex === book.pages.length - 1 ? (
          <Pressable style={styles.bigButton} onPress={handleFinishStory}>
            <Text style={styles.bigButtonText}>Finish ⭐</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => goToPage(displayIndex + 1)}
            style={styles.bigButton}
          >
            <Ionicons name="chevron-forward" size={36} color="#333" />
          </Pressable>
        )}
      </View>

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

// ─────────────────────────────────────────────────────────────────────────────
// STORY SWIPE PAGE — UNTOUCHED
// ─────────────────────────────────────────────────────────────────────────────
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
  page: { flex: 1, backgroundColor: "#111830" },
  imageSection: { flex: 4, alignItems: "center" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  textSection: {
    flex: 2.5,
    paddingHorizontal: pad.sm,
    paddingBottom: pad.xl,
    height: "100%",
  },
  textScrollContent: { paddingBottom: 40 },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: pad.md,
    backgroundColor: "#111830",
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
  pageNumber: { fontSize: font.md, fontFamily: FONTS.bold, color: "#FFD93D" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.sm,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: pad.s,
    backgroundColor: "#111830",
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
    fontSize: font.xxl,
    fontFamily: FONTS.bold,
    color: "#00BCD4",
    letterSpacing: 0.3,
    marginHorizontal: pad.s,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSpacer: { width: size.hitMd, flexShrink: 0 },
  pageStage: {
    flex: 1,
    overflow: "hidden",
  },

  // ── NEW: Floating buttons ────────────────────────────────────────────────
  floatingBtns: {
    position:   "absolute",
    top:        16,
    left:       12,
    gap:        10,
    zIndex:     50,
    alignItems: "center",
  },
  floatingBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: "rgba(8, 8, 26, 0.72)",
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.18)",
    alignItems:      "center",
    justifyContent:  "center",
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.55,
    shadowRadius:    6,
    elevation:       8,
  },
  // Active state — bookmarked
  floatingBtnActive: {
    backgroundColor: "rgba(0, 188, 212, 0.88)",
    borderColor:     "#00BCD4",
    shadowColor:     "#00BCD4",
    shadowOpacity:   0.7,
    shadowRadius:    8,
  },
  floatingBtnIcon: {
    width:  24,
    height: 24,
  },

  // ── NEW: Tap guide tooltip ───────────────────────────────────────────────
  tapTooltip: {
    position:          "absolute",
    top:               70,   // aligns with tap guide button (second button)
    left:              66,   // sits right of the floating buttons
    backgroundColor:   "rgba(8,8,26,0.90)",
    borderRadius:      radius.lg,
    borderWidth:       1.5,
    borderColor:       "rgba(0,188,212,0.55)",
    paddingHorizontal: pad.sm,
    paddingVertical:   pad.s,
    zIndex:            50,
    shadowColor:       "#00BCD4",
    shadowOffset:      { width: 0, height: 0 },
    shadowOpacity:     0.4,
    shadowRadius:      8,
    elevation:         10,
    maxWidth:          220,
  },
  tapTooltipText: {
    fontFamily:  FONTS.bold,
    fontSize:    font.sm,
    color:       "#E0F7FA",
    letterSpacing: 0.2,
  },
});
