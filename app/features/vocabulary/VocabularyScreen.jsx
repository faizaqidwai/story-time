// app/features/vocabulary/VocabularyScreen.jsx
//
// Replaces WordBag — accessed by tapping the bag icon on home.
// Shows ALL category cards across current level + all preceding levels.
// Each card shows cumulative word count across all levels up to current.
// Tapping a card → CategoryScreen with mode="all"
// Has search bar that filters categories by name in real time.

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../_contexts/UserContext";
import { useSubscription } from "../../_contexts/SubscriptionContext";
import { vocabularyService } from "../../services/vocabularyService";
import { HomeCategoryCard } from "./components/HomeCategoryCard";
import { FONTS } from "../../theme";
import { font, pad, radius, size } from "../../theme/tokens";
import { Image as ExpoImage } from "expo-image";
import { getCategoryIcon } from "./utils/categoryImages";

const { width: SW } = Dimensions.get("window");
const isTablet = SW >= 768;
const STATUS_BAR_H =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

// ── VocabCategoryCard — same as HomeCategoryCard but wider for grid layout ───
// We reuse HomeCategoryCard horizontally in a wrap grid here.
// Two per row on phone, three per row on tablet.
const GRID_COLS = isTablet ? 3 : 2;
const H_PAD = pad.md;
const GAP = isTablet ? 14 : 10;
const GRID_CARD_W = (SW - H_PAD * 2 - GAP * (GRID_COLS - 1)) / GRID_COLS;

