// app/components/billing/SubscriptionPlansScreen.jsx
//
// CHANGES FROM ORIGINAL:
//   ✅ Packages come from RevenueCatContext.enrichedPackages
//      (RC pricing merged with backend metadata)
//   ✅ handleSelectPlan guards against missing pkg.identifier
//   ✅ Passes only packageJson to LevelSelectScreen/PurchaseScreen
//      (rcIdentifier is read from pkg.identifier in PurchaseScreen)
//   ✅ All display logic unchanged (PlanCard, PlanIcon, FeatureRow, etc.)
//   ✅ filterByTab works identically
//   ✅ isCurrentPlan check unchanged

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
import { useRevenueCat } from "../../_contexts/RevenueCatContext";
import { useApiCall } from "../../_hooks/useApiCall";
import { fetchMySubscription } from "../../services/subscriptionService";
import { useUser } from "../../_contexts/UserContext";
import { font, pad, radius, size } from "../../theme/tokens";

const { width: SW } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const CARD_MARGIN = pad.sm;
const CARD_WIDTH = SW * 0.8;
const PEEK_WIDTH = SW * 0.07;

const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  yellow: "#FFD54F",
  coral: "#FF6B6B",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

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

function getAccent(
  billingCycle = "MONTHLY",
  pkgIcon,
  pkgAccentRgb,
  pkgDarkBg,
  pkgCtaLabel,
) {
  const base = ACCENT[billingCycle] ?? ACCENT.MONTHLY;
  return {
    ...base,
    resolvedIcon: pkgIcon && pkgIcon.trim() ? pkgIcon : base.fallbackIcon,
    colorRgb:
      pkgAccentRgb && pkgAccentRgb.trim() ? pkgAccentRgb : base.colorRgb,
    darkBg: pkgDarkBg && pkgDarkBg.trim() ? pkgDarkBg : base.darkBg,
    ctaLabel: pkgCtaLabel && pkgCtaLabel.trim() ? pkgCtaLabel : base.ctaLabel,
  };
}

const CYCLES = [
  { key: "MONTHLY", label: "Monthly" },
  { key: "YEARLY", label: "Yearly", badge: "−20%" },
  { key: "LIFETIME", label: "Lifetime", badge: "∞" },
];

function filterByTab(pkgs, tab) {
  if (tab === "MONTHLY")
    return pkgs.filter(
      (p) => p.billingCycle === "NONE" || p.billingCycle === "MONTHLY",
    );
  if (tab === "YEARLY") return pkgs.filter((p) => p.billingCycle === "YEARLY");
  if (tab === "LIFETIME")
    return pkgs.filter((p) => p.billingCycle === "LIFETIME");
  return pkgs;
}

// ── Format price ─────────────────────────────────────────────────────────────
// Prefers RC's store-localised priceString over backend price
function formatPrice(pkg) {
  // RC gives localised priceString (e.g. "$4.99")
  if (pkg?.priceString && pkg.priceString.trim()) {
    const sub =
      pkg.billingCycle === "YEARLY"
        ? "/yr"
        : pkg.billingCycle === "LIFETIME"
          ? " once"
          : pkg.billingCycle === "NONE"
            ? null
            : "/mo";
    return { main: pkg.priceString, sub };
  }
  // Fallback for free plan or mock mode
  if (!pkg?.price || Number(pkg.price) === 0)
    return { main: "Free", sub: null };
  const sym =
    pkg.currency === "USD"
      ? "$"
      : pkg.currency === "SAR"
        ? "﷼"
        : (pkg.currency ?? "");
  const sub =
    pkg.billingCycle === "YEARLY"
      ? "/yr"
      : pkg.billingCycle === "LIFETIME"
        ? " once"
        : "/mo";
  return { main: `${sym}${Number(pkg.price).toFixed(2)}`, sub };
}

