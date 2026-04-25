// app/components/billing/PlanBillingScreen.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { FONTS } from "../../theme";
import { useApiCall } from "../../_hooks/useApiCall";
import {
  fetchMySubscription,
  fetchPaymentMethods,
} from "../../services/subscriptionService";
import { font, pad, radius, size } from "../../theme/tokens"; // ← REPLACES useTheme
import { useSubscription } from "../../_contexts/SubscriptionContext";

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
  green: "#4CAF50",
  red: "#EF5350",
  yellow: "#FFD54F",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const BRAND_COLORS = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#007BC1",
  discover: "#FF6600",
};

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function cycleLabel(cycle) {
  switch (cycle) {
    case "MONTHLY":
      return "/mo";
    case "YEARLY":
      return "/yr";
    case "LIFETIME":
      return " (one-time)";
    default:
      return "";
  }
}
function statusColor(status) {
  switch (status) {
    case "ACTIVE":
      return C.green;
    case "TRIAL":
      return C.teal;
    case "PAST_DUE":
      return C.yellow;
    case "CANCELLED":
    case "EXPIRED":
      return C.red;
    default:
      return C.textMuted;
  }
}
function statusLabel(status, cancelAtPeriodEnd) {
  if (cancelAtPeriodEnd) return "Cancels soon";
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "TRIAL":
      return "Trial";
    case "PAST_DUE":
      return "Past Due";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    default:
      return status ?? "—";
  }
}

