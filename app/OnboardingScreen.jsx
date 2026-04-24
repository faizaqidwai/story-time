// app/OnboardingScreen.jsx
//
// CHANGES FROM ORIGINAL:
//   ✅ Added Step 4 — Level Select (STEP.LEVEL = 9)
//   ✅ Gender tap no longer calls registerUser() directly — saves gender
//      and slides to level select step
//   ✅ Level confirm calls registerUser(gender, level)
//   ✅ defaultProfilePlayLevel passed to registerUser()
//   ✅ All existing step logic (name/age/gender) completely unchanged
//   ✅ No router changes — level select is inline in same screen/card

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { useUser } from "./_contexts/UserContext";
import { registerUser } from "./services/authService";
import { FONTS } from "./theme";
import { useTheme } from "./_contexts/ThemeContext";
import { font, pad, radius, size } from "./theme/tokens";
import { getSuggestedLevel } from "./data/ageLevelMap";

const { width, height } = Dimensions.get("window");

const STEP = {
  NAME:   6,
  AGE:    7,
  GENDER: 8,
  LEVEL:  9,   // ← NEW: level select after gender
};

const AGE_OPTIONS = [
  { label: "5", value: 5 },
  { label: "6",  value: 6 },
  { label: "7",  value: 7 },
  { label: "8",  value: 8 },
  { label: "9",  value: 9 },
  { label: "10", value: 10 },
  { label: "11", value: 11 },
  { label: "12", value: 12 },
  { label: "13", value: 13 },
];

// ── Level descriptions (same as billing LevelSelectScreen) ───────────────────
const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);
const LEVEL_DESCRIPTIONS = {
  1:  "Complete beginner — starting fresh",
  2:  "Recognises some letters and words",
  3:  "Can read simple sentences",
  4:  "Reads short stories with help",
  5:  "Independent early reader",
  6:  "Reads fluently with good comprehension",
  7:  "Advanced reader, strong vocabulary",
  8:  "Near grade-level reading",
  9:  "Above grade-level reading",
  10: "Expert reader — complex texts",
};

const getStepMeta = (step, userName) =>
  ({
    [STEP.NAME]: {
      tag: "Step 1 of 4",
      heading: "Create your child's profile",
      hint: "We'll personalise their story journey.",
    },
    [STEP.AGE]: {
      tag: "Step 2 of 4",
      heading: `Nice to meet you, ${userName || "there"}!`,
      hint: "Age helps us pick the right stories.",
    },
    [STEP.GENDER]: {
      tag: "Step 3 of 4",
      heading: "Almost there!",
      hint: `One last thing to tailor ${userName || "your child"}'s experience.`,
    },
    [STEP.LEVEL]: {
      tag: "Step 4 of 4",
      heading: "Where is your child reading?",
      hint: "This sets their starting level. You can always change it later.",
    },
  })[step];

