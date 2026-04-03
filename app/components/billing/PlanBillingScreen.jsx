// app/components/billing/PlanBillingScreen.jsx
//
// Main Plan & Billing hub — fully wired to real backend APIs:
//   GET /subscriptions/my         → current subscription
//   GET /account/payments/methods → saved cards

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
import { fetchMySubscription, fetchPaymentMethods } from "../../services/subscriptionService";

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
  visa: "#1A1F71", mastercard: "#EB001B", amex: "#007BC1", discover: "#FF6600",
};

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function cycleLabel(cycle) {
  switch (cycle) {
    case "MONTHLY":  return "/mo";
    case "YEARLY":   return "/yr";
    case "LIFETIME": return " (one-time)";
    default:         return "";
  }
}

function statusColor(status) {
  switch (status) {
    case "ACTIVE":    return C.green;
    case "TRIAL":     return C.teal;
    case "PAST_DUE":  return C.yellow;
    case "CANCELLED":
    case "EXPIRED":   return C.red;
    default:          return C.textMuted;
  }
}

function statusLabel(status, cancelAtPeriodEnd) {
  if (cancelAtPeriodEnd) return "Cancels soon";
  switch (status) {
    case "ACTIVE":    return "Active";
    case "TRIAL":     return "Trial";
    case "PAST_DUE":  return "Past Due";
    case "CANCELLED": return "Cancelled";
    case "EXPIRED":   return "Expired";
    default:          return status ?? "—";
  }
}

export default function PlanBillingScreen() {
  const router = useRouter();
  const { execute } = useApiCall();

  const [subscription, setSubscription] = useState(null);
  const [defaultCard, setDefaultCard]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      execute(() => fetchMySubscription(), {
        errorDisplay: "none",
        onSuccess: (sub) => setSubscription(sub ?? null),
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
    Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [execute]);

  useEffect(() => { loadData(); }, []);

  const isFree      = !subscription || subscription.billingCycle === "NONE";
  const planName    = subscription?.packageName ?? "Free";
  const planAmount  = subscription?.amount ?? 0;
  const planCurr    = subscription?.currency ?? "USD";
  const planCycle   = subscription?.billingCycle ?? "NONE";
  const subStatus   = subscription?.status ?? "ACTIVE";
  const cancelSoon  = subscription?.cancelAtPeriodEnd === true;

  const priceText = planAmount === 0
    ? "Free"
    : `${planCurr === "USD" ? "$" : planCurr}${Number(planAmount).toFixed(2)}${cycleLabel(planCycle)}`;

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Plan & Billing</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Current plan ── */}
        <View style={s.planCard}>
          <View style={s.planTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.planLabel}>Current Plan</Text>
              <Text style={s.planName}>{planName}</Text>
              <Text style={s.planPrice}>{priceText}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: `${statusColor(subStatus)}22`, borderColor: `${statusColor(subStatus)}66` }]}>
              <Text style={[s.statusText, { color: statusColor(subStatus) }]}>
                {statusLabel(subStatus, cancelSoon)}
              </Text>
            </View>
          </View>

          {subscription?.nextDueDate && !isFree && (
            <Text style={s.nextBilling}>
              {cancelSoon ? "Access until" : "Next billing"}: {formatDate(subscription.nextDueDate)}
            </Text>
          )}

          {subscription?.cardLast4 && !isFree && (
            <Text style={s.chargedTo}>Charged to •••• {subscription.cardLast4}</Text>
          )}

          <TouchableOpacity
            style={s.upgradeBtn}
            onPress={() => router.push("/components/billing/SubscriptionPlansScreen")}
            activeOpacity={0.85}
          >
            <Text style={s.upgradeBtnText}>{isFree ? "Upgrade Plan" : "Change Plan"}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Payment method ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Payment Method</Text>
            <TouchableOpacity onPress={() => router.push("/components/billing/PaymentMethodScreen")} activeOpacity={0.75}>
              <Text style={s.sectionLink}>Manage →</Text>
            </TouchableOpacity>
          </View>

          {defaultCard ? (
            <View style={s.cardRow}>
              <View style={[s.cardChip, { backgroundColor: BRAND_COLORS[defaultCard.brand?.toLowerCase()] ?? C.teal }]}>
                <Text style={s.cardChipText}>{(defaultCard.brand ?? "CARD").slice(0, 4).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.cardNum}>{defaultCard.brand?.toUpperCase()} •••• {defaultCard.last4}</Text>
                <Text style={s.cardExp}>Expires {defaultCard.expMonth}/{defaultCard.expYear}</Text>
              </View>
              <View style={s.defaultBadge}><Text style={s.defaultBadgeText}>Default</Text></View>
            </View>
          ) : (
            <TouchableOpacity style={s.addCardBtn} onPress={() => router.push("/components/billing/PaymentMethodScreen")} activeOpacity={0.85}>
              <Text style={s.addCardText}>+ Add Payment Method</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Billing history ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Billing History</Text>
            <TouchableOpacity onPress={() => router.push("/components/billing/BillingHistoryScreen")} activeOpacity={0.75}>
              <Text style={s.sectionLink}>View all →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.historyHint}>
            <Text style={s.historyHintText}>View your past invoices and download receipts</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + 10, paddingBottom: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,188,212,0.12)",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { fontFamily: FONTS.bold, fontSize: 18, color: C.teal },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: C.textPri, letterSpacing: 0.3 },
  scroll: { padding: 18, paddingTop: 20 },

  planCard: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.tealBorder,
    padding: 18, marginBottom: 20,
  },
  planTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  planLabel: { fontFamily: FONTS.bold, fontSize: 10, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  planName: { fontFamily: FONTS.bold, fontSize: 26, color: C.teal, letterSpacing: 0.2 },
  planPrice: { fontFamily: FONTS.light, fontSize: 15, color: C.textSec, marginTop: 2 },
  statusBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3 },
  nextBilling: { fontFamily: FONTS.light, fontSize: 12, color: C.textMuted, marginBottom: 4 },
  chargedTo: { fontFamily: FONTS.light, fontSize: 12, color: C.textMuted, marginBottom: 14 },
  upgradeBtn: { backgroundColor: C.teal, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  upgradeBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: "#08081a" },

  section: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    padding: 16, marginBottom: 16,
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 13, color: C.textPri, letterSpacing: 0.3 },
  sectionLink: { fontFamily: FONTS.bold, fontSize: 12, color: C.teal },

  cardRow: { flexDirection: "row", alignItems: "center" },
  cardChip: { width: 44, height: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  cardChipText: { fontFamily: FONTS.bold, fontSize: 8, color: "#fff", letterSpacing: 0.5 },
  cardNum: { fontFamily: FONTS.bold, fontSize: 14, color: C.textPri },
  cardExp: { fontFamily: FONTS.light, fontSize: 11, color: C.textMuted, marginTop: 2 },
  defaultBadge: { backgroundColor: C.tealDim, borderRadius: 8, borderWidth: 1, borderColor: C.tealBorder, paddingHorizontal: 8, paddingVertical: 3 },
  defaultBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: C.teal },
  addCardBtn: { borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.tealBorder, paddingVertical: 14, alignItems: "center" },
  addCardText: { fontFamily: FONTS.bold, fontSize: 13, color: C.teal },

  historyHint: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 },
  historyHintText: { fontFamily: FONTS.light, fontSize: 12, color: C.textMuted, fontStyle: "italic" },
});