export default function PlanBillingScreen() {
  const router = useRouter();
  const { execute } = useApiCall();

  const {subscription, updateSubscription} = useSubscription();
  const [defaultCard, setDefaultCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      execute(() => fetchMySubscription(), {
        errorDisplay: "none",
        onSuccess: (sub) => updateSubscription(sub ?? null),
      }),
      execute(() => fetchPaymentMethods(), {
        errorDisplay: "toast",
        errorMessage: "Couldn't load payment methods.",
        onSuccess: (methods) => {
          const list = Array.isArray(methods) ? methods : [];
          setDefaultCard(list.find((m) => m.isDefault) ?? list[0] ?? null);
        },
      }),
    ]);
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [execute]);

  useEffect(() => {
    loadData();
    console.log("[PLAN LIFECYCLE] PLAN MOUNTED");
    return () => {
      console.log("[PLAN LIFECYCLE] PLAN UNMOUNTED");
    };
  }, []);

  const isFree = !subscription || subscription.billingCycle === "NONE";
  const planName = subscription?.packageName ?? "Free";
  const planAmount = subscription?.amount ?? 0;
  const planCurr = subscription?.currency ?? "USD";
  const planCycle = subscription?.billingCycle ?? "NONE";
  const subStatus = subscription?.status ?? "ACTIVE";
  const cancelSoon = subscription?.cancelAtPeriodEnd === true;
  const priceText =
    planAmount === 0
      ? "Free"
      : `${planCurr === "USD" ? "$" : planCurr}${Number(planAmount).toFixed(2)}${cycleLabel(planCycle)}`;

  if (loading) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Plan & Billing</Text>
        <View style={{ width: size.hitMd }} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan card */}
        <View style={styles.planCard}>
          <View style={styles.planTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>Current Plan</Text>
              <Text style={styles.planName}>{planName}</Text>
              <Text style={styles.planPrice}>{priceText}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${statusColor(subStatus)}22`,
                  borderColor: `${statusColor(subStatus)}66`,
                },
              ]}
            >
              <Text
                style={[styles.statusText, { color: statusColor(subStatus) }]}
              >
                {statusLabel(subStatus, cancelSoon)}
              </Text>
            </View>
          </View>
          {subscription?.nextDueDate && !isFree && (
            <Text style={styles.billingNote}>
              {cancelSoon ? "Access until" : "Next billing"}:{" "}
              {formatDate(subscription.nextDueDate)}
            </Text>
          )}
          {subscription?.cardLast4 && !isFree && (
            <Text style={styles.billingNote}>
              Charged to •••• {subscription.cardLast4}
            </Text>
          )}
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() =>
              router.push("/components/billing/SubscriptionPlansScreen")
            }
            activeOpacity={0.85}
          >
            <Text style={styles.upgradeBtnText}>
              {isFree ? "Upgrade Plan" : "Change Plan"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Billing history section */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Billing History</Text>
            <TouchableOpacity
              onPress={() =>
                router.push("/components/billing/BillingHistoryScreen")
              }
              activeOpacity={0.75}
            >
              <Text style={styles.sectionLink}>View all →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.historyHint}>
            <Text style={styles.historyHintText}>
              View your past invoices and download receipts
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + pad.sm, // was: + 10
    paddingBottom: pad.sm, // was: sz.headerPaddingBottom
    paddingHorizontal: pad.md, // was: sz.headerPaddingH
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  backBtn: {
    width: size.hitMd, // was: sz.backBtnSize
    height: size.hitMd,
    borderRadius: size.hitMd / 2, // was: sz.backBtnBorderRadius
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontFamily: FONTS.bold, fontSize: font.xl, color: C.teal },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    letterSpacing: 0.3,
  },

  scroll: { padding: pad.md, paddingTop: pad.lg }, // was: sz.scrollPadding / scrollPaddingTop

  // Plan card
  planCard: {
    backgroundColor: C.surface,
    borderRadius: radius.xl, // was: sz.planCardBorderRadius
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: pad.md, // was: sz.planCardPadding
    marginBottom: pad.lg, // was: sz.planCardMarginBottom
  },
  planTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: pad.sm,
  },
  planLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.sm, // was: sz.planLabelFontSize
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: pad.xs,
  },
  planName: {
    fontFamily: FONTS.bold,
    fontSize: font.h2,
    color: C.teal,
    letterSpacing: 0.2,
  },
  planPrice: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textSec,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: radius.sm, // was: sz.statusBadgeBorderRadius
    borderWidth: 1,
    paddingHorizontal: pad.sm, // was: sz.statusBadgePaddingH
    paddingVertical: pad.xs / 2, // was: sz.statusBadgePaddingV
  },
  statusText: { fontFamily: FONTS.bold, fontSize: font.sm, letterSpacing: 0.3 },
  billingNote: {
    fontFamily: FONTS.light,
    fontSize: font.md, // was: sz.nextBillingFontSize
    color: C.textMuted,
    marginBottom: pad.xs,
  },
  upgradeBtn: {
    backgroundColor: C.teal,
    borderRadius: radius.md, // was: sz.upgradeBtnBorderRadius
    paddingVertical: pad.sm, // was: sz.upgradeBtnPaddingV
    alignItems: "center",
    marginTop: pad.s,
  },
  upgradeBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: "#08081a",
  },

  // Section cards
  section: {
    backgroundColor: C.surface,
    borderRadius: radius.lg, // was: sz.sectionBorderRadius
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: pad.md, // was: sz.sectionPadding
    marginBottom: pad.md, // was: sz.sectionMarginBottom
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: pad.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textPri,
    letterSpacing: 0.3,
  },
  sectionLink: { fontFamily: FONTS.bold, fontSize: font.md, color: C.teal },

  // Card row (payment method preview)
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardChip: {
    width: size.chipW, // was: sz.cardChipWidth
    height: size.chipH, // was: sz.cardChipHeight
    borderRadius: radius.xs, // was: sz.cardChipBorderRadius
    alignItems: "center",
    justifyContent: "center",
  },
  cardChipText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: "#fff",
    letterSpacing: 0.5,
  },
  cardNum: { fontFamily: FONTS.bold, fontSize: font.md, color: C.textPri },
  cardExp: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: C.tealDim,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.s,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: C.teal,
  },

  // Add card CTA (dashed)
  addCardBtn: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.tealBorder,
    paddingVertical: pad.sm,
    alignItems: "center",
  },
  addCardText: { fontFamily: FONTS.bold, fontSize: font.md, color: C.teal },

  // History hint
  historyHint: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: radius.sm,
    padding: pad.sm,
  },
  historyHintText: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    fontStyle: "italic",
  },
});
