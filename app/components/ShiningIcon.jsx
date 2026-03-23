import React, { useEffect, useRef } from "react";
import { View, Animated, Image, StyleSheet, Easing } from "react-native";

const ShiningIcon = ({ source, size = 70 }) => {
  const shineAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shineAnim, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const translateX = shineAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-size, size],
  });

  return (
    <View style={{ width: size, height: size, overflow: "hidden" }}>
      {/* Icon */}
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />

      {/* Shine Layer */}
      <Animated.View
        style={[
          styles.shine,
          {
            width: size / 3,
            height: size * 1.5,
            transform: [{ translateX }, { rotate: "25deg" }],
          },
        ]}
      />
    </View>
  );
};

export default ShiningIcon;

const styles = StyleSheet.create({
  shine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.6)",
    top: -20,
  },
});
