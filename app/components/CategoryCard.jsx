import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

const CategoryCard = ({ title, chapters, images, style, onPress }) => {
  return (
    <TouchableOpacity style={[styles.cardContainer, style]} onPress={onPress}>
      {/* Title and Chapters */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Preview Images */}
      <View style={styles.imageRow}>
        <Image
          source={
            typeof images[0] === "string" ? { uri: images[0] } : images[0]
          }
          style={{ width: "100%", height: 150 }}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 180,
    height: 200,
    backgroundColor: "#fff",
    //  borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    //  shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  header: {
    alignItems: "center",
    //  marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  chapters: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  imageRow: {
    flexDirection: "row",
    marginTop: 10,

    // backgroundColor: 'black'
  },
  image: {
    //  width: 50,
    //  height: 50,
    // borderRadius: 10,
    //  marginLeft: 5,
  },
});

export default CategoryCard;
