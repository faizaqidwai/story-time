// app/components/billing/SubscriptionPlansScreen.jsx
//
// Redesigned with PremiumUpgradeModal-inspired card aesthetic:
//  - Animated glowing icon circle per plan (pulse + glow loops)
//  - Staggered feature row reveal matching ValueProp animation pattern
//  - Per-plan accent palette driven by billingCycle + pkg.icon
//  - Horizontal FlatList with peek; tab filtering by billingCycle
//  - Monthly → NONE + MONTHLY | Yearly → YEARLY | Lifetime → LIFETIME

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { FONTS } from "../../theme";
import { useApiCall } from "../../_hooks/useApiCall";
import { fetchSubscriptionPackages, fetchMySubscription } from "../../services/subscriptionService";
import { useUser } from "../../_contexts/UserContext";

const { width: SW } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

// ── Card dimensions ───────────────────────────────────────────────────────────
const CARD_MARGIN = 14;
const CARD_WIDTH = SW * 0.80;
const PEEK_WIDTH = SW * 0.07;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  yellow: "#FFD54F",
  coral: "#FF6B6B",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

// ── Per-cycle accent — drives icon glow, border, CTA, bg tint ────────────────
const ACCENT = {
  NONE: {
    fallbackIcon: "🌱",
    color: "#00BCD4",
    colorRgb: "0,188,212",
    ctaLabel: "Start for Free",
    darkBg: "#03080a",
  },
  MONTHLY: {
    fallbackIcon: "⚡",
    color: "#60CDFF",
    colorRgb: "96,205,255",
    ctaLabel: "Go Premium",
    darkBg: "#030c14",
  },
  YEARLY: {
    fallbackIcon: "🏆",
    color: "#FFD54F",
    colorRgb: "255,213,79",
    ctaLabel: "Save 20% Yearly",
    darkBg: "#100d02",
  },
  LIFETIME: {
    fallbackIcon: "♾️",
    color: "#FF6B6B",
    colorRgb: "255,107,107",
    ctaLabel: "Own It Forever",
    darkBg: "#0e0303",
  },
};

function getAccent(billingCycle = "MONTHLY", pkgIcon, pkgAccentRgb, pkgDarkBg, pkgCtaLabel) {
  const base = ACCENT[billingCycle] ?? ACCENT.MONTHLY;
  const resolvedIcon    = pkgIcon       && pkgIcon.trim()       ? pkgIcon       : base.fallbackIcon;
  const resolvedRgb     = pkgAccentRgb  && pkgAccentRgb.trim()  ? pkgAccentRgb  : base.colorRgb;
  const resolvedDarkBg  = pkgDarkBg     && pkgDarkBg.trim()     ? pkgDarkBg     : base.darkBg;
  const resolvedCtaLabel= pkgCtaLabel   && pkgCtaLabel.trim()   ? pkgCtaLabel   : base.ctaLabel;
  return {
    ...base,
    resolvedIcon,
    colorRgb:  resolvedRgb,
    darkBg:    resolvedDarkBg,
    ctaLabel:  resolvedCtaLabel,
  };
}

// ── Tab filter ────────────────────────────────────────────────────────────────
const CYCLES = [
  { key: "MONTHLY",  label: "Monthly" },
  { key: "YEARLY",   label: "Yearly",   badge: "−20%" },
  { key: "LIFETIME", label: "Lifetime", badge: "∞" },
];

function filterByTab(pkgs, tab) {
  if (tab === "MONTHLY")  return pkgs.filter((p) => p.billingCycle === "NONE" || p.billingCycle === "MONTHLY");
  if (tab === "YEARLY")   return pkgs.filter((p) => p.billingCycle === "YEARLY");
  if (tab === "LIFETIME") return pkgs.filter((p) => p.billingCycle === "LIFETIME");
  return pkgs;
}

