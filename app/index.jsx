// app/index.jsx  —  SplashScreen
//
// FIXES applied:
//   ✅ All content wrapped in tight <inner> block with gap:10
//   ✅ Title image given explicit aspectRatio: 4.5 — fixes unknown height bug
//   ✅ Logo size: width * 0.38 (compact, not oversized)
//   ✅ Title image width: width * 0.55
//   ✅ No marginBottom on any child — parent gap:10 controls all spacing
//   ✅ COLORS imported from new theme (background, glowCyan, glowPurple, textSecondary, textDisabled)
//   ✅ All animation logic, sound, navigation unchanged

import { StyleSheet, View, Animated, Dimensions } from "react-native";
import React, { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { useUser } from "./_contexts/UserContext";
import { FONTS, COLORS } from "./theme";
import { useTheme } from "./_contexts/ThemeContext";
import { getPrimaryUserAccountId } from "./services/identityStorage";

const { width } = Dimensions.get("window");

const SplashScreen = () => {
  const router    = useRouter();
  const { sizes } = useTheme();
  const sz        = sizes.splash;

  const { isLoading, profiles } = useUser();

  // ── Animation refs ────────────────────────────────────────────
  const logoOp         = useRef(new Animated.Value(0)).current;
  const logoScale      = useRef(new Animated.Value(0.82)).current;
  const titleOp        = useRef(new Animated.Value(0)).current;
  const titleY         = useRef(new Animated.Value(12)).current;
  const sub1Op         = useRef(new Animated.Value(0)).current;
  const sub1Y          = useRef(new Animated.Value(10)).current;
  const sub2Op         = useRef(new Animated.Value(0)).current;
  const sub2Y          = useRef(new Animated.Value(10)).current;
  const fade           = useRef(new Animated.Value(0)).current;
  const scale          = useRef(new Animated.Value(0.5)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── 1. Logo fades + scales in ─────────────────────────────
    Animated.parallel([
      Animated.timing(logoOp,    { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
    ]).start(() => {

      // ── 2. Title image slides up ───────────────────────────
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(titleY,  { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start(() => {

        // ── 3. Tagline fades in ──────────────────────────────
        Animated.parallel([
          Animated.timing(sub1Op, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(sub1Y,  { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start(() => {

          // ── 4. "From Codklusters" fades in ──────────────────
          Animated.parallel([
            Animated.timing(sub2Op, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(sub2Y,  { toValue: 0, duration: 350, useNativeDriver: true }),
          ]).start();
        });
      });
    });

    // ── Sound ─────────────────────────────────────────────────
    const playSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/splashScreen/fairy-glitter.wav"),
          { volume: 0.4 },
        );
        await sound.playAsync();
      } catch (e) {
        console.log("Sound error:", e);
      }
    };
    playSound();

    // ── Background animations ──────────────────────────────────
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 4000, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();

    Animated.timing(sparkleOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }).start();

    // ── Navigation ────────────────────────────────────────────
    const timer = setTimeout(async () => {
      if (!isLoading) {
        const primaryUserAccountId = await getPrimaryUserAccountId();
        if (!primaryUserAccountId) {
          router.replace("/features/onboarding/IntroCarousel");
        } else {
          if (profiles.length === 0) {
            router.replace("/features/login/login");
          } else {
            router.replace("/features/home");
          }
        }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoading, profiles]);

  // ── Computed sizes ────────────────────────────────────────────
  const logoSize      = width * 0.38;   // compact logo — 38% screen width
  const titleImgWidth = width * 0.55;   // title image — 55% screen width
  // ✅ KEY FIX: explicit height derived from aspect ratio
  // storytime-title-bg.png is landscape text — approx 4.5:1 ratio
  // Without this, RN cannot compute height from width alone and leaves a gap
  const titleImgHeight = titleImgWidth / 4.5;

  return (
    <View style={styles.container}>

      {/* ── Ambient glows (position:absolute, don't affect layout) ── */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/*
        ── Inner content block ─────────────────────────────────────
        Single wrapper with gap:10 — ALL spacing controlled here.
        No marginBottom on any child whatsoever.
        alignItems:"center" centres each child horizontally.
      */}
      <View style={styles.inner}>

        {/* Logo */}
        <Animated.Image
          source={require("../assets/img/storytime-logo.png")}
          style={[
            styles.logo,
            {
              width:  logoSize,
              height: logoSize,
              opacity:   logoOp,
              transform: [{ scale: logoScale }],
            },
          ]}
          resizeMode="contain"
        />

        {/* Title image — replaces old "Story Time" Text */}
        <Animated.Image
          source={require("../assets/img/storytime-title-bg.png")}
          style={[
            styles.titleImage,
            {
              width:  titleImgWidth,
              height: titleImgHeight,   // ✅ explicit height — eliminates the gap
              opacity:   titleOp,
              transform: [{ translateY: titleY }],
            },
          ]}
          resizeMode="contain"
        />

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.sub1,
            {
              fontSize:  sz.sub1FontSize,
              opacity:   sub1Op,
              transform: [{ translateY: sub1Y }],
            },
          ]}
        >
          An English Reading Habit App
        </Animated.Text>

        {/* By-line */}
        <Animated.Text
          style={[
            styles.sub2,
            {
              fontSize:  sz.sub2FontSize,
              opacity:   sub2Op,
              transform: [{ translateY: sub2Y }],
            },
          ]}
        >
          From Codklusters Education
        </Animated.Text>

      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({

  // ── Outer container ───────────────────────────────────────────
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,   // #0A1628 Midnight Navy
    overflow: "hidden",
  },

  // ── Ambient glows ─────────────────────────────────────────────
  glowTL: {
    position: "absolute",
    top: -80, left: -80,
    width: 320, height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.glowCyan,    // rgba(0,196,204,0.08)
  },
  glowBR: {
    position: "absolute",
    bottom: -60, right: -60,
    width: 280, height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.glowPurple,  // rgba(123,47,190,0.08)
  },

  // ── Inner block ───────────────────────────────────────────────
  // gap:10 is the single source of spacing between all children.
  // Do NOT add marginTop/marginBottom to any child inside here.
  inner: {
    alignItems: "center",
    gap: 10,
  },

  // ── Logo ──────────────────────────────────────────────────────
  logo: {
    borderRadius: 22,
    // no margin — gap on parent handles spacing
  },

  // ── Title image ───────────────────────────────────────────────
  // width + height both set explicitly (height = width / 4.5)
  // This is critical — without explicit height RN leaves dead space
  titleImage: {
    // no margin — gap on parent handles spacing
  },

  // ── Tagline ───────────────────────────────────────────────────
  sub1: {
    fontFamily: FONTS.light,
    color: COLORS.textSecondary,         // rgba(255,255,255,0.85)
    letterSpacing: 0.4,
    textAlign: "center",
    // no margin — gap on parent handles spacing
  },

  // ── By-line ───────────────────────────────────────────────────
  sub2: {
    fontFamily: FONTS.light,
    color: COLORS.textDisabled,          // rgba(255,255,255,0.30)
    letterSpacing: 0.8,
    textAlign: "center",
    // no margin — gap on parent handles spacing
  },
});
