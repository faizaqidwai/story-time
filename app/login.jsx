import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "./_contexts/UserContext";
import { useApiCall } from "./_hooks/useApiCall";
import { COLORS, SHADOWS, FONTS } from "./theme";
import {
  loginWithPrimaryAccount,
  loginWithEmail,
  fetchUserAccount,
} from "./services/authService";
import { saveAccessToken } from "./services/tokenStorage";

const Login = () => {
  const router = useRouter();
  const { execute } = useApiCall();
  const { setLoginUserAccount } = useUser();
  const { clearAllData } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── All logic untouched ───────────────────────────────────
  useEffect(() => {
    clearAllData();
  }, []);

  const handlePrimaryLogin = async () => {
    setIsLoading(true);
    await execute(
      async () => {
        const loginResponse = await loginWithPrimaryAccount();
        await saveAccessToken(loginResponse.token);
        const userAccount = await fetchUserAccount();
        await setLoginUserAccount(userAccount);
      },
      {
        successDisplay: "toast",
        successMessage: "Login Successful",
        errorDisplay: "toast",
        onSuccess: () => router.replace("/home"),
        onError: (err) => setIsLoading(false),
      },
    );
    setIsLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }
    try {
      setIsLoading(true);
      const loginResponse = await loginWithEmail(email, password);
      await saveAccessToken(loginResponse.token);
      const userAccount = await fetchUserAccount();
      await setLoginUserAccount(userAccount);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Error", "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Same background as IntroCarousel / AccountChoice — no dots */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button — same style as AccountChoice */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/AccountChoice")}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Bird ── */}
            <Image
              source={require("../assets/img/story-time-logo-4.png")}
              style={styles.bird}
              resizeMode="contain"
            />

            {/* ── Title ── */}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your journey
            </Text>

            {/* ── Primary Account Login ── */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handlePrimaryLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#08081a" />
              ) : (
                <>
                  <Text style={styles.primaryButtonIcon}>🔑</Text>
                  <Text style={styles.primaryButtonText}>
                    Login with Primary Account
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Divider ── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Email / Password card ── */}
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                onPress={handleEmailLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#08081a" />
                ) : (
                  <Text style={styles.loginButtonText}>Login ➜</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default Login;

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Background — same as IntroCarousel / AccountChoice ───
  root: { flex: 1, backgroundColor: "#08081a" },
  glowTL: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  glowBR: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(150,82,217,0.07)",
  },

  // ── Back button — same as AccountChoice ──────────────────
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    left: 20,
    zIndex: 20,
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

  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // ── Bird ─────────────────────────────────────────────────
  bird: { width: 150, height: 150, marginBottom: 15 },

  // ── Title ────────────────────────────────────────────────
  title: {
    fontFamily: FONTS.bold,
    fontSize: 38,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  // ── Primary button — teal (was purple) ───────────────────
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.teal,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.6)",
    ...SHADOWS.tealGlow,
  },
  primaryButtonIcon: { fontSize: 18 },
  primaryButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#08081a",
    letterSpacing: 0.3,
  },

  // ── Divider ───────────────────────────────────────────────
  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderTeal },
  dividerText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },

  // ── Form card ─────────────────────────────────────────────
  formCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
    padding: 20,
    gap: 4,
    ...SHADOWS.tealGlow,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 12,
    padding: 14,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
  },

  // ── Login button — teal ───────────────────────────────────
  loginButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    ...SHADOWS.tealGlow,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#08081a",
    letterSpacing: 0.4,
  },

  buttonDisabled: { opacity: 0.6 },
});
