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
import { useTheme } from "./_contexts/ThemeContext";

const Login = () => {
  const router = useRouter();
  const { execute } = useApiCall();
  const { setLoginUserAccount } = useUser();
  const { clearAllData } = useUser();
  const { sizes } = useTheme();
  const sz = sizes.login;

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
        // loginWithPrimaryAccount() in authService.js already saves both
        // access token and refresh token — nothing extra needed here.
        if (!loginResponse) return;
        const userAccount = await fetchUserAccount();
        await setLoginUserAccount(userAccount);
      },
      {
        successDisplay: "toast",
        successMessage: "Login Successful",
        errorDisplay: "toast",
        onSuccess: () => router.replace("/home"),
        onError: () => setIsLoading(false),
      },
    );
    setIsLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }
    setIsLoading(true);
    await execute(
      async () => {
        const loginResponse = await loginWithEmail(email, password);
        // loginWithEmail() in authService.js already saves both tokens.
        if (!loginResponse) return;
        const userAccount = await fetchUserAccount();
        await setLoginUserAccount(userAccount);
      },
      {
        successDisplay: "toast",
        successMessage: "Login Successful",
        errorDisplay: "toast",
        onSuccess: () => router.replace("/home"),
        onError: () => setIsLoading(false),
      },
    );
    setIsLoading(false);
  };

  return (
    <View style={styles.root}>
      {/* Same background as IntroCarousel / AccountChoice — no dots */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button — same style as AccountChoice */}
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
        <Text style={[styles.backIcon, { fontSize: sz.backIconFontSize }]}>
          ‹
        </Text>
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
              style={[
                styles.bird,
                {
                  width: sz.birdSize,
                  height: sz.birdSize,
                  marginBottom: sz.birdMarginBottom,
                },
              ]}
              resizeMode="contain"
            />

            {/* ── Title ── */}
            <Text style={[styles.title, { fontSize: sz.titleFontSize }]}>
              Welcome Back
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: sz.subtitleFontSize,
                  marginBottom: sz.subtitleMarginBottom,
                },
              ]}
            >
              Sign in to continue your journey
            </Text>

            {/* ── Primary Account Login ── */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  paddingVertical: sz.primaryBtnPaddingV,
                  marginBottom: sz.primaryBtnMarginBottom,
                },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handlePrimaryLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#08081a" />
              ) : (
                <>
                  <Text
                    style={[
                      styles.primaryButtonIcon,
                      { fontSize: sz.primaryBtnIconSize },
                    ]}
                  >
                    🔑
                  </Text>
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { fontSize: sz.primaryBtnFontSize },
                    ]}
                  >
                    Login with Primary Account
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Divider ── */}
            <View
              style={[
                styles.dividerRow,
                { marginBottom: sz.dividerMarginBottom },
              ]}
            >
              <View style={styles.dividerLine} />
              <Text
                style={[styles.dividerText, { fontSize: sz.dividerFontSize }]}
              >
                OR
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Email / Password card ── */}
            <View style={[styles.formCard, { padding: sz.formCardPadding }]}>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    {
                      fontSize: sz.labelFontSize,
                      marginBottom: sz.labelMarginBottom,
                    },
                  ]}
                >
                  Email
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontSize: sz.inputFontSize, padding: sz.inputPadding },
                  ]}
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
                <Text
                  style={[
                    styles.label,
                    {
                      fontSize: sz.labelFontSize,
                      marginBottom: sz.labelMarginBottom,
                    },
                  ]}
                >
                  Password
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontSize: sz.inputFontSize, padding: sz.inputPadding },
                  ]}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  { paddingVertical: sz.loginBtnPaddingV },
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleEmailLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#08081a" />
                ) : (
                  <Text
                    style={[
                      styles.loginButtonText,
                      { fontSize: sz.loginBtnFontSize },
                    ]}
                  >
                    Login ➜
                  </Text>
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
// All font sizes and key dimensions are applied inline from sz.*
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

  // ── Back button — size/radius applied inline from sz ─────
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#E0F7FA", marginTop: -2 },

  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // ── Bird — width/height/marginBottom applied inline ──────
  bird: { resizeMode: "contain" },

  // ── Title — fontSize applied inline from sz ──────────────
  title: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: FONTS.light,
    color: COLORS.textMuted,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // ── Primary button — paddingV/marginBottom applied inline ─
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.teal,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.6)",
    ...SHADOWS.tealGlow,
  },
  primaryButtonIcon: {},
  primaryButtonText: {
    fontFamily: FONTS.bold,
    color: "#08081a",
    letterSpacing: 0.3,
  },

  // ── Divider ───────────────────────────────────────────────
  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderTeal },
  dividerText: {
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },

  // ── Form card — padding applied inline from sz ────────────
  formCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
    gap: 4,
    ...SHADOWS.tealGlow,
  },
  inputGroup: { marginBottom: 16 },

  // ── Label — fontSize/marginBottom applied inline from sz ──
  label: {
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },

  // ── Input — fontSize/padding applied inline from sz ───────
  input: {
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 12,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
  },

  // ── Login button — paddingV applied inline from sz ────────
  loginButton: {
    backgroundColor: COLORS.teal,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    ...SHADOWS.tealGlow,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    color: "#08081a",
    letterSpacing: 0.4,
  },

  buttonDisabled: { opacity: 0.6 },
});
