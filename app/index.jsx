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
import { FONTS } from "./theme";
import { useTheme } from "./_contexts/ThemeContext";

const { width, height } = Dimensions.get("window");

const SplashScreen = () => {
  const router = useRouter();
  const { sizes } = useTheme();
  const sz = sizes.splash;

  const {
    isFirstTime,
    addProfile,
    selectProfile,
    isLoading,
    isLogout,
    setLoginUserAccount,
    clearAllData,
  } = useUser();

  // ── Logo animations ───────────────────────────────────────
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;

  // ── Text stagger animations ───────────────────────────────
  const titleOp = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(12)).current;
  const sub1Op = useRef(new Animated.Value(0)).current;
  const sub1Y = useRef(new Animated.Value(10)).current;
  const sub2Op = useRef(new Animated.Value(0)).current;
  const sub2Y = useRef(new Animated.Value(10)).current;

  // ── Kept for existing logic compatibility ─────────────────
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const wingX = useRef(new Animated.Value(0)).current;
  const wordX = useRef(new Animated.Value(0)).current;
  const wingOp = useRef(new Animated.Value(0)).current;
  const wordOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(0)).current;

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

    // ── 1. Logo fades + scales in ────────────────────────────
    Animated.parallel([
      Animated.timing(logoOp, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // ── 2. Title fades up after logo settles ─────────────
      Animated.parallel([
        Animated.timing(titleOp, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // ── 3. Sub-text 1 ────────────────────────────────
        Animated.parallel([
          Animated.timing(sub1Op, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(sub1Y, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // ── 4. Sub-text 2 ──────────────────────────────
          Animated.parallel([
            Animated.timing(sub2Op, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(sub2Y, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
    });

    // ── Existing logic untouched ──────────────────────────────
    const playSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/splashScreen/fairy-glitter.wav"),
          { volume: 0.4 },
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
      clearTimeout(timer);
    };
  }, [isLoading, isFirstTime]);

  // ── Existing logic untouched ──────────────────────────────
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

  const logoSize = width * sz.logoSizeRatio;

  return (
    <View style={styles.container}>
      {/* ── Background glow circles — same as IntroCarousel ── */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* ── Logo ── */}
      <Animated.Image
        source={require("../assets/img/story-time-logo-4.png")}
        style={[
          styles.logo,
          {
            width: logoSize,
            height: logoSize,
            opacity: logoOp,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
      />

      {/* ── Main title ── */}
      <Animated.Text
        style={[
          styles.title,
          {
            fontSize: sz.titleFontSize,
            opacity: titleOp,
            transform: [{ translateY: titleY }],
          },
        ]}
      >
        Story Time
      </Animated.Text>

      {/* ── Sub-text 1 ── */}
      <Animated.Text
        style={[
          styles.sub1,
          {
            fontSize: sz.sub1FontSize,
            opacity: sub1Op,
            transform: [{ translateY: sub1Y }],
          },
        ]}
      >
        A kids learning App
      </Animated.Text>

      {/* ── Sub-text 2 ── */}
      <Animated.Text
        style={[
          styles.sub2,
          {
            fontSize: sz.sub2FontSize,
            opacity: sub2Op,
            transform: [{ translateY: sub2Y }],
          },
        ]}
      >
        From Codklusters Education
      </Animated.Text>

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
// Font sizes for the splash screen are applied inline via sz.*
// so they respond to the loaded device theme.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#08081a",
    overflow: "hidden",
  },

  // ── Background glow circles — same as IntroCarousel / AccountChoice ──
  glowTL: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  glowBR: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(150,82,217,0.07)",
  },

  // ── Logo — width/height applied inline from sz ───────────────
  logo: {
    border: 1,
    borderRadius: 3,
  },

  // ── Main title — fontSize applied inline from sz ─────────────
  title: {
    fontFamily:
      Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
    fontWeight: "900",
    color: "#00BCD4",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0,188,212,0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginBottom: 10,
  },

  // ── Sub-text 1 — fontSize applied inline from sz ─────────────
  sub1: {
    fontFamily: FONTS.light,
    color: "#B2EBF2",
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  // ── Sub-text 2 — fontSize applied inline from sz ─────────────
  sub2: {
    fontFamily: FONTS.light,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 0.8,
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
