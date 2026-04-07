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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useUser } from "./_contexts/UserContext";
import { registerUser } from "./services/authService";
import { FONTS } from "./theme";

const { width, height } = Dimensions.get("window");

const STEP = {
  NAME: 6,
  AGE: 7,
  GENDER: 8,
};
const AGE_OPTIONS = [
  { label: "-5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "9+", value: 10 },
];
const getStepMeta = (step, userName) =>
  ({
    [STEP.NAME]: {
      tag: "Step 1 of 3",
      heading: "Create your child's profile",
      hint: "We'll personalise their story journey.",
    },
    [STEP.AGE]: {
      tag: "Step 2 of 3",
      heading: `Nice to meet you, ${userName || "there"}!`,
      hint: "Age helps us pick the right stories.",
    },
    [STEP.GENDER]: {
      tag: "Step 3 of 3",
      heading: "Almost there!",
      hint: `One last thing to tailor ${userName || "your child"}'s experience.`,
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
// Add these to your state/logic
// ─────────────────────────────────────────────────────────────
// Main OnboardingScreen
// ─────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(STEP.NAME);
  const [userName, setUserName] = useState("");
  const [userAge, setUserAge] = useState(null);
  const { setLoginUserAccount } = useUser();
  const [dialogueText, setDialogueText] = useState(
    "Tell us the name of your child",
  );
  const [transitioning, setTransitioning] = useState(false);
  const meta = getStepMeta(step, userName);
  const stepIndex = [STEP.NAME, STEP.AGE, STEP.GENDER].indexOf(step);

  const audioRef = useRef(null);
  const cardSlide = useRef(new Animated.Value(0)).current;
  const birdBounce = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(1)).current;
  const bgPulse2 = useRef(new Animated.Value(1)).current;
  const bgPulse3 = useRef(new Animated.Value(1)).current;
  const homeSlide = useRef(new Animated.Value(height)).current;

  // ── All logic untouched ───────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(birdBounce, {
          toValue: -10,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(birdBounce, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(bgPulse, {
          toValue: 0.92,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    setTimeout(
      () =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bgPulse2, {
              toValue: 1.12,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(bgPulse2, {
              toValue: 0.88,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
        ).start(),
      700,
    );
    setTimeout(
      () =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bgPulse3, {
              toValue: 1.1,
              duration: 1700,
              useNativeDriver: true,
            }),
            Animated.timing(bgPulse3, {
              toValue: 0.9,
              duration: 1700,
              useNativeDriver: true,
            }),
          ]),
        ).start(),
      1300,
    );

    playAudio(require("../assets/audio/step-1.mp3"));
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
        const { sound } = await Audio.Sound.createAsync(file, {
          shouldPlay: false,
        });
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

  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    playSound(require("../assets/sounds/button.mp3")); // ← add this
    slideCard(() => {
      setStep(STEP.AGE);
      setDialogueText("How old is your child?");
      playAudio(require("../assets/audio/step-2.mp3"));
    });
  };

  const handleAgeSelect = (age) => {
    setUserAge(age);
    playSound(require("../assets/sounds/ping.mp3")); // ← add this
    slideCard(() => {
      setStep(STEP.GENDER);
      setDialogueText("Your child is a Boy or a Girl?");
      playAudio(require("../assets/audio/step-3.mp3"));
    });
  };

  const handleRegisterUser = async (selectedGender) => {
    const response = await registerUser({
      defaultProfileName: userName.trim(),
      defaultProfileGender: selectedGender,
      defaultProfileAge: userAge,
      defaultProfileLevel: "EARLY",
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
      if (defaultProfile) router.replace("/home");
    }, 700);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#08081a" }}>
      {/* ── Background: same glow circles as IntroCarousel / AccountChoice ── */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* ── Back button — shown only on NAME step, same style as AccountChoice ── */}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/AccountChoice")}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View
        style={[StyleSheet.absoluteFill, { zIndex: 2 }]}
        pointerEvents={transitioning ? "none" : "auto"}
      >
        {/* Pulsing circles — kept for the onboarding character screen feel */}
        <Animated.View
          style={[
            styles.bgCircle,
            styles.bgCircle1,
            { transform: [{ scale: bgPulse }] },
          ]}
        />
        <Animated.View
          style={[
            styles.bgCircle,
            styles.bgCircle2,
            { transform: [{ scale: bgPulse2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.bgCircle,
            styles.bgCircle3,
            { transform: [{ scale: bgPulse3 }] },
          ]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inner}
        >
          <View style={styles.container}>
            {/* <Animated.View style={[styles.birdContainer]}>
            <Image
              source={require("../assets/img/story-time-logo-4.png")}
              style={styles.birdVideo}
              resizeMode="contain"
            />
          </Animated.View> */}
            {/* Progress pips */}
            <View style={styles.progressRow}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pip,
                    i < stepIndex && styles.pipDone,
                    i === stepIndex && styles.pipActive,
                  ]}
                />
              ))}
            </View>

            {/* Step header */}
            <Text style={styles.stepTag}>{meta.tag}</Text>
            <Text style={styles.stepHeading}>{meta.heading}</Text>
            <Text style={styles.stepHint}>{meta.hint}</Text>

            <Animated.View
              style={[styles.card, { transform: [{ translateX: cardSlide }] }]}
            >
              {/* Dialogue bubble */}
              <View style={styles.dialogueBubble}>
                {/* <View style={styles.bubbleTail} /> */}
                <Text style={styles.dialogueText}>{dialogueText}</Text>
              </View>

              <View style={styles.contentArea}>
                {step === STEP.NAME && (
                  <View style={styles.inputSection}>
                    <TextInput
                      style={styles.nameInput}
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
                        !userName.trim() && styles.continueBtnDisabled,
                      ]}
                      onPress={handleNameSubmit}
                      disabled={!userName.trim()}
                    >
                      <Text style={styles.continueBtnText}>Continue ➜</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {step === STEP.AGE && (
                  <View style={styles.ageSection}>
                    {AGE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={styles.ageBtn}
                        onPress={() => handleAgeSelect(opt.value)}
                        activeOpacity={0.8}
                      >
                        {/* <Text style={styles.ageEmoji}>
                          {opt.value <= 5 ? "🐣" : opt.value <= 7 ? "🐥" : "🐦"}
                        </Text> */}
                        <Text style={styles.ageBtnText}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {step === STEP.GENDER && (
                  <View style={styles.genderSection}>
                    <TouchableOpacity
                      style={[styles.genderBtn, styles.genderBtnBoy]}
                      onPress={() => {
                        playSound(require("../assets/sounds/magical.mp3")); // ← add this
                        handleRegisterUser("MALE");
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.genderEmoji}>🧒</Text>
                      <Text style={styles.genderLabel}>Boy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.genderBtn, styles.genderBtnGirl]}
                      onPress={() => {
                        playSound(require("../assets/sounds/magical.mp3")); // ← add this
                        handleRegisterUser("FEMALE");
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.genderEmoji}>👧</Text>
                      <Text style={styles.genderLabel}>Girl</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {transitioning && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { zIndex: 1, transform: [{ translateY: homeSlide }] },
          ]}
        >
          <View style={{ flex: 1, backgroundColor: "#1a1a2e" }} />
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const TEAL = "#00BCD4";
const CORAL = "#FF7043";
const YELLOW = "#FFD54F";
const PINK = "#EC407A";

const styles = StyleSheet.create({
  // ── Glow circles — same as IntroCarousel / AccountChoice, sit behind zIndex 2 ──
  glowTL: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0,188,212,0.07)",
    zIndex: 0,
  },
  container: {
    alignItems: "center",
    // justifyContent: "center",
    //  backgroundColor: "pink",
    //  marginTop: "40%",
    height: "100%",
  },
  glowBR: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(150,82,217,0.07)",
    zIndex: 0,
  },

  // ── Back button ────────────────────────────────────────────
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    left: 20,
    zIndex: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 28, color: "#E0F7FA", marginTop: -2 },

  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: "30%",
  },

  bgCircle: { position: "absolute", borderRadius: 999, opacity: 0.2 },
  bgCircle1: {
    width: 350,
    height: 350,
    backgroundColor: TEAL,
    top: -80,
    right: -80,
  },
  bgCircle2: {
    width: 200,
    height: 200,
    backgroundColor: YELLOW,
    bottom: 100,
    left: -60,
  },
  bgCircle3: {
    width: 150,
    height: 150,
    backgroundColor: CORAL,
    bottom: 200,
    right: -40,
  },

  birdContainer: {
    width: 300,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  birdVideo: { width: 200, height: 200 },

  card: {
    width: width - 32,
    backgroundColor: "#111830",
    borderRadius: 28,
    //marginTop: 12,
    paddingBottom: 20,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(0,188,212,0.4)",
    alignItems: "center",
  },

  dialogueBubble: {
    //  paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: "center",
    width: "100%",
    backgroundColor: "#0d1b2e",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    // backgroundColor: "pink",
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: TEAL,
    alignSelf: "center",
    marginBottom: 8,
  },
  dialogueText: {
    fontFamily: FONTS.bold,
    fontSize: 21,
    color: "#E0F7FA",
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: 0.3,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    width: width - 32,
  },
  pip: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  pipDone: { backgroundColor: "rgba(0,188,212,0.4)" },
  pipActive: { backgroundColor: TEAL },
  stepTag: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: "rgba(0,188,212,0.7)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: "10%",
    alignSelf: "flex-start",
  },
  stepHeading: {
    fontFamily: FONTS.bold,
    fontSize: 25,
    color: "#E0F7FA",
    lineHeight: 29,
    marginBottom: 4,
  },
  stepHint: {
    fontFamily: FONTS.light,
    fontSize: 15,
    color: "#546E7A",
    marginBottom: "8%",
  },
  contentArea: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    //  paddingTop: 16,
    //  backgroundColor: "red",
  },
  inputSection: {
    width: "100%",
    alignItems: "center",
    //  gap: 16,
    //  backgroundColor: "yellow",
  },
  nameInput: {
    width: "100%",
    backgroundColor: "#0d1b2e",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 16,
    fontSize: 20,
    color: "#E0F7FA",
    borderWidth: 2,
    borderColor: "rgba(0,188,212,0.5)",
    elevation: 3,
    fontFamily: FONTS.regular,
  },
  continueBtn: {
    backgroundColor: TEAL,
    marginTop: 22,
    borderRadius: 50,
    paddingHorizontal: 40,
    paddingVertical: 16,
    elevation: 6,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  continueBtnDisabled: {
    backgroundColor: "rgba(0,188,212,0.2)",
    elevation: 0,
    shadowOpacity: 0,
  },
  continueBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 19,
    color: "#08081a",
    letterSpacing: 0.5,
  },

  ageSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  ageBtn: {
    width: 82,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,188,212,0.1)",
    borderWidth: 2,
    borderColor: "rgba(0,188,212,0.45)",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 4,
  },
  ageEmoji: { fontSize: 28 },
  ageBtnText: { fontFamily: FONTS.bold, fontSize: 26, color: "#E0F7FA" },

  genderSection: { flexDirection: "row", gap: 20, marginTop: 10 },
  genderBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    paddingVertical: 26,
    elevation: 6,
    borderWidth: 2.5,
  },
  genderBtnBoy: {
    backgroundColor: "rgba(66,165,245,0.15)",
    borderColor: "#42A5F5",
    shadowColor: "#42A5F5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  genderBtnGirl: {
    backgroundColor: "rgba(236,64,122,0.15)",
    borderColor: PINK,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  genderEmoji: { fontSize: 52, marginBottom: 10 },
  genderLabel: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: "#E0F7FA",
    letterSpacing: 1,
  },
});
