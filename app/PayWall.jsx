import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

export default function Paywall({ onSubscribe, onRestore }) {
  return (
    <View style={styles.container}>
      
      {/* Title */}
      <Text style={styles.title}>Premium Access Required</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Your free trial has ended. Subscribe to continue reading stories.
      </Text>

      {/* Main CTA */}
      <Pressable style={styles.primaryButton} onPress={onSubscribe}>
        <Text style={styles.primaryButtonText}>Get Premium</Text>
      </Pressable>

      {/* Secondary action */}
      <Pressable onPress={onRestore}>
        <Text style={styles.restoreText}>Restore Purchase</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#B5B5B5",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  restoreText: {
    marginTop: 16,
    color: "#8A8A8A",
    fontSize: 13,
  },
});