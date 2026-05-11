// components/StoryFinishOverlay.jsx

/**
 * CHANGES FROM PREVIOUS VERSION:
 *   ✅ ScratchGameCard inner card face now shows game cover image when available
 *   ✅ Falls back to original gradient + circles + animated icon for games
 *      without a cover (spin_wheel, tressure_hunt → null in GAME_COVERS)
 *   ✅ Scratch SVG overlay, tear animation, shake, glow all unchanged
 *   ✅ All step cards, UnlockFlow, modal/sheet logic unchanged
 */

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
  TouchableWithoutFeedback,
  Modal,
} from "react-native";
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";
import { Image as ExpoImage } from "expo-image";
import Svg, { Defs, ClipPath, Path, Rect, Image as SvgImage } from "react-native-svg";
import { GAME_ANIMATIONS } from "../../../gamification/constants/gameAnimations";
import UnlockFlow from "../../../gamification/components/UnlockFlow";
import GAME_COVERS from "../../../gamification/constants/gameCoverImages";

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
const TOP_CLEAR    = SH - SHEET_HEIGHT;

const SAMPLE_WORDS = ["elephant","jungle","adventure","river","stampede","savanna","family","journey"];

const PILE_OFFSETS = [
  { x: 0,   y: 0,   rot: "0deg",   sc: 1.0  },
  { x: -16, y: -9,  rot: "-13deg", sc: 0.87 },
  { x: 16,  y: -9,  rot: "13deg",  sc: 0.87 },
  { x: -9,  y: -18, rot: "-6deg",  sc: 0.75 },
  { x: 9,   y: -18, rot: "6deg",   sc: 0.75 },
];

