import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, StyleSheet } from "react-native";

const { width, height } = Dimensions.get("window");
const NUM_FEATHERS = 12; // number of feathers

const FallingFeathers = () => {
  const feathers = useRef(
    [...Array(NUM_FEATHERS)].map(() => ({
      x: Math.random() * width,
      animY: new Animated.Value(-50),
      animX: new Animated.Value(0), // horizontal sway
      speed: 6000 + Math.random() * 4000,
      sway: 20 + Math.random() * 15, // horizontal sway
      delay: Math.random() * 5000,
      rotate: Math.random() * 360,
      size: 30 + Math.random() * 25, // size between 30px and 55px
      rotateAnim: new Animated.Value(Math.random() * 360), // rotation animation
    })),
  ).current;

  useEffect(() => {
    feathers.forEach((feather) => {
      const animateFall = () => {
        feather.animY.setValue(-50);

        // vertical fall animation
        Animated.timing(feather.animY, {
          toValue: height + 50,
          duration: feather.speed,
          delay: feather.delay,
          useNativeDriver: true,
        }).start(() => animateFall());

        // horizontal sway animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(feather.animX, {
              toValue: feather.sway,
              duration: feather.speed / 4,
              useNativeDriver: true,
            }),
            Animated.timing(feather.animX, {
              toValue: -feather.sway,
              duration: feather.speed / 2,
              useNativeDriver: true,
            }),
            Animated.timing(feather.animX, {
              toValue: 0,
              duration: feather.speed / 4,
              useNativeDriver: true,
            }),
          ]),
        ).start();

        // rotation animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(feather.rotateAnim, {
              toValue: feather.rotate + 360,
              duration: feather.speed * 2,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      };

      animateFall();
    });
  }, []);

  return (
    <>
      {feathers.map((feather, index) => (
        <Animated.Image
          key={index}
          source={require("../../assets/img/feather.png")}
          style={{
            position: "absolute",
            left: feather.x,
            width: feather.size,
            height: feather.size,
            opacity: 0.5 + Math.random() * 0.5,
            transform: [
              { translateY: feather.animY },
              { translateX: feather.animX },
              {
                rotate: feather.rotateAnim.interpolate({
                  inputRange: [0, 360],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
          resizeMode="contain"
        />
      ))}
    </>
  );
};

export default FallingFeathers;
