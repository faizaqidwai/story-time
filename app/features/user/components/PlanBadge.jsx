// ─────────────────────────────────────────────────────────────────────────────
// PLAN BADGE — shown top-right of the Account screen header
//
// Usage in account.jsx:
//
//   import { useSubscription } from "./_contexts/SubscriptionContext";
//   import PlanBadge from "./components/PlanBadge";
//
//   // inside Account component:
//   const { planName, isFree } = useSubscription();
//
//   // inside the header/top area JSX:
//   <PlanBadge planName={planName} isFree={isFree} />
//
// The badge is already styled to sit nicely in the account option cards row.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";

const C = {
  teal: "#00C4CC",
  yellow: "#F5A623",
  coral: "#E8445A",
  textMuted: "#8899AA",
};

export default function PlanBadge({ planName, isFree }) {
  const router = useRouter();
  const color = isFree ? C.textMuted : C.yellow;
  const bg = isFree ? "rgba(255,255,255,0.05)" : "rgba(245,166,35,0.10)";
  const border = isFree ? "rgba(255,255,255,0.10)" : "rgba(245,166,35,0.35)";

  return (
    <TouchableOpacity
      style={[s.badge, { backgroundColor: bg, borderColor: border }]}
      onPress={() => router.push("/components/billing/SubscriptionPlansScreen")}
      activeOpacity={0.8}
    >
      <Text style={[s.dot, { color }]}>●</Text>
      <Text style={[s.label, { color }]} numberOfLines={1}>
        {planName}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 140,
  },
  dot: { fontSize: 8 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    letterSpacing: 0.3,
  },
});
