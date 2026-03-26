import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { FONTS } from "../theme";

const StoryPage = ({ text, imageUrl }) => {
  return (
    <View style={styles.container}>
      <Image source={imageUrl} style={styles.image} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

export default StoryPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: "contain",
    marginBottom: 20,
  },

  // CoText-Regular — story body text, clean and easy to read for children
  text: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    textAlign: "center",
  },
});
