import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Speech from 'expo-speech'

const InteractiveText = ({ text, onWordTap }) => {
  const words = text.split(' ')
  const [activeWordIndex, setActiveWordIndex] = useState(null)

  const speakWord = (word, index) => {
    setActiveWordIndex(index)

    onWordTap?.(word)

    Speech.speak(word, {
      language: 'en',
      pitch: 1,
      rate: 0.9,
      onDone: () => setActiveWordIndex(null),
    })
  }

  return (
    <View style={styles.bubble}>
      <View style={styles.textWrap}>
        {words.map((word, index) => (
          <Pressable key={index} onPress={() => speakWord(word, index)}>
            <Text
              style={[
                styles.word,
                index === activeWordIndex && styles.activeWord,
              ]}
            >
              {word + ' '}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default InteractiveText

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: '#ffffffee',
    marginTop: 20,
    marginHorizontal: 15,
    padding: 20,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFD93D',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  textWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  word: {
    fontSize: 26,
    lineHeight: 40,
    letterSpacing: 1.2,
    color: '#333',
  },

  activeWord: {
    backgroundColor: '#FFD93D',
    borderRadius: 6,
  },
})
