// components/BadgePopup.jsx

import React, { useRef, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  Image,
} from "react-native";
import { Audio } from "expo-av";
import { COLORS, FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens"; // ← ADD
import { Image as ExpoImage } from "expo-image";

const { width: SW, height: SH } = Dimensions.get("window");

const BADGE_CONFIGS = {
  first_story: {
    icon: "📖",
    title: "First Story Complete!",
    description: "You finished your very first story!",
    accentColor: COLORS.pink ?? "#FF6B9D",
    sourceLabel: "Story",
    sourceIcon: "📚",
    rewardLabel: "Stars",
    rewardAmount: 300,
    nextLabel: "Guess the Word",
    nextSub: "Word Challenge",
    nextImage: require("../../assets/img/guess-word.jpeg"),
  },
  first_ten_story: {
    icon: "🏆",
    title: "Story Completed!",
    description: "Amazing! You finished the story!",
    accentColor: COLORS.teal,
    sourceLabel: "Story",
    sourceIcon: "📚",
    rewardLabel: "Stars",
    rewardAmount: 300,
    nextLabel: "Guess the Word",
    nextSub: "Word Challenge",
    nextImage: require("../../assets/img/guess-word.jpeg"),
  },
  word_guess_won: {
    icon: "🎯",
    title: "Word Cracked!",
    description: "You guessed the word correctly!",
    accentColor: "#00BCD4",
    sourceLabel: "Game",
    sourceIcon: null,
    sourceImage: require("../../assets/img/guess_icon.png"),
    rewardLabel: "Stars",
    rewardAmount: 200,
    nextLabel: "Listen Quest!",
    nextSub: "Listen. Think. Choose.",
    nextImage: require("../../assets/img/listen_icon.png"),
  },
  describe_won: {
    icon: "🧠",
    title: "Perfect Descriptions!",
    description: "You matched all 3 correct answers!",
    accentColor: "#9652D9",
    sourceLabel: "Game",
    sourceIcon: null,
    sourceImage: require("../../assets/img/describe_icon.png"),
    rewardLabel: "Stars",
    rewardAmount: 150,
    nextLabel: "Guess the Word",
    nextSub: "Word Challenge",
    nextImage: require("../../assets/img/guess-word.jpeg"),
  },
  game_won: {
    icon: "🌟",
    title: "Challenge Complete!",
    description: "Incredible! You finished the challenge!",
    accentColor: "#FFD54F",
    sourceLabel: "Game",
    sourceIcon: "🎮",
    rewardLabel: "Stars",
    rewardAmount: 200,
    nextLabel: "Next Challenge",
    nextSub: "Keep it going!",
    nextImage: null,
    nextEmoji: "🚀",
  },
  article_quiz_won: {
    icon: "🎧",
    title: "Listening Champion!",
    description: "You aced the listening quiz!",
    accentColor: "#00BCD4",
    sourceLabel: "Listen",
    sourceIcon: null,
    sourceImage: require("../../assets/img/listen_icon.png"),
    rewardLabel: "Stars",
    rewardAmount: 250,
    nextLabel: "Spot the Truth",
    nextSub: "Choose what's true.",
    nextImage: require("../../assets/img/describe_icon.png"),
  },
};

const COIN_COUNT = 10;
const PART_CNT = 28;
const EMOJIS = ["🎉", "⭐", "🌟", "✨", "🎊", "💫", "🎈", "❤️", "🥳", "🌈"];

const CARD_PADDING = 22;
const ICON_BOX = 108;
const ARROW_ZONE = 60;
const ROW_TOTAL = ICON_BOX + 8 + ARROW_ZONE + 8 + ICON_BOX;
const ROW_LEFT_X = (SW - ROW_TOTAL) / 2;
const SOURCE_CTR_X = ROW_LEFT_X + ICON_BOX / 2;
const WALLET_CTR_X = ROW_LEFT_X + ICON_BOX + 8 + ARROW_ZONE + 8 + ICON_BOX / 2;

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
    const dx = (Math.random() - 0.5) * SW * 1.5;
    const dy = -(Math.random() * SH * 0.7 + 80);
    const duration = 1300 + Math.random() * 700;
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
          duration: 120,
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
          Animated.delay(duration * 0.55),
          Animated.timing(op, {
            toValue: 0,
            duration: duration * 0.45,
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
// COIN
// ─────────────────────────────────────────────────────────────────────────────
function Coin({ fromX, fromY, toX, toY, delay, onLand }) {
  const progress = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.6)).current;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [fromX - 11, toX - 11],
  });
  const peakY = Math.min(fromY, toY) - 130;
  const translateY = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [fromY - 11, peakY, toY - 11],
    extrapolate: "clamp",
  });
  useEffect(() => {
    const duration = 700 + Math.random() * 200;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(sc, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(op, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
      onLand?.();
    });
  }, []);
  return (
    <Animated.Image
      source={require("../../assets/img/coin.png")}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 28,
        height: 28,
        opacity: op,
        zIndex: 300,
        pointerEvents: "none",
        transform: [{ translateX }, { translateY }, { scale: sc }],
      }}
      resizeMode="contain"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const BadgePopup = ({
  visible,
  onClose,
  onPlay,
  badge,
  finishMode = false,
}) => {
  const cfg = BADGE_CONFIGS[badge];

  const slideAnim = useRef(new Animated.Value(400)).current;
  const birdBounce = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const sourceScale = useRef(new Animated.Value(0)).current;
  const walletScale = useRef(new Animated.Value(0)).current;
  const sourcePulse = useRef(new Animated.Value(1)).current;
  const walletShake = useRef(new Animated.Value(0)).current;
  const accentPulse = useRef(new Animated.Value(0.6)).current;
  const rewardRowOp = useRef(new Animated.Value(1)).current;
  const challengeOp = useRef(new Animated.Value(0)).current;
  const challengeSlide = useRef(new Animated.Value(30)).current;
  const playPulse = useRef(new Animated.Value(1)).current;
  const playGlow = useRef(new Animated.Value(0.4)).current;

  const bounceLoop = useRef(null);
  const sourcePulseLoop = useRef(null);
  const playLoop = useRef(null);
  const soundRef = useRef(null);
  const coinLanded = useRef(0);
  const cardLayoutY = useRef(null);

  const [particles, setParticles] = useState([]);
  const [particleKey, setParticleKey] = useState(0);
  const [coins, setCoins] = useState([]);
  const [rewardCount, setRewardCount] = useState(0);
  const [panel, setPanel] = useState("reward");

  useEffect(() => {
    if (!visible || !cfg) return;
    slideAnim.setValue(400);
    birdBounce.setValue(1);
    cardOpacity.setValue(0);
    cardSlide.setValue(40);
    sourceScale.setValue(0);
    walletScale.setValue(0);
    sourcePulse.setValue(1);
    walletShake.setValue(0);
    accentPulse.setValue(0.6);
    rewardRowOp.setValue(1);
    challengeOp.setValue(0);
    challengeSlide.setValue(30);
    playPulse.setValue(1);
    playGlow.setValue(0.4);
    setRewardCount(0);
    setCoins([]);
    setPanel("reward");
    coinLanded.current = 0;
    cardLayoutY.current = null;

    setParticles(
      Array.from({ length: PART_CNT }, (_, i) => ({
        id: i,
        emoji: EMOJIS[i % EMOJIS.length],
        startX: SW / 2 + (Math.random() - 0.5) * 70,
        startY: SH * 0.68,
        delay: Math.random() * 500,
        size: 20 + Math.random() * 14,
      })),
    );
    setParticleKey((k) => k + 1);

    Animated.loop(
      Animated.sequence([
        Animated.timing(accentPulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(accentPulse, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    playSound();
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 4,
      bounciness: 14,
    }).start(() => {
      bounceLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(birdBounce, {
            toValue: 1.07,
            duration: 520,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(birdBounce, {
            toValue: 1.0,
            duration: 520,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      bounceLoop.current.start();
    });

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(cardOpacity, {
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

    Animated.sequence([
      Animated.delay(650),
      Animated.parallel([
        Animated.spring(sourceScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.spring(walletScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      sourcePulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(sourcePulse, {
            toValue: 1.15,
            duration: 380,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sourcePulse, {
            toValue: 1.0,
            duration: 380,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      sourcePulseLoop.current.start();
      setTimeout(spawnCoins, 800);
    });
  }, [visible]);

  const spawnCoins = () => {
    const cardTop = cardLayoutY.current ?? SH / 2 - 260;
    const coinY = cardTop + CARD_PADDING + 70 + 29 + 4 + ICON_BOX / 2;
    setCoins(
      Array.from({ length: COIN_COUNT }, (_, i) => ({
        id: i,
        fromX: SOURCE_CTR_X,
        fromY: coinY,
        toX: WALLET_CTR_X,
        toY: coinY,
        delay: i * 130,
      })),
    );
    let count = 0;
    const step = cfg.rewardAmount / COIN_COUNT;
    const ticker = setInterval(() => {
      count += step;
      setRewardCount(Math.min(Math.round(count), cfg.rewardAmount));
      if (count >= cfg.rewardAmount) clearInterval(ticker);
    }, 130);
  };

  const handleCoinLand = () => {
    coinLanded.current += 1;
    Animated.sequence([
      Animated.timing(walletShake, {
        toValue: 8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(walletShake, {
        toValue: -8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(walletShake, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();
    if (coinLanded.current === COIN_COUNT) {
      sourcePulseLoop.current?.stop();
      setTimeout(transitionToChallenge, 700);
    }
  };

  const transitionToChallenge = () => {
    Animated.timing(rewardRowOp, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setPanel("challenge");
      Animated.parallel([
        Animated.timing(challengeOp, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.spring(challengeSlide, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start(() => {
        playLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(playPulse, {
              toValue: 1.13,
              duration: 580,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(playPulse, {
              toValue: 1.0,
              duration: 580,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );
        playLoop.current.start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(playGlow, {
              toValue: 1,
              duration: 680,
              useNativeDriver: true,
            }),
            Animated.timing(playGlow, {
              toValue: 0.3,
              duration: 680,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      });
    });
  };

  useEffect(() => {
    if (!visible) {
      bounceLoop.current?.stop();
      sourcePulseLoop.current?.stop();
      playLoop.current?.stop();
    }
  }, [visible]);
  useEffect(
    () => () => {
      soundRef.current?.unloadAsync();
      bounceLoop.current?.stop();
      sourcePulseLoop.current?.stop();
      playLoop.current?.stop();
    },
    [],
  );

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/badge-won.mp3"),
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  };

  if (!visible || !cfg) return null;
  const accent = cfg.accentColor;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {particles.map((p) => (
          <Particle key={`${particleKey}-${p.id}`} {...p} />
        ))}
        {coins.map((c) => (
          <Coin key={c.id} {...c} onLand={handleCoinLand} />
        ))}

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardSlide }],
              borderColor: accent + "99",
              shadowColor: accent,
            },
          ]}
          onLayout={(e) => {
            cardLayoutY.current = e.nativeEvent.layout.y;
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: accent + "22", borderColor: accent + "66" },
              ]}
            >
              <Text style={styles.headerIcon}>{cfg.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: accent }]}>{cfg.title}</Text>
              <Text style={styles.description}>{cfg.description}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Reward panel */}
          {panel === "reward" && (
            <Animated.View style={{ opacity: rewardRowOp }}>
              <View style={styles.rewardRow}>
                <View style={styles.iconCol}>
                  <Animated.View
                    style={[
                      styles.iconBox,
                      styles.sourceBox,
                      {
                        transform: [
                          {
                            scale: Animated.multiply(sourceScale, sourcePulse),
                          },
                        ],
                      },
                    ]}
                  >
                    {cfg.sourceImage ? (
                      <ExpoImage
                        source={cfg.sourceImage}
                        style={styles.bigIconImg}
                        contentFit="contain"
                      />
                    ) : (
                      <Text style={styles.bigIcon}>{cfg.sourceIcon}</Text>
                    )}
                  </Animated.View>
                  <Text style={styles.iconLabel}>{cfg.sourceLabel}</Text>
                </View>
                <View style={styles.arrowTrail}>
                  {[0, 1, 2].map((i) => (
                    <Text
                      key={i}
                      style={[
                        styles.arrowChar,
                        { color: accent, opacity: coins.length > 0 ? 1 : 0.25 },
                      ]}
                    >
                      ›
                    </Text>
                  ))}
                </View>
                <View style={styles.iconCol}>
                  <View>
                    <Animated.View
                      style={[
                        styles.iconBox,
                        styles.walletBox,
                        {
                          transform: [
                            { scale: walletScale },
                            { translateX: walletShake },
                          ],
                        },
                      ]}
                    >
                      <ExpoImage
                        source={require("../../assets/img/bag.png")}
                        style={{ width: 70, height: 70 }}
                        contentFit="contain"
                      />
                    </Animated.View>
                    {rewardCount > 0 && (
                      <View style={styles.counterBadge}>
                        <Text style={styles.counterText}>+{rewardCount}</Text>
                        <Text style={styles.counterStar}>⭐</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.iconLabel}>{cfg.rewardLabel}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip →</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Challenge panel */}
          {panel === "challenge" && (
            <Animated.View
              style={[
                styles.challengeSection,
                {
                  opacity: challengeOp,
                  transform: [{ translateY: challengeSlide }],
                },
              ]}
            >
              {finishMode ? (
                <>
                  <Text style={styles.challengeHeadline}>🎉 All Done!</Text>
                  <Text style={styles.finishSubtitle}>
                    Amazing work — you've completed everything!
                  </Text>
                  <View
                    style={{
                      alignItems: "center",
                      marginBottom: pad.xs,
                      width: "100%",
                    }}
                  >
                    <Animated.View
                      style={[
                        styles.playGlowRing,
                        { opacity: playGlow, backgroundColor: accent },
                      ]}
                    />
                    <Animated.View
                      style={{
                        transform: [{ scale: playPulse }],
                        width: "100%",
                      }}
                    >
                      <Pressable
                        style={[
                          styles.playBtn,
                          styles.finishBtn,
                          { backgroundColor: accent },
                        ]}
                        onPress={onClose}
                      >
                        <Text style={styles.playBtnIcon}>🏁</Text>
                        <Text style={styles.playBtnText}>Finish</Text>
                      </Pressable>
                    </Animated.View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.challengeHeadline}>
                    🔥 Next Challenge
                  </Text>
                  <View style={styles.gameThumb}>
                    {cfg.nextImage ? (
                      <ExpoImage
                        source={cfg.nextImage}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: radius.md,
                        }}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.gameThumbEmojiBg}>
                        <Text style={{ fontSize: font.h3 }}>
                          {cfg.nextEmoji ?? "🎮"}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gameThumbTitle, { color: accent }]}>
                        {cfg.nextLabel}
                      </Text>
                      <Text style={styles.gameThumbSub}>{cfg.nextSub}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "center", marginBottom: pad.xs }}>
                    <Animated.View
                      style={[
                        styles.playGlowRing,
                        { opacity: playGlow, backgroundColor: accent },
                      ]}
                    />
                    <Animated.View
                      style={{ transform: [{ scale: playPulse }] }}
                    >
                      <Pressable
                        style={[styles.playBtn, { backgroundColor: accent }]}
                        onPress={onPlay}
                      >
                        <Text style={styles.playBtnText}>Play</Text>
                      </Pressable>
                    </Animated.View>
                  </View>
                  <Pressable onPress={onClose} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Maybe later</Text>
                  </Pressable>
                </>
              )}
            </Animated.View>
          )}
        </Animated.View>

        <Animated.Image
          source={require("../../assets/img/minion.png")}
          style={[
            styles.bird,
            { transform: [{ translateY: slideAnim }, { scale: birdBounce }] },
          ]}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

export default BadgePopup;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(8,8,22,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.darkBg2,
    borderRadius: radius.xxl, // was: 26
    padding: CARD_PADDING,
    width: "91%",
    maxWidth: 420,
    marginBottom: 175,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.sm,
    marginBottom: pad.xs,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: { fontSize: font.h3 }, // was: 34
  title: { fontFamily: FONTS.bold, fontSize: font.xl, letterSpacing: 0.2 }, // was: 20
  description: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: COLORS.textMuted,
    marginTop: 3,
  }, // was: 13
  divider: {
    height: 1,
    backgroundColor: COLORS.borderTeal,
    marginVertical: pad.sm,
  },

  // Reward row
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: pad.s,
    paddingVertical: pad.xs,
  },
  iconCol: { alignItems: "center", gap: pad.s },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceBox: {
    backgroundColor: "rgba(0,188,212,0.12)",
    borderWidth: 2,
    borderColor: COLORS.teal,
  },
  walletBox: {
    backgroundColor: "rgba(255,213,79,0.12)",
    borderWidth: 2,
    borderColor: COLORS.yellow,
  },
  bigIcon: { fontSize: font.h1 }, // was: 58
  bigIconImg: { width: 62, height: 62 },
  iconLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  }, // was: 11
  arrowTrail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: -2,
  },
  arrowChar: { fontFamily: FONTS.bold, fontSize: font.h3 }, // was: 30

  counterBadge: {
    position: "absolute",
    top: -20,
    right: -32,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.darkBg,
    borderRadius: radius.pill,
    paddingHorizontal: pad.s,
    paddingVertical: pad.xs,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    gap: 3,
    zIndex: 10,
  },
  counterText: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: COLORS.yellow,
  }, // was: 19
  counterStar: { fontSize: font.md },

  // Challenge panel
  challengeSection: { alignItems: "center" },
  challengeHeadline: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: COLORS.textPrimary,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: pad.sm,
  }, // was: 22
  gameThumb: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    backgroundColor: COLORS.surfaceDim,
    borderRadius: radius.lg, // was: 16
    borderWidth: 1.5,
    borderColor: COLORS.borderTealBold,
    padding: pad.sm, // was: 14
    marginBottom: pad.lg,
    gap: pad.md,
  },
  gameThumbEmojiBg: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  gameThumbTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    letterSpacing: 0.3,
  }, // was: 17
  gameThumbSub: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: COLORS.textMuted,
    marginTop: 3,
  }, // was: 12

  playGlowRing: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 50,
    zIndex: -1,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: pad.md, // was: 14
    paddingHorizontal: pad.xxl, // was: 38
    borderRadius: radius.pill, // was: 40
    gap: pad.sm,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 10,
  },
  playBtnIcon: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: COLORS.darkBg,
  }, // was: 20
  playBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: COLORS.darkBg,
    letterSpacing: 0.4,
  }, // was: 18

  skipBtn: {
    marginTop: pad.sm,
    alignSelf: "center",
    paddingVertical: pad.xs,
    paddingHorizontal: pad.sm,
  },
  skipText: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: COLORS.textMuted,
  }, // was: 13

  finishBtn: { width: "100%", justifyContent: "center" },
  finishSubtitle: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: font.md * 1.5,
    marginBottom: pad.lg,
  }, // was: 14

  bird: {
    position: "absolute",
    bottom: 62,
    alignSelf: "center",
    width: 250,
    height: 250,
  },
});
