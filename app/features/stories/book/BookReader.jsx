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
// The flash in previous versions was caused by React conditionally
// mounting/unmounting the page views during state transitions. Any time
// isTurning toggled, React destroyed and recreated views, causing a
// 1-frame gap.
//
// This version uses a completely different model:
//
// Layer 1 (BASE) — always mounted, never unmounts.
//   Shows `basePage` which is updated via ref+forceUpdate.
//   This is what the user sees at rest AND what shows through as
//   the destination during a forward turn.
//
// Layer 2 (OVERLAY TOP) — only mounted during a turn.
//   Shows the departing page rotating away.
//   Uses a fresh Animated.Value per turn (never setValue to reset).
//   When animation ends, this layer unmounts — but by then Layer 1
//   already shows the correct destination, so the unmount is invisible.
//
// WHY NO FLASH:
//   - Layer 1 is updated to destination page BEFORE the animation starts.
//     So throughout the entire animation Layer 1 already shows the right page.
//   - The overlay (Layer 2) covers Layer 1 completely at anim=0 (progress=0).
//   - As Layer 2 rotates away, Layer 1 is revealed — already showing
//     the correct destination.
//   - When Layer 2 unmounts at turn end, Layer 1 is already correct.
//     Nothing changes visually. Zero flash.
// ─────────────────────────────────────────────────────────────────────────────

export default function BookReader() {
  const { id, replay } = useLocalSearchParams();
  const isReplay = replay === "1";
  const router = useRouter();
  const { currentProfile } = useUser();
  const { storySession, completeActivity, currentStory } = useStoryActivity();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wordTaps, setWordTaps] = useState([]);
  const [showWordsOverlay, setShowWordsOverlay] = useState(false);
  const [cachedChallengeWords, setCachedChallengeWords] = useState([]);

  // displayIndex — drives button labels/state only, updated after turn ends
  const [displayIndex, setDisplayIndex] = useState(0);

  // ── Base layer state ──────────────────────────────────────────────────────
  // basePage: what Layer 1 (permanent base) shows.
  // Updated to destination BEFORE animation starts.
  const [basePage, setBasePage] = useState(null);

  // ── Overlay state ─────────────────────────────────────────────────────────
  // overlayPage: what the animated overlay (Layer 2) shows — the departing page.
  // isTurning: whether overlay is mounted.
  // turnDir: drives interpolation direction.
  const [overlayPage, setOverlayPage] = useState(null);
  const [isTurning, setIsTurning] = useState(false);
  const [turnDir, setTurnDir] = useState(1);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const isTurningRef = useRef(false);
  const directionRef = useRef(1);
  const isAnimatingRef = useRef(false);
  const pageIndexRef = useRef(0);
  const bookRef = useRef(null);
  const gestureStartedRef = useRef(false);
  const animRef = useRef(new Animated.Value(0));
  const pendingFinishRef = useRef(null);

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
  // 1. Set base layer to DESTINATION page immediately (before animation).
  // 2. Set overlay to DEPARTING page (current page).
  // 3. Mount overlay (isTurning=true).
  // 4. Return fresh Animated.Value.
  const beginTurn = useCallback((fromIdx, toIdx, dir) => {
    const b = bookRef.current;
    if (!b) return null;
    const anim = new Animated.Value(0);
    animRef.current = anim;
    directionRef.current = dir;
    isTurningRef.current = true;
    // Update base layer to destination NOW — it sits underneath the overlay.
    // This means at all times during the animation, Layer 1 already shows
    // the correct final state. No update needed at turn end.
    setBasePage(b.pages[toIdx]);
    // Overlay shows the departing page on top, animates away.
    setOverlayPage(b.pages[fromIdx]);
    setTurnDir(dir);
    setIsTurning(true);
    return anim;
  }, []);

  // ── endTurn ───────────────────────────────────────────────────────────────
  // Animation reached 1. Base layer already shows correct page.
  // Just unmount the overlay and update page tracking.
  const endTurn = useCallback((nextIdx) => {
    pageIndexRef.current = nextIdx;
    isTurningRef.current = false;
    // Single batch — unmount overlay and update display index together.
    // Base layer (Layer 1) already shows nextIdx page, no update needed.
    unstable_batchedUpdates(() => {
      setIsTurning(false);
      setOverlayPage(null);
      setDisplayIndex(nextIdx);
    });
  }, []);

  // ── cancelTurn ────────────────────────────────────────────────────────────
  const cancelTurn = useCallback((anim) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        // Restore base layer to current page (we set it to destination in beginTurn)
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

  // ── commitTurn: button-driven ─────────────────────────────────────────────
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

  // ── PanResponder ──────────────────────────────────────────────────────────
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

  // ── Interpolations ─────────────────────────────────────────────────────
  const anim = animRef.current;

  // Overlay (departing page) rotates away from left edge
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
  // For backward: overlay fades out as base swings in from spine
  const overlayOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: turnDir === 1 ? [1, 1, 1] : [1, 0.5, 0],
    extrapolate: "clamp",
  });

  // Base layer: for backward turn, it swings in from spine (-80→0)
  // For forward turn: base is static (overlay rotates away revealing it)
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
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#E0F7FA" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.pageStage} {...panResponder.panHandlers}>
        {/* ── LAYER 1: BASE — always mounted, never unmounts ── */}
        {/* Shows destination page. Updated before animation starts.  */}
        {/* During forward turn: sits still, revealed as overlay rotates away. */}
        {/* During backward turn: swings in from spine (-80→0deg).    */}
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

        {/* ── LAYER 2: OVERLAY — only mounted during turn ── */}
        {/* Shows departing page. Rotates away revealing Layer 1. */}
        {/* When this unmounts, Layer 1 already shows correct page — invisible transition. */}
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
      </View>

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
// STORY SWIPE PAGE — unchanged from original
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
});
