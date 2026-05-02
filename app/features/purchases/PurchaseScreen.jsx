// app/components/billing/PurchaseScreen.jsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Alert, Platform, StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FONTS } from "../../theme";
import { useRevenueCat } from "../../_contexts/RevenueCatContext";
import { useSubscription } from "../../_contexts/SubscriptionContext";
import { useLevelAccess } from "../../_contexts/LevelAccessContext";
import { useUser } from "../../_contexts/UserContext";
import { useNotify } from "../../_contexts/NotificationContext";
import { font, pad, radius, size } from "../../theme/tokens";
import { APP_CONFIG } from "../../config/appConfig";
import { simulateWebhookPurchase } from "../../services/revenueCatService.mock";
import { fetchMySubscription } from "../../services/subscriptionService";

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
  green: "#4CAF50",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

function billingLabel(billingCycle) {
  switch (billingCycle) {
    case "MONTHLY":  return "billed monthly";
    case "YEARLY":   return "billed yearly";
    case "LIFETIME": return "one-time payment";
    default:         return "";
  }
}

function resolvePrice(pkg) {
  if (pkg?.priceString && pkg.priceString.trim()) return pkg.priceString;
  if (!pkg?.price || Number(pkg.price) === 0) return "Free";
  const sym = pkg.currency === "USD" ? "$" : pkg.currency === "SAR" ? "﷼" : (pkg.currency ?? "");
  return `${sym}${Number(pkg.price).toFixed(2)}`;
}

function FeatureRow({ feature, accentColor }) {
  if (!feature.enabled) return null;
  return (
    <View style={styles.featureRow}>
      <Text style={[styles.featureCheck, { color: accentColor }]}>✓</Text>
      <Text style={styles.featureLabel}>{feature.label}</Text>
    </View>
  );
}

function RestoreLink({ onRestore, restoring }) {
  return (
    <TouchableOpacity style={styles.restoreWrap} onPress={onRestore} disabled={restoring} activeOpacity={0.7}>
      {restoring
        ? <ActivityIndicator color={C.textMuted} size="small" />
        : <Text style={styles.restoreText}>Restore purchases</Text>}
    </TouchableOpacity>
  );
}

