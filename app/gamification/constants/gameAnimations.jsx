/**
 * gameAnimations.jsx
 * app/gamification/constants/gameAnimations.jsx
 *
 * Registry that maps a gameId to its animated mini component.
 *
 * ── HOW TO ADD A NEW GAME ANIMATION ──────────────────────────────────────────
 * 1. Build your mini component in this file (or import it from a separate file)
 * 2. Add one entry to GAME_ANIMATIONS:
 *      [GAME_IDS.YOUR_NEW_GAME]: YourMiniComponent,
 * 3. Done — GameCard picks it up automatically. No other file changes.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * If a gameId has no entry here, GameCard falls back to a generic
 * bouncing emoji animation using the game's icon field from GAME_REGISTRY.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { isTablet } from "../../theme/tokens";
import { GAME_IDS } from "./gameIds";

// ─────────────────────────────────────────────────────────────────────────────
// MINI BIRD (Flappy Word)
// ─────────────────────────────────────────────────────────────────────────────
function MiniBird() {
  const wingAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wingAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(wingAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const wingY = wingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const containerH = isTablet ? 100 : 72;
  const bodyW = isTablet ? 94 : 68;
  const bodyH = isTablet ? 70 : 50;
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginTop: 18,
        marginBottom: 6,
        height: containerH,
      }}
    >
      <View
        style={{
          width: bodyW,
          height: bodyH,
          borderRadius: 25,
          backgroundColor: "#FFD54F",
          borderWidth: 3,
          borderColor: "#FF8F00",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          shadowColor: "#FFD54F",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: -12,
            left: 20,
            width: 30,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#FFA000",
            borderWidth: 2,
            borderColor: "#FF6F00",
            transform: [{ rotate: "-15deg" }, { translateY: wingY }],
          }}
        />
        <View
          style={{
            position: "absolute",
            right: 13,
            top: 10,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: "#fff",
            borderWidth: 1.5,
            borderColor: "rgba(0,0,0,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: "#111",
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            right: -10,
            top: "38%",
            width: 14,
            height: 10,
            borderRadius: 4,
            backgroundColor: "#FF6D00",
            borderWidth: 1.5,
            borderColor: "#E65100",
          }}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI CAT (Dodge Car)
// ─────────────────────────────────────────────────────────────────────────────
function MiniCat() {
  const tailAnim = useRef(new Animated.Value(0)).current;
  const earAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tailAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tailAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    const twitch = () => {
      Animated.sequence([
        Animated.timing(earAnim, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(earAnim, {
          toValue: 0,
          duration: 130,
          useNativeDriver: true,
        }),
      ]).start(() => setTimeout(twitch, 1800 + Math.random() * 1200));
    };
    twitch();
  }, []);
  const tailRot = tailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-22deg", "22deg"],
  });
  const earSc = earAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });
  const sz = isTablet ? 100 : 72;
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: sz,
        height: sz,
        alignSelf: "center",
        marginTop: 14,
        marginBottom: 6,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          bottom: 4,
          right: 2,
          width: 16,
          height: 30,
          backgroundColor: "#F4A460",
          borderRadius: 8,
          borderWidth: 2,
          borderColor: "#CD853F",
          transform: [{ rotate: tailRot }],
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 8,
          width: 52,
          height: 38,
          backgroundColor: "#F4A460",
          borderRadius: 14,
          borderWidth: 2,
          borderColor: "#CD853F",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 4,
        }}
      >
        <View
          style={{
            width: "52%",
            height: "42%",
            backgroundColor: "#FAEBD7",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(205,133,63,0.3)",
          }}
        />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
          <View
            style={{
              width: 10,
              height: 7,
              borderRadius: 5,
              backgroundColor: "#F4A460",
              borderWidth: 1.5,
              borderColor: "#CD853F",
            }}
          />
          <View
            style={{
              width: 10,
              height: 7,
              borderRadius: 5,
              backgroundColor: "#F4A460",
              borderWidth: 1.5,
              borderColor: "#CD853F",
            }}
          />
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 10,
          width: 44,
          height: 36,
          backgroundColor: "#F4A460",
          borderRadius: 22,
          borderWidth: 2,
          borderColor: "#CD853F",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: -9,
            left: 4,
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderBottomWidth: 11,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "#F4A460",
            transform: [{ scale: earSc }],
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 3,
              left: -4,
              width: 0,
              height: 0,
              borderLeftWidth: 4,
              borderRightWidth: 4,
              borderBottomWidth: 6,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: "#FFB6C1",
            }}
          />
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            top: -9,
            right: 4,
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderBottomWidth: 11,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "#F4A460",
            transform: [{ scale: earSc }],
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 3,
              left: -4,
              width: 0,
              height: 0,
              borderLeftWidth: 4,
              borderRightWidth: 4,
              borderBottomWidth: 6,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: "#FFB6C1",
            }}
          />
        </Animated.View>
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 7,
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: "#7CFC00",
            borderWidth: 1.5,
            borderColor: "#228B22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 3,
              height: 6,
              borderRadius: 1.5,
              backgroundColor: "#111",
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 7,
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: "#7CFC00",
            borderWidth: 1.5,
            borderColor: "#228B22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 3,
              height: 6,
              borderRadius: 1.5,
              backgroundColor: "#111",
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 9,
            left: "50%",
            marginLeft: -3,
            width: 0,
            height: 0,
            borderLeftWidth: 3,
            borderRightWidth: 3,
            borderTopWidth: 4,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "#FF69B4",
          }}
        />
        {[
          { bottom: 12, left: 0 },
          { bottom: 9, left: 0 },
          { bottom: 12, right: 0 },
          { bottom: 9, right: 0 },
        ].map((pos, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              ...pos,
              width: 12,
              height: 1.5,
              backgroundColor: "rgba(100,60,20,0.45)",
              borderRadius: 1,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI MONKEY (Monkey Fishing)
// ─────────────────────────────────────────────────────────────────────────────
function MiniMonkey() {
  const rodAnim = useRef(new Animated.Value(0)).current;
  const fishAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rodAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rodAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(fishAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fishAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const rodRot = rodAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-6deg", "6deg"],
  });
  const fishY = fishAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const containerH = isTablet ? 100 : 72;
  const bodySize = isTablet ? 54 : 40;
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginTop: 14,
        marginBottom: 6,
        height: containerH,
      }}
    >
      <View
        style={{
          width: bodySize,
          height: bodySize,
          borderRadius: bodySize / 2,
          backgroundColor: "#8B5E3C",
          borderWidth: 2.5,
          borderColor: "#5C3A1E",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#8B5E3C",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <View
          style={{
            width: bodySize * 0.6,
            height: bodySize * 0.55,
            borderRadius: bodySize * 0.3,
            backgroundColor: "#D4956A",
            borderWidth: 1,
            borderColor: "#B07040",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: bodySize * 0.18,
            left: bodySize * 0.2,
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#111",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: bodySize * 0.18,
            right: bodySize * 0.2,
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#111",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: bodySize * 0.18,
            width: 12,
            height: 6,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            borderWidth: 1.5,
            borderColor: "#5C3A1E",
            borderTopWidth: 0,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: bodySize * 0.1,
            left: -8,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "#8B5E3C",
            borderWidth: 2,
            borderColor: "#5C3A1E",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: bodySize * 0.1,
            right: -8,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "#8B5E3C",
            borderWidth: 2,
            borderColor: "#5C3A1E",
          }}
        />
      </View>
      <Animated.View
        style={{
          position: "absolute",
          top: 4,
          right: isTablet ? 14 : 8,
          width: isTablet ? 44 : 32,
          height: 3,
          backgroundColor: "#5C3A1E",
          borderRadius: 2,
          transform: [{ rotate: rodRot }],
        }}
      />
      <Animated.Text
        style={{
          position: "absolute",
          bottom: isTablet ? 6 : 2,
          right: isTablet ? 4 : 0,
          fontSize: isTablet ? 20 : 14,
          transform: [{ translateY: fishY }],
        }}
      >
        🐟
      </Animated.Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Mini Scene Detective card mascot
// ─────────────────────────────────────────────────────────────────────────────
function MiniDetective() {
  const bobAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -5,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        transform: [{ translateY: bobAnim }],
        alignItems: "center",
        marginTop: 18,
      }}
    >
      {/* Hat */}
      <View
        style={{
          width: 32,
          height: 7,
          backgroundColor: "#0d0d1a",
          borderRadius: 3,
          marginBottom: -1,
        }}
      />
      <View
        style={{
          width: 40,
          height: 4,
          backgroundColor: "#1a0533",
          borderRadius: 2,
          marginBottom: 0,
        }}
      />
      {/* Head */}
      <View
        style={{
          width: 34,
          height: 30,
          backgroundColor: "#FBBF24",
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: "#1a1a2e",
            }}
          />
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: "#1a1a2e",
            }}
          />
        </View>
      </View>
      {/* Body with magnifying glass */}
      <View
        style={{
          width: 36,
          height: 22,
          backgroundColor: "#7C3AED",
          borderRadius: 7,
          marginTop: 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12 }}>🔍</Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Mini Spin Wheel card mascot
