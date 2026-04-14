import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
} from "react-native";
import * as Speech from "expo-speech";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens";

const InteractiveTextAdvance = ({ text, onWordTap, image }) => {
  const [activeWordIndex, setActiveWordIndex] = useState(null);

  const sanitizedText = text
    .replace(/\\\\n/g, "\n") // \\n (literal 4 chars) → newline
    .replace(/\\n/g, "\n") // \n  (literal 2 chars) → newline
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");

  const paragraphs = sanitizedText
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const segments = paragraphs.map((para) => para.split(/\s+/).filter(Boolean));

  let globalIndex = 0;

  const rendered = segments.map((words, paraIndex) => {
    const wordNodes = words.map((word) => {
      const idx = globalIndex++;
      return (
        <Pressable
          key={idx}
          onPress={() => {
            setActiveWordIndex(idx);
            onWordTap?.(word);
            Speech.speak(word, {
              language: "en",
              pitch: 1,
              rate: 0.9,
              onDone: () => setActiveWordIndex(null),
            });
          }}
        >
          <Text
            style={[styles.word, idx === activeWordIndex && styles.activeWord]}
          >
            {word + " "}
          </Text>
        </Pressable>
      );
    });

    return (
      <View key={paraIndex} style={styles.paragraph}>
        {wordNodes}
      </View>
    );
  });

  // 🔥 Shared content wrapper
  const content = <View style={styles.inner}>{rendered}</View>;

  // 🔥 Conditional rendering
  if (image) {
    return (
      <ImageBackground
        source={image}
        style={styles.bubble}
        imageStyle={styles.imageStyle}
      >
        {content}
      </ImageBackground>
    );
  }

  return <View style={styles.bubble}>{content}</View>;
};

export default InteractiveTextAdvance;

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: "#dfd3bd",
    padding: pad.sm,
    //   borderRadius: 25,
    //   borderWidth: 3,
    marginBottom: 30,
    paddingBottom: pad.xxl,
    elevation: 5,
    // height: "100%",
  },
  imageStyle: {
    borderRadius: 25,
    resizeMode: "cover",
  },
  inner: {
    // optional overlay for readability
    // backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 25,
  },
  paragraph: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  word: {
    fontSize: font.xl,
    lineHeight: 40,
    letterSpacing: 1.2,
    color: "#333",
  },
  activeWord: {
    backgroundColor: "#FFD93D",
    borderRadius: 6,
  },
});
