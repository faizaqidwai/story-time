// app/features/onboarding/AccountChoice.jsx
//
// BRAND UPDATE — feature/brand-guidelines-v2
// COLOUR-ONLY changes — zero functional/logic/animation changes:
//
//   ✅ Removed local C{} colour object — all values now from COLORS theme
//   ✅ Background "#08081a" → COLORS.background
//   ✅ "Story Time" app name: replaced Noteworthy-Bold system font
//      with storytime-title-bg.png image (brand consistent with splash + login)
//   ✅ C.teal "#00BCD4" → COLORS.primary (#00C4CC) everywhere
//   ✅ C.textPri "#E0F7FA" → COLORS.textPrimary
//   ✅ C.textSec "#B2EBF2" → COLORS.textSecondary
//   ✅ C.textMuted "#7a9aaa" → COLORS.textMuted
//   ✅ Glow blobs → COLORS.glowCyan / COLORS.glowPurple
//   ✅ Card teal border rgba → COLORS.borderPrimary
//   ✅ COLORS + Image imports added
//
// UNTOUCHED (zero changes):
//   ✅ All animation logic, refs, sequences, timing
//   ✅ All layout, sizing, padding, card structure
//   ✅ fetchRegisterToken logic
//   ✅ All navigation
//   ✅ All audio
//   ✅ LinearGradient on primary card (depth effect — acceptable)
//   ✅ sz.* sizing tokens
//   ✅ All StyleSheet values except colours

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
import { FONTS, COLORS } from "../../theme";
import { Audio } from "expo-av";
import { useTheme } from "../../_contexts/ThemeContext";
import { font, pad, radius, size } from "../../theme/tokens";
import { fetchRegisterToken } from "../../services/authService";
import { Image as ExpoImage } from "expo-image";

