import React from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import GameCard from "./components/GameCard"; // Make sure the path is correct

const Writing = () => {
  const games = [
    {
      id: "1",

      pathname: "./components/WordGuessGame",
      image: require("../assets/img/guess-word.jpeg"),
    },
    {
      title: "Story Completion Game",
      description: "Complete fun stories with your own creative endings.",
    },
    {
      title: "Opposite Word Game",
      description: "Learn opposite words by guessing and writing them.",
    },
    {
      title: "Choose and Write Game",
      description: "Pick options and write full sentences creatively.",
    },
    {
      title: "Word Builder Game",
      description: "Build words from letters and improve spelling skills.",
    },
  ];

  const handlePress = (title) => {
    Alert.alert(`${title}`, "Game coming soon!"); // placeholder
  };

  return (
    <ScrollView style={styles.container}>
      {games.map((game, index) => (
        <GameCard
          key={index}
          title={game.title}
          description={game.description}
          onPress={() => handlePress(game.title)}
          image={game.image}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f7",
  },
});

export default Writing;
