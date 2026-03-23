import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { Theme } from "../theme";

export default function ReadingReport() {
  const { report } = useLocalSearchParams();
  const data = JSON.parse(report);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            Theme.typography.h1,
            { color: Theme.colors.text },
            styles.title,
          ]}
        >
          Great Reading!
        </Text>
        <Text style={styles.subtitle}>Here’s how you did 🌟</Text>

        <View style={styles.card}>
          <Text style={styles.emoji}>📖</Text>
          <Text style={styles.label}>Total Words Read</Text>
          <Text style={styles.value}>{data.totalWords}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.emoji}>👆</Text>
          <Text style={styles.label}>Words You Asked Help For</Text>
          <Text style={styles.value}>{data.totalTaps}</Text>
        </View>

        {data.mostTappedWord && (
          <View style={[styles.card, styles.highlightCard]}>
            <Text style={styles.emoji}>🏆</Text>
            <Text style={styles.label}>Tricky Word</Text>
            <Text style={styles.highlightText}>“{data.mostTappedWord[0]}”</Text>
            <Text style={styles.smallText}>
              Tapped {data.mostTappedWord[1]} times
            </Text>
          </View>
        )}

        <Text style={styles.footerText}>
          🌈 Keep reading, you’re doing amazing!
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: Theme.colors.primary,
            paddingVertical: Theme.spacing.md,
            borderRadius: Theme.spacing.xl,
            alignItems: "center",
            marginTop: 30,
          }}
          onPress={() => {
            router.dismissAll();

            router.replace("/categories");
          }}
        >
          <Text style={[Theme.typography.button, { color: "#fff" }]}>Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: 20,
  },

  title: {
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },

  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.spacing.md,
    padding: Theme.spacing.ml,
    alignItems: "center",
    marginBottom: Theme.spacing.md,
    shadowColor: Theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: Theme.spacing.sm,
  },

  highlightCard: {
    backgroundColor: "#FFF3D6",
  },

  emoji: {
    fontSize: 32,
    marginBottom: 6,
  },

  label: {
    fontSize: Theme.spacing.md - 2,
    color: Theme.colors.textSecondary,
  },

  value: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },

  highlightText: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },

  smallText: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  footerText: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 20,
    color: Theme.colors.primary,
    fontWeight: "600",
  },

  selectProfileButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
