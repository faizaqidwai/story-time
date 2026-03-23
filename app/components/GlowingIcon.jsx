import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Image } from "react-native";

const GlowingIcon = ({ source, size = 70, glowColor = "#FFD700" }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const glowSize = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <View style={{ width: size, height: size }}>
      {/* Glow Layer */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: glowColor,
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: glowOpacity,
            transform: [{ scale: glowSize }],
          },
        ]}
      />

      {/* Icon */}
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          position: "absolute",
        }}
        resizeMode="contain"
      />
    </View>
  );
};

export default GlowingIcon;

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
  },
});
