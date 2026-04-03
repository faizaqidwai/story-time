// app/components/billing/LevelSelectScreen.jsx
//
// Shown ONLY on first free → paid subscription upgrade.
// Asks the user to choose a starting level (1–10) for their default profile.
// On confirm, PATCHes the profile's playLevel then navigates to PurchaseScreen.

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FONTS } from "../../theme";
import { useApiCall } from "../../_hooks/useApiCall";
import { apiClient } from "../../services/apiClient";
import { useUser } from "../../_contexts/UserContext";

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.12)",
  tealBorder: "rgba(0,188,212,0.3)",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

const LEVEL_DESCRIPTIONS = {
  1:  "Complete beginner — starting fresh",
  2:  "Recognises some letters and words",
  3:  "Can read simple sentences",
  4:  "Reads short stories with help",
  5:  "Independent early reader",
  6:  "Reads fluently with good comprehension",
  7:  "Advanced reader, strong vocabulary",
  8:  "Near grade-level reading",
  9:  "Above grade-level reading",
  10: "Expert reader — complex texts",
};

export default function LevelSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { execute } = useApiCall();
  const { currentProfile, updateProfile } = useUser();

  const pkg = params.packageJson ? JSON.parse(params.packageJson) : null;

  const [selectedLevel, setSelectedLevel] = useState(
    currentProfile?.playLevel ?? 1,
  );
  const [saving, setSaving] = useState(false);

  const profileName = currentProfile?.name ?? "your child";

  const handleConfirm = async () => {
    if (!currentProfile) return;
    setSaving(true);

    await execute(
      () =>
        apiClient.patch(`/profiles/${currentProfile.id}/level`, {
          playLevel: selectedLevel,
        }),
      {
        errorDisplay: "sheet",
        errorMessage: "Couldn't Save Level",
        errorSubMessage: "Please try again.",
        errorRetry: true,
        onSuccess: async () => {
          // Update local context so the home screen reflects the change immediately
          await updateProfile({ ...currentProfile, playLevel: selectedLevel });
          // Proceed to checkout
          router.replace({
            pathname: "/components/billing/PurchaseScreen",
            params: { packageJson: JSON.stringify(pkg) },
          });
        },
      },
    );

    setSaving(false);
  };

  if (!pkg) {
    return (
      <View style={s.root}>
        <View style={s.center}>
          <Text style={s.errorText}>Missing package data. Please go back.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerBack}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={s.headerBackIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Choose Starting Level</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={s.introBox}>
          <Text style={s.introEmoji}>📚</Text>
          <Text style={s.introTitle}>
            Where is {profileName} in their reading journey?
          </Text>
          <Text style={s.introSub}>
            This sets their starting level. You can always change it later from
            the account settings.
          </Text>
        </View>

        {/* Level grid */}
        <View style={s.grid}>
          {LEVELS.map((level) => {
            const isSelected = selectedLevel === level;
            return (
              <TouchableOpacity
                key={level}
                style={[s.levelCard, isSelected && s.levelCardSelected]}
                onPress={() => setSelectedLevel(level)}
                activeOpacity={0.8}
              >
                <Text style={[s.levelNumber, isSelected && s.levelNumberSelected]}>
                  {level}
                </Text>
                <Text
                  style={[
                    s.levelDesc,
                    isSelected && s.levelDescSelected,
                  ]}
                  numberOfLines={2}
                >
                  {LEVEL_DESCRIPTIONS[level]}
                </Text>
                {isSelected && <View style={s.selectedDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected level callout */}
        <View style={s.selectedCallout}>
          <Text style={s.selectedCalloutLabel}>Selected level</Text>
          <Text style={s.selectedCalloutLevel}>{selectedLevel}</Text>
          <Text style={s.selectedCalloutDesc}>
            {LEVEL_DESCRIPTIONS[selectedLevel]}
          </Text>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[s.confirmBtn, saving && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={saving}
          activeOpacity={0.88}
        >
          <View style={s.confirmShine} />
          {saving ? (
            <ActivityIndicator color="#08081a" size="small" />
          ) : (
            <Text style={s.confirmText}>Continue to Checkout →</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  errorText: { fontFamily: FONTS.light, fontSize: 14, color: C.textMuted, textAlign: "center" },
  backBtn: { backgroundColor: C.teal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: "#08081a" },

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
  headerBack: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  headerBackIcon: { fontFamily: FONTS.bold, fontSize: 18, color: C.teal },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: C.textPri, letterSpacing: 0.3 },

  scroll: { padding: 20 },

  introBox: {
    alignItems: "center",
    backgroundColor: "rgba(0,188,212,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.18)",
    padding: 20,
    marginBottom: 24,
    gap: 8,
  },
  introEmoji: { fontSize: 40, marginBottom: 4 },
  introTitle: {
    fontFamily: FONTS.bold, fontSize: 17, color: C.textPri,
    textAlign: "center", lineHeight: 24,
  },
  introSub: {
    fontFamily: FONTS.light, fontSize: 12, color: C.textMuted,
    textAlign: "center", lineHeight: 18,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  levelCard: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  levelCardSelected: {
    backgroundColor: C.tealDim,
    borderColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  levelNumber: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: C.textMuted,
  },
  levelNumberSelected: { color: C.teal },
  levelDesc: {
    display: "none", // hidden in the grid, shown in callout
  },
  levelDescSelected: { display: "none" },
  selectedDot: {
    position: "absolute",
    top: 4, right: 4,
    width: 7, height: 7,
    borderRadius: 3.5,
    backgroundColor: C.teal,
  },

  selectedCallout: {
    backgroundColor: "rgba(0,188,212,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
    gap: 4,
  },
  selectedCalloutLabel: {
    fontFamily: FONTS.bold, fontSize: 10, color: C.textMuted,
    letterSpacing: 1, textTransform: "uppercase",
  },
  selectedCalloutLevel: {
    fontFamily: FONTS.bold, fontSize: 40, color: C.teal, lineHeight: 48,
  },
  selectedCalloutDesc: {
    fontFamily: FONTS.light, fontSize: 13, color: C.textSec,
    textAlign: "center",
  },

  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 27, height: 54, backgroundColor: C.teal,
    overflow: "hidden",
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmShine: {
    position: "absolute", top: 0, left: "14%",
    width: "38%", height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20, transform: [{ rotate: "-15deg" }],
  },
  confirmText: { fontFamily: FONTS.bold, fontSize: 16, color: "#08081a", letterSpacing: 0.3 },
});
