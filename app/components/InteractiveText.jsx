import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Speech from "expo-speech";
import { FONTS } from "../theme";
import { font, pad, radius, size } from "../theme/tokens";
const InteractiveText = ({ text, onWordTap }) => {
  const [activeWordIndex, setActiveWordIndex] = useState(null);

  // Split into paragraphs first, then words
  const sanitizedText = text
    .replace(/\\n/g, "\n") // fix escaped newlines
    .replace(/\\"/g, '"') // fix escaped quotes
    .replace(/\\'/g, "'") // fix escaped apostrophes
    .replace(/\\\\/g, "\\"); // fix double backslashes

  const paragraphs = sanitizedText
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Build a flat word list but track which paragraph each word belongs to
  // so we can insert breaks between paragraphs
  const segments = paragraphs.map((para) => para.split(/\s+/).filter(Boolean));

  // Flatten with a global index for highlight tracking
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

  return <View style={styles.bubble}>{rendered}</View>;
};

export default InteractiveText;

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: "#ffffffee",
    padding: pad.sm,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#FFD93D",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 20,
    //  height: "100%",
  },
  paragraph: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 10,
  },
  word: {
    fontSize: font.h3,
    lineHeight: 40,
    letterSpacing: 1.2,
    color: "#333",
  },
  activeWord: {
    backgroundColor: "#FFD93D",
    borderRadius: 6,
  },
});
