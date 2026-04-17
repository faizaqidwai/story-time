// components/WordGuessGame.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
  Animated,
  Easing,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { useRouter, useLocalSearchParams } from "expo-router";
import WORDS from "../data/words.json";
import GameEnd from "./GameEnd";
import BadgePopup from "./BadgePopup";
import { Image as ExpoImage } from "expo-image";
import {
  useStoryActivity,
  ACTIVITY,
  ACTIVITY_ROUTES,
} from "../_contexts/StoryActivityContext";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 50;

const COLORS = {
  darkBg: "#08081a",
  darkBg2: "#0f0f2a",
  surface: "rgba(255,255,255,0.05)",
  surfaceDim: "rgba(255,255,255,0.08)",
  teal: "#00BCD4",
  tealLight: "#4DD0E1",
  purple: "#9652D9",
  purpleLight: "#BA86FF",
  yellow: "#FFD54F",
  yellowLight: "#FFE082",
  pink: "#FF6B9D",
  textPrimary: "#FFFFFF",
  textSecondary: "#B0BEC5",
  textMuted: "#607D8B",
  borderTeal: "rgba(0,188,212,0.3)",
  borderTealBold: "rgba(0,188,212,0.6)",
  correct: "#4CAF50",
  wrong: "#EF5350",
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
        width: 24,
        height: 24,
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
// DIALOGUE CLOUD
//
// CHANGED: removed slideY / translateY entirely.
// The cloud now pops in → holds → fades out in place.
// onMergeComplete fires after the fade, adding the hint to hintsInBox
// with no visible "flying into the box" motion.
// ─────────────────────────────────────────────────────────────────────────────
function DialogueCloud({ text, visible, onMergeComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (!visible || !text) return;

    fadeAnim.setValue(0);
    textFade.setValue(0);
    scaleAnim.setValue(0.75);

    // 1. Pop in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Reveal text
      Animated.timing(textFade, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start(() => {
        // 3. Hold 2 s, then fade out in place — no slide, no translateY
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }).start(() => onMergeComplete?.());
        }, 2000);
      });
    });
  }, [visible, text]);

  if (!visible) return null;

  const bumps = [20, 28, 24, 32, 26, 30, 18];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cloudWrapper,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.cloudBumpsRow}>
        {bumps.map((bSize, i) => (
          <View
            key={i}
            style={{
              width: bSize,
              height: bSize,
              borderRadius: bSize / 2,
              backgroundColor: "#FFFFFF",
              marginHorizontal: -2,
              alignSelf: i % 2 === 0 ? "flex-end" : "flex-start",
              marginTop: i % 2 === 0 ? 0 : 4,
            }}
          />
        ))}
      </View>
      <View style={styles.cloudBody}>
        <Animated.Text style={[styles.cloudText, { opacity: textFade }]}>
          {text}
        </Animated.Text>
      </View>
      <View style={styles.cloudTailRow}>
        <View style={styles.cloudTailTriangle} />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PULSING TITLE
