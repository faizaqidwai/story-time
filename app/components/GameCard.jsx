import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { FONTS } from "../theme";

const GameCard = ({ title, description, onPress, image }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Show Image ONLY if exists */}
      {image && (
        <Image source={image} style={styles.image} resizeMode="contain" />
      )}

      {/* Show Title ONLY if exists */}
      {title && <Text style={styles.title}>{title}</Text>}

      {/* Show Description ONLY if exists */}
      {description && <Text style={styles.description}>{description}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#6C63FF",
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  // CoText-Bold — card title
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },

  // CoText-Light — supporting description
  description: {
    fontFamily: FONTS.light,
    fontSize: 14,
    color: "#E0E0E0",
    textAlign: "center",
    marginTop: 5,
  },
});

export default GameCard;
