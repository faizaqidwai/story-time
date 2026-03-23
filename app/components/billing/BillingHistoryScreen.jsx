// app/components/billing/BillingHistoryScreen.jsx
//
// Billing history — lists all invoices with date, description, amount, status.
// Download link shown when available (stubbed in mock mode).

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
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { getInvoices } from "../../services/billingService";

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealBorder: "rgba(0,188,212,0.3)",
  yellow: "#FFD54F",
  green: "#4CAF50",
  red: "#EF5350",
  orange: "#FF9800",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const STATUS_CONFIG = {
  paid:    { label: "Paid",    color: C.green,  bg: "rgba(76,175,80,0.12)",   border: "rgba(76,175,80,0.4)"   },
  pending: { label: "Pending", color: C.orange, bg: "rgba(255,152,0,0.12)",   border: "rgba(255,152,0,0.4)"   },
  failed:  { label: "Failed",  color: C.red,    bg: "rgba(239,83,80,0.12)",   border: "rgba(239,83,80,0.4)"   },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function InvoiceRow({ invoice }) {
  const sc = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.pending;
  return (
    <View style={iS.row}>
      <View style={iS.rowLeft}>
        <Text style={iS.rowDate}>{formatDate(invoice.date)}</Text>
        <Text style={iS.rowDesc} numberOfLines={1}>{invoice.description}</Text>
      </View>
      <View style={iS.rowRight}>
        <Text style={iS.rowAmount}>
          {invoice.currency === "USD" ? "$" : invoice.currency}{invoice.amount.toFixed(2)}
        </Text>
        <View style={[iS.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[iS.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
        {invoice.downloadUrl && (
          <TouchableOpacity
            onPress={() => Alert.alert("Download", "Opening receipt...")}
            activeOpacity={0.7}
          >
            <Text style={iS.downloadLink}>↓ PDF</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const iS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 12,
  },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 11, color: C.textMuted, marginBottom: 3 },
  rowDesc: { fontSize: 13, fontWeight: "700", color: C.textPri },
  rowRight: { alignItems: "flex-end", gap: 5 },
  rowAmount: { fontSize: 15, fontWeight: "900", color: C.textPri },
  statusBadge: {
    borderRadius: 7, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  downloadLink: { fontSize: 10, fontWeight: "700", color: C.teal },
});

export default function BillingHistoryScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getInvoices()
      .then(setInvoices)
      .finally(() => {
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
  }, []);

  // Totals
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((acc, i) => acc + i.amount, 0);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Billing History</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.teal} size="large" /></View>
      ) : (
        <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Summary strip */}
          {invoices.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>{invoices.length}</Text>
                <Text style={styles.summaryLbl}>Total invoices</Text>
              </View>
              <View style={styles.summaryDiv} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>${totalPaid.toFixed(2)}</Text>
                <Text style={styles.summaryLbl}>Total paid</Text>
              </View>
              <View style={styles.summaryDiv} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>
                  {invoices.filter((i) => i.status === "paid").length}
                </Text>
                <Text style={styles.summaryLbl}>Paid invoices</Text>
              </View>
            </View>
          )}

          {/* Invoice list */}
          {invoices.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No billing history</Text>
              <Text style={styles.emptySubtitle}>Your invoices will appear here after your first payment</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              <Text style={styles.listLabel}>All Invoices</Text>
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      )}
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
  scroll: { padding: 18 },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    marginBottom: 20,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontSize: 18, fontWeight: "900", color: C.teal },
  summaryLbl: { fontSize: 9, color: C.textMuted, fontWeight: "600", marginTop: 2, textAlign: "center" },
  summaryDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  listCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
  },
  listLabel: { fontSize: 11, fontWeight: "800", color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.textPri },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", maxWidth: 260 },
});
