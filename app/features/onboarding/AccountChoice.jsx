// app/AccountChoice.jsx
//
// CHANGES FROM ORIGINAL:
//   ✅ fetchRegisterToken() moved here from SplashScreen (index.jsx)
//      It now fires ONLY when user taps "Create New Account"
//      This prevents app from getting stuck on splash when offline
//   ✅ "Create New Account" button shows loading indicator while fetching token
//   ✅ If token fetch fails (no internet) — shows Alert, stays on this screen
//   ✅ All animation logic, sounds, router calls unchanged
//   ✅ router.replace("/OnboardingScreen") — unchanged, no stack buildup

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../../theme";
import { Audio } from "expo-av";
import { useTheme } from "../../_contexts/ThemeContext";
import { font, pad, radius, size } from "../../theme/tokens";
import { fetchRegisterToken } from "../../services/authService"; // ← MOVED HERE

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "#08081a",
  surface: "#111830",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  yellow: "#FFD54F",
  textPri: "#E0F7FA",
  textSec: "#B2EBF2",
  textMuted: "#7a9aaa",
};

async function playSound(file) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(file);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (_) {}
}

export default function AccountChoice() {
  const router = useRouter();
  const { sizes } = useTheme();
  const sz = sizes.accountChoice;

  // ── NEW: loading state for register token fetch ───────────────────────────
  const [fetchingToken, setFetchingToken] = useState(false);

  // Entrance animations — unchanged
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(30)).current;
  const card1Op = useRef(new Animated.Value(0)).current;
  const card1Y = useRef(new Animated.Value(40)).current;
  const card2Op = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(40)).current;
  const dividerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    playSound(require("../../../assets/sounds/fairy-sparkle-1.mp3"));
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOp, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoY, {
          toValue: 0,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(card1Op, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(card1Y, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        {
          start: (cb) => {
            playSound(require("../../../assets/sounds/swish.mp3"));
            cb({ finished: true });
          },
        },
      ]),
      Animated.delay(80),
      Animated.timing(dividerOp, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(card2Op, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(card2Y, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        {
          start: (cb) => {
            playSound(require("../../../assets/sounds/swish.mp3"));
            cb({ finished: true });
          },
        },
      ]),
      Animated.parallel([
        Animated.timing(card1Op, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(card1Y, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // ── CHANGE: fetchRegisterToken moved here from SplashScreen ──────────────
  // Called only when user taps "Create New Account".
  // If fetch fails (e.g. no internet), show friendly alert — don't navigate.
  // If it succeeds, navigate to OnboardingScreen.
  const handleCreateAccount = async () => {
    if (fetchingToken) return;
    playSound(require("../../../assets/sounds/sparkle.mp3"));
    setFetchingToken(true);
    try {
      await fetchRegisterToken();
      // Token saved — safe to proceed to onboarding
      router.replace("/features/onboarding/OnboardingScreen");
    } catch (err) {
      console.warn("[AccountChoice] fetchRegisterToken failed:", err?.message);
      Alert.alert(
        "No Connection",
        "Please check your internet connection and try again.",
        [{ text: "OK" }],
      );
    } finally {
      setFetchingToken(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button */}
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
        onPress={() => router.replace("/features/onboarding/IntroCarousel")}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.backIcon, { fontSize: sz.backIconFontSize }]}>
          ‹
        </Text>
      </TouchableOpacity>

      <View
        style={[
          styles.inner,
          {
            paddingBottom:
              Platform.OS === "ios"
                ? sz.innerPaddingBottom_ios
                : sz.innerPaddingBottom_android,
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              marginBottom: sz.logoMarginBottom,
              opacity: logoOp,
              transform: [{ translateY: logoY }],
            },
          ]}
        >
          <Text style={[styles.appName, { fontSize: sz.appNameFontSize }]}>
            Story Time
          </Text>
          <Text
            style={[
              styles.appTagline,
              {
                fontSize: sz.appTaglineFontSize,
                lineHeight: sz.appTaglineLineHeight,
              },
            ]}
          >
            Your child's vocabulary adventure begins here
          </Text>
        </Animated.View>

        {/* Cards */}
        <View style={styles.cardsWrap}>
          {/* Create Account */}
          <Animated.View
            style={{ opacity: card1Op, transform: [{ translateY: card1Y }] }}
          >
            <TouchableOpacity
              style={[
                styles.primaryCard,
                { padding: sz.cardPadding, borderRadius: sz.cardBorderRadius },
              ]}
              onPress={handleCreateAccount}
              disabled={fetchingToken}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["rgba(0,188,212,0.22)", "rgba(0,188,212,0.08)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View
                style={[
                  styles.cardIconWrap,
                  { width: sz.cardIconBoxSize, height: sz.cardIconBoxSize },
                ]}
              >
                {fetchingToken ? (
                  <ActivityIndicator color={C.teal} size="small" />
                ) : (
                  <Text style={[styles.cardIcon, { fontSize: font.xxl }]}>
                    ✨
                  </Text>
                )}
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { fontSize: font.xl }]}>
                  {fetchingToken ? "Preparing…" : "Create New Account"}
                </Text>
                <Text
                  style={[
                    styles.cardSub,
                    {
                      fontSize: font.md,
                      lineHeight: sz.cardSubLineHeight,
                      marginTop: 3,
                    },
                  ]}
                >
                  Set up your child's profile and start the adventure
                </Text>
              </View>
              {!fetchingToken && (
                <Text
                  style={[
                    styles.cardArrow,
                    { color: C.teal, fontSize: sz.cardArrowFontSize },
                  ]}
                >
                  ›
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            style={[
              styles.divider,
              { opacity: dividerOp, marginVertical: sz.dividerMarginV },
            ]}
          >
            <View style={styles.dividerLine} />
            <Text
              style={[styles.dividerText, { fontSize: sz.dividerTextFontSize }]}
            >
              or
            </Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Login — unchanged */}
          <Animated.View
            style={{ opacity: card2Op, transform: [{ translateY: card2Y }] }}
          >
            <TouchableOpacity
              style={[
                styles.secondaryCard,
                { padding: sz.cardPadding, borderRadius: sz.cardBorderRadius },
              ]}
              onPress={() => {
                playSound(require("../../../assets/sounds/sparkle.mp3"));
                setTimeout(
                  () =>
                    router.replace(
                      "/features/login/EmailLogin?from=accountChoice",
                    ),
                  1000,
                );
              }}
              activeOpacity={0.88}
            >
              <View
                style={[
                  styles.cardIconWrap,
                  { width: sz.cardIconBoxSize, height: sz.cardIconBoxSize },
                ]}
              >
                <Text style={[styles.cardIcon, { fontSize: sz.cardIconSize }]}>
                  🔑
                </Text>
              </View>
              <View style={styles.cardText}>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: C.textSec, fontSize: font.lg + 1 },
                  ]}
                >
                  Already Have an Account
                </Text>
                <Text
                  style={[
                    styles.cardSub,
                    {
                      fontSize: font.md,
                      lineHeight: sz.cardSubLineHeight,
                      marginTop: 3,
                    },
                  ]}
                >
                  Sign in with your email address
                </Text>
              </View>
              <Text
                style={[
                  styles.cardArrow,
                  { color: C.textMuted, fontSize: sz.cardArrowFontSize },
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer note — unchanged */}
        <Animated.Text
          style={[
            styles.footerNote,
            {
              opacity: card2Op,
              fontSize: font.md,
              lineHeight: sz.footerLineHeight,
              marginTop: pad.sm,
            },
          ]}
        >
          <Text>By continuing you agree to our </Text>
          <Text
            style={{ color: C.teal, fontSize: font.md }}
            onPress={() => {
              playSound(require("../../../assets/sounds/button.mp3"));
              setTimeout(
                () => router.push("/features/onboarding/TermsAndPrivacy"),
                0,
              );
            }}
          >
            Terms of Service and Privacy Policy
          </Text>
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glowTL: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  glowBR: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(150,82,217,0.07)",
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
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoWrap: { alignItems: "center" },
  appName: {
    fontFamily:
      Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
    fontWeight: "900",
    color: C.teal,
    letterSpacing: 1,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: 8,
  },
  appTagline: {
    fontFamily: FONTS.light,
    color: C.textMuted,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  cardsWrap: { gap: 0 },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    overflow: "hidden",
    marginBottom: 0,
  },
  secondaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cardIconWrap: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { fontFamily: FONTS.bold, color: C.teal, letterSpacing: 0.2 },
  cardSub: { fontFamily: FONTS.light, color: C.textMuted },
  cardArrow: { flexShrink: 0 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    fontFamily: FONTS.regular,
    color: C.textMuted,
    letterSpacing: 0.5,
  },
  footerNote: {
    fontFamily: FONTS.light,
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