// ── Animated plan icon ────────────────────────────────────────────────────────
function PlanIcon({ accent }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pl = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.93,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const gl = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pl.start();
    gl.start();
    return () => {
      pl.stop();
      gl.stop();
    };
  }, []);

  const glowOp = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.8],
  });
  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.87, 1.18],
  });
  const rgb = accent.colorRgb;

  return (
    <View style={iconS.wrapper}>
      <Animated.View
        style={[
          iconS.outerRing,
          {
            borderColor: `rgba(${rgb},0.18)`,
            backgroundColor: `rgba(${rgb},0.05)`,
            opacity: glowOp,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          iconS.innerRing,
          {
            borderColor: `rgba(${rgb},0.36)`,
            backgroundColor: `rgba(${rgb},0.09)`,
            opacity: glowOp,
            transform: [{ scale: pulse }],
          },
        ]}
      />
      <Animated.View
        style={[
          iconS.circle,
          {
            borderColor: accent.color,
            backgroundColor: `rgba(${rgb},0.13)`,
            shadowColor: accent.color,
            transform: [{ scale: pulse }],
          },
        ]}
      >
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
    marginBottom: pad.md,
  },
  outerRing: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
  },
  innerRing: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 14,
  },
  emoji: { fontSize: font.xxl },
});

