// components/GameEnd.jsx

import React, { useRef, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  Image,
  useWindowDimensions,
} from "react-native";
import { Audio } from "expo-av";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens"; // ← ADD

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "#08081a",
  darkBg2: "#0f0f2a",
  surface: "rgba(255,255,255,0.06)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.5)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.12)",
  yellowBorder: "rgba(255,213,79,0.55)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.14)",
  greenBorder: "rgba(76,175,80,0.55)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.14)",
  redBorder: "rgba(239,83,80,0.5)",
  purple: "#9652D9",
  textPri: "#FFFFFF",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const CONFETTI = ["🎉", "⭐", "🌟", "✨", "🎊", "💫", "🎈", "🥳", "🌈", "🏆"];
const PART_CNT = 24;

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE
// ─────────────────────────────────────────────────────────────────────────────
function Particle({ emoji, startX, startY, delay, size: pSize }) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dx = (Math.random() - 0.5) * SW * 1.4;
    const dy = -(Math.random() * SH * 0.65 + 60);
    const duration = 1200 + Math.random() * 700;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(sc, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(tx, {
          toValue: dx,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: dy,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rot, {
          toValue: (Math.random() - 0.5) * 6,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(duration * 0.5),
          Animated.timing(op, {
            toValue: 0,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const spin = rot.interpolate({
    inputRange: [-3, 3],
    outputRange: ["-540deg", "540deg"],
  });
  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: startX,
        top: startY,
        fontSize: pSize,
        opacity: op,
        zIndex: 200,
        pointerEvents: "none",
        transform: [
          { translateX: tx },
          { translateY: ty },
          { rotate: spin },
          { scale: sc },
        ],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WIN CARD
// ─────────────────────────────────────────────────────────────────────────────
function WinCard({
  word,
  onClose,
  onBadge,
  cardSlide,
  cardOp,
  winTitle,
  winSubtitle,
}) {
  const crownBounce = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const bounceLoop = useRef(null);
  const btnLoop = useRef(null);

  useEffect(() => {
    bounceLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(crownBounce, {
          toValue: 1.18,
          duration: 480,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(crownBounce, {
          toValue: 1.0,
          duration: 480,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    bounceLoop.current.start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    btnLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: 1.06,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 1.0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    btnLoop.current.start();
    return () => {
      bounceLoop.current?.stop();
      btnLoop.current?.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        styles.cardWin,
        { opacity: cardOp, transform: [{ translateY: cardSlide }] },
      ]}
    >
      <Animated.View
        style={[styles.glowRing, styles.glowRingWin, { opacity: glowPulse }]}
      />
      <Animated.Text
        style={[styles.bigIcon, { transform: [{ scale: crownBounce }] }]}
      >
        🏆
      </Animated.Text>
      <Text style={styles.winTitle}>{winTitle ?? "You Won!"}</Text>
      <Text style={styles.winSubtitle}>
        {winSubtitle ?? "Brilliant! You guessed the word!"}
      </Text>
      {word && (
        <View style={styles.wordRevealWin}>
          <Text style={styles.wordRevealLabel}>The word was</Text>
          <Text style={styles.wordRevealValueWin}>{word}</Text>
        </View>
      )}
      <View style={styles.starsRow}>
        {["⭐", "🌟", "⭐"].map((s, i) => (
          <Text
            key={i}
            style={[
              styles.starDeco,
              { fontSize: i === 1 ? 32 : 22, marginTop: i === 1 ? -6 : 0 },
            ]}
          >
            {s}
          </Text>
        ))}
      </View>
      <View style={styles.btnRow}>
        {onBadge ? (
          <Animated.View style={{ transform: [{ scale: btnPulse }], flex: 1 }}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={onBadge}
            >
              <Text style={styles.btnPrimaryText}>⭐ Collect Stars!</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: btnPulse }], flex: 1 }}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={onClose}
            >
              <Text style={styles.btnPrimaryText}>▶ Play Again</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
      {onBadge && (
        <Pressable onPress={onClose} style={styles.skipBtn}>
          <Text style={styles.skipText}>Play Again →</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOSE CARD
// ─────────────────────────────────────────────────────────────────────────────
function LoseCard({
  word,
  onClose,
  cardSlide,
  cardOp,
  loseTitle,
  loseSubtitle,
}) {
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(400),
      Animated.loop(
        Animated.sequence([
          Animated.timing(wobble, {
            toValue: 8,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(wobble, {
            toValue: -8,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(wobble, {
            toValue: 5,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(wobble, {
            toValue: -5,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(wobble, {
            toValue: 0,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.delay(1800),
        ]),
        { iterations: 3 },
      ),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        styles.cardLose,
        { opacity: cardOp, transform: [{ translateY: cardSlide }] },
      ]}
    >
      <View style={[styles.glowRing, styles.glowRingLose]} />
      <Animated.Text
        style={[styles.bigIcon, { transform: [{ translateX: wobble }] }]}
      >
        😢
      </Animated.Text>
      <Text style={styles.loseTitle}>{loseTitle ?? "Game Over"}</Text>
      <Text style={styles.loseSubtitle}>
        {loseSubtitle ?? "Don't give up — you'll get it next time!"}
      </Text>
      {word && (
        <View style={styles.wordRevealLose}>
          <Text style={styles.wordRevealLabel}>The word was</Text>
          <Text style={styles.wordRevealValueLose}>{word}</Text>
        </View>
      )}
      <View style={styles.tipBox}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          Try using the hints more carefully next time!
        </Text>
      </View>
      <Pressable style={[styles.btn, styles.btnRetry]} onPress={onClose}>
        <Text style={styles.btnRetryText}>↺ Try Again</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GameEnd = ({
  visible,
  onClose,
  badge,
  word,
  onBadge,
  winTitle,
  winSubtitle,
  loseTitle,
  loseSubtitle,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const cardSlide = useRef(new Animated.Value(60)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const bgOp = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const [particleKey, setParticleKey] = useState(0);

  useEffect(() => {
    if (!visible || !badge) return;
    cardSlide.setValue(60);
    cardOp.setValue(0);
    bgOp.setValue(0);
    Animated.timing(bgOp, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(cardOp, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlide, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    if (badge === "won") {
      setParticles(
        Array.from({ length: PART_CNT }, (_, i) => ({
          id: i,
          emoji: CONFETTI[i % CONFETTI.length],
          startX: SW / 2 + (Math.random() - 0.5) * 80,
          startY: SH * 0.55,
          delay: Math.random() * 400,
          size: 18 + Math.random() * 14,
        })),
      );
      setParticleKey((k) => k + 1);
    }
    playSound(badge);
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, [visible, badge]);

  const playSound = async (type) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const file =
        type === "won"
          ? require("../../assets/sounds/win.mp3")
          : require("../../assets/sounds/lose.mp3");
      const { sound } = await Audio.Sound.createAsync(file);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  };

  if (!visible || !badge) return null;

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: bgOp }]}>
        {badge === "won" &&
          particles.map((p) => (
            <Particle key={`${particleKey}-${p.id}`} {...p} />
          ))}
        {badge === "won" && (
          <Image
            source={require("../../assets/img/bird_happy.png")}
            style={[
              styles.bird,
              { width: isTablet ? 200 : 140, height: isTablet ? 200 : 140 },
            ]}
            resizeMode="contain"
          />
        )}
        {badge === "won" ? (
          <WinCard
            word={word}
            onClose={onClose}
            onBadge={onBadge}
            cardSlide={cardSlide}
            cardOp={cardOp}
            winTitle={winTitle}
            winSubtitle={winSubtitle}
          />
        ) : (
          <LoseCard
            word={word}
            onClose={onClose}
            cardSlide={cardSlide}
            cardOp={cardOp}
            loseTitle={loseTitle}
            loseSubtitle={loseSubtitle}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

export default GameEnd;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(8,8,26,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: radius.xxl, // was: 28
    padding: pad.xl, // was: 28
    width: "88%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 160,
    zIndex: 10,
  },
  cardWin: {
    backgroundColor: C.darkBg2,
    borderColor: "rgba(255,213,79,0.55)",
    shadowColor: C.yellow,
    shadowOpacity: 0.35,
  },
  cardLose: {
    backgroundColor: C.darkBg2,
    borderColor: C.redBorder,
    shadowColor: C.red,
    shadowOpacity: 0.3,
  },

  glowRing: {
    position: "absolute",
    top: 14,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  glowRingWin: {
    backgroundColor: "rgba(255,213,79,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,213,79,0.3)",
  },
  glowRingLose: {
    backgroundColor: C.redDim,
    borderWidth: 2,
    borderColor: C.redBorder,
  },

  bigIcon: { fontSize: size.iconXl + 24, marginBottom: pad.sm, zIndex: 1 }, // was: 72

  // Win
  winTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.h3, // was: 28
    color: C.yellow,
    letterSpacing: 0.4,
    marginBottom: pad.xs,
    textShadowColor: "rgba(255,213,79,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  winSubtitle: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textSec,
    textAlign: "center",
    marginBottom: pad.lg,
    lineHeight: font.md * 1.5,
  },

  // Stars
  starsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: pad.xs,
    marginBottom: pad.lg,
    marginTop: pad.xs,
  },
  starDeco: {},

  // Lose
  loseTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.h3, // was: 28
    color: C.red,
    letterSpacing: 0.4,
    marginBottom: pad.xs,
    textShadowColor: "rgba(239,83,80,0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  loseSubtitle: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textSec,
    textAlign: "center",
    marginBottom: pad.lg,
    lineHeight: font.md * 1.5,
  },

  // Tip box
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,213,79,0.07)",
    borderRadius: radius.md, // was: 12
    borderWidth: 1,
    borderColor: "rgba(255,213,79,0.2)",
    padding: pad.sm, // was: 12
    gap: pad.sm, // was: 10
    marginBottom: pad.lg,
    width: "100%",
  },
  tipIcon: { fontSize: font.lg },
  tipText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.sm,
    color: C.textSec,
    lineHeight: font.sm * 1.5,
  },

  // Word reveal
  wordRevealWin: {
    backgroundColor: C.yellowDim,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: pad.lg,
    paddingVertical: pad.sm,
    alignItems: "center",
    marginBottom: pad.md,
    width: "100%",
  },
  wordRevealLose: {
    backgroundColor: C.redDim,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.redBorder,
    paddingHorizontal: pad.lg,
    paddingVertical: pad.sm,
    alignItems: "center",
    marginBottom: pad.md,
    width: "100%",
  },
  wordRevealLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: C.textMuted, // was: 11
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: pad.xs,
  },
  wordRevealValueWin: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    color: C.yellow, // was: 26
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(255,213,79,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  wordRevealValueLose: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    color: C.red, // was: 26
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(239,83,80,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  // Buttons
  btnRow: { flexDirection: "row", width: "100%", gap: pad.sm },
  btn: {
    borderRadius: radius.pill,
    paddingVertical: pad.md,
    alignItems: "center",
    width: "100%",
  }, // was: 28, 15
  btnPrimary: {
    backgroundColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 8,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.bg,
    letterSpacing: 0.4,
  }, // was: 16
  btnRetry: {
    backgroundColor: "rgba(239,83,80,0.15)",
    borderWidth: 1.5,
    borderColor: C.redBorder,
    width: "100%",
  },
  btnRetryText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.red,
    letterSpacing: 0.3,
  }, // was: 16
  skipBtn: {
    marginTop: pad.sm,
    paddingVertical: pad.xs,
    paddingHorizontal: pad.sm,
  },
  skipText: { fontFamily: FONTS.light, fontSize: font.sm, color: C.textMuted }, // was: 13

  bird: { position: "absolute", bottom: 40, alignSelf: "center" },
});
