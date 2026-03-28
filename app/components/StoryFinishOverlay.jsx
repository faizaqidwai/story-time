// components/StoryFinishOverlay.jsx
//
// Bottom-sheet celebration: slides up from bottom covering ~75% of screen.
// 3-step sequential flow: Coins → Diamonds → Words.
// Coins and diamonds auto-advance after 1s each.
// Words step shows a "Continue" button — user tap triggers onDone.
// This prevents the JS thread freeze caused by auto-advancing into
// handleFinishDone while animations are still running.
//
// Props:
//   visible          — boolean
//   wordsCollected   — number
//   sampleWords      — string[] (optional)
//   coinsEarned      — number
//   diamondsEarned   — number
//   coinTargetRef    — kept for API compatibility (unused)
//   diamondTargetRef — kept for API compatibility (unused)
//   wordTargetRef    — kept for API compatibility (unused)
//   onDone           — called after user taps Continue on the words step

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Audio } from "expo-av";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
} from "react-native";
import { FONTS } from "../theme";

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(8,8,26,0.96)",
  teal: "#00BCD4",
  tealGlow: "rgba(0,188,212,0.35)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowGlow: "rgba(255,213,79,0.35)",
  yellowBorder: "rgba(255,213,79,0.6)",
  purple: "#B39DDB",
  purpleGlow: "rgba(179,157,219,0.35)",
  purpleBorder: "rgba(179,157,219,0.55)",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const SHEET_HEIGHT = SH * 0.72;
const TOP_CLEAR = SH - SHEET_HEIGHT;

const SAMPLE_WORDS = [
  "elephant",
  "jungle",
  "adventure",
  "river",
  "stampede",
  "savanna",
  "family",
  "journey",
];

// ─────────────────────────────────────────────────────────────────────────────
// PileIcon
// ─────────────────────────────────────────────────────────────────────────────
const PILE_OFFSETS = [
  { x: 0, y: 0, rot: "0deg", sc: 1.0 },
  { x: -16, y: -9, rot: "-13deg", sc: 0.87 },
  { x: 16, y: -9, rot: "13deg", sc: 0.87 },
  { x: -9, y: -18, rot: "-6deg", sc: 0.75 },
  { x: 9, y: -18, rot: "6deg", sc: 0.75 },
];