// ── Format price ──────────────────────────────────────────────────────────────
function formatPrice(price, currency, billingCycle) {
  if (!price || price === 0) return { main: "Free", sub: null };
  const sym = currency === "USD" ? "$" : currency === "SAR" ? "﷼" : currency;
  const sub =
    billingCycle === "YEARLY" ? "/yr" :
    billingCycle === "LIFETIME" ? " once" : "/mo";
  return { main: `${sym}${price}`, sub };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED ICON — mirrors PremiumUpgradeModal's CrownIcon exactly
// ─────────────────────────────────────────────────────────────────────────────
function PlanIcon({ accent }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.10, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.93, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();
    glowLoop.start();
    return () => { pulseLoop.stop(); glowLoop.stop(); };
  }, []);

  const glowOp    = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.80] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.87, 1.18] });
  const rgb = accent.colorRgb;

  return (
    <View style={iconS.wrapper}>
      <Animated.View style={[
        iconS.outerRing,
        {
          borderColor: `rgba(${rgb},0.18)`,
          backgroundColor: `rgba(${rgb},0.05)`,
          opacity: glowOp,
          transform: [{ scale: glowScale }],
        },
      ]} />
      <Animated.View style={[
        iconS.innerRing,
        {
          borderColor: `rgba(${rgb},0.36)`,
          backgroundColor: `rgba(${rgb},0.09)`,
          opacity: glowOp,
          transform: [{ scale: pulse }],
        },
      ]} />
      <Animated.View style={[
        iconS.circle,
        {
          borderColor: accent.color,
          backgroundColor: `rgba(${rgb},0.13)`,
          shadowColor: accent.color,
          transform: [{ scale: pulse }],
        },
      ]}>
        <Text style={iconS.emoji}>{accent.resolvedIcon}</Text>
      </Animated.View>
    </View>
  );
}

