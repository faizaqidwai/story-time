// app/components/billing/PaymentMethodScreen.jsx
//
// Manage saved payment methods — fully wired to real backend APIs:
//   GET    /account/payments/methods
//   POST   /account/payments/methods
//   DELETE /account/payments/methods/{id}
//   PATCH  /account/payments/methods/{id}/default

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, StatusBar,
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
  visa: "#1A1F71", mastercard: "#EB001B", amex: "#007BC1", discover: "#FF6600",
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
          <Text style={cS.chipText}>{(card.brand ?? "").slice(0, 4).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={cS.cardNum}>•••• •••• •••• {card.last4}</Text>
          <Text style={cS.cardExp}>Expires {card.expMonth}/{card.expYear}</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={cS.menuBtn} activeOpacity={0.7}>
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
              onPress={() => { setMenuOpen(false); onSetDefault(card.id); }}
              activeOpacity={0.8}
            >
              <Text style={cS.actionItemText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[cS.actionItem, !card.isDefault && cS.actionItemDivider]}
            onPress={() => { setMenuOpen(false); onDelete(card.id); }}
            activeOpacity={0.8}
          >
            <Text style={[cS.actionItemText, { color: C.red }]}>Remove Card</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const cS = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)",
    padding: 16, marginBottom: 12,
  },
  cardDefault: { borderColor: C.tealBorder, backgroundColor: C.tealDim },
  cardTop: { flexDirection: "row", alignItems: "center" },
  chip: { width: 44, height: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  chipText: { fontFamily: FONTS.bold, fontSize: 8, color: "#fff", letterSpacing: 0.5 },
  cardNum: { fontFamily: FONTS.bold, fontSize: 14, color: C.textPri, letterSpacing: 1 },
  cardExp: { fontFamily: FONTS.light, fontSize: 11, color: C.textMuted, marginTop: 2 },
  menuBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  menuDots: { fontSize: 20, color: C.textMuted },
  defaultBadge: {
    marginTop: 10, backgroundColor: C.tealDim,
    borderRadius: 8, borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start",
  },
  defaultBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: C.teal },
  actionMenu: {
    marginTop: 10, backgroundColor: C.surfaceHigh,
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden",
  },
  actionItem: { paddingVertical: 12, paddingHorizontal: 14 },
  actionItemDivider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  actionItemText: { fontFamily: FONTS.bold, fontSize: 13, color: C.textSec },
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD CARD MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddCardModal({ visible, onClose, onAdd }) {
  const [brand, setBrand]       = useState("visa");
  const [last4, setLast4]       = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear]   = useState("");
  const [saving, setSaving]     = useState(false);
  const brands = ["visa", "mastercard", "amex", "discover"];

  const reset = () => { setBrand("visa"); setLast4(""); setExpMonth(""); setExpYear(""); };

  const handleAdd = async () => {
    if (!last4 || last4.length !== 4 || !expMonth || !expYear) {
      Alert.alert("Invalid", "Please fill in all card details.");
      return;
    }
    setSaving(true);
    try {
      await onAdd({ brand, last4, expMonth: parseInt(expMonth), expYear: parseInt(expYear) });
      reset();
      onClose();
    } catch (e) {
      // Error already shown via execute sheet — just keep modal open
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={mS.overlay}>
          <View style={mS.sheet}>
            <View style={mS.handle} />
            <Text style={mS.title}>Add Card</Text>
            <Text style={mS.subtitle}>Your card details are saved securely.</Text>

            <Text style={mS.label}>Card Brand</Text>
            <View style={mS.brandRow}>
              {brands.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[mS.brandBtn, brand === b && mS.brandBtnActive]}
                  onPress={() => setBrand(b)}
                  activeOpacity={0.8}
                >
                  <Text style={[mS.brandText, brand === b && mS.brandTextActive]}>
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

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={mS.label}>Exp Month</Text>
                <TextInput
                  style={mS.input}
                  placeholder="MM"
                  placeholderTextColor={C.textMuted}
                  value={expMonth}
                  onChangeText={(t) => setExpMonth(t.replace(/\D/g, "").slice(0, 2))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={mS.label}>Exp Year</Text>
                <TextInput
                  style={mS.input}
                  placeholder="YYYY"
                  placeholderTextColor={C.textMuted}
                  value={expYear}
                  onChangeText={(t) => setExpYear(t.replace(/\D/g, "").slice(0, 4))}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={mS.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={mS.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={mS.addBtn} onPress={handleAdd} disabled={saving} activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator color="#08081a" size="small" />
                  : <Text style={mS.addBtnText}>Add Card</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mS = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    backgroundColor: "#0d0f1e",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1.5, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: C.tealBorder,
    padding: 24, paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 18 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: C.textPri, marginBottom: 4 },
  subtitle: { fontFamily: FONTS.light, fontSize: 12, color: C.textMuted, marginBottom: 20 },
  label: { fontFamily: FONTS.bold, fontSize: 11, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  brandRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  brandBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: C.surface },
  brandBtnActive: { backgroundColor: C.tealDim, borderColor: C.tealBorder },
  brandText: { fontFamily: FONTS.bold, fontSize: 12, color: C.textMuted },
  brandTextActive: { color: C.teal },
  input: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)", padding: 14, fontSize: 15,
    color: C.textPri, fontFamily: FONTS.regular,
  },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center" },
  cancelBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: C.textMuted },
  addBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, backgroundColor: C.teal, alignItems: "center" },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: "#08081a" },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentMethodScreen() {
  const router = useRouter();
  const { execute } = useApiCall();

  const [methods, setMethods]         = useState([]);
  const [loading, setLoading]         = useState(true);
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
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      },
    });
    setLoading(false);
  }, [execute]);

  useEffect(() => { loadMethods(); }, []);

  // ── Set default ───────────────────────────────────────────────────────────
  const handleSetDefault = async (id) => {
    await execute(() => setDefaultPaymentMethod(id), {
      errorDisplay: "toast",
      errorMessage: "Couldn't update default card.",
      onSuccess: () => {
        setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
      },
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    const card = methods.find((m) => m.id === id);
    if (card?.isDefault && methods.length > 1) {
      Alert.alert("Cannot Remove", "Please set another card as default before removing this one.");
      return;
    }
    Alert.alert("Remove Card", `Remove •••• ${card?.last4}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await execute(() => deletePaymentMethod(id), {
            errorDisplay: "toast",
            errorMessage: "Couldn't remove card.",
            successDisplay: "toast",
            successMessage: "Card removed.",
            onSuccess: () => setMethods((prev) => prev.filter((m) => m.id !== id)),
          });
        },
      },
    ]);
  };

  // ── Add card ──────────────────────────────────────────────────────────────
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment Methods</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.teal} size="large" /></View>
      ) : (
        <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {methods.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No payment methods</Text>
              <Text style={styles.emptySubtitle}>Add a card to enable paid subscriptions</Text>
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

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
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
  title: { fontFamily: FONTS.bold, fontSize: 18, color: C.textPri },
  scroll: { padding: 18 },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: C.textPri },
  emptySubtitle: { fontFamily: FONTS.light, fontSize: 13, color: C.textMuted, textAlign: "center" },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1.5, borderColor: C.tealBorder,
    borderStyle: "dashed", paddingVertical: 16, marginTop: 4,
  },
  addBtnIcon: { fontFamily: FONTS.bold, fontSize: 20, color: C.teal },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: C.teal },
});
