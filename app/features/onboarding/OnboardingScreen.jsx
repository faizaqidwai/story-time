// app/features/onboarding/OnboardingScreen.jsx
//
// BRAND UPDATE — feature/brand-guidelines-v2
// COLOUR-ONLY changes — zero functional/layout/animation changes:
//
//   ✅ Background "#08081a" → COLORS.background
//   ✅ Removed local TEAL/CORAL/YELLOW/PINK constants — all from COLORS
//   ✅ TEAL "#00BCD4" → COLORS.primary (#00C4CC) everywhere
//   ✅ CORAL "#FF7043" → COLORS.coral (#E8445A)
//   ✅ YELLOW "#FFD54F" → COLORS.amber (#F5A623)
//   ✅ PINK "#EC407A" → REMOVED (retired §9.1) — genderBtnGirl uses COLORS.coral
//   ✅ Card bg "#111830" → COLORS.surface
//   ✅ Card border "rgba(0,188,212,0.4)" → COLORS.borderBold
//   ✅ Input border "rgba(0,188,212,0.5)" → COLORS.borderBold
//   ✅ Age btn bg/border old rgba → COLORS.surfaceDim / COLORS.borderBold
//   ✅ Glow blobs → COLORS.glowCyan / COLORS.glowPurple
//   ✅ Transition bg "#1a1a2e" → COLORS.background
//   ✅ Dialogue bubble bg "#0d1b2e" → COLORS.surface
//   ✅ Placeholder colour "#546E7A" → COLORS.textMuted
//   ✅ Level card selected: old cyan → COLORS.primary
//   ✅ Level card recommended: off-brand "#e2967f" → COLORS.amber
//   ✅ Level number selected: old cyan → COLORS.primary
//   ✅ Selected dot: old cyan → COLORS.primary
//   ✅ Step tag/pip colours: old cyan rgba → COLORS.primary / COLORS.borderPrimary
//   ✅ Continue button: old TEAL → COLORS.primary
//   ✅ Confirm button: old TEAL → COLORS.primary
//   ✅ textShadow: old cyan → COLORS.primary
//   ✅ Shadow colours: old TEAL → COLORS.primary
//   ✅ "#E0F7FA" → COLORS.textPrimary
//   ✅ COLORS imported from theme
//
// UNTOUCHED (zero changes):
//   ✅ All animation logic, Animated refs, loops, spring configs
//   ✅ All step handlers (handleNameSubmit, handleAgeSelect, handleGenderSelect, handleLevelConfirm, handleRegisterUser)
//   ✅ All navigation and routing
//   ✅ All audio
//   ✅ All layout dimensions, padding, sizing, flex values
//   ✅ All sz.* and font.* tokens
//   ✅ All data: STEP, AGE_OPTIONS, LEVELS, LEVEL_DESCRIPTIONS, getStepMeta
//   ✅ Girl button remains pink-adjacent using COLORS.coral (closest brand colour)
//   ✅ Boy button keeps blue (#42A5F5) — character branding, acceptable non-brand use

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { useUser } from "../../_contexts/UserContext";
import { registerUser } from "../../services/authService";
import { FONTS, COLORS } from "../../theme";
import { useTheme } from "../../_contexts/ThemeContext";
import { font, pad, radius, size } from "../../theme/tokens";
import { getSuggestedLevel } from "../../data/ageLevelMap";

const { width, height } = Dimensions.get("window");

// ── Step constants — UNCHANGED ────────────────────────────────────────────────
const STEP = { NAME: 6, AGE: 7, GENDER: 8, LEVEL: 9 };

const AGE_OPTIONS = [
  { label: "5", value: 5 }, { label: "6", value: 6 },
  { label: "7", value: 7 }, { label: "8", value: 8 },
  { label: "9", value: 9 }, { label: "10", value: 10 },
  { label: "11", value: 11 }, { label: "12", value: 12 },
  { label: "13", value: 13 },
];

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

