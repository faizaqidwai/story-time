// app/components/LevelProgressionOverlay.jsx
//
// Shown after StoryFinishOverlay when the user has completed ALL stories
// in their current playLevel. Celebrates the level completion, calls the
// backend to progress the profile, then transitions to the new level's stories.

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import { progressLevel } from "../services/levelProgressionService";
import { FONTS } from "../theme";

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(8,8,26,0.97)",
  teal: "#00BCD4",
  tealBorder: "rgba(0,188,212,0.4)",
  yellow: "#FFD54F",
  yellowGlow: "rgba(255,213,79,0.3)",
  green: "#4CAF50",
  greenBorder: "rgba(76,175,80,0.4)",
  purple: "#9652D9",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

// ── Star burst particle
function StarBurst({ count = 18 }) {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      angle: Math.PI * 2 * Math.random(),
      dist: 80 + Math.random() * 120,
      op: new Animated.Value(0),
      pos: new Animated.Value(0),
      sc: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      const delay = i * 35;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(a.op, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(a.sc, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(a.pos, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(a.op, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => {
        const tx = a.pos.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(a.angle) * a.dist],
        });
        const ty = a.pos.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(a.angle) * a.dist],
        });
        const EMOJIS = ["⭐", "✨", "🌟", "💫", "🎉", "🎊"];
        return (
          <Animated.Text
            key={i}
            style={{
              position: "absolute",
              fontSize: 18 + Math.random() * 10,
              top: SH * 0.38,
              left: SW / 2 - 10,
              opacity: a.op,
              transform: [
                { translateX: tx },
                { translateY: ty },
                { scale: a.sc },
              ],
            }}
          >
            {EMOJIS[i % EMOJIS.length]}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ── Main overlay
export default function LevelProgressionOverlay({
  visible,
  completedLevel,
  profileId,
  lastActivity,
  onProgressComplete,
  onDismiss,
}) {
  const [phase, setPhase] = useState("hidden");
  const [error, setError] = useState(null);

  const sheetY = useRef(new Animated.Value(SH)).current;
  const scrOp = useRef(new Animated.Value(0)).current;
  const badgeSc = useRef(new Animated.Value(0)).current;
  const badgeOp = useRef(new Animated.Value(0)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const sndFanfare = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/fairy-glitter.wav"),
        );
        if (alive) sndFanfare.current = sound;
        else sound.unloadAsync();
      } catch (_) {}
    })();
    return () => {
      alive = false;
      sndFanfare.current?.unloadAsync();
      sndFanfare.current = null;
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: SH,
          duration: 350,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scrOp, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setPhase("hidden"));
      return;
    }

    setPhase("celebrating");
    setError(null);

    sheetY.setValue(SH);
    scrOp.setValue(0);
    badgeSc.setValue(0);
    badgeOp.setValue(0);
    textOp.setValue(0);

    Animated.parallel([
      Animated.timing(scrOp, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start(() => {
      try {
        sndFanfare.current
          ?.setPositionAsync(0)
          .then(() => sndFanfare.current?.playAsync());
      } catch (_) {}

      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.spring(badgeSc, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.timing(badgeOp, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(200),
        Animated.timing(textOp, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ).start();

        setTimeout(() => callProgression(), 2000);
      });
    });
  }, [visible]);

  const callProgression = async () => {
    setPhase("loading");
    try {
      const result = await progressLevel(
        profileId,
        completedLevel,
        lastActivity,
      );
      if (result.noNextLevel) {
        setPhase("final_level");
      } else {
        onProgressComplete?.(result);
      }
    } catch (err) {
      console.log("[LEVEL PROGRESSION ERR]" + JSON.stringify(err));
      setError("Could not advance level. Please try again.");
      setPhase("celebrating");
    }
  };

  if (phase === "hidden" && !visible) return null;

  return (
    <Modal
      transparent
      visible={visible || phase !== "hidden"}
      animationType="none"
      onRequestClose={() => {}}
    >
      <View style={s.shell} pointerEvents="box-none">
        <Animated.View
          style={[s.scrim, { opacity: scrOp }]}
          pointerEvents="none"
        />

        <TouchableOpacity
          style={s.scrimTap}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onDismiss}
            activeOpacity={0.75}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={s.handle} />

          {/* ── CELEBRATING phase ── */}
          {(phase === "celebrating" || phase === "loading") && (
            <View style={s.content}>
              <StarBurst count={20} />

              <Animated.View
                style={[
                  s.levelBadge,
                  {
                    opacity: badgeOp,
                    transform: [{ scale: badgeSc }, { scale: pulseAnim }],
                  },
                ]}
              >
                <Text style={s.levelBadgeEmoji}>🏆</Text>
                <Text style={s.levelBadgeNum}>{completedLevel}</Text>
                <Text style={s.levelBadgeLabel}>COMPLETE</Text>
              </Animated.View>

              <Animated.View style={{ opacity: textOp, alignItems: "center" }}>
                <Text style={s.congrats}>🎉 Congratulations!</Text>
                <Text style={s.subText}>
                  You completed{"\n"}
                  <Text style={s.subTextBold}>Level {completedLevel}</Text>
                </Text>
                <Text style={s.hint}>
                  All stories mastered! Advancing to next level...
                </Text>
              </Animated.View>

              {phase === "loading" && (
                <ActivityIndicator
                  color={C.teal}
                  size="large"
                  style={{ marginTop: 24 }}
                />
              )}

              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={s.retryBtn}
                    onPress={callProgression}
                    activeOpacity={0.8}
                  >
                    <Text style={s.retryBtnText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ── FINAL LEVEL phase ── */}
          {phase === "final_level" && (
            <View style={s.content}>
              <Text style={s.finalEmoji}>🌟</Text>
              <Text style={s.congrats}>Amazing!</Text>
              <Text style={s.subText}>
                You've completed{"\n"}
                <Text style={s.subTextBold}>all available levels!</Text>
              </Text>
              <Text style={s.hint}>
                More levels are coming soon. Keep exploring!
              </Text>
              <TouchableOpacity
                style={s.doneBtn}
                onPress={onDismiss}
                activeOpacity={0.85}
              >
                <Text style={s.doneBtnText}>Back to Home 🏠</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "transparent" },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.75,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.tealBorder,
    alignItems: "center",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 10,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },

  // Level badge
  levelBadge: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,213,79,0.12)",
    borderWidth: 3,
    borderColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 8,
  },
  levelBadgeEmoji: { fontSize: 32, marginBottom: -4 },
  // Level number — bold, large, yellow
  levelBadgeNum: {
    fontFamily: FONTS.bold,
    fontSize: 38,
    color: C.yellow,
    lineHeight: 42,
  },
  // "COMPLETE" label — bold, small caps, yellow
  levelBadgeLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: C.yellow,
    letterSpacing: 2,
  },

  // Congratulations headline — bold, large
  congrats: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: C.textPri,
    textAlign: "center",
  },
  // "You completed…" body — light, muted
  subText: {
    fontFamily: FONTS.light,
    fontSize: 16,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  // Level number inline — bold, teal
  subTextBold: {
    fontFamily: FONTS.bold,
    color: C.teal,
  },
  // Hint italic — light
  hint: {
    fontFamily: FONTS.light,
    fontSize: 12,
    color: C.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },

  finalEmoji: { fontSize: 72, marginBottom: 8 },

  errorBox: { alignItems: "center", gap: 10, marginTop: 8 },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "#EF5350",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "rgba(0,188,212,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  // "Try Again" — bold, teal
  retryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: C.teal,
  },

  doneBtn: {
    backgroundColor: C.teal,
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 16,
    marginTop: 16,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  // "Back to Home" — bold, dark
  doneBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#08081a",
  },

  scrimTap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: SH * 0.75,
  },

  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // Close ✕ — regular, muted
  closeBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 14,
  },
});
