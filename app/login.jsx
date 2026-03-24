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
import AppBackground from "./components/AppBackground";
import { COLORS, SHADOWS } from "./theme";
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
    <AppBackground>
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
              source={require("../assets/img/bird_wave.gif")}
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
                <ActivityIndicator color="#fff" />
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Login ➜</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
};

export default Login;

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // ── Bird ─────────────────────────────────────────────────
  bird: {
    width: 220,
    height: 220,
    marginBottom: -28,
  },

  // ── Title ────────────────────────────────────────────────
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  // ── Primary button ────────────────────────────────────────
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.purple,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "rgba(150,82,217,0.6)",
    ...SHADOWS.card,
  },
  primaryButtonIcon: {
    fontSize: 18,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderTeal,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
  },

  // ── Login button ──────────────────────────────────────────
  loginButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    ...SHADOWS.tealGlow,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});
