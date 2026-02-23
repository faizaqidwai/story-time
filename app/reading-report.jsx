import { View, Text, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function ReadingReport() {
  const { report } = useLocalSearchParams()
  const data = JSON.parse(report)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📘 Great Reading!</Text>
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

      <View style={styles.card}>
        <Text style={styles.emoji}>🧠</Text>
        <Text style={styles.label}>New Words Learned</Text>
        <Text style={styles.value}>{data.uniqueWordsTapped}</Text>
      </View>

      {data.mostTappedWord && (
        <View style={[styles.card, styles.highlightCard]}>
          <Text style={styles.emoji}>🏆</Text>
          <Text style={styles.label}>Tricky Word</Text>
          <Text style={styles.highlightText}>
            “{data.mostTappedWord[0]}”
          </Text>
          <Text style={styles.smallText}>
            Tapped {data.mostTappedWord[1]} times
          </Text>
        </View>
      )}

      <Text style={styles.footerText}>
        🌈 Keep reading, you’re doing amazing!
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FF',
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  highlightCard: {
    backgroundColor: '#FFF3D6',
  },

  emoji: {
    fontSize: 32,
    marginBottom: 6,
  },

  label: {
    fontSize: 14,
    color: '#666',
  },

  value: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },

  highlightText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },

  smallText: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
    color: '#4B6CFF',
    fontWeight: '600',
  },
})
