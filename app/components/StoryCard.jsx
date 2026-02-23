import { StyleSheet, Text, Image, Pressable } from 'react-native'
import { useState } from 'react'
import { useUser } from '../_contexts/UserContext'

function StoryCard({ title, image, onPress, bookId }) {
  const { currentProfile, toggleFavorite } = useUser()
  const isFavorite = currentProfile?.favorites?.includes(bookId) || false

  const handleFavoritePress = (e) => {
    e.stopPropagation() // Prevent card press
    toggleFavorite(bookId)
  }

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <Image source={image} style={styles.image} />
      
      {/* Favorite Button */}
      <Pressable 
        style={styles.favoriteButton} 
        onPress={handleFavoritePress}
        hitSlop={10}
      >
        <Text style={styles.favoriteIcon}>
          {isFavorite ? '❤️' : '🤍'}
        </Text>
      </Pressable>

      <Text style={styles.cardText}>{title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    width: 170,
    borderRadius: 20,
    margin: 8,
    marginTop: 25,
    alignItems: 'center',
    borderWidth: 0,
    borderColor: '#C3BEC4',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 170,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  pressed: { 
    opacity: 0.5 
  },
  cardText: {
    fontSize: 22,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 6,
    color: '#1B3C53',
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 28,
    textShadowRadius: 2,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  favoriteIcon: {
    fontSize: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})

export default StoryCard