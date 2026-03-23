import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Image } from "react-native";
import { Text } from "react-native";
import { Audio } from "expo-av";

const eggImg = require("../../assets/img/egg.png");
const crackImg = require("../../assets/img/egg-crack.png");
const chickImg = require("../../assets/img/chick.png");

export default function BirdProgressBar({
  progress = 0,
  totalLevels = 5,
  segmentWidth = 60,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  const crackSound = useRef(null);

  const lastPlayedLevel = useRef(-1);

  // Load sound once
  useEffect(() => {
    async function loadSound() {
      crackSound.current = new Audio.Sound();

      await crackSound.current.loadAsync(
        require("../../assets/sounds/egg-crack.mp3"),
      );
    }

    loadSound();

    return () => {
      crackSound.current?.unloadAsync();
    };
  }, []);

  // Animate progress
  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Detect 80% crack
  useEffect(() => {
    const level = Math.floor(progress);

    const percent = progress - level;

    if (percent >= 0.8 && lastPlayedLevel.current !== level) {
      lastPlayedLevel.current = level;

      playCrack();
    }
  }, [progress]);

  async function playCrack() {
    try {
      await crackSound.current.replayAsync();
    } catch {}
  }

  const levels = Array.from({ length: totalLevels }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      {/* LEVEL 0 DOT */}

      <View style={styles.segment}>
        <View style={styles.nodeContainer}>
          <View style={styles.startDot} />

          <Text style={styles.levelText}>L0</Text>
        </View>

        <Line anim={anim} from={0} width={segmentWidth} />
      </View>

      {/* LEVELS */}

      {levels.map((level) => {
        const relative = progress - level;

        let image = eggImg;

        if (relative >= 0) image = chickImg;
        else if (relative >= -0.2) image = crackImg;

        return (
          <View key={level} style={styles.segment}>
            <View style={styles.nodeContainer}>
              <Image source={image} style={styles.image} />

              <Text style={styles.levelText}>L{level}</Text>
            </View>

            {level < totalLevels && (
              <Line anim={anim} from={level} width={segmentWidth} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function Line({ anim, from, width }) {
  const fill = anim.interpolate({
    inputRange: [from, from + 1],

    outputRange: ["0%", "100%"],

    extrapolate: "clamp",
  });

  return (
    <View style={[styles.lineWrapper, { width }]}>
      <View style={styles.lineBg} />

      <Animated.View style={[styles.lineFill, { width: fill }]} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",

    alignItems: "center",
  },
  nodeContainer: {
    alignItems: "center",

    justifyContent: "center",
  },

  levelText: {
    marginTop: 4,

    fontSize: 12,

    color: "#444",

    fontWeight: "600",
  },

  segment: {
    flexDirection: "row",

    alignItems: "center",
  },

  image: {
    width: 40,

    height: 55,

    zIndex: 2,
  },

  startDot: {
    width: 18,

    height: 18,

    borderRadius: 9,

    backgroundColor: "#FFD700",

    zIndex: 2,
  },

  lineWrapper: {
    height: 8,

    justifyContent: "center",
  },

  lineBg: {
    position: "absolute",

    width: "100%",

    height: 8,

    backgroundColor: "#e8e6e6",

    borderRadius: 10,
  },

  lineFill: {
    position: "absolute",

    height: 8,

    backgroundColor: "#FFD700",

    borderRadius: 10,
  },
});
