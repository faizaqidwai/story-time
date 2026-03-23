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
  Easing,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

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

// Static starfield
const STARS = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  x: (i * 113.5) % SW,
  y: (i * 79.3) % SH,
  size: 1.5 + (i % 3),
  opacity: 0.08 + (i % 5) * 0.06,
}));

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
      // Logo fades in
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoY, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      // First card
      Animated.parallel([
        Animated.timing(card1Op, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(card1Y, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      // Divider
      Animated.timing(dividerOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Second card
      Animated.parallel([
        Animated.timing(card2Op, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(card2Y, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Starfield */}
      {STARS.map((s) => (
        <View
          key={s.id}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: "#fff",
            opacity: s.opacity,
          }}
        />
      ))}

      {/* Soft glow circles */}
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
          style={[styles.logoWrap, { opacity: logoOp, transform: [{ translateY: logoY }] }]}
        >
          <Text style={styles.appName}>Story Time</Text>
          <Text style={styles.appTagline}>
            Your child's vocabulary adventure begins here
          </Text>
        </Animated.View>

        {/* Cards */}
        <View style={styles.cardsWrap}>
          {/* Create Account */}
          <Animated.View style={{ opacity: card1Op, transform: [{ translateY: card1Y }] }}>
            <TouchableOpacity
              style={styles.primaryCard}
              onPress={() => router.push("/OnboardingScreen")}
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
          <Animated.View style={{ opacity: card2Op, transform: [{ translateY: card2Y }] }}>
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={() => router.push("/login")}
              activeOpacity={0.88}
            >
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>🔑</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: C.textSec }]}>
                  I Already Have an Account
                </Text>
                <Text style={styles.cardSub}>Sign in with your email address</Text>
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

  // Glow blobs
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

  // Back
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
  backIcon: {
    fontSize: 28,
    color: "#E0F7FA",
    fontWeight: "300",
    marginTop: -2,
  },

  // Inner layout
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 120 : 90,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    justifyContent: "center",
  },

  // Logo section
  logoWrap: {
    alignItems: "center",
    marginBottom: 44,
  },
  appName: {
    fontFamily: Platform.OS === "ios" ? "Noteworthy-Bold" : "sans-serif-condensed",
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
    fontSize: 14,
    color: C.textMuted,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Cards wrapper
  cardsWrap: { gap: 0 },

  // Primary card (Create Account)
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

  // Secondary card (Login)
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

  // Shared card parts
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardIcon: { fontSize: 24 },
  cardText: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.teal,
    letterSpacing: 0.2,
  },
  cardSub: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
    lineHeight: 17,
  },
  cardArrow: { fontSize: 26, fontWeight: "300", flexShrink: 0 },

  // Divider
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
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Footer
  footerNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    marginTop: 36,
    lineHeight: 17,
    paddingHorizontal: 20,
  },
});
