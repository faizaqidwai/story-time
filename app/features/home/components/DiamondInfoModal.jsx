/**
 * DiamondInfoModal.jsx (SINGLE SCREEN VERSION)
 */


// BRAND UPDATE — feature/brand-guidelines-v2
// COLOUR-ONLY — zero functional/logic/animation changes:
//   ✅ Local C{} colour object removed — COLORS imported from theme
//   ✅ Old cyan #00BCD4 → COLORS.primary (#00C4CC)
//   ✅ Old yellow #FFD54F → COLORS.amber (#F5A623)
//   ✅ All rgba(0,188,212,…) → rgba(0,196,204,…) correct cyan hex
//   ✅ All rgba(255,213,79,…) → rgba(245,166,35,…) correct amber hex
//   ✅ Old text colours → COLORS.textPrimary / COLORS.textMuted

import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS, COLORS } from "../../../theme";
import { font, pad, radius } from "../../../theme/tokens";

const { height: SH } = Dimensions.get("window");

// Brand colours from theme — COLORS imported above

const SHEET_HEIGHT = SH * 0.65;

/* ---------------- MAIN ---------------- */

export default function DiamondInfoModal({ visible, onClose, diamonds = 0 }) {
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    sheetY.setValue(SHEET_HEIGHT);
    scrim.setValue(0);

    Animated.parallel([
      Animated.timing(scrim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scrim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none">
      <View style={s.shell}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[s.scrim, { opacity: scrim }]} />
        </TouchableOpacity>
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <View style={s.handle} />

          <Animated.View style={{ opacity, transform: [{ scale }] }}>
            {/* 💎 HEADER */}
            <View style={s.header}>
              <ExpoImage
                source={require("../../../../assets/img/diamond.png")}
                style={s.icon}
                contentFit="contain"
              />
              <Text style={s.count}>{diamonds}</Text>
              <Text style={s.label}>Diamonds</Text>
            </View>

            {/* 🎯 MAIN MESSAGE */}
            <Text style={s.mainText}>Diamonds unlock fun games </Text>

            <Text style={s.subText}>Keep reading to earn more 💎</Text>

            {/*
            <View style={[s.dividerRow, {}]}>
              <View style={s.dividerLine} />
              <Text style={[s.dividerText, { fontSize: font.md }]}> OR </Text>
              <View style={s.dividerLine} />
            </View>

            {/* 💰 SECONDARY (PURCHASE) 
            <View style={s.purchaseWrap}>
              <Text style={s.purchaseHint}></Text>

              <View style={s.packRow}>
                <TouchableOpacity style={s.packFun}>
                  <Text style={s.packEmoji}>💎</Text>
                  <Text style={s.packValue}>+100</Text>
                  <Text style={s.packPrice}>$0.99</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.packFun, s.bestFun]}>
                  <Text style={s.packEmoji}>💎✨</Text>
                  <Text style={s.packValue}>+250</Text>
                  <Text style={s.packPrice}>$1.99</Text>
                  <Text style={s.bestBadge}>BEST</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.packFun}>
                  <Text style={s.packEmoji}>💎💎</Text>
                  <Text style={s.packValue}>+500</Text>
                  <Text style={s.packPrice}>$3.99</Text>
                </TouchableOpacity>
              </View>
            </View>
            */}
            {/* CLOSE */}
            {/* <TouchableOpacity style={s.btn} onPress={handleClose}>
              <Text style={s.btnText}>Got it ✓</Text>
            </TouchableOpacity> */}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ---------------- STYLES ---------------- */

const s = StyleSheet.create({
  shell: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: SHEET_HEIGHT,
    backgroundColor: "rgba(10,16,38,0.96)",
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: pad.lg,
  },
  packPrice: {
    fontSize: font.md,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  handle: {
    width: 40,
    height: 5,
    alignSelf: "center",
    backgroundColor: "#ffffff30",
    borderRadius: 3,
    marginBottom: 10,
  },
  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    // gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: "rgba(0,196,204,0.35)",
  },
  dividerText: {
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },

  header: {
    alignItems: "center",
    marginBottom: 6,
  },

  icon: {
    width: 50,
    height: 50,
    marginBottom: 4,
  },

  count: {
    fontSize: font.h1,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  label: {
    color: COLORS.textMuted,
    fontSize: font.md,
  },

  mainText: {
    textAlign: "center",
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    marginTop: 6,
  },

  subText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: font.lg,
    marginBottom: pad.xl,
  },

  /* ⭐ HERO CARD (IMPORTANT) */

  /* ⭐ BIG BUTTON (MAIN ATTRACTION) */
  bigActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    backgroundColor: "rgba(0,196,204,0.18)", // brighter
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },

  bigActionEmoji: {
    fontSize: 28,
  },

  bigActionTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    color: COLORS.textPrimary,
  },

  bigActionSub: {
    color: COLORS.textMuted,
    fontSize: font.sm,
  },

  /* 💰 FUN SHOP BUTTONS */
  packFun: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(0,196,204,0.12)",
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
  },

  bestFun: {
    backgroundColor: "rgba(245,166,35,0.18)",
    borderColor: COLORS.amber,
    transform: [{ scale: 1.08 }],
  },

  packEmoji: {
    fontSize: 20,
  },

  packValue: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
  },

  bestBadge: {
    fontSize: font.sm,
    color: COLORS.amber,
    marginTop: 2,
  },

  earnCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    backgroundColor: "rgba(0,196,204,0.08)",
    padding: pad.md,
    marginBottom: 18,
  },

  earnTitle: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    fontSize: font.xl,
    marginBottom: 2,
  },

  earnSub: {
    color: COLORS.textMuted,
    fontSize: font.md,
  },

  /* 💰 PURCHASE */
  purchaseWrap: {
    width: "100%",
  },

  purchaseHint: {
    color: COLORS.textMuted,
    fontSize: font.lg,
    marginBottom: pad.sm,
    textAlign: "center",
  },

  packRow: {
    flexDirection: "row",
    gap: 8,
  },

  packCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,196,204,0.25)", // 👈 reduced intensity
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(0,196,204,0.04)", // 👈 softer
  },

  best: {
    borderColor: COLORS.amber,
    backgroundColor: "rgba(245,166,35,0.08)",
  },

  packAmount: {
    color: COLORS.textPrimary,
    fontSize: font.sm,
  },

  badge: {
    fontSize: 10,
    color: COLORS.amber,
    marginTop: 2,
  },

  /* BUTTON (LESS DOMINANT) */
  btn: {
    marginTop: 18,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,196,204,0.4)",
  },

  btnText: {
    color: COLORS.primary,
    fontSize: font.sm,
    fontFamily: FONTS.bold,
  },
});