async function playSound(file) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// Main OnboardingScreen
// ─────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { sizes } = useTheme();
  const sz = sizes.onboarding;

  const [step, setStep]           = useState(STEP.NAME);
  const [userName, setUserName]   = useState("");
  const [userAge, setUserAge]     = useState(null);
  const [selectedGender, setSelectedGender] = useState(null); // ← NEW
  const [selectedLevel, setSelectedLevel]   = useState(1);    // ← NEW
  const [recommendedLevel, setRecommendedLevel] = useState(1); // ← NEW
  const { setLoginUserAccount }   = useUser();
  const [dialogueText, setDialogueText] = useState("Tell us the name of your child");
  const [transitioning, setTransitioning] = useState(false);
  const meta = getStepMeta(step, userName);
  const stepIndex = [STEP.NAME, STEP.AGE, STEP.GENDER, STEP.LEVEL].indexOf(step);

  const audioRef   = useRef(null);
  const cardSlide  = useRef(new Animated.Value(0)).current;
  const birdBounce = useRef(new Animated.Value(0)).current;
  const bgPulse    = useRef(new Animated.Value(1)).current;
  const bgPulse2   = useRef(new Animated.Value(1)).current;
  const bgPulse3   = useRef(new Animated.Value(1)).current;
  const homeSlide  = useRef(new Animated.Value(height)).current;

  // ── All existing animation + audio logic unchanged ────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(birdBounce, { toValue: -10, duration: 700, useNativeDriver: true }),
        Animated.timing(birdBounce, { toValue: 0,   duration: 700, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, { toValue: 1.08, duration: 2500, useNativeDriver: true }),
        Animated.timing(bgPulse, { toValue: 0.92, duration: 2500, useNativeDriver: true }),
      ]),
    ).start();
    setTimeout(() =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgPulse2, { toValue: 1.12, duration: 2000, useNativeDriver: true }),
          Animated.timing(bgPulse2, { toValue: 0.88, duration: 2000, useNativeDriver: true }),
        ]),
      ).start(), 700);
    setTimeout(() =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgPulse3, { toValue: 1.1,  duration: 1700, useNativeDriver: true }),
          Animated.timing(bgPulse3, { toValue: 0.9,  duration: 1700, useNativeDriver: true }),
        ]),
      ).start(), 1300);

    playAudio(require("../assets/sounds/onboarding/step-1.mp3"));
  }, []);

  const slideCard = (onSwapped) => {
    Animated.timing(cardSlide, {
      toValue: -width * 1.1,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      cardSlide.setValue(width * 1.1);
      onSwapped?.();
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }).start();
    });
  };

  const playAudio = (file) =>
    new Promise(async (resolve) => {
      try {
        if (audioRef.current) {
          await audioRef.current.unloadAsync();
          audioRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
        audioRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            resolve();
          }
        });
        await sound.playAsync();
      } catch (e) {
        console.log("Audio:", e);
        resolve();
      }
    });

  // ── Step handlers — existing ones unchanged ────────────────────────────────

  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    playSound(require("../assets/sounds/button.mp3"));
    slideCard(() => {
      setStep(STEP.AGE);
      setDialogueText("How old is your child?");
      playAudio(require("../assets/sounds/onboarding/step-2.mp3"));
    });
  };

  const handleAgeSelect = (age) => {
    setUserAge(age);
    playSound(require("../assets/sounds/ping.mp3"));
    slideCard(() => {
      setStep(STEP.GENDER);
      setDialogueText("Your child is a Boy or a Girl?");
      playAudio(require("../assets/sounds/onboarding/step-3.mp3"));
    });
  };

  // ── CHANGE: Gender tap now saves gender and slides to level step ──────────
  // Previously it called handleRegisterUser() directly.
  // Now it sets selectedGender and moves to STEP.LEVEL.
  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    playSound(require("../assets/sounds/button.mp3"));
    slideCard(() => {
      // Pre-select the suggested level based on the child's age.
      // Mapping lives in app/data/ageLevelMap.js — update there before launch.
      setSelectedLevel(getSuggestedLevel(userAge));
      setRecommendedLevel(getSuggestedLevel(userAge));
      setStep(STEP.LEVEL);
      playAudio(require("../assets/sounds/onboarding/step-4.mp3"));
      setDialogueText("What reading level is your child at?");
    });
  };

  // ── NEW: Level confirm — registers user with selected level ───────────────
  const handleLevelConfirm = async () => {
   // playSound(require("../assets/sounds/button.mp3"));
    playSound(require("../assets/sounds/magical.mp3"));
    await handleRegisterUser(selectedGender, selectedLevel);
  };

  // ── CHANGE: handleRegisterUser now accepts gender + level params ──────────
  const handleRegisterUser = async (gender, playLevel) => {
    const response = await registerUser({
      defaultProfileName:      userName.trim(),
      defaultProfileGender:    gender,
      defaultProfileAge:       userAge,
      defaultProfileLevel:     "EARLY",
      defaultProfilePlayLevel: playLevel,  // ← NEW: passed to backend
    });
    const userAccount = await setLoginUserAccount(response.userAccount);
    const defaultProfile = userAccount.profiles[0];

    if (userAccount?.id) {
      await AsyncStorage.setItem(`@show_tutorial_${userAccount.id}`, "true");
    }

    setTransitioning(true);
    Animated.timing(homeSlide, {
      toValue: 0,
      duration: 650,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      if (defaultProfile) {
        router.dismissAll();
        setTimeout(() => router.replace("/home"), 0);
      }
    }, 700);
  };

  // ── Derived sizes ─────────────────────────────────────────────────────────
  const cardWidth = width - sz.cardWidthOffset;

  return (
    <View style={{ flex: 1, backgroundColor: "#08081a" }}>
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button */}
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
        onPress={() => router.replace("/AccountChoice")}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.backIcon, { fontSize: sz.backIconFontSize }]}>‹</Text>
      </TouchableOpacity>

      <View
        style={[StyleSheet.absoluteFill, { zIndex: 2 }]}
        pointerEvents={transitioning ? "none" : "auto"}
      >
        <Animated.View style={[styles.bgCircle, styles.bgCircle1, { transform: [{ scale: bgPulse }] }]} />
        <Animated.View style={[styles.bgCircle, styles.bgCircle2, { transform: [{ scale: bgPulse2 }] }]} />
        <Animated.View style={[styles.bgCircle, styles.bgCircle3, { transform: [{ scale: bgPulse3 }] }]} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.inner, { paddingTop: sz.innerPaddingTop }]}
        >
          <View style={[styles.container, { marginTop: 0 }]}>
            {/* Progress pips — now 4 steps */}
            <View style={[styles.progressRow, { marginBottom: sz.progressMarginBottom, width: cardWidth }]}>
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

            {/* Step header */}
            <Text style={[styles.stepTag, { fontSize: font.sm, letterSpacing: sz.stepTagLetterSpacing, marginBottom: sz.stepTagMarginBottom }]}>
              {meta.tag}
            </Text>
            <Text style={[styles.stepHeading, { fontSize: font.xxl, lineHeight: sz.stepHeadingLineHeight, marginBottom: sz.stepHeadingMarginBottom }]}>
              {meta.heading}
            </Text>
            <Text style={[styles.stepHint, { fontSize: font.md, marginBottom: sz.stepHintMarginBottom }]}>
              {meta.hint}
            </Text>

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

                {/* ── STEP 1: Name ── */}
                {step === STEP.NAME && (
                  <View style={styles.inputSection}>
                    <TextInput
                      style={[styles.nameInput, { fontSize: sz.nameFontSize, paddingHorizontal: sz.namePaddingH, paddingVertical: sz.namePaddingV }]}
                      placeholder="Type name here..."
                      placeholderTextColor="#546E7A"
                      value={userName}
                      onChangeText={(text) => {
                        setUserName(text);
                        if (text.length > userName.length) {
                          playSound(require("../assets/sounds/key.mp3"));
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
                        { marginTop: sz.continueMarginTop, paddingHorizontal: sz.continuePaddingH, paddingVertical: sz.continuePaddingV },
                        !userName.trim() && styles.continueBtnDisabled,
                      ]}
                      onPress={handleNameSubmit}
                      disabled={!userName.trim()}
                    >
                      <Text style={[styles.continueBtnText, { fontSize: font.xl }]}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── STEP 2: Age ── */}
                {step === STEP.AGE && (
                  <View style={styles.ageSection}>
                    {AGE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.ageBtn, { width: sz.ageBtnWidth, height: sz.ageBtnHeight, borderRadius: sz.ageBtnBorderRadius }]}
                        onPress={() => handleAgeSelect(opt.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.ageBtnText, { fontSize: font.h3 }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* ── STEP 3: Gender ── */}
                {step === STEP.GENDER && (
                  <View style={[styles.genderSection, { gap: sz.genderGap }]}>
                    <TouchableOpacity
                      style={[styles.genderBtn, styles.genderBtnBoy, { paddingVertical: sz.genderPaddingV }]}
                      onPress={() => handleGenderSelect("MALE")}
                      activeOpacity={0.85}
                    >
                      <ExpoImage
                        source={require("../assets/img/boy-icon.png")}
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
                        source={require("../assets/img/girl-icon.png")}
                        style={{ width: 100, height: 100, marginBottom: 10 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <Text style={[styles.genderLabel, { fontSize: font.h3 }]}>Girl</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── STEP 4: Level Select (NEW) ── */}
                {step === STEP.LEVEL && (
                  <View style={styles.levelSection}>
                    {/* Level grid */}
                    <View style={styles.levelGrid}>
                      {LEVELS.map((level) => {
                        const isSelected = selectedLevel === level;
                        const isRecommended = recommendedLevel === level;
                        return (
                          <TouchableOpacity
                            key={level}
                            style={[styles.levelCard, isSelected && styles.levelCardSelected, isRecommended && styles.levelCardRecommended]}
                            onPress={() => {
                              setSelectedLevel(level);
                              playSound(require("../assets/sounds/ping.mp3"));
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

                    {/* Selected level callout */}
                    <View style={styles.levelCallout}>
                      <Text style={styles.levelCalloutDesc}>
                        {LEVEL_DESCRIPTIONS[selectedLevel]}
                      </Text>
                    </View>

                    {/* Confirm button */}
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handleLevelConfirm}
                      activeOpacity={0.88}
                    >
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
          <View style={{ flex: 1, backgroundColor: "#1a1a2e" }} />
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const TEAL  = "#00BCD4";
const CORAL = "#FF7043";
const YELLOW = "#FFD54F";
const PINK  = "#EC407A";

const styles = StyleSheet.create({
  glowTL: { position: "absolute", top: -60, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(0,188,212,0.07)", zIndex: 0 },
  glowBR: { position: "absolute", bottom: -40, right: -40, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(150,82,217,0.07)", zIndex: 0 },
  container: { alignItems: "center", height: "100%" },

  backBtn: { position: "absolute", left: 20, zIndex: 30, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#E0F7FA", marginTop: -2 },

  inner: { flex: 1, alignItems: "center", justifyContent: "flex-start" },

  bgCircle:  { position: "absolute", borderRadius: 999, opacity: 0.2 },
  bgCircle1: { width: 350, height: 350, backgroundColor: TEAL,   top: -80,    right: -80 },
  bgCircle2: { width: 200, height: 200, backgroundColor: YELLOW, bottom: 100, left: -60  },
  bgCircle3: { width: 150, height: 150, backgroundColor: CORAL,  bottom: 200, right: -40 },

  card: {
    backgroundColor: "#111830",
    paddingBottom: 20,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(0,188,212,0.4)",
    alignItems: "center",
    marginTop: "3%",
  },

  dialogueBubble: { alignItems: "center", width: "100%", backgroundColor: "#0d1b2e" },
  dialogueText:   { fontFamily: FONTS.bold, color: "#E0F7FA", textAlign: "center", letterSpacing: 0.3, paddingHorizontal: 4, marginTop: 10 },

  progressRow: { flexDirection: "row", gap: 6 },
  pip:         { flex: 1, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)" },
  pipDone:     { backgroundColor: "rgba(0,188,212,0.4)" },
  pipActive:   { backgroundColor: TEAL },

  stepTag:     { fontFamily: FONTS.regular, color: "rgba(0,188,212,0.7)", textTransform: "uppercase", alignSelf: "flex-start" },
  stepHeading: { fontFamily: FONTS.bold, color: "#E0F7FA", marginTop: "10%" },
  stepHint:    { fontFamily: FONTS.light, color: "#546E7A" },

  contentArea: { width: "100%", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  inputSection: { width: "100%", alignItems: "center" },

  nameInput: { width: "100%", backgroundColor: "#0d1b2e", borderRadius: 18, color: "#E0F7FA", borderWidth: 2, borderColor: "rgba(0,188,212,0.5)", elevation: 3, fontFamily: FONTS.regular },

  continueBtn:         { backgroundColor: TEAL, borderRadius: 50, elevation: 6, shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12 },
  continueBtnDisabled: { backgroundColor: "rgba(0,188,212,0.2)", elevation: 0, shadowOpacity: 0 },
  continueBtnText:     { fontFamily: FONTS.bold, color: "#08081a", letterSpacing: 0.5 },

  ageSection: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 10 },
  ageBtn:     { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,188,212,0.1)", borderWidth: 2, borderColor: "rgba(0,188,212,0.45)", shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, gap: 4 },
  ageBtnText: { fontFamily: FONTS.bold, color: "#E0F7FA" },

  genderSection:  { flexDirection: "row", marginTop: 10 },
  genderBtn:      { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 24, elevation: 6, borderWidth: 2.5 },
  genderBtnBoy:   { backgroundColor: "rgba(66,165,245,0.15)", borderColor: "#42A5F5", shadowColor: "#42A5F5", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 10 },
  genderBtnGirl:  { backgroundColor: "rgba(236,64,122,0.15)", borderColor: PINK, shadowColor: PINK, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 10 },
  genderLabel:    { fontFamily: FONTS.bold, color: "#E0F7FA", letterSpacing: 1 },

  // ── Level select styles (NEW) ─────────────────────────────────────────────
  levelSection: { width: "100%", alignItems: "center", paddingTop: pad.sm },

  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: pad.sm,
  },
  levelCard: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  levelCardSelected: {
    backgroundColor: "rgba(0,188,212,0.12)",
    borderColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  levelCardRecommended:{
backgroundColor: "rgba(0,188,212,0.12)",
    borderColor: "#e2967f",
    shadowColor: "#e2967f",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  levelNumber:         { fontFamily: FONTS.bold, fontSize: font.xxl, color: "#546E7A" },
  levelNumberSelected: { color: TEAL },
  selectedDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: TEAL,
  },

  levelCallout: {
    backgroundColor: "rgba(0,188,212,0.08)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
    paddingVertical: pad.sm,
    paddingHorizontal: pad.md,
    alignItems: "center",
    marginBottom: pad.md,
    width: "100%",
  },
  levelCalloutDesc: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: "#B0BEC5",
    textAlign: "center",
  },

  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: pad.s,
    borderRadius: radius.pill,
    height: 52,
    backgroundColor: TEAL,
    overflow: "hidden",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    width: "100%",
  },
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
    fontSize: font.lg,
    color: "#08081a",
    letterSpacing: 0.3,
  },
});
