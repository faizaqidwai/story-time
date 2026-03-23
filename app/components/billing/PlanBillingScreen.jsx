// app/components/billing/PlanBillingScreen.jsx
//
// Main Plan & Billing hub screen.
// Shows: current plan summary, next billing date, default payment method,
//        quick links to upgrade, manage payment, billing history.

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "../../_contexts/UserContext";
import {
  getSubscription,
  getPaymentMethods,
  cancelSubscription,
  getPlanById,
} from "../../services/billingService";
import { PLANS } from "../../data/billingData";

const { width: SW } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
  yellow: "#FFD54F",
  green: "#4CAF50",
  red: "#EF5350",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function CardBrandIcon({ brand }) {
  const icons = { visa: "💳", mastercard: "💳", amex: "💳", discover: "💳" };
  return <Text style={{ fontSize: 20 }}>{icons[brand] ?? "💳"}</Text>;
}

export default function PlanBillingScreen() {
  const router = useRouter();
  const { currentProfile } = useUser();

  const [subscription, setSubscription] = useState(null);
  const [defaultCard, setDefaultCard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sub, methods] = await Promise.all([
        getSubscription(),
        getPaymentMethods(),
      ]);
      setSubscription(sub);
      setDefaultCard(methods.find((m) => m.isDefault) ?? methods[0] ?? null);
    } catch (e) {
      Alert.alert("Error", "Failed to load billing information.");
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Your subscription will remain active until the end of the current billing period.",
      [
        { text: "Keep Plan", style: "cancel" },
        {
          text: "Cancel Plan",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await cancelSubscription(true);
              setSubscription(updated);
            } catch {
              Alert.alert("Error", "Could not cancel subscription.");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );
  }

  const plan = getPlanById(subscription?.planId ?? "free");
  const isFree = plan.id === "free";
  const isCancelled = subscription?.cancelAtPeriodEnd;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Plan & Billing</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Current Plan Card ── */}
        <View style={[styles.planCard, { borderColor: plan.borderColor }]}>
          <View style={[styles.planCardBg, { backgroundColor: plan.accentColor }]} />

          <View style={styles.planCardTop}>
            <View>
              <Text style={styles.planCardLabel}>Current Plan</Text>
              <Text style={[styles.planCardName, { color: plan.color }]}>{plan.name}</Text>
              {plan.monthlyPrice > 0 ? (
                <Text style={styles.planCardPrice}>
                  ${subscription?.billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice}
                  <Text style={styles.planCardPer}>
                    /{subscription?.billingCycle === "yearly" ? "mo (billed yearly)" : "mo"}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.planCardPrice}>Free</Text>
              )}
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: isCancelled ? "rgba(239,83,80,0.15)" : "rgba(76,175,80,0.15)",
              borderColor: isCancelled ? C.red : C.green,
            }]}>
              <Text style={[styles.statusText, { color: isCancelled ? C.red : C.green }]}>
                {isCancelled ? "Cancels soon" : "Active"}
              </Text>
            </View>
          </View>

          {subscription?.currentPeriodEnd && !isFree && (
            <Text style={styles.nextBilling}>
              {isCancelled ? "Access until" : "Next billing"}: {formatDate(subscription.currentPeriodEnd)}
            </Text>
          )}

          {/* Action buttons */}
          <View style={styles.planActions}>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push("/components/billing/SubscriptionPlansScreen")}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeBtnText}>
                {isFree ? "Upgrade Plan" : "Change Plan"}
              </Text>
            </TouchableOpacity>
            {!isFree && !isCancelled && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelSubscription}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Features summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's included</Text>
          {plan.features.filter((f) => f.included).map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.featureCheck, { color: plan.color }]}>✓</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Payment Method ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity
              onPress={() => router.push("/components/billing/PaymentMethodScreen")}
              activeOpacity={0.75}
            >
              <Text style={styles.sectionLink}>Manage →</Text>
            </TouchableOpacity>
          </View>

          {defaultCard ? (
            <View style={styles.cardRow}>
              <CardBrandIcon brand={defaultCard.brand} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardNumber}>
                  {defaultCard.brand.toUpperCase()} •••• {defaultCard.last4}
                </Text>
                <Text style={styles.cardExpiry}>
                  Expires {defaultCard.expMonth}/{defaultCard.expYear}
                </Text>
              </View>
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addCardBtn}
              onPress={() => router.push("/components/billing/PaymentMethodScreen")}
              activeOpacity={0.85}
            >
              <Text style={styles.addCardText}>+ Add Payment Method</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Billing History ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Billing History</Text>
            <TouchableOpacity
              onPress={() => router.push("/components/billing/BillingHistoryScreen")}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { fontSize: 18, color: C.teal, fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "900", color: C.textPri, letterSpacing: 0.3 },
  scroll: { padding: 18, paddingTop: 20 },

  // Plan card
  planCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 24,
    overflow: "hidden",
    backgroundColor: C.surface,
  },
  planCardBg: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  planCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  planCardLabel: { fontSize: 11, color: C.textMuted, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  planCardName: { fontSize: 28, fontWeight: "900", letterSpacing: 0.3 },
  planCardPrice: { fontSize: 20, fontWeight: "900", color: C.textPri, marginTop: 4 },
  planCardPer: { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  statusBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  nextBilling: { fontSize: 12, color: C.textMuted, marginBottom: 16 },
  planActions: { flexDirection: "row", gap: 10 },
  upgradeBtn: {
    flex: 1, backgroundColor: C.teal, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
  },
  upgradeBtnText: { fontSize: 14, fontWeight: "800", color: "#08081a" },
  cancelBtn: {
    paddingHorizontal: 16, borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: "rgba(239,83,80,0.4)",
    backgroundColor: "rgba(239,83,80,0.08)",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: C.red },

  // Section
  section: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: C.textPri, letterSpacing: 0.3 },
  sectionLink: { fontSize: 12, fontWeight: "700", color: C.teal },

  // Features
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  featureCheck: { fontSize: 14, fontWeight: "900", width: 18 },
  featureText: { fontSize: 13, color: C.textSec, flex: 1 },

  // Payment method
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardNumber: { fontSize: 14, fontWeight: "700", color: C.textPri },
  cardExpiry: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  defaultBadge: {
    backgroundColor: C.tealDim, borderRadius: 8,
    borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "800", color: C.teal },
  addCardBtn: {
    borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: C.tealBorder, paddingVertical: 14, alignItems: "center",
  },
  addCardText: { fontSize: 13, fontWeight: "700", color: C.teal },

  // History hint
  historyHint: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10, padding: 12,
  },
  historyHintText: { fontSize: 12, color: C.textMuted, fontStyle: "italic" },
});
