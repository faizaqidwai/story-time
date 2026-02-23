import React, { useEffect, useState, useRef } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native'
import { ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import InteractiveText from '../components/InteractiveText'
import ScreenWrapper from '../components/ScreenWrapper'
import BadgePopup from '../components/BadgePopup' // Add this import
import { bookService } from '../services/bookService'
import { useUser } from '../_contexts/UserContext' // Add this import
import backgroundImage from '../../assets/img/storyPageBack4.jpg'

const { width } = Dimensions.get('window')

export default function BookReader() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const flatListRef = useRef(null)
  const { currentProfile, addCompletedStory } = useUser() // Add this

  const [book, setBook] = useState(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wordTaps, setWordTaps] = useState([])
  
  // Add badge state
  const [showBadgePopup, setShowBadgePopup] = useState(false)
  const [earnedBadge, setEarnedBadge] = useState(null)

  useEffect(() => {
    const loadBook = async () => {
      try {
        const data = await bookService.getBookById(id)
        setBook(data)
      } catch (e) {
        setError('Failed to load book')
      } finally {
        setLoading(false)
      }
    }
    loadBook()
  }, [id])

  const goToPage = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true })
    setPageIndex(index)
  }

  const handleWordTap = (word) => {
    setWordTaps(prev => [...prev, word.toLowerCase()])
  }

  const generateReadingReport = () => {
    const allWords = book.pages.flatMap(p => p.text.split(' '))

    const frequency = wordTaps.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {})

    const mostTapped =
      Object.keys(frequency).length > 0
        ? Object.entries(frequency).sort((a, b) => b[1] - a[1])[0]
        : null

    return {
      storyId: book.id,
      storyTitle: book.title,
      totalWords: allWords.length,
      totalTaps: wordTaps.length,
      uniqueWordsTapped: Object.keys(frequency).length,
      mostTappedWord: mostTapped,
      wordFrequency: frequency,
    }
  }

  const handleFinishStory = () => {
    const report = generateReadingReport()
    
    // Check if this is the first story
    const isFirstStory = !currentProfile?.readingHistory || 
                         currentProfile.readingHistory.length === 0
    
    // Add story to profile
    if (currentProfile) {
      const storyData = {
        storyId: book.id,
        storyTitle: book.title,
        completedAt: new Date().toISOString(),
        report,
      }
      addCompletedStory(currentProfile.id, storyData)
      
      // Show badge popup if it's their first story
      if (isFirstStory) {
        setEarnedBadge('first_story')
        setShowBadgePopup(true)
      } else {
        // Go directly to report if not first story
        router.push({
          pathname: '/reading-report',
          params: { report: JSON.stringify(report) },
        })
      }
    } else {
      // No profile selected, just go to report
      router.push({
        pathname: '/reading-report',
        params: { report: JSON.stringify(report) },
      })
    }
  }

  const handleBadgeClose = () => {
    setShowBadgePopup(false)
    
    // Navigate to report after closing badge
    const report = generateReadingReport()
    router.push({
      pathname: '/reading-report',
      params: { report: JSON.stringify(report) },
    })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading story...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
        <Pressable style={styles.bigButton} onPress={() => router.back()}>
          <Text style={styles.bigButtonText}>⬅ Go Back</Text>
        </Pressable>
      </View>
    )
  }

  if (!book) return null

  return (
    <ScreenWrapper background={backgroundImage}>
      <FlatList
        ref={flatListRef}
        data={book.pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width)
          setPageIndex(index)
        }}
        renderItem={({ item }) => (
          <StorySwipePage
            page={item}
            onWordTap={handleWordTap}
          />
        )}
      />

      <View style={styles.buttons}>
  {/* BACK BUTTON */}
  <Pressable
    disabled={pageIndex === 0}
    onPress={() => goToPage(pageIndex - 1)}
    style={[styles.bigButton, pageIndex === 0 && styles.disabledButton]}
  >
    <Ionicons name="chevron-back" size={36} color="#333" />
  </Pressable>

  {/* PAGE NUMBER */}
  <Text style={styles.pageNumber}>
    {pageIndex + 1} / {book.pages.length}
  </Text>

  {/* NEXT OR FINISH */}
  {pageIndex === book.pages.length - 1 ? (
    <Pressable
      style={styles.bigButton}
      onPress={handleFinishStory}
    >
      <Text style={styles.bigButtonText}>Finish ⭐</Text>
    </Pressable>
  ) : (
    <Pressable
      onPress={() => goToPage(pageIndex + 1)}
      style={styles.bigButton}
    >
      <Ionicons name="chevron-forward" size={36} color="#333" />
    </Pressable>
  )}
</View>


      
      
      {/* Badge Popup */}
      <BadgePopup
        visible={showBadgePopup}
        badge={earnedBadge}
        onClose={handleBadgeClose}
      />
    </ScreenWrapper>
  )
}

// ... rest of your code (StorySwipePage and styles remain the same)
/* ===================== PAGE COMPONENT ===================== */

const StorySwipePage = ({ page, onWordTap }) => {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.imageSection}>
        <Image source={{ uri: page.image }} style={styles.image} />
      </View>

      {/* 🔹 SCROLLABLE TEXT AREA */}
      <View style={styles.textSection}>
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.textScrollContent}
        >
          <InteractiveText
            text={page.text}
            onWordTap={onWordTap}
          />
        </ScrollView>
      </View>
    </View>
  )
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  page: { flex: 1 },

  textSection: {
  flex: 2.5,            // ⬅ give text more space
  paddingHorizontal: 14,
  paddingBottom: 10,
},

textScrollContent: {
  paddingBottom: 40,    // ⬅ extra space so last line is readable
},

  imageSection: {
    flex: 1,
    alignItems: 'center',
  },

  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  textSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },

  bigButton: {
    backgroundColor: '#FFD93D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    minWidth: 110,
    alignItems: 'center',
    elevation: 4,
    height: 65
  },

  bigButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
      paddingVertical: 5,
    
  },

  disabledButton: {
    opacity: 0.4,
  },

  pageNumber: {
    fontSize: 16,
    fontWeight: '600',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
