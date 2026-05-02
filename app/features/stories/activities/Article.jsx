// components/Article.jsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import data from "../../../data/articles.json";
import GameEnd from "../components/GameEnd";
import BadgePopup from "../components/BadgePopup";
import {
  useStoryActivity,
  ACTIVITY,
  ACTIVITY_ROUTES,
} from "../../../_contexts/StoryActivityContext";
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";
import { Image as ExpoImage } from "expo-image";
import { resolveListeningAudio } from "../../../data/listeningAudioMap";

const { width: SW, height: SH } = Dimensions.get("window");
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
      source={require("../../../../assets/img/coin.png")}
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
    Array.from({ length: 28 }, () => new Animated.Value(0.15)),
  ).current;
  const loops = useRef([]);
  useEffect(() => {
    if (isPlaying) {
      loops.current = bars.map((b, i) => {
        const maxH = 0.4 + Math.random() * 0.6;
        const dur = 250 + Math.random() * 350;
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(b, {
              toValue: maxH,
              duration: dur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(b, {
              toValue: 0.1 + Math.random() * 0.15,
              duration: dur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );
        setTimeout(() => loop.start(), i * 18);
        return loop;
      });
    } else {
      loops.current.forEach((l) => l.stop());
      bars.forEach((b) =>
        Animated.timing(b, {
          toValue: 0.15,
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
                    : "rgba(0,188,212,0.45)"
                : "rgba(255,255,255,0.1)",
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
    gap: 2.5,
    height: 52,
    paddingHorizontal: pad.xs,
  },
  bar: { width: 3.5, height: 40, borderRadius: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// OPTION CARD — slides in from right with delay, speaks on appearance
// ─────────────────────────────────────────────────────────────────────────────
function OptionCard({ label, text, state, onPress, visible, disabled }) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (visible && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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

  if (!visible) return null;

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
        transform: [{ translateX: slideX }, { scale }],
        marginBottom: pad.s,
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
// LISTENING CHALLENGE — new sequential flow
//
// PHASE 1 — "listening": big audio player, nothing below
// PHASE 2 — "quiz": player slides left, questions appear one by one
//   Each question: hear question → option A appears + heard → B → C → user picks
// ─────────────────────────────────────────────────────────────────────────────
function ListeningChallenge({ article, onFinish }) {
  // ── Phase ──────────────────────────────────────────────────────────────────
  // "listening" | "transitioning" | "quiz"
  const [phase, setPhase] = useState("listening");

  // ── Audio player state ──────────────────────────────────────────────────────
  const [audioPhase, setAudioPhase] = useState("idle"); // idle | playing | paused | done
  const [audioProgress, setAudioProgress] = useState(0);

  // ── Quiz state ──────────────────────────────────────────────────────────────
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  // How many options are visible for current question (0,1,2,3)
  const [visibleOptions, setVisibleOptions] = useState(0);
  // Whether the question text has been spoken
  const [questionSpoken, setQuestionSpoken] = useState(false);

  // ── Animations ──────────────────────────────────────────────────────────────
  // Player card slides left when transitioning to quiz
  const playerSlideX = useRef(new Animated.Value(0)).current;
  const playerOp = useRef(new Animated.Value(1)).current;
  // Question page slide for next question
  const pageSlide = useRef(new Animated.Value(0)).current;
  const pageOp = useRef(new Animated.Value(1)).current;
  // Question text fade in
  const questionFade = useRef(new Animated.Value(0)).current;
  const questionSlide = useRef(new Animated.Value(20)).current;

  // ── Sound refs ──────────────────────────────────────────────────────────────
  const sndButton = useRef(null);
  const sndCorrect = useRef(null);
  const sndIncorrect = useRef(null);

  const progressTimer = useRef(null);
  const progressRef = useRef(0);
  const estMsRef = useRef(0);
  const optionRefs = useRef({});
  const isSpeakingRef = useRef(false);
  const speakSessionRef = useRef(0); // incremented on every new question/cancel

  // ── Audio file player ref (used when script is a file/URL) ─────────────────
  const audioPlayerRef = useRef(null);

  // Audio source is resolved programmatically from the database field.
  // See app/data/listeningAudioMap.js for the asset map.

  const cleanupAudioPlayer = async () => {
    try {
      if (audioPlayerRef.current) {
        await audioPlayerRef.current.stopAsync().catch(() => {});
        await audioPlayerRef.current.unloadAsync().catch(() => {});
        audioPlayerRef.current = null;
      }
    } catch (_) {}
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const map = [
        [sndButton, require("../../../../assets/sounds/button.mp3")],
        [sndCorrect, require("../../../../assets/sounds/correct.mp3")],
        [sndIncorrect, require("../../../../assets/sounds/incorrect2.mp3")],
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

  useEffect(
    () => () => {
      Speech.stop();
      clearInterval(progressTimer.current);
      cleanupAudioPlayer();
    },
    [],
  );

  const playSound = (ref) => {
    try {
      ref.current?.setPositionAsync(0).then(() => ref.current?.playAsync());
    } catch (_) {}
  };

  // ── Audio narration ─────────────────────────────────────────────────────────
  // Starts a progress ticker that runs for `durationMs` milliseconds.
  const startProgressTicker = (durationMs, baseProgress = 0) => {
    clearInterval(progressTimer.current);
    estMsRef.current = durationMs;
    const start = Date.now();
    const remaining = 1 - baseProgress;
    progressTimer.current = setInterval(() => {
      const p = Math.min(
        baseProgress + ((Date.now() - start) / durationMs) * remaining,
        0.98,
      );
      setAudioProgress(p);
      progressRef.current = p;
    }, 300);
  };

  const startAudio = async () => {
    playSound(sndButton);
    const script = article.audio_narration_script ?? article.content ?? "";
    const source = resolveListeningAudio(script);

    if (source) {
      // ── Play from audio file or CDN URL ──────────────────────────────────
      try {
        await cleanupAudioPlayer();
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound, status } = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
        });
        audioPlayerRef.current = sound;
        const durationMs = status.durationMillis ?? 60000;
        setAudioPhase("playing");
        startProgressTicker(durationMs);
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) {
            clearInterval(progressTimer.current);
            setAudioProgress(1);
            setAudioPhase("done");
            sound.unloadAsync().catch(() => {});
            audioPlayerRef.current = null;
          }
          if (s.isLoaded && s.positionMillis && s.durationMillis) {
            const p = s.positionMillis / s.durationMillis;
            setAudioProgress(Math.min(p, 0.98));
            progressRef.current = Math.min(p, 0.98);
          }
        });
      } catch (e) {
        console.warn("Audio file failed, falling back to TTS:", e);
        startWithTTS(article.content ?? script);
      }
    } else {
      // ── Plain text narration → TTS ────────────────────────────────────────
      startWithTTS(script);
    }
  };

  const startWithTTS = (script) => {
    const words = script.split(/\s+/).length;
    const durationMs = ((words / 120) * 60000) / 0.85;
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
    startProgressTicker(durationMs);
  };

  const pauseAudio = async () => {
    playSound(sndButton);
    clearInterval(progressTimer.current);
    if (audioPlayerRef.current) {
      try {
        await audioPlayerRef.current.pauseAsync();
      } catch (_) {}
    } else {
      Speech.pause();
    }
    setAudioPhase("paused");
  };

  const stopAudio = async () => {
    playSound(sndButton);
    clearInterval(progressTimer.current);
    if (audioPlayerRef.current) {
      await cleanupAudioPlayer();
    } else {
      Speech.stop();
    }
    setAudioPhase("idle");
    setAudioProgress(0);
    progressRef.current = 0;
  };

  const resumeAudio = async () => {
    playSound(sndButton);
    if (audioPlayerRef.current) {
      try {
        await audioPlayerRef.current.playAsync();
        // Resume progress ticker for remaining duration
        const status = await audioPlayerRef.current.getStatusAsync();
        const remaining = status.durationMillis
          ? status.durationMillis - status.positionMillis
          : (1 - progressRef.current) * estMsRef.current;
        startProgressTicker(remaining, progressRef.current);
      } catch (_) {}
    } else {
      Speech.resume();
      const remaining = 1 - progressRef.current;
      const remMs = estMsRef.current * remaining;
      startProgressTicker(remMs, progressRef.current);
    }
    setAudioPhase("playing");
  };

  // ── Transition: player slides left, quiz appears ────────────────────────────
  const transitionToQuiz = () => {
    if (phase !== "listening") return;
    setPhase("transitioning");
    Animated.parallel([
      Animated.timing(playerSlideX, {
        toValue: -SW * 1.1,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(playerOp, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase("quiz");
      // Reset question animations for first question
      pageSlide.setValue(SW);
      pageOp.setValue(0);
      questionFade.setValue(0);
      questionSlide.setValue(20);
      setVisibleOptions(0);
      setQuestionSpoken(false);
      // Slide in the first question page
      Animated.parallel([
        Animated.spring(pageSlide, {
          toValue: 0,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(pageOp, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reveal question text
        Animated.parallel([
          Animated.timing(questionFade, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(questionSlide, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Speak the question then reveal options one by one
          speakQuestionThenOptions(0, article.questions[0]);
        });
      });
    });
  };

  // ── Speak question, then options sequentially ───────────────────────────────
  const speakQuestionThenOptions = useCallback((qIdx, q) => {
    if (!q) return;
    isSpeakingRef.current = true;
    // Each call gets a unique session ID — any callback that sees a different
    // ID knows it was cancelled and bails out immediately.
    const mySession = ++speakSessionRef.current;
    Speech.speak(q.question, {
      language: "en-US",
      rate: 0.88,
      pitch: 1.05,
      onDone: () => {
        if (speakSessionRef.current !== mySession) return;
        setQuestionSpoken(true);
        revealOption(qIdx, q, 0, mySession);
      },
      onError: () => {
        if (speakSessionRef.current !== mySession) return;
        setQuestionSpoken(true);
        revealOption(qIdx, q, 0, mySession);
      },
    });
  }, []);

  const revealOption = useCallback((qIdx, q, optIdx, mySession) => {
    if (speakSessionRef.current !== mySession) return; // cancelled
    if (optIdx >= q.options.length) return;
    setVisibleOptions(optIdx + 1);
    const textToSpeak = q.options[optIdx];
    setTimeout(() => {
      if (speakSessionRef.current !== mySession) return; // cancelled during delay
      Speech.speak(textToSpeak, {
        language: "en-US",
        rate: 0.88,
        pitch: 1.0,
        onDone: () => {
          if (speakSessionRef.current !== mySession) return;
          setTimeout(() => revealOption(qIdx, q, optIdx + 1, mySession), 400);
        },
        onError: () => {
          if (speakSessionRef.current !== mySession) return;
          setTimeout(() => revealOption(qIdx, q, optIdx + 1, mySession), 400);
        },
      });
    }, 350);
  }, []);

  // ── Handle answer ───────────────────────────────────────────────────────────
  const handleAnswer = (qIdx, optIdx, cardRef) => {
    if (revealed[qIdx]) return;
    // Cancel any in-progress question/option speech immediately.
    // Incrementing speakSessionRef invalidates all pending callbacks.
    speakSessionRef.current++;
    isSpeakingRef.current = false;
    Speech.stop();

    const isCorrect = optIdx === article.questions[qIdx].correct_answer_index;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    setRevealed((prev) => ({ ...prev, [qIdx]: true }));
    // Make all options visible immediately after answer
    setVisibleOptions(article.questions[qIdx].options.length);
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
        // Slide current question out to the left
        Animated.parallel([
          Animated.timing(pageSlide, {
            toValue: -SW,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pageOp, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Reset for next question
          pageSlide.setValue(SW);
          pageOp.setValue(0);
          questionFade.setValue(0);
          questionSlide.setValue(20);
          setQIndex(qIdx + 1);
          setVisibleOptions(0);
          setQuestionSpoken(false);
          isSpeakingRef.current = true;
          // Slide in next question
          Animated.parallel([
            Animated.spring(pageSlide, {
              toValue: 0,
              friction: 7,
              tension: 55,
              useNativeDriver: true,
            }),
            Animated.timing(pageOp, {
              toValue: 1,
              duration: 260,
              useNativeDriver: true,
            }),
          ]).start(() => {
            Animated.parallel([
              Animated.timing(questionFade, {
                toValue: 1,
                duration: 320,
                useNativeDriver: true,
              }),
              Animated.timing(questionSlide, {
                toValue: 0,
                duration: 320,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start(() => {
              speakQuestionThenOptions(qIdx + 1, article.questions[qIdx + 1]);
            });
          });
        });
      }
    }, 1400);
  };

  const q =
    phase === "quiz" || phase === "transitioning"
      ? article.questions[qIndex]
      : null;
  const isListeningDone = audioPhase === "done";

  return (
    <View style={styles.challengeWrap}>
      {/* ── PHASE 1: Listening player ── */}
      {(phase === "listening" || phase === "transitioning") && (
        <Animated.View
          style={[
            styles.playerCard,
            { transform: [{ translateX: playerSlideX }], opacity: playerOp },
          ]}
        >
          {/* Header */}
          <View style={styles.playerHeader}>
            <View style={styles.headphonesBadge}>
              <Text style={styles.headphonesIcon}>🎧</Text>
            </View>
            <View style={{ flex: 1, marginLeft: pad.sm }}>
              <Text style={styles.playerTitle}>Listening Challenge</Text>
              <Text style={styles.playerSub} numberOfLines={1}>
                {isListeningDone
                  ? "✅ Complete — start the quiz!"
                  : "Listen to the story, then answer questions"}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${audioProgress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {isListeningDone ? "100%" : `${Math.round(audioProgress * 100)}%`}
          </Text>

          {/* Waveform */}
          <View style={styles.waveformWrap}>
            <Waveform isPlaying={audioPhase === "playing"} />
          </View>

          {/* Controls */}
          <View style={styles.playerControls}>
            {audioPhase === "idle" && (
              <TouchableOpacity
                style={styles.playBtn}
                onPress={startAudio}
                activeOpacity={0.85}
              >
                <Text style={styles.playBtnIcon}>▶</Text>
                <Text style={styles.playBtnText}>Play Audio</Text>
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
                  <Text style={styles.playBtnIcon}>▶</Text>
                  <Text style={styles.playBtnText}>Resume</Text>
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
              <TouchableOpacity
                style={styles.startQuizBtn}
                onPress={transitionToQuiz}
                activeOpacity={0.85}
              >
                <Text style={styles.startQuizText}>Start Quiz →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom note when not done */}
          {!isListeningDone && (
            <View style={styles.listenNote}>
              <Text style={styles.listenNoteText}>
                🔒 Complete listening to unlock the quiz
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* ── PHASE 2: Quiz ── */}
      {phase === "quiz" && q && (
        <Animated.View
          style={[
            styles.quizWrap,
            { transform: [{ translateX: pageSlide }], opacity: pageOp },
          ]}
        >
          {/* Progress header */}
          <View style={styles.quizHeader}>
            <Text style={styles.quizHeaderTitle}>
              Question {qIndex + 1} of {article.questions.length}
            </Text>
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
          </View>
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

          {/* Question card */}
          <Animated.View
            style={[
              styles.questionCard,
              {
                opacity: questionFade,
                transform: [{ translateY: questionSlide }],
              },
            ]}
          >
            <View style={styles.questionNumBadge}>
              <Text style={styles.questionNumText}>Q{qIndex + 1}</Text>
            </View>
            <Text style={styles.questionText}>{q.question}</Text>
            {!questionSpoken && (
              <View style={styles.questionSpeakingBadge}>
                <Text style={styles.questionSpeakingText}>
                  🔊 Reading question…
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Options — appear one by one */}
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
                    visible={i < visibleOptions}
                    disabled={isRev || !questionSpoken}
                  />
                </View>
              );
            })}
          </View>

          {/* Speaking indicator for options */}
          {questionSpoken && visibleOptions < q.options.length && (
            <View style={styles.speakingIndicator}>
              <Text style={styles.speakingIndicatorText}>
                🔊 Presenting option {["A", "B", "C", "D"][visibleOptions]}…
              </Text>
            </View>
          )}
        </Animated.View>
      )}
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
          require("../../../../assets/sounds/button.mp3"),
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
      pathname: `features/stories/activities/${nextRoute}`,
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
          <ExpoImage
            source={require("../../../../assets/img/coin.png")}
            style={styles.coinIcon}
            contentFit="contain"
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
        <ExpoImage
          source={{ uri: currentStory.cover }}
          style={styles.coverImage}
          contentFit="cover"
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
        coinsEarned={coinCount}
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
    paddingHorizontal: pad.md,
    paddingTop: STATUS_H + pad.s,
    paddingBottom: pad.sm,
  },
  backBtn: {
    width: size.hitMd,
    height: size.hitMd,
    borderRadius: size.hitMd / 2,
    backgroundColor: C.surfaceDim,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: font.xxl, color: C.textSec, marginTop: -2 },
  topTitle: {
    fontFamily: FONTS.bold,
    flex: 1,
    textAlign: "center",
    fontSize: font.xl,
    color: C.teal,
    letterSpacing: 0.3,
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
  coverTagText: { fontFamily: FONTS.bold, fontSize: font.sm, color: C.teal },

  challengeWrap: { width: "100%", alignItems: "center", paddingTop: pad.md },

  // ── Player card ──
  playerCard: {
    width: "92%",
    backgroundColor: C.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: pad.lg,
    marginBottom: pad.lg,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: pad.md,
  },
  headphonesBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.tealDim,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headphonesIcon: { fontSize: font.xxl },
  playerTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    letterSpacing: 0.3,
  },
  playerSub: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
    marginTop: 3,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: pad.xs,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.15)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: C.teal,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.textMuted,
    textAlign: "right",
    marginBottom: pad.sm,
  },

  waveformWrap: {
    backgroundColor: "rgba(0,0,0,0.22)",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: pad.xs,
    backgroundColor: C.teal,
    borderRadius: radius.pill,
    paddingVertical: pad.sm,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  playBtnIcon: { fontSize: font.md, color: C.bg },
  playBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: C.bg,
    letterSpacing: 0.4,
  },
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
  startQuizBtn: {
    flex: 1,
    backgroundColor: C.teal,
    borderRadius: radius.pill,
    paddingVertical: pad.sm,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  startQuizText: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: "#08081a",
    letterSpacing: 0.4,
  },

  listenNote: {
    marginTop: pad.md,
    backgroundColor: "rgba(0,188,212,0.07)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.18)",
    paddingHorizontal: pad.md,
    paddingVertical: pad.sm,
    alignItems: "center",
  },
  listenNoteText: {
    fontFamily: FONTS.light,
    fontSize: font.md,
    color: C.textMuted,
    textAlign: "center",
  },

  // ── Quiz ──
  quizWrap: { width: "92%" },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: pad.sm,
  },
  quizHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
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
    marginBottom: pad.md,
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

  questionCard: {
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    padding: pad.lg,
    marginBottom: pad.md,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  questionNumBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.tealDim,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    marginBottom: pad.sm,
  },
  questionNumText: {
    fontFamily: FONTS.bold,
    fontSize: font.xs,
    color: C.teal,
    letterSpacing: 1,
  },
  questionText: {
    fontFamily: FONTS.bold,
    fontSize: font.xl,
    color: C.textPri,
    lineHeight: font.lg * 1.5,
    letterSpacing: 0.2,
  },
  questionSpeakingBadge: {
    marginTop: pad.sm,
    backgroundColor: "rgba(0,188,212,0.08)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.2)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.xs,
    alignSelf: "flex-start",
  },
  questionSpeakingText: {
    fontFamily: FONTS.light,
    fontSize: font.xs,
    color: C.textMuted,
  },

  optionsList: { marginBottom: pad.s },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: pad.sm,
    paddingVertical: pad.sm,
    gap: pad.sm,
  },
  optionBullet: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  },
  optionBulletIcon: { fontFamily: FONTS.bold, fontSize: font.md },
  optionText: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: font.lg,
    lineHeight: font.md * 1.5,
  },

  speakingIndicator: {
    backgroundColor: "rgba(0,188,212,0.07)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.18)",
    paddingHorizontal: pad.md,
    paddingVertical: pad.sm,
    alignItems: "center",
    marginBottom: pad.sm,
  },
  speakingIndicatorText: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: C.textMuted,
  },
});
