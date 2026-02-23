import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity
} from "react-native";
import * as Speech from "expo-speech";
import { useLocalSearchParams } from "expo-router";
import data from "../data/articles.json";



const Article = () => {
  
  const { id } = useLocalSearchParams();
  const article = data.articles.find(
     (a) => a.id == id
  );


  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakArticle = () => {
    if (!article) {
  return (
    <View style={styles.container}>
      <Text>Article not found</Text>
    </View>
  );
}

    setIsSpeaking(true);

    Speech.speak(article.audio_narration_script, {
      language: "en-US",
      rate: 0.85, // slower for kids
      pitch: 1.1, // slightly friendly tone
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{article.title}</Text>

      <Image
        source={{ uri: article.image_url }}
        style={styles.image}
        resizeMode="cover"
      />

      <Text style={styles.content}>{article.content}</Text>

      <Text style={styles.funFact}>🌟 Fun Fact: {article.fun_fact}</Text>

      <View style={styles.questionsContainer}>
  <Text style={styles.questionsTitle}>Let’s Think!</Text>

  {article.questions.map((q, index) => (
    <View key={index} style={{ marginBottom: 15 }}>
      <Text style={styles.question}>
        {index + 1}. {q.question}
      </Text>

      {q.options.map((option, i) => (
        <Text key={i} style={{ marginLeft: 15, fontSize: 15 }}>
          • {option}
        </Text>
      ))}
    </View>
  ))}
</View>


      <TouchableOpacity
        style={[styles.button, isSpeaking && styles.stopButton]}
        onPress={isSpeaking ? stopSpeaking : speakArticle}
      >
        <Text style={styles.buttonText}>
          {isSpeaking ? "Stop Audio 🔊" : "Play Audio 🎧"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Article;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFF8E7"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center"
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    marginBottom: 15
  },
  content: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 15
  },
  funFact: {
    fontSize: 16,
    fontStyle: "italic",
    marginBottom: 20
  },
  questionsContainer: {
    marginBottom: 25
  },
  questionsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8
  },
  question: {
    fontSize: 16,
    marginBottom: 4
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 30
  },
  stopButton: {
    backgroundColor: "#E53935"
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold"
  }
});
