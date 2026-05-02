import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "../../_contexts/UserContext";
import { useApiCall } from "../../_hooks/useApiCall";
import { COLORS, SHADOWS, FONTS } from "../../theme";
import {
  loginWithPrimaryAccount,
  fetchUserAccount,
} from "../../services/authService";
import { useTheme } from "../../_contexts/ThemeContext";
import { font, pad, radius, size } from "../../theme/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { Image as ExpoImage } from "expo-image";

const Login = () => {
  const router = useRouter();
  const { execute } = useApiCall();
  const { setLoginUserAccount, userAccount } = useUser();
  const { sizes } = useTheme();
  const sz = sizes.login;

  const [isLoading, setIsLoading] = useState(false);
  const [primaryName, setPrimaryName] = useState("");

  const handlePrimaryLogin = async () => {
    setIsLoading(true);
    await execute(
      async () => {
        const loginResponse = await loginWithPrimaryAccount();
        if (!loginResponse) return;
        const userAccount = await fetchUserAccount();
        const primaryName = userAccount?.profiles?.[0]?.name ?? "";
        await AsyncStorage.setItem("@primary_account_name", primaryName);
        await setLoginUserAccount(userAccount);
        await setLoginUserAccount(userAccount);
      },
      {
        successDisplay: "toast",
        successMessage: "Login Successful",
        errorDisplay: "toast",
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

  // Get first name from userAccount
  const firstName = userAccount?.name?.split(" ")[0] ?? "";

  return (
    <View style={styles.root}>
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <ExpoImage
            source={require("../../../assets/img/story-time-logo-4.png")}
            style={[
              styles.bird,
              {
                width: sz.birdSize,
                height: sz.birdSize,
                marginBottom: sz.birdMarginBottom,
              },
            ]}
            contentFit="contain"
          />

          {/* Title */}

          <Text style={[styles.title, { fontSize: sz.titleFontSize }]}>
            Welcome Back {primaryName ? ` ${primaryName}` : ""}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                fontSize: sz.subtitleFontSize,
                marginBottom: pad.xxxxl,
              },
            ]}
          >
            Press start to continue your journey
          </Text>

          {/* Primary / Guest Login */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                paddingVertical: sz.primaryBtnPaddingV,
                marginBottom: 16,
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
          <View style={[styles.dividerRow, {}]}>
            <View style={styles.dividerLine} />
            <Text
              style={[styles.dividerText, { fontSize: sz.dividerFontSize }]}
            >
              OR
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Login Button */}
          <TouchableOpacity
            style={styles.emailLoginBtn}
            onPress={() => router.push("/features/login/EmailLogin")}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {/* <View style={styles.emailIconBox}>
              <Text style={styles.emailIcon}>✉️</Text>
            </View> */}
            <View style={styles.emailLoginTextCol}>
              {/* <Text style={styles.emailLoginTitle}>Continue with Email</Text> */}
              <Text style={styles.emailLoginSubtitle}>
                Login with different account
              </Text>
            </View>
            <Text style={styles.emailLoginArrow}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Login;

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
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    //justifyContent: "center",
    marginTop: "30%",
    paddingHorizontal: 24,
    // paddingVertical: 32,
  },
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

  bird: { resizeMode: "contain" },
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
  primaryButtonText: {
    fontFamily: FONTS.bold,
    color: "#08081a",
    letterSpacing: 0.3,
  },
  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    // gap: 12,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: COLORS.borderTeal },
  dividerText: {
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },

  // ── Email login button ────────────────────────────────────
  emailLoginBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    // backgroundColor: "rgba(255,255,255,0.05)",
    // borderRadius: 16,
    //  borderWidth: 1.5,
    borderColor: "rgba(0,188,212,0.3)",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  emailIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,188,212,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emailIcon: { fontSize: 20 },
  emailLoginTextCol: {},
  emailLoginTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  emailLoginSubtitle: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: COLORS.teal,
    letterSpacing: 0.2,
  },
  emailLoginArrow: {
    fontSize: 22,
    color: COLORS.teal,
    fontFamily: FONTS.bold,
    flexShrink: 0,
  },
  buttonDisabled: { opacity: 0.6 },
});
