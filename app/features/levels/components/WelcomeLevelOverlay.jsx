/**
 * WelcomeLevelOverlay.jsx
 * app/components/WelcomeLevelOverlay.jsx
 *
 * Bottom sheet, same animation engine as StoryFinishOverlay.
 * 3 steps that pop in/out identically:
 *
 * Step 0: Welcome + praise (auto-advances after 2s)
 * Step 1: Stories preview — cycling story cards (auto-advances after 6s)
 * Step 2: Hidden games reveal (Continue button)
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
  ScrollView,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../../theme";
import { font, pad, radius } from "../../../theme/tokens";
import {
  getLevelDescription,
  STORY_TEASERS,
} from "../../../data/levelDescriptions";

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

const SHEET_HEIGHT = SH * 0.78;
const TOP_CLEAR = SH - SHEET_HEIGHT;

// ── Story teaser chip — springs in with delay ─────────────────────────────
function StoryChip({ story, teaser, delay }) {
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
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[stS.wrap, { opacity: op, transform: [{ scale: sc }] }]}
    >
      <Text style={stS.teaser} numberOfLines={2}>
        {teaser}
      </Text>
      <View style={stS.row}>
        {story?.cover ? (
          <ExpoImage
            source={{ uri: story.cover }}
            style={stS.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            style={[stS.thumb, { backgroundColor: "rgba(255,255,255,0.08)" }]}
          />
        )}
        <View style={stS.textCol}>
          <Text style={stS.title} numberOfLines={1}>
            {story?.title ?? "Story"}
          </Text>
          <Text style={stS.intro} numberOfLines={2}>
            {story?.introduction ?? ""}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const stS = StyleSheet.create({
  wrap: {
    width: "100%",
    marginBottom: pad.s,
    backgroundColor: "rgba(0,188,212,0.07)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.2)",
    padding: pad.sm,
  },
  teaser: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.yellow,
    marginBottom: pad.xs,
    lineHeight: font.md * 1.3,
  },
  row: { flexDirection: "row", gap: pad.sm, alignItems: "center" },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  textCol: { flex: 1 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textPri,
    marginBottom: 2,
  },
  intro: {
    fontFamily: FONTS.regular,
    fontSize: font.s,
    color: C.textMuted,
    lineHeight: font.s * 1.4,
  },
});

// ── Info chip ─────────────────────────────────────────────────────────────
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
      <Text style={cS.icon}>{icon}</Text>
      <Text style={cS.text}>{text}</Text>
    </Animated.View>
  );
}

const cS = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderRadius: radius.pill,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
    marginVertical: pad.xs,
    width: "100%",
  },
  icon: { fontSize: font.xl },
  text: {
    fontFamily: FONTS.regular,
    color: C.textPri,
    fontSize: font.md,
    flex: 1,
    lineHeight: font.md * 1.4,
  },
});

// ── Cover pile — stacked golden cover cards ───────────────────────────────
const COVER_PILE_OFFSETS = [
  { x: 0, y: 0, rot: "0deg", sc: 1.0 },
  { x: -18, y: -8, rot: "-12deg", sc: 0.87 },
  { x: 18, y: -8, rot: "12deg", sc: 0.87 },
  { x: -10, y: -16, rot: "-5deg", sc: 0.75 },
  { x: 10, y: -16, rot: "5deg", sc: 0.75 },
];

function CoverPile() {
  const iconW = 80;
  const iconH = iconW * 1.33;
  return (
    <View
      style={{
        width: iconW + 50,
        height: iconH + 26,
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: pad.sm,
      }}
    >
      {COVER_PILE_OFFSETS.map((o, i) => (
        <ExpoImage
          key={i}
          source={require("../../../../assets/games/scratch-cover.jpeg")}
          style={{
            position: "absolute",
            width: iconW * o.sc,
            height: iconH * o.sc,
            bottom: 0,
            left: "50%",
            marginLeft: -(iconW * o.sc) / 2 + o.x,
            marginBottom: -o.y,
            opacity: 1 - i * 0.07,
            borderRadius: 10,
            transform: [{ rotate: o.rot }],
            shadowColor: C.yellowGlow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
          }}
          contentFit="cover"
        />
      ))}
      {/* Mystery overlay on top card */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          marginLeft: -(iconW / 2),
          width: iconW,
          height: iconH,
          borderRadius: 10,
          backgroundColor: "rgba(8,8,26,0.38)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 8,
          }}
        >
          ??
        </Text>
      </View>
    </View>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────