// ─────────────────────────────────────────────────────────────────────────────
// PILE ICON (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function PileIcon({ source, size: iconSize = 72, glowColor }) {
  return (
    <View style={{ width: iconSize + 40, height: iconSize + 22, alignItems: "center", justifyContent: "flex-end" }}>
      {PILE_OFFSETS.map((o, i) => (
        <ExpoImage key={i} source={source} style={{ position: "absolute", width: iconSize * o.sc, height: iconSize * o.sc, bottom: 0, left: "50%", marginLeft: -(iconSize * o.sc) / 2 + o.x, marginBottom: -o.y, opacity: 1 - i * 0.07, transform: [{ rotate: o.rot }], shadowColor: glowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.7, shadowRadius: 10 }} contentFit="contain" />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WORD CHIP (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function WordChip({ word, delay }) {
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
    <Animated.View style={[wS.chip, { opacity: op, transform: [{ scale: sc }] }]}>
      <Text style={wS.text}>{word}</Text>
    </Animated.View>
  );
}
const wS = StyleSheet.create({
  chip: { backgroundColor: "rgba(0,188,212,0.15)", borderWidth: 1.5, borderColor: C.tealBorder, borderRadius: radius.pill, paddingHorizontal: pad.sm, paddingVertical: pad.xs, margin: pad.xs },
  text: { fontFamily: FONTS.bold, color: C.teal, fontSize: font.md },
});

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH TEAR PATH BUILDERS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const CARD_W = 130;
const CARD_H = 170;

function buildTearPath(progress) {
  if (progress === 0) return null;
  const tearHalfW = progress === 1 ? CARD_W * 0.12 : progress === 2 ? CARD_W * 0.22 : CARD_W * 0.4;
  const cx1 = CARD_W * 0.22, cy1 = CARD_H * 0.14;
  const cx2 = CARD_W * 0.78, cy2 = CARD_H * 0.86;
  const dxC = cx2 - cx1, dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const px = -dyC / lineLen, py = dxC / lineLen;
  const steps = 12;
  const leftPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jaggle = tearHalfW * (0.5 + 0.5 * Math.sin(i * 2.4 + 0.8));
    leftPts.push({ x: cx1 + dxC * t - px * jaggle, y: cy1 + dyC * t - py * jaggle });
  }
  const rightPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jaggle = tearHalfW * (0.55 + 0.45 * Math.sin(i * 1.8 + 2.1));
    rightPts.push({ x: cx1 + dxC * t + px * jaggle, y: cy1 + dyC * t + py * jaggle });
  }
  const allPts = [...leftPts, ...[...rightPts].reverse()];
  const outerRect = `M 0,0 L ${CARD_W},0 L ${CARD_W},${CARD_H} L 0,${CARD_H} Z`;
  const innerPoly = allPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  return `${outerRect} ${innerPoly}`;
}

function buildScratchLinesPath(progress) {
  if (progress === 0) return null;
  const cx1 = CARD_W * 0.22, cy1 = CARD_H * 0.14;
  const cx2 = CARD_W * 0.78, cy2 = CARD_H * 0.86;
  const dxC = cx2 - cx1, dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const ux = dxC / lineLen, uy = dyC / lineLen;
  const px = -dyC / lineLen, py = dxC / lineLen;
  const tearHalfW = progress === 1 ? CARD_W * 0.09 : progress === 2 ? CARD_W * 0.17 : CARD_W * 0.32;
  const lineCount = progress === 1 ? 5 : progress === 2 ? 9 : 14;
  const paths = [];
  for (let i = 0; i < lineCount; i++) {
    const t = 0.15 + (i / (lineCount - 1)) * 0.7;
    const perpOffset = tearHalfW * 0.55 * Math.sin(i * 1.9 + 0.4) * (i % 2 === 0 ? 1 : -0.65);
    const lx = cx1 + dxC * t + px * perpOffset, ly = cy1 + dyC * t + py * perpOffset;
    const scratchLen = 10 + 8 * Math.abs(Math.sin(i * 1.3));
    paths.push(`M ${(lx - ux * scratchLen * 0.5).toFixed(1)},${(ly - uy * scratchLen * 0.5).toFixed(1)} L ${(lx + ux * scratchLen * 0.5).toFixed(1)},${(ly + uy * scratchLen * 0.5).toFixed(1)}`);
  }
  return paths.join(" ");
}

function ScratchLines({ progress }) {
  const pathData = buildScratchLinesPath(progress);
  if (!pathData) return null;
  return <Path d={pathData} fill="none" stroke="rgba(255, 220, 100, 0.55)" strokeWidth={1.2} strokeLinecap="round" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH GAME CARD
// The card face behind the SVG scratch overlay now shows the game's cover image
// when available (non-null entry in GAME_COVERS). Falls back to the original
// gradient + decorative circles + mini animation design.
//
// The scratch SVG overlay, shake animation, glow ring, and fade-out on full
// reveal are entirely unchanged — they sit on top of whatever card face renders.
// ─────────────────────────────────────────────────────────────────────────────
function ScratchGameCard({ slot, progressAfter, onFullyRevealed }) {
  const shakeY       = useRef(new Animated.Value(0)).current;
  const shakeX       = useRef(new Animated.Value(0)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const coverOpacity = useRef(new Animated.Value(1)).current;
  const isFullReveal = progressAfter >= 3;

  useEffect(() => {
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
    ]));
    glowLoop.start();

    Animated.sequence([
      Animated.timing(shakeY, { toValue: -14, duration: 150, useNativeDriver: true }),
      Animated.timing(shakeY, { toValue:  10, duration: 130, useNativeDriver: true }),
      Animated.timing(shakeY, { toValue:  -9, duration: 120, useNativeDriver: true }),
      Animated.timing(shakeY, { toValue:   6, duration: 110, useNativeDriver: true }),
      Animated.timing(shakeY, { toValue:   0, duration: 100, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(shakeX, { toValue: -13, duration: 140, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  10, duration: 120, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  -8, duration: 110, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   5, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   0, duration:  90, useNativeDriver: true }),
      Animated.delay(450),
      Animated.timing(progressAnim, { toValue: progressAfter, duration: 700, useNativeDriver: false }),
    ]).start(() => {
      glowLoop.stop();
      if (isFullReveal) {
        Animated.timing(coverOpacity, { toValue: 0, duration: 450, useNativeDriver: true })
          .start(() => onFullyRevealed?.());
      }
    });

    return () => glowLoop.stop();
  }, []);

  const [displayProgress, setDisplayProgress] = useState(0);
  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => setDisplayProgress(Math.round(value)));
    return () => progressAnim.removeListener(id);
  }, []);

  const tearPath      = buildTearPath(displayProgress);
  const gradient      = slot?.gradient ?? ["#00BCD4", "#0097A7"];
  const MiniComponent = slot?.gameId ? GAME_ANIMATIONS[slot.gameId] : null;
  // null → use fallback; non-null → show cover image
  const coverSource   = slot?.gameId ? (GAME_COVERS[slot.gameId] ?? null) : null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.0] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.06] });

  return (
    <View style={scrS.outerWrap}>
      {/* Glow ring (unchanged) */}
      <Animated.View style={[scrS.glowRing, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

      <Animated.View style={[scrS.cardWrap, { transform: [{ translateY: shakeY }, { translateX: shakeX }] }]}>

        {/* ── CARD FACE — cover image OR original fallback ── */}
        {coverSource ? (
          // COVER IMAGE: fills the card behind the scratch overlay
          <View style={[scrS.card, { overflow: "hidden" }]}>
            <ExpoImage
              source={coverSource}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {/* Very light tint — keeps the scratch overlay contrast intact */}
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,8,26,0.08)" }} />
          </View>
        ) : (
          // FALLBACK: original gradient + circles + mini animation
          <View style={[scrS.card, { backgroundColor: gradient[1] }]}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[0], height: "60%", opacity: 0.9 }]} />
            <View style={scrS.circle1} />
            <View style={scrS.circle2} />
            <View style={scrS.questionWrap}>
              {MiniComponent
                ? <MiniComponent />
                : <Text style={scrS.questionText}>{slot?.icon ?? "🎮"}</Text>}
            </View>
          </View>
        )}

        {/* ── SVG SCRATCH OVERLAY — identical to original ── */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: coverOpacity }]} pointerEvents="none">
          <Svg width={CARD_W} height={CARD_H}>
            <Defs>
              <ClipPath id="sfoScratchClip">
                {tearPath
                  ? <Path d={tearPath} fillRule="evenodd" />
                  : <Rect x={0} y={0} width={CARD_W} height={CARD_H} />}
              </ClipPath>
            </Defs>
            <SvgImage
              href={require("../../../../assets/games/scratch-cover.jpeg")}
              x={0} y={0} width={CARD_W} height={CARD_H}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#sfoScratchClip)"
            />
            {tearPath && <ScratchLines progress={displayProgress} />}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const scrS = StyleSheet.create({
  outerWrap:    { alignItems: "center", justifyContent: "center", marginBottom: pad.sm, padding: 12 },
  glowRing:     { position: "absolute", width: CARD_W + 24, height: CARD_H + 24, borderRadius: radius.xl + 6, borderWidth: 2.5, borderColor: "rgba(255, 213, 79, 0.75)", shadowColor: C.yellow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 18, elevation: 0 },
  cardWrap:     { width: CARD_W, height: CARD_H, borderRadius: radius.xl, overflow: "hidden", shadowColor: "#FFD54F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 18, elevation: 14 },
  card:         { ...StyleSheet.absoluteFillObject, borderRadius: radius.xl, overflow: "hidden" },
  circle1:      { position: "absolute", width: 100, height: 100, borderRadius: 50, top: -20, right: -20, backgroundColor: "rgba(255,255,255,0.07)" },
  circle2:      { position: "absolute", width: 60,  height: 60,  borderRadius: 30, bottom: 20, left: -15, backgroundColor: "rgba(255,255,255,0.05)" },
  questionWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  questionText: { fontSize: 40 },
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP CARD (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const StepCard = React.forwardRef(function StepCard(
  { config, enterAnim, opAnim, showContinue, onContinue, scratchSlot, onScratchFullyRevealed, showExpandedCard, onPlayFromScratch, scratchDiamonds, onConfirmUnlock },
  ref,
) {
  const isScratchStep = config.isScratchStep === true;
  const isFullReveal  = scratchSlot?.storiesCompletedAfter >= 3;
  if (isScratchStep) console.log("[Scratch] StepCard rendering:", scratchSlot?.storiesCompletedAfter, JSON.stringify(scratchSlot));

  return (
    <Animated.View ref={ref} style={[pS.card, { borderColor: config.borderColor, shadowColor: config.glowColor, opacity: opAnim, transform: [{ scale: enterAnim }] }]}>
      <Text style={pS.heading}>{isScratchStep ? "🎮 A Surprise is Hiding!" : "🎉 Story Complete!"}</Text>

      {isScratchStep ? (
        <>
          {showExpandedCard ? null : (
            <ScratchGameCard slot={scratchSlot} progressAfter={scratchSlot?.storiesCompletedAfter ?? 1} onFullyRevealed={onScratchFullyRevealed} />
          )}
          {!showExpandedCard && (
            <>
              <Text style={[pS.countText, { color: config.accentColor }]}>{scratchSlot?.storiesCompletedAfter ?? 1}/3</Text>
              <Text style={pS.subLabel}>{isFullReveal ? "fully revealed! 🎉" : "stories done — keep going!"}</Text>
              {!isFullReveal && (
                <Text style={pS.scratchHint}>
                  {`${3 - (scratchSlot?.storiesCompletedAfter ?? 1)} more ${3 - (scratchSlot?.storiesCompletedAfter ?? 1) === 1 ? "story" : "stories"} to fully reveal the hidden surprise!`}
                </Text>
              )}
            </>
          )}
          {showExpandedCard && (
            <UnlockFlow slot={scratchSlot} diamonds={scratchDiamonds} onPlay={onPlayFromScratch} onCancel={onContinue} confirmUnlock={onConfirmUnlock} />
          )}
        </>
      ) : (
        <>
          <View style={pS.pileWrap}><PileIcon source={config.image} size={72} glowColor={config.glowColor} /></View>
          <Text style={[pS.countText, { color: config.accentColor }]}>{config.countLabel}</Text>
          <Text style={pS.subLabel}>{config.subLabel}</Text>
          {config.words != null && (
            <View style={pS.wordsWrap}>
              {config.words.map((w, i) => <WordChip key={w + i} word={w} delay={i * 55} />)}
            </View>
          )}
        </>
      )}

      {showContinue && !isScratchStep && (
        <TouchableOpacity style={[pS.continueBtn, { borderColor: config.accentColor }]} onPress={onContinue} activeOpacity={0.85}>
          <Text style={[pS.continueBtnText, { color: config.accentColor }]}>Continue ✓</Text>
        </TouchableOpacity>
      )}
      {showContinue && isScratchStep && !showExpandedCard && (
        <TouchableOpacity style={[pS.continueBtn, { borderColor: config.accentColor }]} onPress={onContinue} activeOpacity={0.85}>
          <Text style={[pS.continueBtnText, { color: config.accentColor }]}>Continue ✓</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

const pS = StyleSheet.create({
  card:            { width: "100%", backgroundColor: "transparent", padding: pad.xl, alignItems: "center" },
  heading:         { fontFamily: FONTS.bold, fontSize: font.xl, color: C.textPri, marginBottom: pad.lg, letterSpacing: 0.3, textShadowColor: "rgba(0,188,212,0.35)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  pileWrap:        { marginBottom: pad.sm, alignItems: "center" },
  countText:       { fontFamily: FONTS.bold, fontSize: font.h2, letterSpacing: 0.5 },
  subLabel:        { fontFamily: FONTS.regular, fontSize: font.lg, color: C.textMuted, marginTop: pad.xs, marginBottom: pad.sm },
  scratchHint:     { fontFamily: FONTS.regular, fontSize: font.md, color: C.textMuted, textAlign: "center", paddingHorizontal: pad.sm, lineHeight: font.md * 1.5 },
  wordsWrap:       { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginVertical: pad.s, maxWidth: SW - 60 },
  continueBtn:     { marginTop: pad.lg, borderRadius: radius.pill, borderWidth: 1.5, paddingHorizontal: pad.xxl, paddingVertical: pad.sm, backgroundColor: "rgba(0,188,212,0.1)" },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: font.md },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN OVERLAY (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const StoryFinishOverlay = ({
  visible, wordsCollected = 0, sampleWords,
  coinsEarned = 0, diamondsEarned = 0,
  scratchSlot = null, diamonds = 0,
  onConfirmUnlock, onPlayGame,
  coinTargetRef, diamondTargetRef, wordTargetRef,
  onDone,
}) => {
  const [step, setStep]                         = useState(-1);
  const [showContinue, setShowContinue]         = useState(false);
  const [showExpandedCard, setShowExpandedCard] = useState(false);
  const advancingRef  = useRef(false);
  const wasVisibleRef = useRef(false);
  const cardRef       = useRef(null);

  const sheetY    = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrOp     = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0.85)).current;
  const opAnim    = useRef(new Animated.Value(0)).current;

  const sndSwish   = useRef(null);
  const sndCoins   = useRef(null);
  const sndDiamond = useRef(null);
  const sndPop     = useRef(null);

  const scratchSlotRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const map = [
        [sndSwish,   require("../../../../assets/sounds/swish.mp3")],
        [sndCoins,   require("../../../../assets/sounds/coin1.mp3")],
        [sndDiamond, require("../../../../assets/sounds/diamond.mp3")],
        [sndPop,     require("../../../../assets/sounds/pop.mp3")],
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
      [sndSwish, sndCoins, sndDiamond, sndPop].forEach((r) => { r.current?.unloadAsync(); r.current = null; });
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

  const buildSteps = (slot) => {
    const base = [
      { image: require("../../../../assets/img/coin.png"),    accentColor: C.yellow, glowColor: C.yellowGlow, borderColor: C.yellowBorder, countLabel: `${coinsEarned} Coins`,       subLabel: "coins earned! 🪙",    words: null },
      { image: require("../../../../assets/img/diamond.png"), accentColor: C.purple, glowColor: C.purpleGlow, borderColor: C.purpleBorder, countLabel: `${diamondsEarned} Diamonds`, subLabel: "diamonds earned! 💎", words: null },
      { image: require("../../../../assets/img/bag.png"),     accentColor: C.teal,   glowColor: C.tealGlow,   borderColor: C.tealBorder,   countLabel: `${wordsCollected} Words`,     subLabel: "words learned! 📚",   words: sampleWords?.slice(0, 8) ?? SAMPLE_WORDS.slice(0, Math.min(wordsCollected, 8)) },
    ];
    console.log("[Scratch] buildSteps slot:", slot?.storiesCompletedBefore, "->", slot?.storiesCompletedAfter);
    if (slot && slot.storiesCompletedBefore < 3) {
      base.push({ isScratchStep: true, accentColor: C.yellow, glowColor: C.yellowGlow, borderColor: C.yellowBorder, countLabel: null, subLabel: null, words: null });
    }
    return base;
  };

  const stepsRef = useRef([]);

  useEffect(() => {
    if (!visible) {
      if (!wasVisibleRef.current) return;
      wasVisibleRef.current = false;
      Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true })
        .start(() => { setStep(-1); setShowContinue(false); scrOp.setValue(0); });
      return;
    }
    wasVisibleRef.current = true;
    advancingRef.current  = false;
    setShowContinue(false);
    setShowExpandedCard(false);
    scrOp.setValue(0);
    sheetY.setValue(SHEET_HEIGHT);
    scratchSlotRef.current = scratchSlot;
    stepsRef.current = buildSteps(scratchSlot);

    Animated.parallel([
      Animated.timing(scrOp,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
    ]).start((result) => { if (!result.finished) return; setTimeout(() => setStep(0), 300); });
  }, [visible]);

  useEffect(() => {
    const steps = stepsRef.current;
    if (step < 0 || step >= steps.length) return;
    advancingRef.current = false;
    setShowContinue(false);
    enterAnim.setValue(0.85);
    opAnim.setValue(0);
    const stepSounds = [sndCoins, sndDiamond, sndPop, sndPop];
    playSound(stepSounds[Math.min(step, 3)]);

    Animated.parallel([
      Animated.spring(enterAnim, { toValue: 1, friction: 5, tension: 62, useNativeDriver: true }),
      Animated.timing(opAnim,    { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start((result) => {
      if (!result.finished || advancingRef.current) return;
      advancingRef.current = true;
      const isLast = step === steps.length - 1;
      if (!isLast) {
        const holdMs = step === steps.length - 2 && steps[step].isScratchStep ? 2200 : 1000;
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opAnim,    { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.spring(enterAnim, { toValue: 0.85, friction: 6, tension: 80, useNativeDriver: true }),
          ]).start(() => setStep((prev) => prev + 1));
        }, holdMs);
      } else {
        setShowContinue(true);
      }
    });
  }, [step]);

  const handleContinue = useCallback(() => {
    setShowContinue(false);
    Animated.parallel([
      Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(scrOp,  { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setTimeout(() => onDone?.(), 100));
  }, [onDone]);

  if (!visible && step === -1) return null;
  const steps = stepsRef.current;
  const cfg   = step >= 0 && step < steps.length ? steps[step] : null;

  return (
    <Modal transparent visible={visible || step !== -1} animationType="none" onRequestClose={handleContinue}>
      <View style={styles.shell} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={handleContinue}>
          <Animated.View style={[styles.scrim, { opacity: scrOp }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={styles.handle} />
          {cfg != null && (
            <StepCard
              ref={cardRef}
              config={cfg}
              enterAnim={enterAnim}
              opAnim={opAnim}
              showContinue={showContinue}
              onContinue={handleContinue}
              scratchSlot={scratchSlotRef.current}
              showExpandedCard={showExpandedCard}
              scratchDiamonds={diamonds}
              onConfirmUnlock={onConfirmUnlock}
              onScratchFullyRevealed={() => { setShowContinue(false); setShowExpandedCard(true); }}
              onPlayFromScratch={() => {
                handleContinue();
                setTimeout(() => {
                  console.log("[OnPlayFromScratch] Method Called with gameId:", scratchSlotRef.current?.gameId);
                  onPlayGame?.(scratchSlotRef.current?.gameId);
                }, 450);
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default StoryFinishOverlay;

const styles = StyleSheet.create({
  shell:  { flex: 1, backgroundColor: "transparent" },
  scrim:  { position: "absolute", top: 0, left: 0, right: 0, height: TOP_CLEAR + 20, backgroundColor: "rgba(0,0,0,0.25)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT,
    backgroundColor: C.bg, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: "rgba(0,188,212,0.25)",
    alignItems: "center", paddingTop: pad.s,
    shadowColor: "#000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 24,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: pad.xs },
});
