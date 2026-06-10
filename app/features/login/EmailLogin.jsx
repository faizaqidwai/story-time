// app/features/login/EmailLogin.jsx
//
// BRAND UPDATE — feature/brand-guidelines-v2
//   ✅ loginButton borderRadius: 14 → RADIUS.btn (50) — §3.7 pill rule
//   ✅ Logo section: added storytime-title-bg.png wordmark below icon
//   ✅ titleImage sized with explicit height from 4.5:1 aspect ratio
//   ✅ Input icon colour: COLORS.glowCyanBtn → COLORS.primary (cyan)
//      glowCyanBtn is a border-glow value, not an icon tint
//   ✅ Back button bg hardcode → COLORS.glowCyan from theme
//   ✅ Title textShadowColor hardcode → COLORS.borderBold from theme
//   ✅ buttonDisabled opacity → COLORS.disabledOpacity (0.4) from theme
//
// UNCHANGED:
//   ✅ All navigation, API, auth, form logic
//   ✅ All layout and sizing

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
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
import { COLORS, SHADOWS, FONTS, RADIUS } from "../../theme";
import { loginWithEmail, fetchUserAccount } from "../../services/authService";
import { useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";

const EmailLogin = () => {
  const router = useRouter();
  const { execute } = useApiCall();
  const { setLoginUserAccount } = useUser();
  const insets = useSafeAreaInsets();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);

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
        errorDisplay:   "toast",
        onSuccess: () => {
          router.dismissAll();
          setTimeout(() => router.replace("/features/home"), 0);
        },
        onError: () => setIsLoading(false),
      },
    );
    setIsLoading(false);
  };

  const headerPaddingTop = Math.max(insets.top, 8);

  // ── Logo sizing — matches welcome back screen ─────────────────
  const LOGO_SIZE       = 90;
  const TITLE_IMG_WIDTH = LOGO_SIZE * 2.2;
  const TITLE_IMG_HEIGHT = TITLE_IMG_WIDTH / 4.5;   // explicit height — no layout gap

  return (
    <View style={styles.root}>
      {/* Ambient glows */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button */}
      {!showCreateAccount && (
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
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
          {/* ── Logo block — icon + wordmark ──────────────────── */}
          <View style={styles.logoBlock}>
            <ExpoImage
              source={require("../../../assets/img/storytime-logo.png")}
              style={[styles.logo, { width: LOGO_SIZE, height: LOGO_SIZE }]}
              contentFit="contain"
            />
            {/* ✅ Brand wordmark — consistent with splash + welcome screens */}
            <ExpoImage
              source={require("../../../assets/img/storytime-title-bg.png")}
              style={{
                width:  TITLE_IMG_WIDTH,
                height: TITLE_IMG_HEIGHT,   // ✅ explicit — prevents unknown-height gap
              }}
              contentFit="contain"
            />
          </View>

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
                  color={COLORS.primary}             // ✅ was COLORS.glowCyanBtn (wrong token)
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
                  color={COLORS.primary}             // ✅ was COLORS.glowCyanBtn (wrong token)
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

            {/* ── Login button — §3.7 pill radius ───────────── */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && { opacity: COLORS.disabledOpacity },  // ✅ 0.4 from theme
              ]}
              onPress={handleEmailLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <Text style={styles.loginButtonText}>Login ›</Text>
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
  // ── Root ──────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: COLORS.background,    // #0A1628
  },

  // ── Ambient glows ─────────────────────────────────────────────
  glowTL: {
    position: "absolute",
    top: -60, left: -60,
    width: 280, height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.glowCyan,      // ✅ from theme
  },
  glowBR: {
    position: "absolute",
    bottom: -40, right: -40,
    width: 240, height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.glowPurple,    // ✅ from theme
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.glowCyan,     // ✅ was hardcoded rgba(0,196,204,0.08)
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { flex: 1 },

  // ── Scroll content ────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },

  // ── Logo block — icon + wordmark stacked ──────────────────────
  logoBlock: {
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  logo: {
    borderRadius: RADIUS.appIcon,          // 22 — §3.7 app icon radius
  },

  // ── Title ─────────────────────────────────────────────────────
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
    textShadowColor:  COLORS.borderBold,   // ✅ was hardcoded rgba
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

  // ── Form card — §5.4 feature card spec ────────────────────────
  formCard: {
    width: "100%",
    backgroundColor: COLORS.surfaceCard,   // rgba(255,255,255,0.04)
    borderRadius:    RADIUS.card,          // 20 — §3.7 feature card
    borderWidth: 1.5,
    borderColor: COLORS.borderPrimary,     // rgba(0,196,204,0.25)
    padding: 20,
    gap: 4,
    ...SHADOWS.primaryGlow,
  },

  inputGroup: { marginBottom: 16 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },

  // ── Input ─────────────────────────────────────────────────────
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceDim,    // rgba(255,255,255,0.06)
    borderRadius: RADIUS.md,              // 12
    borderWidth: 1.5,
    borderColor: COLORS.borderPrimary,
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

  // ── Login button — §3.7 RADIUS.btn = 50 (pill) ───────────────
  loginButton: {
    backgroundColor: COLORS.primary,       // #00C4CC brand cyan
    borderRadius:    RADIUS.btn,           // ✅ 50 — was 14 ❌
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    ...SHADOWS.primaryGlow,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textOnPrimary,           // navy on cyan §5.3
    letterSpacing: 0.4,
  },

  // ── Back to options ───────────────────────────────────────────
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
});
