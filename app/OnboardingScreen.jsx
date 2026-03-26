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
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
];

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
    "Can you tell me your name? 😊",
  );
  const [transitioning, setTransitioning] = useState(false);

  const audioRef = useRef(null);
  const cardSlide = useRef(new Animated.Value(0)).current;
  const birdBounce = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(1)).current;
  const bgPulse2 = useRef(new Animated.Value(1)).current;
  const bgPulse3 = useRef(new Animated.Value(1)).current;
  const homeSlide = useRef(new Animated.Value(height)).current;

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

    playAudio(require("../assets/audio/audio7.mp3"));
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
    slideCard(() => {
      setStep(STEP.AGE);
      setDialogueText("How old are you? 🎂");
      playAudio(require("../assets/audio/audio8.mp3"));
    });
  };

  const handleAgeSelect = (age) => {
    setUserAge(age);
    slideCard(() => {
      setStep(STEP.GENDER);
      setDialogueText("Are you a Boy or a Girl? 🌟");
      playAudio(require("../assets/audio/audio8.mp3"));
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
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 2 }]}
        pointerEvents={transitioning ? "none" : "auto"}
      >
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
          <Animated.View
            style={[
              styles.birdContainer,
              { transform: [{ translateY: birdBounce }] },
            ]}
          >
            <Image
              source={require("../assets/img/story-time-logo-2.png")}
              style={styles.birdVideo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[styles.card, { transform: [{ translateX: cardSlide }] }]}
          >
            {/* Dialogue bubble */}
            <View style={styles.dialogueBubble}>
              <View style={styles.bubbleTail} />
              <Text style={styles.dialogueText}>{dialogueText}</Text>
            </View>

            <View style={styles.contentArea}>
              {step === STEP.NAME && (
                <View style={styles.inputSection}>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Type your name here..."
                    placeholderTextColor="#546E7A"
                    value={userName}
                    onChangeText={setUserName}
                    autoFocus
                    returnKeyType="done"
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
                      <Text style={styles.ageEmoji}>
                        {opt.value <= 5 ? "🐣" : opt.value <= 7 ? "🐥" : "🐦"}
                      </Text>
                      <Text style={styles.ageBtnText}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === STEP.GENDER && (
                <View style={styles.genderSection}>
                  <TouchableOpacity
                    style={[styles.genderBtn, styles.genderBtnBoy]}
                    onPress={() => handleRegisterUser("MALE")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.genderEmoji}>🧒</Text>
                    <Text style={styles.genderLabel}>Boy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderBtn, styles.genderBtnGirl]}
                    onPress={() => handleRegisterUser("FEMALE")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.genderEmoji}>👧</Text>
                    <Text style={styles.genderLabel}>Girl</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
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

// ── Dark theme ────────────────────────────────────────────────
const TEAL = "#00BCD4";
const CORAL = "#FF7043";
const YELLOW = "#FFD54F";
const PINK = "#EC407A";

const styles = StyleSheet.create({
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
    marginTop: 12,
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: "center",
    width: "100%",
    backgroundColor: "#0d1b2e",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
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

  // Dialogue — CoText-Bold, character voice, bigger than original (was 17)
  dialogueText: {
    fontFamily: FONTS.bold,
    fontSize: 21,
    color: "#E0F7FA",
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: 0.3,
    paddingHorizontal: 4,
  },

  contentArea: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 16,
  },
  inputSection: { width: "100%", alignItems: "center", gap: 14 },

  // Name input — CoText-Regular, clean and inviting
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

  // Continue button — CoText-Bold, primary CTA
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

  // Age number — CoText-Bold, bigger tap target
  ageBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: "#E0F7FA",
  },

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

  // Gender label — CoText-Bold, big and friendly
  genderLabel: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: "#E0F7FA",
    letterSpacing: 1,
  },
});