const { width: SW, height: SH } = Dimensions.get("window");

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

  const [fetchingToken, setFetchingToken] = useState(false);

  // ── Entrance animations — UNCHANGED ──────────────────────────────────────
  const logoOp   = useRef(new Animated.Value(0)).current;
  const logoY    = useRef(new Animated.Value(30)).current;
  const card1Op  = useRef(new Animated.Value(0)).current;
  const card1Y   = useRef(new Animated.Value(40)).current;
  const card2Op  = useRef(new Animated.Value(0)).current;
  const card2Y   = useRef(new Animated.Value(40)).current;
  const dividerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    playSound(require("../../../assets/sounds/fairy-sparkle-1.mp3"));
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoY,  { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(card1Op, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(card1Y,  { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
        { start: (cb) => { playSound(require("../../../assets/sounds/swish.mp3")); cb({ finished: true }); } },
      ]),
      Animated.delay(80),
      Animated.timing(dividerOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(card2Op, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(card2Y,  { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
        { start: (cb) => { playSound(require("../../../assets/sounds/swish.mp3")); cb({ finished: true }); } },
      ]),
      Animated.parallel([
        Animated.timing(card1Op, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(card1Y,  { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── handleCreateAccount — UNCHANGED ──────────────────────────────────────
  const handleCreateAccount = async () => {
    if (fetchingToken) return;
    playSound(require("../../../assets/sounds/sparkle.mp3"));
    setFetchingToken(true);
    try {
      await fetchRegisterToken();
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

  // ── Title image sizing — matches splash/login screens ────────────────────
  const TITLE_IMG_WIDTH  = SW * 0.55;
  const TITLE_IMG_HEIGHT = TITLE_IMG_WIDTH / 4.5;   // 4.5:1 aspect ratio

  return (
    <View style={styles.root}>
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button — UNCHANGED */}
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
        <Text style={[styles.backIcon, { fontSize: sz.backIconFontSize }]}>‹</Text>
      </TouchableOpacity>

      <View
        style={[
          styles.inner,
          {
            paddingBottom: Platform.OS === "ios"
              ? sz.innerPaddingBottom_ios
              : sz.innerPaddingBottom_android,
          },
        ]}
      >
        {/* ── Logo block — CHANGED: Noteworthy-Bold → brand image ────────── */}
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
          {/* ✅ storytime-title-bg.png replaces Noteworthy-Bold text */}
          <ExpoImage
            source={require("../../../assets/img/storytime-title-bg.png")}
            style={{
              width:        TITLE_IMG_WIDTH,
              height:       TITLE_IMG_HEIGHT,
              marginBottom: 10,
            }}
            contentFit="contain"
          />
          <Text
            style={[
              styles.appTagline,
              {
                fontSize:   sz.appTaglineFontSize,
                lineHeight: sz.appTaglineLineHeight,
              },
            ]}
          >
            Your child's vocabulary adventure begins here
          </Text>
        </Animated.View>

        {/* Cards — UNCHANGED structure */}
        <View style={styles.cardsWrap}>

          {/* Create Account card */}
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
                colors={[`${COLORS.primary}38`, `${COLORS.primary}14`]}  // ✅ was old cyan rgba
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
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Text style={[styles.cardIcon, { fontSize: font.xxl }]}>✨</Text>
                )}
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { fontSize: font.xl }]}>
                  {fetchingToken ? "Preparing…" : "Create New Account"}
                </Text>
                <Text
                  style={[
                    styles.cardSub,
                    { fontSize: font.md, lineHeight: sz.cardSubLineHeight, marginTop: 3 },
                  ]}
                >
                  Set up your child's profile and start the adventure
                </Text>
              </View>
              {!fetchingToken && (
                <Text style={[styles.cardArrow, { color: COLORS.primary, fontSize: sz.cardArrowFontSize }]}>
                  ›
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            style={[styles.divider, { opacity: dividerOp, marginVertical: sz.dividerMarginV }]}
          >
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontSize: sz.dividerTextFontSize }]}>or</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Login card */}
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
                  () => router.replace("/features/login/EmailLogin?from=accountChoice"),
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
                <Text style={[styles.cardIcon, { fontSize: sz.cardIconSize }]}>🔑</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: COLORS.textSecondary, fontSize: font.lg + 1 }]}>
                  Already Have an Account
                </Text>
                <Text
                  style={[
                    styles.cardSub,
                    { fontSize: font.md, lineHeight: sz.cardSubLineHeight, marginTop: 3 },
                  ]}
                >
                  Sign in with your email address
                </Text>
              </View>
              <Text style={[styles.cardArrow, { color: COLORS.textMuted, fontSize: sz.cardArrowFontSize }]}>
                ›
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer note — UNCHANGED */}
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
            style={{ color: COLORS.primary, fontSize: font.md }}  // ✅ was C.teal
            onPress={() => {
              playSound(require("../../../assets/sounds/button.mp3"));
              setTimeout(() => router.push("/features/onboarding/TermsAndPrivacy"), 0);
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
  root: {
    flex: 1,
    backgroundColor: COLORS.background,         // ✅ was C.bg = "#08081a"
  },
  glowTL: {
    position: "absolute",
    top: -60, left: -60,
    width: 240, height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.glowCyan,           // ✅ was "rgba(0,188,212,0.07)"
  },
  glowBR: {
    position: "absolute",
    bottom: -40, right: -40,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.glowPurple,         // ✅ was "rgba(150,82,217,0.07)"
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
  backIcon: { color: COLORS.textPrimary, marginTop: -2 },  // ✅ was "#E0F7FA"
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoWrap: { alignItems: "center" },
  appTagline: {
    fontFamily: FONTS.light,
    color: COLORS.textMuted,                    // ✅ was C.textMuted = "#7a9aaa"
    textAlign: "center",
    paddingHorizontal: 20,
  },
  cardsWrap: { gap: 0 },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.borderPrimary,          // ✅ was C.tealBorder "rgba(0,188,212,0.35)"
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
  cardText:  { flex: 1, gap: 3 },
  cardTitle: { fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.2 }, // ✅ was C.teal
  cardSub:   { fontFamily: FONTS.light, color: COLORS.textMuted },                  // ✅ was C.textMuted
  cardArrow: { flexShrink: 0 },
  divider:   { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: {
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,                    // ✅ was C.textMuted
    letterSpacing: 0.5,
  },
  footerNote: {
    fontFamily: FONTS.light,
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
