// components/StoryFinishOverlay.jsx
//
// Bottom-sheet style celebration: slides up from bottom covering ~75% of screen.
// Top corners are rounded so the screen above (with all 4 icons) stays visible.
// 3-step sequential flow: Coins → Diamonds → Words
// Items fly from the sheet up to the matching home icon.
// Counter on each icon badge animates up as coins/diamonds/words land.
//
// Props:
//   visible          — boolean
//   wordsCollected   — number
//   sampleWords      — string[] (optional, shown as word chips on the words step)
//   coinsEarned      — number
//   diamondsEarned   — number
//   coinTargetRef    — ref to home coin icon  (collapsable={false} View)
//   diamondTargetRef — ref to home diamond icon
//   wordTargetRef    — ref to home bag icon
//   onDone           — called after all 3 steps complete

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
  Modal,
} from "react-native";
import { FONTS } from "../theme";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg: "rgba(8,8,26,0.96)",
  card: "#111c35",
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
const FLY_CAP = 10;

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
// FlyingItem
// ─────────────────────────────────────────────────────────────────────────────
function FlyingItem({ source, size, fromX, fromY, toX, toY, delay, onLand }) {
  const tx = useRef(new Animated.Value(fromX - size / 2)).current;
  const ty = useRef(new Animated.Value(fromY - size / 2)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const dur = 680 + Math.random() * 180;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(sc, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(tx, {
          toValue: toX - size / 2,
          duration: dur,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: toY - size / 2,
          duration: dur,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(op, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }).start(() => onLand?.());
    });
  }, []);

  return (
    <Animated.Image
      source={source}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height: size,
        opacity: op,
        zIndex: 999,
        pointerEvents: "none",
        transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
      }}
      resizeMode="contain"
    />
  );
}

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
  // Word chip label — bold, teal
  text: {
    fontFamily: FONTS.bold,
    color: C.teal,
    fontSize: 14,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// FloatingCounter
// ─────────────────────────────────────────────────────────────────────────────
function FloatingCounter({ value, color, x, y, visible }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible || value === 0) return;
    op.setValue(0);
    ty.setValue(0);
    sc.setValue(0.5);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(sc, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: -28,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible, value]);

  if (!visible || value === 0) return null;
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x - 24,
        top: y - 20,
        zIndex: 1000,
        pointerEvents: "none",
        opacity: op,
        transform: [{ translateY: ty }, { scale: sc }],
      }}
    >
      <View style={fcS.bubble}>
        <Text style={[fcS.text, { color }]}>+{value}</Text>
      </View>
    </Animated.View>
  );
}
const fcS = StyleSheet.create({
  bubble: {
    backgroundColor: "rgba(8,8,26,0.85)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  // Counter "+N" — bold, coloured dynamically
  text: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// StepCard
// ─────────────────────────────────────────────────────────────────────────────
const StepCard = React.forwardRef(function StepCard(
  { config, enterAnim, opAnim },
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
      <Text style={[pS.flyHint, { color: config.accentColor }]}>
        {config.flyHint}
      </Text>
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
  // "🎉 Story Complete!" — bold, prominent heading
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
  // Large reward count — bold, accent coloured
  countText: {
    fontFamily: FONTS.bold,
    fontSize: 42,
    letterSpacing: 0.5,
  },
  // Sub-label — regular, muted
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
  // Fly hint — bold, accent coloured, slightly faded
  flyHint: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    marginTop: 10,
    opacity: 0.65,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
const StoryFinishOverlay = ({
  visible,
  wordsCollected = 9,
  sampleWords,
  coinsEarned = 100,
  diamondsEarned = 5,
  coinTargetRef,
  diamondTargetRef,
  wordTargetRef,
  onDone,
}) => {
  const [step, setStep] = useState(-1);
  const [flyingItems, setFlyingItems] = useState([]);
  const flyIdRef = useRef(0);
  const landedRef = useRef(0);
  const advancingRef = useRef(false);

  const coinTarget = useRef({ x: SW * 0.88, y: 100 });
  const diamondTarget = useRef({ x: SW * 0.88, y: 45 });
  const wordTarget = useRef({ x: SW * 0.12, y: 100 });

  const [counterState, setCounterState] = useState({
    visible: false,
    value: 0,
    color: C.yellow,
    x: SW * 0.88,
    y: 100,
  });
  const counterKeyRef = useRef(0);

  const spawnOrigin = useRef({ x: SW / 2, y: SH * 0.65 });
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

  const playSound = (ref) => {
    try {
      ref.current?.setPositionAsync(0).then(() => ref.current?.playAsync());
    } catch (_) {}
  };

  const measureAll = () => {
    coinTargetRef?.current?.measureInWindow((x, y, w, h) => {
      if (w) coinTarget.current = { x: x + w / 2, y: y + h / 2 };
    });
    diamondTargetRef?.current?.measureInWindow((x, y, w, h) => {
      if (w) diamondTarget.current = { x: x + w / 2, y: y + h / 2 };
    });
    wordTargetRef?.current?.measureInWindow((x, y, w, h) => {
      if (w) wordTarget.current = { x: x + w / 2, y: y + h / 2 };
    });
    cardRef?.current?.measureInWindow((x, y, w, h) => {
      if (w) spawnOrigin.current = { x: x + w / 2, y: y + h * 0.4 };
    });
  };

  useEffect(() => {
    if (!visible) {
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setStep(-1);
        scrOp.setValue(0);
      });
      return;
    }
    advancingRef.current = false;
    landedRef.current = 0;
    setFlyingItems([]);
    setCounterState((s) => ({ ...s, visible: false }));

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
    ]).start(() => {
      setTimeout(measureAll, 100);
      setTimeout(() => setStep(0), 300);
    });
  }, [visible]);

  useEffect(() => {
    if (step < 0 || step > 2) return;
    advancingRef.current = false;
    landedRef.current = 0;
    enterAnim.setValue(0.85);
    opAnim.setValue(0);
    playSound(sndSwish);
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
    ]).start(() => {
      setTimeout(() => {
        measureAll();
        spawnForStep(step);
      }, 1100);
    });
  }, [step]);

  const spawnForStep = (s) => {
    const configs = [
      {
        source: require("../../assets/img/coin.png"),
        target: coinTarget,
        count: coinsEarned,
        size: 28,
      },
      {
        source: require("../../assets/img/diamond.png"),
        target: diamondTarget,
        count: diamondsEarned,
        size: 26,
      },
      {
        source: require("../../assets/img/bag.png"),
        target: wordTarget,
        count: wordsCollected,
        size: 28,
      },
    ];
    const { source, target, count, size } = configs[s];
    const flyCount = Math.min(count, FLY_CAP);
    const origin = spawnOrigin.current;

    if (flyCount === 0) {
      if (advancingRef.current) return;
      advancingRef.current = true;
      setTimeout(() => {
        setFlyingItems([]);
        setStep((prev) => {
          if (prev < 2) return prev + 1;
          Animated.parallel([
            Animated.timing(sheetY, {
              toValue: SHEET_HEIGHT,
              duration: 420,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(scrOp, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start(() => onDone?.());
          return -1;
        });
      }, 400);
      return;
    }

    const items = Array.from({ length: flyCount }, (_, i) => ({
      id: ++flyIdRef.current,
      source,
      size,
      fromX: origin.x + (Math.random() - 0.5) * 120,
      fromY: origin.y + (Math.random() - 0.5) * 80,
      toX: target.current.x,
      toY: target.current.y,
      delay: i * 85,
      total: flyCount,
      step: s,
    }));
    setFlyingItems(items);
  };

  const handleLand = useCallback(
    (id, total, itemStep) => {
      const stepSounds = [sndCoins, sndDiamond, sndPop];
      const stepColors = [C.yellow, C.purple, C.teal];
      const stepTargets = [coinTarget, diamondTarget, wordTarget];
      const stepValues = [coinsEarned, diamondsEarned, wordsCollected];

      playSound(stepSounds[itemStep]);

      const tgt = stepTargets[itemStep].current;
      setCounterState({
        visible: true,
        value: stepValues[itemStep],
        color: stepColors[itemStep],
        x: tgt.x,
        y: tgt.y,
        key: ++counterKeyRef.current,
      });

      setFlyingItems((prev) => prev.filter((f) => f.id !== id));
      landedRef.current += 1;
      if (landedRef.current < total || advancingRef.current) return;
      advancingRef.current = true;

      setTimeout(() => {
        setCounterState((s) => ({ ...s, visible: false }));
        Animated.parallel([
          Animated.timing(opAnim, {
            toValue: 0,
            duration: 230,
            useNativeDriver: true,
          }),
          Animated.spring(enterAnim, {
            toValue: 0.85,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setFlyingItems([]);
          setStep((prev) => {
            if (prev < 2) return prev + 1;
            Animated.parallel([
              Animated.timing(sheetY, {
                toValue: SHEET_HEIGHT,
                duration: 420,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(scrOp, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
              }),
            ]).start(() => onDone?.());
            return -1;
          });
        });
      }, 400);
    },
    [coinsEarned, diamondsEarned, wordsCollected],
  );

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
      flyHint: "Flying to your coin wallet ✦",
      words: null,
    },
    {
      image: require("../../assets/img/diamond.png"),
      accentColor: C.purple,
      glowColor: C.purpleGlow,
      borderColor: C.purpleBorder,
      countLabel: `${diamondsEarned} Diamonds`,
      subLabel: "diamonds earned! 💎",
      flyHint: "Flying to your diamond vault ✦",
      words: null,
    },
    {
      image: require("../../assets/img/bag.png"),
      accentColor: C.teal,
      glowColor: C.tealGlow,
      borderColor: C.tealBorder,
      countLabel: `${wordsCollected} Words`,
      subLabel: "words learned! 📚",
      flyHint: "Flying to your word bag ✦",
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
            />
          )}
        </Animated.View>

        {flyingItems.map((item) => (
          <FlyingItem
            key={item.id}
            source={item.source}
            size={item.size}
            fromX={item.fromX}
            fromY={item.fromY}
            toX={item.toX}
            toY={item.toY}
            delay={item.delay}
            onLand={() => handleLand(item.id, item.total, item.step)}
          />
        ))}

        {counterState.visible && (
          <FloatingCounter
            key={counterState.key}
            value={counterState.value}
            color={counterState.color}
            x={counterState.x}
            y={counterState.y}
            visible={counterState.visible}
          />
        )}
      </View>
    </Modal>
  );
};

export default StoryFinishOverlay;

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "transparent",
  },
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