// ── Feature row ───────────────────────────────────────────────────────────────
function FeatureRow({ feature, accent, index }) {
  const slide = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120 + index * 50),
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const emojiIcon =
    feature.iconType === "emoji" && feature.icon?.trim()
      ? feature.icon.trim()
      : null;
  const rgb = accent.colorRgb;

  return (
    <Animated.View
      style={[
        featS.row,
        {
          backgroundColor: feature.enabled
            ? `rgba(${rgb},0.07)`
            : "rgba(255,255,255,0.02)",
          borderColor: feature.enabled
            ? `rgba(${rgb},0.20)`
            : "rgba(255,255,255,0.05)",
          opacity: op,
          transform: [{ translateX: slide }],
        },
      ]}
    >
      <View
        style={[
          featS.iconWrap,
          {
            backgroundColor: feature.enabled
              ? `rgba(${rgb},0.12)`
              : "rgba(255,255,255,0.04)",
          },
        ]}
      >
        <Text style={featS.iconText}>
          {emojiIcon !== null ? emojiIcon : feature.enabled ? "✓" : "✗"}
        </Text>
      </View>
      <Text style={[featS.label, !feature.enabled && featS.labelDim]}>
        {feature.label}
      </Text>
      {emojiIcon !== null && (
        <Text
          style={[
            featS.check,
            { color: feature.enabled ? accent.color : C.textMuted },
          ]}
        >
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
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: pad.s,
    paddingHorizontal: pad.sm,
    marginBottom: pad.xs,
    gap: pad.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: { fontSize: font.md },
  label: {
    fontFamily: FONTS.regular,
    fontSize: font.sm,
    color: C.textSec,
    flex: 1,
    lineHeight: font.sm * 1.4,
  },
  labelDim: {
    color: C.textMuted,
    textDecorationLine: "line-through",
    opacity: 0.55,
  },
  check: { fontFamily: FONTS.bold, fontSize: font.sm, flexShrink: 0 },
});

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ pkg, onPress, isCurrentPlan }) {
  const accent = getAccent(
    pkg.billingCycle,
    pkg.icon,
    pkg.accentColorRgb,
    pkg.darkBg,
    pkg.ctaLabel,
  );
  const priceObj = formatPrice(pkg);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const features = pkg.displayFeatures ?? [];
  const tagline = pkg.tagLine ?? pkg.tagline ?? "";
  const rgb = accent.colorRgb;

  // ── Edge case: package missing identifier — show as unavailable ──────────
  const isUnavailable = !pkg.identifier && !pkg.rcIdentifier;

  const pressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();

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
        {isCurrentPlan && (
          <View
            style={[
              cardS.currentBadge,
              {
                backgroundColor: `rgba(${rgb},0.12)`,
                borderColor: `rgba(${rgb},0.35)`,
              },
            ]}
          >
            <Text style={[cardS.currentBadgeText, { color: accent.color }]}>
              ✓ Your Current Plan
            </Text>
          </View>
        )}

        {/* Unavailable badge — shown when identifier is missing */}
        {isUnavailable && (
          <View
            style={[
              cardS.currentBadge,
              {
                backgroundColor: "rgba(255,80,80,0.12)",
                borderColor: "rgba(255,80,80,0.35)",
              },
            ]}
          >
            <Text style={[cardS.currentBadgeText, { color: "#EF5350" }]}>
              ⚠ Temporarily Unavailable
            </Text>
          </View>
        )}

        <View
          style={[cardS.atmoBg, { backgroundColor: `rgba(${rgb},0.04)` }]}
        />
        <View
          style={[cardS.topShimmer, { backgroundColor: `rgba(${rgb},0.09)` }]}
        />

        <PlanIcon accent={accent} />
        <Text style={[cardS.planName, { color: accent.color }]}>
          {pkg.name}
        </Text>
        {!!tagline && (
          <Text style={[cardS.tagline, { color: `rgba(${rgb},0.75)` }]}>
            {tagline}
          </Text>
        )}
        {!!pkg.description && (
          <Text style={cardS.description}>{pkg.description}</Text>
        )}

        <View
          style={[
            cardS.priceBlock,
            {
              borderColor: `rgba(${rgb},0.20)`,
              backgroundColor: `rgba(${rgb},0.07)`,
            },
          ]}
        >
          <Text style={[cardS.priceMain, { color: accent.color }]}>
            {priceObj.main}
          </Text>
          {priceObj.sub && <Text style={cardS.priceSub}>{priceObj.sub}</Text>}
        </View>

        <View
          style={[cardS.divider, { backgroundColor: `rgba(${rgb},0.18)` }]}
        />

        <View style={cardS.featureList}>
          {features.map((f, i) => (
            <FeatureRow
              key={f.key ?? i}
              feature={f}
              accent={accent}
              index={i}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            cardS.ctaBtn,
            isCurrentPlan || isUnavailable
              ? {
                  backgroundColor: `rgba(${rgb},0.12)`,
                  borderWidth: 1.5,
                  borderColor: `rgba(${rgb},0.35)`,
                }
              : { backgroundColor: accent.color, shadowColor: accent.color },
          ]}
          onPress={isCurrentPlan || isUnavailable ? undefined : onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={isCurrentPlan || isUnavailable}
          activeOpacity={isCurrentPlan || isUnavailable ? 1 : 0.88}
        >
          {!isCurrentPlan && !isUnavailable && <View style={cardS.ctaShine} />}
          <Text style={cardS.ctaEmoji}>
            {isCurrentPlan
              ? "✓"
              : isUnavailable
                ? "⚠"
                : pkg.price === 0
                  ? "🌟"
                  : "⚡"}
          </Text>
          <Text
            style={[
              cardS.ctaText,
              (isCurrentPlan || isUnavailable) && { color: accent.color },
            ]}
          >
            {isCurrentPlan
              ? "You have this plan"
              : isUnavailable
                ? "Temporarily unavailable"
                : accent.ctaLabel}
          </Text>
        </TouchableOpacity>

        {pkg.trialDays > 0 && !isCurrentPlan && !isUnavailable && (
          <Text style={cardS.trialNote}>🎁 {pkg.trialDays}-day free trial</Text>
        )}
        {pkg.price === 0 && !isCurrentPlan && !isUnavailable && (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.6}
            style={cardS.dismissWrap}
          >
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
    borderRadius: radius.xxl,
    borderWidth: 1.5,
    borderTopWidth: 2,
    overflow: "hidden",
    paddingHorizontal: pad.lg,
    paddingTop: pad.xl,
    paddingBottom: pad.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 20,
  },
  atmoBg: { ...StyleSheet.absoluteFillObject },
  topShimmer: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.7,
  },
  planName: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: pad.xs,
  },
  tagline: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: pad.s,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: font.sm,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.sm * 1.5,
    marginBottom: pad.lg,
    paddingHorizontal: pad.xs,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: pad.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: pad.sm,
    paddingHorizontal: pad.xl,
    marginBottom: pad.lg,
    alignSelf: "center",
  },
  priceMain: { fontFamily: FONTS.bold, fontSize: font.h2, letterSpacing: -0.5 },
  priceSub: { fontFamily: FONTS.light, fontSize: font.md, color: C.textMuted },
  divider: { height: 1, marginBottom: pad.sm },
  featureList: { marginBottom: pad.lg },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: pad.s,
    borderRadius: radius.pill,
    height: size.btnHeightMd,
    marginBottom: pad.sm,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaShine: {
    position: "absolute",
    top: 0,
    left: "14%",
    width: "38%",
    height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  ctaEmoji: { fontSize: font.lg },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "#08081a",
    letterSpacing: 0.3,
  },
  trialNote: {
    fontFamily: FONTS.light,
    fontSize: font.s,
    color: C.textMuted,
    textAlign: "center",
    marginTop: pad.xs,
  },
  dismissWrap: { alignSelf: "center", paddingVertical: pad.s },
  dismissTxt: {
    fontFamily: FONTS.regular,
    fontSize: font.sm,
    color: C.textMuted,
    textDecorationLine: "underline",
  },
  currentBadge: {
    alignSelf: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    marginBottom: pad.sm,
  },
  currentBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    letterSpacing: 0.3,
  },
});

