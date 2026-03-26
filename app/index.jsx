import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { useUser } from "./_contexts/UserContext";
import { fetchRegisterToken, registerUser } from "./services/authService";
import { clearPrimaryUser } from "./services/identityStorage";

const { width, height } = Dimensions.get("window");

const SplashScreen = () => {
  const router = useRouter();
  const {
    isFirstTime,
    addProfile,
    selectProfile,
    isLoading,
    isLogout,
    setLoginUserAccount,
    clearAllData,
  } = useUser();

  // ── Existing logic animations (untouched) ─────────────────
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  // ── Title word animations ─────────────────────────────────
  const wingX = useRef(new Animated.Value(-width)).current; // slides in from left
  const wordX = useRef(new Animated.Value(width)).current; // slides in from right
  const wingOp = useRef(new Animated.Value(0)).current;
  const wordOp = useRef(new Animated.Value(0)).current;

  // ── Logo ──────────────────────────────────────────────────
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  // ── Exit animations ───────────────────────────────────────
  const logoY = useRef(new Animated.Value(0)).current; // bird flies up
  const [exiting, setExiting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    readingLevel: "EARLY",
  });

  const readingLevels = ["EARLY", "MIDDLE", "ADVANCED"];

  useEffect(() => {
    // Todo remove this line later
    //clearAllData();
    //clearPrimaryUser();

    // ── Logo fades + scales in ────────────────────────────
    Animated.parallel([
      Animated.timing(logoOp, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // ── "Wing" slides in from left (slow, floaty) ───────────
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(wingX, {
          toValue: 0,
          friction: 14,
          tension: 22,
          useNativeDriver: true,
        }),
        Animated.timing(wingOp, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // ── After "Wing" settles, "Word" drifts in from right
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(wordX, {
              toValue: 0,
              friction: 14,
              tension: 22,
              useNativeDriver: true,
            }),
            Animated.timing(wordOp, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]).start();
        }, 250);
      });
    }, 900); // logo settles first

    // ── Existing logic (untouched) ────────────────────────
    const playSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/title/fairy-glitter.wav"),
        );
        await sound.playAsync();
      } catch (error) {
        console.log("Sound error:", error);
      }
    };
    playSound();

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(sparkleOpacity, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    // ── Exit sequence fires 1.5s before navigation ───────────
    const exitTimer = setTimeout(() => {
      setExiting(true);
      Animated.parallel([
        // Bird logo flies up off screen
        Animated.timing(logoY, {
          toValue: -height,
          duration: 900,
          useNativeDriver: true,
        }),
        // Logo fades out
        Animated.timing(logoOp, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        // "Wing" slides back to the left
        Animated.spring(wingX, {
          toValue: -width,
          friction: 10,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(wingOp, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        // "Word" slides back to the right
        Animated.spring(wordX, {
          toValue: width,
          friction: 10,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(wordOp, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3500);

    const timer = setTimeout(async () => {
      if (!isLoading) {
        if (isFirstTime) {
          await fetchRegisterToken();
          console.log("in index after register token");
          router.replace("/IntroCarousel");
        } else {
          if (isLogout) {
            router.replace("/login");
          } else {
            //router.replace("/components/Article");
            router.replace("/home");
            // router.replace("/DodgeCarGame");
          }
        }
      }
    }, 5000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(timer);
    };
  }, [isLoading, isFirstTime]);

  // ── Existing logic (untouched) ────────────────────────────
  const handleRegisterUser = async () => {
    if (!formData.name.trim()) {
      alert("Please enter a name");
      return;
    }
    if (!formData.age || formData.age < 1) {
      alert("Please enter a valid age");
      return;
    }

    const response = await registerUser({
      defaultProfileName: formData.name,
      defaultProfileAge: parseInt(formData.age),
      defaultProfileLevel: formData.readingLevel,
    });

    const userAccount = await setLoginUserAccount(response.userAccount);
    const defaultProfile = userAccount.profiles[0];
    console.log(
      "USER ACCOUNT default PROFILES: " + JSON.stringify(defaultProfile),
    );
    if (defaultProfile) {
      setShowModal(false);
      router.replace("/categories");
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Logo / Bird — flies upward on exit ── */}
      <Animated.Image
        source={require("../assets/img/story-time-logo-2.png")}
        style={[
          styles.logo,
          {
            opacity: logoOp,
            transform: [{ scale: logoScale }, { translateY: logoY }],
          },
        ]}
        resizeMode="contain"
      />

      {/* ── Animated title ── */}
      <View style={styles.titleRow}>
        {/* "Wing" — each letter different color, slides in from left */}
        <Animated.View
          style={[
            styles.wordGroup,
            { opacity: wingOp, transform: [{ translateX: wingX }] },
          ]}
        >
          <Text style={[styles.letter, { color: "#FF7043" }]}>S</Text>
          <Text style={[styles.letter, { color: "#FFD54F" }]}>t</Text>
          <Text style={[styles.letter, { color: "#29B6F6" }]}>o</Text>
          <Text style={[styles.letter, { color: "#66BB6A" }]}>r</Text>
          <Text style={[styles.letter, { color: "#FF7043" }]}>y</Text>
        </Animated.View>

        {/* "Word" — each letter different color, slides in from right */}
        <Animated.View
          style={[
            styles.wordGroup,
            { opacity: wordOp, transform: [{ translateX: wordX }] },
          ]}
        >
          <Text style={[styles.letter, { color: "#AB47BC" }]}>T</Text>
          <Text style={[styles.letter, { color: "#FF7043" }]}>i</Text>
          <Text style={[styles.letter, { color: "#29B6F6" }]}>m</Text>
          <Text style={[styles.letter, { color: "#FFD54F" }]}>e</Text>
        </Animated.View>
      </View>

      {/* ── First Time User Modal (untouched) ── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showModal}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.welcomeTitle}>Welcome! 🎉</Text>
            <Text style={styles.welcomeSubtitle}>
              Let's create your reading profile
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What's your name?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>How old are you?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your age"
                  keyboardType="numeric"
                  value={formData.age}
                  onChangeText={(text) =>
                    setFormData({ ...formData, age: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Choose your reading level</Text>
                <View style={styles.levelButtons}>
                  {readingLevels.map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.levelButton,
                        formData.readingLevel === level &&
                          styles.levelButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, readingLevel: level })
                      }
                    >
                      <Text
                        style={[
                          styles.levelButtonText,
                          formData.readingLevel === level &&
                            styles.levelButtonTextActive,
                        ]}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleRegisterUser}
            >
              <Text style={styles.startButtonText}>Start Reading! 📚</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SplashScreen;

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
  },

  // ── Logo ────────────────────────────────────────────────────
  logo: {
    width: width * 0.55,
    height: width * 0.55,
    marginBottom: 4,
  },

  // ── Animated title ──────────────────────────────────────────
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 0,
  },
  wordGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  letter: {
    fontSize: 52,
    fontWeight: "900",
    fontFamily:
      Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
    // Thick white outline effect via layered shadow
    //  textShadowColor: "rgba(255,255,255,0.95)",
    // textShadowOffset: { width: 0, height: 0 },
    // textShadowRadius: 6,
    // Slight drop shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
    letterSpacing: 1,
    includeFontPadding: false,
  },

  // ── Modal (untouched styles) ────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#9652D9",
    textAlign: "center",
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  levelButtons: { flexDirection: "row", gap: 10 },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  levelButtonActive: {
    backgroundColor: "#9652D9",
    borderColor: "#9652D9",
  },
  levelButtonText: { fontSize: 14, fontWeight: "600", color: "#666" },
  levelButtonTextActive: { color: "#fff" },
  startButton: {
    backgroundColor: "#FF6B9D",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: "#FF6B9D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
});
