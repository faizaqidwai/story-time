// app/components/billing/PurchaseScreen.jsx
//
// End-to-end purchase flow screen.
//
// Flow:
//  1. Load payment methods from GET /account/payments/methods
//  2. Show order summary (package details + price)
//  3. Show default card, or "Add Card" bottom sheet if none
//  4. Confirm → POST /subscriptions/package/purchase
//  5. Success sheet → navigate back to home/account
//
// Uses: useApiCall (execute + sheets), subscriptionService, billingService
// Matches project API call conventions (service layer → apiClient → execute hook)

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  TextInput,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FONTS } from "../../theme";
import { useApiCall } from "../../_hooks/useApiCall";
import {
  fetchPaymentMethods,
  purchasePackage,
  addPaymentMethod,
} from "../../services/subscriptionService";
import { useSubscription } from "../../_contexts/SubscriptionContext";

const { width: SW } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  card: "#0f1228",
  surface: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
  yellow: "#FFD54F",
  coral: "#FF6B6B",
  green: "#4CAF50",
  red: "#EF5350",
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(price, currency) {
  if (!price || price === 0) return "Free";
  const sym = currency === "USD" ? "$" : currency === "SAR" ? "﷼" : currency;
  return `${sym}${Number(price).toFixed(2)}`;
}

