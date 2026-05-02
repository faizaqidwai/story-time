// components/PremiumUpgradeModal.jsx
//
// A beautiful, persuasive modal shown when a user taps a locked story.
// Features a glowing star icon, value props, and a CTA to the subscription page.
//
// Props:
//   visible  — boolean
//   onClose  — called when user dismisses
//   onUpgrade — called when user taps upgrade button (navigate to subscription)

import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { FONTS } from "../../../theme";

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "#0d0f22",
  card: "#111830",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealGlow: "rgba(0,188,212,0.35)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.12)",
  coral: "#FF6B6B",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
  border: "rgba(0,188,212,0.2)",
};

const VALUE_PROPS = [
  { emoji: "📚", text: "All stories in every level" },
  { emoji: "🎯", text: "Full access to all 4 activities" },
  { emoji: "🏆", text: "Track progress across all levels" },
  { emoji: "✨", text: "Unlimited words & diamonds" },
];

// ── Animated star/crown icon ──────────────────────────────────────────────────
function CrownIcon({ pulseAnim, glowAnim }) {
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  return (
    <View style={icon.wrapper}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          icon.glowRingOuter,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />
      {/* Inner glow ring */}
      <Animated.View
        style={[
          icon.glowRingInner,
          {
            opacity: glowOpacity,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      {/* Icon circle */}
      <Animated.View
        style={[icon.circle, { transform: [{ scale: pulseAnim }] }]}
      >
        <Text style={icon.emoji}>👑</Text>
      </Animated.View>
    </View>
  );
}

const icon = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  glowRingOuter: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,213,79,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.2)",
  },
  glowRingInner: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,213,79,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.35)",
  },
  circle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#1a1f3a",
    borderWidth: 2,
    borderColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  emoji: { fontSize: 32 },
});

// ── Value prop row ────────────────────────────────────────────────────────────
function ValueProp({ emoji, text, delay, slideAnim, opAnim }) {
  return (
    <Animated.View
      style={[
        vp.row,
        {
          opacity: opAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={vp.emojiWrap}>
        <Text style={vp.emoji}>{emoji}</Text>
      </View>
      <Text style={vp.text}>{text}</Text>
    </Animated.View>
  );
}

const vp = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginVertical: 3,
    backgroundColor: C.tealDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    width: "100%",
  },
  emojiWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emoji: { fontSize: 16 },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: C.textPri,
    flex: 1,
  },
});

// ── MAIN MODAL ────────────────────────────────────────────────────────────────
const PremiumUpgradeModal = ({ visible, onClose, onUpgrade }) => {
  const backdropOp = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(60)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Value prop animations
  const vpAnims = useRef(
    VALUE_PROPS.map(() => ({
      slide: new Animated.Value(30),
      op: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset
      backdropOp.setValue(0);
      cardY.setValue(60);
      cardOp.setValue(0);
      vpAnims.forEach((a) => {
        a.slide.setValue(30);
        a.op.setValue(0);
      });

      // Backdrop + card entrance
      Animated.parallel([
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardY, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(cardOp, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();

      // Value props stagger
      vpAnims.forEach((a, i) => {
        Animated.sequence([
          Animated.delay(300 + i * 80),
          Animated.parallel([
            Animated.timing(a.op, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.spring(a.slide, {
              toValue: 0,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });

      // Pulse loop on crown
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.94,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Glow loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(cardOp, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardY, {
        toValue: 60,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());
  };

  const handleUpgrade = () => {
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOp, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onUpgrade?.());
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={s.shell}>
        {/* Backdrop */}
        <Animated.View style={[s.backdrop, { opacity: backdropOp }]} />

        {/* Tap backdrop to close */}
        <TouchableOpacity
          style={s.backdropTap}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Card */}
        <Animated.View
          style={[
            s.card,
            { opacity: cardOp, transform: [{ translateY: cardY }] },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={s.closeBtn}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>

          {/* Crown icon */}
          <CrownIcon pulseAnim={pulseAnim} glowAnim={glowAnim} />

          {/* Headline */}
          <Text style={s.headline}>Unlock Every Story</Text>
          <Text style={s.subline}>
            Your child is ready to go further.{"\n"}Premium opens the full world
            of learning.
          </Text>

          {/* Value props */}
          <View style={s.vpContainer}>
            {VALUE_PROPS.map((vProp, i) => (
              <ValueProp
                key={i}
                emoji={vProp.emoji}
                text={vProp.text}
                delay={300 + i * 80}
                slideAnim={vpAnims[i].slide}
                opAnim={vpAnims[i].op}
              />
            ))}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={handleUpgrade}
            activeOpacity={0.88}
          >
            <View style={s.ctaBtnInner}>
              <Text style={s.ctaEmoji}>⚡</Text>
              <Text style={s.ctaTxt}>Upgrade to Premium</Text>
            </View>
            <View style={s.ctaShine} />
          </TouchableOpacity>

          {/* Dismiss link */}
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.6}
            style={s.dismissWrap}
          >
            <Text style={s.dismissTxt}>Maybe later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default PremiumUpgradeModal;

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  shell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: SW - 40,
    maxWidth: 400,
    backgroundColor: C.card,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
    // Subtle top gradient feel via border
    borderTopColor: "rgba(0,188,212,0.4)",
    borderTopWidth: 1.5,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: C.textMuted,
  },
  headline: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: C.textPri,
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,188,212,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subline: {
    fontFamily: FONTS.light,
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  vpContainer: {
    width: "100%",
    marginBottom: 22,
    gap: 4,
  },
  ctaBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaEmoji: { fontSize: 18 },
  ctaTxt: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#08081a",
    letterSpacing: 0.3,
  },
  ctaShine: {
    position: "absolute",
    top: 0,
    left: "15%",
    width: "40%",
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  dismissWrap: { paddingVertical: 4 },
  dismissTxt: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: C.textMuted,
    textDecorationLine: "underline",
  },
});