// ─────────────────────────────────────────────────────────────────────────────
function PulsingTitle() {
  const pulse = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sc, {
            toValue: 1.045,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sc, {
            toValue: 1,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });
  return (
    <Animated.Text
      style={[styles.challengeTitle, { opacity, transform: [{ scale: sc }] }]}
    >
      Word Guess Challenge
    </Animated.Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HINT ROW  — tap the row or the 🔊 button to hear the hint read aloud
// ─────────────────────────────────────────────────────────────────────────────
function HintRow({ index, text, isPlaying, isTablet, onSpeak }) {
  const speakerScale = useRef(new Animated.Value(1)).current;
  const speakerLoop = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      speakerLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(speakerScale, {
            toValue: 1.3,
            duration: 350,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(speakerScale, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      speakerLoop.current.start();
    } else {
      speakerLoop.current?.stop();
      speakerLoop.current = null;
      Animated.spring(speakerScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      speakerLoop.current?.stop();
      speakerLoop.current = null;
    };
  }, [isPlaying]);

  return (
    <TouchableOpacity
      style={[styles.hintRow, isPlaying && styles.hintRowActive]}
      onPress={onSpeak}
      activeOpacity={0.75}
    >
      <View
        style={[styles.hintNumBadge, isPlaying && styles.hintNumBadgeActive]}
      >
        <Text style={[styles.hintNum, isPlaying && styles.hintNumActive]}>
          {index + 1}
        </Text>
      </View>
      <Text
        style={[
          styles.hintText,
          { fontSize: isTablet ? font.xl : font.lg },
          isPlaying && styles.hintTextActive,
        ]}
      >
        {text}
      </Text>
      <Animated.View
        style={[
          styles.speakerBtn,
          isPlaying && styles.speakerBtnActive,
          { transform: [{ scale: speakerScale }] },
        ]}
      >
        <Text style={styles.speakerIcon}>{isPlaying ? "🔊" : "🔈"}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const WordGuessGame = ({ onExit }) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { storySession, completeActivity } = useStoryActivity();

  const wordPool = (() => {
    const snap = storySession?.activityDataSnapshot?.wordGuess;
    if (snap && snap.length > 0) return snap;
    return WORDS;
  })();

  const getNewWord = () =>
    wordPool[Math.floor(Math.random() * wordPool.length)];
  const initialData = useRef(getNewWord()).current;

  const [showGameEnd, setShowGameEnd] = useState(false);
  const [endType, setEndType] = useState(null);
  const [endWord, setEndWord] = useState(null);
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [word, setWord] = useState(initialData.word.toUpperCase());
  const [hints, setHints] = useState(initialData.hints);
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongLetters, setWrongLetters] = useState([]);
  const [remainingChances, setRemainingChances] = useState(5);
  const [gameStatus, setGameStatus] = useState("playing");
  const [cloudText, setCloudText] = useState("");
  const [cloudVisible, setCloudVisible] = useState(false);
  const [hintsInBox, setHintsInBox] = useState([]);
  const [flyingCoins, setFlyingCoins] = useState([]);
  const [coinCount, setCoinCount] = useState(0);
  const [playingHint, setPlayingHint] = useState(null);

  const coinScaleAnim = useRef(new Animated.Value(1)).current;
  const coinShakeAnim = useRef(new Animated.Value(0)).current;
  const coinBadgeRef = useRef(null);
  const letterBoxRefs = useRef({});
  const coinIdRef = useRef(0);
  const soundRef = useRef(null);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    if (hints?.length > 0)
      setTimeout(() => {
        setCloudText(hints[0]);
        setCloudVisible(true);
      }, 900);
  }, []);

  const handleCloudMerge = () => {
    setCloudVisible(false);
    setHintsInBox((prev) =>
      prev.includes(cloudText) ? prev : [...prev, cloudText],
    );
  };

  useEffect(() => {
    if (gameStatus !== "playing") return;
    const allGuessed = word
      .split("")
      .every((l) => guessedLetters.includes(l) || l === " ");
    if (allGuessed) {
      setGameStatus("won");
      setEndType("won");
      setEndWord(word);
      setShowGameEnd(true);
    } else if (remainingChances === 0) {
      setGameStatus("lost");
      setEndType("lose");
      setEndWord(word);
      setShowGameEnd(true);
    }
  }, [guessedLetters, remainingChances]);

  const handleLetterPress = (letter) => {
    if (gameStatus !== "playing") return;
    if (guessedLetters.includes(letter) || wrongLetters.includes(letter))
      return;
    if (word.includes(letter)) {
      setGuessedLetters((prev) => [...prev, letter]);
      playSound(require("../../assets/sounds/correct.mp3"));
      spawnCoins(letter);
    } else {
      const newChances = remainingChances - 1;
      setWrongLetters((prev) => [...prev, letter]);
      setRemainingChances(newChances);
      playSound(require("../../assets/sounds/incorrect.mp3"));
      const nextIdx = hintsInBox.length;
      if (newChances > 0 && nextIdx < hints.length && hints[nextIdx]) {
        setTimeout(() => {
          setCloudText(hints[nextIdx]);
          setCloudVisible(true);
        }, 400);
      }
    }
  };

  const spawnCoins = (letter) => {
    coinBadgeRef.current?.measureInWindow((bx, by, bw, bh) => {
      const toX = bx + bw / 2;
      const toY = by + bh / 2;
      const doSpawn = (fromX, fromY) => {
        const newCoins = Array.from({ length: COINS_PER_CORRECT }, (_, i) => ({
          id: ++coinIdRef.current,
          fromX: fromX + (Math.random() - 0.5) * 28,
          fromY: fromY + (Math.random() - 0.5) * 18,
          toX,
          toY,
          delay: i * 75,
        }));
        setFlyingCoins((prev) => [...prev, ...newCoins]);
      };
      const ref = letterBoxRefs.current[letter];
      if (ref) {
        ref.measureInWindow((lx, ly, lw, lh) =>
          doSpawn(lx + lw / 2, ly + lh / 2),
        );
      } else {
        doSpawn(SW / 2, SH * 0.55);
      }
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

  const playSound = async (file) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(file);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  };

  const handleHintSpeak = (text, idx) => {
    if (playingHint === idx) {
      Speech.stop();
      setPlayingHint(null);
      return;
    }
    Speech.stop();
    setPlayingHint(idx);
    Speech.speak(text, {
      language: "en",
      pitch: 1.05,
      rate: 0.82,
      onDone: () => setPlayingHint(null),
      onStopped: () => setPlayingHint(null),
      onError: () => setPlayingHint(null),
    });
  };

  const renderWord = () =>
    word.split("").map((letter, index) => {
      if (letter === " ")
        return <View key={index} style={{ width: isTablet ? 22 : 13 }} />;
      const isGuessed = guessedLetters.includes(letter);
      return (
        <View
          key={index}
          ref={(r) => {
            if (r && !letterBoxRefs.current[letter])
              letterBoxRefs.current[letter] = r;
          }}
          style={[styles.letterBox, { marginHorizontal: isTablet ? 6 : 3 }]}
        >
          <Text
            style={[
              styles.letterText,
              { fontSize: isTablet ? font.h3 : font.xl },
            ]}
          >
            {isGuessed ? letter : ""}
          </Text>
          <View
            style={[
              styles.underline,
              isGuessed && styles.underlineGuessed,
              { width: isTablet ? 38 : 24, height: isTablet ? 4 : 2 },
            ]}
          />
        </View>
      );
    });

  const proceedToNextActivity = async () => {
    if (!storySession) {
      resetGame();
      return;
    }
    await completeActivity(
      ACTIVITY.WORD_STORY_CHALLENGE,
      {
        word,
        won: gameStatus === "won",
        coinsEarned: coinCount,
        wrongLetters,
        remainingChances,
      },
      { coins: coinCount },
    );
    const nextRoute = ACTIVITY_ROUTES[ACTIVITY.WORD_LISTENING_CHALLENGE];
    router.replace({
      pathname: `/components/${nextRoute}`,
      params: { storyId: storySession.storyId, title: storySession.storyTitle },
    });
  };

  const resetGame = () => {
    const data = getNewWord();
    letterBoxRefs.current = {};
    setWord(data.word.toUpperCase());
    setHints(data.hints);
    setGuessedLetters([]);
    setWrongLetters([]);
    setRemainingChances(5);
    setGameStatus("playing");
    setHintsInBox([]);
    setCloudVisible(false);
    setCloudText("");
    setFlyingCoins([]);
    setEndWord(null);
    setPlayingHint(null);
    Speech.stop();
    setTimeout(() => {
      setCloudText(data.hints[0]);
      setCloudVisible(true);
    }, 900);
  };

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      Speech.stop();
    };
  }, []);

  return (
    <View style={styles.root}>
      {flyingCoins.map((c) => (
        <FlyingCoin key={c.id} {...c} onLand={() => handleCoinLand(c.id)} />
      ))}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={() => (onExit ? onExit() : router.back())}
            activeOpacity={0.75}
          >
            <Text style={styles.exitIcon}>✕</Text>
            <Text style={styles.exitText}>Exit</Text>
          </TouchableOpacity>
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

        <View style={styles.titleSection}>
          <PulsingTitle />
        </View>

        <View style={styles.birdSection}>
          <DialogueCloud
            text={cloudText}
            visible={cloudVisible}
            onMergeComplete={handleCloudMerge}
          />
          <ExpoImage
            source={require("../../assets/img/owl.png")}
            style={[
              styles.birdImg,
              { width: isTablet ? 150 : 100, height: isTablet ? 150 : 100 },
            ]}
            contentFit="contain"
          />
          <View
            style={[styles.flowerCard, { width: isTablet ? "78%" : "92%" }]}
          >
            <View style={styles.dotsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.heart,
                    i < remainingChances ? styles.heartOn : styles.heartOff,
                  ]}
                >
                  ♥
                </Text>
              ))}
            </View>
            <Text style={styles.chancesText}>
              {remainingChances} chance{remainingChances !== 1 ? "s" : ""}{" "}
              remaining
            </Text>
          </View>
        </View>

        {/* Hints box */}
        <View
          style={[
            styles.hintsBox,
            { width: isTablet ? "78%" : "92%", height: isTablet ? 300 : 260 },
          ]}
        >
          <View style={styles.hintsTitleRow}>
            <Text style={styles.hintsBulb}>💡</Text>
            <Text style={styles.hintsLabel}>Hints</Text>
            {hintsInBox.length > 0 && (
              <Text style={styles.tapToHearLabel}>tap to hear</Text>
            )}
          </View>
          {hintsInBox.length === 0 ? (
            <Text style={styles.hintsEmpty}>Hints will merge here…</Text>
          ) : (
            hintsInBox.map((h, i) => (
              <HintRow
                key={i}
                index={i}
                text={h}
                isPlaying={playingHint === i}
                isTablet={isTablet}
                onSpeak={() => handleHintSpeak(h, i)}
              />
            ))
          )}
        </View>

        <View style={styles.wordRow}>{renderWord()}</View>

        <View style={styles.keyboard}>
          {alphabet.map((letter) => {
            const isGuessed = guessedLetters.includes(letter);
            const isWrong = wrongLetters.includes(letter);
            const disabled = isGuessed || isWrong || gameStatus !== "playing";
            return (
              <TouchableOpacity
                key={letter}
                style={[
                  styles.key,
                  { width: isTablet ? 52 : 35, height: isTablet ? 52 : 35 },
                  isGuessed && styles.keyCorrect,
                  isWrong && styles.keyWrong,
                ]}
                onPress={() => handleLetterPress(letter)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.keyText,
                    { fontSize: isTablet ? font.xl : font.lg },
                    isGuessed && styles.keyTextCorrect,
                    isWrong && styles.keyTextWrong,
                    disabled && !isGuessed && !isWrong && { opacity: 0.32 },
                  ]}
                >
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {gameStatus !== "playing" && (
          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={resetGame}
            activeOpacity={0.85}
          >
            <Text style={styles.playAgainText}>▶ Play Again</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 44 }} />
      </ScrollView>

      <GameEnd
        visible={showGameEnd}
        badge={endType}
        word={endWord}
        onClose={() => {
          setShowGameEnd(false);
          resetGame();
        }}
        onBadge={
          endType === "won"
            ? () => {
                setShowGameEnd(false);
                setShowBadgePopup(true);
              }
            : undefined
        }
        winSubtitle={
          storySession ? "Word cracked! Next: Listening Challenge →" : undefined
        }
        loseSubtitle={
          storySession ? "Keep going! Next challenge awaits." : undefined
        }
      />

      <BadgePopup
        visible={showBadgePopup}
        badge="word_guess_won"
        onClose={() => {
          setShowBadgePopup(false);
          if (storySession) proceedToNextActivity();
          else resetGame();
        }}
        onPlay={() => {
          setShowBadgePopup(false);
          proceedToNextActivity();
        }}
      />
    </View>
  );
};

export default WordGuessGame;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.darkBg },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center", paddingBottom: 20 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: pad.md,
    paddingTop: STATUS_BAR_HEIGHT + pad.sm,
    paddingBottom: pad.s,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.xs,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
  },
  exitIcon: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: COLORS.textMuted,
  },
  exitText: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.xs,
    backgroundColor: "rgba(255,213,79,0.12)",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.55)",
    paddingHorizontal: pad.sm,
    paddingVertical: pad.s,
    shadowColor: COLORS.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  coinIcon: { width: size.iconSm, height: size.iconSm },
  coinCount: {
    fontFamily: FONTS.bold,
    fontSize: font.md,
    color: COLORS.yellow,
  },

  titleSection: {
    marginTop: pad.xs,
    marginBottom: pad.xs,
    alignItems: "center",
  },
  challengeTitle: {
    fontFamily: FONTS.bold,
    fontSize: font.xxl,
    color: COLORS.teal,
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.75)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    textAlign: "center",
  },

  birdSection: {
    // alignItems: "center",
    width: "100%",
    paddingVertical: pad.xs,
    minHeight: "15%",
    //  backgroundColor: "pink",
  },
  birdImg: {
    zIndex: 1,
    bottom: 5,
    position: "absolute",
    left: 25,
  },

  // Dialogue cloud — stays in place, no translateY
  cloudWrapper: {
    alignSelf: "center",
    alignItems: "center",
    zIndex: 20,
    marginBottom: pad.xs,
  },
  cloudBumpsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: -14,
    paddingHorizontal: pad.s,
    zIndex: 2,
  },
  cloudBody: {
    backgroundColor: COLORS.teal,
    borderRadius: radius.lg,
    paddingTop: 20,
    paddingBottom: pad.sm,
    paddingHorizontal: pad.md,
    maxWidth: 260,
    minWidth: 150,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 7,
  },
  cloudText: {
    fontFamily: FONTS.bold,
    fontSize: font.ml,
    color: "#1a1a2e",
    textAlign: "center",
    lineHeight: font.sm * 1.5,
  },
  cloudTailRow: { alignItems: "center", marginTop: -1, zIndex: 0 },
  cloudTailTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 13,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.teal,
  },

  // Hints box
  hintsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: radius.lg,
    padding: pad.sm,
    borderWidth: 1.5,
    borderColor: COLORS.borderTeal,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.11,
    shadowRadius: 9,
    elevation: 3,
    marginBottom: pad.s,
    height: 300,
    // // overflow: "hidden",
  },
  hintsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
    marginBottom: pad.xs,
  },
  hintsBulb: { fontSize: font.md },
  hintsLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.sm,
    color: COLORS.teal,
    letterSpacing: 1,
    textTransform: "uppercase",
    flex: 1,
  },
  tapToHearLabel: {
    fontFamily: FONTS.light,
    fontSize: font.xs,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  hintsEmpty: {
    fontFamily: FONTS.light,
    fontSize: font.sm,
    color: COLORS.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 2,
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: pad.s,
    marginBottom: pad.xs,
    paddingVertical: pad.xs,
    paddingHorizontal: pad.xs,
    borderRadius: radius.sm,
    //  backgroundColor: "pink",
  },
  hintRowActive: {
    backgroundColor: "rgba(0,188,212,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,188,212,0.25)",
  },
  hintNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,188,212,0.18)",
    borderWidth: 1,
    borderColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  hintNumBadgeActive: { backgroundColor: COLORS.teal },
  hintNum: { fontFamily: FONTS.bold, fontSize: font.xs, color: COLORS.teal },
  hintNumActive: { color: "#08081a" },
  hintText: {
    fontFamily: FONTS.regular,
    flex: 1,
    color: COLORS.textSecondary,
    lineHeight: font.md * 1.3,
  },
  hintTextActive: { color: COLORS.textPrimary },
  speakerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  speakerBtnActive: {
    backgroundColor: "rgba(0,188,212,0.18)",
    borderColor: "rgba(0,188,212,0.5)",
  },
  speakerIcon: { fontSize: 15 },

  // Flower card
  flowerCard: {
    // padding: pad.sm,
    //  alignItems: "left",
    position: "absolute",
    bottom: 0,
    borderColor: "rgba(150,82,217,0.26)",
    marginBottom: pad.s,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 9,
    elevation: 3,
    // backgroundColor: "pink",
    height: "40%",
  },
  dotsRow: {
    flexDirection: "row",
    gap: pad.s,
    right: 14,
    marginTop: pad.lg,
    marginBottom: pad.xs,
    // backgroundColor: "red",
    position: "absolute",
    //  bottom: 10,
    alignItems: "right",
  },
  heart: { fontSize: font.xl, alignItems: "left" },
  heartOn: {
    color: "#FF6B9D",
    textShadowColor: "rgba(255,107,157,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  heartOff: { color: "rgba(255,255,255,0.15)" },
  chancesText: {
    fontFamily: FONTS.bold,
    fontSize: font.s,
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    position: "absolute",
    marginTop: pad.s,
    right: 10,
  },

  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 2,
    paddingHorizontal: pad.sm,
    marginBottom: pad.s,
  },
  letterBox: { alignItems: "center", marginVertical: 3, minWidth: 24 },
  letterText: {
    fontFamily: FONTS.bold,
    color: COLORS.teal,
    minHeight: 30,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  underline: {
    backgroundColor: COLORS.teal,
    marginTop: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  underlineGuessed: {
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 4,
    elevation: 2,
  },

  keyboard: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: pad.xs,
    marginTop: pad.sm,
    gap: pad.xs,
  },
  key: {
    backgroundColor: COLORS.surfaceDim,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  keyText: { fontFamily: FONTS.bold, color: COLORS.textPrimary },
  keyCorrect: {
    backgroundColor: "rgba(76,175,80,0.2)",
    borderColor: COLORS.correct,
  },
  keyTextCorrect: { color: COLORS.correct },
  keyWrong: {
    backgroundColor: "rgba(239,83,80,0.12)",
    borderColor: "rgba(239,83,80,0.26)",
  },
  keyTextWrong: { color: "rgba(239,83,80,0.35)" },

  playAgainBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: radius.pill,
    paddingHorizontal: pad.xxl,
    paddingVertical: pad.sm,
    marginTop: pad.s,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  playAgainText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg,
    color: COLORS.darkBg,
    letterSpacing: 0.4,
  },
});
