// components/Article.jsx

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Easing,
} from "react-native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import data from "../data/articles.json";
import GameEnd from "./GameEnd";
import BadgePopup from "./BadgePopup";
import {
  useStoryActivity,
  ACTIVITY,
  ACTIVITY_ROUTES,
} from "../_contexts/StoryActivityContext";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens"; // ← ADD

const { width: SW } = Dimensions.get("window");
const STATUS_H =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const C = {
  bg: "#08081a",
  surface: "#16213e",
  surfaceDim: "rgba(255,255,255,0.06)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.13)",
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
  textPri: "#E0F7FA",
  textSec: "#B2EBF2",
  textMuted: "#7a9aaa",
  border: "rgba(255,255,255,0.08)",
};

const COINS_PER_CORRECT = 10;

// ─────────────────────────────────────────────────────────────────────────────
// FLYING COIN
// ─────────────────────────────────────────────────────────────────────────────
function FlyingCoin({ fromX, fromY, toX, toY, delay, onLand }) {
  const animX = useRef(new Animated.Value(fromX - 13)).current;
  const animY = useRef(new Animated.Value(fromY - 13)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const duration = 480 + Math.random() * 160;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(sc, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(animX, {
          toValue: toX - 13,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: toY - 13,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(op, {
        toValue: 0,
        duration: 70,
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
        width: 26,
        height: 26,
        opacity: op,
        zIndex: 600,
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
// WAVEFORM
// ─────────────────────────────────────────────────────────────────────────────
function Waveform({ isPlaying }) {
  const bars = useRef(
    Array.from({ length: 22 }, () => new Animated.Value(0.2)),
  ).current;
  const loops = useRef([]);
  useEffect(() => {
    if (isPlaying) {
      loops.current = bars.map((b, i) => {
        const maxH = 0.5 + Math.random() * 0.5;
        const dur = 270 + Math.random() * 320;
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(b, {
              toValue: maxH,
              duration: dur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(b, {
              toValue: 0.15 + Math.random() * 0.1,
              duration: dur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );
        setTimeout(() => loop.start(), i * 22);
        return loop;
      });
    } else {
      loops.current.forEach((l) => l.stop());
      bars.forEach((b) =>
        Animated.timing(b, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: true,
        }).start(),
      );
    }
    return () => loops.current.forEach((l) => l.stop());
  }, [isPlaying]);
  return (
    <View style={wS.container}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            wS.bar,
            {
              transform: [{ scaleY: b }],
              backgroundColor: isPlaying
                ? i % 3 === 0
                  ? C.teal
                  : i % 3 === 1
                    ? C.yellow
                    : "rgba(0,188,212,0.5)"
                : "rgba(255,255,255,0.12)",
            },
          ]}
        />
      ))}
    </View>
  );
}
const wS = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 44,
    paddingHorizontal: pad.xs,
  },
  bar: { width: 4, height: 36, borderRadius: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS RING
// ─────────────────────────────────────────────────────────────────────────────
function ProgressRing({ progress }) {
  return (
    <View
      style={{
        width: 62,
        height: 62,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 62,
          height: 62,
          borderRadius: 31,
          borderWidth: 5,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 62,
          height: 62,
          borderRadius: 31,
          borderWidth: 5,
          borderTopColor: progress > 0.25 ? C.teal : "transparent",
          borderRightColor: progress > 0.5 ? C.teal : "transparent",
          borderBottomColor: progress > 0.75 ? C.teal : "transparent",
          borderLeftColor: progress > 0 ? C.teal : "transparent",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      <Text
        style={{
          fontFamily: FONTS.bold,
          fontSize: font.xs,
          color: C.textMuted,
        }}
      >
        {Math.round(progress * 100)}%
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION CARD
// ─────────────────────────────────────────────────────────────────────────────
function OptionCard({ label, text, state, onPress, index, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(30)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 320,
        delay: index * 60,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 280,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  const handlePress = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.94,
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
    onPress();
  };
  let bg = C.surfaceDim,
    border = C.border,
    txtCol = C.textSec,
    icon = null;
  if (state === "correct") {
    bg = C.greenDim;
    border = C.greenBorder;
    txtCol = C.green;
    icon = "✓";
  }
  if (state === "wrong") {
    bg = C.redDim;
    border = C.redBorder;
    txtCol = C.red;
    icon = "✗";
  }
  if (state === "reveal") {
    bg = C.yellowDim;
    border = C.yellowBorder;
    txtCol = C.yellow;
    icon = "★";
  }
  return (
    <Animated.View
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
        disabled={disabled}
      >
        <View style={[styles.optionBullet, { borderColor: border }]}>
          {icon ? (
            <Text style={[styles.optionBulletIcon, { color: txtCol }]}>
              {icon}
            </Text>
          ) : (
            <Text style={styles.optionBulletLetter}>{label}</Text>
          )}
        </View>
        <Text style={[styles.optionText, { color: txtCol }]}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTENING CHALLENGE
// ─────────────────────────────────────────────────────────────────────────────
function ListeningChallenge({ article, onFinish }) {
  const [audioPhase, setAudioPhase] = useState("idle");
  const [audioProgress, setAudioProgress] = useState(0);
  const unlocked = audioPhase === "done";
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});

  const pageSlide = useRef(new Animated.Value(0)).current;
  const pageOp = useRef(new Animated.Value(1)).current;
  const lockShake = useRef(new Animated.Value(0)).current;
  const progressTimer = useRef(null);
  const progressRef = useRef(0);
  const estMsRef = useRef(0);

  const sndButton = useRef(null);
  const sndCorrect = useRef(null);
  const sndIncorrect = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const map = [
        [sndButton, require("../../assets/sounds/button.mp3")],
        [sndCorrect, require("../../assets/sounds/correct.mp3")],
        [sndIncorrect, require("../../assets/sounds/incorrect2.mp3")],
      ];
      for (const [ref, asset] of map) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset);
          if (alive) ref.current = sound;
          else sound.unloadAsync();
        } catch (_) {}
      }
    })();
    return () => {
      alive = false;
      [sndButton, sndCorrect, sndIncorrect].forEach((r) => {
        r.current?.unloadAsync();
        r.current = null;
      });
    };
  }, []);

  const playSound = (ref) => {
    try {
      ref.current?.setPositionAsync(0).then(() => ref.current?.playAsync());
    } catch (_) {}
  };

  const startAudio = () => {
    playSound(sndButton);
    const script = article.audio_narration_script ?? article.content ?? "";
    const words = script.split(/\s+/).length;
    estMsRef.current = ((words / 120) * 60000) / 0.85;
    Speech.speak(script, {
      language: "en-US",
      rate: 0.85,
      pitch: 1.05,
      onDone: () => {
        clearInterval(progressTimer.current);
        setAudioProgress(1);
        setAudioPhase("done");
      },
      onStopped: () => {
        clearInterval(progressTimer.current);
        setAudioPhase("paused");
      },
      onError: () => {
        clearInterval(progressTimer.current);
        setAudioPhase("idle");
      },
    });
    setAudioPhase("playing");
    const start = Date.now();
    clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      const p = Math.min((Date.now() - start) / estMsRef.current, 0.98);
      setAudioProgress(p);
      progressRef.current = p;
    }, 300);
  };

  const pauseAudio = () => {
    playSound(sndButton);
    Speech.pause();
    clearInterval(progressTimer.current);
    setAudioPhase("paused");
  };
  const stopAudio = () => {
    playSound(sndButton);
    Speech.stop();
    clearInterval(progressTimer.current);
    setAudioPhase("idle");
  };
  const resumeAudio = () => {
    playSound(sndButton);
    Speech.resume();
    setAudioPhase("playing");
    const remaining = 1 - progressRef.current;
    const remMs = estMsRef.current * remaining;
    const start = Date.now();
    const base = progressRef.current;
    progressTimer.current = setInterval(() => {
      const p = Math.min(
        base + ((Date.now() - start) / remMs) * remaining,
        0.98,
      );
      setAudioProgress(p);
      progressRef.current = p;
    }, 300);
  };

  useEffect(
    () => () => {
      Speech.stop();
      clearInterval(progressTimer.current);
    },
    [],
  );

  const handleLockedTap = () => {
    Animated.sequence([
      Animated.timing(lockShake, {
        toValue: 8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(lockShake, {
        toValue: -8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(lockShake, {
        toValue: 5,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(lockShake, {
        toValue: -5,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(lockShake, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAnswer = (qIdx, optIdx, cardRef) => {
    if (revealed[qIdx]) return;
    const isCorrect = optIdx === article.questions[qIdx].correct_answer_index;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    setRevealed((prev) => ({ ...prev, [qIdx]: true }));
    playSound(isCorrect ? sndCorrect : sndIncorrect);
    if (isCorrect) onFinish?.("coins", { cardRef, qIdx });
    setTimeout(() => {
      if (qIdx + 1 >= article.questions.length) {
        const finalAnswers = { ...answers, [qIdx]: optIdx };
        const correct = article.questions.filter(
          (q, i) => finalAnswers[i] === q.correct_answer_index,
        ).length;
        onFinish?.("done", { correct, total: article.questions.length });
      } else {
        Animated.parallel([
          Animated.timing(pageSlide, {
            toValue: -SW,
            duration: 260,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pageOp, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          pageSlide.setValue(SW);
          pageOp.setValue(1);
          setQIndex((i) => i + 1);
          Animated.spring(pageSlide, {
            toValue: 0,
            friction: 7,
            tension: 55,
            useNativeDriver: true,
          }).start();
        });
      }
    }, 1300);
  };

  const q = article.questions[qIndex];
  const optionRefs = useRef({});

  return (
    <View style={styles.challengeWrap}>
      {/* Audio player */}
      <View style={styles.playerCard}>
        <View style={styles.playerHeader}>
          <View style={styles.playerHeaderLeft}>
            <View style={styles.headphonesBadge}>
              <Text style={styles.headphonesIcon}>🎧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerTitle}>Listening Challenge</Text>
              <Text style={styles.playerSub} numberOfLines={1}>
                {unlocked
                  ? "✅ Audio complete — quiz unlocked!"
                  : "Listen to unlock the quiz"}
              </Text>
            </View>
          </View>
          <ProgressRing progress={audioProgress} />
        </View>
        <View style={styles.waveformWrap}>
          <Waveform isPlaying={audioPhase === "playing"} />
        </View>
        <View style={styles.playerControls}>
          {audioPhase === "idle" && (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={startAudio}
              activeOpacity={0.85}
            >
              <Text style={styles.playBtnText}>▶ Play Audio</Text>
            </TouchableOpacity>
          )}
          {audioPhase === "playing" && (
            <>
              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={pauseAudio}
                activeOpacity={0.85}
              >
                <Text style={styles.pauseBtnText}>⏸ Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={stopAudio}
                activeOpacity={0.8}
              >
                <Text style={styles.stopBtnText}>⏹</Text>
              </TouchableOpacity>
            </>
          )}
          {audioPhase === "paused" && (
            <>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={resumeAudio}
                activeOpacity={0.85}
              >
                <Text style={styles.playBtnText}>▶ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={stopAudio}
                activeOpacity={0.8}
              >
                <Text style={styles.stopBtnText}>⏹</Text>
              </TouchableOpacity>
            </>
          )}
          {audioPhase === "done" && (
            <View style={styles.doneTag}>
              <Text style={styles.doneTxt}>✅ Listening complete!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quiz */}
      <View style={styles.quizSection}>
        <View style={styles.quizHeader}>
          <Text style={styles.quizHeaderTitle}>
            {unlocked
              ? `Question ${qIndex + 1} of ${article.questions.length}`
              : "🔒  Quiz Locked"}
          </Text>
          {unlocked && (
            <View style={styles.qProgressDots}>
              {article.questions.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.qDot,
                    i === qIndex && styles.qDotActive,
                    i < qIndex && styles.qDotDone,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        {unlocked && (
          <View style={styles.qProgressTrack}>
            <View
              style={[
                styles.qProgressFill,
                {
                  width: `${((qIndex + 1) / article.questions.length) * 100}%`,
                },
              ]}
            />
          </View>
        )}

        {!unlocked ? (
          <TouchableOpacity onPress={handleLockedTap} activeOpacity={1}>
            <Animated.View
              style={[
                styles.lockedCard,
                { transform: [{ translateX: lockShake }] },
              ]}
            >
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.lockTitle}>Quiz Locked</Text>
              <Text style={styles.lockSub}>
                Listen to the full audio above{"\n"}to unlock the questions
              </Text>
              <View style={styles.lockHint}>
                <Text style={styles.lockHintText}>
                  🎧 Complete listening first
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        ) : (
          <Animated.View
            style={{ transform: [{ translateX: pageSlide }], opacity: pageOp }}
          >
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{q.question}</Text>
            </View>
            <View style={styles.optionsList}>
              {q.options.map((opt, i) => {
                if (!optionRefs.current[`${qIndex}-${i}`])
                  optionRefs.current[`${qIndex}-${i}`] = React.createRef();
                const chosen = answers[qIndex] === i;
                const isRev = !!revealed[qIndex];
                const correct = i === q.correct_answer_index;
                let state = "idle";
                if (isRev && correct) state = "correct";
                else if (isRev && chosen) state = "wrong";
                else if (isRev && !chosen && correct) state = "reveal";
                return (
                  <View
                    key={i}
                    ref={optionRefs.current[`${qIndex}-${i}`]}
                    collapsable={false}
                  >
                    <OptionCard
                      label={["A", "B", "C", "D"][i]}
                      text={opt}
                      state={state}
                      onPress={() =>
                        handleAnswer(
                          qIndex,
                          i,
                          optionRefs.current[`${qIndex}-${i}`],
                        )
                      }
                      index={i}
                      disabled={isRev}
                    />
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Article = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentStory, storySession, completeActivity } = useStoryActivity();

  const article = (() => {
    const snap = storySession?.activityDataSnapshot?.listening;
    if (snap) return snap;
    return data.articles.find((a) => a.id == id) ?? data.articles[0];
  })();

  const cover = storySession.storyCover;
  const [coinCount, setCoinCount] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState([]);
  const coinIdRef = useRef(0);
  const coinBadgeRef = useRef(null);
  const coinScaleAnim = useRef(new Animated.Value(1)).current;
  const coinShakeAnim = useRef(new Animated.Value(0)).current;

  const sndButtonMain = useRef(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/button.mp3"),
        );
        if (alive) sndButtonMain.current = sound;
        else sound.unloadAsync();
      } catch (_) {}
    })();
    return () => {
      alive = false;
      sndButtonMain.current?.unloadAsync();
      sndButtonMain.current = null;
    };
  }, []);

  const playButtonSound = () => {
    try {
      sndButtonMain.current
        ?.setPositionAsync(0)
        .then(() => sndButtonMain.current?.playAsync());
    } catch (_) {}
  };

  const [showGameEnd, setShowGameEnd] = useState(false);
  const [gameEndType, setGameEndType] = useState(null);
  const [gameEndScore, setGameEndScore] = useState({ correct: 0, total: 0 });
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [challengeKey, setChallengeKey] = useState(0);

  if (!article)
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: C.textMuted, fontSize: font.lg }}>
          Article not found
        </Text>
      </View>
    );

  const spawnCoins = (cardRef) => {
    if (!cardRef?.current) return;
    coinBadgeRef.current?.measureInWindow((bx, by, bw, bh) => {
      const toX = bx + bw / 2;
      const toY = by + bh / 2;
      cardRef.current.measureInWindow((cx, cy, cw, ch) => {
        const fromX = cx + cw / 2;
        const fromY = cy + ch / 2;
        const newCoins = Array.from({ length: COINS_PER_CORRECT }, (_, i) => ({
          id: ++coinIdRef.current,
          fromX: fromX + (Math.random() - 0.5) * 24,
          fromY: fromY + (Math.random() - 0.5) * 14,
          toX,
          toY,
          delay: i * 70,
        }));
        setFlyingCoins((prev) => [...prev, ...newCoins]);
      });
    });
  };

  const handleCoinLand = (id) => {
    setFlyingCoins((prev) => prev.filter((c) => c.id !== id));
    setCoinCount((prev) => prev + 1);
    Animated.sequence([
      Animated.spring(coinScaleAnim, {
        toValue: 1.55,
        friction: 3,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.spring(coinScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.sequence([
      Animated.timing(coinShakeAnim, {
        toValue: 7,
        duration: 42,
        useNativeDriver: true,
      }),
      Animated.timing(coinShakeAnim, {
        toValue: -7,
        duration: 42,
        useNativeDriver: true,
      }),
      Animated.timing(coinShakeAnim, {
        toValue: 0,
        duration: 42,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleChallengeEvent = (type, payload) => {
    if (type === "coins") {
      spawnCoins(payload.cardRef);
    } else if (type === "done") {
      const { correct, total } = payload;
      setGameEndScore({ correct, total });
      setGameEndType(correct === total ? "won" : "lose");
      setShowGameEnd(true);
    }
  };

  const proceedToNextActivity = async () => {
    if (!storySession) {
      resetGame();
      return;
    }
    await completeActivity(
      ACTIVITY.WORD_LISTENING_CHALLENGE,
      { score: gameEndScore.correct, total: gameEndScore.total },
      { coins: coinCount },
    );
    const nextRoute = ACTIVITY_ROUTES[ACTIVITY.WORD_UNDERSTANDING_CHALLENGE];
    router.replace({
      pathname: `/components/${nextRoute}`,
      params: { storyId: storySession.storyId, title: storySession.storyTitle },
    });
  };

  const resetGame = () => {
    setCoinCount(0);
    setFlyingCoins([]);
    setGameEndType(null);
    setShowGameEnd(false);
    setShowBadgePopup(false);
    setChallengeKey((k) => k + 1);
  };

  return (
    <View style={styles.root}>
      {flyingCoins.map((c) => (
        <FlyingCoin key={c.id} {...c} onLand={() => handleCoinLand(c.id)} />
      ))}

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            playButtonSound();
            router.back();
          }}
          activeOpacity={0.75}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {article.title}
        </Text>
        <Animated.View
          ref={coinBadgeRef}
          style={[
            styles.coinBadge,
            { transform: [{ translateX: coinShakeAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/img/coin.png")}
            style={styles.coinIcon}
            resizeMode="contain"
          />
          <Animated.Text
            style={[
              styles.coinCount,
              { transform: [{ scale: coinScaleAnim }] },
            ]}
          >
            {coinCount}
          </Animated.Text>
        </Animated.View>
      </View>

      <View style={styles.coverWrap}>
        <Image //source={{ uri: currentStory.cover }}
          source={
            typeof cover === "string" && cover.startsWith("http")
              ? { uri: cover }
              : require("../../assets/img/article/1.jpg")
          }
          style={styles.coverImage}
          resizeMode="cover"
        />
        <View style={styles.coverGradient} />
        <View style={styles.coverTags}>
          <View style={styles.coverTag}>
            <Text style={styles.coverTagText}>🎧 Listening Quiz</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ListeningChallenge
          key={challengeKey}
          article={article}
          onFinish={handleChallengeEvent}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

      <GameEnd
        visible={showGameEnd}
        badge={gameEndType}
        word={null}
        onClose={() => {
          setShowGameEnd(false);
          resetGame();
        }}
        onBadge={
          gameEndType === "won"
            ? () => {
                setShowGameEnd(false);
                setShowBadgePopup(true);
              }
            : undefined
        }
        winSubtitle={
          storySession ? "Great listening! Next: Object Challenge →" : undefined
        }
      />
      <BadgePopup
        visible={showBadgePopup}
        badge="article_quiz_won"
        onClose={() => {
          setShowBadgePopup(false);
          proceedToNextActivity();
        }}
        onPlay={() => {
          setShowBadgePopup(false);
          proceedToNextActivity();
        }}
      />
    </View>
  );
};

export default Article;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center", paddingBottom: pad.xl },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad.md, // was: 16
    paddingTop: STATUS_H + pad.s, // was: + 8
    paddingBottom: pad.sm, // was: 10
  },
  backBtn: {
    width: size.hitMd,
    height: size.hitMd,
    borderRadius: size.hitMd / 2, // was: 44
    backgroundColor: C.surfaceDim,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: font.xxl, color: C.textSec, marginTop: -2 }, // was: 28
  topTitle: {
    fontFamily: FONTS.bold,
    flex: 1,
    textAlign: "center",
    fontSize: font.md,
    color: C.teal,
    letterSpacing: 0.3, // was: 15
    marginHorizontal: pad.s,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.xs,
    backgroundColor: C.yellowDim,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
    paddingHorizontal: pad.sm, // was: 11
    paddingVertical: pad.xs, // was: 6
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  coinIcon: { width: size.iconSm, height: size.iconSm }, // was: 22
  coinCount: { fontFamily: FONTS.bold, fontSize: font.md, color: C.yellow }, // was: 14

  coverWrap: { width: "100%", height: 190, position: "relative" },
  coverImage: { width: "100%", height: "100%" },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,26,0.45)",
  },
  coverTags: {
    position: "absolute",
    bottom: pad.sm,
    left: pad.md,
    flexDirection: "row",
    gap: pad.s,
  },
  coverTag: {
    backgroundColor: "rgba(0,188,212,0.25)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
  },
  coverTagText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.teal }, // was: 12

  challengeWrap: { width: "100%", alignItems: "center", paddingTop: pad.md },

  playerCard: {
    width: "92%",
    backgroundColor: C.surface,
    borderRadius: radius.xl, // was: 22
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: pad.lg, // was: 20
    marginBottom: pad.lg,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: pad.md,
  },
  playerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.sm,
    flex: 1,
  },
  headphonesBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.tealDim,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headphonesIcon: { fontSize: font.xl }, // was: 22
  playerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textPri,
    letterSpacing: 0.3,
  }, // was: 15
  playerSub: {
    fontFamily: FONTS.light,
    fontSize: font.s,
    color: C.textMuted,
    marginTop: 2,
  }, // was: 11
  waveformWrap: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: radius.md,
    overflow: "hidden",
    paddingHorizontal: pad.s,
    paddingVertical: pad.xs,
    marginBottom: pad.md,
    alignItems: "center",
  },
  playerControls: { flexDirection: "row", gap: pad.sm, alignItems: "center" },
  playBtn: {
    flex: 1,
    backgroundColor: C.teal,
    borderRadius: radius.pill,
    paddingVertical: pad.sm,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  playBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.bg,
    letterSpacing: 0.4,
  }, // was: 15
  pauseBtn: {
    flex: 1,
    backgroundColor: C.yellowDim,
    borderRadius: radius.pill,
    paddingVertical: pad.sm,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.yellowBorder,
  },
  pauseBtnText: { fontFamily: FONTS.bold, fontSize: font.md, color: C.yellow },
  stopBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.redDim,
    borderWidth: 1.5,
    borderColor: C.redBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtnText: { fontSize: font.lg },
  doneTag: {
    flex: 1,
    backgroundColor: C.greenDim,
    borderRadius: radius.pill,
    paddingVertical: pad.sm,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.greenBorder,
  },
  doneTxt: { fontFamily: FONTS.bold, fontSize: font.md, color: C.green }, // was: 14

  quizSection: { width: "92%", marginBottom: pad.md },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: pad.sm,
  },
  quizHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: C.textPri,
  },
  qProgressDots: { flexDirection: "row", gap: pad.xs },
  qDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  qDotActive: { backgroundColor: C.teal, width: 18 },
  qDotDone: { backgroundColor: C.green },
  qProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: pad.sm,
    overflow: "hidden",
  },
  qProgressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },

  lockedCard: {
    backgroundColor: C.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5, // was: 20
    borderColor: "rgba(255,255,255,0.1)",
    padding: pad.xxl,
    alignItems: "center", // was: 32
  },
  lockIcon: { fontSize: size.iconXl, marginBottom: pad.sm }, // was: 48
  lockTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textSec,
    marginBottom: pad.xs,
  }, // was: 20
  lockSub: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.sm * 1.6,
    marginBottom: pad.lg,
  },
  lockHint: {
    backgroundColor: C.tealDim,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.md,
    paddingVertical: pad.s,
  },
  lockHintText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.teal },

  questionCard: {
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: C.tealBorder, // was: 18
    padding: pad.lg,
    marginBottom: pad.sm,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  questionText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.textPri,
    lineHeight: font.lg * 1.5,
    letterSpacing: 0.2,
  }, // was: 17

  optionsList: { gap: pad.s, marginBottom: pad.s },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md, // was: 14
    borderWidth: 1.5,
    paddingHorizontal: pad.sm, // was: 14
    paddingVertical: pad.sm,
    gap: pad.sm, // was: 12
  },
  optionBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexShrink: 0,
  },
  optionBulletLetter: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: C.textMuted,
  },
  optionBulletIcon: { fontFamily: FONTS.bold, fontSize: font.md },
  optionText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.md,
    lineHeight: font.md * 1.5,
  },
});