function PileIcon({ source, size = 72, glowColor }) {
  return (
    <View
      style={{
        width: size + 40,
        height: size + 22,
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {PILE_OFFSETS.map((o, i) => (
        <Image
          key={i}
          source={source}
          style={{
            position: "absolute",
            width: size * o.sc,
            height: size * o.sc,
            bottom: 0,
            left: "50%",
            marginLeft: -(size * o.sc) / 2 + o.x,
            marginBottom: -o.y,
            opacity: 1 - i * 0.07,
            transform: [{ rotate: o.rot }],
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
          }}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WordChip
// ─────────────────────────────────────────────────────────────────────────────
function WordChip({ word, delay }) {
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
      style={[wS.chip, { opacity: op, transform: [{ scale: sc }] }]}
    >
      <Text style={wS.text}>{word}</Text>
    </Animated.View>
  );
}
const wS = StyleSheet.create({
  chip: {
    backgroundColor: "rgba(0,188,212,0.15)",
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  text: { fontFamily: FONTS.bold, color: C.teal, fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────────────────────
// StepCard
// ─────────────────────────────────────────────────────────────────────────────
const StepCard = React.forwardRef(function StepCard(
  { config, enterAnim, opAnim, showContinue, onContinue },
  ref,
) {
  return (
    <Animated.View
      ref={ref}
      style={[
        pS.card,
        {
          borderColor: config.borderColor,
          shadowColor: config.glowColor,
          opacity: opAnim,
          transform: [{ scale: enterAnim }],
        },
      ]}
    >
      <Text style={pS.heading}>🎉 Story Complete!</Text>
      <View style={pS.pileWrap}>
        <PileIcon
          source={config.image}
          size={72}
          glowColor={config.glowColor}
        />
      </View>
      <Text style={[pS.countText, { color: config.accentColor }]}>
        {config.countLabel}
      </Text>
      <Text style={pS.subLabel}>{config.subLabel}</Text>
      {config.words != null && (
        <View style={pS.wordsWrap}>
          {config.words.map((w, i) => (
            <WordChip key={w + i} word={w} delay={i * 55} />
          ))}
        </View>
      )}
      {showContinue && (
        <TouchableOpacity
          style={[pS.continueBtn, { borderColor: config.accentColor }]}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={[pS.continueBtnText, { color: config.accentColor }]}>
            Continue ✓
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

const pS = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "transparent",
    padding: 24,
    alignItems: "center",
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: C.textPri,
    marginBottom: 18,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,188,212,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  pileWrap: { marginBottom: 14, alignItems: "center" },
  countText: { fontFamily: FONTS.bold, fontSize: 42, letterSpacing: 0.5 },
  subLabel: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: C.textMuted,
    marginTop: 4,
    marginBottom: 10,
  },
  wordsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 8,
    maxWidth: SW - 60,
  },
  continueBtn: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: "rgba(0,188,212,0.1)",
  },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
const StoryFinishOverlay = ({
  visible,
  wordsCollected = 0,
  sampleWords,
  coinsEarned = 0,
  diamondsEarned = 0,
  coinTargetRef,
  diamondTargetRef,
  wordTargetRef,
  onDone,
}) => {
  const [step, setStep] = useState(-1);
  const [showContinue, setShowContinue] = useState(false);
  const advancingRef = useRef(false);

  // Prevents hide animation running on fresh mounts where visible was never true.
  // Without this, fresh Home remounts (router.replace + iOS Modal) trigger the
  // hide path immediately, interfering with the show sequence.
  const wasVisibleRef = useRef(false);

  const cardRef = useRef(null);
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0.85)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  const sndSwish = useRef(null);
  const sndCoins = useRef(null);
  const sndDiamond = useRef(null);
  const sndPop = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const map = [
        [sndSwish, require("../../assets/sounds/swish.mp3")],
        [sndCoins, require("../../assets/sounds/coin1.mp3")],
        [sndDiamond, require("../../assets/sounds/diamond.mp3")],
        [sndPop, require("../../assets/sounds/pop.mp3")],
      ];
      for (const [ref, asset] of map) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset);
          if (alive) ref.current = sound;
          else sound.unloadAsync();
        } catch (_) {}
      }
    })();
    return () => {
      alive = false;
      [sndSwish, sndCoins, sndDiamond, sndPop].forEach((r) => {
        r.current?.unloadAsync();
        r.current = null;
      });
    };
  }, []);

  const playSound = async (ref) => {
    try {
      const sound = ref.current;
      if (!sound) return;
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (_) {}
  };

  // ── Show / hide sheet ─────────────────────────────────────────────────────
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
    ]).start((result) => {
      if (!result.finished) return;
      setTimeout(() => setStep(0), 300);
    });
  }, [visible]);

  // ── Step animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (step < 0 || step > 2) return;
    advancingRef.current = false;
    setShowContinue(false);
    enterAnim.setValue(0.85);
    opAnim.setValue(0);

    const stepSounds = [sndCoins, sndDiamond, sndPop];
    playSound(stepSounds[step]);

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
    ]).start((result) => {
      if (!result.finished || advancingRef.current) return;
      advancingRef.current = true;

      if (step < 2) {
        // Coins and diamonds — auto-advance after 1s
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
          ]).start(() => setStep((prev) => prev + 1));
        }, 1000);
      } else {
        // Words step — show Continue button, wait for user tap
        setShowContinue(true);
      }
    });
  }, [step]);

  // ── Continue button handler ───────────────────────────────────────────────
  // Called only on the last step. Slides out then fires onDone.
  // User-initiated so JS thread is free when handleFinishDone runs.
  const handleContinue = useCallback(() => {
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
    ]).start(() => setTimeout(() => onDone?.(), 100));
  }, [onDone]);

  const displayWords =
    sampleWords?.slice(0, 8) ??
    SAMPLE_WORDS.slice(0, Math.min(wordsCollected, 8));

  const STEPS = [
    {
      image: require("../../assets/img/coin.png"),
      accentColor: C.yellow,
      glowColor: C.yellowGlow,
      borderColor: C.yellowBorder,
      countLabel: `${coinsEarned} Coins`,
      subLabel: "coins earned! 🪙",
      words: null,
    },
    {
      image: require("../../assets/img/diamond.png"),
      accentColor: C.purple,
      glowColor: C.purpleGlow,
      borderColor: C.purpleBorder,
      countLabel: `${diamondsEarned} Diamonds`,
      subLabel: "diamonds earned! 💎",
      words: null,
    },
    {
      image: require("../../assets/img/bag.png"),
      accentColor: C.teal,
      glowColor: C.tealGlow,
      borderColor: C.tealBorder,
      countLabel: `${wordsCollected} Words`,
      subLabel: "words learned! 📚",
      words: displayWords,
    },
  ];

  if (!visible && step === -1) return null;

  const cfg = step >= 0 && step <= 2 ? STEPS[step] : null;

  return (
    <Modal
      transparent
      visible={visible || step !== -1}
      animationType="none"
      onRequestClose={() => {}}
    >
      <View style={styles.shell} pointerEvents="box-none">
        <Animated.View
          style={[styles.scrim, { opacity: scrOp }]}
          pointerEvents="none"
        />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <View style={styles.handle} />
          {cfg != null && (
            <StepCard
              ref={cardRef}
              config={cfg}
              enterAnim={enterAnim}
              opAnim={opAnim}
              showContinue={showContinue}
              onContinue={handleContinue}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default StoryFinishOverlay;

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "transparent" },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TOP_CLEAR + 20,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "rgba(0,188,212,0.25)",
    alignItems: "center",
    paddingTop: 8,
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
    marginBottom: 6,
  },
});
