import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'

export default function RecommendationCard({ title, chapters, images }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{chapters} Chapters</Text>

      <View style={styles.imageRow}>
        {images?.slice(0, 3).map((img, i) => (
          <Image
            key={i}
            source={{ uri: img }}
            style={styles.image}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    height: 200,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
})
