// app/components/WordBag.jsx
// CHANGES FROM ORIGINAL:
//   ✅ Shows subscription lock screen when subscription is not ACTIVE
//   ✅ Lock screen matches home screen style — animated, professional messaging
//   ✅ CTA navigates to SubscriptionPlansScreen
//   ✅ Glow circle fixed — wrapped with emoji so it sits behind it correctly
//   ✅ Free trial expiry shows different message (billingCycle === "NONE")
//   ✅ All existing WordBag functionality completely unchanged

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import { useUser } from "../../_contexts/UserContext";
import { useSubscription } from "../../_contexts/SubscriptionContext";
import { FONTS } from "../../theme";
import { font, pad, radius, size } from "../../theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  surfaceHigh: "rgba(255,255,255,0.09)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  tealGlow: "rgba(0,188,212,0.25)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.12)",
  yellowBorder: "rgba(255,213,79,0.55)",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.18)",
  purpleBorder: "rgba(150,82,217,0.4)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.15)",
  greenBorder: "rgba(76,175,80,0.5)",
  white: "#FFFFFF",
  textPri: "#E0F7FA",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const CARD_SIZE = (SW - 48) / 2;

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION LOCK SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function WordBagSubscriptionLock({ subscription, onViewPlans }) {
  const planName = subscription?.packageName ?? null;
  const status = subscription?.status;

  let emoji, title, message;

  switch (status) {
    case "EXPIRED":
      if (subscription?.billingCycle === "NONE") {
        emoji = "🚀";
        title = "Your Free Trial Has Ended";
        message =
          "Your 7-day free trial is over. Subscribe to a plan to continue building your child's vocabulary and access all collected words.";
      } else {
        emoji = "⏰";
        title = "Subscription Expired";
        message = `Your ${planName ?? "plan"} has ended. Renew to access your collected words and continue building your child's vocabulary.`;
      }
      break;
    case "CANCELLED":
      emoji = "📖";
      title = "Subscription Cancelled";
      message =
        "Your subscription has been cancelled. Your word collection is saved — resubscribe to access it again.";
      break;
    case "PAST_DUE":
      emoji = "💳";
      title = "Payment Required";
      message =
        "We couldn't process your last payment. Update your payment details to access your word bag.";
      break;
    default:
      emoji = "🎒";
      title = "Subscription Required";
      message =
        "An active subscription is required to access your word bag. Choose a plan to unlock all collected words and activities.";
  }

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.97,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        lockS.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ── Emoji wrapped with glow so circle sits behind it ── */}
      <View style={lockS.emojiWrapper}>
        <View style={lockS.glowCircle} />
        <Text style={lockS.emoji}>{emoji}</Text>
      </View>

      <Text style={lockS.title}>{title}</Text>
      <Text style={lockS.message}>{message}</Text>
      <View style={lockS.divider} />
      <View style={lockS.featureRow}>
        {[
          "📚 All Collected Words",
          "🔈 Phonics Playback",
          "📖 Word Descriptions",
          "✨ Extras & Grammar",
        ].map((feat, i) => (
          <View key={i} style={lockS.featurePill}>
            <Text style={lockS.featurePillText}>{feat}</Text>
          </View>
        ))}
      </View>
      <Animated.View
        style={{ transform: [{ scale: pulseAnim }], width: "100%" }}
      >
        <TouchableOpacity
          style={lockS.ctaBtn}
          onPress={onViewPlans}
          activeOpacity={0.88}
        >
          <View style={lockS.ctaShine} />
          <Text style={lockS.ctaBtnText}>Renew Plan →</Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={lockS.footnote}>Cancel anytime · No hidden fees</Text>
    </Animated.View>
  );
}

