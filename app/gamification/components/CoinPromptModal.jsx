/**
 * CoinPromptModal.jsx (SINGLE SCREEN + PURCHASE)
 */

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
import { FONTS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";
import { useGamification } from "../GamificationContext";
import { useUser } from "../../_contexts/UserContext";

const { height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(8,8,26,0.96)",
  teal: "#00BCD4",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowBorder: "rgba(255,213,79,0.6)",
  red: "#EF5350",
  redBorder: "rgba(239,83,80,0.5)",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const SHEET_HEIGHT = SH * 0.65;

/* ---------------- COIN PILE ---------------- */

const PILE_OFFSETS = [
  { x: 0, y: 0, rot: "0deg", sc: 1 },
  { x: -12, y: -6, rot: "-10deg", sc: 0.85 },
  { x: 12, y: -6, rot: "10deg", sc: 0.85 },
];

function PileIcon({ source, size = 60 }) {
  return (
    <View style={{ width: size + 30, height: size + 20 }}>
      {PILE_OFFSETS.map((o, i) => (
        <ExpoImage
          key={i}
          source={source}
          style={{
            position: "absolute",
            width: size * o.sc,
            height: size * o.sc,
            bottom: 0,
            left: "50%",
            marginLeft: -(size * o.sc) / 2 + o.x,
            transform: [{ rotate: o.rot }],
            opacity: 1 - i * 0.1,
          }}
          contentFit="contain"
        />
      ))}
    </View>
  );
}

/* ---------------- MAIN ---------------- */

export default function CoinPromptModal() {
  const { coinPrompt, setCoinPrompt, coinShopConfig } = useGamification();
  const { currentProfile } = useUser();

  const coins = currentProfile?.coins ?? 0;
  const shopConfig = coinShopConfig ?? { enabled: false };

  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!coinPrompt) return;

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
  }, [coinPrompt]);

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
    ]).start(() => setCoinPrompt(false));
  }, []);

  if (!coinPrompt) return null;

  return (
    <Modal transparent visible animationType="none">
      <View style={s.shell}>
        {/* SCRIM */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[s.scrim, { opacity: scrim }]} />
        </TouchableOpacity>

        {/* SHEET */}
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <View style={s.handle} />

          <Animated.View style={{ opacity, transform: [{ scale }] }}>
            {/* HEADER */}
            <View style={s.header}>
              <PileIcon source={require("../../../assets/img/coin.png")} />
              <Text style={[s.count, { color: C.red }]}>{coins}</Text>
              <Text style={s.label}>Coins Available</Text>
            </View>

            {/* MESSAGE */}
            <Text style={s.mainText}>Not enough coins 😕</Text>
            <Text style={s.subText}>You need 100 coins to play this game</Text>

            {/* DIVIDER */}
            {shopConfig.enabled && (
              <>
                {/* PURCHASE */}
                <View style={s.packRow}>
                  <TouchableOpacity style={s.pack}>
                    <ExpoImage
                      source={require("../../../assets/img/coin.png")}
                      style={s.packIcon}
                      contentFit="contain"
                    />
                    <Text style={s.packValue}>+500</Text>
                    <Text style={s.packPrice}>$0.99</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.pack, s.best]}>
                    <ExpoImage
                      source={require("../../../assets/img/coin.png")}
                      style={s.packIcon}
                      contentFit="contain"
                    />
                    <Text style={s.packValue}>+1200</Text>
                    <Text style={s.packPrice}>$1.99</Text>
                    <Text style={s.bestBadge}>BEST</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.pack}>
                    <ExpoImage
                      source={require("../../../assets/img/coin.png")}
                      style={s.packIcon}
                      contentFit="contain"
                    />
                    <Text style={s.packValue}>+3000</Text>
                    <Text style={s.packPrice}>$3.99</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}> OR </Text>
                  <View style={s.dividerLine} />
                </View>
              </>
            )}
            {/* EARN */}
            <View style={{ width: "100%", alignItems: "center" }}>
              <Text style={s.earnSub}>
                Complete stories to earn 150–200 coins
              </Text>
            </View>

            {/* ACTION */}
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Read Story📚</Text>
            </TouchableOpacity>
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
    backgroundColor: C.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: pad.lg,
  },
  packIcon: {
    width: 22,
    height: 22,
    marginBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    alignSelf: "center",
    backgroundColor: "#ffffff30",
    borderRadius: 3,
    marginBottom: 10,
  },

  header: { alignItems: "center" },

  count: {
    fontSize: font.h1,
    fontFamily: FONTS.bold,
  },

  label: {
    color: C.textMuted,
    fontSize: font.md,
  },

  mainText: {
    textAlign: "center",
    color: C.textPri,
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    marginTop: 6,
  },

  subText: {
    textAlign: "center",
    color: C.textMuted,
    fontSize: font.lg,
    marginBottom: pad.md,
  },

  earnCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    backgroundColor: "rgba(255,213,79,0.08)",
    padding: pad.md,
    marginBottom: pad.lg,
  },

  earnTitle: {
    fontFamily: FONTS.bold,
    color: C.textPri,
    fontSize: font.xl,
  },

  earnSub: {
    color: C.textMuted,
    fontSize: font.lg,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: pad.md,
  },

  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: "rgba(255,213,79,0.35)",
  },

  dividerText: {
    color: "#7a9aaa",
    marginHorizontal: 8,
  },

  packRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: pad.lg,
  },

  pack: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,188,212,0.12)",
    borderWidth: 1.5,
    borderColor: C.tealBorder,
  },

  best: {
    transform: [{ scale: 1.05 }],
    borderColor: C.yellow,
    backgroundColor: "rgba(255,213,79,0.18)",
  },

  packEmoji: { fontSize: 18 },

  packValue: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.textPri,
  },

  packPrice: {
    fontSize: font.sm,
    color: C.textMuted,
  },

  bestBadge: {
    fontSize: 10,
    color: C.yellow,
    marginTop: 2,
  },

  primaryBtn: {
    marginTop: pad.sm,
    paddingVertical: pad.md,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,188,212,0.15)",
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    alignItems: "center",
  },

  primaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.teal,
  },
});