export default function WelcomeLevelOverlay({
  visible,
  newLevel,
  stories,
  onDone,
}) {
  const levelData = getLevelDescription(newLevel ?? 1);
  const previewStories = (stories ?? []).slice(0, 3);

  const [step, setStep] = useState(-1);
  const [showContinue, setShowContinue] = useState(false);
  const advancingRef = useRef(false);
  const wasVisibleRef = useRef(false);

  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0.85)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  // Step hold durations (ms before auto-advancing)
  const HOLD = [2200, 5000, 0]; // step 2 uses Continue button

  const STEPS = [
    {
      accentColor: C.teal,
      glowColor: C.tealGlow,
      borderColor: C.tealBorder,
      showContinue: false,
    },
    {
      accentColor: C.yellow,
      glowColor: C.yellowGlow,
      borderColor: C.yellowBorder,
      showContinue: false,
    },
    {
      accentColor: C.purple,
      glowColor: C.purpleGlow,
      borderColor: C.purpleBorder,
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
        }, HOLD[step]);
      } else {
        setShowContinue(true);
      }
    });
  }, [step]);

  const handleDone = useCallback(() => {
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

  if (!visible && step === -1) return null;
  const cfg = step >= 0 && step < STEPS.length ? STEPS[step] : null;

  // Dot indicator
  const dots = [0, 1, 2];

  return (
    <Modal
      transparent
      visible={visible || step !== -1}
      animationType="none"
      onRequestClose={handleDone}
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

          {/* Step dots */}
          <View style={s.dotsRow}>
            {dots.map((i) => (
              <View key={i} style={[s.dot, step === i && s.dotActive]} />
            ))}
          </View>

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
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
              >
                {/* ── STEP 0: Welcome ── */}
                {step === 0 && (
                  <>
                    <Text style={s.heading}>{levelData.welcomeHeading}</Text>
                    <Text style={s.emoji}>🌟</Text>
                    <Text style={[s.countText, { color: cfg.accentColor }]}>
                      Level {newLevel}
                    </Text>
                    <Text style={s.countUnit}>unlocked!</Text>
                    <Text style={s.subLabel}>{levelData.praiseMessage}</Text>
                    <Text style={[s.bodyText, { color: cfg.accentColor }]}>
                      {levelData.courageMessage}
                    </Text>
                  </>
                )}

                {/* ── STEP 1: Stories ── */}
                {step === 1 && (
                  <>
                    <Text style={s.heading}>{levelData.storiesHeading}</Text>
                    <Text style={s.emoji}>📚</Text>
                    <Text style={[s.countText, { color: cfg.accentColor }]}>
                      8
                    </Text>
                    <Text style={s.countUnit}>new stories</Text>
                    <Text style={s.subLabel}>{levelData.storiesSubtitle}</Text>
                    <View style={s.storiesWrap}>
                      {previewStories.map((story, i) => (
                        <StoryChip
                          key={story?.id ?? i}
                          story={story}
                          teaser={STORY_TEASERS[i % STORY_TEASERS.length]}
                          delay={300 + i * 200}
                        />
                      ))}
                    </View>
                  </>
                )}

                {/* ── STEP 2: Hidden Games ── */}
                {step === 2 && (
                  <>
                    <Text style={s.heading}>{levelData.gamesHeading}</Text>
                    <CoverPile />
                    <Text style={[s.countText, { color: cfg.accentColor }]}>
                      2
                    </Text>
                    <Text style={s.countUnit}>hidden surprises inside! 🎮</Text>
                    <Text style={s.subLabel}>{levelData.gamesMessage}</Text>
                    <View style={s.chipsWrap}>
                      {[
                        {
                          icon: "📖",
                          text: "Complete 3 stories → scratch the cover",
                        },
                        {
                          icon: "💎",
                          text: "Earn 9 diamonds → unlock the game",
                        },
                        { icon: "🪙", text: "Use 100 coins → play anytime!" },
                      ].map((c, i) => (
                        <InfoChip
                          key={i}
                          icon={c.icon}
                          text={c.text}
                          delay={300 + i * 180}
                        />
                      ))}
                    </View>
                  </>
                )}

                {showContinue && (
                  <TouchableOpacity
                    style={[s.continueBtn, { borderColor: cfg.accentColor }]}
                    onPress={handleDone}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[s.continueBtnText, { color: cfg.accentColor }]}
                    >
                      Let's go! 🚀
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
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
    borderColor: "rgba(0,188,212,0.25)",
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
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: pad.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    width: 20,
    backgroundColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  card: { flex: 1, width: "100%", backgroundColor: "transparent" },
  scrollContent: {
    paddingHorizontal: pad.xl,
    paddingBottom: pad.xxl,
    alignItems: "center",
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    marginBottom: pad.md,
    letterSpacing: 0.3,
    textAlign: "center",
    textShadowColor: "rgba(0,188,212,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  emoji: { fontSize: 52, marginBottom: pad.sm },
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
  bodyText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    textAlign: "center",
    marginBottom: pad.md,
    lineHeight: font.md * 1.4,
  },
  storiesWrap: { width: "100%", marginTop: pad.sm },
  chipsWrap: { width: "100%", marginTop: pad.sm },
  continueBtn: {
    marginTop: pad.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: pad.xxl,
    paddingVertical: pad.sm,
    backgroundColor: "rgba(179,157,219,0.1)",
  },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: font.md },
});
