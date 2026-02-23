import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native'
import React from 'react'
import ScreenWrapper from './components/ScreenWrapper'

import { useUser } from './_contexts/UserContext' // Add this import

const { width } = Dimensions.get('window')

// Helper function to format date
const formatDate = (isoDate) => {
  const date = new Date(isoDate)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

const Progress = () => {
  const { currentProfile } = useUser() // Now this will work

  // Get user's actual badges
  const userBadges = currentProfile?.badges || []
  
  // Get actual reading history
  const readingHistory = currentProfile?.readingHistory || []
  
  // Sample data - replace with actual data from your context/database
  const stats = {
    totalStories: readingHistory.length || 0, // Use actual count
    readingStreak: 5,
    totalMinutes: 145,
    favoriteCategory: 'Animals',
    currentLevel: currentProfile?.readingLevel || 'Intermediate',
  }

  const achievements = [
    { id: 'first_story', title: 'First Story', icon: '📖', earned: userBadges.includes('first_story') },
    { id: 'week_warrior', title: 'Week Warrior', icon: '🔥', earned: userBadges.includes('week_warrior') },
    { id: 'category_explorer', title: 'Category Explorer', icon: '🌟', earned: userBadges.includes('category_explorer') },
    { id: 'speed_reader', title: 'Speed Reader', icon: '⚡', earned: userBadges.includes('speed_reader') },
    { id: 'night_owl', title: 'Night Owl', icon: '🦉', earned: userBadges.includes('night_owl') },
    { id: 'early_bird', title: 'Early Bird', icon: '🐦', earned: userBadges.includes('early_bird') },
  ]

  // Use actual reading history for recent stories
  const recentStories = readingHistory.length > 0 
    ? readingHistory.slice(-3).reverse().map((story) => ({
        id: story.storyId,
        title: story.storyTitle,
        date: formatDate(story.completedAt),
        completed: true,
      }))
    : [
        // Fallback to sample data if no history
        { id: 1, title: 'The Brave Little Bear', date: 'Today', completed: true },
        { id: 2, title: 'Luna and the Talking Tree', date: 'Yesterday', completed: true },
        { id: 3, title: 'The Curious Kitten', date: '2 days ago', completed: true },
      ]

  const weeklyData = [
    { day: 'Mon', count: 2 },
    { day: 'Tue', count: 1 },
    { day: 'Wed', count: 3 },
    { day: 'Thu', count: 1 },
    { day: 'Fri', count: 2 },
    { day: 'Sat', count: 0 },
    { day: 'Sun', count: 1 },
  ]

  const maxCount = Math.max(...weeklyData.map(d => d.count))

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Stats Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reading Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalStories}</Text>
              <Text style={styles.statLabel}>Stories Read</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.readingStreak}</Text>
              <Text style={styles.statLabel}>Day Streak 🔥</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalMinutes}</Text>
              <Text style={styles.statLabel}>Minutes Read</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.favoriteCategory}</Text>
              <Text style={styles.statLabel}>Favorite</Text>
            </View>
          </View>
        </View>

        {/* Reading Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reading Level</Text>
          <View style={styles.levelCard}>
            <Text style={styles.currentLevel}>{stats.currentLevel}</Text>
            <View style={styles.levelProgress}>
              <View style={styles.levelBar}>
                <View style={[styles.levelBarFill, { width: '65%' }]} />
              </View>
              <Text style={styles.levelText}>65% to Expert level!</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View 
                key={achievement.id} 
                style={[
                  styles.achievementCard,
                  !achievement.earned && styles.achievementLocked
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {weeklyData.map((item, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: item.count > 0 ? `${(item.count / maxCount) * 100}%` : 4,
                          backgroundColor: item.count > 0 ? '#FF6B9D' : '#E0E0E0'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.day}</Text>
                  <Text style={styles.barCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Recent Stories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reading</Text>
          {recentStories.map((story) => (
            <View key={story.id} style={styles.recentCard}>
              <View style={styles.recentIcon}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{story.title}</Text>
                <Text style={styles.recentDate}>{story.date}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Next Milestone */}
        <View style={[styles.section, { marginBottom: 30 }]}>
          <Text style={styles.sectionTitle}>Next Milestone</Text>
          <View style={styles.milestoneCard}>
            <Text style={styles.milestoneIcon}>🎯</Text>
            <Text style={styles.milestoneText}>
              Read {15 - stats.totalStories} more stories to reach 15 total!
            </Text>
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  )
}

export default Progress

// ... all your existing styles remain the same
const styles = StyleSheet.create({
  // ... (keep all your existing styles)
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FAF7F2',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#154D71',
    marginBottom: 15,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    width: (width - 56) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },

  // Level Card
  levelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  currentLevel: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9652D9',
    textAlign: 'center',
    marginBottom: 15,
  },
  levelProgress: {
    gap: 8,
  },
  levelBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: '#9652D9',
    borderRadius: 6,
  },
  levelText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Achievements
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    width: (width - 68) / 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  achievementLocked: {
    opacity: 0.4,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Chart
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  bar: {
    width: 30,
    borderRadius: 5,
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  barCount: {
    fontSize: 10,
    color: '#999',
  },

  // Recent Stories
  recentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  checkmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentDate: {
    fontSize: 14,
    color: '#999',
  },

  // Milestone
  milestoneCard: {
    backgroundColor: 'rgba(255, 235, 153, 0.9)',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  milestoneIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  milestoneText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
})