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
import { useStoryActivity, ACTIVITY } from "../_contexts/StoryActivityContext";
import OBJECTS from "../data/describeObjects.json";
import BadgePopup from "./BadgePopup";

const { width: SW, height: SH } = Dimensions.get("window");
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
  const scale = useRef(new Animated.Value(0.7)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
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
      style={[styles.resultCard, { opacity: op, transform: [{ scale }] }]}
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

  // Pick object pool: story-specific snapshot or global fallback
  const objectPool = (() => {
    const snap = storySession?.activityDataSnapshot?.understanding;
    if (snap && snap.length > 0) return snap;
    return OBJECTS;
  })();

  const doExit = () => {
    Speech.stop();
    if (typeof onExit === "function") onExit();
    else router.replace("/home");
  };

  const [queue, setQueue] = useState(() => shuffle(objectPool).slice(0, 3));
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const totalCoinsRef = useRef(0); // accumulates coins earned across rounds

  // ── Capture final score outside setState updater to avoid calling
  //    completeActivity (which calls setStorySession) inside setScore's updater.
  //    Calling setState inside another setState's functional updater is illegal
  //    in React and causes unpredictable session resets.
  const finalScoreRef = useRef(0);
  const pendingCompleteRef = useRef(false); // signals useEffect to fire completeActivity

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
  const sndButton = useRef(null); // button.mp3 — every button press
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
  // ── Ref to hold the auto-advance timer so we can cancel on unmount ──
  const autoAdvanceTimer = useRef(null);

  // ── Page slide animation ───────────────────────────────────────────────────
  const pageSlide = useRef(new Animated.Value(0)).current;
  const pageOp = useRef(new Animated.Value(1)).current;

  const current = queue[qIndex];

  // ── Load question ──────────────────────────────────────────────────────────
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
      // Clear any pending auto-advance on unmount
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    },
    [],
  );

  // ── Fire completeActivity OUTSIDE any setState updater ───────────────────
  // badgeVisible=true is set right after finalScoreRef and pendingCompleteRef
  // are written, so this effect always sees the correct captured values.
  useEffect(() => {
    if (!badgeVisible || !pendingCompleteRef.current) return;
    pendingCompleteRef.current = false;
    completeActivity(
      ACTIVITY.WORD_UNDERSTANDING_CHALLENGE,
      { score: finalScoreRef.current },
      { coins: totalCoinsRef.current, diamonds: 3 },
    );
  }, [badgeVisible]);

  // ── Text-to-Speech ─────────────────────────────────────────────────────────
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

  // ── Spawn coins ────────────────────────────────────────────────────────────
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

  // ── Tap an option ──────────────────────────────────────────────────────────
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
      totalCoinsRef.current += COINS_PER_CORRECT; // track cumulative coins
      setCorrectFound((prev) => {
        const next = prev + 1;
        if (next === CORRECT_NEEDED) {
          setScore((s) => s + 1);
          // Reveal answers immediately so the green ticks are visible…
          setTimeout(() => revealAll(), 300);
          // …then auto-advance after a short celebration pause (1.4 s total)
          autoAdvanceTimer.current = setTimeout(() => handleNext(), 1400);
        }
        return next;
      });
    } else {
      playSound("wrong");
      // Wrong answer: reveal then auto-advance after a brief pause
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

  // ── Slide page out → swap question → slide in ─────────────────────────────
  const slideToNext = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    // Slide out to the left + fade
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
        // Check score AFTER the final question's setScore has fired.
        // We use a small timeout so state has settled.
        setTimeout(() => {
          setScore((finalScore) => {
            const isWin = finalScore === queue.length;
            if (isWin) {
              // Write to refs FIRST — the useEffect watching badgeVisible
              // will read these and call completeActivity safely outside
              // any setState updater (calling setState inside setState is illegal).
              finalScoreRef.current = finalScore;
              pendingCompleteRef.current = true;
              setBadgeVisible(true); // 🏆 perfect game → badge popup
            } else {
              setShowResult(true); // partial score → plain result
            }
            return finalScore;
          });
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
    // Reset page slide/opacity so the new queue renders on-screen (not off-screen at -SW)
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

  // ── Result screen ──────────────────────────────────────────────────────────
  // ── Badge popup (perfect win) ──────────────────────────────────────────────
  if (badgeVisible) {
    return (
      <View style={styles.root}>
        <BadgePopup
          visible={badgeVisible}
          badge="describe_won"
          finishMode={true}
          onClose={() => {
            setBadgeVisible(false);
            // completeActivity already called in the badgeVisible useEffect.
            // Words are disbursed from story.challengeWords at home screen level
            // so no params needed — the session-based trigger handles the overlay.
            router.replace("/home");
          }}
          onPlay={() => {
            // finishMode=true so this is never shown, but keep for safety
            setBadgeVisible(false);
            handleReplay();
          }}
        />
      </View>
    );
  }

  // ── Result screen (partial score) ─────────────────────────────────────────
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
              doExit();
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
      {/* Flying coins overlay */}
      {flyingCoins.map((c) => (
        <FlyingCoin
          key={c.id}
          fromX={c.fromX}
          fromY={c.fromY}
          toX={c.toX}
          toY={c.toY}
          delay={c.delay}
          onLand={() => handleCoinLand(c.id)}
        />
      ))}

      {/* Top bar */}
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
            styles.scorePill,
            { transform: [{ scale: badgeScale }, { translateX: badgeShake }] },
          ]}
        >
          <Text style={styles.scoreText}>⭐ {score}</Text>
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
          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {qIndex + 1} / {queue.length}
            </Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ProgressBar current={qIndex + 1} total={queue.length} />
            </View>
          </View>

          {/* Object display */}
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

          {/* Instruction */}
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

          {/* Selection tracker */}
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

          {/* Options */}
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

          {/* TTS hint */}
          <View style={styles.ttsHint}>
            <Text style={styles.ttsHintText}>
              🔈 Tap the speaker on any option to hear it read aloud
            </Text>
          </View>

          {/* Result feedback */}
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
    paddingHorizontal: 18,
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 10,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    width: 70,
  },
  exitIcon: { fontSize: 11, color: C.textMuted, fontWeight: "700" },
  exitText: { fontSize: 12, fontWeight: "700", color: C.textSec },
  topTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: C.teal,
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  scorePill: {
    backgroundColor: C.yellowDim,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    width: 70,
    alignItems: "center",
  },
  scoreText: { fontSize: 14, fontWeight: "900", color: C.yellow },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    marginTop: 6,
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    width: 42,
  },
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
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: "92%",
    marginBottom: 16,
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
    marginBottom: 14,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 5,
  },
  objectEmoji: { fontSize: 62 },
  objectName: {
    fontSize: 32,
    fontWeight: "900",
    color: C.white,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,188,212,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    gap: 10,
    marginBottom: 10,
  },
  instructionBadge: {
    backgroundColor: C.purpleDim,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.purpleBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  instructionBadgeText: { fontSize: 12, fontWeight: "800", color: C.purple },
  instructionText: { flex: 1, fontSize: 13, color: C.textSec, lineHeight: 19 },
  instructionHighlight: { fontWeight: "800", color: C.teal },

  trackerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    gap: 8,
    marginBottom: 16,
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
  trackerCheck: { fontSize: 14, fontWeight: "900", color: C.green },
  trackerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    marginLeft: 4,
  },

  optionsList: { width: "92%", gap: 9, marginBottom: 6 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 13,
    gap: 10,
  },
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
  optionBulletLetter: { fontSize: 13, fontWeight: "800", color: C.textMuted },
  optionBulletIcon: { fontSize: 14, fontWeight: "900" },
  optionText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },

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
  speakerIcon: { fontSize: 16 },

  ttsHint: { width: "92%", marginBottom: 12, alignItems: "center" },
  ttsHintText: {
    fontSize: 11,
    color: C.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  },

  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  feedbackWin: { backgroundColor: C.greenDim, borderColor: C.greenBorder },
  feedbackLose: { backgroundColor: C.redDim, borderColor: C.redBorder },
  feedbackIcon: { fontSize: 22 },
  feedbackText: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 20 },

  nextBtn: {
    backgroundColor: C.teal,
    borderRadius: 30,
    paddingHorizontal: 42,
    paddingVertical: 15,
    marginBottom: 8,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 0.4,
  },

  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  resultCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  resultEmoji: { fontSize: 72, marginBottom: 12 },
  resultMsg: {
    fontSize: 26,
    fontWeight: "900",
    color: C.white,
    letterSpacing: 0.3,
    marginBottom: 20,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  resultScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 6,
  },
  resultScore: { fontSize: 64, fontWeight: "900", color: C.teal },
  resultScoreOf: { fontSize: 28, fontWeight: "700", color: C.textMuted },
  resultPct: {
    fontSize: 16,
    color: C.textSec,
    fontWeight: "600",
    marginBottom: 32,
  },
  resultBtns: { gap: 12, width: "100%" },
  replayBtn: {
    backgroundColor: C.teal,
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  replayBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 0.4,
  },
  exitResultBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 13,
    alignItems: "center",
  },
  exitResultBtnText: { fontSize: 14, fontWeight: "700", color: C.textSec },
});

export default DescribeObjectGame;
