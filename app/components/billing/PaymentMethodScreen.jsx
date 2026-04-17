// app/components/billing/PaymentMethodScreen.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { FONTS } from "../../theme";
import { useApiCall } from "../../_hooks/useApiCall";
import {
  fetchPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "../../services/subscriptionService";
import { font, pad, radius, size } from "../../theme/tokens"; // ← REPLACES useTheme

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  surfaceHigh: "rgba(255,255,255,0.09)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
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

// ─────────────────────────────────────────────────────────────────────────────
// CARD ITEM
// ─────────────────────────────────────────────────────────────────────────────
function CardItem({ card, onSetDefault, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const chipColor = BRAND_COLORS[card.brand?.toLowerCase()] ?? C.teal;

  return (
    <View style={[cS.card, card.isDefault && cS.cardDefault]}>
      <View style={cS.cardTop}>
        <View style={[cS.chip, { backgroundColor: chipColor }]}>
          <Text style={cS.chipText}>
            {(card.brand ?? "").slice(0, 4).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: pad.sm }}>
          <Text style={cS.cardNum}>•••• •••• •••• {card.last4}</Text>
          <Text style={cS.cardExp}>
            Expires {card.expMonth}/{card.expYear}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          style={cS.menuBtn}
          activeOpacity={0.7}
        >
          <Text style={cS.menuDots}>⋮</Text>
        </TouchableOpacity>
      </View>

      {card.isDefault && (
        <View style={cS.defaultBadge}>
          <Text style={cS.defaultBadgeText}>✓ Default</Text>
        </View>
      )}

      {menuOpen && (
        <View style={cS.actionMenu}>
          {!card.isDefault && (
            <TouchableOpacity
              style={cS.actionItem}
              onPress={() => {
                setMenuOpen(false);
                onSetDefault(card.id);
              }}
              activeOpacity={0.8}
            >
              <Text style={cS.actionItemText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[cS.actionItem, !card.isDefault && cS.actionItemDivider]}
            onPress={() => {
              setMenuOpen(false);
              onDelete(card.id);
            }}
            activeOpacity={0.8}
          >
            <Text style={[cS.actionItemText, { color: C.red }]}>
              Remove Card
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const cS = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: radius.lg, // was: sz.paymentCardBorderRadius → 16/22
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    padding: pad.md, // was: sz.paymentCardPadding → 16/22
    marginBottom: pad.sm, // was: sz.paymentCardMarginBottom → 12/16
  },
  cardDefault: { borderColor: C.tealBorder, backgroundColor: C.tealDim },
  cardTop: { flexDirection: "row", alignItems: "center" },
  chip: {
    width: size.chipW, // was: sz.paymentChipWidth → 44/60
    height: size.chipH, // was: sz.paymentChipHeight → 30/40
    borderRadius: radius.xs, // was: sz.paymentChipBorderRadius
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: "#fff",
    letterSpacing: 0.5,
  },
  cardNum: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textPri,
    letterSpacing: 1,
  },
  cardExp: {
    fontFamily: FONTS.light,
    fontSize: font.s,
    color: C.textMuted,
    marginTop: 2,
  },
  menuBtn: {
    width: size.hitSm,
    height: size.hitSm,
    alignItems: "center",
    justifyContent: "center",
  },
  menuDots: { fontSize: font.xl, color: C.textMuted },
  defaultBadge: {
    marginTop: pad.sm,
    backgroundColor: C.tealDim,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  defaultBadgeText: { fontFamily: FONTS.bold, fontSize: font.s, color: C.teal },
  actionMenu: {
    marginTop: pad.sm,
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  actionItem: { paddingVertical: pad.sm, paddingHorizontal: pad.sm },
  actionItemDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  actionItemText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: C.textSec,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD CARD MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddCardModal({ visible, onClose, onAdd }) {
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
      await onAdd({
        brand,
        last4,
        expMonth: parseInt(expMonth),
        expYear: parseInt(expYear),
      });
      reset();
      onClose();
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={mS.overlay}>
          <View style={mS.sheet}>
            <View style={mS.handle} />
            <Text style={mS.title}>Add Card</Text>
            <Text style={mS.subtitle}>
              Your card details are saved securely.
            </Text>

            <Text style={mS.label}>Card Brand</Text>
            <View
              style={{ flexDirection: "row", gap: pad.s, flexWrap: "wrap" }}
            >
              {brands.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[mS.brandBtn, brand === b && mS.brandBtnActive]}
                  onPress={() => setBrand(b)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[mS.brandText, brand === b && mS.brandTextActive]}
                  >
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={mS.label}>Last 4 Digits</Text>
            <TextInput
              style={mS.input}
              placeholder="e.g. 4242"
              placeholderTextColor={C.textMuted}
              value={last4}
              onChangeText={(t) => setLast4(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={{ flexDirection: "row", gap: pad.sm }}>
              {[
                {
                  label: "Exp Month",
                  placeholder: "MM",
                  value: expMonth,
                  set: setExpMonth,
                  max: 2,
                },
                {
                  label: "Exp Year",
                  placeholder: "YYYY",
                  value: expYear,
                  set: setExpYear,
                  max: 4,
                },
              ].map((f) => (
                <View key={f.label} style={{ flex: 1 }}>
                  <Text style={mS.label}>{f.label}</Text>
                  <TextInput
                    style={mS.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.textMuted}
                    value={f.value}
                    onChangeText={(t) =>
                      f.set(t.replace(/\D/g, "").slice(0, f.max))
                    }
                    keyboardType="numeric"
                    maxLength={f.max}
                  />
                </View>
              ))}
            </View>

            <View
              style={{ flexDirection: "row", gap: pad.sm, marginTop: pad.md }}
            >
              <TouchableOpacity
                style={mS.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={mS.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={mS.addBtn}
                onPress={handleAdd}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#08081a" size="small" />
                ) : (
                  <Text style={mS.addBtnText}>Add Card</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mS = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#0d0f1e",
    borderTopLeftRadius: radius.xl, // was: sz.paymentModalBorderRadius → 24/32
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.tealBorder,
    padding: pad.xl, // was: sz.paymentModalPadding → 24/34
    paddingTop: pad.sm,
    paddingBottom: Platform.OS === "ios" ? pad.xxl : pad.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: pad.lg,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    marginBottom: pad.xs,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    marginBottom: pad.lg,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: font.s, // was: sz.paymentModalLabelFontSize → 11/14
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: pad.s,
    marginTop: pad.sm,
  },
  brandBtn: {
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: C.surface,
  },
  brandBtnActive: { backgroundColor: C.tealDim, borderColor: C.tealBorder },
  brandText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.textMuted },
  brandTextActive: { color: C.teal },
  input: {
    backgroundColor: C.surface,
    borderRadius: radius.md, // was: sz.paymentModalInputBorderRadius → 12/16
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    padding: pad.sm, // was: sz.paymentModalInputPadding → 14/20
    fontSize: font.md, // was: sz.paymentModalInputFontSize → 15/19
    color: C.textPri,
    fontFamily: FONTS.regular,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: pad.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textMuted,
  },
  addBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: pad.sm,
    backgroundColor: C.teal,
    alignItems: "center",
  },
  addBtnText: { fontFamily: FONTS.bold, fontSize: font.md, color: "#08081a" },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentMethodScreen() {
  const router = useRouter();
  const { execute } = useApiCall();

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadMethods = useCallback(async () => {
    await execute(() => fetchPaymentMethods(), {
      errorDisplay: "sheet",
      errorMessage: "Couldn't Load Cards",
      errorSubMessage: "Please check your connection and try again.",
      errorRetry: true,
      onSuccess: (data) => {
        setMethods(Array.isArray(data) ? data : []);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      },
    });
    setLoading(false);
  }, [execute]);

  useEffect(() => {
    loadMethods();
  }, []);

  useEffect(() => {
    console.log("[PAYMENT METHOD LIFECYCLE] PAYMENT METHOD MOUNTED");
    return () => {
      console.log("[PAYMENT METHOD LIFECYCLE] PAYMENT METHOD UNMOUNTED");
    };
  }, []);

  const handleSetDefault = async (id) => {
    await execute(() => setDefaultPaymentMethod(id), {
      errorDisplay: "toast",
      errorMessage: "Couldn't update default card.",
      onSuccess: () =>
        setMethods((prev) =>
          prev.map((m) => ({ ...m, isDefault: m.id === id })),
        ),
    });
  };

  const handleDelete = (id) => {
    const card = methods.find((m) => m.id === id);
    if (card?.isDefault && methods.length > 1) {
      Alert.alert(
        "Cannot Remove",
        "Please set another card as default before removing this one.",
      );
      return;
    }
    Alert.alert("Remove Card", `Remove •••• ${card?.last4}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await execute(() => deletePaymentMethod(id), {
            errorDisplay: "toast",
            errorMessage: "Couldn't remove card.",
            successDisplay: "toast",
            successMessage: "Card removed.",
            onSuccess: () =>
              setMethods((prev) => prev.filter((m) => m.id !== id)),
          });
        },
      },
    ]);
  };

  const handleAdd = async (cardData) => {
    await execute(() => addPaymentMethod(cardData), {
      errorDisplay: "sheet",
      errorMessage: "Couldn't Add Card",
      errorSubMessage: "Please check your card details and try again.",
      successDisplay: "toast",
      successMessage: "Card added successfully.",
      onSuccess: (saved) => {
        setMethods((prev) => [...prev, saved]);
        setShowAddModal(false);
      },
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Payment Methods</Text>
        <View style={{ width: size.hitMd }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.teal} size="large" />
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {methods.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No payment methods</Text>
              <Text style={styles.emptySubtitle}>
                Add a card to enable paid subscriptions
              </Text>
            </View>
          )}

          {methods.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
            />
          ))}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnIcon}>+</Text>
            <Text style={styles.addBtnText}>Add New Card</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      )}

      <AddCardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + pad.sm, // was: + 10
    paddingBottom: pad.sm, // was: 14
    paddingHorizontal: pad.md, // was: 18
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.12)",
  },
  backBtn: {
    width: size.hitMd, // was: 38
    height: size.hitMd,
    borderRadius: size.hitMd / 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontFamily: FONTS.bold, fontSize: font.lg, color: C.teal },
  screenTitle: { fontFamily: FONTS.bold, fontSize: font.xl, color: C.textPri },
  scroll: { padding: pad.md },
  emptyState: { alignItems: "center", paddingVertical: pad.xxxl, gap: pad.s },
  emptyIcon: { fontSize: size.iconXl, marginBottom: pad.s },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: font.xl, color: C.textPri },
  emptySubtitle: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    textAlign: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: pad.s,
    borderRadius: radius.md, // was: 14
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderStyle: "dashed",
    paddingVertical: pad.md, // was: 16
    marginTop: pad.xs,
  },
  addBtnIcon: { fontFamily: FONTS.bold, fontSize: font.xxl, color: C.teal },
  addBtnText: { fontFamily: FONTS.bold, fontSize: font.md, color: C.teal },
});
