// app/EmailLogin.jsx

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
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "../../_contexts/UserContext";
import { useApiCall } from "../../_hooks/useApiCall";
import { COLORS, SHADOWS, FONTS } from "../../theme";
import { loginWithEmail, fetchUserAccount } from "../../services/authService";
import { useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";
const TEAL = "#00BCD4";

const EmailLogin = () => {
  const router = useRouter();
  const { execute } = useApiCall();
  const { setLoginUserAccount } = useUser();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { from } = useLocalSearchParams();
  const showCreateAccount = from === "accountChoice";

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }
    setIsLoading(true);
    await execute(
      async () => {
        const loginResponse = await loginWithEmail(email, password);
        if (!loginResponse) return;
        const userAccount = await fetchUserAccount();
        await setLoginUserAccount(userAccount);
      },
      {
        successDisplay: "toast",
        successMessage: "Login Successful",
        errorDisplay: "toast",
        onSuccess: () => {
          // router.dismissAll();
          setTimeout(() => router.replace("/feature/home"), 0);
        },
        onError: () => setIsLoading(false),
      },
    );
    setIsLoading(false);
  };

  const headerPaddingTop = Math.max(insets.top, 8);

  return (
    <View style={styles.root}>
      {/* Background glows */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Custom header — back button */}
      {!showCreateAccount && (
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={TEAL} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
      )}

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
          {/* Logo */}
          <ExpoImage
            source={require("../../../assets/img/story-time-logo-4.png")}
            style={styles.logo}
            contentFit="contain"
          />

          {/* Title */}
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            Enter your email and password to continue
          </Text>

          {/* Form card */}
          <View style={styles.formCard}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="rgba(0,188,212,0.6)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="rgba(0,188,212,0.6)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((p) => !p)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login button */}
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

          {/* Back to options */}
          {showCreateAccount && (
            <TouchableOpacity
              style={styles.backToOptions}
              onPress={() => router.replace("/AccountChoice")}
              activeOpacity={0.7}
            >
              <Text style={styles.backToOptionsText}>← Create new account</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default EmailLogin;

const styles = StyleSheet.create({
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

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { flex: 1 },

  // ── Scroll content ────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },

  // ── Logo ──────────────────────────────────────────────────
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },

  // ── Title ─────────────────────────────────────────────────
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: FONTS.light,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: 28,
  },

  // ── Form card ─────────────────────────────────────────────
  formCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.2)",
    padding: 20,
    gap: 4,
    ...SHADOWS.tealGlow,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },

  // ── Input with icon ───────────────────────────────────────
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.25)",
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8, flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 13,
  },
  eyeBtn: { paddingLeft: 8, flexShrink: 0 },

  // ── Login button ──────────────────────────────────────────
  loginButton: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    ...SHADOWS.tealGlow,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#08081a",
    letterSpacing: 0.4,
  },

  // ── Back to options ───────────────────────────────────────
  backToOptions: {
    marginTop: 20,
    paddingVertical: 8,
  },
  backToOptionsText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },

  buttonDisabled: { opacity: 0.6 },
});