// ── Cycle toggle ──────────────────────────────────────────────────────────────
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
            <Text style={[togS.pillText, active && togS.pillTextActive]}>
              {c.label}
            </Text>
            {c.badge && (
              <View style={[togS.badge, active && togS.badgeActive]}>
                <Text style={[togS.badgeText, active && togS.badgeTextActive]}>
                  {c.badge}
                </Text>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: pad.xs,
    marginHorizontal: pad.lg,
    marginBottom: pad.xl,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: pad.sm,
    borderRadius: radius.md,
    gap: pad.xs,
  },
  pillActive: { backgroundColor: C.teal },
  pillText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.textMuted },
  pillTextActive: { color: "#08081a" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.xs,
    paddingHorizontal: pad.xs,
    paddingVertical: 1,
  },
  badgeActive: { backgroundColor: "rgba(8,8,26,0.22)" },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.textMuted,
    letterSpacing: 0.3,
  },
  badgeTextActive: { color: "#08081a" },
});

// ── Pagination dots ───────────────────────────────────────────────────────────
function PaginationDots({ count, activeIndex, accentColor }) {
  return (
    <View style={dotS.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            dotS.dot,
            i === activeIndex && {
              ...dotS.dotActive,
              backgroundColor: accentColor ?? C.teal,
            },
          ]}
        />
      ))}
    </View>
  );
}