function billingLabel(billingCycle) {
  switch (billingCycle) {
    case "MONTHLY":
      return "billed monthly";
    case "YEARLY":
      return "billed yearly";
    case "LIFETIME":
      return "one-time payment";
    default:
      return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD CHIP — visual card brand badge
// ─────────────────────────────────────────────────────────────────────────────
function CardChip({ brand }) {
  const color = BRAND_COLORS[brand?.toLowerCase()] ?? C.teal;
  return (
    <View style={[chipS.chip, { backgroundColor: color }]}>
      <Text style={chipS.text}>
        {(brand ?? "Card").slice(0, 4).toUpperCase()}
      </Text>
    </View>
  );
}
const chipS = StyleSheet.create({
  chip: {
    width: 44,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: "#fff",
    letterSpacing: 0.5,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD CARD BOTTOM SHEET — reused from PaymentMethodScreen pattern
// ─────────────────────────────────────────────────────────────────────────────
function AddCardSheet({ visible, onClose, onAdd }) {
  const [brand, setBrand] = useState("visa");
  const [last4, setLast4] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [saving, setSaving] = useState(false);
  const brands = ["visa", "mastercard", "amex", "discover"];

  const reset = () => {
    setBrand("visa");
    setLast4("");
    setExpMonth("");
    setExpYear("");
  };

  const handleAdd = async () => {
    if (!last4 || last4.length !== 4 || !expMonth || !expYear) {
      Alert.alert("Invalid", "Please fill in all card details.");
      return;
    }
    setSaving(true);
    try {
      const newCard = await onAdd({
        brand,
        last4,
        expMonth: parseInt(expMonth),
        expYear: parseInt(expYear),
      });
      // Only close when card was actually saved — null means API error
      // (already shown as a sheet via execute), so keep the modal open
      if (newCard) {
        reset();
        onClose(newCard);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => onClose(null)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={sheetS.overlay}>
          <View style={sheetS.sheet}>
            <View style={sheetS.handle} />
            <Text style={sheetS.title}>Add Payment Card</Text>
            <Text style={sheetS.subtitle}>
              Your card details are entered securely.
            </Text>

            <Text style={sheetS.label}>Card Brand</Text>
            <View style={sheetS.brandRow}>
              {brands.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    sheetS.brandBtn,
                    brand === b && sheetS.brandBtnActive,
                  ]}
                  onPress={() => setBrand(b)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      sheetS.brandText,
                      brand === b && sheetS.brandTextActive,
                    ]}
                  >
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={sheetS.label}>Last 4 Digits</Text>
            <TextInput
              style={sheetS.input}
              placeholder="e.g. 4242"
              placeholderTextColor={C.textMuted}
              value={last4}
              onChangeText={(t) => setLast4(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={sheetS.label}>Exp Month</Text>
                <TextInput
                  style={sheetS.input}
                  placeholder="MM"
                  placeholderTextColor={C.textMuted}
                  value={expMonth}
                  onChangeText={(t) =>
                    setExpMonth(t.replace(/\D/g, "").slice(0, 2))
                  }
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sheetS.label}>Exp Year</Text>
                <TextInput
                  style={sheetS.input}
                  placeholder="YYYY"
                  placeholderTextColor={C.textMuted}
                  value={expYear}
                  onChangeText={(t) =>
                    setExpYear(t.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={sheetS.cancelBtn}
                onPress={() => onClose(null)}
                activeOpacity={0.8}
              >
                <Text style={sheetS.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={sheetS.addBtn}
                onPress={handleAdd}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#08081a" size="small" />
                ) : (
                  <Text style={sheetS.addBtnText}>Add Card</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetS = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#0d0f1e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.tealBorder,
    padding: 24,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: C.textPri,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 20,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 14,
  },
  brandRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  brandBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  brandBtnActive: { backgroundColor: C.tealDim, borderColor: C.tealBorder },
  brandText: { fontFamily: FONTS.bold, fontSize: 12, color: C.textMuted },
  brandTextActive: { color: C.teal },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
    fontSize: 15,
    color: C.textPri,
    fontFamily: FONTS.regular,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  cancelBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: C.textMuted },
  addBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: C.teal,
    alignItems: "center",
  },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: "#08081a" },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function PurchaseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { execute, loading } = useApiCall();
  const { refreshSubscription } = useSubscription();

  // Parse the package passed from SubscriptionPlansScreen
  const pkg = params.packageJson ? JSON.parse(params.packageJson) : null;

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Load payment methods ──────────────────────────────────────────────────
  const loadMethods = useCallback(async () => {
    setLoadingMethods(true);
    await execute(() => fetchPaymentMethods(), {
      errorDisplay: "toast",
      errorMessage: "Couldn't load payment methods.",
      errorRetry: false,
      onSuccess: (data) => {
        const methods = Array.isArray(data) ? data : [];
        setPaymentMethods(methods);
        // Auto-select the default card
        const defaultCard =
          methods.find((m) => m.isDefault) ?? methods[0] ?? null;
        setSelectedCard(defaultCard);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }).start();
      },
    });
    setLoadingMethods(false);
  }, [execute]);

  useEffect(() => {
    loadMethods();
  }, []);

  // ── Add card ──────────────────────────────────────────────────────────────
  const handleAddCard = async (cardData) => {
    let newCard = null;
    await execute(() => addPaymentMethod(cardData), {
      errorDisplay: "sheet",
      errorMessage: "Couldn't Add Card",
      errorSubMessage: "Please check your card details and try again.",
      errorRetry: false,
      onSuccess: (saved) => {
        newCard = saved;
      },
    });
    // Return the card (or null on failure).
    // AddCardSheet only calls onClose(card) when card is non-null.
    return newCard;
  };

  const handleAddCardClose = (newCard) => {
    // Close the modal first, then update state after animation completes
    // This prevents the freeze caused by rapid state updates during Modal close animation
    setShowAddCard(false);
    if (newCard) {
      setTimeout(() => {
        setPaymentMethods((prev) => [...prev, newCard]);
        setSelectedCard(newCard);
      }, 350); // wait for slide-down animation to finish
    }
  };

  // ── Confirm purchase ──────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!selectedCard) {
      Alert.alert(
        "No Payment Method",
        "Please add a payment card to continue.",
      );
      return;
    }

    const priceLabel = formatPrice(pkg?.price, pkg?.currency);
    const cycleLabel = billingLabel(pkg?.billingCycle);

    Alert.alert(
      "Confirm Purchase",
      `You are about to subscribe to ${pkg?.name} for ${priceLabel}${cycleLabel ? ` (${cycleLabel})` : ""}.\n\nCard: ${selectedCard.brand?.toUpperCase()} •••• ${selectedCard.last4}\n\nYou can upgrade or cancel anytime.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm & Pay", onPress: doPurchase },
      ],
    );
  };

  const doPurchase = async () => {
    // selectedCard.id is guaranteed real MongoDB _id because:
    //   - fetchPaymentMethods normalises _id → id in subscriptionService
    //   - addPaymentMethod does the same for newly added cards
    const cardId = selectedCard?.id;
    if (!pkg?.id || !cardId) {
      Alert.alert(
        "Error",
        "Missing package or payment method. Please try again.",
      );
      return;
    }
    setPurchasing(true);
    await execute(() => purchasePackage(pkg.id, cardId), {
      errorDisplay: "sheet",
      errorMessage: "Payment Failed",
      errorSubMessage:
        "We couldn't process your payment. Please check your card details and try again.",
      errorRetry: true,
      successDisplay: "sheet",
      successMessage: `Welcome to ${pkg.name}! 🎉`,
      successSubMessage:
        "Your subscription is now active. Enjoy unlimited reading!",
      successIcon: pkg.icon ?? "🎉",
      successAutoDismissMs: 0,
      successOnDismiss: () => {
        refreshSubscription();
        router.replace("/home");
      },
    });
    setPurchasing(false);
  };

  // ── Guard: no package passed ──────────────────────────────────────────────
  if (!pkg) {
    return (
      <View style={s.root}>
        <View style={s.center}>
          <Text style={s.errorText}>
            No plan selected. Please go back and choose a plan.
          </Text>
          <TouchableOpacity
            style={s.backBtnLarge}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={s.backBtnLargeText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const accentColor = pkg.accentColorRgb
    ? `rgb(${pkg.accentColorRgb})`
    : C.teal;
  const priceLabel = formatPrice(pkg.price, pkg.currency);
  const cycleLabel = billingLabel(pkg.billingCycle);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingMethods ? (
        <View style={s.center}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={s.loadingText}>Loading…</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── ORDER SUMMARY CARD ── */}
          <View style={s.sectionLabel}>
            <Text style={s.sectionLabelText}>Order Summary</Text>
          </View>

          <View
            style={[
              s.orderCard,
              {
                borderColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.35)`,
                borderTopColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.70)`,
                backgroundColor: pkg.darkBg ?? "#03080a",
              },
            ]}
          >
            {/* Plan icon + name */}
            <View style={s.orderTop}>
              <View
                style={[
                  s.planIconCircle,
                  {
                    borderColor: accentColor,
                    backgroundColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.12)`,
                  },
                ]}
              >
                <Text style={s.planIconEmoji}>{pkg.icon ?? "📦"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.planName, { color: accentColor }]}>
                  {pkg.name}
                </Text>
                {!!pkg.tagLine && (
                  <Text style={s.planTagline}>
                    {pkg.tagLine ?? pkg.tagline}
                  </Text>
                )}
              </View>
            </View>

            {/* Description */}
            {!!pkg.description && (
              <Text style={s.planDescription}>{pkg.description}</Text>
            )}

            {/* Price row */}
            <View style={s.priceRow}>
              <View
                style={[
                  s.pricePill,
                  {
                    borderColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.25)`,
                    backgroundColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.07)`,
                  },
                ]}
              >
                <Text style={[s.priceAmount, { color: accentColor }]}>
                  {priceLabel}
                </Text>
                {!!cycleLabel && <Text style={s.priceCycle}>{cycleLabel}</Text>}
              </View>
            </View>

            {/* Key features preview */}
            {(pkg.displayFeatures ?? [])
              .filter((f) => f.enabled)
              .slice(0, 4)
              .map((f, i) => (
                <View key={f.key ?? i} style={s.featurePreviewRow}>
                  <Text style={[s.featurePreviewCheck, { color: accentColor }]}>
                    ✓
                  </Text>
                  <Text style={s.featurePreviewLabel}>{f.label}</Text>
                </View>
              ))}
          </View>

          {/* ── PAYMENT METHOD ── */}
          <View style={s.sectionLabel}>
            <Text style={s.sectionLabelText}>Payment Method</Text>
          </View>

          {paymentMethods.length === 0 ? (
            /* No cards — show add card CTA */
            <View style={s.noCardBox}>
              <Text style={s.noCardIcon}>💳</Text>
              <Text style={s.noCardTitle}>No payment method</Text>
              <Text style={s.noCardSub}>
                Add a card to complete your purchase
              </Text>
              <TouchableOpacity
                style={s.addCardBtn}
                onPress={() => setShowAddCard(true)}
                activeOpacity={0.85}
              >
                <Text style={s.addCardBtnText}>+ Add Card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Card list — tap to select */
            <View style={s.cardList}>
              {paymentMethods.map((card) => {
                const isSelected = selectedCard?.id === card.id;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[s.cardRow, isSelected && s.cardRowSelected]}
                    onPress={() => setSelectedCard(card)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[s.radioOuter, isSelected && s.radioOuterSelected]}
                    >
                      {isSelected && <View style={s.radioInner} />}
                    </View>
                    <CardChip brand={card.brand} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={s.cardNumber}>
                        {card.brand?.toUpperCase()} •••• {card.last4}
                      </Text>
                      <Text style={s.cardExpiry}>
                        Expires {card.expMonth}/{card.expYear}
                      </Text>
                    </View>
                    {card.isDefault && (
                      <View style={s.defaultBadge}>
                        <Text style={s.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Add another card */}
              <TouchableOpacity
                style={s.addAnotherBtn}
                onPress={() => setShowAddCard(true)}
                activeOpacity={0.8}
              >
                <Text style={s.addAnotherText}>+ Add another card</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── TOTAL + POLICY ── */}
          <View style={s.totalCard}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={[s.totalAmount, { color: accentColor }]}>
                {priceLabel}
              </Text>
            </View>
            {!!cycleLabel && <Text style={s.totalCycle}>{cycleLabel}</Text>}
          </View>

          {/* Policy note */}
          <Text style={s.policyNote}>
            You can upgrade or cancel your plan anytime from your account
            settings.{"\n"}
            No hidden fees.
          </Text>

          {/* ── CHECKOUT BUTTON ── */}
          <TouchableOpacity
            style={[
              s.checkoutBtn,
              { backgroundColor: accentColor },
              (!selectedCard || purchasing) && s.checkoutBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedCard || purchasing}
            activeOpacity={0.88}
          >
            <View style={s.checkoutShine} />
            {purchasing ? (
              <ActivityIndicator color="#08081a" size="small" />
            ) : (
              <>
                <Text style={s.checkoutEmoji}>⚡</Text>
                <Text style={s.checkoutText}>
                  {pkg.ctaLabel ?? `Subscribe to ${pkg.name}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 48 }} />
        </Animated.ScrollView>
      )}

      {/* ── Add Card Sheet ── */}
      <AddCardSheet
        visible={showAddCard}
        onClose={handleAddCardClose}
        onAdd={handleAddCard}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    padding: 24,
  },
  loadingText: { fontFamily: FONTS.light, fontSize: 14, color: C.textMuted },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.1)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontFamily: FONTS.bold, fontSize: 18, color: C.teal },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: C.textPri,
    letterSpacing: 0.3,
  },
  backBtnLarge: {
    marginTop: 16,
    backgroundColor: C.teal,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  backBtnLargeText: { fontFamily: FONTS.bold, fontSize: 14, color: "#08081a" },

  scroll: { padding: 20 },

  // Section labels
  sectionLabel: { marginBottom: 10, marginTop: 4 },
  sectionLabelText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Order card
  orderCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderTopWidth: 2,
    padding: 18,
    marginBottom: 24,
    overflow: "hidden",
  },
  orderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  planIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  planIconEmoji: { fontSize: 24 },
  planName: { fontFamily: FONTS.bold, fontSize: 20, letterSpacing: 0.2 },
  planTagline: {
    fontFamily: FONTS.light,
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  planDescription: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  priceRow: { marginBottom: 14 },
  pricePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  priceAmount: { fontFamily: FONTS.bold, fontSize: 28, letterSpacing: -0.3 },
  priceCycle: { fontFamily: FONTS.light, fontSize: 13, color: C.textMuted },
  featurePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  featurePreviewCheck: { fontFamily: FONTS.bold, fontSize: 13, width: 18 },
  featurePreviewLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: C.textSec,
    flex: 1,
  },

  // Payment methods
  noCardBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  noCardIcon: { fontSize: 40, marginBottom: 4 },
  noCardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: C.textPri },
  noCardSub: {
    fontFamily: FONTS.light,
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
  },
  addCardBtn: {
    marginTop: 8,
    backgroundColor: C.teal,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  addCardBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: "#08081a" },

  cardList: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  cardRowSelected: { backgroundColor: C.tealDim },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: C.teal },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.teal,
  },
  cardNumber: { fontFamily: FONTS.bold, fontSize: 14, color: C.textPri },
  cardExpiry: {
    fontFamily: FONTS.light,
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: C.tealDim,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: C.teal },
  addAnotherBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  addAnotherText: { fontFamily: FONTS.bold, fontSize: 13, color: C.teal },

  // Total
  totalCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  totalLabel: { fontFamily: FONTS.bold, fontSize: 15, color: C.textSec },
  totalAmount: { fontFamily: FONTS.bold, fontSize: 26, letterSpacing: -0.3 },
  totalCycle: {
    fontFamily: FONTS.light,
    fontSize: 11,
    color: C.textMuted,
    marginTop: 4,
  },

  // Policy note
  policyNote: {
    fontFamily: FONTS.light,
    fontSize: 11,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Checkout CTA
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 27,
    height: 56,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  checkoutBtnDisabled: { opacity: 0.45 },
  checkoutShine: {
    position: "absolute",
    top: 0,
    left: "14%",
    width: "38%",
    height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  checkoutEmoji: { fontSize: 18 },
  checkoutText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#08081a",
    letterSpacing: 0.3,
  },
});
