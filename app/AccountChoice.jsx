// app/AccountChoice.jsx
//
// Screen shown after the intro carousel.
// Two choices:
//   1. Create new account → /OnboardingScreen (existing)
//   2. Already have an account → /login (existing)
//
// Back button returns to the carousel.

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "./theme";
import { Audio } from "expo-av";

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

  // Entrance animations
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(30)).current;
  const card1Op = useRef(new Animated.Value(0)).current;
  const card1Y = useRef(new Animated.Value(40)).current;
  const card2Op = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(40)).current;
  const dividerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
            playSound(require("../assets/sounds/swish.mp3"));
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
            playSound(require("../assets/sounds/swish.mp3"));
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

  return (
    <View style={styles.root}>
      {/* Static glow circles — clean background, no dots */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/IntroCarousel")}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.inner}>
        {/* Logo / branding */}
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: logoOp, transform: [{ translateY: logoY }] },
          ]}
        >
          <Text style={styles.appName}>Story Time</Text>
          <Text style={styles.appTagline}>
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
              style={styles.primaryCard}
              onPress={() => {
                playSound(require("../assets/sounds/sparkle.mp3"));
                setTimeout(() => router.push("/OnboardingScreen"), 1000);
              }}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["rgba(0,188,212,0.22)", "rgba(0,188,212,0.08)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>✨</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Create New Account</Text>
                <Text style={styles.cardSub}>
                  Set up your child's profile and start the adventure
                </Text>
              </View>
              <Text style={[styles.cardArrow, { color: C.teal }]}>›</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <Animated.View style={[styles.divider, { opacity: dividerOp }]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Login */}
          <Animated.View
            style={{ opacity: card2Op, transform: [{ translateY: card2Y }] }}
          >
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={() => {
                playSound(require("../assets/sounds/sparkle.mp3"));
                setTimeout(() => router.push("/login"), 1000);
              }}
              activeOpacity={0.88}
            >
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>🔑</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: C.textSec }]}>
                  I Already Have an Account
                </Text>
                <Text style={styles.cardSub}>
                  Sign in with your email address
                </Text>
              </View>
              <Text style={[styles.cardArrow, { color: C.textMuted }]}>›</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer note */}
        <Animated.Text style={[styles.footerNote, { opacity: card2Op }]}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Two static soft glow circles — identical on both intro screens
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

  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 120 : 90,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    justifyContent: "center",
  },

  logoWrap: { alignItems: "center", marginBottom: 44 },

  appName: {
    fontFamily:
      Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
    fontSize: 38,
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
    fontSize: 18,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  cardsWrap: { gap: 0 },

  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: 18,
    overflow: "hidden",
    marginBottom: 0,
  },
  secondaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 18,
  },

  cardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardIcon: { fontSize: 24 },
  cardText: { flex: 1, gap: 3 },

  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: C.teal,
    letterSpacing: 0.2,
  },
  cardSub: {
    fontFamily: FONTS.light,
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 17,
  },

  cardArrow: { fontSize: 26, flexShrink: 0 },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: C.textMuted,
    letterSpacing: 0.5,
  },

  footerNote: {
    fontFamily: FONTS.light,
    fontSize: 14,
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    marginTop: 36,
    lineHeight: 17,
    paddingHorizontal: 20,
  },
});
