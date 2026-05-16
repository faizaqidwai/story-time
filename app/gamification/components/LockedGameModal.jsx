/**
 * LockedGameModal.jsx (EXCITING + DYNAMIC)
 */

import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FONTS } from "../../theme";
import { font, pad, radius } from "../../theme/tokens";

const { height: SH } = Dimensions.get("window");

const C = {
  bg: "rgba(8,8,26,0.96)",
  yellow: "#FFD54F",
  glow: "rgba(255,213,79,0.45)",
  textPri: "#E0F7FA",
  textMuted: "#7a9aaa",
};

const SHEET_HEIGHT = SH * 0.6;

/* ---------- DYNAMIC STATE ---------- */

function getState(progress) {
  if (progress >= 2) {
    return {
      title: "🔥 So Close!",
      message: " Only 1 more story to open your surprise!",
      cta: "Unlock Now →",
      scale: 1.05,
    };
  }

  if (progress === 1) {
    return {
      title: "✨ Nice! ✨",
      message: "2 more stories to reveal your surprise",
      cta: "Keep Reading →",
      scale: 1,
    };
  }

  return {
    message: "Read 3 stories to open it",
    cta: "Start Reading →",
    scale: 0.95,
  };
}

/* ---------- COVER ---------- */

const PILE = [
  { x: 0, y: 0, rot: "0deg", sc: 1 },
  { x: -12, y: -8, rot: "-10deg", sc: 0.9 },
  { x: 12, y: -8, rot: "10deg", sc: 0.9 },
];

function CoverPile({ size = 85 }) {
  return (
    <View style={{ width: size + 30, height: size + 30 }}>
      {PILE.map((o, i) => (
        <ExpoImage
          key={i}
          source={require("../../../assets/games/scratch-cover.jpeg")}
          style={{
            position: "absolute",
            width: size * o.sc,
            height: size * o.sc * 1.3,
            bottom: 0,
            left: "50%",
            marginLeft: -(size * o.sc) / 2 + o.x,
            transform: [{ rotate: o.rot }],
            borderRadius: 10,
            opacity: 1 - i * 0.1,
          }}
          contentFit="cover"
        />
      ))}
    </View>
  );
}

/* ---------- MAIN ---------- */

export default function LockedGameModal({
  visible,
  storiesCompleted = 0,
  onClose,
  onGoRead,
}) {
  const state = getState(storiesCompleted);

  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    sheetY.setValue(SHEET_HEIGHT);
    scrim.setValue(0);

    Animated.parallel([
      Animated.timing(scrim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.spring(scale, {
        toValue: state.scale,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scrim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none">
      <View style={s.shell}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[s.scrim, { opacity: scrim }]} />
        </TouchableOpacity>

        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <View style={s.handle} />

          <Animated.View
            style={{
              opacity,
              transform: [{ scale }],
              alignItems: "center",
            }}
          >
            {/* 🎁 VISUAL */}
            <View style={s.visual}>
              <ExpoImage
                source={require("../../../assets/games/surprise.png")}
                style={{
                  width: 400,
                  height: 200,

                  borderRadius: 10,
                }}
                contentFit="contain"
              />
            </View>

            {/* TITLE */}
            {state.title && <Text style={s.title}>{state.title}</Text>}

            {/* PROGRESS */}
            <Text style={s.progress}>{storiesCompleted} / 3</Text>

            {/* MESSAGE */}
            <Text style={s.message}>{state.message}</Text>

            {/* CTA */}
            <TouchableOpacity
              style={s.cta}
              onPress={onGoRead}
              activeOpacity={0.85}
            >
              <Text style={s.ctaText}>{state.cta}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ---------- STYLES ---------- */

const s = StyleSheet.create({
  shell: { flex: 1 },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: SHEET_HEIGHT,
    backgroundColor: C.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: pad.lg,
    alignItems: "center",
  },

  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ffffff30",
    borderRadius: 3,
    marginBottom: 10,
  },

  visual: {
    marginBottom: pad.md,
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor: "pink",
  },

  title: {
    fontFamily: FONTS.bold,
    fontSize: font.h3,
    color: C.textPri,
    marginBottom: pad.md,
  },

  progress: {
    fontFamily: FONTS.bold,
    fontSize: font.h1,
    color: C.yellow,
    marginBottom: pad.sm,
  },

  message: {
    color: C.textMuted,
    fontSize: font.lg,
    marginBottom: pad.xxxl,
    textAlign: "center",
  },

  cta: {
    backgroundColor: "rgba(255,213,79,0.2)",
    borderWidth: 1.5,
    borderColor: C.yellow,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },

  ctaText: {
    fontFamily: FONTS.bold,
    color: C.yellow,
    fontSize: font.lg,
  },
});
