// app/components/billing/PurchaseScreen.jsx

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
import { useTheme } from "../../_contexts/ThemeContext";
import { useUser } from "../../_contexts/UserContext";
import { useLevelAccess } from "../../_contexts/LevelAccessContext";

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

function CardChip({ brand, sz }) {
  const color = BRAND_COLORS[brand?.toLowerCase()] ?? C.teal;
  return (
    <View
      style={{
        width: sz.purchaseChipWidth ?? 44,
        height: sz.purchaseChipHeight ?? 30,
        borderRadius: 6,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.bold,
          fontSize: 8,
          color: "#fff",
          letterSpacing: 0.5,
        }}
      >
        {(brand ?? "Card").slice(0, 4).toUpperCase()}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD CARD SHEET
// ─────────────────────────────────────────────────────────────────────────────
function AddCardSheet({ visible, onClose, onAdd, sz }) {
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
      if (newCard) {
        reset();
        onClose(newCard);
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: sz.purchaseSheetInputBorderRadius,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    padding: sz.purchaseSheetInputPadding,
    fontSize: sz.purchaseSheetInputFontSize,
    color: C.textPri,
    fontFamily: FONTS.regular,
  };
  const labelStyle = {
    fontFamily: FONTS.bold,
    fontSize: sz.purchaseSheetLabelFontSize,
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 14,
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
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.65)",
          }}
        >
          <View
            style={{
              backgroundColor: "#0d0f1e",
              borderTopLeftRadius: sz.purchaseSheetBorderRadius,
              borderTopRightRadius: sz.purchaseSheetBorderRadius,
              borderTopWidth: 1.5,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: C.tealBorder,
              padding: sz.purchaseSheetPadding,
              paddingTop: 14,
              paddingBottom: Platform.OS === "ios" ? 36 : 24,
            }}
          >
            <View
              style={{
                width: sz.purchaseSheetHandleWidth,
                height: sz.purchaseSheetHandleHeight,
                borderRadius: sz.purchaseSheetHandleHeight / 2,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignSelf: "center",
                marginBottom: 18,
              }}
            />
            <Text
              style={{
                fontFamily: FONTS.bold,
                fontSize: sz.purchaseSheetTitleFontSize,
                color: C.textPri,
                marginBottom: 4,
              }}
            >
              Add Payment Card
            </Text>
            <Text
              style={{
                fontFamily: FONTS.light,
                fontSize: sz.purchaseSheetSubFontSize,
                color: C.textMuted,
                marginBottom: 20,
              }}
            >
              Your card details are entered securely.
            </Text>

            <Text style={labelStyle}>Card Brand</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {brands.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    {
                      paddingHorizontal: sz.purchaseSheetBrandPaddingH,
                      paddingVertical: sz.purchaseSheetBrandPaddingV,
                      borderRadius: sz.purchaseSheetBrandBorderRadius,
                      borderWidth: 1,
                    },
                    brand === b
                      ? {
                          backgroundColor: C.tealDim,
                          borderColor: C.tealBorder,
                        }
                      : {
                          borderColor: "rgba(255,255,255,0.1)",
                          backgroundColor: "rgba(255,255,255,0.05)",
                        },
                  ]}
                  onPress={() => setBrand(b)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      fontSize: sz.purchaseSheetBrandFontSize,
                      color: brand === b ? C.teal : C.textMuted,
                    }}
                  >
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={labelStyle}>Last 4 Digits</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. 4242"
              placeholderTextColor={C.textMuted}
              value={last4}
              onChangeText={(t) => setLast4(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              {[
                {
                  label: "Exp Month",
                  ph: "MM",
                  val: expMonth,
                  set: setExpMonth,
                  max: 2,
                },
                {
                  label: "Exp Year",
                  ph: "YYYY",
                  val: expYear,
                  set: setExpYear,
                  max: 4,
                },
              ].map((f) => (
                <View key={f.label} style={{ flex: 1 }}>
                  <Text style={labelStyle}>{f.label}</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder={f.ph}
                    placeholderTextColor={C.textMuted}
                    value={f.val}
                    onChangeText={(t) =>
                      f.set(t.replace(/\D/g, "").slice(0, f.max))
                    }
                    keyboardType="numeric"
                    maxLength={f.max}
                  />
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderRadius: sz.purchaseSheetActionBorderRadius,
                  paddingVertical: sz.purchaseSheetActionPaddingV,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  alignItems: "center",
                }}
                onPress={() => onClose(null)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontFamily: FONTS.bold,
                    fontSize: sz.purchaseSheetActionFontSize,
                    color: C.textMuted,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderRadius: sz.purchaseSheetActionBorderRadius,
                  paddingVertical: sz.purchaseSheetActionPaddingV,
                  backgroundColor: C.teal,
                  alignItems: "center",
                }}
                onPress={handleAdd}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#08081a" size="small" />
                ) : (
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      fontSize: sz.purchaseSheetActionFontSize,
                      color: "#08081a",
                    }}
                  >
                    Add Card
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function PurchaseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { execute, loading } = useApiCall();
  const { refreshSubscription } = useSubscription();
  const { sizes } = useTheme();
  const sz = sizes.billing;

  const pkg = params.packageJson ? JSON.parse(params.packageJson) : null;
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { initForProfile } = useLevelAccess();
  const { currentProfile } = useUser();

  const loadMethods = useCallback(async () => {
    setLoadingMethods(true);
    await execute(() => fetchPaymentMethods(), {
      errorDisplay: "toast",
      errorMessage: "Couldn't load payment methods.",
      errorRetry: false,
      onSuccess: (data) => {
        const methods = Array.isArray(data) ? data : [];
        setPaymentMethods(methods);
        setSelectedCard(methods.find((m) => m.isDefault) ?? methods[0] ?? null);
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

  useEffect(() => {
    console.log("[CHECKOUT LIFECYCLE] CHECKOUT MOUNTED");
    return () => {
      console.log("[CHECKOUT LIFECYCLE] CHECKOUT UNMOUNTED");
    };
  }, []);

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
    return newCard;
  };

  const handleAddCardClose = (newCard) => {
    setShowAddCard(false);
    if (newCard) {
      setTimeout(() => {
        setPaymentMethods((prev) => [...prev, newCard]);
        setSelectedCard(newCard);
      }, 350);
    }
  };

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
        console.log("[DOPUCHASE SUCCESS] Success callback");
        refreshSubscription();
        initForProfile(currentProfile).then(() => {
          console.log("[DOPUCHASE SUCCESS] InitforProfile then callback");
          router.dismiss(3);
        });
        //router.dismiss(3);
      },
    });
    setPurchasing(false);
  };

  if (!pkg) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 14,
            padding: 24,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.regular,
              fontSize: 14,
              color: C.textMuted,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            No plan selected. Please go back and choose a plan.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 16,
              backgroundColor: C.teal,
              borderRadius: 14,
              paddingHorizontal: 28,
              paddingVertical: 12,
            }}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text
              style={{ fontFamily: FONTS.bold, fontSize: 14, color: "#08081a" }}
            >
              Go Back
            </Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: STATUS_BAR_HEIGHT + 10,
          paddingBottom: sz.purchaseHeaderPaddingBottom,
          paddingHorizontal: sz.purchaseHeaderPaddingH,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0,188,212,0.1)",
        }}
      >
        <TouchableOpacity
          style={{
            width: sz.purchaseBackBtnSize,
            height: sz.purchaseBackBtnSize,
            borderRadius: sz.purchaseBackBtnBorderRadius,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.purchaseBackIconFontSize,
              color: C.teal,
            }}
          >
            ←
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: sz.purchaseHeaderTitleFontSize,
            color: C.textPri,
            letterSpacing: 0.3,
          }}
        >
          Checkout
        </Text>
        <View style={{ width: sz.purchaseBackBtnSize }} />
      </View>

      {loadingMethods ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 14,
          }}
        >
          <ActivityIndicator color={C.teal} size="large" />
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: 14,
              color: C.textMuted,
            }}
          >
            Loading…
          </Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={{ padding: sz.purchaseScrollPadding }}
          showsVerticalScrollIndicator={false}
        >
          {/* Order summary */}
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.purchaseSectionLabelFontSize,
              color: C.textMuted,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: sz.purchaseSectionLabelMarginBottom,
            }}
          >
            Order Summary
          </Text>
          <View
            style={{
              borderRadius: sz.purchaseOrderCardBorderRadius,
              borderWidth: 1.5,
              borderTopWidth: 2,
              padding: sz.purchaseOrderCardPadding,
              marginBottom: sz.purchaseOrderCardMarginBottom,
              overflow: "hidden",
              borderColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.35)`,
              borderTopColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.70)`,
              backgroundColor: pkg.darkBg ?? "#03080a",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: sz.purchasePlanIconSize,
                  height: sz.purchasePlanIconSize,
                  borderRadius: sz.purchasePlanIconBorderRadius,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: accentColor,
                  backgroundColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.12)`,
                }}
              >
                <Text style={{ fontSize: sz.purchasePlanIconEmojiFontSize }}>
                  {pkg.icon ?? "📦"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: FONTS.bold,
                    fontSize: sz.purchasePlanNameFontSize,
                    letterSpacing: 0.2,
                    color: accentColor,
                  }}
                >
                  {pkg.name}
                </Text>
                {!!pkg.tagLine && (
                  <Text
                    style={{
                      fontFamily: FONTS.light,
                      fontSize: sz.purchasePlanTaglineFontSize,
                      color: C.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {pkg.tagLine ?? pkg.tagline}
                  </Text>
                )}
              </View>
            </View>
            {!!pkg.description && (
              <Text
                style={{
                  fontFamily: FONTS.regular,
                  fontSize: sz.purchasePlanDescFontSize,
                  color: C.textMuted,
                  lineHeight: sz.purchasePlanDescLineHeight,
                  marginBottom: 14,
                }}
              >
                {pkg.description}
              </Text>
            )}
            <View style={{ marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 6,
                  alignSelf: "flex-start",
                  borderRadius: sz.purchasePricePillBorderRadius,
                  borderWidth: 1,
                  paddingVertical: sz.purchasePricePillPaddingV,
                  paddingHorizontal: sz.purchasePricePillPaddingH,
                  borderColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.25)`,
                  backgroundColor: `rgba(${pkg.accentColorRgb ?? "0,188,212"},0.07)`,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONTS.bold,
                    fontSize: sz.purchasePriceAmountFontSize,
                    letterSpacing: -0.3,
                    color: accentColor,
                  }}
                >
                  {priceLabel}
                </Text>
                {!!cycleLabel && (
                  <Text
                    style={{
                      fontFamily: FONTS.light,
                      fontSize: sz.purchasePriceCycleFontSize,
                      color: C.textMuted,
                    }}
                  >
                    {cycleLabel}
                  </Text>
                )}
              </View>
            </View>
            {(pkg.displayFeatures ?? [])
              .filter((f) => f.enabled)
              .slice(0, 4)
              .map((f, i) => (
                <View
                  key={f.key ?? i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: sz.purchaseFeatureRowGap,
                    marginBottom: sz.purchaseFeatureRowMarginBottom,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      fontSize: sz.purchaseFeatureCheckFontSize,
                      width: 18,
                      color: accentColor,
                    }}
                  >
                    ✓
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONTS.regular,
                      fontSize: sz.purchaseFeatureLabelFontSize,
                      color: C.textSec,
                      flex: 1,
                    }}
                  >
                    {f.label}
                  </Text>
                </View>
              ))}
          </View>

          {/* Payment method */}
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.purchaseSectionLabelFontSize,
              color: C.textMuted,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: sz.purchaseSectionLabelMarginBottom,
            }}
          >
            Payment Method
          </Text>
          {paymentMethods.length === 0 ? (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: sz.purchaseNoCardBorderRadius,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
                padding: sz.purchaseNoCardPadding,
                alignItems: "center",
                gap: sz.purchaseNoCardGap,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: sz.purchaseNoCardIconFontSize,
                  marginBottom: 4,
                }}
              >
                💳
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  fontSize: sz.purchaseNoCardTitleFontSize,
                  color: C.textPri,
                }}
              >
                No payment method
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.light,
                  fontSize: sz.purchaseNoCardSubFontSize,
                  color: C.textMuted,
                  textAlign: "center",
                }}
              >
                Add a card to complete your purchase
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: C.teal,
                  borderRadius: sz.purchaseAddCardBtnBorderRadius,
                  paddingHorizontal: sz.purchaseAddCardBtnPaddingH,
                  paddingVertical: sz.purchaseAddCardBtnPaddingV,
                }}
                onPress={() => setShowAddCard(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontFamily: FONTS.bold,
                    fontSize: sz.purchaseAddCardBtnFontSize,
                    color: "#08081a",
                  }}
                >
                  + Add Card
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: sz.purchaseCardListBorderRadius,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              {paymentMethods.map((card) => {
                const isSelected = selectedCard?.id === card.id;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: sz.purchaseCardRowPadding,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(255,255,255,0.05)",
                      },
                      isSelected && { backgroundColor: C.tealDim },
                    ]}
                    onPress={() => setSelectedCard(card)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        {
                          width: sz.purchaseRadioSize,
                          height: sz.purchaseRadioSize,
                          borderRadius: sz.purchaseRadioSize / 2,
                          borderWidth: 2,
                          alignItems: "center",
                          justifyContent: "center",
                        },
                        isSelected
                          ? { borderColor: C.teal }
                          : { borderColor: C.textMuted },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={{
                            width: sz.purchaseRadioInnerSize,
                            height: sz.purchaseRadioInnerSize,
                            borderRadius: sz.purchaseRadioInnerSize / 2,
                            backgroundColor: C.teal,
                          }}
                        />
                      )}
                    </View>
                    <CardChip brand={card.brand} sz={sz} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          fontSize: sz.purchaseCardNumFontSize,
                          color: C.textPri,
                        }}
                      >
                        {card.brand?.toUpperCase()} •••• {card.last4}
                      </Text>
                      <Text
                        style={{
                          fontFamily: FONTS.light,
                          fontSize: sz.purchaseCardExpFontSize,
                          color: C.textMuted,
                          marginTop: 2,
                        }}
                      >
                        Expires {card.expMonth}/{card.expYear}
                      </Text>
                    </View>
                    {card.isDefault && (
                      <View
                        style={{
                          backgroundColor: C.tealDim,
                          borderRadius: sz.purchaseDefaultBadgeBorderRadius,
                          borderWidth: 1,
                          borderColor: C.tealBorder,
                          paddingHorizontal: sz.purchaseDefaultBadgePaddingH,
                          paddingVertical: sz.purchaseDefaultBadgePaddingV,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            fontSize: sz.purchaseDefaultBadgeFontSize,
                            color: C.teal,
                          }}
                        >
                          Default
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={{
                  paddingVertical: sz.purchaseAddAnotherPaddingV,
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.05)",
                }}
                onPress={() => setShowAddCard(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontFamily: FONTS.bold,
                    fontSize: sz.purchaseAddAnotherFontSize,
                    color: C.teal,
                  }}
                >
                  + Add another card
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Total */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: sz.purchaseTotalCardBorderRadius,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.07)",
              padding: sz.purchaseTotalCardPadding,
              marginBottom: sz.purchaseTotalCardMarginBottom,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  fontSize: sz.purchaseTotalLabelFontSize,
                  color: C.textSec,
                }}
              >
                Total
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  fontSize: sz.purchaseTotalAmountFontSize,
                  letterSpacing: -0.3,
                  color: accentColor,
                }}
              >
                {priceLabel}
              </Text>
            </View>
            {!!cycleLabel && (
              <Text
                style={{
                  fontFamily: FONTS.light,
                  fontSize: sz.purchaseTotalCycleFontSize,
                  color: C.textMuted,
                  marginTop: 4,
                }}
              >
                {cycleLabel}
              </Text>
            )}
          </View>

          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: sz.purchasePolicyFontSize,
              color: C.textMuted,
              textAlign: "center",
              lineHeight: sz.purchasePolicyLineHeight,
              marginBottom: sz.purchasePolicyMarginBottom,
              paddingHorizontal: 8,
            }}
          >
            You can upgrade or cancel your plan anytime from your account
            settings.{"\n"}No hidden fees.
          </Text>

          {/* Checkout button */}
          <TouchableOpacity
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: sz.purchaseCheckoutBtnBorderRadius,
                height: sz.purchaseCheckoutBtnHeight,
                overflow: "hidden",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.55,
                shadowRadius: 14,
                elevation: 10,
                backgroundColor: accentColor,
              },
              (!selectedCard || purchasing) && { opacity: 0.45 },
            ]}
            onPress={handleConfirm}
            disabled={!selectedCard || purchasing}
            activeOpacity={0.88}
          >
            <View
              style={{
                position: "absolute",
                top: 0,
                left: "14%",
                width: "38%",
                height: "52%",
                backgroundColor: "rgba(255,255,255,0.20)",
                borderRadius: 20,
                transform: [{ rotate: "-15deg" }],
              }}
            />
            {purchasing ? (
              <ActivityIndicator color="#08081a" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: sz.purchaseCheckoutEmojiFontSize }}>
                  ⚡
                </Text>
                <Text
                  style={{
                    fontFamily: FONTS.bold,
                    fontSize: sz.purchaseCheckoutTextFontSize,
                    color: "#08081a",
                    letterSpacing: 0.3,
                  }}
                >
                  {pkg.ctaLabel ?? `Subscribe to ${pkg.name}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 48 }} />
        </Animated.ScrollView>
      )}

      <AddCardSheet
        visible={showAddCard}
        onClose={handleAddCardClose}
        onAdd={handleAddCard}
        sz={sz}
      />
    </View>
  );
}
