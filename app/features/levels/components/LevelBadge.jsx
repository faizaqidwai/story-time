import React, { useRef, useEffect } from "react";
import { View, Text, Animated, Easing, TouchableOpacity } from "react-native";
import { FONTS } from "../../../theme";
import { font, isTablet } from "../../../theme/tokens";

const TEAL = "#00BCD4";
const YELLOW = "#FFD54F";

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL BADGE
// ─────────────────────────────────────────────────────────────────────────────
function LevelBadge({
  displayLevel = 1,
  currentLevel = 1,
  progress = 0.62,
  onPress,
}) {
  const ringSize = isTablet ? 110 : 82;
  const innerSize = isTablet ? 92 : 68;
  const barW = isTablet ? 102 : 76;
  const barH = isTablet ? 8 : 6;
  const dotSize = isTablet ? 16 : 12;

  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 1100,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);
  const fillW = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const isViewingOther = displayLevel !== currentLevel;

  return (
    <TouchableOpacity
      style={{ alignItems: "center" }}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View
        style={[
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            backgroundColor: "#0d0f22",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.9,
            shadowRadius: 8,
            elevation: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
          },
          isViewingOther
            ? { borderColor: "rgba(255,213,79,0.5)" }
            : { borderColor: "rgba(255,255,255,0.06)" },
        ]}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: "#10122a",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: "rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: -10,
              right: -10,
              height: "58%",
              backgroundColor: "#1a2540",
              transform: [{ rotate: "-6deg" }, { translateY: -4 }],
              borderRadius: 4,
              opacity: 0.9,
            }}
          />
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.xs,
              color: TEAL,
              letterSpacing: isTablet ? 2.5 : 2,
              marginBottom: 3,
              opacity: 0.9,
            }}
          >
            LEVEL
          </Text>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: font.h2,
              color: "#E0F7FA",
              textShadowColor: TEAL,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
            }}
          >
            {displayLevel}
          </Text>
          {isViewingOther && (
            <Text
              style={{
                fontSize: isTablet ? 8 : 6,
                color: YELLOW,
                marginTop: 1,
              }}
            >
              ●
            </Text>
          )}
        </View>
      </View>
      <View
        style={{
          width: barW,
          height: barH,
          borderRadius: barH / 2,
          backgroundColor: "rgba(255,255,255,0.08)",
          marginTop: isTablet ? 7 : 5,
          overflow: "visible",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.35)",
        }}
      >
        <Animated.View
          style={{
            height: "100%",
            borderRadius: barH / 2,
            backgroundColor: TEAL,
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 4,
            elevation: 4,
            width: fillW,
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            top: -(dotSize / 2 - barH / 2),
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: "#fff",
            borderWidth: 2,
            borderColor: TEAL,
            marginLeft: -(dotSize / 2),
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 6,
            elevation: 6,
            left: fillW,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default LevelBadge;