const iconS = StyleSheet.create({
  wrapper: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  outerRing: {
    position: "absolute",
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 1.5,
  },
  innerRing: {
    position: "absolute",
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 1.5,
  },
  circle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.80,
    shadowRadius: 18,
    elevation: 14,
  },
  emoji: { fontSize: 28 },
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE ROW — staggered reveal, mirrors ValueProp from PremiumUpgradeModal
// ─────────────────────────────────────────────────────────────────────────────
function FeatureRow({ feature, accent, index }) {
  const slide = useRef(new Animated.Value(20)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120 + index * 50),
      Animated.parallel([
        Animated.timing(op,    { toValue: 1, duration: 230, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // An emoji icon exists when iconType is "emoji" AND icon string is non-empty
  const emojiIcon =
    feature.iconType === "emoji" && feature.icon && feature.icon.trim().length > 0
      ? feature.icon.trim()
      : null;

  const rgb = accent.colorRgb;

  return (
    <Animated.View style={[
      featS.row,
      {
        backgroundColor: feature.enabled ? `rgba(${rgb},0.07)` : "rgba(255,255,255,0.02)",
        borderColor:     feature.enabled ? `rgba(${rgb},0.20)` : "rgba(255,255,255,0.05)",
        opacity: op,
        transform: [{ translateX: slide }],
      },
    ]}>
      {/* Left bubble: show data emoji if present, otherwise show ✓/✗ status */}
      <View style={[
        featS.iconWrap,
        { backgroundColor: feature.enabled ? `rgba(${rgb},0.12)` : "rgba(255,255,255,0.04)" },
      ]}>
        <Text style={featS.iconText}>
          {emojiIcon !== null ? emojiIcon : (feature.enabled ? "✓" : "✗")}
        </Text>
      </View>

      {/* Feature label */}
      <Text style={[featS.label, !feature.enabled && featS.labelDim]}>
        {feature.label}
      </Text>

      {/* Right status indicator: only shown when emoji is present on the left,
          so the user always sees the enabled/disabled state */}
      {emojiIcon !== null && (
        <Text style={[featS.check, { color: feature.enabled ? accent.color : C.textMuted }]}>
          {feature.enabled ? "✓" : "✗"}
        </Text>
      )}
    </Animated.View>
  );
}

const featS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 10,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  iconText: { fontSize: 14 },
  label: {
    fontFamily: FONTS.regular, fontSize: 12,
    color: C.textSec, flex: 1, lineHeight: 17,
  },
  labelDim: {
    color: C.textMuted,
    textDecorationLine: "line-through",
    opacity: 0.55,
  },
  check: { fontFamily: FONTS.bold, fontSize: 12, flexShrink: 0 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN CARD — full PremiumUpgradeModal-style layout
// ─────────────────────────────────────────────────────────────────────────────
function PlanCard({ pkg, onPress, isCurrentPlan }) {
  const accent    = getAccent(pkg.billingCycle, pkg.icon, pkg.accentColorRgb, pkg.darkBg, pkg.ctaLabel);
  const priceObj  = formatPrice(pkg.price, pkg.currency, pkg.billingCycle);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const features  = pkg.displayFeatures ?? [];
  const tagline   = pkg.tagLine ?? pkg.tagline ?? "";
  const description = pkg.description ?? "";
  const rgb = accent.colorRgb;

  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, friction: 6, tension: 200, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    friction: 6, tension: 200, useNativeDriver: true }).start();

  return (
    <Animated.View style={[cardS.wrap, { transform: [{ scale: scaleAnim }] }]}>
      <View
        style={[
          cardS.card,
          {
            borderColor: isCurrentPlan ? accent.color : `rgba(${rgb},0.28)`,
            borderTopColor: `rgba(${rgb},0.60)`,
            backgroundColor: accent.darkBg,
          },
        ]}
      >
        {/* Current plan badge */}
        {isCurrentPlan && (
          <View style={[cardS.currentPlanBadge, { backgroundColor: `rgba(${rgb},0.12)`, borderColor: `rgba(${rgb},0.35)` }]}>
            <Text style={[cardS.currentPlanBadgeText, { color: accent.color }]}>✓  Your Current Plan</Text>
          </View>
        )}

        {/* Atmosphere tint */}
        <View style={[cardS.atmoBg, { backgroundColor: `rgba(${rgb},0.04)` }]} />
        {/* Top-right corner shimmer */}
        <View style={[cardS.topShimmer, { backgroundColor: `rgba(${rgb},0.09)` }]} />

        {/* ── Animated plan icon ── */}
        <PlanIcon accent={accent} />

        {/* ── Plan name ── */}
        <Text style={[cardS.planName, { color: accent.color }]}>{pkg.name}</Text>

        {/* ── Tagline ── */}
        {!!tagline && (
          <Text style={[cardS.tagline, { color: `rgba(${rgb},0.75)` }]}>{tagline}</Text>
        )}

        {/* ── Description ── */}
        {!!description && (
          <Text style={cardS.description}>{description}</Text>
        )}

        {/* ── Price pill ── */}
        <View style={[
          cardS.priceBlock,
          { borderColor: `rgba(${rgb},0.20)`, backgroundColor: `rgba(${rgb},0.07)` },
        ]}>
          <Text style={[cardS.priceMain, { color: accent.color }]}>{priceObj.main}</Text>
          {priceObj.sub && <Text style={cardS.priceSub}>{priceObj.sub}</Text>}
        </View>

        {/* ── Divider ── */}
        <View style={[cardS.divider, { backgroundColor: `rgba(${rgb},0.18)` }]} />

        {/* ── Feature rows ── */}
        <View style={cardS.featureList}>
          {features.map((f, i) => (
            <FeatureRow key={f.key ?? i} feature={f} accent={accent} index={i} />
          ))}
        </View>

        {/* ── CTA — disabled when current plan ── */}
        <TouchableOpacity
          style={[
            cardS.ctaBtn,
            isCurrentPlan
              ? { backgroundColor: `rgba(${rgb},0.12)`, borderWidth: 1.5, borderColor: `rgba(${rgb},0.35)` }
              : { backgroundColor: accent.color, shadowColor: accent.color },
          ]}
          onPress={isCurrentPlan ? undefined : onPress}
          disabled={isCurrentPlan}
          activeOpacity={isCurrentPlan ? 1 : 0.88}
        >
          {!isCurrentPlan && <View style={cardS.ctaShine} />}
          <Text style={cardS.ctaEmoji}>{isCurrentPlan ? "✓" : (pkg.price === 0 ? "🌟" : "⚡")}</Text>
          <Text style={[cardS.ctaText, isCurrentPlan && { color: accent.color }]}>
            {isCurrentPlan ? "You have this plan" : accent.ctaLabel}
          </Text>
        </TouchableOpacity>

        {/* ── Trial note ── */}
        {pkg.trialDays > 0 && !isCurrentPlan && (
          <Text style={cardS.trialNote}>🎁 {pkg.trialDays}-day free trial</Text>
        )}

        {/* ── Free plan secondary link ── */}
        {pkg.price === 0 && !isCurrentPlan && (
          <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={cardS.dismissWrap}>
            <Text style={cardS.dismissTxt}>Continue with free plan</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const cardS = StyleSheet.create({
  wrap: { width: CARD_WIDTH, marginRight: CARD_MARGIN },
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderTopWidth: 2,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 20,
  },
  atmoBg: { ...StyleSheet.absoluteFillObject },
  topShimmer: {
    position: "absolute",
    top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    opacity: 0.7,
  },
  planName: {
    fontFamily: FONTS.bold, fontSize: 26, letterSpacing: 0.3,
    textAlign: "center", marginBottom: 4,
  },
  tagline: {
    fontFamily: FONTS.light, fontSize: 13, fontStyle: "italic",
    textAlign: "center", marginBottom: 8,
  },
  description: {
    fontFamily: FONTS.regular, fontSize: 12, color: C.textMuted,
    textAlign: "center", lineHeight: 18, marginBottom: 18, paddingHorizontal: 4,
  },
  priceBlock: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "center",
    gap: 5, borderRadius: 16, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 22,
    marginBottom: 18, alignSelf: "center",
  },
  priceMain: { fontFamily: FONTS.bold, fontSize: 34, letterSpacing: -0.5 },
  priceSub:  { fontFamily: FONTS.light, fontSize: 14, color: C.textMuted },
  divider:   { height: 1, marginBottom: 14 },
  featureList: { marginBottom: 20 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 27, height: 52,
    marginBottom: 10, overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55, shadowRadius: 14, elevation: 10,
  },
  ctaShine: {
    position: "absolute", top: 0, left: "14%",
    width: "38%", height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20, transform: [{ rotate: "-15deg" }],
  },
  ctaEmoji: { fontSize: 17 },
  ctaText: {
    fontFamily: FONTS.bold, fontSize: 15, color: "#08081a", letterSpacing: 0.3,
  },
  trialNote: {
    fontFamily: FONTS.light, fontSize: 11, color: C.textMuted,
    textAlign: "center", marginTop: 4,
  },
  dismissWrap: { alignSelf: "center", paddingVertical: 8 },
  dismissTxt: {
    fontFamily: FONTS.regular, fontSize: 12, color: C.textMuted,
    textDecorationLine: "underline",
  },
  currentPlanBadge: {
    alignSelf: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  currentPlanBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CYCLE TOGGLE
// ─────────────────────────────────────────────────────────────────────────────
function CycleToggle({ selected, onSelect }) {
  return (
    <View style={togS.track}>
      {CYCLES.map((c) => {
        const active = selected === c.key;
        return (
          <TouchableOpacity
            key={c.key}
            style={[togS.pill, active && togS.pillActive]}
            onPress={() => onSelect(c.key)}
            activeOpacity={0.8}
          >
            <Text style={[togS.pillText, active && togS.pillTextActive]}>{c.label}</Text>
            {c.badge && (
              <View style={[togS.badge, active && togS.badgeActive]}>
                <Text style={[togS.badgeText, active && togS.badgeTextActive]}>{c.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const togS = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 4, marginHorizontal: 20, marginBottom: 24,
  },
  pill: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: 11,
    borderRadius: 14, gap: 5,
  },
  pillActive: { backgroundColor: C.teal },
  pillText: { fontFamily: FONTS.bold, fontSize: 12, color: C.textMuted },
  pillTextActive: { color: "#08081a" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  badgeActive: { backgroundColor: "rgba(8,8,26,0.22)" },
  badgeText: { fontFamily: FONTS.bold, fontSize: 8, color: C.textMuted, letterSpacing: 0.3 },
  badgeTextActive: { color: "#08081a" },
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION DOTS — accent color follows active card
// ─────────────────────────────────────────────────────────────────────────────
function PaginationDots({ count, activeIndex, accentColor }) {
  return (
    <View style={dotS.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            dotS.dot,
            i === activeIndex && { ...dotS.dotActive, backgroundColor: accentColor ?? C.teal },
          ]}
        />
      ))}
    </View>
  );
}

const dotS = StyleSheet.create({
  row: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 6, marginTop: 18, marginBottom: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { width: 22, height: 6, borderRadius: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ tabEmpty }) {
  return (
    <View style={emS.container}>
      <Text style={emS.icon}>{tabEmpty ? "🗂️" : "📭"}</Text>
      <Text style={emS.title}>{tabEmpty ? "No plans here" : "No Plans Available"}</Text>
      <Text style={emS.subtitle}>
        {tabEmpty
          ? "No plans available for this billing period."
          : "We're setting up our subscription plans.\nPlease check back soon!"}
      </Text>
    </View>
  );
}

const emS = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 40, gap: 10 },
  icon: { fontSize: 56, marginBottom: 6 },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: C.textSec, textAlign: "center" },
  subtitle: { fontFamily: FONTS.light, fontSize: 13, color: C.textMuted, textAlign: "center", lineHeight: 20 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { execute, loading } = useApiCall();
  const { userAccount } = useUser();

  const [packages, setPackages]            = useState([]);
  const [activeSubscription, setActiveSub] = useState(null);
  const [cycle, setCycle]                  = useState("MONTHLY");
  const [activeIndex, setActiveIndex]      = useState(0);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const loadPackages = useCallback(async () => {
    await execute(() => fetchSubscriptionPackages(), {
      errorDisplay: "sheet",
      errorMessage: "Couldn't Load Plans",
      errorSubMessage: "Please check your connection and try again.",
      errorRetry: true,
      onSuccess: (data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setPackages(list.filter((p) => p.isActive !== false));
        Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }).start();
      },
    });
  }, [execute]);

  const loadSubscription = useCallback(async () => {
    await execute(() => fetchMySubscription(), {
      errorDisplay: "none",
      onSuccess: (sub) => setActiveSub(sub ?? null),
    });
  }, [execute]);

  useEffect(() => {
    loadPackages();
    loadSubscription();
  }, []);

  const filteredPackages = filterByTab(packages, cycle);

  // ID of the package the user currently holds
  const currentPackageId = activeSubscription?.packageId ?? null;

  // True when user has no paid subscription (billingCycle NONE = free tier)
  const isOnFreePlan = !activeSubscription ||
    activeSubscription.billingCycle === "NONE" ||
    activeSubscription.status !== "ACTIVE";

  const activeAccent = filteredPackages[activeIndex]
    ? getAccent(
        filteredPackages[activeIndex].billingCycle,
        filteredPackages[activeIndex].icon,
        filteredPackages[activeIndex].accentColorRgb,
        filteredPackages[activeIndex].darkBg,
        filteredPackages[activeIndex].ctaLabel,
      ).color
    : C.teal;

  useEffect(() => {
    setActiveIndex(0);
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [cycle, packages.length]);

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_MARGIN));
    setActiveIndex(Math.max(0, Math.min(idx, filteredPackages.length - 1)));
  };

  const handleSelectPlan = (pkg) => {
    if (pkg.price === 0) {
      Alert.alert(
        "Start Free Plan",
        "You'll get access to the free tier features immediately.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: () => Alert.alert("Coming Soon", "Free plan activation coming soon.") },
        ],
      );
      return;
    }

    // First upgrade from free → paid: ask for starting level first
    if (isOnFreePlan) {
      router.push({
        pathname: "/components/billing/LevelSelectScreen",
        params: { packageJson: JSON.stringify(pkg) },
      });
      return;
    }

    // Already a paid user changing plans: go straight to checkout
    router.push({
      pathname: "/components/billing/PurchaseScreen",
      params: { packageJson: JSON.stringify(pkg) },
    });
  };

  return (
    <View style={scr.root}>
      {/* Header */}
      <View style={scr.header}>
        <TouchableOpacity style={scr.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={scr.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={scr.title}>Choose a Plan</Text>
          <Text style={scr.subtitle}>Unlock the full world of learning</Text>
        </View>
      </View>

      {loading ? (
        <View style={scr.center}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={scr.loadingText}>Loading plans…</Text>
        </View>
      ) : (
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={scr.scroll}>

            <CycleToggle selected={cycle} onSelect={setCycle} />

            {filteredPackages.length > 1 && (
              <Text style={scr.swipeHint}>Swipe to compare plans →</Text>
            )}

            {packages.length === 0 ? (
              <EmptyState tabEmpty={false} />
            ) : filteredPackages.length === 0 ? (
              <EmptyState tabEmpty={true} />
            ) : (
              <>
                <FlatList
                  ref={flatListRef}
                  data={filteredPackages}
                  keyExtractor={(item) => item.id ?? item.name}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + CARD_MARGIN}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={scr.carousel}
                  contentInset={{ right: PEEK_WIDTH }}
                  renderItem={({ item }) => (
                    <PlanCard
                      pkg={item}
                      isCurrentPlan={!!currentPackageId && item.id === currentPackageId}
                      onPress={() => handleSelectPlan(item)}
                    />
                  )}
                />
                <PaginationDots
                  count={filteredPackages.length}
                  activeIndex={activeIndex}
                  accentColor={activeAccent}
                />
              </>
            )}

            {filteredPackages.length > 0 && (
              <Text style={scr.footerNote}>Secure checkout · Cancel anytime</Text>
            )}

            <View style={{ height: 48 }} />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN STYLES
// ─────────────────────────────────────────────────────────────────────────────
const scr = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  loadingText: { fontFamily: FONTS.light, fontSize: 14, color: C.textMuted },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingTop: STATUS_BAR_HEIGHT + 10, paddingBottom: 20, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,188,212,0.1)",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { fontFamily: FONTS.bold, fontSize: 18, color: C.teal },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: C.textPri, letterSpacing: 0.3 },
  subtitle: { fontFamily: FONTS.light, fontSize: 12, color: C.textMuted, marginTop: 2 },
  scroll: { paddingTop: 24 },
  swipeHint: {
    fontFamily: FONTS.light, fontSize: 12, color: C.textMuted,
    textAlign: "center", marginBottom: 16, letterSpacing: 0.3,
  },
  carousel: { paddingLeft: 20, paddingRight: PEEK_WIDTH + 8 },
  footerNote: {
    fontFamily: FONTS.light, fontSize: 11, color: C.textMuted,
    textAlign: "center", lineHeight: 18, marginTop: 20, paddingHorizontal: 32,
  },
});
