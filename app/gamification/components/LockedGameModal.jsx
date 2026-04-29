/**
 * LockedGameModal.jsx
 * app/gamification/components/LockedGameModal.jsx
 *
 * Bottom sheet, same animation as StoryFinishOverlay.
 * Step 0: Mystery cover image + progress count
 * Step 1: What to do + Continue button
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";

const { height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(8,8,26,0.96)",
  teal: "#00BCD4",
  tealGlow: "rgba(0,188,212,0.35)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowGlow: "rgba(255,213,79,0.35)",
  yellowBorder: "rgba(255,213,79,0.6)",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const SHEET_HEIGHT = SH * 0.65;
const TOP_CLEAR = SH - SHEET_HEIGHT;

const PILE_OFFSETS = [
  { x: 0, y: 0, rot: "0deg", sc: 1.0 },
  { x: -16, y: -9, rot: "-13deg", sc: 0.87 },
  { x: 16, y: -9, rot: "13deg", sc: 0.87 },
  { x: -9, y: -18, rot: "-6deg", sc: 0.75 },
  { x: 9, y: -18, rot: "6deg", sc: 0.75 },
];

// Cover image stack — same pile pattern but with the scratch-cover image
function CoverPile({ size: iconSize = 72 }) {
  return (
    <View
      style={{
        width: iconSize + 40,
        height: iconSize + 22,
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {PILE_OFFSETS.map((o, i) => (
        <ExpoImage
          key={i}
          source={require("../../../assets/games/scratch-cover.jpeg")}
          style={{
            position: "absolute",
            width: iconSize * o.sc,
            height: iconSize * o.sc * 1.33,
            bottom: 0,
            left: "50%",
            marginLeft: -(iconSize * o.sc) / 2 + o.x,
            marginBottom: -o.y,
            opacity: 1 - i * 0.07,
            borderRadius: 8,
            transform: [{ rotate: o.rot }],
            shadowColor: C.yellowGlow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
          }}
          contentFit="cover"
        />
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
        Animated.spring(sc, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[cS.chip, { opacity: op, transform: [{ scale: sc }] }]}
    >
      <Text style={cS.chipIcon}>{icon}</Text>
      <Text style={cS.chipText}>{text}</Text>
    </Animated.View>
  );
}

const cS = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,213,79,0.08)",
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    borderRadius: radius.pill,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
    marginVertical: pad.xs,
    width: "100%",
  },
  chipIcon: { fontSize: font.xl },
  chipText: {
    fontFamily: FONTS.regular,
    color: C.textPri,
    fontSize: font.md,
    flex: 1,
    lineHeight: font.md * 1.4,
  },
});

const MESSAGES = [
  "Complete any 3 stories in this level to scratch away the cover!",
  "2 more stories to go — you're getting closer!",
  "Just 1 more story — the surprise is almost revealed!",
];

export default function LockedGameModal({
  visible,
  storiesCompleted = 0,
  onClose,
  onGoRead,
}) {
  const msgIndex = Math.min(storiesCompleted, MESSAGES.length - 1);

  const [step, setStep] = useState(-1);
  const [showContinue, setShowContinue] = useState(false);
  const advancingRef = useRef(false);
  const wasVisibleRef = useRef(false);

  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0.85)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  const STEPS = [
    {
      accentColor: C.yellow,
      glowColor: C.yellowGlow,
      borderColor: C.yellowBorder,
      heading: "A Surprise is Hiding!",
      countLabel: `${storiesCompleted}/3`,
      countUnit: "stories completed",
      subLabel: "scratch the cover with each story you finish",
      chips: null,
      showContinue: false,
    },
    {
      accentColor: C.teal,
      glowColor: C.tealGlow,
      borderColor: C.tealBorder,
      heading: "How to Reveal",
      countLabel: `${3 - storiesCompleted} more`,
      countUnit: storiesCompleted === 2 ? "story to reveal!" : "stories to go",
      subLabel: MESSAGES[msgIndex],
      chips: [
        { icon: "📚", text: "Complete any story in this level" },
        { icon: "✨", text: "Each story scratches away the golden cover" },
        { icon: "🎮", text: "3 stories = full reveal + 9 💎 to unlock & play" },
      ],
      showContinue: true,
    },
  ];

  useEffect(() => {
    if (!visible) {
      if (!wasVisibleRef.current) return;
      wasVisibleRef.current = false;
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setStep(-1);
        setShowContinue(false);
        scrOp.setValue(0);
      });
      return;
    }
    wasVisibleRef.current = true;
    advancingRef.current = false;
    setShowContinue(false);
    scrOp.setValue(0);
    sheetY.setValue(SHEET_HEIGHT);
    Animated.parallel([
      Animated.timing(scrOp, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start((r) => {
      if (r.finished) setTimeout(() => setStep(0), 300);
    });
  }, [visible]);

  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return;
    advancingRef.current = false;
    setShowContinue(false);
    enterAnim.setValue(0.85);
    opAnim.setValue(0);
    Animated.parallel([
      Animated.spring(enterAnim, {
        toValue: 1,
        friction: 5,
        tension: 62,
        useNativeDriver: true,
      }),
      Animated.timing(opAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start((r) => {
      if (!r.finished || advancingRef.current) return;
      advancingRef.current = true;
      if (!STEPS[step].showContinue) {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(enterAnim, {
              toValue: 0.85,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }),
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
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scrOp, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setTimeout(() => onClose?.(), 100));
  }, [onClose]);

  const handleGoRead = useCallback(() => {
    setShowContinue(false);
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scrOp, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setTimeout(() => onGoRead?.(), 100));
  }, [onGoRead]);

  if (!visible && step === -1) return null;
  const cfg = step >= 0 && step < STEPS.length ? STEPS[step] : null;

  return (
    <Modal
      transparent
      visible={visible || step !== -1}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={s.shell} pointerEvents="box-none">
        <Animated.View
          style={[s.scrim, { opacity: scrOp }]}
          pointerEvents="none"
        />
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <View style={s.handle} />
          {cfg && (
            <Animated.View
              style={[
                s.card,
                {
                  borderColor: cfg.borderColor,
                  shadowColor: cfg.glowColor,
                  opacity: opAnim,
                  transform: [{ scale: enterAnim }],
                },
              ]}
            >
              <Text style={s.heading}>{cfg.heading}</Text>
              <View style={s.pileWrap}>
                <CoverPile size={56} />
              </View>
              <Text style={[s.countText, { color: cfg.accentColor }]}>
                {cfg.countLabel}
              </Text>
              <Text style={s.countUnit}>{cfg.countUnit}</Text>
              <Text style={s.subLabel}>{cfg.subLabel}</Text>
              {cfg.chips && (
                <View style={s.chipsWrap}>
                  {cfg.chips.map((c, i) => (
                    <InfoChip
                      key={i}
                      icon={c.icon}
                      text={c.text}
                      delay={i * 120}
                    />
                  ))}
                </View>
              )}
              {showContinue && (
                <View style={s.btnRow}>
                  <TouchableOpacity
                    style={[s.cancelBtn]}
                    onPress={handleClose}
                    activeOpacity={0.8}
                  >
                    <Text style={s.cancelBtnText}>Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.continueBtn, { borderColor: cfg.accentColor }]}
                    onPress={handleGoRead}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[s.continueBtnText, { color: cfg.accentColor }]}
                    >
                      Read Now →
                    </Text>
                  </TouchableOpacity>
                </View>
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TOP_CLEAR + 20,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: C.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "rgba(255,213,79,0.2)",
    alignItems: "center",
    paddingTop: pad.s,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: pad.xs,
  },
  card: {
    width: "100%",
    backgroundColor: "transparent",
    padding: pad.xl,
    alignItems: "center",
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    marginBottom: pad.lg,
    letterSpacing: 0.3,
    textShadowColor: "rgba(255,213,79,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  pileWrap: { marginBottom: pad.sm, alignItems: "center" },
  countText: { fontFamily: FONTS.bold, fontSize: font.h2, letterSpacing: 0.5 },
  countUnit: {
    fontFamily: FONTS.regular,
    fontSize: font.lg,
    color: C.textMuted,
    marginTop: pad.xs,
  },
  subLabel: {
    fontFamily: FONTS.regular,
    fontSize: font.md,
    color: C.textMuted,
    marginTop: pad.xs,
    marginBottom: pad.sm,
    textAlign: "center",
  },
  chipsWrap: { width: "100%", marginTop: pad.sm },
  btnRow: {
    flexDirection: "row",
    gap: pad.sm,
    marginTop: pad.lg,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: pad.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "rgba(255,255,255,0.55)",
  },
  continueBtn: {
    flex: 1.4,
    paddingVertical: pad.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: "rgba(0,188,212,0.1)",
    alignItems: "center",
  },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: font.md },
});