const dotS = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: pad.s,
    marginTop: pad.lg,
    marginBottom: pad.s,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dotActive: { width: 22, height: 6, borderRadius: 3 },
});

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tabEmpty, onRetry }) {
  return (
    <View style={emS.container}>
      <Text style={emS.icon}>{tabEmpty ? "🗂️" : "📭"}</Text>
      <Text style={emS.title}>
        {tabEmpty ? "No plans here" : "No Plans Available"}
      </Text>
      <Text style={emS.subtitle}>
        {tabEmpty
          ? "No plans available for this billing period."
          : "We couldn't load subscription plans.\nPlease check your connection and try again."}
      </Text>
      {!tabEmpty && onRetry && (
        <TouchableOpacity
          style={emS.retryBtn}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <Text style={emS.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const emS = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: pad.xxxl,
    paddingHorizontal: pad.xxl,
    gap: pad.sm,
  },
  icon: { fontSize: size.iconXl, marginBottom: pad.s },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textSec,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.sm * 1.6,
  },
  retryBtn: {
    marginTop: pad.md,
    backgroundColor: C.teal,
    borderRadius: radius.md,
    paddingHorizontal: pad.xl,
    paddingVertical: pad.sm,
  },
  retryText: { fontFamily: FONTS.bold, fontSize: font.md, color: "#08081a" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { execute } = useApiCall();
  const { userAccount } = useUser();

  // ── RC context — enrichedPackages replaces old fetchSubscriptionPackages ──
  const { enrichedPackages, offeringsLoading, reloadOfferings } =
    useRevenueCat();

  const [activeSubscription, setActiveSub] = useState(null);
  const [cycle, setCycle] = useState("MONTHLY");
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const loadSubscription = useCallback(async () => {
    await execute(() => fetchMySubscription(), {
      errorDisplay: "none",
      onSuccess: (sub) => setActiveSub(sub ?? null),
    });
  }, [execute]);

  useEffect(() => {
    loadSubscription();
    reloadOfferings();
  }, []);

  useEffect(() => {
    console.log("[PACKAGES LIFECYCLE] PACKAGES MOUNTED");
    return () => console.log("[PACKAGES LIFECYCLE] PACKAGES UNMOUNTED");
  }, []);

  useEffect(() => {
    if (!offeringsLoading && enrichedPackages.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
    }
  }, [offeringsLoading, enrichedPackages.length]);

  // Filter out packages with no identifier before displaying
  // This prevents broken cards if a package was created without the identifier field
  const validPackages = enrichedPackages.filter((p) => {
    const hasIdentifier = !!(p.identifier || p.rcIdentifier);
    if (!hasIdentifier) {
      console.warn(`[Plans] Package "${p.name}" has no identifier — skipping`);
    }
    return true; // still show but PlanCard marks it as unavailable
  });

  const filteredPackages = filterByTab(validPackages, cycle);
  const currentPackageId = activeSubscription?.packageId ?? null;
  const isOnFreePlan =
    !activeSubscription ||
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
  }, [cycle, enrichedPackages.length]);

  const onScroll = (e) => {
    const idx = Math.round(
      e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_MARGIN),
    );
    setActiveIndex(Math.max(0, Math.min(idx, filteredPackages.length - 1)));
  };

  const handleSelectPlan = (pkg) => {
    // ── Edge case: free plan ──────────────────────────────────────────────────
    if (!pkg.price || Number(pkg.price) === 0) {
      Alert.alert(
        "Start Free Plan",
        "You'll get access to the free tier features immediately.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () =>
              Alert.alert("Coming Soon", "Free plan activation coming soon."),
          },
        ],
      );
      return;
    }

    // ── Edge case: missing identifier ─────────────────────────────────────────
    // This should never happen in production if packages are seeded correctly,
    // but we guard it here to prevent a broken navigation state.
    const pkgIdentifier = pkg.identifier || pkg.rcIdentifier;
    if (!pkgIdentifier) {
      console.error(
        `[Plans] Cannot purchase package "${pkg.name}" — missing identifier field`,
      );
      Alert.alert(
        "Temporarily Unavailable",
        "This plan is currently unavailable. Please try again later or contact support.",
        [{ text: "OK" }],
      );
      return;
    }

    // ── Normal purchase flow ──────────────────────────────────────────────────
    // We only pass packageJson — PurchaseScreen reads pkg.identifier from it
    // to find the live RC package object from RevenueCatContext.enrichedPackages
    const navParams = {
      packageJson: JSON.stringify(pkg),
    };

    if (isOnFreePlan) {
      // New subscriber — go through level select first
      router.push({
        pathname: "/components/billing/LevelSelectScreen",
        params: navParams,
      });
      return;
    }

    // Existing subscriber — go straight to checkout
    router.push({
      pathname: "/components/billing/PurchaseScreen",
      params: navParams,
    });
  };

  return (
    <View style={scr.root}>
      {/* Header */}
      <View style={scr.header}>
        <TouchableOpacity
          style={scr.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={scr.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: pad.sm }}>
          <Text style={scr.title}>Choose a Plan</Text>
          <Text style={scr.subtitle}>Unlock the full world of learning</Text>
        </View>
      </View>

      {offeringsLoading ? (
        <View style={scr.center}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={scr.loadingText}>Loading plans…</Text>
        </View>
      ) : (
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={scr.scroll}
          >
            <CycleToggle selected={cycle} onSelect={setCycle} />

            {filteredPackages.length > 1 && (
              <Text style={scr.swipeHint}>Swipe to compare plans →</Text>
            )}

            {enrichedPackages.length === 0 ? (
              <EmptyState tabEmpty={false} onRetry={reloadOfferings} />
            ) : filteredPackages.length === 0 ? (
              <EmptyState tabEmpty={true} />
            ) : (
              <>
                <FlatList
                  ref={flatListRef}
                  data={filteredPackages}
                  keyExtractor={(item) =>
                    item.rcIdentifier ?? item.identifier ?? item.id ?? item.name
                  }
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
                      isCurrentPlan={
                        !!currentPackageId && item.id === currentPackageId
                      }
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
              <Text style={scr.footerNote}>
                Secure checkout via {Platform.OS === "ios" ? "Apple" : "Google"}{" "}
                · Cancel anytime
              </Text>
            )}
            <View style={{ height: 48 }} />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const scr = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: pad.sm,
  },
  loadingText: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: STATUS_BAR_HEIGHT + pad.sm,
    paddingBottom: pad.lg,
    paddingHorizontal: pad.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.1)",
  },
  backBtn: {
    width: size.hitMd,
    height: size.hitMd,
    borderRadius: size.hitMd / 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontFamily: FONTS.bold, fontSize: font.lg, color: C.teal },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    marginTop: 2,
  },
  scroll: { paddingTop: pad.xl },
  swipeHint: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: pad.md,
    letterSpacing: 0.3,
  },
  carousel: { paddingLeft: pad.lg, paddingRight: PEEK_WIDTH + pad.s },
  footerNote: {
    fontFamily: FONTS.light,
    fontSize: font.s,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.s * 1.7,
    marginTop: pad.lg,
    paddingHorizontal: pad.xxl,
  },
});