const lockS = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: pad.lg,
    paddingVertical: pad.xl,
    gap: 14,
  },
  // Wrapper keeps glow circle positioned relative to emoji only
  emojiWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 140,
    height: 140,
  },
  // Absolute inside emojiWrapper — always centered behind emoji
  glowCircle: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  emoji: { fontSize: 64 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: "#E0F7FA",
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: font.xxl * 1.2,
  },
  message: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: "#ffffff",
    textAlign: "center",
    lineHeight: font.md * 1.6,
    paddingHorizontal: pad.sm,
  },
  divider: {
    width: "40%",
    height: 1,
    backgroundColor: "rgba(0,188,212,0.2)",
    marginVertical: pad.xs,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: pad.sm,
  },
  featurePill: {
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
    backgroundColor: "rgba(0,188,212,0.07)",
  },
  featurePillText: {
    fontFamily: FONTS.regular,
    fontSize: font.sm,
    color: "#B2EBF2",
  },
  ctaBtn: {
    backgroundColor: C.teal,
    borderRadius: radius.pill,
    paddingVertical: pad.sm,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
    width: "100%",
  },
  ctaShine: {
    position: "absolute",
    top: 0,
    left: "14%",
    width: "38%",
    height: "52%",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 20,
    transform: [{ rotate: "-15deg" }],
  },
  ctaBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: "#08081a",
    letterSpacing: 0.3,
  },
  footnote: {
    fontFamily: FONTS.light,
    fontSize: font.s,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PHONICS PLAYER — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function usePhonicsPlayer() {
  const timerRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const stop = useCallback(() => {
    Speech.stop();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const play = useCallback(
    (wordId, phonics) => {
      if (playingId === wordId) {
        stop();
        return;
      }
      stop();
      setPlayingId(wordId);
      const parts = [...phonics];
      let index = 0;
      const speakNext = () => {
        if (index >= parts.length) {
          setPlayingId(null);
          return;
        }
        const part = parts[index++];
        Speech.speak(part, {
          language: "en",
          pitch: 1.1,
          rate: 0.75,
          onDone: () => {
            timerRef.current = setTimeout(speakNext, 280);
          },
          onStopped: () => setPlayingId(null),
          onError: () => setPlayingId(null),
        });
      };
      speakNext();
    },
    [playingId, stop],
  );

  useEffect(() => () => stop(), []);
  return { playingId, play, stop };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORD CARD — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function WordCard({ word, index, onDescribe, playingId, onPlay }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const op = useRef(new Animated.Value(0)).current;
  const isPlaying = playingId === word.id || playingId === word.name;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(op, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={[cardS.wrapper, { opacity: op, transform: [{ scale }] }]}
    >
      <View style={cardS.emojiRing}>
        <Text style={cardS.emoji}>{word.image || "📖"}</Text>
      </View>
      <Text style={cardS.name}>{word.name}</Text>
      <View style={cardS.actions}>
        <TouchableOpacity
          style={[cardS.actionBtn, isPlaying && cardS.actionBtnActive]}
          onPress={() =>
            onPlay(word.id ?? word.name, word.phonics || [word.name])
          }
          onPressIn={pressIn}
          onPressOut={pressOut}
          activeOpacity={0.8}
        >
          <Text style={cardS.actionIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
          <Text style={[cardS.actionLabel, isPlaying && { color: C.teal }]}>
            {isPlaying ? "Stop" : "Audio"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={cardS.actionBtn}
          onPress={() => onDescribe(word)}
          activeOpacity={0.8}
        >
          <Text style={cardS.actionIcon}>📖</Text>
          <Text style={cardS.actionLabel}>Describe</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const cardS = StyleSheet.create({
  wrapper: {
    width: CARD_SIZE,
    backgroundColor: C.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    paddingVertical: pad.lg,
    paddingHorizontal: pad.s,
    margin: pad.xs,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  emojiRing: {
    width: size.avatarLg + 20,
    height: size.avatarLg + 20,
    borderRadius: (size.avatarLg + 20) / 2,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 2,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.s,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  emoji: { fontSize: font.h2 - 4 },
  name: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.textPri,
    letterSpacing: 0.5,
    marginBottom: pad.sm,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  actions: { flexDirection: "row", gap: pad.s },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs + 3,
    gap: pad.xs - 1,
  },
  actionBtnActive: { backgroundColor: C.tealDim, borderColor: C.tealBorder },
  actionIcon: { fontSize: font.lg },
  actionLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.textMuted,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE MODAL — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function DescribeModal({ word, visible, onClose, playingId, onPlay }) {
  const slideY = useRef(new Animated.Value(SH)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const isPlaying = word && (playingId === word.id || playingId === word.name);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scrOp, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scrOp, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: SH,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!word) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[modalS.scrim, { opacity: scrOp }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>
      <Animated.View
        style={[modalS.sheet, { transform: [{ translateY: slideY }] }]}
      >
        <View style={modalS.handle} />
        <TouchableOpacity
          style={modalS.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={modalS.closeText}>✕</Text>
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={modalS.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={modalS.bigEmojiRing}>
            <Text style={modalS.bigEmoji}>{word.image || "📖"}</Text>
          </View>
          <Text style={modalS.bigName}>{word.name}</Text>
          {word.phonics && word.phonics.length > 0 && (
            <View style={modalS.phonicsRow}>
              {word.phonics.map((p, i) => (
                <View key={i} style={modalS.phonicsChip}>
                  <Text style={modalS.phonicsText}>{p}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={[modalS.audioBtn, isPlaying && modalS.audioBtnActive]}
            onPress={() =>
              onPlay(word.id ?? word.name, word.phonics || [word.name])
            }
            activeOpacity={0.8}
          >
            <Text style={modalS.audioBtnIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
            <Text style={[modalS.audioBtnText, isPlaying && { color: C.teal }]}>
              {isPlaying ? "Stop Audio" : "Play Phonics"}
            </Text>
          </TouchableOpacity>
          {word.explanation ? (
            <View style={modalS.section}>
              <Text style={modalS.sectionLabel}>What is it?</Text>
              <Text style={modalS.explanationText}>{word.explanation}</Text>
            </View>
          ) : null}
          {word.extras && word.extras.length > 0 ? (
            <View style={modalS.section}>
              <Text style={modalS.sectionLabel}>Did you know?</Text>
              {word.extras.map((extra, i) => (
                <View key={i} style={modalS.extraRow}>
                  <Text style={modalS.extraBullet}>✦</Text>
                  <Text style={modalS.extraText}>{extra}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={modalS.badgeRow}>
            {word.grammarCategory ? (
              <View style={[modalS.badge, modalS.badgePurple]}>
                <Text style={[modalS.badgeText, { color: C.purple }]}>
                  {word.grammarCategory}
                </Text>
              </View>
            ) : null}
            {word.category ? (
              <View style={[modalS.badge, modalS.badgeTeal]}>
                <Text style={[modalS.badgeText, { color: C.teal }]}>
                  {word.category}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.78,
    backgroundColor: "#0d0f1e",
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "rgba(0,188,212,0.3)",
    paddingTop: pad.s,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: pad.s,
  },
  closeBtn: {
    position: "absolute",
    top: pad.lg,
    right: pad.lg,
    width: size.hitSm,
    height: size.hitSm,
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
  },
  closeText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.textMuted },
  content: {
    alignItems: "center",
    paddingHorizontal: pad.xl,
    paddingBottom: pad.xxxl,
    paddingTop: pad.s,
  },
  bigEmojiRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,188,212,0.1)",
    borderWidth: 2.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.md,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  bigEmoji: { fontSize: font.h1 + 18 },
  bigName: {
    fontFamily: FONTS.bold,
    fontSize: font.h2,
    color: C.textPri,
    letterSpacing: 0.5,
    marginBottom: pad.sm,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  phonicsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: pad.xs,
    marginBottom: pad.md,
  },
  phonicsChip: {
    backgroundColor: C.tealDim,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  phonicsText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.teal,
    letterSpacing: 1,
  },
  audioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
    backgroundColor: C.surfaceHigh,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: pad.xl,
    paddingVertical: pad.sm,
    marginBottom: pad.xl,
  },
  audioBtnActive: { backgroundColor: C.tealDim, borderColor: C.tealBorder },
  audioBtnIcon: { fontSize: font.xl },
  audioBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textSec,
    letterSpacing: 0.3,
  },
  section: { width: "100%", marginBottom: pad.lg },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.teal,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: pad.s,
    opacity: 0.8,
  },
  explanationText: {
    fontFamily: FONTS.regular,
    fontSize: font.md,
    color: C.textSec,
    lineHeight: font.md + 7,
    backgroundColor: C.surface,
    borderRadius: radius.md,
    padding: pad.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: pad.s,
    marginBottom: pad.s,
  },
  extraBullet: { fontSize: pad.s, color: C.teal, marginTop: pad.xs },
  extraText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.md - 1,
    color: C.textSec,
    lineHeight: font.md + 6,
  },
  badgeRow: { flexDirection: "row", gap: pad.s, marginTop: pad.xs },
  badge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  badgePurple: { backgroundColor: C.purpleDim, borderColor: C.purpleBorder },
  badgeTeal: { backgroundColor: C.tealDim, borderColor: C.tealBorder },
  badgeText: { fontFamily: FONTS.bold, fontSize: font.s, letterSpacing: 0.3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <View style={emptyS.container}>
      <Animated.Text style={[emptyS.icon, { transform: [{ scale: pulse }] }]}>
        🎒
      </Animated.Text>
      <Text style={emptyS.title}>Your word bag is empty</Text>
      <Text style={emptyS.sub}>
        Complete stories to collect words and build your vocabulary!
      </Text>
    </View>
  );
}
const emptyS = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: pad.xxxl,
  },
  icon: { fontSize: font.h1 + 32, marginBottom: pad.lg },
  title: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    textAlign: "center",
    marginBottom: pad.s,
  },
  sub: {
    fontFamily: FONTS.light,
    fontSize: font.md - 1,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.md + 6,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const WordBagScreen = () => {
  const router = useRouter();
  const { currentProfile } = useUser();
  const { subscription } = useSubscription();
  const { playingId, play, stop } = usePhonicsPlayer();

  const [selectedWord, setSelectedWord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isSubscriptionActive = subscription?.status === "ACTIVE";

  const words = currentProfile?.wordBag?.words || [];
  const uniqueWords = words.filter(
    (w, i, arr) => arr.findIndex((x) => x.name === w.name) === i,
  );

  const handleDescribe = useCallback(
    (word) => {
      stop();
      setSelectedWord(word);
      setModalVisible(true);
    },
    [stop],
  );

  const handleCloseModal = useCallback(() => {
    stop();
    setModalVisible(false);
    setTimeout(() => setSelectedWord(null), 350);
  }, [stop]);

  return (
    <View style={screenS.root}>
      <View style={[screenS.glow, screenS.glow1]} />
      <View style={[screenS.glow, screenS.glow2]} />

      <View style={screenS.header}>
        <TouchableOpacity
          style={screenS.backBtn}
          onPress={() => {
            stop();
            router.back();
          }}
          activeOpacity={0.75}
        >
          <Text style={screenS.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={screenS.headerCenter}>
          <Text style={screenS.headerTitle}>Word Bag</Text>
          <View style={screenS.countPill}>
            <Text style={screenS.countText}>{uniqueWords.length} words</Text>
          </View>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {!isSubscriptionActive ? (
        <WordBagSubscriptionLock
          subscription={subscription}
          onViewPlans={() =>
            router.push("/components/billing/SubscriptionPlansScreen")
          }
        />
      ) : uniqueWords.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          contentContainerStyle={screenS.grid}
          showsVerticalScrollIndicator={false}
        >
          {uniqueWords.map((word, i) => (
            <WordCard
              key={word.name + i}
              word={word}
              index={i}
              playingId={playingId}
              onPlay={play}
              onDescribe={handleDescribe}
            />
          ))}
        </ScrollView>
      )}

      <DescribeModal
        word={selectedWord}
        visible={modalVisible}
        onClose={handleCloseModal}
        playingId={playingId}
        onPlay={play}
      />
    </View>
  );
};

const screenS = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glow: { position: "absolute", borderRadius: radius.pill, opacity: 0.12 },
  glow1: {
    width: 300,
    height: 300,
    backgroundColor: C.teal,
    top: -80,
    right: -80,
  },
  glow2: {
    width: 200,
    height: 200,
    backgroundColor: "#9652D9",
    bottom: 60,
    left: -60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT + pad.s,
    paddingBottom: pad.md,
    paddingHorizontal: pad.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,188,212,0.15)",
  },
  backBtn: {
    width: size.hitMd,
    height: size.hitMd,
    borderRadius: size.hitMd / 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontFamily: FONTS.bold, fontSize: font.xl, color: C.teal },
  headerCenter: { alignItems: "center", gap: pad.xs },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.textPri,
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  countPill: {
    backgroundColor: C.tealDim,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.s,
    paddingVertical: pad.xs - 1,
  },
  countText: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.teal,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: pad.sm,
    paddingTop: pad.md,
    paddingBottom: pad.xxxl,
  },
});

export default WordBagScreen;
