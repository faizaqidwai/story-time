import React, { useRef, useState } from 'react'
import { View, Animated, Dimensions, StyleSheet, Pressable } from 'react-native'
import RecommendationCard from './RecommendationCard'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width * 0.85
const STACK_HEIGHT = 260

export default function StackedRecommendations({ data }) {
  const [stack, setStack] = useState(data)
  const [cycle, setCycle] = useState(0)

  const translateX = useRef(new Animated.Value(0)).current
  const animating = useRef(false)

  const rotateStack = () => {
    translateX.setValue(0)

    setStack(prev => {
      const [first, ...rest] = prev
      return [...rest, first]
    })

    setCycle(c => c + 1) // 🔑 forces remount
    animating.current = false
  }

  const swipeNext = () => {
    if (animating.current) return
    animating.current = true

    Animated.timing(translateX, {
      toValue: -width,
      duration: 260,
      useNativeDriver: true,
    }).start(rotateStack)
  }

  const scales = [1, 0.92, 0.84]
  const xOffsets = [0, 28, 56]

  return (
    <View style={styles.container}>
      {stack.slice(0, 3).map((item, index) => {
        const isTop = index === 0

        return (
          <Animated.View
            key={`${cycle}-${index}`} // 🔑 NO REUSED KEYS
            style={[
              styles.card,
              {
                width: CARD_WIDTH,
                zIndex: 10 - index,
                transform: [
                  ...(isTop ? [{ translateX }] : []),
                  { translateX: xOffsets[index] },
                  { scale: scales[index] },
                ],
              },
            ]}
          >
            <Pressable onPress={isTop ? swipeNext : undefined}>
              <RecommendationCard {...item} />
            </Pressable>
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: STACK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
  },
})
