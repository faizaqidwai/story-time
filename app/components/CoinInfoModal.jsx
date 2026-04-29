/**
 * CoinInfoModal.jsx
 * app/components/CoinInfoModal.jsx
 *
 * Same animation pattern as StoryFinishOverlay and DiamondInfoModal.
 * Step 0: Coin pile + current balance
 * Step 1: What coins do
 * Step 2: How to earn (Continue button)
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Animated, Easing,
  Dimensions, TouchableOpacity, Modal,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../theme";
import { font, pad, radius } from "../theme/tokens";

const { height: SH } = Dimensions.get("window");

const C = {
  bg:           "rgba(8,8,26,0.96)",
  teal:         "#00BCD4",
  tealGlow:     "rgba(0,188,212,0.35)",
  tealBorder:   "rgba(0,188,212,0.5)",
  yellow:       "#FFD54F",
  yellowGlow:   "rgba(255,213,79,0.35)",
  yellowBorder: "rgba(255,213,79,0.6)",
  textPri:      "#E0F7FA",
  textMuted:    "#7a9aaa",
};

const SHEET_HEIGHT = SH * 0.68;
const TOP_CLEAR    = SH - SHEET_HEIGHT;

const PILE_OFFSETS = [
  { x: 0,   y: 0,   rot: "0deg",   sc: 1.0  },
  { x: -16, y: -9,  rot: "-13deg", sc: 0.87 },
  { x: 16,  y: -9,  rot: "13deg",  sc: 0.87 },
  { x: -9,  y: -18, rot: "-6deg",  sc: 0.75 },
  { x: 9,   y: -18, rot: "6deg",   sc: 0.75 },
];

function PileIcon({ source, size: iconSize = 72, glowColor }) {
  return (
    <View style={{ width: iconSize + 40, height: iconSize + 22, alignItems: "center", justifyContent: "flex-end" }}>
      {PILE_OFFSETS.map((o, i) => (
        <ExpoImage key={i} source={source} style={{
          position: "absolute", width: iconSize * o.sc, height: iconSize * o.sc,
          bottom: 0, left: "50%", marginLeft: -(iconSize * o.sc) / 2 + o.x,
          marginBottom: -o.y, opacity: 1 - i * 0.07,
          transform: [{ rotate: o.rot }],
          shadowColor: glowColor, shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.7, shadowRadius: 10,
        }} contentFit="contain" />
      ))}
    </View>
  );
}

function InfoChip({ icon, text, delay }) {
  const sc = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(sc, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View style={[cS.chip, { opacity: op, transform: [{ scale: sc }] }]}>
      <Text style={cS.chipIcon}>{icon}</Text>
      <Text style={cS.chipText}>{text}</Text>
    </Animated.View>
  );
}

const cS = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,213,79,0.08)", borderWidth: 1.5,
    borderColor: C.yellowBorder, borderRadius: radius.pill,
    paddingHorizontal: pad.sm, paddingVertical: pad.s,
    marginVertical: pad.xs, width: "100%",
  },
  chipIcon: { fontSize: font.xl },
  chipText: { fontFamily: FONTS.regular, color: C.textPri, fontSize: font.md, flex: 1, lineHeight: font.md * 1.4 },
});

const STEPS = (coins) => [
  {
    accentColor:  C.yellow,
    glowColor:    C.yellowGlow,
    borderColor:  C.yellowBorder,
    image:        require("../../assets/img/coin.png"),
    heading:      "Your Coins",
    countLabel:   `${coins}`,
    countUnit:    "Coins 🪙",
    subLabel:     "ready to play with!",
    chips:        null,
    showContinue: false,
  },
  {
    accentColor:  C.teal,
    glowColor:    C.tealGlow,
    borderColor:  C.tealBorder,
    image:        require("../../assets/img/coin.png"),
    heading:      "What Coins Do",
    countLabel:   "100 🪙",
    countUnit:    "per game session",
    subLabel:     "spend coins to play any unlocked game",
    chips: [
      { icon: "🎮", text: "Play any unlocked game for 100 coins" },
      { icon: "🔄", text: "Includes Play Again — each session costs coins" },
    ],
    showContinue: false,
  },
  {
    accentColor:  C.yellow,
    glowColor:    C.yellowGlow,
    borderColor:  C.yellowBorder,
    image:        require("../../assets/img/coin.png"),
    heading:      "How to Earn",
    countLabel:   "150–200 🪙",
    countUnit:    "per story",
    subLabel:     "complete stories to keep playing!",
    chips: [
      { icon: "📚", text: "Complete any story to earn 150–200 coins" },
      { icon: "⚖️", text: "More reading = more playing. Keep the balance!" },
    ],
    showContinue: true,
  },
];

export default function CoinInfoModal({ visible, onClose, coins = 0 }) {
  const [step, setStep]                 = useState(-1);
  const [showContinue, setShowContinue] = useState(false);
  const advancingRef  = useRef(false);
  const wasVisibleRef = useRef(false);

  const sheetY    = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrOp     = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0.85)).current;
  const opAnim    = useRef(new Animated.Value(0)).current;

  const steps = STEPS(coins);

  useEffect(() => {
    if (!visible) {
      if (!wasVisibleRef.current) return;
      wasVisibleRef.current = false;
      Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true })
        .start(() => { setStep(-1); setShowContinue(false); scrOp.setValue(0); });
      return;
    }
    wasVisibleRef.current = true;
    advancingRef.current = false;
    setShowContinue(false);
    scrOp.setValue(0);
    sheetY.setValue(SHEET_HEIGHT);
    Animated.parallel([
      Animated.timing(scrOp,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
    ]).start((r) => { if (r.finished) setTimeout(() => setStep(0), 300); });
  }, [visible]);

  useEffect(() => {
    if (step < 0 || step >= steps.length) return;
    advancingRef.current = false;
    setShowContinue(false);
    enterAnim.setValue(0.85);
    opAnim.setValue(0);

    Animated.parallel([
      Animated.spring(enterAnim, { toValue: 1, friction: 5, tension: 62, useNativeDriver: true }),
      Animated.timing(opAnim,   { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start((r) => {
      if (!r.finished || advancingRef.current) return;
      advancingRef.current = true;
      if (!steps[step].showContinue) {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opAnim,    { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.spring(enterAnim, { toValue: 0.85, friction: 6, tension: 80, useNativeDriver: true }),
          ]).start(() => setStep((p) => p + 1));
        }, 1200);
      } else {
        setShowContinue(true);
      }
    });
  }, [step]);

  const handleClose = useCallback(() => {
    setShowContinue(false);
    Animated.parallel([
      Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(scrOp,  { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setTimeout(() => onClose?.(), 100));
  }, [onClose]);

  if (!visible && step === -1) return null;
  const cfg = step >= 0 && step < steps.length ? steps[step] : null;

  return (
    <Modal transparent visible={visible || step !== -1} animationType="none" onRequestClose={handleClose}>
      <View style={s.shell} pointerEvents="box-none">
        <Animated.View style={[s.scrim, { opacity: scrOp }]} pointerEvents="none" />
        <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={s.handle} />
          {cfg && (
            <Animated.View style={[s.card, { borderColor: cfg.borderColor, shadowColor: cfg.glowColor, opacity: opAnim, transform: [{ scale: enterAnim }] }]}>
              <Text style={s.heading}>{cfg.heading}</Text>
              <View style={s.pileWrap}>
                <PileIcon source={cfg.image} size={72} glowColor={cfg.glowColor} />
              </View>
              <Text style={[s.countText, { color: cfg.accentColor }]}>{cfg.countLabel}</Text>
              <Text style={s.countUnit}>{cfg.countUnit}</Text>
              <Text style={s.subLabel}>{cfg.subLabel}</Text>
              {cfg.chips && (
                <View style={s.chipsWrap}>
                  {cfg.chips.map((c, i) => (
                    <InfoChip key={i} icon={c.icon} text={c.text} delay={i * 120} />
                  ))}
                </View>
              )}
              {showContinue && (
                <TouchableOpacity style={[s.continueBtn, { borderColor: cfg.accentColor }]} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={[s.continueBtnText, { color: cfg.accentColor }]}>Got it! ✓</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "transparent" },
  scrim: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: TOP_CLEAR + 20, backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT, backgroundColor: C.bg,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5,
    borderColor: "rgba(255,213,79,0.2)",
    alignItems: "center", paddingTop: pad.s,
    shadowColor: "#000", shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 24,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: pad.xs },
  card: { width: "100%", backgroundColor: "transparent", padding: pad.xl, alignItems: "center" },
  heading: {
    fontFamily: FONTS.bold, fontSize: font.xl, color: C.textPri,
    marginBottom: pad.lg, letterSpacing: 0.3,
    textShadowColor: "rgba(255,213,79,0.3)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  pileWrap:  { marginBottom: pad.sm, alignItems: "center" },
  countText: { fontFamily: FONTS.bold, fontSize: font.h2, letterSpacing: 0.5 },
  countUnit: { fontFamily: FONTS.regular, fontSize: font.lg, color: C.textMuted, marginTop: pad.xs },
  subLabel:  { fontFamily: FONTS.regular, fontSize: font.md, color: C.textMuted, marginTop: pad.xs, marginBottom: pad.sm, textAlign: "center" },
  chipsWrap: { width: "100%", marginTop: pad.sm },
  continueBtn: {
    marginTop: pad.lg, borderRadius: radius.pill, borderWidth: 1.5,
    paddingHorizontal: pad.xxl, paddingVertical: pad.sm,
    backgroundColor: "rgba(255,213,79,0.1)",
  },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: font.md },
});
