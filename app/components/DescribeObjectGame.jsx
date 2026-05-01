// components/DescribeObjectGame.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { useStoryActivity, ACTIVITY } from "../_contexts/StoryActivityContext";
import OBJECTS from "../data/describeObjects.json";
import BadgePopup from "./BadgePopup";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens"; // ← ADD

const { width: SW } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const C = {
  bg: "#08081a",
  surface: "rgba(255,255,255,0.05)",
  surfaceDim: "rgba(255,255,255,0.09)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  tealBold: "rgba(0,188,212,0.65)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.12)",
  yellowBorder: "rgba(255,213,79,0.55)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.18)",
  greenBorder: "rgba(76,175,80,0.6)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.15)",
  redBorder: "rgba(239,83,80,0.55)",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.18)",
  purpleBorder: "rgba(150,82,217,0.4)",
  white: "#FFFFFF",
  textPri: "#FFFFFF",
  textSec: "#B0BEC5",
  textMuted: "#546E7A",
};

const CORRECT_NEEDED = 3;
const COINS_PER_CORRECT = 6;

// ─────────────────────────────────────────────────────────────────────────────
// FLYING COIN
// ─────────────────────────────────────────────────────────────────────────────
function FlyingCoin({ fromX, fromY, toX, toY, delay, onLand }) {
  const animX = useRef(new Animated.Value(fromX - 14)).current;
  const animY = useRef(new Animated.Value(fromY - 14)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const duration = 480 + Math.random() * 160;
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
        Animated.timing(animX, {
          toValue: toX - 14,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: toY - 14,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(op, {
        toValue: 0,
        duration: 100,
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
        zIndex: 500,
        pointerEvents: "none",
        transform: [
          { translateX: animX },
          { translateY: animY },
          { scale: sc },
        ],
      }}
      resizeMode="contain"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION CARD
// ─────────────────────────────────────────────────────────────────────────────
function OptionCard({
  option,
  state,
  onPress,
  onSpeak,
  cardRef,
  index,
  revealed,
  speaking,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const speakerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 350,
        delay: index * 70,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (speaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(speakerPulse, {
            toValue: 1.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(speakerPulse, {
            toValue: 1.0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      speakerPulse.setValue(1);
    }
  }, [speaking]);

  const handlePress = () => {
    if (state !== "idle" || revealed) return;
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.93,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onPress(option);
  };

  let bg = C.surfaceDim,
    border = "rgba(255,255,255,0.08)",
    textColor = C.textSec,
    icon = null;
  if (state === "correct") {
    bg = C.greenDim;
    border = C.greenBorder;
    textColor = C.green;
    icon = "✓";
  } else if (state === "wrong") {
    bg = C.redDim;
    border = C.redBorder;
    textColor = C.red;
    icon = "✗";
  } else if (state === "missed" && revealed) {
    bg = "rgba(255,213,79,0.08)";
    border = C.yellowBorder;
    textColor = C.yellow;
    icon = "!";
  }

  return (
    <Animated.View
      ref={cardRef}
      style={{
        opacity: fadeIn,
        transform: [{ translateX: slideIn }, { scale }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.optionCard,
          { backgroundColor: bg, borderColor: border },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
        disabled={state !== "idle" || revealed}
      >
        <View style={[styles.optionBullet, { borderColor: border }]}>
          {icon ? (
            <Text style={[styles.optionBulletIcon, { color: textColor }]}>
              {icon}
            </Text>
          ) : (
            <Text style={styles.optionBulletLetter}>
              {String.fromCharCode(65 + index)}
            </Text>
          )}
        </View>
        <Text style={[styles.optionText, { color: textColor }]}>
          {option.text}
        </Text>
        <TouchableOpacity
          style={[styles.speakerBtn, speaking && styles.speakerBtnActive]}
          onPress={() => onSpeak(option.text)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Animated.Text
            style={[
              styles.speakerIcon,
              speaking && { color: C.teal },
              { transform: [{ scale: speakerPulse }] },
            ]}
          >
            {speaking ? "🔊" : "🔈"}
          </Animated.Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: current / total,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [current]);
  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function ResultScreen({ score, total, onReplay, onExit }) {
  const scaleA = useRef(new Animated.Value(0.7)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleA, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🌟" : pct >= 40 ? "👍" : "💪";
  const msg =
    pct === 100
      ? "Perfect Score!"
      : pct >= 70
        ? "Great Job!"
        : pct >= 40
          ? "Good Effort!"
          : "Keep Practising!";
  return (
    <Animated.View
      style={[
        styles.resultCard,
        { opacity: op, transform: [{ scale: scaleA }] },
      ]}
    >
      <Text style={styles.resultEmoji}>{emoji}</Text>
      <Text style={styles.resultMsg}>{msg}</Text>
      <View style={styles.resultScoreRow}>
        <Text style={styles.resultScore}>{score}</Text>
        <Text style={styles.resultScoreOf}>/ {total}</Text>
      </View>
      <Text style={styles.resultPct}>{pct}% correct</Text>
      <View style={styles.resultBtns}>
        <TouchableOpacity
          style={styles.replayBtn}
          onPress={onReplay}
          activeOpacity={0.85}
        >
          <Text style={styles.replayBtnText}>▶ Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exitResultBtn}
          onPress={() => onExit?.()}
          activeOpacity={0.75}
        >
          <Text style={styles.exitResultBtnText}>✕ Exit</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GAME
// ─────────────────────────────────────────────────────────────────────────────
const DescribeObjectGame = ({ onExit }) => {
  const router = useRouter();
  const { storySession, completeActivity } = useStoryActivity();

  const objectPool = (() => {
    const snap = storySession?.activityDataSnapshot?.understanding;
    if (snap && snap.length > 0) return snap;
    return OBJECTS;
  })();
  const doExit = () => {
    Speech.stop();
    if (typeof onExit === "function") onExit();
    else router.dismiss(2);
  };

  const [queue, setQueue] = useState(() => shuffle(objectPool).slice(0, 3));
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const totalCoinsRef = useRef(0);
  const finalScoreRef = useRef(0);

  const [options, setOptions] = useState([]);
  const [optionStates, setOptionStates] = useState({});
  const [correctFound, setCorrectFound] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [flyingCoins, setFlyingCoins] = useState([]);
  const coinIdRef = useRef(0);
  const scoreBadgeRef = useRef(null);
  const optionRefs = useRef({});

  const badgeScale = useRef(new Animated.Value(1)).current;
  const badgeShake = useRef(new Animated.Value(0)).current;
  const objectScale = useRef(new Animated.Value(0.5)).current;
  const objectOp = useRef(new Animated.Value(0)).current;
  const emojiPulse = useRef(new Animated.Value(1)).current;
  const titleSlide = useRef(new Animated.Value(-20)).current;
  const titleOp = useRef(new Animated.Value(0)).current;

  const soundRef = useRef(null);
  const sndButton = useRef(null);
  const pulseLoop = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/button.mp3"),
        );
        if (alive) sndButton.current = sound;
        else sound.unloadAsync();
      } catch (_) {}
    })();
    return () => {
      alive = false;
      sndButton.current?.unloadAsync();
      sndButton.current = null;
    };
  }, []);

  const playButtonSound = () => {
    try {
      sndButton.current
        ?.setPositionAsync(0)
        .then(() => sndButton.current?.playAsync());
    } catch (_) {}
  };
  const autoAdvanceTimer = useRef(null);
  const pageSlide = useRef(new Animated.Value(0)).current;
  const pageOp = useRef(new Animated.Value(1)).current;
  const current = queue[qIndex];

  useEffect(() => {
    if (!current) return;
    Speech.stop();
    setSpeakingId(null);
    objectScale.setValue(0.5);
    objectOp.setValue(0);
    titleSlide.setValue(-20);
    titleOp.setValue(0);
    emojiPulse.setValue(1);
    const shuffled = shuffle(current.options);
    setOptions(shuffled);
    setOptionStates(Object.fromEntries(shuffled.map((o) => [o.id, "idle"])));
    setCorrectFound(0);
    setRevealed(false);
    setFlyingCoins([]);
    optionRefs.current = {};
    Animated.parallel([
      Animated.spring(objectScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(objectOp, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(titleSlide, {
        toValue: 0,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(titleOp, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => startEmojiPulse());
  }, [qIndex, queue]);

  const startEmojiPulse = () => {
    pulseLoop.current?.stop();
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(emojiPulse, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(emojiPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.current.start();
  };

  useEffect(
    () => () => {
      pulseLoop.current?.stop();
      soundRef.current?.unloadAsync();
      Speech.stop();
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    },
    [],
  );

  const handleSpeak = (text, optionId) => {
    if (speakingId === optionId) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(optionId);
    Speech.speak(text, {
      language: "en",
      pitch: 1,
      rate: 0.9,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const spawnCoins = (optionId) => {
    const cardRef = optionRefs.current[optionId];
    if (!cardRef?.current) return;
    cardRef.current.measureInWindow((fx, fy, fw, fh) => {
      const fromX = fx + fw / 2;
      const fromY = fy + fh / 2;
      scoreBadgeRef.current?.measureInWindow((bx, by, bw, bh) => {
        const toX = bx + bw / 2;
        const toY = by + bh / 2;
        const newCoins = Array.from({ length: COINS_PER_CORRECT }, (_, i) => ({
          id: coinIdRef.current++,
          fromX,
          fromY,
          toX,
          toY,
          delay: i * 70,
        }));
        setFlyingCoins((prev) => [...prev, ...newCoins]);
      });
    });
  };

  const handleCoinLand = (coinId) => {
    setFlyingCoins((prev) => prev.filter((c) => c.id !== coinId));

    totalCoinsRef.current += 1;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1.25,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(badgeShake, {
          toValue: 5,
          duration: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(badgeShake, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleOptionPress = (option) => {
    if (revealed) return;
    const isCorrect = option.correct;
    setOptionStates((prev) => ({
      ...prev,
      [option.id]: isCorrect ? "correct" : "wrong",
    }));
    if (isCorrect) {
      playSound("correct");
      spawnCoins(option.id);
      setCorrectFound((prev) => {
        const next = prev + 1;
        if (next === CORRECT_NEEDED) {
          setScore((s) => s + 1);
          setTimeout(() => revealAll(), 300);
          autoAdvanceTimer.current = setTimeout(() => handleNext(), 1400);
        }
        return next;
      });
    } else {
      playSound("wrong");
      setTimeout(() => revealAll(), 400);
      autoAdvanceTimer.current = setTimeout(() => slideToNext(), 1800);
    }
  };

  const revealAll = () => {
    pulseLoop.current?.stop();
    Speech.stop();
    setSpeakingId(null);
    setRevealed(true);
    setOptionStates((prev) => {
      const next = { ...prev };
      options.forEach((o) => {
        if (next[o.id] === "idle") next[o.id] = o.correct ? "missed" : "idle";
      });
      return next;
    });
  };

  const slideToNext = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(pageSlide, {
        toValue: -SW,
        duration: 280,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageOp, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      pageSlide.setValue(SW);
      pageOp.setValue(1);
      if (qIndex + 1 >= queue.length) {
        setTimeout(async () => {
          setScore((finalScore) => {
            finalScoreRef.current = finalScore;
            return finalScore;
          });
          const isWin = finalScoreRef.current === queue.length;
          if (isWin) {
            await completeActivity(
              ACTIVITY.WORD_UNDERSTANDING_CHALLENGE,
              { score: finalScoreRef.current },
              { coins: totalCoinsRef.current, diamonds: 3 },
            );
            setBadgeVisible(true);
          } else {
            setShowResult(true);
          }
        }, 0);
      } else {
        setQIndex((i) => i + 1);
      }
      Animated.spring(pageSlide, {
        toValue: 0,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = slideToNext;

  const handleReplay = () => {
    totalCoinsRef.current = 0;
    pageSlide.setValue(0);
    pageOp.setValue(1);
    setQueue(shuffle(objectPool).slice(0, 3));
    setQIndex(0);
    setScore(0);
    setShowResult(false);
    setBadgeVisible(false);
  };

  const playSound = async (type) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const file =
        type === "correct"
          ? require("../../assets/sounds/correct.mp3")
          : require("../../assets/sounds/incorrect.mp3");
      const { sound } = await Audio.Sound.createAsync(file);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  };

  if (badgeVisible || isDismissing) {
    return (
      <View style={styles.root}>
        <BadgePopup
          visible={badgeVisible}
          badge="describe_won"
          finishMode={true}
          onClose={() => {
            setIsDismissing(true);
            setBadgeVisible(false);
            // Delay lets BadgePopup exit animation finish cleanly before nav
            setTimeout(() => router.dismiss(2), 120);
          }}
          onPlay={() => {
            setBadgeVisible(false);
            setIsDismissing(false);
            handleReplay();
          }}
          coinsEarned={totalCoinsRef.current}
        />
      </View>
    );
  }

  if (showResult) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={() => {
              playButtonSound();
              doExit();
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.exitIcon}>✕</Text>
            <Text style={styles.exitText}>Exit</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Describe It!</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.resultContainer}>
          <ResultScreen
            score={score}
            total={queue.length}
            onReplay={() => {
              playButtonSound();
              handleReplay();
            }}
            onExit={() => {
              playButtonSound();
              // Small delay prevents the broken screen flash on navigate back
              setTimeout(() => doExit(), 60);
            }}
          />
        </View>
      </View>
    );
  }

  if (!current) return null;
  const allCorrectFound = correctFound === CORRECT_NEEDED;

  return (
    <View style={styles.root}>
      {flyingCoins.map((c) => (
        <FlyingCoin key={c.id} {...c} onLand={() => handleCoinLand(c.id)} />
      ))}

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.exitBtn}
          onPress={() => {
            playButtonSound();
            doExit();
          }}
          activeOpacity={0.75}
        >
          <Text style={styles.exitIcon}>✕</Text>
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Describe It!</Text>
        <Animated.View
          ref={scoreBadgeRef}
          style={[
            styles.coinBadge,
            { transform: [{ scale: badgeScale }, { translateX: badgeShake }] },
          ]}
        >
          <ExpoImage
            source={require("../../assets/img/coin.png")}
            style={styles.coinIcon}
            contentFit="contain"
          />
          <Text style={styles.coinCount}> {totalCoinsRef.current}</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: pageSlide }],
          opacity: pageOp,
        }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {qIndex + 1} / {queue.length}
            </Text>
            <View style={{ flex: 1, marginLeft: pad.sm }}>
              <ProgressBar current={qIndex + 1} total={queue.length} />
            </View>
          </View>

          <Animated.View
            style={[
              styles.objectCard,
              { opacity: objectOp, transform: [{ scale: objectScale }] },
            ]}
          >
            <View style={styles.objectGlowRing}>
              <Animated.Text
                style={[
                  styles.objectEmoji,
                  { transform: [{ scale: emojiPulse }] },
                ]}
              >
                {current.emoji}
              </Animated.Text>
            </View>
            <Animated.Text
              style={[
                styles.objectName,
                { opacity: titleOp, transform: [{ translateY: titleSlide }] },
              ]}
            >
              {current.object}
            </Animated.Text>
          </Animated.View>

          <View style={styles.instructionRow}>
            <View style={styles.instructionBadge}>
              <Text style={styles.instructionBadgeText}>Pick 3</Text>
            </View>
            <Text style={styles.instructionText}>
              Select <Text style={styles.instructionHighlight}>3 correct</Text>{" "}
              descriptions of{" "}
              <Text style={styles.instructionHighlight}>{current.object}</Text>
            </Text>
          </View>

          <View style={styles.trackerRow}>
            {Array.from({ length: CORRECT_NEEDED }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.trackerDot,
                  i < correctFound
                    ? styles.trackerDotFilled
                    : styles.trackerDotEmpty,
                ]}
              >
                {i < correctFound && <Text style={styles.trackerCheck}>✓</Text>}
              </View>
            ))}
            <Text style={styles.trackerLabel}>
              {correctFound}/{CORRECT_NEEDED} found
            </Text>
          </View>

          <View style={styles.optionsList}>
            {options.map((opt, i) => {
              if (!optionRefs.current[opt.id])
                optionRefs.current[opt.id] = React.createRef();
              return (
                <OptionCard
                  key={opt.id}
                  option={opt}
                  state={optionStates[opt.id]}
                  onPress={handleOptionPress}
                  onSpeak={(text) => handleSpeak(text, opt.id)}
                  speaking={speakingId === opt.id}
                  index={i}
                  revealed={revealed}
                  cardRef={optionRefs.current[opt.id]}
                />
              );
            })}
          </View>

          <View style={styles.ttsHint}>
            <Text style={styles.ttsHintText}>
              🔈 Tap the speaker on any option to hear it read aloud
            </Text>
          </View>

          {revealed && (
            <Animated.View
              style={[
                styles.feedbackBanner,
                allCorrectFound ? styles.feedbackWin : styles.feedbackLose,
              ]}
            >
              <Text style={styles.feedbackIcon}>
                {allCorrectFound ? "🎉" : "😅"}
              </Text>
              <Text
                style={[
                  styles.feedbackText,
                  { color: allCorrectFound ? C.green : C.red },
                ]}
              >
                {allCorrectFound
                  ? "All 3 correct! Moving on…"
                  : "Wrong choice — moving on…"}
              </Text>
            </Animated.View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default DescribeObjectGame;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center", paddingBottom: 20 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: pad.md, // was: 18
    paddingTop: STATUS_BAR_HEIGHT + pad.sm, // was: + 10
    paddingBottom: pad.sm,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.xs,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.lg, // was: 18
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
    width: 70,
  },
  exitIcon: { fontFamily: FONTS.bold, fontSize: font.s, color: C.textMuted }, // was: 11
  exitText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.textSec }, // was: 12
  topTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.teal,
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  }, // was: 18
  scorePill: {
    backgroundColor: C.yellowDim,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    width: 70,
    alignItems: "center",
  },
  scoreText: { fontFamily: FONTS.bold, fontSize: font.md, color: C.yellow }, // was: 14

  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.xs,
    backgroundColor: C.yellowDim,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  coinIcon: { width: size.iconSm, height: size.iconSm },
  coinCount: { fontFamily: FONTS.bold, fontSize: font.md, color: C.yellow },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    marginTop: pad.xs,
    marginBottom: pad.sm,
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: C.textMuted,
    width: 42,
  }, // was: 12
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.teal,
    borderRadius: 3,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },

  objectCard: {
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: radius.xxl, // was: 28
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    paddingVertical: pad.xl,
    paddingHorizontal: pad.xl, // was: 28, 24
    width: "92%",
    marginBottom: pad.md,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  objectGlowRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 2,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pad.sm,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 5,
  },
  objectEmoji: { fontSize: font.h1 }, // was: 62
  objectName: {
    fontFamily: FONTS.bold,
    fontSize: font.h2,
    color: C.white,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  }, // was: 32

  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    gap: pad.sm,
    marginBottom: pad.sm,
  },
  instructionBadge: {
    backgroundColor: C.purpleDim,
    borderRadius: pad.sm,
    borderWidth: 1,
    borderColor: C.purpleBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  instructionBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: C.purple,
  }, // was: 12
  instructionText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.md,
    color: C.textSec,
    lineHeight: font.sm * 1.5,
  }, // was: 13
  instructionHighlight: { fontFamily: FONTS.bold, color: C.teal },

  trackerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    gap: pad.s,
    marginBottom: pad.md,
  },
  trackerDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  trackerDotEmpty: {
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  trackerDotFilled: {
    borderColor: C.green,
    backgroundColor: C.greenDim,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
  trackerCheck: { fontFamily: FONTS.bold, fontSize: font.md, color: C.green }, // was: 14
  trackerLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textMuted,
    marginLeft: pad.xs,
  }, // was: 12

  optionsList: { width: "92%", gap: pad.s, marginBottom: pad.xs },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.sm,
    gap: pad.sm,
  }, // was: 14, 13
  optionBullet: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexShrink: 0,
  },
  optionBulletLetter: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textMuted,
  }, // was: 13
  optionBulletIcon: { fontFamily: FONTS.bold, fontSize: font.md }, // was: 14
  optionText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.md + 1,
    lineHeight: font.md * 1.5,
  }, // was: 14

  speakerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  speakerBtnActive: { backgroundColor: C.tealDim, borderColor: C.tealBold },
  speakerIcon: { fontSize: font.lg }, // was: 16

  ttsHint: { width: "92%", marginBottom: pad.sm, alignItems: "center" },
  ttsHintText: {
    fontFamily: FONTS.light,
    fontSize: font.s,
    color: C.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  }, // was: 11

  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: pad.sm,
    gap: pad.sm,
    marginBottom: pad.sm,
  },
  feedbackWin: { backgroundColor: C.greenDim, borderColor: C.greenBorder },
  feedbackLose: { backgroundColor: C.redDim, borderColor: C.redBorder },
  feedbackIcon: { fontSize: font.xl }, // was: 22
  feedbackText: {
    fontFamily: FONTS.bold,
    flex: 1,
    fontSize: font.md,
    lineHeight: font.md * 1.5,
  }, // was: 14

  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: pad.xl,
  },
  resultCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.xxl, // was: 30
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: pad.xxl, // was: 32
    alignItems: "center",
    width: "100%",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  resultEmoji: { fontSize: size.iconXl + 8, marginBottom: pad.sm }, // was: 72
  resultMsg: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: C.white,
    letterSpacing: 0.3,
    marginBottom: pad.lg,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  }, // was: 26
  resultScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: pad.xs,
    marginBottom: pad.xs,
  },
  resultScore: { fontFamily: FONTS.bold, fontSize: font.h1, color: C.teal }, // was: 64
  resultScoreOf: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    color: C.textMuted,
  }, // was: 28
  resultPct: {
    fontFamily: FONTS.light,
    fontSize: font.lg,
    color: C.textSec,
    marginBottom: pad.xxl,
  }, // was: 16
  resultBtns: { gap: pad.sm, width: "100%" },
  replayBtn: {
    backgroundColor: C.teal,
    borderRadius: radius.xxl,
    paddingVertical: pad.md,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  replayBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.bg,
    letterSpacing: 0.4,
  }, // was: 16
  exitResultBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: pad.sm,
    alignItems: "center",
  },
  exitResultBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.textSec,
  }, // was: 14
});
