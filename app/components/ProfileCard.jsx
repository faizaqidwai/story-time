import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import React from 'react'

const ProfileCard = ({ name, age, readingLevel, onPress, onEdit, onDelete, avatar, isCurrentProfile }) => {
  const getReadingLevelColor = (level) => {
    switch(level.toLowerCase()) {
      case 'beginner':
        return '#4CAF50'
      case 'intermediate':
        return '#FF9800'
      case 'expert':
        return '#9C27B0'
      default:
        return '#757575'
    }
  }

  return (
    <TouchableOpacity 
      style={[styles.card, isCurrentProfile && styles.activeCard]} 
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: avatar || `https://ui-avatars.com/api/?name=${name}&size=120&background=FF6B9D&color=fff&bold=true` }}
          style={styles.avatar}
        />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.age}>{age} years old</Text>
        
        <View style={[styles.levelBadge, { backgroundColor: getReadingLevelColor(readingLevel) }]}>
          <Text style={styles.levelText}>{readingLevel}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default ProfileCard

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: '#9652D9',
    backgroundColor: 'rgba(150, 82, 217, 0.1)',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FF6B9D',
    marginRight: 15,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#154D71',
    marginBottom: 5,
  },
  age: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  levelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 18,
  },
})