const getStepMeta = (step, userName) =>
  ({
    [STEP.NAME]: { tag: "Step 1 of 4", heading: "Create your child's profile", hint: "We'll personalise their story journey." },
    [STEP.AGE]:  { tag: "Step 2 of 4", heading: `Nice to meet you, ${userName || "there"}!`, hint: "Age helps us pick the right stories." },
    [STEP.GENDER]: { tag: "Step 3 of 4", heading: "Almost there!", hint: `One last thing to tailor ${userName || "your child"}'s experience.` },
    [STEP.LEVEL]:  { tag: "Step 4 of 4", heading: "Where is your child reading?", hint: "This sets their starting level. You can always change it later." },
  })[step];

async function playSound(file) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) sound.unloadAsync(); });
    await sound.playAsync();
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Main OnboardingScreen — all logic UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { sizes } = useTheme();
  const sz = sizes.onboarding;

  const [step, setStep]                   = useState(STEP.NAME);
  const [userName, setUserName]           = useState("");
  const [userAge, setUserAge]             = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedLevel, setSelectedLevel]   = useState(1);
  const [recommendedLevel, setRecommendedLevel] = useState(1);
  const { setLoginUserAccount } = useUser();
  const [dialogueText, setDialogueText]   = useState("Tell us the name of your child");
  const [transitioning, setTransitioning] = useState(false);
  const meta = getStepMeta(step, userName);
  const stepIndex = [STEP.NAME, STEP.AGE, STEP.GENDER, STEP.LEVEL].indexOf(step);

  const audioRef    = useRef(null);
  const cardSlide   = useRef(new Animated.Value(0)).current;
  const birdBounce  = useRef(new Animated.Value(0)).current;
  const bgPulse     = useRef(new Animated.Value(1)).current;
  const bgPulse2    = useRef(new Animated.Value(1)).current;
  const bgPulse3    = useRef(new Animated.Value(1)).current;
  const homeSlide   = useRef(new Animated.Value(height)).current;

  // ── All animation + audio logic — UNCHANGED ──────────────────────────────
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(birdBounce, { toValue: -10, duration: 700, useNativeDriver: true }),
      Animated.timing(birdBounce, { toValue: 0,   duration: 700, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(bgPulse, { toValue: 1.08, duration: 2500, useNativeDriver: true }),
      Animated.timing(bgPulse, { toValue: 0.92, duration: 2500, useNativeDriver: true }),
    ])).start();
    setTimeout(() => Animated.loop(Animated.sequence([
      Animated.timing(bgPulse2, { toValue: 1.12, duration: 2000, useNativeDriver: true }),
      Animated.timing(bgPulse2, { toValue: 0.88, duration: 2000, useNativeDriver: true }),
    ])).start(), 700);
    setTimeout(() => Animated.loop(Animated.sequence([
      Animated.timing(bgPulse3, { toValue: 1.1, duration: 1700, useNativeDriver: true }),
      Animated.timing(bgPulse3, { toValue: 0.9, duration: 1700, useNativeDriver: true }),
    ])).start(), 1300);
    playAudio(require("../../../assets/sounds/onboarding/step-1.mp3"));
  }, []);

  const slideCard = (onSwapped) => {
    Animated.timing(cardSlide, { toValue: -width * 1.1, duration: 280, useNativeDriver: true })
      .start(() => {
        cardSlide.setValue(width * 1.1);
        onSwapped?.();
        Animated.spring(cardSlide, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }).start();
      });
  };

  const playAudio = (file) =>
    new Promise(async (resolve) => {
      try {
        if (audioRef.current) { await audioRef.current.unloadAsync(); audioRef.current = null; }
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
        audioRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) { sound.setOnPlaybackStatusUpdate(null); resolve(); }
        });
        await sound.playAsync();
      } catch (e) { console.log("Audio:", e); resolve(); }
    });

  // ── Step handlers — ALL UNCHANGED ────────────────────────────────────────
  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    playSound(require("../../../assets/sounds/button.mp3"));
    slideCard(() => {
      setStep(STEP.AGE);
      setDialogueText("How old is your child?");
      playAudio(require("../../../assets/sounds/onboarding/step-2.mp3"));
    });
  };

  const handleAgeSelect = (age) => {
    setUserAge(age);
    playSound(require("../../../assets/sounds/ping.mp3"));
    slideCard(() => {
      setStep(STEP.GENDER);
      setDialogueText("Your child is a Boy or a Girl?");
      playAudio(require("../../../assets/sounds/onboarding/step-3.mp3"));
    });
  };

  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    playSound(require("../../../assets/sounds/button.mp3"));
    slideCard(() => {
      setSelectedLevel(getSuggestedLevel(userAge));
      setRecommendedLevel(getSuggestedLevel(userAge));
      setStep(STEP.LEVEL);
      playAudio(require("../../../assets/sounds/onboarding/step-4.mp3"));
      setDialogueText("What reading level is your child at?");
    });
  };

  const handleLevelConfirm = async () => {
    playSound(require("../../../assets/sounds/magical.mp3"));
    await handleRegisterUser(selectedGender, selectedLevel);
  };

  const handleRegisterUser = async (gender, playLevel) => {
    const response = await registerUser({
      defaultProfileName:      userName.trim(),
      defaultProfileGender:    gender,
      defaultProfileAge:       userAge,
      defaultProfileLevel:     "EARLY",
      defaultProfilePlayLevel: playLevel,
    });
    const userAccount    = await setLoginUserAccount(response.userAccount);
    const defaultProfile = userAccount.profiles[0];
    if (userAccount?.id) {
      await AsyncStorage.setItem(`@show_tutorial_${userAccount.id}`, "true");
    }
    setTransitioning(true);
    Animated.timing(homeSlide, { toValue: 0, duration: 650, useNativeDriver: true }).start();
    setTimeout(() => {
      if (defaultProfile) {
        router.dismissAll();
        setTimeout(() => router.replace("/features/home"), 0);
      }
    }, 700);
  };

  const cardWidth = width - sz.cardWidthOffset;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button — UNCHANGED */}
      <TouchableOpacity
        style={[
          styles.backBtn,
          {
            width: sz.backBtnSize,
            height: sz.backBtnSize,
            borderRadius: sz.backBtnSize / 2,
            top: Platform.OS === "ios" ? 54 : 20,
          },
        ]}
        onPress={() => router.replace("/features/onboarding/AccountChoice")}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.backIcon, { fontSize: sz.backIconFontSize }]}>‹</Text>
      </TouchableOpacity>

      <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents={transitioning ? "none" : "auto"}>
        {/* BG circles — UNCHANGED size/position, colours corrected */}
        <Animated.View style={[styles.bgCircle, styles.bgCircle1, { transform: [{ scale: bgPulse }] }]} />
        <Animated.View style={[styles.bgCircle, styles.bgCircle2, { transform: [{ scale: bgPulse2 }] }]} />
        <Animated.View style={[styles.bgCircle, styles.bgCircle3, { transform: [{ scale: bgPulse3 }] }]} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.inner, { paddingTop: sz.innerPaddingTop }]}
        >
          <View style={[styles.container, { marginTop: 0 }]}>

            {/* ── Step header block — fixed width matches card so pips never shift ── */}
            <View style={{ width: cardWidth, alignItems: "flex-start" }}>
              <View style={[styles.progressRow, { marginBottom: sz.progressMarginBottom }]}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.pip,
                      { height: sz.progressPipHeight },
                      i < stepIndex && styles.pipDone,
                      i === stepIndex && styles.pipActive,
                    ]}
                  />
                ))}
              </View>

              <Text style={[styles.stepTag, { fontSize: font.sm, letterSpacing: sz.stepTagLetterSpacing, marginBottom: sz.stepTagMarginBottom }]}>
                {meta.tag}
              </Text>
              <Text style={[styles.stepHeading, { fontSize: font.xxl, lineHeight: sz.stepHeadingLineHeight, marginBottom: sz.stepHeadingMarginBottom }]}>
                {meta.heading}
              </Text>
              <Text style={[styles.stepHint, { fontSize: font.md, marginBottom: sz.stepHintMarginBottom }]}>
                {meta.hint}
              </Text>
            </View>

            {/* Card — UNCHANGED layout */}
            <Animated.View
              style={[
                styles.card,
                {
                  width: cardWidth,
                  borderRadius: sz.cardBorderRadius,
                  transform: [{ translateX: cardSlide }],
                },
              ]}
            >
              {/* Dialogue bubble */}
              <View
                style={[
                  styles.dialogueBubble,
                  {
                    paddingTop: sz.dialoguePaddingTop,
                    paddingBottom: sz.dialoguePaddingBottom,
                    borderTopLeftRadius: sz.cardBorderRadius - 2,
                    borderTopRightRadius: sz.cardBorderRadius - 2,
                  },
                ]}
              >
                <Text style={[styles.dialogueText, { fontSize: font.xl + 1, lineHeight: sz.dialogueLineHeight }]}>
                  {dialogueText}
                </Text>
              </View>

              <View style={styles.contentArea}>

                {/* ── STEP 1: Name — UNCHANGED ── */}
                {step === STEP.NAME && (
                  <View style={styles.inputSection}>
                    <TextInput
                      style={[
                        styles.nameInput,
                        {
                          fontSize: sz.nameFontSize,
                          paddingHorizontal: sz.namePaddingH,
                          paddingVertical: sz.namePaddingV,
                        },
                      ]}
                      placeholder="Type name here..."
                      placeholderTextColor={COLORS.textMuted}   // ✅ was "#546E7A"
                      value={userName}
                      onChangeText={(text) => {
                        setUserName(text);
                        if (text.length > userName.length) {
                          playSound(require("../../../assets/sounds/key.mp3"));
                        }
                      }}
                      autoFocus
                      returnKeyType="done"
                      keyboardAppearance="dark"
                      onSubmitEditing={handleNameSubmit}
                    />
                    <TouchableOpacity
                      style={[
                        styles.continueBtn,
                        {
                          marginTop: sz.continueMarginTop,
                          paddingHorizontal: sz.continuePaddingH,
                          paddingVertical: sz.continuePaddingV,
                        },
                        !userName.trim() && styles.continueBtnDisabled,
                      ]}
                      onPress={handleNameSubmit}
                      disabled={!userName.trim()}
                    >
                      <Text style={[styles.continueBtnText, { fontSize: font.xl }]}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── STEP 2: Age — UNCHANGED ── */}
                {step === STEP.AGE && (
                  <View style={styles.ageSection}>
                    {AGE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.ageBtn,
                          {
                            width: sz.ageBtnWidth,
                            height: sz.ageBtnHeight,
                            borderRadius: sz.ageBtnBorderRadius,
                          },
                        ]}
                        onPress={() => handleAgeSelect(opt.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.ageBtnText, { fontSize: font.h3 }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* ── STEP 3: Gender — UNCHANGED layout ── */}
                {step === STEP.GENDER && (
                  <View style={[styles.genderSection, { gap: sz.genderGap }]}>
                    <TouchableOpacity
                      style={[styles.genderBtn, styles.genderBtnBoy, { paddingVertical: sz.genderPaddingV }]}
                      onPress={() => handleGenderSelect("MALE")}
                      activeOpacity={0.85}
                    >
                      <ExpoImage
                        source={require("../../../assets/img/boy-icon.png")}
                        style={{ width: 100, height: 100, marginBottom: 10 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <Text style={[styles.genderLabel, { fontSize: font.h3 }]}>Boy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.genderBtn, styles.genderBtnGirl, { paddingVertical: sz.genderPaddingV }]}
                      onPress={() => handleGenderSelect("FEMALE")}
                      activeOpacity={0.85}
                    >
                      <ExpoImage
                        source={require("../../../assets/img/girl-icon.png")}
                        style={{ width: 100, height: 100, marginBottom: 10 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <Text style={[styles.genderLabel, { fontSize: font.h3 }]}>Girl</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── STEP 4: Level Select — UNCHANGED layout ── */}
                {step === STEP.LEVEL && (
                  <View style={styles.levelSection}>
                    <View style={styles.levelGrid}>
                      {LEVELS.map((level) => {
                        const isSelected    = selectedLevel === level;
                        const isRecommended = recommendedLevel === level;
                        return (
                          <TouchableOpacity
                            key={level}
                            style={[
                              styles.levelCard,
                              isSelected    && styles.levelCardSelected,
                              isRecommended && styles.levelCardRecommended,
                            ]}
                            onPress={() => {
                              setSelectedLevel(level);
                              playSound(require("../../../assets/sounds/ping.mp3"));
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.levelNumber, isSelected && styles.levelNumberSelected]}>
                              {level}
                            </Text>
                            {isSelected && <View style={styles.selectedDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.levelCallout}>
                      <Text style={styles.levelCalloutDesc}>
                        {LEVEL_DESCRIPTIONS[selectedLevel]}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.confirmBtn} onPress={handleLevelConfirm} activeOpacity={0.88}>
                      <View style={styles.confirmShine} />
                      <Text style={styles.confirmText}>Start Reading! 📚</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {transitioning && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1, transform: [{ translateY: homeSlide }] }]}>
          <View style={{ flex: 1, backgroundColor: COLORS.background }} />
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles — layout/sizing UNCHANGED, colours corrected ──────────────────────
const styles = StyleSheet.create({
  glowTL: {
    position: "absolute", top: -60, left: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: COLORS.glowCyan,           // ✅ was "rgba(0,188,212,0.07)"
    zIndex: 0,
  },
  glowBR: {
    position: "absolute", bottom: -40, right: -40,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: COLORS.glowPurple,         // ✅ was "rgba(150,82,217,0.07)"
    zIndex: 0,
  },
  container: { alignItems: "center", height: "100%" },
  backBtn: {
    position: "absolute", left: 20, zIndex: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { color: COLORS.textPrimary, marginTop: -2 },  // ✅ was "#E0F7FA"
  inner: { flex: 1, alignItems: "center", justifyContent: "flex-start" },

  // BG circles — size/position UNCHANGED, colours corrected
  bgCircle: { position: "absolute", borderRadius: 999, opacity: 0.2 },
  bgCircle1: { width: 350, height: 350, backgroundColor: COLORS.cyan,   top: -80,    right: -80  }, // ✅ was "#00BCD4"
  bgCircle2: { width: 200, height: 200, backgroundColor: COLORS.amber,  bottom: 100, left: -60   }, // ✅ was "#FFD54F"
  bgCircle3: { width: 150, height: 150, backgroundColor: COLORS.coral,  bottom: 200, right: -40  }, // ✅ was "#FF7043"

  // Card — layout UNCHANGED
  card: {
    backgroundColor: COLORS.surface,            // ✅ was "#111830"
    paddingBottom: 20,
    shadowColor: COLORS.primary,                // ✅ was TEAL "#00BCD4"
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.borderBold,             // ✅ was "rgba(0,188,212,0.4)"
    alignItems: "center",
    marginTop: "3%",
  },

  dialogueBubble: {
    alignItems: "center",
    width: "100%",
    backgroundColor: COLORS.surface,            // ✅ was "#0d1b2e"
  },
  dialogueText: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,                  // ✅ was "#E0F7FA"
    textAlign: "center",
    letterSpacing: 0.3,
    paddingHorizontal: 4,
    marginTop: 10,
  },

  // Progress pips
  progressRow: { flexDirection: "row", gap: 6, width: "100%" },
  pip:       { flex: 1, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)" },
  pipDone:   { backgroundColor: COLORS.borderPrimary },  // ✅ was "rgba(0,188,212,0.4)"
  pipActive: { backgroundColor: COLORS.primary },        // ✅ was TEAL "#00BCD4"

  // Step header
  stepTag: {
    fontFamily: FONTS.regular,
    color: COLORS.primary,                      // ✅ was "rgba(0,188,212,0.7)"
    opacity: 0.7,
    textTransform: "uppercase",
    alignSelf: "flex-start",
  },
  stepHeading: { fontFamily: FONTS.bold, color: COLORS.textPrimary, marginTop: "10%" }, // ✅ was "#E0F7FA"
  stepHint:    { fontFamily: FONTS.light, color: COLORS.textMuted },                    // ✅ was "#546E7A"

  contentArea: {
    width: "100%", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  inputSection: { width: "100%", alignItems: "center" },

  // Name input
  nameInput: {
    width: "100%",
    backgroundColor: COLORS.surface,            // ✅ was "#0d1b2e"
    borderRadius: 18,
    color: COLORS.textPrimary,                  // ✅ was "#E0F7FA"
    borderWidth: 2,
    borderColor: COLORS.borderBold,             // ✅ was "rgba(0,188,212,0.5)"
    elevation: 3,
    fontFamily: FONTS.regular,
  },

  // Continue button — UNCHANGED layout
  continueBtn: {
    backgroundColor: COLORS.primary,            // ✅ was TEAL "#00BCD4"
    borderRadius: 50,
    elevation: 6,
    shadowColor: COLORS.primary,               // ✅ was TEAL
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.surfaceDim,         // ✅ was "rgba(0,188,212,0.2)"
    elevation: 0,
    shadowOpacity: 0,
  },
  continueBtnText: {
    fontFamily: FONTS.bold,
    color: COLORS.textOnPrimary,               // ✅ was "#08081a" — now uses theme token
    letterSpacing: 0.5,
  },

  // Age buttons — UNCHANGED layout
  ageSection: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "center", gap: 12, marginTop: 10,
  },
  ageBtn: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surfaceDim,         // ✅ was "rgba(0,188,212,0.1)"
    borderWidth: 2,
    borderColor: COLORS.borderBold,             // ✅ was "rgba(0,188,212,0.45)"
    shadowColor: COLORS.primary,               // ✅ was TEAL
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 4,
  },
  ageBtnText: { fontFamily: FONTS.bold, color: COLORS.textPrimary },  // ✅ was "#E0F7FA"

  // Gender buttons — UNCHANGED layout
  genderSection: { flexDirection: "row", marginTop: 10 },
  genderBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 24, elevation: 6, borderWidth: 2.5,
  },
  genderBtnBoy: {
    backgroundColor: "rgba(66,165,245,0.15)",
    borderColor: "#42A5F5",                     // keep — character blue, not a brand UI colour
    shadowColor: "#42A5F5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  genderBtnGirl: {
    backgroundColor: `${COLORS.coral}26`,       // ✅ was "#EC407A" PINK (retired §9.1) → coral
    borderColor: COLORS.coral,                  // ✅ coral is closest brand colour
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  genderLabel: { fontFamily: FONTS.bold, color: COLORS.textPrimary, letterSpacing: 1 }, // ✅ was "#E0F7FA"

  // Level select — UNCHANGED layout
  levelSection: { width: "100%", alignItems: "center", paddingTop: pad.sm },
  levelGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 8, justifyContent: "center", marginBottom: pad.sm,
  },
  levelCard: {
    width: "18%", aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  levelCardSelected: {
    backgroundColor: COLORS.surfaceDim,         // ✅ was "rgba(0,188,212,0.12)"
    borderColor: COLORS.primary,               // ✅ was TEAL "#00BCD4"
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  levelCardRecommended: {
    backgroundColor: `${COLORS.amber}20`,       // ✅ was off-brand "#e2967f" → amber
    borderColor: COLORS.amber,                  // ✅ amber = recommended signal §3.3
    shadowColor: COLORS.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  levelNumber:         { fontFamily: FONTS.bold, fontSize: font.xxl, color: COLORS.textMuted },  // ✅ was "#546E7A"
  levelNumberSelected: { color: COLORS.primary },  // ✅ was TEAL "#00BCD4"
  selectedDot: {
    position: "absolute", top: 4, right: 4,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORS.primary,            // ✅ was TEAL "#00BCD4"
  },

  levelCallout: {
    backgroundColor: COLORS.glowCyan,           // ✅ was "rgba(0,188,212,0.08)"
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,          // ✅ was "rgba(0,188,212,0.25)"
    paddingVertical: pad.sm,
    paddingHorizontal: pad.md,
    alignItems: "center",
    marginBottom: pad.md,
    width: "100%",
  },
  levelCalloutDesc: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: COLORS.textMuted,                    // ✅ was "#B0BEC5"
    textAlign: "center",
  },

  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: pad.s, borderRadius: radius.pill,
    height: 52,
    backgroundColor: COLORS.primary,            // ✅ was TEAL "#00BCD4"
    overflow: "hidden",
    shadowColor: COLORS.primary,               // ✅ was TEAL
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    width: "100%",
  },
  confirmShine: {
    position: "absolute", top: 0, left: "14%",
    width: "38%", height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  confirmText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: COLORS.textOnPrimary,               // ✅ was "#08081a" — now uses theme token
    letterSpacing: 0.3,
  },
});