function VocabCategoryCard({ category, onPress }) {
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

  const gs = category.gradientStart || "#37474F";
  const ge = category.gradientEnd || "#263238";
  const ac = category.accentColor || "#90A4AE";
  const CARD_H = isTablet ? 200 : 160;

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleA }], width: GRID_CARD_W }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[gc.card, { height: CARD_H, shadowColor: ac }]}
      >
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: ge }]}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "55%",
            backgroundColor: gs,
            opacity: 0.92,
          }}
        />
        <View style={gc.circle1} />
        <View style={gc.circle2} />
        <View style={gc.iconArea}>
          {getCategoryIcon(category.categoryName) ? (
            <ExpoImage
              source={getCategoryIcon(category.categoryName)}
              style={gc.iconImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={gc.iconEmoji}>{category.iconEmoji || "📚"}</Text>
          )}
        </View>
        <View style={gc.info}>
          <Text style={gc.name} numberOfLines={1}>
            {category.displayName}
          </Text>
          <View
            style={[
              gc.countPill,
              { backgroundColor: `${ac}22`, borderColor: `${ac}55` },
            ]}
          >
            <Text style={[gc.countText, { color: ac }]}>
              {category.wordCount} {category.wordCount === 1 ? "word" : "words"}
            </Text>
          </View>
        </View>
        <View style={[gc.accentBar, { backgroundColor: ac }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const gc = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: "hidden",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  circle1: {
    position: "absolute",
    width: GRID_CARD_W * 0.85,
    height: GRID_CARD_W * 0.85,
    borderRadius: GRID_CARD_W * 0.425,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -GRID_CARD_W * 0.3,
    right: -GRID_CARD_W * 0.2,
  },
  circle2: {
    position: "absolute",
    width: GRID_CARD_W * 0.45,
    height: GRID_CARD_W * 0.45,
    borderRadius: GRID_CARD_W * 0.225,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: GRID_CARD_W * 0.15,
    left: -GRID_CARD_W * 0.1,
  },
  iconArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: pad.sm,
  },
  iconRing: {
    width: isTablet ? 70 : 56,
    height: isTablet ? 70 : 56,
    borderRadius: isTablet ? 35 : 28,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: isTablet ? 30 : 24 },
  info: {
    paddingHorizontal: pad.sm,
    paddingBottom: pad.sm + 4,
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: isTablet ? font.md : font.sm,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: pad.xs + 2,
    paddingVertical: 2,
  },
  countText: { fontFamily: FONTS.bold, fontSize: font.xs, letterSpacing: 0.3 },
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function VocabularyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentProfile } = useUser();
  const { subscription } = useSubscription();

  const [allCategories, setAllCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxLevel, setMaxLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const isSubscriptionActive = subscription?.status === "ACTIVE";

  // Fetch all categories
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await vocabularyService.getAllCategories();
        const cats = data?.categories ?? [];
        setAllCategories(cats);
        setFilteredCategories(cats);
        setMaxLevel(data?.maxLevel ?? currentProfile?.playLevel ?? 1);
      } catch (_) {
        setAllCategories([]);
        setFilteredCategories([]);
      } finally {
        setLoading(false);
      }
    };
    if (isSubscriptionActive) load();
    else setLoading(false);
  }, [currentProfile?.playLevel, isSubscriptionActive]);

  // Search filter — runtime, no API call
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories(allCategories);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredCategories(
      allCategories.filter(
        (cat) =>
          cat.displayName?.toLowerCase().includes(q) ||
          cat.categoryName?.toLowerCase().includes(q),
      ),
    );
  }, [searchQuery, allCategories]);

  const handleCategoryPress = (category) => {
    router.push({
      pathname: "/features/vocabulary/CategoryScreen",
      params: {
        categoryName: category.categoryName,
        displayName: category.displayName,
        coverEmoji: category.coverEmoji || category.iconEmoji || "📚",
        coverImageUrl: category.coverImageUrl || "",
        gradientStart: category.gradientStart || "#37474F",
        gradientEnd: category.gradientEnd || "#263238",
        accentColor: category.accentColor || "#90A4AE",
        playLevel: String(maxLevel),
        mode: "all", // multi-level view
      },
    });
  };

  const totalWords = allCategories.reduce(
    (sum, c) => sum + (c.wordCount ?? 0),
    0,
  );

  return (
    <View style={sc.root}>
      {/* Background glows */}
      <View style={[sc.glow, sc.glow1]} />
      <View style={[sc.glow, sc.glow2]} />

      {/* Header */}
      <View style={[sc.header, { paddingTop: insets.top || STATUS_BAR_H }]}>
        <TouchableOpacity
          style={sc.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={C.teal} />
        </TouchableOpacity>
        <View style={sc.headerCenter}>
          <Text style={sc.headerTitle}>Vocabulary</Text>
          {!loading && allCategories.length > 0 && (
            <View style={sc.countPill}>
              <Text style={sc.countText}>
                {totalWords} words · Levels 1–{maxLevel}
              </Text>
            </View>
          )}
        </View>
        <View style={{ width: size.hitSm }} />
      </View>

      {!isSubscriptionActive ? (
        // Subscription lock — same messaging as WordBag
        <View style={sc.lockWrap}>
          <Text style={sc.lockEmoji}>🎒</Text>
          <Text style={sc.lockTitle}>Subscription Required</Text>
          <Text style={sc.lockMsg}>
            An active subscription is required to access your vocabulary
            library.
          </Text>
          <TouchableOpacity
            style={sc.lockBtn}
            onPress={() =>
              router.push("/features/purchases/SubscriptionPlansScreen")
            }
            activeOpacity={0.88}
          >
            <Text style={sc.lockBtnText}>View Plans →</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={sc.loaderWrap}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : (
        <>
          {/* Search bar */}
          {allCategories.length > 0 && (
            <View style={sc.searchRow}>
              <Ionicons
                name="search"
                size={16}
                color={C.textMuted}
                style={sc.searchIcon}
              />
              <TextInput
                style={sc.searchInput}
                placeholder="Search categories…"
                placeholderTextColor={C.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={sc.clearBtn}
                >
                  <Ionicons name="close-circle" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {filteredCategories.length === 0 ? (
            <View style={sc.emptyWrap}>
              <Text style={sc.emptyEmoji}>🔍</Text>
              <Text style={sc.emptyTitle}>No categories found</Text>
              <Text style={sc.emptySub}>Try a different search term.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={sc.grid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Render in rows of GRID_COLS */}
              {Array.from(
                { length: Math.ceil(filteredCategories.length / GRID_COLS) },
                (_, rowIdx) => (
                  <View key={rowIdx} style={sc.gridRow}>
                    {filteredCategories
                      .slice(rowIdx * GRID_COLS, rowIdx * GRID_COLS + GRID_COLS)
                      .map((cat) => (
                        <VocabCategoryCard
                          key={cat.categoryName}
                          category={cat}
                          onPress={() => handleCategoryPress(cat)}
                        />
                      ))}
                  </View>
                ),
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glow: { position: "absolute", borderRadius: 999, opacity: 0.12 },
  glow1: {
    width: 300,
    height: 300,
    backgroundColor: C.teal,
    top: -80,
    right: -80,
  },
  glow2: {
    width: 200,
    height: 200,
    backgroundColor: "#9652D9",
    bottom: 60,
    left: -60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: pad.md,
    paddingHorizontal: pad.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.15)",
  },
  backBtn: {
    width: size.hitSm,
    height: size.hitSm,
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center", gap: 4 },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  countPill: {
    backgroundColor: C.tealDim,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.s,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.teal,
    letterSpacing: 0.5,
  },
  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: pad.md,
    marginTop: pad.sm,
    marginBottom: pad.xs,
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.2)",
    paddingHorizontal: pad.sm,
  },
  searchIcon: { marginRight: pad.xs },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: font.md,
    color: C.textPri,
    paddingVertical: isTablet ? 14 : 11,
  },
  clearBtn: { padding: 4 },
  // Grid
  grid: {
    paddingHorizontal: H_PAD,
    paddingTop: pad.md,
    paddingBottom: pad.xxxl,
    gap: GAP,
  },
  gridRow: { flexDirection: "row", gap: GAP },
  // States
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: pad.xxxl,
    gap: 12,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textMuted,
    textAlign: "center",
  },
  // Lock
  lockWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: pad.xxxl,
    gap: 16,
  },
  lockEmoji: { fontSize: 64 },
  lockTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    textAlign: "center",
  },
  lockMsg: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.md * 1.6,
  },
  lockBtn: {
    backgroundColor: C.teal,
    borderRadius: radius.pill,
    paddingVertical: pad.sm,
    paddingHorizontal: pad.xl,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  lockBtnText: { fontFamily: FONTS.bold, fontSize: font.md, color: "#08081a" },
});
