// app/features/login/login.jsx  —  "Welcome Back" screen
//
// BRAND UPDATE — feature/brand-guidelines-v2
//   ✅ primaryButton borderRadius: 16 → RADIUS.btn (50) — §3.7 pill rule
//   ✅ Title textShadowColor hardcode → COLORS.borderBold
//   ✅ Logo section: added storytime-title-bg.png wordmark below icon
//   ✅ titleImage sized correctly with aspectRatio 4.5 (same as splash)
//
// UNCHANGED:
//   ✅ All navigation, API, auth logic
//   ✅ All sizing tokens (sz.*)
//   ✅ All colours already correct from previous hotfix

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "../../_contexts/UserContext";
import { useApiCall } from "../../_hooks/useApiCall";
import { COLORS, SHADOWS, FONTS, RADIUS } from "../../theme";
import {
  loginWithPrimaryAccount,
  fetchUserAccount,
} from "../../services/authService";
import { useTheme } from "../../_contexts/ThemeContext";
import { pad } from "../../theme/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";

const Login = () => {
  const router = useRouter();
  const { execute } = useApiCall();
  const { setLoginUserAccount, userAccount } = useUser();
  const { sizes } = useTheme();
  const sz = sizes.login;

  const [isLoading, setIsLoading]     = useState(false);
  const [primaryName, setPrimaryName] = useState("");

  const handlePrimaryLogin = async () => {
    setIsLoading(true);
    await execute(
      async () => {
        const loginResponse = await loginWithPrimaryAccount();
        if (!loginResponse) return;
        const account      = await fetchUserAccount();
        const name         = account?.profiles?.[0]?.name ?? "";
        await AsyncStorage.setItem("@primary_account_name", name);
        await setLoginUserAccount(account);
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

  useEffect(() => {
    AsyncStorage.getItem("@primary_account_name").then((name) => {
      if (name) setPrimaryName(name.split(" ")[0]);
    });
  }, []);

  return (
    <View style={styles.root}>
      {/* Ambient glows */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo block — icon + wordmark (matches splash) ──── */}
          <View style={[styles.logoBlock, { marginBottom: sz.birdMarginBottom }]}>
            <ExpoImage
              source={require("../../../assets/img/storytime-logo.png")}
              style={[
                styles.logo,
                {
                  width:  sz.birdSize,
                  height: sz.birdSize,
                },
              ]}
              contentFit="contain"
            />
            {/* ✅ Brand wordmark — same image as splash screen */}
            <ExpoImage
              source={require("../../../assets/img/storytime-title-bg.png")}
              style={[
                styles.titleImage,
                {
                  width:  sz.birdSize * 2.2,
                  // ✅ explicit height from 4.5:1 aspect ratio — prevents layout gap
                  height: (sz.birdSize * 2.2) / 4.5,
                },
              ]}
              contentFit="contain"
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontSize: sz.titleFontSize, marginTop: 20 }]}>
            Welcome Back{primaryName ? ` ${primaryName}` : ""}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { fontSize: sz.subtitleFontSize, marginBottom: 24 },
            ]}
          >
            Press start to continue your journey
          </Text>

          {/* ── Primary button — §3.7 pill radius ──────────────── */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { paddingVertical: sz.primaryBtnPaddingV, marginBottom: 16 },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handlePrimaryLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <Text
                style={[
                  styles.primaryButtonText,
                  { fontSize: sz.primaryBtnFontSize },
                ]}
              >
                Start
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontSize: sz.dividerFontSize }]}>
              OR
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login with different account */}
          <TouchableOpacity
            style={styles.altLoginBtn}
            onPress={() => router.push("/features/login/EmailLogin")}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            <View style={styles.altLoginTextCol}>
              <Text style={styles.altLoginSubtitle}>
                Login with different account
              </Text>
            </View>
            <Text style={styles.altLoginArrow}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Login;

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
    backgroundColor: COLORS.glowCyan,
  },
  glowBR: {
    position: "absolute",
    bottom: -40, right: -40,
    width: 240, height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.glowPurple,
  },

  // ── Layout ────────────────────────────────────────────────────
  safeArea:      { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    marginTop: "20%",          // reduced from 30% — content starts higher
    paddingHorizontal: 24,
  },

  // ── Logo block ────────────────────────────────────────────────
  // icon + wordmark stacked with tight gap, centred as one unit
  // ✅ NO sz reference here — StyleSheet.create() runs at module
  //    load time before the component mounts, so sz is undefined.
  //    marginBottom is applied inline in JSX using sz.birdMarginBottom
  logoBlock: {
    alignItems: "center",
    gap: 10,
  },
  logo: {
    borderRadius: RADIUS.appIcon,          // 22 — brand app icon radius §3.7
  },
  titleImage: {
    // width + height both computed inline from sz.birdSize
    // aspectRatio 4.5 applied via explicit height — prevents layout gap
  },

  // ── Title ─────────────────────────────────────────────────────
  title: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,           // tight gap to subtitle below
    textShadowColor:  COLORS.borderBold,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: FONTS.light,
    color:      COLORS.textMuted,
    textAlign:  "center",
    letterSpacing: 0.3,
    // marginBottom applied inline in JSX — controlled per screen
  },

  // ── Primary button — §3.7 RADIUS.btn = 50 (pill) ─────────────
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.primary,       // #00C4CC brand cyan
    borderRadius:    RADIUS.btn,           // ✅ 50 — was 16 ❌
    borderWidth: 1.5,
    borderColor: COLORS.glowCyanBtn,
    ...SHADOWS.primaryGlow,
  },
  primaryButtonText: {
    fontFamily: FONTS.bold,
    color:      COLORS.textOnPrimary,      // navy on cyan §5.3
    letterSpacing: 0.3,
  },

  // ── Divider ───────────────────────────────────────────────────
  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: COLORS.borderPrimary,
  },
  dividerText: {
    fontFamily:    FONTS.regular,
    color:         COLORS.textMuted,
    letterSpacing: 1,
    paddingHorizontal: 12,
  },

  // ── "Login with different account" row ────────────────────────
  altLoginBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderColor: COLORS.borderPrimary,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  altLoginTextCol: {},
  altLoginSubtitle: {
    fontFamily: FONTS.light,
    fontSize: 15,
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  altLoginArrow: {
    fontSize: 22,
    color: COLORS.primary,   // ✅ was FONTS.bold — wrong type (string not colour)
    fontFamily: FONTS.bold,
    flexShrink: 0,
  },

  buttonDisabled: { opacity: COLORS.disabledOpacity },  // ✅ 0.4 from theme
});
