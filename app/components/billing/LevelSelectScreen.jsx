// app/components/billing/LevelSelectScreen.jsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FONTS } from "../../theme";
import { useApiCall } from "../../_hooks/useApiCall";
import { apiClient } from "../../services/apiClient";
import { useUser } from "../../_contexts/UserContext";
import { font, pad, radius, size } from "../../theme/tokens"; // ← REPLACES useTheme

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
  1: "Complete beginner — starting fresh",
  2: "Recognises some letters and words",
  3: "Can read simple sentences",
  4: "Reads short stories with help",
  5: "Independent early reader",
  6: "Reads fluently with good comprehension",
  7: "Advanced reader, strong vocabulary",
  8: "Near grade-level reading",
  9: "Above grade-level reading",
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

  useEffect(() => {
    console.log("[LEVEL SELECT LIFECYCLE] LEVEL SELECT MOUNTED");
    return () => {
      console.log("[LEVEL LIFECYCLE] LEVEL UNMOUNTED");
    };
  }, []);

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
          await updateProfile({ ...currentProfile, playLevel: selectedLevel });
          router.replace({
            pathname: "/components/billing/PurchaseScreen",
            params: { packageJson: JSON.stringify(pkg) },
          });
        },
      },
    );
    setSaving(false);
  };

  // ── Guard: no package ─────────────────────────────────────
  if (!pkg) {
    return (
      <View style={styles.root}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>
            Missing package data. Please go back.
          </Text>
          <TouchableOpacity
            style={styles.errorBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Starting Level</Text>
        <View style={{ width: size.hitMd }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro box */}
        <View style={styles.introBox}>
          <Text style={styles.introEmoji}>📚</Text>
          <Text style={styles.introTitle}>
            Where is {profileName} in their reading journey?
          </Text>
          <Text style={styles.introSub}>
            This sets their starting level. You can always change it later from
            the account settings.
          </Text>
        </View>

        {/* Level grid */}
        <View style={styles.grid}>
          {LEVELS.map((level) => {
            const isSelected = selectedLevel === level;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelCard,
                  isSelected && styles.levelCardSelected,
                ]}
                onPress={() => setSelectedLevel(level)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.levelNumber,
                    isSelected && styles.levelNumberSelected,
                  ]}
                >
                  {level}
                </Text>
                {isSelected && <View style={styles.selectedDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected callout */}
        <View style={styles.callout}>
          <Text style={styles.calloutLabel}>Selected level</Text>
          <Text style={styles.calloutLevel}>{selectedLevel}</Text>
          <Text style={styles.calloutDesc}>
            {LEVEL_DESCRIPTIONS[selectedLevel]}
          </Text>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={saving}
          activeOpacity={0.88}
        >
          <View style={styles.confirmShine} />
          {saving ? (
            <ActivityIndicator color="#08081a" size="small" />
          ) : (
            <Text style={styles.confirmText}>Continue to Checkout →</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Error state
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: pad.md, // was: 16
    padding: pad.xl, // was: 24
  },
  errorText: {
    fontFamily: FONTS.light,
    fontSize: font.md, // was: 14
    color: C.textMuted,
    textAlign: "center",
  },
  errorBtn: {
    backgroundColor: C.teal,
    borderRadius: radius.md, // was: 12
    paddingHorizontal: pad.xl, // was: 24
    paddingVertical: pad.sm, // was: 12
  },
  errorBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md, // was: 14
    color: "#08081a",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + pad.sm, // was: + 10
    paddingBottom: pad.md, // was: sz.levelHeaderPaddingBottom
    paddingHorizontal: pad.md, // was: sz.levelHeaderPaddingH
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.1)",
  },
  backBtn: {
    width: size.hitMd, // was: sz.levelBackBtnSize
    height: size.hitMd,
    borderRadius: size.hitMd / 2, // was: sz.levelBackBtnBorderRadius
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontFamily: FONTS.bold,
    fontSize: font.lg, // was: sz.levelBackIconFontSize
    color: C.teal,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl, // was: sz.levelHeaderTitleFontSize
    color: C.textPri,
    letterSpacing: 0.3,
  },

  // Scroll
  scroll: { padding: pad.lg }, // was: sz.levelScrollPadding

  // Intro box
  introBox: {
    alignItems: "center",
    backgroundColor: "rgba(0,188,212,0.06)",
    borderRadius: radius.xl, // was: sz.levelIntroBoxBorderRadius
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.18)",
    padding: pad.lg, // was: sz.levelIntroBoxPadding
    marginBottom: pad.xl, // was: sz.levelIntroBoxMarginBottom
    gap: pad.s, // was: sz.levelIntroBoxGap
  },
  introEmoji: {
    fontSize: size.iconXl, // was: sz.levelIntroEmojiFontSize
    marginBottom: pad.xs,
  },
  introTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.lg, // was: sz.levelIntroTitleFontSize
    color: C.textPri,
    textAlign: "center",
    lineHeight: font.lg * 1.4, // was: sz.levelIntroTitleLineHeight
  },
  introSub: {
    fontFamily: FONTS.light,
    fontSize: font.sm, // was: sz.levelIntroSubFontSize
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.sm * 1.5, // was: sz.levelIntroSubLineHeight
  },

  // Level grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: pad.sm, // was: sz.levelGridGap
    marginBottom: pad.lg, // was: sz.levelGridMarginBottom
    alignItems: "center",
    justifyContent: "center",
  },
  levelCard: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: radius.md, // was: sz.levelCardBorderRadius
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
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
    fontSize: font.xxl, // was: sz.levelCardNumberFontSize
    color: C.textMuted,
  },
  levelNumberSelected: { color: C.teal },
  selectedDot: {
    position: "absolute",
    top: pad.xs, // was: 4
    right: pad.xs, // was: 4
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.teal,
  },

  // Callout
  callout: {
    backgroundColor: "rgba(0,188,212,0.08)",
    borderRadius: radius.xl, // was: sz.levelCalloutBorderRadius
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
    padding: pad.md, // was: sz.levelCalloutPadding
    alignItems: "center",
    marginBottom: pad.xl, // was: sz.levelCalloutMarginBottom
    gap: pad.xs, // was: sz.levelCalloutGap
  },
  calloutLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.xs, // was: sz.levelCalloutLabelFontSize
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  calloutLevel: {
    fontFamily: FONTS.bold,
    fontSize: font.h1, // was: sz.levelCalloutLevelFontSize
    color: C.teal,
    lineHeight: font.h1 * 1.2, // was: sz.levelCalloutLevelLineHeight
  },
  calloutDesc: {
    fontFamily: FONTS.light,
    fontSize: font.md, // was: sz.levelCalloutDescFontSize
    color: C.textSec,
    textAlign: "center",
  },

  // Confirm button
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: pad.s,
    borderRadius: radius.pill, // was: sz.levelConfirmBtnBorderRadius
    height: size.btnHeightLg, // was: sz.levelConfirmBtnHeight
    backgroundColor: C.teal,
    overflow: "hidden",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmShine: {
    position: "absolute",
    top: 0,
    left: "14%",
    width: "38%",
    height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  confirmText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg, // was: sz.levelConfirmTextFontSize
    color: "#08081a",
    letterSpacing: 0.3,
  },
});
