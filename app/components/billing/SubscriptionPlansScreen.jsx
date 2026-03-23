// app/components/billing/SubscriptionPlansScreen.jsx
//
// Plan selection screen. Shows all plans with features, pricing toggle
// (monthly / yearly), and a confirmation flow before changing plan.

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
import {
  getSubscription,
  updateSubscription,
  getPlanById,
} from "../../services/billingService";
import { PLANS } from "../../data/billingData";

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
  yellow: "#FFD54F",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [currentPlanId, setCurrentPlanId] = useState("free");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null); // planId being upgraded to

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const toggleX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getSubscription()
      .then((sub) => {
        setCurrentPlanId(sub.planId);
        setBillingCycle(sub.billingCycle ?? "monthly");
      })
      .finally(() => {
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
  }, []);

  const toggleCycle = (cycle) => {
    setBillingCycle(cycle);
    Animated.spring(toggleX, {
      toValue: cycle === "monthly" ? 0 : 1,
      friction: 7,
      tension: 80,
      useNativeDriver: false,
    }).start();
  };

  const handleSelectPlan = (plan) => {
    if (plan.id === currentPlanId) return;

    const isDowngrade = PLANS.findIndex((p) => p.id === plan.id) <
      PLANS.findIndex((p) => p.id === currentPlanId);

    const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    const priceStr = price === 0 ? "Free" : `$${price}/mo`;

    Alert.alert(
      isDowngrade ? "Downgrade Plan" : "Upgrade Plan",
      `Switch to ${plan.name} (${priceStr})?\n\nChanges take effect immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isDowngrade ? "Downgrade" : "Upgrade",
          style: isDowngrade ? "destructive" : "default",
          onPress: () => confirmPlanChange(plan.id),
        },
      ],
    );
  };

  const confirmPlanChange = async (planId) => {
    try {
      setUpgrading(planId);
      await updateSubscription(planId, billingCycle);
      setCurrentPlanId(planId);
      Alert.alert(
        "Plan Updated",
        `You're now on the ${getPlanById(planId).name} plan!`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Error", "Failed to update subscription. Please try again.");
    } finally {
      setUpgrading(null);
    }
  };

  const toggleLeft = toggleX.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "51%"],
  });

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Choose a Plan</Text>
          <Text style={styles.subtitle}>Upgrade or downgrade anytime</Text>
        </View>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Billing cycle toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleTrack}>
            <Animated.View style={[styles.toggleThumb, { left: toggleLeft }]} />
            <TouchableOpacity style={styles.toggleOption} onPress={() => toggleCycle("monthly")} activeOpacity={0.8}>
              <Text style={[styles.toggleText, billingCycle === "monthly" && styles.toggleTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleOption} onPress={() => toggleCycle("yearly")} activeOpacity={0.8}>
              <Text style={[styles.toggleText, billingCycle === "yearly" && styles.toggleTextActive]}>
                Yearly <Text style={styles.savingsBadge}>Save 20%</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isUpgrading = upgrading === plan.id;
          const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { borderColor: plan.borderColor },
                isCurrent && styles.planCardCurrent,
                plan.popular && styles.planCardPopular,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
                </View>
              )}

              {/* Plan header */}
              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>
                </View>
                <View style={styles.priceBlock}>
                  <Text style={[styles.priceAmount, { color: plan.color }]}>
                    {price === 0 ? "Free" : `$${price}`}
                  </Text>
                  {price > 0 && (
                    <Text style={styles.pricePer}>/mo</Text>
                  )}
                </View>
              </View>

              {billingCycle === "yearly" && price > 0 && (
                <Text style={styles.yearlyNote}>
                  Billed ${(price * 12).toFixed(2)}/year
                </Text>
              )}

              {/* Features */}
              <View style={styles.featureList}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={[styles.featureMark, { color: f.included ? plan.color : C.textMuted }]}>
                      {f.included ? "✓" : "✗"}
                    </Text>
                    <Text style={[styles.featureText, !f.included && styles.featureTextDim]}>
                      {f.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={[
                  styles.ctaBtn,
                  { backgroundColor: isCurrent ? "rgba(255,255,255,0.06)" : plan.color },
                  isCurrent && styles.ctaBtnCurrent,
                ]}
                onPress={() => handleSelectPlan(plan)}
                disabled={isCurrent || isUpgrading}
                activeOpacity={0.85}
              >
                {isUpgrading ? (
                  <ActivityIndicator color="#08081a" size="small" />
                ) : (
                  <Text style={[styles.ctaText, isCurrent && styles.ctaTextCurrent]}>
                    {isCurrent ? "Current Plan ✓" : plan.cta}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  title: { fontSize: 18, fontWeight: "900", color: C.textPri },
  subtitle: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  scroll: { padding: 18 },

  // Toggle
  toggleContainer: { alignItems: "center", marginBottom: 24 },
  toggleTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 3,
    width: 260,
    height: 44,
    position: "relative",
  },
  toggleThumb: {
    position: "absolute",
    top: 3,
    width: "48%",
    height: 38,
    backgroundColor: C.teal,
    borderRadius: 11,
  },
  toggleOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  toggleText: { fontSize: 13, fontWeight: "700", color: C.textMuted },
  toggleTextActive: { color: "#08081a" },
  savingsBadge: { fontSize: 9, fontWeight: "900", color: "#08081a" },

  // Plan card
  planCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
  },
  planCardCurrent: { backgroundColor: "rgba(255,255,255,0.07)" },
  planCardPopular: { borderWidth: 2 },
  popularBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,213,79,0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,213,79,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  popularBadgeText: { fontSize: 9, fontWeight: "900", color: C.yellow, letterSpacing: 1 },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  planName: { fontSize: 22, fontWeight: "900" },
  planTagline: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  priceBlock: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  priceAmount: { fontSize: 28, fontWeight: "900" },
  pricePer: { fontSize: 13, color: C.textMuted },
  yearlyNote: { fontSize: 10, color: C.textMuted, marginBottom: 14, fontStyle: "italic" },
  featureList: { marginTop: 12, marginBottom: 16, gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureMark: { fontSize: 13, fontWeight: "900", width: 16 },
  featureText: { fontSize: 12, color: C.textSec, flex: 1 },
  featureTextDim: { color: C.textMuted, textDecorationLine: "line-through", opacity: 0.5 },
  ctaBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaBtnCurrent: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  ctaText: { fontSize: 14, fontWeight: "800", color: "#08081a" },
  ctaTextCurrent: { color: C.textMuted },
});
