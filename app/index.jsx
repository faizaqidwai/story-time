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
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { useUser } from "./_contexts/UserContext";
import { fetchRegisterToken, registerUser } from "./services/authService";
import { clearPrimaryUser } from "./services/identityStorage";

const { width } = Dimensions.get("window");

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

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    readingLevel: "EARLY",
  });

  const readingLevels = ["EARLY", "MIDDLE", "ADVANCED"];

  useEffect(() => {
    // Todo remove this line later
    // clearAllData();
    // clearPrimaryUser();

    // Play fairy glitter sound
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

    // Slowly fade in and scale up Story Time logo
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

    // Make sparkle appear once
    Animated.timing(sparkleOpacity, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    // Check if first time user after splash animation
    const timer = setTimeout(async () => {
      if (!isLoading) {
        if (isFirstTime) {
          await fetchRegisterToken();
          setShowModal(true);
        } else {
          if (isLogout) {
            router.replace("/login");
          } else {
            router.replace("/categories");
          }
        }
      }
    }, 5000);
    // Show modal after 5 seconds instead of navigating

    return () => clearTimeout(timer);
  }, [isLoading, isFirstTime]);

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
      //await selectProfile(defaultProfile);
      setShowModal(false);
      router.replace("/categories");
    }
  };

  return (
    <View style={styles.container}>
      {/* ✨ Sparkle appears once */}
      <Animated.Image
        source={require("../assets/img/sparkle.png")}
        style={[
          styles.sparkle,
          {
            opacity: sparkleOpacity,
          },
        ]}
      />

      {/* 📖 Story Time Logo slowly emerges */}
      <Animated.Image
        source={require("../assets/img/story time-new.png")}
        style={[
          styles.logo,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />

      {/* First Time User Modal */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F2FA",
  },
  logo: {
    width: width * 0.7,
    height: width * 0.7,
  },
  sparkle: {
    position: "absolute",
    top: "30%",
    width: 120,
    height: 120,
  },

  // Modal Styles
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
  inputGroup: {
    marginBottom: 20,
  },
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
  levelButtons: {
    flexDirection: "row",
    gap: 10,
  },
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
  levelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  levelButtonTextActive: {
    color: "#fff",
  },
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
