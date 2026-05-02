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
import { progressLevel } from "../../../services/levelProgressionService";
import { FONTS } from "../../../theme";
import { font, pad, radius, size } from "../../../theme/tokens";

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
              fontSize: font.lg + Math.random() * 10, // 18 → font.lg (17/22)
              top: SH * 0.1,
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
          require("../../../../assets/sounds/fairy-glitter.wav"),
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
                <Text style={s.congrats}>Congratulations!</Text>
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
                  style={{ marginTop: pad.xl }} // 24 → pad.xl (24/33)
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
    borderTopLeftRadius: radius.xxl, // 28 → radius.xxl (32/44)
    borderTopRightRadius: radius.xxl, // 28 → radius.xxl
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.tealBorder,
    alignItems: "center",
    paddingTop: pad.s, // 8 → pad.s (8/11)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.xs, // 3 → radius.xs (6/8) — closest pill shape
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: pad.s, // 10 → pad.s (8/11)
  },
  content: {
    flex: 1,
    alignItems: "center",
    marginTop: 100,
    paddingHorizontal: pad.xxl, // 32 → pad.xxl (32/44)
    gap: pad.sm, // 12 → pad.sm (12/16)
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
    marginBottom: pad.s, // 8 → pad.s (8/11)
  },
  levelBadgeEmoji: { fontSize: font.h3, marginBottom: -4 }, // 32 → font.h3 (28/38)
  levelBadgeNum: {
    fontFamily: FONTS.bold,
    fontSize: font.h2, // 38 → font.h2 (34/46)
    color: C.yellow,
    lineHeight: font.h2 + 4,
  },
  levelBadgeLabel: {
    fontFamily: FONTS.bold,
    fontSize: font.xs, // 10 → font.xs (9/12)
    color: C.yellow,
    letterSpacing: 2,
  },

  congrats: {
    fontFamily: FONTS.bold,
    fontSize: font.h3, // 32 → font.h3 (28/38)
    color: C.textPri,
    textAlign: "center",
    marginBottom: pad.s, // 10 → pad.s (8/11)
  },
  subText: {
    fontFamily: FONTS.light,
    fontSize: font.xxl, // 22 → font.xxl (24/32)
    color: C.textMuted,
    textAlign: "center",
    lineHeight: font.xxl + 2,
    marginBottom: pad.s, // 10 → pad.s
  },
  subTextBold: {
    fontFamily: FONTS.bold,
    color: C.teal,
    marginBottom: pad.s,
  },
  hint: {
    fontFamily: FONTS.light,
    fontSize: font.lg, // 16 → font.lg (17/22)
    color: C.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: pad.xs, // 4 → pad.xs (4/6)
  },

  finalEmoji: { fontSize: font.h1, marginBottom: pad.s }, // 72 → font.h1 (40/54) — closest large token

  errorBox: { alignItems: "center", gap: pad.s, marginTop: pad.s }, // gap/marginTop 10/8 → pad.s
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: font.s, // 13 → font.s (12/14)
    color: "#EF5350",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "rgba(0,188,212,0.15)",
    borderRadius: radius.sm, // 12 → radius.sm (10/14)
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: pad.xl, // 24 → pad.xl (24/33)
    paddingVertical: pad.s, // 10 → pad.s (8/11)
  },
  retryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.s, // 13 → font.s (12/14)
    color: C.teal,
  },

  doneBtn: {
    backgroundColor: C.teal,
    borderRadius: radius.pill, // 24 → radius.pill (999) — it's a full pill
    paddingHorizontal: pad.xxxl, // 40 → pad.xxxl (48/66)
    paddingVertical: pad.md, // 16 → pad.md (16/22)
    marginTop: pad.md, // 16 → pad.md
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  doneBtnText: {
    fontFamily: FONTS.bold,
    fontSize: font.lg, // 16 → font.lg (17/22)
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
    top: pad.sm, // 14 → pad.sm (12/16)
    right: pad.md, // 16 → pad.md (16/22)
    width: size.hitSm, // 28 → size.hitSm (36/48) — slightly larger, better touch target
    height: size.hitSm,
    borderRadius: size.hitSm / 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeBtnText: {
    fontFamily: FONTS.regular,
    fontSize: font.s, // 12 → font.s (12/14)
    color: "rgba(255,255,255,0.6)",
    lineHeight: font.s + 2,
  },
});