// ─────────────────────────────────────────────────────────────────────────────
function MiniParrot() {
  const bobAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        transform: [{ translateY: bobAnim }],
        alignItems: "center",
        marginTop: 16,
      }}
    >
      {/* Body */}
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: "#EF4444",
          borderWidth: 2,
          borderColor: "#B91C1C",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Wing */}
        <View
          style={{
            position: "absolute",
            left: -10,
            top: 8,
            width: 14,
            height: 20,
            backgroundColor: "#10B981",
            borderRadius: 7,
            transform: [{ rotate: "-20deg" }],
          }}
        />
        {/* Eye */}
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#fff",
            position: "absolute",
            top: 7,
            right: 7,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#111",
            }}
          />
        </View>
        {/* Beak */}
        <View
          style={{
            position: "absolute",
            bottom: 7,
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 8,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "#F59E0B",
          }}
        />
      </View>
      {/* Wheel (helm) */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 3,
          borderColor: "#F59E0B",
          marginTop: 4,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(245,158,11,0.15)",
        }}
      >
        <View
          style={{
            width: 2,
            height: 28,
            backgroundColor: "#F59E0B",
            position: "absolute",
          }}
        />
        <View
          style={{
            width: 28,
            height: 2,
            backgroundColor: "#F59E0B",
            position: "absolute",
          }}
        />
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#F59E0B",
          }}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY
// Map gameId → mini animation component.
// Add new games here — GameCard reads this and never needs to change.
// ─────────────────────────────────────────────────────────────────────────────
export const GAME_ANIMATIONS = {
  [GAME_IDS.FLAPPY_WORD]: MiniBird,
  [GAME_IDS.DODGE_CAR]: MiniCat,
  [GAME_IDS.MONKEY_FISHING]: MiniMonkey,
  // Add new games below:
  // [GAME_IDS.DINO_WORLD]:        MiniDino,
  // [GAME_IDS.POLICE_PURSUIT]:    MiniPolice,
  // [GAME_IDS.SUPER_HERO_MISSION]:MiniHero,
  // [GAME_IDS.TREASURE_HUNT]:     MiniTreasure,
};