function NoPackageScreen({ onBack }) {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>📦</Text>
        <Text style={styles.errorTitle}>No Plan Selected</Text>
        <Text style={styles.errorSubtitle}>Please go back and choose a plan to continue.</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={onBack}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PackageUnavailableScreen({ pkg, onBack, onRetry, retrying }) {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Plan Temporarily Unavailable</Text>
        <Text style={styles.errorSubtitle}>
          {`The ${pkg?.name ?? "selected"} plan couldn't be loaded right now. Please try again or go back and select another plan.`}
        </Text>
        <TouchableOpacity style={styles.errorBtn} onPress={onRetry} disabled={retrying} activeOpacity={0.85}>
          {retrying
            ? <ActivityIndicator color="#08081a" size="small" />
            : <Text style={styles.errorBtnText}>Try Again</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.errorBtnSecondary} onPress={onBack} activeOpacity={0.75}>
          <Text style={styles.errorBtnSecondaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PurchaseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const notify = useNotify();

  let pkg = null;
  try {
    pkg = params.packageJson ? JSON.parse(params.packageJson) : null;
  } catch (err) {
    console.error("[PurchaseScreen] Failed to parse packageJson param:", err);
    pkg = null;
  }

  const { purchase, restorePurchases, enrichedPackages, reloadOfferings, offeringsLoading } = useRevenueCat();
  const { refreshSubscription, subscription, updateSubscription } = useSubscription();
  const { initForProfile }     = useLevelAccess();
  const { currentProfile, userAccount } = useUser();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring]   = useState(false);
  const [retrying, setRetrying]     = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    console.log("[CHECKOUT LIFECYCLE] CHECKOUT MOUNTED");
    return () => console.log("[CHECKOUT LIFECYCLE] CHECKOUT UNMOUNTED");
  }, []);

  if (!pkg) return <NoPackageScreen onBack={() => router.back()} />;

  const pkgIdentifier = pkg.identifier || pkg.rcIdentifier;
  const enrichedPkg   = enrichedPackages.find(
    (ep) => ep.rcIdentifier === pkgIdentifier || ep.identifier === pkgIdentifier || ep.id === pkg.id,
  );
  const rcPackage = enrichedPkg?.rcPackage ?? null;

  const handleRetry = async () => {
    setRetrying(true);
    await reloadOfferings();
    setRetrying(false);
  };

  if (!offeringsLoading && !rcPackage && pkgIdentifier) {
    return <PackageUnavailableScreen pkg={pkg} onBack={() => router.back()} onRetry={handleRetry} retrying={retrying} />;
  }

  const accentColor = pkg.accentColorRgb ? `rgb(${pkg.accentColorRgb})` : C.teal;
  const priceString = resolvePrice(enrichedPkg ?? pkg);
  const cycleLabel  = billingLabel(pkg.billingCycle);
  const features    = (pkg.displayFeatures ?? []).filter((f) => f.enabled).slice(0, 5);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const hasSubscriptionChanged = (beforeSub, sub) => {
    const beforeIsDefault  = !beforeSub?.rcProductId;
    const currentIsDefault = !sub?.rcProductId;
    return (
      (beforeIsDefault && !currentIsDefault) ||
      (sub?.rcTransactionId && sub.rcTransactionId !== beforeSub?.rcTransactionId) ||
      (sub?.nextDueDate !== beforeSub?.nextDueDate) ||
      (sub?.rcProductId !== beforeSub?.rcProductId)
    );
  };

  const waitForSubscriptionUpdate = async (beforeSub, retries = 6, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      const sub = await fetchMySubscription();
      if (hasSubscriptionChanged(beforeSub, sub)) return sub;
      await sleep(delay);
    }
    return null;
  };

  // Single navigate-back used by both sheet onDismiss callbacks
  const navigateBack = useCallback(() => {
    router.dismiss(3);
  }, [router]);

  const handleConfirm = useCallback(() => {
    if (!rcPackage) {
      Alert.alert("Not Available", "This plan isn't available for purchase right now. Please try again later.", [{ text: "OK" }]);
      return;
    }
    Alert.alert(
      "Confirm Subscription",
      `Subscribe to ${pkg.name} for ${priceString}${cycleLabel ? ` (${cycleLabel})` : ""}.\n\nYou can cancel anytime from your ${Platform.OS === "ios" ? "Apple ID" : "Google Play"} settings.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Subscribe", onPress: doPurchase },
      ],
    );
  }, [rcPackage, pkg, priceString, cycleLabel]);

  const doPurchase = useCallback(async () => {
    setPurchasing(true);
    try {
      const beforeSub = subscription;

      // Step 1: RC purchase
      await purchase(rcPackage);

      // Step 2: Mock only — simulate webhook so backend creates subscription
      if (APP_CONFIG.MOCK_IAP) {
        const rcProductId   = pkg.rcProductId ?? pkg.identifier;
        const userAccountId = userAccount?.id ?? null;
        await simulateWebhookPurchase(userAccountId, rcProductId);
      }

      // Step 3: Poll backend for subscription update (up to 6s)
      const updatedSub = await waitForSubscriptionUpdate(beforeSub);

      if (updatedSub) {
        updateSubscription(updatedSub);
      } else {
        await refreshSubscription();
      }

      // Step 4: Refresh level access (best-effort)
      if (currentProfile) {
        try {
          await initForProfile(currentProfile);
        } catch (err) {
          console.warn("[PurchaseScreen] initForProfile failed:", err?.message);
        }
      }

      // Step 5: Show result sheet — navigate on dismiss
      if (updatedSub) {
        // ── SUCCESS ────────────────────────────────────────────────────────────
        notify.sheet.success({
          message: `Welcome to ${updatedSub.packageName}! 🎉`,
          subMessage: "Your subscription is now active. Enjoy unlimited reading!",
          icon: pkg.icon ?? "🎉",
          autoDismissMs: 0,
          onDismiss: navigateBack,
        });
      } else {
        // ── PROCESSING (polling timed out — payment accepted, backend slow) ────
        // Not an error — payment went through, backend just needs a moment.
        // We use the error sheet visually because it draws attention,
        // but the message is calm and reassuring, not alarming.
        notify.sheet.error({
          message: "Payment Received",
          subMessage:
            "We are processing your payment and will update you shortly. Your plan will appear in a few moments — please check back soon.",
          onDismiss: navigateBack,
        });
      }
    } catch (err) {
      if (err?.userCancelled) {
        console.log("[PurchaseScreen] User cancelled purchase");
        return;
      }
      console.error("[PurchaseScreen] Purchase failed:", err?.message);
      Alert.alert(
        "Purchase Failed",
        err?.message ?? "Something went wrong. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setPurchasing(false);
    }
  }, [
    subscription, purchase, rcPackage, pkg, userAccount,
    updateSubscription, refreshSubscription, initForProfile,
    currentProfile, notify, navigateBack,
  ]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      await refreshSubscription();
      notify.sheet.success({
        message: "Purchases Restored",
        subMessage: "Your previous subscription has been restored successfully.",
        icon: "✅",
        autoDismissMs: 0,
        onDismiss: navigateBack,
      });
    } catch (err) {
      Alert.alert("Restore Failed", err?.message ?? "Nothing to restore, or an error occurred.", [{ text: "OK" }]);
    } finally {
      setRestoring(false);
    }
  }, [restorePurchases, refreshSubscription, notify, navigateBack]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: size.hitMd }} />
      </View>

      {offeringsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={styles.loadingText}>Loading plan details…</Text>
        </View>
      ) : (
        <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Order Summary</Text>
          <View style={[styles.orderCard, { borderColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.35)`, borderTopColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.70)`, backgroundColor: pkg.darkBg ?? "#03080a" }]}>
            <View style={styles.planHeader}>
              <View style={[styles.planIcon, { borderColor: accentColor, backgroundColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.12)` }]}>
                <Text style={styles.planIconEmoji}>{pkg.icon ?? "📦"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planName, { color: accentColor }]}>{pkg.name}</Text>
                {!!pkg.tagLine && <Text style={styles.planTagline}>{pkg.tagLine}</Text>}
              </View>
            </View>
            {!!pkg.description && <Text style={styles.planDesc}>{pkg.description}</Text>}
            <View style={[styles.pricePill, { borderColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.25)`, backgroundColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.07)` }]}>
              <Text style={[styles.priceAmount, { color: accentColor }]}>{priceString}</Text>
              {!!cycleLabel && <Text style={styles.priceCycle}>{cycleLabel}</Text>}
            </View>
            {features.map((f, i) => <FeatureRow key={f.key ?? i} feature={f} accentColor={accentColor} />)}
            {!!pkg.trialDays && pkg.trialDays > 0 && (
              <View style={styles.trialBanner}>
                <Text style={[styles.trialText, { color: accentColor }]}>🎁  {pkg.trialDays}-day free trial included</Text>
              </View>
            )}
          </View>

          <View style={styles.howItWorksCard}>
            <Text style={styles.howTitle}>How payment works</Text>
            <Text style={styles.howBody}>
              {Platform.OS === "ios"
                ? "Payment is charged to your Apple ID. Your subscription renews automatically unless cancelled at least 24 hours before the end of the current period in your Apple ID settings."
                : "Payment is charged to your Google account. You can manage or cancel your subscription in Google Play Store settings at any time."}
            </Text>
          </View>

          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalAmount, { color: accentColor }]}>{priceString}</Text>
            </View>
            {!!cycleLabel && <Text style={styles.totalCycle}>{cycleLabel}</Text>}
          </View>

          <Text style={styles.policyNote}>
            You can manage or cancel your subscription anytime from your{" "}
            {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account settings. No hidden fees.
          </Text>

          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: accentColor }, (!rcPackage || purchasing) && styles.checkoutBtnDisabled]}
            onPress={handleConfirm}
            disabled={!rcPackage || purchasing}
            activeOpacity={0.88}
          >
            <View style={styles.btnShine} />
            {purchasing
              ? <ActivityIndicator color="#08081a" size="small" />
              : (<>
                  <Text style={styles.btnEmoji}>⚡</Text>
                  <Text style={styles.btnText}>{pkg.ctaLabel ?? `Subscribe to ${pkg.name}`}</Text>
                </>)}
          </TouchableOpacity>

          <RestoreLink onRestore={handleRestore} restoring={restoring} />
          <View style={{ height: 48 }} />
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: C.bg },
  center:             { flex: 1, justifyContent: "center", alignItems: "center", gap: pad.md, padding: pad.xl },
  loadingText:        { fontFamily: FONTS.light, fontSize: font.md, color: C.textMuted },
  errorEmoji:         { fontSize: size.iconXl },
  errorTitle:         { fontFamily: FONTS.bold, fontSize: font.xl, color: C.textPri, textAlign: "center" },
  errorSubtitle:      { fontFamily: FONTS.light, fontSize: font.md, color: C.textMuted, textAlign: "center", lineHeight: font.md * 1.5 },
  errorBtn:           { backgroundColor: C.teal, borderRadius: radius.md, paddingHorizontal: pad.xl, paddingVertical: pad.sm, marginTop: pad.sm },
  errorBtnText:       { fontFamily: FONTS.bold, fontSize: font.md, color: "#08081a" },
  errorBtnSecondary:  { paddingHorizontal: pad.xl, paddingVertical: pad.sm },
  errorBtnSecondaryText: { fontFamily: FONTS.regular, fontSize: font.md, color: C.textMuted, textDecorationLine: "underline" },
  header:             { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: STATUS_BAR_HEIGHT + pad.sm, paddingBottom: pad.md, paddingHorizontal: pad.md, borderBottomWidth: 1, borderBottomColor: "rgba(0,188,212,0.1)" },
  headerBack:         { width: size.hitMd, height: size.hitMd, borderRadius: size.hitMd / 2, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerBackIcon:     { fontFamily: FONTS.bold, fontSize: font.xl, color: C.teal },
  headerTitle:        { fontFamily: FONTS.bold, fontSize: font.xxl, color: C.textPri, letterSpacing: 0.3 },
  scroll:             { padding: pad.md, paddingTop: pad.lg },
  sectionLabel:       { fontFamily: FONTS.bold, fontSize: font.sm, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: pad.sm },
  orderCard:          { borderRadius: radius.xl, borderWidth: 1.5, borderTopWidth: 2, padding: pad.lg, marginBottom: pad.lg },
  planHeader:         { flexDirection: "row", alignItems: "center", gap: pad.md, marginBottom: pad.md },
  planIcon:           { width: 52, height: 52, borderRadius: radius.md, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  planIconEmoji:      { fontSize: font.xxl },
  planName:           { fontFamily: FONTS.bold, fontSize: font.xl, letterSpacing: 0.2 },
  planTagline:        { fontFamily: FONTS.light, fontSize: font.sm, color: C.textMuted, marginTop: 2 },
  planDesc:           { fontFamily: FONTS.regular, fontSize: font.sm, color: C.textMuted, lineHeight: font.sm * 1.5, marginBottom: pad.md },
  pricePill:          { flexDirection: "row", alignItems: "baseline", gap: pad.xs, alignSelf: "flex-start", borderRadius: radius.lg, borderWidth: 1, paddingVertical: pad.sm, paddingHorizontal: pad.lg, marginBottom: pad.md },
  priceAmount:        { fontFamily: FONTS.bold, fontSize: font.h3, letterSpacing: -0.3 },
  priceCycle:         { fontFamily: FONTS.light, fontSize: font.md, color: C.textMuted },
  featureRow:         { flexDirection: "row", alignItems: "center", gap: pad.sm, marginBottom: pad.xs },
  featureCheck:       { fontFamily: FONTS.bold, fontSize: font.md, width: 18 },
  featureLabel:       { fontFamily: FONTS.regular, fontSize: font.sm, color: C.textSec, flex: 1 },
  trialBanner:        { marginTop: pad.sm, paddingVertical: pad.xs, paddingHorizontal: pad.sm, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: radius.sm, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  trialText:          { fontFamily: FONTS.bold, fontSize: font.sm, textAlign: "center" },
  howItWorksCard:     { backgroundColor: C.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: pad.md, marginBottom: pad.lg },
  howTitle:           { fontFamily: FONTS.bold, fontSize: font.md, color: C.textPri, marginBottom: pad.xs },
  howBody:            { fontFamily: FONTS.light, fontSize: font.sm, color: C.textMuted, lineHeight: font.sm * 1.6 },
  totalCard:          { backgroundColor: C.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: pad.md, marginBottom: pad.lg },
  totalRow:           { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  totalLabel:         { fontFamily: FONTS.bold, fontSize: font.md, color: C.textSec },
  totalAmount:        { fontFamily: FONTS.bold, fontSize: font.h3, letterSpacing: -0.3 },
  totalCycle:         { fontFamily: FONTS.light, fontSize: font.sm, color: C.textMuted, marginTop: 4 },
  policyNote:         { fontFamily: FONTS.light, fontSize: font.sm, color: C.textMuted, textAlign: "center", lineHeight: font.sm * 1.6, marginBottom: pad.lg, paddingHorizontal: pad.sm },
  checkoutBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: pad.s, borderRadius: radius.pill, height: size.btnHeightLg, overflow: "hidden", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 10, marginBottom: pad.sm },
  checkoutBtnDisabled:{ opacity: 0.45 },
  btnShine:           { position: "absolute", top: 0, left: "14%", width: "38%", height: "52%", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 20, transform: [{ rotate: "-15deg" }] },
  btnEmoji:           { fontSize: font.lg },
  btnText:            { fontFamily: FONTS.bold, fontSize: font.lg, color: "#08081a", letterSpacing: 0.3 },
  restoreWrap:        { alignSelf: "center", paddingVertical: pad.sm },
  restoreText:        { fontFamily: FONTS.regular, fontSize: font.sm, color: C.textMuted, textDecorationLine: "underline" },
});
